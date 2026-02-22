import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";

type VinSearchRow = {
  vin: string;
  searchedAt?: any;
  countryCode?: string;     // "KE"
  region?: string;          // later
  role?: string;            // customs/garage/dealer/recycler/oem
  orgName?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | string;
};

function normalizeVIN(v: string) {
  return v.trim().toUpperCase().replace(/\s+/g, "");
}

function dayKey(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function OEMDashboard() {
  const nav = useNavigate();

  const [vin, setVin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<VinSearchRow[]>([]);
  const [loading, setLoading] = useState(true);

  // MVP window: last N days computed from latest rows
  const DAYS = 14;

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr(null);
      try {
        // Pull recent searches; we aggregate client-side for MVP
        // Increase limit if you have more data
        const q = query(collection(db, "vinSearches"), orderBy("searchedAt", "desc"), limit(1500));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => d.data() as VinSearchRow);
        setRows(data);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const windowStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (DAYS - 1));
    return startOfDay(d);
  }, []);

  const windowedRows = useMemo(() => {
    return rows.filter((r) => {
      const dt = r.searchedAt?.toDate?.();
      return dt ? dt >= windowStart : false;
    });
  }, [rows, windowStart]);

  const stats = useMemo(() => {
    const total = windowedRows.length;

    const uniqueVins = new Set<string>();
    const countries = new Set<string>();
    let highRisk = 0;

    for (const r of windowedRows) {
      if (r.vin) uniqueVins.add(r.vin);
      if (r.countryCode) countries.add(r.countryCode);
      if (r.riskLevel === "HIGH") highRisk += 1;
    }

    return {
      totalSearches: total,
      uniqueVins: uniqueVins.size,
      highRisk,
      activeCountries: countries.size,
    };
  }, [windowedRows]);

  const countryTable = useMemo(() => {
    const counts: Record<string, { total: number; high: number }> = {};
    for (const r of windowedRows) {
      const rg = r.region ?? "—";
      const key = `${cc} • ${rg}`;
      if (!counts[key]) counts[key] = { total: 0, high: 0 };
      counts[key].total += 1;
      if (r.riskLevel === "HIGH") counts[key].high += 1;
    }

    const out = Object.entries(counts)
      .map(([countryCode, v]) => ({ countryCode, total: v.total, high: v.high }))
      .sort((a, b) => b.total - a.total);

    return out;
  }, [windowedRows]);

  const trend = useMemo(() => {
    // Build last 14 days series
    const today = startOfDay(new Date());
    const days: { key: string; total: number; high: number }[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({ key: dayKey(d), total: 0, high: 0 });
    }

    const index: Record<string, number> = {};
    days.forEach((d, idx) => (index[d.key] = idx));

    for (const r of windowedRows) {
      const dt = r.searchedAt?.toDate?.();
      if (!dt) continue;
      const k = dayKey(dt);
      const idx = index[k];
      if (idx === undefined) continue;
      days[idx].total += 1;
      if (r.riskLevel === "HIGH") days[idx].high += 1;
    }

    return days;
  }, [windowedRows]);

  const latestHighRisk = useMemo(() => {
    const out = windowedRows
      .filter((r) => r.riskLevel === "HIGH")
      .slice(0, 12)
      .map((r) => ({
        vin: r.vin,
        countryCode: r.countryCode ?? "—",
        role: r.role ?? "—",
        orgName: r.orgName ?? "—",
        at: r.searchedAt?.toDate?.() as Date | undefined,
      }));
    return out;
  }, [windowedRows]);

  const maxCountryTotal = useMemo(() => {
    return Math.max(1, ...countryTable.map((x) => x.total));
  }, [countryTable]);

  const searchVIN = async () => {
  setErr(null);
  const v = normalizeVIN(vin);
  if (!v) return setErr("Enter a VIN.");
  if (v.length < 11) return setErr("VIN looks too short.");

  setBusy(true);
  try {
    const fn = httpsCallable(functions, "searchVin");
    const res = await fn({ vin: v });
    // res.data is the report
    nav(`/oem/passport/${v}`);
  } catch (e: any) {
    setErr(e?.message ?? "Search failed");
  } finally {
    setBusy(false);
  }
};

  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: 32 }}>
      {/* Top header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>OEM Intelligence Dashboard</div>
          <div style={{ color: "#2A3A4D", marginTop: 6 }}>
            Window: last {DAYS} days • Data source: vinSearches (append-only)
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Link to="/oem/passport/WBA8E9G51GNU12345" style={linkBtn}>
            Open Sample Passport →
          </Link>
        </div>
      </div>

      {/* VIN Lookup */}
      <div className="panel section" style={{ padding: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>VIN Lookup</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 12 }}>
          <input
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            placeholder="Enter VIN (e.g., WBA8E9G51GNU12345)"
            style={vinInput}
          />
          <button onClick={searchVIN} disabled={busy} style={primaryBtn}>
            {busy ? "Opening…" : "Open Passport"}
          </button>
        </div>

        {err && <div style={{ marginTop: 10, color: "#ff6b6b", fontSize: 13 }}>{err}</div>}
      </div>

      {loading && (
        <div className="panel section" style={{ padding: 16 }}>
          Loading OEM analytics…
        </div>
      )}

      {!loading && (
        <>
          {/* KPI Row */}
          <div className="grid-12 section">
            <KPI title="VIN Searches" value={stats.totalSearches} sub={`last ${DAYS} days`} />
            <KPI title="Unique VINs" value={stats.uniqueVins} sub={`last ${DAYS} days`} />
            <KPI title="High Risk Signals" value={stats.highRisk} sub={`last ${DAYS} days`} />
            <KPI title="Active Countries" value={stats.activeCountries} sub={`last ${DAYS} days`} />
          </div>

          {/* Two-column: Country heat table + Trend */}
          <div className="grid-12 section">
            {/* Country activity */}
            <div className="panel" style={{ gridColumn: "span 7", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h2 style={{ margin: 0, fontSize: 24 }}>Regional Activity (Country Heat)</h2>
                <div style={{ color: "#2A3A4D", fontSize: 13 }}>Intensity = volume</div>
              </div>

              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                {countryTable.length === 0 ? (
                  <div style={{ color: "#2A3A4D" }}>No activity yet. Run VIN searches to generate signals.</div>
                ) : (
                  countryTable.slice(0, 12).map((r) => {
                    const intensity = Math.max(0.08, r.total / maxCountryTotal); // 0..1
                    return (
                      <div
                        key={r.countryCode}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "110px 1fr 120px",
                          gap: 12,
                          alignItems: "center",
                          paddingBottom: 10,
                          borderBottom: "1px solid #2A3A4D",
                        }}
                      >
                        <div style={{ fontFamily: "monospace" }}>{r.countryCode}</div>

                        <div style={{ height: 10, background: "#0e0e0e", border: "1px solid #2A3A4D" }}>
                          <div
                            style={{
                              width: `${Math.round(intensity * 100)}%`,
                              height: 10,
                              background: "var(--accent)",
                            }}
                          />
                        </div>

                        <div style={{ textAlign: "right", color: "#2A3A4D" }}>
                          {r.total} total • {r.high} high
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ marginTop: 14, color: "#2A3A4D", fontSize: 12 }}>
                Next: replace country with country + region (county/province) once you capture `region` at signup.
              </div>
            </div>

            {/* Trend */}
            <div className="panel" style={{ gridColumn: "span 5", padding: 24 }}>
              <h2 style={{ margin: 0, fontSize: 24 }}>Signal Trend (Daily)</h2>
              <div style={{ color: "#2A3A4D", fontSize: 13, marginTop: 6 }}>Total vs High-risk</div>

              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                {trend.map((d) => {
                  const max = Math.max(1, ...trend.map((x) => x.total));
                  const w = Math.round((d.total / max) * 100);
                  const wh = d.total ? Math.round((d.high / d.total) * w) : 0;

                  return (
                    <div key={d.key} style={{ display: "grid", gridTemplateColumns: "110px 1fr 50px", gap: 12, alignItems: "center" }}>
                      <div style={{ fontFamily: "monospace", color: "#2A3A4D", fontSize: 12 }}>{d.key}</div>
                      <div style={{ height: 10, background: "#0e0e0e", border: "1px solid #2A3A4D", position: "relative" }}>
                        <div style={{ width: `${w}%`, height: 10, background: "var(--accent)" }} />
                        <div style={{ width: `${wh}%`, height: 10, background: "#ffffff", position: "absolute", top: 0, left: 0, opacity: 0.25 }} />
                      </div>
                      <div style={{ textAlign: "right", color: "#2A3A4D", fontSize: 12 }}>{d.total}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 14, color: "#2A3A4D", fontSize: 12 }}>
                White overlay indicates high-risk ratio (for quick scanning).
              </div>
            </div>
          </div>

          {/* Latest high-risk */}
          <div className="panel section" style={{ padding: 24 }}>
            <h2 style={{ margin: 0, fontSize: 24 }}>Latest High-Risk Sightings</h2>
            <div style={{ color: "#2A3A4D", fontSize: 13, marginTop: 6 }}>
              Forensic trail: who queried what, and where signals originated
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              {latestHighRisk.length === 0 ? (
                <div style={{ color: "#2A3A4D" }}>No high-risk sightings in this window yet.</div>
              ) : (
                latestHighRisk.map((r, idx) => (
                  <div
                    key={`${r.vin}-${idx}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "220px 90px 120px 1fr 180px",
                      gap: 12,
                      paddingBottom: 10,
                      borderBottom: "1px solid #2A3A4D",
                      alignItems: "center",
                    }}
                  >
                    <Link to={`/oem/passport/${r.vin}`} style={{ color: "#fff", textDecoration: "none", fontFamily: "monospace" }}>
                      {r.vin}
                    </Link>
                    <div style={{ fontFamily: "monospace", color: "#2A3A4D" }}>{r.countryCode}</div>
                    <div style={{ color: "#2A3A4D" }}>{r.role}</div>
                    <div style={{ color: "#2A3A4D" }}>{r.orgName}</div>
                    <div style={{ color: "#2A3A4D", fontSize: 12 }}>
                      {r.at ? r.at.toLocaleString() : "—"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className="section" style={{ color: "#2A3A4D", fontSize: 12 }}>
        Note: If Firestore prompts an index for vinSearches queries elsewhere, click the link in the error to auto-create it.
      </div>
    </div>
  );
}

function KPI({ title, value, sub }: { title: string; value: number; sub: string }) {
  return (
    <div className="panel" style={{ gridColumn: "span 3", padding: 18 }}>
      <div style={{ color: "#2A3A4D", fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8 }}>{value}</div>
      <div style={{ color: "#2A3A4D", fontSize: 12, marginTop: 6 }}>{sub}</div>
    </div>
  );
}

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

const linkBtn: React.CSSProperties = {
  border: "1px solid #2A3A4D",
  padding: "10px 14px",
  color: "#FFFFFF",
  textDecoration: "none",
};