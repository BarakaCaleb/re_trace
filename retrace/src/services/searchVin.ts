import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

type Role = "customs" | "garage" | "dealer" | "recycler" | "oem";

export type VinReport = {
  vin: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidence: number; // 0..100
  elvLikelihood: number; // 0..100
  informalMarketProbability: number; // 0..100

  model: string;
  engine: string;
  plant: string;
  year: number;
  lifecycleStatus: string;

  productionDate: string;
  firstRegistrationCountry: string;
  warrantyStatus: string;
  lastAuthorizedService: string;
  recallCompletionStatus: string;
  deregistrationDate: string;
};

function normalizeVIN(v: string) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

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

function riskFromVin(vin: string): Pick<
  VinReport,
  | "riskLevel"
  | "confidence"
  | "elvLikelihood"
  | "informalMarketProbability"
  | "model"
  | "engine"
  | "plant"
  | "year"
  | "lifecycleStatus"
> {
  // MVP deterministic pseudo intelligence (stable per VIN)
  const h = hashStr(vin);

  const year = 2008 + (h % 16); // 2008..2023 (demo)
  const elvLikelihood = clamp(30 + (h % 60), 0, 100);
  const informalMarketProbability = clamp(20 + ((h >> 2) % 70), 0, 100);
  const confidence = clamp(55 + ((h >> 3) % 40), 0, 100);

  const riskScore = Math.round(elvLikelihood * 0.6 + informalMarketProbability * 0.4);
  const riskLevel: VinReport["riskLevel"] =
    riskScore >= 70 ? "HIGH" : riskScore >= 45 ? "MEDIUM" : "LOW";

  const models = ["BMW 3 Series", "BMW 5 Series", "BMW X3", "BMW X5", "BMW 1 Series"];
  const engines = ["2.0L Diesel", "2.0L Petrol", "3.0L Diesel", "3.0L Petrol"];
  const plants = ["Munich", "Dingolfing", "Regensburg", "Spartanburg"];

  const model = models[h % models.length];
  const engine = engines[(h >> 4) % engines.length];
  const plant = plants[(h >> 6) % plants.length];

  const lifecycleStatus =
    riskLevel === "HIGH" ? "Deregistered – Under Monitoring" : "Active – Monitoring";

  return {
    riskLevel,
    confidence,
    elvLikelihood,
    informalMarketProbability,
    model,
    engine,
    plant,
    year,
    lifecycleStatus,
  };
}

export async function searchVin(vinInput: string): Promise<VinReport> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in required.");

  const vin = normalizeVIN(vinInput);
  if (!vin || vin.length < 11) throw new Error("VIN is missing or invalid.");

  // Load user profile (required for logging)
  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists()) throw new Error("User profile missing. Complete registration.");

  const profile = userSnap.data() as {
    orgName?: string;
    role?: Role;
    countryCode?: string; // "KE"
    region?: string; // "Nairobi"
    phoneE164?: string;
  };

  if (!profile.orgName || !profile.role || !profile.countryCode || !profile.region || !profile.phoneE164) {
    throw new Error("Profile incomplete. Ensure orgName, role, phone, country, and region are set.");
  }

  // Generate baseline
  const generated = riskFromVin(vin);

  // OEM Catalog override (seeded VINs)
  const catalogSnap = await getDoc(doc(db, "vinCatalog", vin));
  const catalog = catalogSnap.exists() ? (catalogSnap.data() as any) : null;

  const model = catalog?.model ?? generated.model;
  const year = typeof catalog?.year === "number" ? catalog.year : generated.year;
  const engine = catalog?.engine ?? generated.engine;
  const plant = catalog?.plant ?? generated.plant;

  const report: VinReport = {
    vin,
    ...generated,
    model,
    year,
    engine,
    plant,

    productionDate: `${year}-03-22`,
    firstRegistrationCountry: catalog?.firstRegistrationCountry ?? "Germany",
    warrantyStatus: catalog?.warrantyStatus ?? "Expired",
    lastAuthorizedService: catalog?.lastAuthorizedService ?? "2021-08-11",
    recallCompletionStatus: catalog?.recallCompletionStatus ?? "Complete",
    deregistrationDate: catalog?.deregistrationDate ?? "2023-07-14",
  };

  // Cache snapshot
  await setDoc(doc(db, "vinReports", vin), { ...report, updatedAt: serverTimestamp() }, { merge: true });

  // Log search datapoint (Country → Region breakdown)
  await addDoc(collection(db, "vinSearches"), {
    vin,
    searchedAt: serverTimestamp(),
    userId: user.uid,
    orgName: profile.orgName,
    role: profile.role,
    countryCode: profile.countryCode,
    region: profile.region,
    riskLevel: report.riskLevel,
    confidence: report.confidence,
    model: report.model,
    year: report.year,
  });

  return report;
}