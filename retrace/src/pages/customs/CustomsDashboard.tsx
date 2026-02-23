import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { searchVin, type VinReport } from "../../services/searchVin";

type UserProfile = {
  fullName?: string;
  orgName?: string;
  role?: string;
  countryCode?: string; // "KE"
  region?: string;      // "Nairobi"
  phoneE164?: string;
};

type VinSearchRow = {
  vin: string;
  searchedAt?: any;
  countryCode?: string;
  region?: string;
  role?: string;
  riskLevel?: string;
};

function normalizeVIN(v: string) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export default function CustomsDashboard() {
  const nav = useNavigate();
  const user = auth.currentUser;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [regionFilter, setRegionFilter] = useState<string>("");

  const [vin, setVin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [report, setReport] = useState<VinReport | null>(null);

  // Optional insight panel data
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [recentRegionalCount, setRecentRegionalCount] = useState<number>(0);
  const [highRiskThisMonth, setHighRiskThisMonth] = useState<number>(0);
  const [avgYear, setAvgYear] = useState<number | null>(null);

  // Load officer profile
  useEffect(() => {
    const run = async () => {
      setProfileLoading(true);
      setErr(null);

      try {
        if (!user) {
          setProfile(null);
          return;
        }
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          setProfile(null);
          setErr("Profile missing. Please register first.");
          return;
        }
        const p = snap.data() as UserProfile;
        setProfile(p);

        // default filter = officer region
        if (p.region && !regionFilter) setRegionFilter(p.region);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load officer profile");
      } finally {
        setProfileLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Optional: load market insights for region
  useEffect(() => {
    const runInsights = async () => {
      if (!profile?.countryCode) return;
      setInsightsLoading(true);

      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // We’ll do a simple MVP approach:
        // - pull last N vinSearches and aggregate client-side
        // (fast + free; later: rollups)
        const qy = query(collection(db, "vinSearches"), orderBy("searchedAt", "desc"), limit(700));
        const snap = await getDocs(qy);
        const rows = snap.docs.map((d) => d.data() as VinSearchRow);

        const regionKey = `${profile.countryCode} • ${regionFilter || profile.region || "—"}`;

        let regionalCount = 0;
        let high = 0;

        const years: number[] = [];
        for (const r of rows) {
          const cc = r.countryCode ?? "—";
          const rg = r.region ?? "—";
          const key = `${cc} • ${rg}`;
          if (key === regionKey) regionalCount += 1;

          const dt = r.searchedAt?.toDate?.() as Date | undefined;
          if (dt && dt >= monthStart && r.riskLevel === "HIGH") high += 1;
        }

        // Avg vehicle year from vinReports for last few VINs in region (MVP approximation)
        // We’ll sample unique VINs from the same region and fetch their vinReports.
        const uniq = Array.from(
          new Set(
            rows
              .filter((r) => `${(r.countryCode ?? "—")} • ${(r.region ?? "—")}` === regionKey)
              .map((r) => r.vin)
              .filter(Boolean)
          )
        ).slice(0, 8);

        for (const v of uniq) {
          const repSnap = await getDoc(doc(db, "vinReports", v));
          if (repSnap.exists()) {
            const d = repSnap.data() as any;
            if (typeof d.year === "number") years.push(d.year);
          }
        }

        setRecentRegionalCount(regionalCount);
        setHighRiskThisMonth(high);

        if (years.length) {
          const sum = years.reduce((a, b) => a + b, 0);
          setAvgYear(Math.round(sum / years.length));
        } else {
          setAvgYear(null);
        }
      } catch {
        // keep silent for MVP; insights are optional
      } finally {
        setInsightsLoading(false);
      }
    };

    if (profile?.countryCode) runInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.countryCode, regionFilter]);

  const verify = async () => {
    setErr(null);
    const v = normalizeVIN(vin);
    if (!v) return setErr("Enter a VIN.");
    if (v.length < 11) return setErr("VIN looks too short.");

    setBusy(true);
    try {
      // ✅ This already logs vinSearches with officer’s org/role/country/region (from users/{uid})
      const rep = await searchVin(v);
      setReport(rep);
    } catch (e: any) {
      setErr(e?.message ?? "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const lifecycleBadge = useMemo(() => {
    if (!report) return null;
    return report.riskLevel === "HIGH"
      ? { text: "Lifecycle Continuity Detected", tone: "danger" as const }
      : { text: "No Downstream Signals Recorded", tone: "neutral" as const };
  }, [report]);

  const confidenceLabel = useMemo(() => {
    const c = report?.confidence ?? 0;
    if (c >= 80) return "High";
    if (c >= 65) return "Moderate";
    return "Low";
  }, [report?.confidence]);

  // Minimal “risk drivers” (MVP) — later compute from true signals
  const drivers = useMemo(() => {
    if (!report) return [];
    const list: { label: string }[] = [];
    if (report.year && new Date().getFullYear() - report.year >= 12) list.push({ label: "Age Threshold" });
    if (report.riskLevel === "HIGH") list.push({ label: "Lifecycle Continuity Signals" });
    list.push({ label: "Previous Export Flag (placeholder)" });
    return list;
  }, [report]);

  if (!user) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 32 }}>
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>RE:TRACE Customs Verification</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Sign in required.
          </div>
          <div style={{ marginTop: 16 }}>
            <Link to="/login" style={linkBtn}>
              Go to Login →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: 32 }}>
      {/* HEADER */}
      <div className="panel" style={{ padding: 22 }}>
        <div className="grid-12" style={{ alignItems: "center" }}>
          <div style={{ gridColumn: "span 8" }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>RE:TRACE Customs Verification</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Lifecycle verification support for vehicle imports.
            </div>
          </div>

          <div style={{ gridColumn: "span 4", textAlign: "right" }}>
            <div style={{ display: "inline-grid", gap: 8, minWidth: 320 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700 }}>
                    {profileLoading ? "Loading…" : profile?.fullName ?? "Officer"}
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {profile?.orgName ?? "—"} • {profile?.countryCode ?? "—"}
                  </div>
                </div>

                <button
                  onClick={() => nav("/oem")}
                  style={{ border: "1px solid #2A3A4D", background: "transparent", color: "#fff", padding: "8px 10px" }}
                  title="Only for demo navigation"
                >
                  OEM →
                </button>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Region filter
                </div>
                <input
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  placeholder={profile?.region ?? "e.g. Nairobi"}
                  style={input}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VIN PANEL + OPTIONAL INSIGHTS */}
      <div className="grid-12 section">
        {/* VIN Verification Panel */}
        <div className="panel" style={{ gridColumn: "span 8", padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>VIN Verification</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Instant lifecycle context for faster classification.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 12, marginTop: 16 }}>
            <input
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="Enter VIN (monospace)"
              style={vinInput}
            />
            <button onClick={verify} disabled={busy} style={primaryBtn}>
              {busy ? "Verifying…" : "Verify Vehicle"}
            </button>
          </div>

          {err && <div style={{ marginTop: 12, color: "#ff6b6b", fontSize: 13 }}>{err}</div>}

          <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
            Subtext: Faster clearance • Reduced misclassification • ELV risk visibility
          </div>
        </div>

        {/* Market Pattern Insight Panel (Optional) */}
        <div className="panel" style={{ gridColumn: "span 4", padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Market Pattern Insight</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Quick signals for your region.
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            <MiniStat
              label="Recent Imports in Region"
              value={insightsLoading ? "…" : String(recentRegionalCount)}
              hint={`${profile?.countryCode ?? "—"} • ${regionFilter || profile?.region || "—"}`}
            />
            <MiniStat
              label="High-Risk Events This Month"
              value={insightsLoading ? "…" : String(highRiskThisMonth)}
              hint="Based on vinSearches"
            />
            <MiniStat
              label="Average Vehicle Year (sample)"
              value={insightsLoading ? "…" : avgYear ? String(avgYear) : "—"}
              hint="Sampled from vinReports"
            />
          </div>
        </div>
      </div>

      {/* AFTER VERIFICATION */}
      {report && (
        <>
          {/* Vehicle Lifecycle Snapshot */}
          <div className="panel section" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>Vehicle Lifecycle Snapshot</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  Formal record + downstream continuity context
                </div>
              </div>

              {lifecycleBadge && <Badge text={lifecycleBadge.text} tone={lifecycleBadge.tone} />}
            </div>

            <div className="grid-12" style={{ marginTop: 18 }}>
              <InfoRow label="VIN" value={report.vin} mono span={6} />
              <InfoRow label="Model" value={report.model} span={3} />
              <InfoRow label="Year" value={String(report.year)} span={3} />

              <InfoRow label="Production Country" value="Germany (placeholder)" span={4} />
              <InfoRow label="Deregistration Status" value={report.lifecycleStatus} span={4} />
              <InfoRow label="Time Since Deregistration" value="— (next: compute)" inferred span={4} />
            </div>
          </div>

          {/* ELV Risk Panel */}
          <div className="grid-12 section">
            <div className="panel" style={{ gridColumn: "span 8", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>ELV Risk Indicator</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Classification assistance (risk + explainability)
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "#2A3A4D" }}>Signal Generated</div>
                  <div style={{ fontWeight: 800 }}>Port re-sighting event</div>
                </div>
              </div>

              <div className="grid-12" style={{ marginTop: 18 }}>
                <BigMetric label="ELV Likelihood" value={`${report.elvLikelihood}%`} span={4} />
                <BigMetric label="Confidence" value={confidenceLabel} span={4} />
                <BigMetric label="Risk Level" value={report.riskLevel} span={4} />
              </div>

              <div style={{ marginTop: 18 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Risk Drivers
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {drivers.map((d) => (
                    <div key={d.label} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{d.label}</span>
                      <span className="muted">—</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Documentation Support */}
            <div className="panel" style={{ gridColumn: "span 4", padding: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>Verification Support</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Practical outputs for clearance workflows.
              </div>

              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                <button style={ghostBtn} onClick={() => downloadText("lifecycle-summary.txt", buildSummary(report))}>
                  Download Lifecycle Summary
                </button>
                <button style={ghostBtn} onClick={() => alert("MVP: This would attach summary to your clearance report system.")}>
                  Attach to Clearance Report
                </button>
                <button style={ghostBtn} onClick={() => downloadText("classification-snapshot.txt", buildSnapshot(report, profile, regionFilter))}>
                  Export Classification Snapshot
                </button>
              </div>

              <div className="muted" style={{ marginTop: 14, fontSize: 12 }}>
                (MVP) Exports are text files for now. Next upgrade: PDF export.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- UI helpers ---------------- */

function Badge({ text, tone }: { text: string; tone: "neutral" | "danger" }) {
  const border = tone === "danger" ? "#1C6FFF" : "#2A3A4D";
  const color = tone === "danger" ? "#1C6FFF" : "#FFFFFF";
  return (
    <div style={{ border: `1px solid ${border}`, color, padding: "6px 12px", display: "inline-block" }}>
      {text}
    </div>
  );
}

function InfoRow({
  label,
  value,
  span,
  mono,
  inferred,
}: {
  label: string;
  value: string;
  span: number;
  mono?: boolean;
  inferred?: boolean;
}) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: mono ? "monospace" : "inherit",
          textDecoration: inferred ? "underline dotted" : "none",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function BigMetric({ label, value, span }: { label: string; value: string; span: number }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div style={{ borderBottom: "1px solid #2A3A4D", paddingBottom: 10 }}>
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 6 }}>{value}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        {hint}
      </div>
    </div>
  );
}

/* ---------------- Export helpers ---------------- */

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildSummary(r: VinReport) {
  return [
    "RE:TRACE – Lifecycle Summary",
    "---------------------------",
    `VIN: ${r.vin}`,
    `Model: ${r.model}`,
    `Year: ${r.year}`,
    `Risk Level: ${r.riskLevel}`,
    `ELV Likelihood: ${r.elvLikelihood}%`,
    `Confidence: ${r.confidence}%`,
    "",
    "Formal Lifecycle (MVP placeholders)",
    `Production Date: ${r.productionDate}`,
    `First Registration Country: ${r.firstRegistrationCountry}`,
    `Deregistration Date: ${r.deregistrationDate}`,
    "",
    "Note: This summary is generated for clearance assistance.",
  ].join("\n");
}

function buildSnapshot(r: VinReport, p: any, regionFilter: string) {
  return [
    "RE:TRACE – Classification Snapshot",
    "--------------------------------",
    `VIN: ${r.vin}`,
    `Officer Org: ${p?.orgName ?? "—"}`,
    `Role: ${p?.role ?? "—"}`,
    `Country: ${p?.countryCode ?? "—"}`,
    `Region: ${regionFilter || p?.region || "—"}`,
    "",
    `Risk Level: ${r.riskLevel}`,
    `ELV Likelihood: ${r.elvLikelihood}%`,
    `Confidence: ${r.confidence}%`,
    "",
    "Signal: Port re-sighting event recorded (by VIN verification).",
  ].join("\n");
}

/* ---------------- Styles ---------------- */

const input: React.CSSProperties = {
  padding: 10,
  border: "1px solid #2A3A4D",
  background: "transparent",
  color: "#FFFFFF",
  outline: "none",
};

const vinInput: React.CSSProperties = {
  padding: 12,
  border: "1px solid #2A3A4D",
  background: "transparent",
  color: "#FFFFFF",
  outline: "none",
  fontFamily: "monospace",
  fontSize: 16,
};

const primaryBtn: React.CSSProperties = {
  border: "1px solid #1C6FFF",
  background: "#1C6FFF",
  color: "#FFFFFF",
  fontWeight: 800,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "12px 12px",
  border: "1px solid #2A3A4D",
  background: "transparent",
  color: "#FFFFFF",
  textAlign: "left",
  cursor: "pointer",
};

const linkBtn: React.CSSProperties = {
  border: "1px solid #2A3A4D",
  padding: "10px 14px",
  color: "#FFFFFF",
  textDecoration: "none",
};