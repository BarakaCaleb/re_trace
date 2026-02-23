import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../../config/firebase";
import { searchVin } from "../../services/searchVin";
import OEMVinUploader from "./OEMVinUploader";

type VinSearchRow = {
  vin: string;
  searchedAt?: any;
  countryCode?: string; // "KE"
  region?: string;      // "Nairobi"
  role?: string;        // customs/garage/dealer/recycler/oem
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

  const DAYS = 14;

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr(null);
      try {
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
  }, [DAYS]);

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
    const regions = new Set<string>();
    let highRisk = 0;

    for (const r of windowedRows) {
      if (r.vin) uniqueVins.add(r.vin);
      if (r.countryCode) countries.add(r.countryCode);

      const cc = r.countryCode ?? "—";
      const rg = r.region ?? "—";
      regions.add(`${cc} • ${rg}`);

      if (r.riskLevel === "HIGH") highRisk += 1;
    }

    return {
      totalSearches: total,
      uniqueVins: uniqueVins.size,
      highRisk,
      activeCountries: countries.size,
      activeRegions: regions.size,
    };
  }, [windowedRows]);

  const regionTable = useMemo(() => {
    const counts: Record<string, { total: number; high: number }> = {};

    for (const r of windowedRows) {
      const cc = r.countryCode ?? "—";
      const rg = r.region ?? "—";
      const key = `${cc} • ${rg}`;

      if (!counts[key]) counts[key] = { total: 0, high: 0 };
      counts[key].total += 1;
      if (r.riskLevel === "HIGH") counts[key].high += 1;
    }

    return Object.entries(counts)
      .map(([regionKey, v]) => ({
        regionKey,
        total: v.total,
        high: v.high,
        highPct: v.total ? Math.round((v.high / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [windowedRows]);

  const trend = useMemo(() => {
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
  }, [windowedRows, DAYS]);

  const latestHighRisk = useMemo(() => {
    return windowedRows
      .filter((r) => r.riskLevel === "HIGH")
      .slice(0, 12)
      .map((r) => ({
        vin: r.vin,
        countryCode: r.countryCode ?? "—",
        region: r.region ?? "—",
        role: r.role ?? "—",
        orgName: r.orgName ?? "—",
        at: r.searchedAt?.toDate?.() as Date | undefined,
      }));
  }, [windowedRows]);

  const maxRegionTotal = useMemo(() => Math.max(1, ...regionTable.map((x) => x.total)), [regionTable]);

  const searchVIN = async () => {
    setErr(null);
    const v = normalizeVIN(vin);
    if (!v) return setErr("Enter a VIN.");
    if (v.length < 11) return setErr("VIN looks too short.");

    setBusy(true);
    try {
      await searchVin(v);
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
            {busy ? "Searching…" : "Search VIN"}
          </button>
        </div>

        {err && <div style={{ marginTop: 10, color: "#ff6b6b", fontSize: 13 }}>{err}</div>}
      </div>

      {/* ✅ NEW: VIN seeding */}
      <div className="section">
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>VIN Seeding (OEM Catalog)</div>
        <div style={{ color: "#2A3A4D", marginBottom: 14 }}>
          Add VINs to <span style={{ fontFamily: "monospace" }}>vinCatalog</span> so downstream searches resolve to official identity.
        </div>
        <OEMVinUploader />
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
            <KPI title="Active Regions" value={stats.activeRegions} sub={`country • region`} />
          </div>

          {/* Two-column: Region heat table + Trend */}
          <div className="grid-12 section">
            {/* Region activity */}
            <div className="panel" style={{ gridColumn: "span 7", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h2 style={{ margin: 0, fontSize: 24 }}>Regional Activity (Country • Region)</h2>
                <div style={{ color: "#2A3A4D", fontSize: 13 }}>Intensity = volume • % = high-risk ratio</div>
              </div>

              <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                {regionTable.length === 0 ? (
                  <div style={{ color: "#2A3A4D" }}>No activity yet. Run VIN searches to generate signals.</div>
                ) : (
                  regionTable.slice(0, 12).map((r) => {
                    const intensity = Math.max(0.08, r.total / maxRegionTotal);
                    return (
                      <div
                        key={r.regionKey}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "220px 1fr 160px",
                          gap: 12,
                          alignItems: "center",
                          paddingBottom: 10,
                          borderBottom: "1px solid #2A3A4D",
                        }}
                      >
                        <div style={{ fontFamily: "monospace" }}>{r.regionKey}</div>

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
                          {r.total} total • {r.high} high • {r.highPct}%
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ marginTop: 14, color: "#2A3A4D", fontSize: 12 }}>
                Captured from user profile (countryCode + region) and logged per vinSearch.
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
                    <div
                      key={d.key}
                      style={{ display: "grid", gridTemplateColumns: "110px 1fr 50px", gap: 12, alignItems: "center" }}
                    >
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

              <div style={{ marginTop: 14, color: "#2A3A4D", fontSize: 12 }}>White overlay indicates high-risk ratio.</div>
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
                      gridTemplateColumns: "220px 90px 160px 120px 1fr 180px",
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
                    <div style={{ color: "#2A3A4D" }}>{r.region}</div>
                    <div style={{ color: "#2A3A4D" }}>{r.role}</div>
                    <div style={{ color: "#2A3A4D" }}>{r.orgName}</div>
                    <div style={{ color: "#2A3A4D", fontSize: 12 }}>{r.at ? r.at.toLocaleString() : "—"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <div className="section" style={{ color: "#2A3A4D", fontSize: 12 }}>
        Note: If Firestore prompts an index later, click the console link to auto-create it.
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