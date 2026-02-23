import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc, serverTimestamp, setDoc, increment } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { searchVin, type VinReport } from "../../services/searchVin";
import { TECH_DATA } from "../../data/garageTechData";

type UserProfile = {
  fullName?: string;
  orgName?: string;
  role?: string;
  countryCode?: string;
  region?: string;
  phoneE164?: string;

  proPoints?: number;
  lastPointsAt?: any;
};

type PartCheckResult = "COMPATIBLE" | "NOT_COMPATIBLE" | "REVIEW";

function normalizeVIN(v: string) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeSerial(v: string) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

// deterministic pseudo-check for MVP (stable per VIN+serial)
function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function partCheck(vin: string, serial: string): { result: PartCheckResult; note: string } {
  const h = hashStr(`${vin}:${serial}`);
  const pick = h % 10;

  if (pick <= 5) return { result: "COMPATIBLE", note: "Fitment match found for this VIN (MVP logic)." };
  if (pick <= 8) return { result: "REVIEW", note: "Requires further verification (MVP logic)." };
  return { result: "NOT_COMPATIBLE", note: "No match for this VIN (MVP logic)." };
}

async function awardPoints(uid: string, amount: number) {
  await setDoc(
    doc(db, "users", uid),
    {
      proPoints: increment(amount),
      lastPointsAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export default function GaragePortal() {
  const user = auth.currentUser;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // VIN flow (manual only)
  const [vin, setVin] = useState("");
  const [mileage, setMileage] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<VinReport | null>(null);

  // Technical modules
  const [openModule, setOpenModule] = useState<string | null>("torque");

  // Parts verification
  const [partSerial, setPartSerial] = useState("");
  const [partBusy, setPartBusy] = useState(false);
  const [partResult, setPartResult] = useState<{ result: PartCheckResult; note: string } | null>(null);

  // points earn tracking in-session (avoid spamming points on same VIN)
  const [earnedVinSet, setEarnedVinSet] = useState<Set<string>>(new Set());
  const [earnedPartSet, setEarnedPartSet] = useState<Set<string>>(new Set());

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
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load profile");
      } finally {
        setProfileLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const verifyVin = async () => {
    setErr(null);
    const v = normalizeVIN(vin);
    if (!v) return setErr("Enter a VIN.");
    if (v.length < 11) return setErr("VIN looks too short.");

    setBusy(true);
    try {
      const rep = await searchVin(v); // ✅ logs vinSearches with garage profile metadata
      setReport(rep);

      // Pro points: +10 for first time per VIN per session
      if (user && !earnedVinSet.has(v)) {
        await awardPoints(user.uid, 10);
        setEarnedVinSet(new Set([...earnedVinSet, v]));
      }
    } catch (e: any) {
      setErr(e?.message ?? "VIN lookup failed");
    } finally {
      setBusy(false);
    }
  };

  const doPartCheck = async () => {
    setErr(null);
    if (!report) return setErr("Verify a VIN first.");
    const serial = normalizeSerial(partSerial);
    if (!serial) return setErr("Enter part serial number.");

    setPartBusy(true);
    try {
      const res = partCheck(report.vin, serial);
      setPartResult(res);

      // Signal: store part verification event (MVP)
      if (user) {
        const key = `${report.vin}:${serial}`;
        if (!earnedPartSet.has(key)) {
          // points +5 per unique part check per session
          await awardPoints(user.uid, 5);
          setEarnedPartSet(new Set([...earnedPartSet, key]));
        }

        await setDoc(
          doc(db, "vinReports", report.vin),
          {
            lastPartCheckAt: serverTimestamp(),
            lastPartSerial: serial,
            lastPartCheckResult: res.result,
          },
          { merge: true }
        );
      }
    } catch (e: any) {
      setErr(e?.message ?? "Part check failed");
    } finally {
      setPartBusy(false);
    }
  };

  const exportHealthCheck = () => {
    if (!report) return;

    const content = [
      "RE:TRACE – Digital Health Check (MVP)",
      "-------------------------------------",
      `VIN: ${report.vin}`,
      `Model: ${report.model}`,
      `Year: ${report.year}`,
      `Engine: ${report.engine}`,
      `Mileage: ${mileage || "—"}`,
      "",
      `Mechanic: ${profile?.fullName ?? "—"}`,
      `Garage: ${profile?.orgName ?? "—"}`,
      `Region: ${(profile?.countryCode ?? "—")} • ${(profile?.region ?? "—")}`,
      "",
      "Inspection Checklist (basic):",
      "- Fluids checked",
      "- Visual leaks inspected",
      "- Brakes inspected",
      "- Battery status reviewed",
      "",
      "Badge: RE:TRACE Verified (MVP)",
      `Generated: ${new Date().toLocaleString()}`,
    ].join("\n");

    downloadText(`retrace-health-check-${report.vin}.txt`, content);
  };

  const proPoints = profile?.proPoints ?? 0;
  const nextReward = 400;
  const progress = Math.min(1, proPoints / nextReward);

  const statusBadge = useMemo(() => {
    if (!report) return null;
    return { text: "Verified with Manufacturer Data" };
  }, [report]);

  if (!user) {
    return (
      <div style={{ maxWidth: 420, margin: "0 auto", padding: 18 }}>
        <div className="panel" style={{ padding: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>RE:TRACE Garage Utility</div>
          <div className="muted" style={{ marginTop: 8 }}>
            Sign in required.
          </div>
          <div style={{ marginTop: 14 }}>
            <Link to="/login" style={linkBtn}>
              Go to Login →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 18 }}>
      {/* Header */}
      <div className="panel" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>RE:TRACE Garage Utility</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              Technical support for BMW vehicles.
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800 }}>{profileLoading ? "…" : proPoints}</div>
            <div className="muted" style={{ fontSize: 12 }}>Pro Points</div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ height: 8, border: "1px solid #2A3A4D", background: "#0e0e0e" }}>
            <div style={{ width: `${Math.round(progress * 100)}%`, height: 8, background: "var(--accent)" }} />
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Next reward at {nextReward} points • BMW shop coveralls
          </div>
        </div>
      </div>

      {/* VIN Lookup (manual only) */}
      <div className="panel section" style={{ padding: 16 }}>
        <div style={{ fontWeight: 900 }}>Enter VIN</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Access technical data instantly.
        </div>

        <input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="VIN (monospace)" style={vinInput} />

        <button onClick={verifyVin} disabled={busy} style={{ ...primaryBtn, width: "100%", marginTop: 10 }}>
          {busy ? "Verifying…" : "Lookup VIN"}
        </button>

        {err && <div style={{ marginTop: 10, color: "#ff6b6b", fontSize: 13 }}>{err}</div>}

        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          Data provided for verified VIN only.
        </div>
      </div>

      {/* Vehicle Workspace */}
      {report && (
        <>
          <div className="panel section" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontWeight: 900 }}>Vehicle Snapshot</div>
              {statusBadge && <Badge text={statusBadge.text} />}
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <Line label="VIN" value={report.vin} mono />
              <Line label="Model" value={report.model} />
              <Line label="Year" value={String(report.year)} />
              <Line label="Engine" value={report.engine} />
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: 12 }}>
                Mileage (optional)
              </div>
              <input value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="e.g. 182,400 km" style={input} />
            </div>
          </div>

          {/* Wrench's Wikipedia */}
          <div className="panel section" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900 }}>Technical Reference Data</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Wrench’s Wikipedia — scannable, VIN-specific.
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <Accordion title="Torque Specifications" open={openModule === "torque"} onToggle={() => setOpenModule(openModule === "torque" ? null : "torque")}>
                <Spec label="Wheel bolts" value="140 Nm (MVP)" />
                <Spec label="Oil drain plug" value="25 Nm (MVP)" />
                <Spec label="Spark plugs" value="23 Nm (MVP)" />
              </Accordion>

              <Accordion title="Fluid Capacities" open={openModule === "fluids"} onToggle={() => setOpenModule(openModule === "fluids" ? null : "fluids")}>
                <Spec label="Engine oil" value="5.2 L (MVP)" />
                <Spec label="Coolant" value="8.0 L (MVP)" />
                <Spec label="Brake fluid" value="DOT 4 (MVP)" />
              </Accordion>

              <Accordion title="Service Intervals" open={openModule === "service"} onToggle={() => setOpenModule(openModule === "service" ? null : "service")}>
                <Spec label="Oil + filter" value="10,000–15,000 km (MVP)" />
                <Spec label="Brake fluid" value="Every 2 years (MVP)" />
                <Spec label="Air filter" value="30,000 km (MVP)" />
              </Accordion>

              <Accordion title="Basic Wiring Diagram" open={openModule === "wiring"} onToggle={() => setOpenModule(openModule === "wiring" ? null : "wiring")}>
                <div className="muted" style={{ fontSize: 12 }}>
                  (MVP) Wiring diagram preview placeholder. Next: image/pdf per VIN group.
                </div>
              </Accordion>
            </div>

            <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
              Signal generated: VIN + region + timestamp + maintenance context (invisible).
            </div>
          </div>

          {/* Counterfeit Killer */}
          <div className="panel section" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900 }}>Part Compatibility Check</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Counterfeit Killer — verify parts before installing.
            </div>

            <input value={partSerial} onChange={(e) => setPartSerial(e.target.value)} placeholder="Enter part serial" style={input} />

            <button onClick={doPartCheck} disabled={partBusy} style={{ ...ghostBtn, width: "100%", marginTop: 10 }}>
              {partBusy ? "Checking…" : "Verify Part"}
            </button>

            {partResult && (
              <div style={{ marginTop: 12, border: "1px solid #2A3A4D", padding: 12 }}>
                <div style={{ fontWeight: 900 }}>{partResult.result}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  {partResult.note}
                </div>
              </div>
            )}

            <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>
              Signal generated: component-level association (VIN + part serial).
            </div>
          </div>

          {/* Trust Premium */}
          <div className="panel section" style={{ padding: 16 }}>
            <div style={{ fontWeight: 900 }}>Digital Health Check Certificate</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Trust Premium — give the customer a RE:TRACE Verified report.
            </div>

            <button onClick={exportHealthCheck} style={{ ...primaryBtn, width: "100%", marginTop: 12 }}>
              Generate Digital Health Check
            </button>

            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              (MVP) Exports as a text file. Next upgrade: PDF certificate.
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between" }}>
            <Link to="/customs" style={linkBtn}>
              Customs →
            </Link>
            <Link to="/oem" style={linkBtn}>
              OEM →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- UI blocks ---------- */

function Badge({ text }: { text: string }) {
  return <div style={{ border: "1px solid #1C6FFF", color: "#1C6FFF", padding: "6px 10px", fontSize: 12 }}>{text}</div>;
}

function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontFamily: mono ? "monospace" : "inherit" }}>{value}</div>
    </div>
  );
}

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ border: "1px solid #2A3A4D" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          textAlign: "left",
          padding: 12,
          background: "transparent",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: 900,
        }}
      >
        {title}
        <span className="muted">{open ? "—" : "+"}</span>
      </button>
      {open && <div style={{ padding: 12, borderTop: "1px solid #2A3A4D" }}>{children}</div>}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontSize: 12 }}>{value}</div>
    </div>
  );
}

/* ---------- export helpers ---------- */

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- styles ---------- */

const input: React.CSSProperties = {
  padding: 10,
  border: "1px solid #2A3A4D",
  background: "transparent",
  color: "#FFFFFF",
  outline: "none",
  width: "100%",
  marginTop: 10,
};

const vinInput: React.CSSProperties = {
  padding: 12,
  border: "1px solid #2A3A4D",
  background: "transparent",
  color: "#FFFFFF",
  outline: "none",
  fontFamily: "monospace",
  fontSize: 16,
  width: "100%",
  marginTop: 12,
};

const primaryBtn: React.CSSProperties = {
  border: "1px solid #1C6FFF",
  background: "#1C6FFF",
  color: "#FFFFFF",
  fontWeight: 900,
  cursor: "pointer",
  padding: "12px 12px",
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
  padding: "10px 12px",
  color: "#FFFFFF",
  textDecoration: "none",
  fontSize: 12,
};