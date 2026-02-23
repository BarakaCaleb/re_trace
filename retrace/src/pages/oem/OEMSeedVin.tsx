import { useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db, auth } from "../../config/firebase";

function normalizeVIN(v: string) {
  return String(v ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

export default function OEMSeedVin() {
  const [vin, setVin] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number>(2014);
  const [engine, setEngine] = useState("2.0L Diesel");
  const [plant, setPlant] = useState("Munich");
  const [status, setStatus] = useState("Active");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setMsg(null);
    const v = normalizeVIN(vin);
    if (!v || v.length < 11) return setMsg("Enter a valid VIN.");

    setBusy(true);
    try {
      await setDoc(
        doc(db, "vinCatalog", v),
        {
          vin: v,
          model: model.trim(),
          year,
          engine: engine.trim(),
          plant: plant.trim(),
          oemStatus: status,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid ?? null,
        },
        { merge: true }
      );

      setMsg("VIN Successfully saved to OEM catalog ✅");
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to save VIN");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel" style={{ padding: 18 }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>Add VIN to OEM Database</div>
      <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
        Seed official VIN records so downstream searches link to known vehicles.
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
        <input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="VIN" style={input} />
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Model (e.g. BMW 3 Series)" style={input} />
        <input value={engine} onChange={(e) => setEngine(e.target.value)} placeholder="Engine (e.g. 2.0L Diesel)" style={input} />
        <input value={plant} onChange={(e) => setPlant(e.target.value)} placeholder="Plant (e.g. Munich)" style={input} />
        <input
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          type="number"
          min={1990}
          max={2030}
          placeholder="Year"
          style={input}
        />
        <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="OEM Status (e.g. Active)" style={input} />

        <button onClick={save} disabled={busy} style={primaryBtn}>
          {busy ? "Saving…" : "Save VIN"}
        </button>

        {msg && <div style={{ fontSize: 13, color: msg.includes("✅") ? "#9ae6b4" : "#ff6b6b" }}>{msg}</div>}
      </div>
    </div>
  );
}

const input: React.CSSProperties = {
  padding: 10,
  border: "1px solid #2A3A4D",
  background: "transparent",
  color: "#FFFFFF",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  padding: "12px 14px",
  border: "1px solid #1C6FFF",
  background: "#1C6FFF",
  color: "#FFFFFF",
  fontWeight: 900,
  cursor: "pointer",
};