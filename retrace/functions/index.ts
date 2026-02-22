import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

type Role = "customs" | "garage" | "dealer" | "recycler" | "oem";

function normalizeVIN(v: string) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

// Simple deterministic hash to keep outputs stable per VIN (MVP)
function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function riskFromVin(vin: string) {
  const h = hashStr(vin);
  const confidence = 55 + (h % 40); // 55..94
  const elvLikelihood = clamp(50 + (h % 51), 50, 95); // 50..95
  const informal = clamp(35 + ((h >> 3) % 56), 35, 90);

  const riskLevel =
    elvLikelihood >= 75 || informal >= 70 ? "HIGH" : elvLikelihood >= 60 ? "MEDIUM" : "LOW";

  // pseudo vehicle fields (can be replaced later)
  const year = 2008 + (h % 13); // 2008..2020
  const models = ["BMW 3 Series", "BMW X5", "BMW 5 Series", "BMW X3"];
  const engines = ["2.0L Diesel", "3.0L Petrol", "2.0L Petrol", "3.0L Diesel"];
  const plants = ["Munich", "Dingolfing", "Regensburg", "Leipzig"];

  return {
    riskLevel,
    confidence,
    elvLikelihood,
    informalMarketProbability: informal,
    model: models[h % models.length],
    engine: engines[(h >> 2) % engines.length],
    plant: plants[(h >> 4) % plants.length],
    year,
    lifecycleStatus: "Deregistered – Under Monitoring",
  };
}

/**
 * searchVin()
 * - requires auth
 * - reads user profile (orgName, role, countryCode, region)
 * - upserts vinReports/{vin}
 * - logs vinSearches
 * - returns report
 */
export const searchVin = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Sign in required.");
  }

  const vin = normalizeVIN(data?.vin);
  if (!vin || vin.length < 11) {
    throw new functions.https.HttpsError("invalid-argument", "VIN is missing or invalid.");
  }

  const uid = context.auth.uid;
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) {
    throw new functions.https.HttpsError("failed-precondition", "User profile missing. Complete registration.");
  }

  const user = userSnap.data() as {
    orgName?: string;
    role?: Role;
    countryCode?: string; // "KE"
    region?: string;      // e.g. "Nairobi"
    fullName?: string;
    phoneE164?: string;
  };

  // enforce required profile fields
  if (!user.role || !user.orgName || !user.countryCode || !user.region || !user.phoneE164) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Profile incomplete. Ensure role, phone, country, and region are set."
    );
  }

  // Generate deterministic report values
  const generated = riskFromVin(vin);

  const reportRef = db.doc(`vinReports/${vin}`);
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Upsert report
  const report = {
    vin,
    ...generated,
    updatedAt: now,
    // optional "formal lifecycle" placeholders for now (replace with real sources later)
    productionDate: `${generated.year}-03-22`,
    firstRegistrationCountry: "Germany",
    warrantyStatus: "Expired",
    lastAuthorizedService: "2021-08-11",
    recallCompletionStatus: "Complete",
    deregistrationDate: "2023-07-14",
  };

  await reportRef.set(report, { merge: true });

  // Log search datapoint (ELV spotted signal)
  await db.collection("vinSearches").add({
    vin,
    searchedAt: now,
    userId: uid,

    orgName: user.orgName,
    role: user.role,

    countryCode: user.countryCode,
    region: user.region,

    riskLevel: generated.riskLevel,
    confidence: generated.confidence,
  });

  return report;
});