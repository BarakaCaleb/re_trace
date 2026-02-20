import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode.react";
import { auth, db } from "../config/firebase";

type AssetType = "ELV_VEHICLE" | "BATTERY" | "PART";

export default function CreateAsset() {
  const [type, setType] = useState<AssetType>("ELV_VEHICLE");
  const [vinOrSerial, setVinOrSerial] = useState("");
  const [status, setStatus] = useState("registered");
  const [creating, setCreating] = useState(false);
  const [assetId, setAssetId] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const ref = await addDoc(collection(db, "assets"), {
        type,
        vinOrSerial,
        status,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid ?? null,
      });
      setAssetId(ref.id);
    } finally {
      setCreating(false);
    }
  };

  const assetUrl = assetId ? `${window.location.origin}/app/assets/${assetId}` : "";

  return (
    <div style={{ minHeight: "100vh", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Create Asset</div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Generate a QR for the digital passport</div>
        </div>
        <Link to="/app">Back</Link>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginTop: 18 }}>
        <form onSubmit={create} style={{ border: "1px solid #eee", borderRadius: 14, padding: 16, display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13 }}>Asset type</span>
            <select value={type} onChange={(e) => setType(e.target.value as AssetType)} style={inputStyle}>
              <option value="ELV_VEHICLE">ELV Vehicle</option>
              <option value="BATTERY">Battery</option>
              <option value="PART">Part</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13 }}>VIN / Serial</span>
            <input value={vinOrSerial} onChange={(e) => setVinOrSerial(e.target.value)} required style={inputStyle} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13 }}>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              <option value="registered">Registered</option>
              <option value="in_use">In use</option>
              <option value="retired">Retired</option>
              <option value="dismantled">Dismantled</option>
              <option value="recycled">Recycled</option>
            </select>
          </label>

          <button
            disabled={creating}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}
          >
            {creating ? "Creating…" : "Create asset"}
          </button>
        </form>

        {assetId && (
          <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Asset created ✅</div>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>Asset ID: {assetId}</div>

            <div style={{ marginTop: 14, display: "grid", placeItems: "center" }}>
              <QRCode value={assetUrl} size={200} />
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, wordBreak: "break-all" }}>{assetUrl}</div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "center" }}>
              <Link to={`/app/assets/${assetId}`} style={{ padding: "10px 14px", border: "1px solid #111", borderRadius: 10 }}>
                Open Passport
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ddd",
};