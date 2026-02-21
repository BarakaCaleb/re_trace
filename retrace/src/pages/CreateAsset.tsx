import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { Link } from "react-router-dom";
import {QRCode} from "react-qrcode-logo";
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
    <div style={{ minHeight: "100vh", padding: 32, maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20 }}>Create Asset</div>
          <div style={{ fontSize: 13, color: "#2A3A4D", marginTop: 4 }}>
            Generate a QR for the digital passport
          </div>
        </div>
        <Link to="/app" style={{ color: "#FFFFFF", textDecoration: "none" }}>
          Back
        </Link>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18, marginTop: 24 }}>
        <form onSubmit={create} style={panelStyle}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Asset Registration</div>

          <label style={labelStyle}>
            <span style={labelText}>Asset type</span>
            <select value={type} onChange={(e) => setType(e.target.value as AssetType)} style={inputStyle}>
              <option value="ELV_VEHICLE">ELV Vehicle</option>
              <option value="BATTERY">Battery</option>
              <option value="PART">Part</option>
            </select>
          </label>

          <label style={labelStyle}>
            <span style={labelText}>VIN / Serial</span>
            <input
              value={vinOrSerial}
              onChange={(e) => setVinOrSerial(e.target.value)}
              required
              placeholder="e.g. WBA8E9G51GNU12345"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span style={labelText}>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              <option value="registered">Registered</option>
              <option value="in_use">In use</option>
              <option value="retired">Retired</option>
              <option value="dismantled">Dismantled</option>
              <option value="recycled">Recycled</option>
            </select>
          </label>

          <button disabled={creating} style={primaryBtn}>
            {creating ? "Creating…" : "Create asset"}
          </button>
        </form>

        {assetId && (
          <div style={panelStyle}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Asset created</div>
            <div style={{ fontSize: 13, color: "#2A3A4D", marginTop: 6 }}>Asset ID: {assetId}</div>

            <div style={{ marginTop: 16, display: "grid", placeItems: "center", gap: 10 }}>
              <QRCode
                value={assetUrl}
                size={200}
                quietZone={8}
                bgColor="#050505"
                fgColor="#FFFFFF"
                eyeColor="#1C6FFF"
              />
              <div style={{ fontSize: 12, color: "#2A3A4D", wordBreak: "break-all", textAlign: "center" }}>
                {assetUrl}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "center" }}>
              <Link to={`/app/assets/${assetId}`} style={secondaryBtn}>
                Open Passport →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: "#050505",
  border: "1px solid #2A3A4D",
  padding: 20,
};

const labelStyle: React.CSSProperties = { display: "grid", gap: 8 };
const labelText: React.CSSProperties = { fontSize: 13, color: "#2A3A4D" };

const inputStyle: React.CSSProperties = {
  padding: 10,
  border: "1px solid #2A3A4D",
  background: "transparent",
  color: "#FFFFFF",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  marginTop: 8,
  padding: "12px 14px",
  border: "1px solid #1C6FFF",
  background: "#1C6FFF",
  color: "#FFFFFF",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  padding: "10px 14px",
  border: "1px solid #2A3A4D",
  color: "#FFFFFF",
  textDecoration: "none",
};