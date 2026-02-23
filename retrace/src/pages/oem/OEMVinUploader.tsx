import { useMemo, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

function normalizeVIN(v: string) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function looksLikeVin(v: string) {
  // VIN is 17 chars normally. For MVP we accept >= 11 but prefer 17.
  const s = normalizeVIN(v);
  if (s.length < 11) return false;
  // Basic allowed chars (VIN excludes I,O,Q but we won't enforce strictly)
  return /^[A-Z0-9]+$/.test(s);
}

type CatalogPayload = {
  vin: string;
  model?: string;
  year?: number;
  engine?: string;
  plant?: string;
  oemStatus?: string;
};

type UploadResult = {
  vin: string;
  status: "SAVED" | "SKIPPED" | "INVALID" | "ERROR";
  message?: string;
};

export default function OEMVinUploader() {
  const user = auth.currentUser;

  // Single VIN form
  const [vin, setVin] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<string>("2014");
  const [engine, setEngine] = useState("");
  const [plant, setPlant] = useState("");
  const [oemStatus, setOemStatus] = useState("Active");

  // Bulk upload
  const [bulkText, setBulkText] = useState("");

  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const bulkParsed = useMemo(() => {
    // Supported formats (one per line):
    // 1) VIN
    // 2) VIN,Model,Year,Engine,Plant
    // 3) VIN|Model|Year|Engine|Plant
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const items: CatalogPayload[] = [];

    for (const line of lines) {
      const delim = line.includes("|") ? "|" : ",";
      const parts = line.split(delim).map((p) => p.trim());

      const v = normalizeVIN(parts[0] ?? "");
      if (!v) continue;

      const payload: CatalogPayload = { vin: v };

      if (parts[1]) payload.model = parts[1];
      if (parts[2]) {
        const y = Number(parts[2]);
        if (!Number.isNaN(y)) payload.year = y;
      }
      if (parts[3]) payload.engine = parts[3];
      if (parts[4]) payload.plant = parts[4];

      items.push(payload);
    }

    return items;
  }, [bulkText]);

  if (!user) {
    return (
      <div className="panel" style={{ padding: 18 }}>
        <div style={{ fontWeight: 900 }}>OEM VIN Uploader</div>
        <div className="muted" style={{ marginTop: 8 }}>
          Sign in required.
        </div>
      </div>
    );
  }

  const saveOne = async (payload: CatalogPayload) => {
    const v = normalizeVIN(payload.vin);
    if (!looksLikeVin(v)) {
      return { vin: v || payload.vin, status: "INVALID", message: "VIN invalid" } as UploadResult;
    }

    try {
      await setDoc(
        doc(db, "vinCatalog", v),
        {
          vin: v,
          model: payload.model?.trim() || null,
          year: typeof payload.year === "number" ? payload.year : null,
          engine: payload.engine?.trim() || null,
          plant: payload.plant?.trim() || null,
          oemStatus: payload.oemStatus ?? "Active",
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
          // if first time:
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        },
        { merge: true }
      );

      return { vin: v, status: "SAVED" } as UploadResult;
    } catch (e: any) {
      return { vin: v, status: "ERROR", message: e?.message ?? "Write failed" } as UploadResult;
    }
  };

  const onAddSingle = async () => {
    setErr(null);
    setResults([]);

    const v = normalizeVIN(vin);
    if (!looksLikeVin(v)) {
      setErr("Enter a valid VIN (preferably 17 characters).");
      return;
    }

    setBusy(true);
    try {
      const y = Number(year);
      const payload: CatalogPayload = {
        vin: v,
        model: model.trim() || undefined,
        year: Number.isNaN(y) ? undefined : y,
        engine: engine.trim() || undefined,
        plant: plant.trim() || undefined,
        oemStatus,
      };

      const r = await saveOne(payload);
      setResults([r]);
      if (r.status === "SAVED") setVin("");
    } finally {
      setBusy(false);
    }
  };

  const onBulkUpload = async () => {
    setErr(null);
    setResults([]);

    if (bulkParsed.length === 0) {
      setErr("Paste VINs first (one per line).");
      return;
    }

    setBusy(true);
    try {
      const out: UploadResult[] = [];
      const seen = new Set<string>();

      for (const item of bulkParsed) {
        const v = normalizeVIN(item.vin);
        if (seen.has(v)) {
          out.push({ vin: v, status: "SKIPPED", message: "Duplicate in upload list" });
          continue;
        }
        seen.add(v);

        const r = await saveOne({ ...item, oemStatus });
        out.push(r);
      }

      setResults(out);
    } finally {
      setBusy(false);
    }
  };

  const summary = useMemo(() => {
    const s = { SAVED: 0, INVALID: 0, SKIPPED: 0, ERROR: 0 };
    for (const r of results) s[r.status] += 1;
    return s;
  }, [results]);

  return (
    <div className="panel" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>OEM VIN Uploader</div>
          <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
            Seed official VIN identity so downstream searches link to known vehicles.
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div className="muted" style={{ fontSize: 12 }}>Default status</div>
          <input value={oemStatus} onChange={(e) => setOemStatus(e.target.value)} style={smallInput} />
        </div>
      </div>

      {/* SINGLE ADD */}
      <div style={{ marginTop: 16, borderTop: "1px solid #2A3A4D", paddingTop: 16 }}>
        <div style={{ fontWeight: 900 }}>Add Single VIN</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Fast seeding during demos.
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          <input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="VIN (e.g. WBA8E9G51GNU12345)" style={vinInput} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model (optional)" style={input} />
            <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year" style={input} />
          </div>

          <input value={engine} onChange={(e) => setEngine(e.target.value)} placeholder="Engine (optional)" style={input} />
          <input value={plant} onChange={(e) => setPlant(e.target.value)} placeholder="Plant (optional)" style={input} />

          <button onClick={onAddSingle} disabled={busy} style={primaryBtn}>
            {busy ? "Saving…" : "Save VIN"}
          </button>
        </div>
      </div>

      {/* BULK UPLOAD */}
      <div style={{ marginTop: 18, borderTop: "1px solid #2A3A4D", paddingTop: 16 }}>
        <div style={{ fontWeight: 900 }}>Bulk Upload</div>
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Paste lines in any of these formats:
          <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 11, color: "#2A3A4D" }}>
            VIN<br />
            VIN,Model,Year,Engine,Plant<br />
            VIN|Model|Year|Engine|Plant
          </div>
        </div>

        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={`WBA8E9G51GNU12345,BMW 3 Series,2014,2.0L Diesel,Munich\nWBAXXXXXXXX000001|BMW X5|2018|3.0L Diesel|Spartanburg`}
          style={textarea}
        />

        <button onClick={onBulkUpload} disabled={busy} style={{ ...primaryBtn, marginTop: 10 }}>
          {busy ? "Uploading…" : `Upload ${bulkParsed.length} VIN(s)`}
        </button>

        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          Tip: duplicates inside the pasted list are skipped automatically.
        </div>
      </div>

      {err && <div style={{ marginTop: 12, color: "#ff6b6b", fontSize: 13 }}>{err}</div>}

      {/* RESULTS */}
      {results.length > 0 && (
        <div style={{ marginTop: 18, borderTop: "1px solid #2A3A4D", paddingTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontWeight: 900 }}>Upload Results</div>
            <div className="muted" style={{ fontSize: 12 }}>
              SAVED {summary.SAVED} • SKIPPED {summary.SKIPPED} • INVALID {summary.INVALID} • ERROR {summary.ERROR}
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {results.slice(0, 50).map((r) => (
              <div
                key={`${r.vin}-${r.status}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px",
                  gap: 10,
                  borderBottom: "1px solid #2A3A4D",
                  paddingBottom: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ fontFamily: "monospace" }}>{r.vin}</div>
                <div style={{ textAlign: "right", fontWeight: 900, color: statusColor(r.status) }}>{r.status}</div>
                {r.message && (
                  <div className="muted" style={{ gridColumn: "span 2", fontSize: 12, marginTop: -6 }}>
                    {r.message}
                  </div>
                )}
              </div>
            ))}
          </div>

          {results.length > 50 && (
            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Showing first 50 results.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function statusColor(s: UploadResult["status"]) {
  if (s === "SAVED") return "#9ae6b4";
  if (s === "SKIPPED") return "#fbd38d";
  if (s === "INVALID") return "#feb2b2";
  return "#ff6b6b";
}

/* ---------- styles ---------- */

const input: React.CSSProperties = {
  padding: 10,
  border: "1px solid #2A3A4D",
  background: "transparent",
  color: "#FFFFFF",
  outline: "none",
  width: "100%",
};

const vinInput: React.CSSProperties = {
  ...input,
  fontFamily: "monospace",
  fontSize: 16,
};

const smallInput: React.CSSProperties = {
  padding: 8,
  border: "1px solid #2A3A4D",
  background: "transparent",
  color: "#FFFFFF",
  outline: "none",
  width: 180,
  textAlign: "right",
};

const textarea: React.CSSProperties = {
  marginTop: 12,
  width: "100%",
  minHeight: 140,
  padding: 10,
  border: "1px solid #2A3A4D",
  background: "transparent",
  color: "#FFFFFF",
  outline: "none",
  fontFamily: "monospace",
  fontSize: 12,
  resize: "vertical",
};

const primaryBtn: React.CSSProperties = {
  padding: "12px 12px",
  border: "1px solid #1C6FFF",
  background: "#1C6FFF",
  color: "#FFFFFF",
  fontWeight: 900,
  cursor: "pointer",
  width: "100%",
};