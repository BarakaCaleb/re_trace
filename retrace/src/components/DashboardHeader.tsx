import { signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../config/firebase";
import { getMyProfile, type UserProfile } from "../services/userProfile";
import { Link } from "react-router-dom";

export default function DashboardHeader({
  title,
  subtitle,
  rightSlot,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
}) {
  const [p, setP] = useState<UserProfile | null>(null);

  useEffect(() => {
    getMyProfile().then(setP);
  }, []);

  const logout = async () => {
    await signOut(auth);
    window.location.href = "/login";
  };

  return (
    <div className="panel" style={{ padding: 18 }}>
      <div className="grid-12" style={{ alignItems: "center" }}>
        <div style={{ gridColumn: "span 8" }}>
          <div style={{ fontSize: 22, fontWeight: 900 }}>{title}</div>
          {subtitle && (
            <div className="muted" style={{ marginTop: 6 }}>
              {subtitle}
            </div>
          )}
        </div>

        <div style={{ gridColumn: "span 4", textAlign: "right" }}>
          <div style={{ display: "inline-grid", gap: 8, minWidth: 320 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 800 }}>{p?.fullName ?? "—"}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {p?.orgName ?? "—"} • {(p?.countryCode ?? "—")} • {(p?.region ?? "—")}
                </div>
              </div>

              <button
                onClick={logout}
                style={{
                  border: "1px solid #2A3A4D",
                  background: "transparent",
                  color: "#fff",
                  padding: "8px 10px",
                  cursor: "pointer",
                }}
              >
                Log out
              </button>
            </div>

            {rightSlot ? <div>{rightSlot}</div> : null}

            <div style={{ textAlign: "right" }}>
              <Link to="/" style={{ color: "#2A3A4D", textDecoration: "none", fontSize: 12 }}>
                Back to Landing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}