import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../config/firebase";
import { doc, getDoc, collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";

type VINReport = {
  vin: string;
  model?: string;
  year?: number;
  engine?: string;
  plant?: string;

  lifecycleStatus?: string; // "Deregistered – Under Monitoring"
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | string;
  confidence?: number;

  elvLikelihood?: number;
  informalMarketProbability?: number;

  // optional fields later:
  productionDate?: string;
  firstRegistrationCountry?: string;
  warrantyStatus?: string;
  lastAuthorizedService?: string;
  recallCompletionStatus?: string;
  deregistrationDate?: string;

  updatedAt?: any;
};

function normalizeVIN(v: string) {
  return v.trim().toUpperCase().replace(/\s+/g, "");
}

export default function OEMPassport() {
  const { vin } = useParams();
  const VIN = useMemo(() => normalizeVIN(vin ?? "WBA8E9G51GNU12345"), [vin]);

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<VINReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // computed from vinSearches
  const [resightings, setResightings] = useState(0);
  const [lastCountry, setLastCountry] = useState<string>("—");
  const [sources, setSources] = useState<string>("—");
  const [confidence, setConfidence] = useState<number>(72);

  const drivers = [
    { label: "Age > 12 Years", pct: 22 },
    { label: "Deregistered > 9 Months", pct: 18 },
    { label: "Port Re-Sighting Detected", pct: 24 },
    { label: "No Authorized Service in 24 Months", pct: 14 },
  ];

  const signals = ["Production", "Registration", "Service", "Deregistration", "Customs", "Diagnostics"];

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr(null);

      try {
        // 1) Load cached report
        const snap = await getDoc(doc(db, "vinReports", VIN));
        const rep = snap.exists() ? ({ ...(snap.data() as any), vin: VIN } as VINReport) : null;

        // fallback report if missing (keeps UI stable)
        const fallback: VINReport = {
          vin: VIN,
          model: "BMW 3 Series",
          year: 2014,
          engine: "2.0L Diesel",
          plant: "Munich",
          lifecycleStatus: "Deregistered – Under Monitoring",
          riskLevel: "HIGH",
          confidence: 72,
          elvLikelihood: 78,
          informalMarketProbability: 64,
          productionDate: "2014-03-22",
          firstRegistrationCountry: "Germany",
          warrantyStatus: "Expired",
          lastAuthorizedService: "2021-08-11",
          recallCompletionStatus: "Complete",
          deregistrationDate: "2023-07-14",
        };

        const chosen = rep ?? fallback;
        setReport(chosen);
        setConfidence(typeof chosen.confidence === "number" ? chosen.confidence : 72);

        // 2) Load sightings data from vinSearches (latest 200 for this VIN)
        const q = query(
          collection(db, "vinSearches"),
          where("vin", "==", VIN),
          orderBy("searchedAt", "desc"),
          limit(200)
        );
        const sSnap = await getDocs(q);

        const rows = sSnap.docs.map((d) => d.data() as any);
        setResightings(rows.length);

        const last = rows[0];
        setLastCountry(last?.countryCode ?? "—");

        // sources = roles that searched it (customs/garage/dealer/recycler/oem)
        const roleSet = new Set<string>();
        for (const r of rows) {
          if (r.role) roleSet.add(String(r.role));
        }
        const pretty = [...roleSet]
          .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
          .slice(0, 4)
          .join(", ");
        setSources(pretty || "—");
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load passport");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [VIN]);

  const riskLevelText =
    report?.riskLevel === "HIGH" ? "High Risk" : report?.riskLevel === "MEDIUM" ? "Moderate Risk" : report?.riskLevel === "LOW" ? "Low Risk" : (report?.riskLevel ?? "—");

  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: 32 }}>
      {/* HEADER */}
      <div className="panel" style={{ padding: 28 }}>
        <div className="grid-12">
          <div style={{ gridColumn: "span 8" }}>
            <div className="muted">Digital Vehicle Passport</div>

            <div
              style={{
                fontFamily: "monospace",
                fontSize: 34,
                fontWeight: 700,
                marginTop: 6,
              }}
            >
              {VIN}
            </div>

            <div className="muted" style={{ marginTop: 10 }}>
              Model: {report?.model ?? "—"} • Year: {report?.year ?? "—"} • Engine: {report?.engine ?? "—"} • Plant:{" "}
              {report?.plant ?? "—"}
            </div>
          </div>

          <div style={{ gridColumn: "span 4", textAlign: "right" }}>
            <Badge text={report?.lifecycleStatus ?? "—"} />
            <Risk level={riskLevelText} confidence={`${confidence}%`} />
          </div>
        </div>
      </div>

      {err && (
        <div className="panel section" style={{ padding: 16, color: "#ff6b6b" }}>
          {err}
        </div>
      )}

      {loading && (
        <div className="panel section" style={{ padding: 16 }}>
          Loading passport…
        </div>
      )}

      {/* LIFECYCLE */}
      <div className="grid-12 section">
        <Card title="Formal Lifecycle Record" span={6}>
          <Row label="Production Date" value={report?.productionDate ?? "—"} ok={!!report?.productionDate} />
          <Row label="First Registration Country" value={report?.firstRegistrationCountry ?? "—"} ok={!!report?.firstRegistrationCountry} />
          <Row label="Warranty Status" value={report?.warrantyStatus ?? "—"} />
          <Row label="Last Authorized Service" value={report?.lastAuthorizedService ?? "—"} ok={!!report?.lastAuthorizedService} />
          <Row label="Recall Completion Status" value={report?.recallCompletionStatus ?? "—"} ok={report?.recallCompletionStatus === "Complete"} />
          <Row label="Deregistration Date" value={report?.deregistrationDate ?? "—"} />
        </Card>

        <Card title="Downstream Continuity Signals" span={6}>
          <Row label="Total Re-Sightings" value={String(resightings)} />
          <Row label="Last Detected Country" value={lastCountry} />
          <Row label="Signal Sources" value={sources} />
          <Row label="Time Since Deregistration" value="—" inferred />

          <div style={{ marginTop: 18 }}>
            <div className="muted">Confidence</div>
            <div style={{ height: 6, background: "#222", marginTop: 6 }}>
              <div style={{ width: `${confidence}%`, height: 6, background: "var(--accent)" }} />
            </div>
          </div>
        </Card>
      </div>

      {/* RISK */}
      <div className="panel section" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Risk Intelligence Breakdown</h2>

        <div className="grid-12">
          <div style={{ gridColumn: "span 6" }}>
            <Score label="ELV Likelihood Score" val={`${report?.elvLikelihood ?? "—"}%`} />
            <Score label="Informal Market Probability" val={`${report?.informalMarketProbability ?? "—"}%`} />
          </div>

          <div style={{ gridColumn: "span 6" }}>
            {drivers.map((d) => (
              <div key={d.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span title="Driver explanation tooltip (MVP)">{d.label}</span>
                <span className="muted">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TIMELINE */}
      <div className="panel section" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Signal Activity Overview</h2>

        <div style={{ display: "flex", gap: 18, marginTop: 20, flexWrap: "wrap" }}>
          {signals.map((s) => (
            <div key={s} style={{ textAlign: "center", minWidth: 90 }}>
              <div
                title="Hover: timestamp + reliability score (next)"
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 50,
                  background: "var(--accent)",
                  margin: "0 auto",
                }}
              />
              <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                {s}
              </div>
            </div>
          ))}
        </div>

        <button style={{ marginTop: 22, border: "1px solid var(--muted)", padding: "10px 20px", background: "transparent", color: "#fff" }}>
          View Full Signal Timeline →
        </button>
      </div>

      {/* SUSTAINABILITY */}
      <div className="panel section" style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Circularity & Reporting Impact</h2>

        <div className="grid-12">
          <Metric label="Lifecycle Continuation Indicator" val="Active" />
          <Metric label="ELV Risk Contribution Index" val={report?.riskLevel === "HIGH" ? "High" : report?.riskLevel === "MEDIUM" ? "Moderate" : "Low"} />
          <Metric label="Downstream Monitoring Status" val="Tracking" />
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, span }: { title: string; children: any; span: number }) {
  return (
    <div style={{ gridColumn: `span ${span}` }} className="panel">
      <div style={{ padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  ok,
  inferred,
}: {
  label: string;
  value: string;
  ok?: boolean;
  inferred?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
      <span className="muted">{label}</span>
      <span style={{ textDecoration: inferred ? "underline dotted" : "none" }}>
        {value} {ok && "✓"}
      </span>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--accent)",
        color: "var(--accent)",
        padding: "6px 12px",
        display: "inline-block",
      }}
    >
      {text}
    </div>
  );
}

function Risk({ level, confidence }: { level: string; confidence: string }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 700 }}>{level}</div>
      <div className="muted">Confidence: {confidence}</div>
    </div>
  );
}

function Score({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="muted">{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700 }}>{val}</div>
    </div>
  );
}

function Metric({ label, val }: { label: string; val: string }) {
  return (
    <div style={{ gridColumn: "span 4" }}>
      <div className="muted">{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{val}</div>
    </div>
  );
}