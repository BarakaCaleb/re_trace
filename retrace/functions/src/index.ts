import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();
const db = admin.firestore();

type Role = "customs" | "garage" | "dealer" | "recycler" | "oem";

function normalizeVIN(v: string) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

// Deterministic hash (stable outputs per VIN for MVP demos)
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

  const year = 2008 + (h % 13); // 2008..2020
  const models = ["BMW 3 Series", "BMW X5", "BMW 5 Series", "BMW X3"];
  const engines = ["2.0L Diesel", "3.0L Petrol", "2.0L Petrol", "3.0L Diesel"];
  const plants = ["Munich", "Dingolfing", "Regensburg", "Leipzig", "Regensburg"];

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
 * - requires Firebase Auth
 * - reads users/{uid} (orgName, role, countryCode, region, phoneE164)
 * - upserts vinReports/{vin}
 * - logs vinSearches with country+region+org+role
 * - returns report data
 */
export const searchVin = onCall(async (req) => {
  if (!req.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const vin = normalizeVIN((req.data as any)?.vin);
  if (!vin || vin.length < 11) {
    throw new HttpsError("invalid-argument", "VIN is missing or invalid.");
  }

  const uid = req.auth.uid;

  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) {
    throw new HttpsError("failed-precondition", "User profile missing. Complete registration.");
  }

  const user = userSnap.data() as {
    orgName?: string;
    role?: Role;
    countryCode?: string; // "KE"
    region?: string;      // "Nairobi"
    phoneE164?: string;
    fullName?: string;
  };

  if (!user.orgName || !user.role || !user.countryCode || !user.region || !user.phoneE164) {
    throw new HttpsError(
      "failed-precondition",
      "Profile incomplete. Ensure orgName, role, phone, country, and region are set."
    );
  }

  const generated = riskFromVin(vin);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const report = {
    vin,
    ...generated,
    updatedAt: now,

    // Formal lifecycle placeholders (swap with real sources later)
    productionDate: `${generated.year}-03-22`,
    firstRegistrationCountry: "Germany",
    warrantyStatus: "Expired",
    lastAuthorizedService: "2021-08-11",
    recallCompletionStatus: "Complete",
    deregistrationDate: "2023-07-14",
  };

  await db.doc(`vinReports/${vin}`).set(report, { merge: true });

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