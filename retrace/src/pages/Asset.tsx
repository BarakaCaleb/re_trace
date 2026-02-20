import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { auth, db } from "../config/firebase";

type AssetDoc = {
  type: string;
  vinOrSerial: string;
  status: string;
  createdBy: string | null;
};

type EventType = "registered" | "service" | "transfer" | "retired" | "dismantled" | "recycled";

export default function Asset() {
  const { assetId } = useParams();
  const [asset, setAsset] = useState<AssetDoc | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [eventType, setEventType] = useState<EventType>("service");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const assetRef = useMemo(() => (assetId ? doc(db, "assets", assetId) : null), [assetId]);

  useEffect(() => {
    if (!assetRef) return;
    (async () => {
      const snap = await getDoc(assetRef);
      setAsset(snap.exists() ? (snap.data() as AssetDoc) : null);
    })();
  }, [assetRef]);

  useEffect(() => {
    if (!assetId) return;
    const q = query(collection(db, "assets", assetId, "events"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [assetId]);

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    // Simple MVP rule: prevent recycle before dismantled/retired (basic signal)
    const hasDismantledOrRetired = events.some((ev) => ["dismantled", "retired"].includes(ev.type));
    if (eventType === "recycled" && !hasDismantledOrRetired) {
      setErr("Rule: You can’t mark as recycled before a retired or dismantled event.");
      return;
    }

    if (!assetId) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "assets", assetId, "events"), {
        type: eventType,
        notes,
        actorId: auth.currentUser?.uid ?? null,
        actorEmail: auth.currentUser?.email ?? null,
        createdAt: serverTimestamp(),
      });
      setNotes("");
    } catch (error: any) {
      setErr(error?.message ?? "Failed to add event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Asset Passport</div>
          <div style={{ fontSize: 13, opacity: 0.75 }}>Append-only lifecycle timeline</div>
        </div>
        <Link to="/app">Back</Link>
      </header>

      {!asset && (
        <div style={{ marginTop: 18, border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
          Asset not found (check the ID).
        </div>
      )}

      {asset && (
        <>
          <div style={{ marginTop: 18, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <Info label="Asset ID" value={assetId} />
            <Info label="Type" value={asset.type} />
            <Info label="VIN / Serial" value={asset.vinOrSerial} />
            <Info label="Status" value={asset.status} />
          </div>

          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <form onSubmit={addEvent} style={{ border: "1px solid #eee", borderRadius: 14, padding: 16, display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 800 }}>Add lifecycle event</div>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13 }}>Event type</span>
                <select value={eventType} onChange={(e) => setEventType(e.target.value as EventType)} style={inputStyle}>
                  <option value="registered">Registered</option>
                  <option value="service">Service</option>
                  <option value="transfer">Transfer</option>
                  <option value="retired">Retired</option>
                  <option value="dismantled">Dismantled</option>
                  <option value="recycled">Recycled</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13 }}>Notes</span>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. dismantled at facility X" style={inputStyle} />
              </label>

              {err && <div style={{ color: "crimson", fontSize: 13 }}>{err}</div>}

              <button
                disabled={saving}
                style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff" }}
              >
                {saving ? "Saving…" : "Add event"}
              </button>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                MVP rule example: recycling requires retired/dismantled first.
              </div>
            </form>

            <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Timeline</div>
              {events.length === 0 ? (
                <div style={{ fontSize: 13, opacity: 0.7 }}>No events yet. Add one above.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {events.map((ev) => (
                    <div key={ev.id} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 800, textTransform: "capitalize" }}>{String(ev.type).replace("_", " ")}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {ev.actorEmail ?? "unknown"} • {formatTS(ev.createdAt)}
                        </div>
                      </div>
                      {ev.notes && <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>{ev.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 14 }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 800, marginTop: 6, wordBreak: "break-word" }}>{value ?? "—"}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ddd",
};

function formatTS(ts: any) {
  try {
    const d = ts?.toDate?.();
    if (!d) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
}