import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";
import { getMyProfile, routeForRole } from "../services/userProfile";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);

      // Fetch profile to decide dashboard + enforce required onboarding fields
      const p = await getMyProfile();

      // No profile doc => force onboarding (phone + country + region + role)
      if (!p) {
        nav("/register", { replace: true });
        return;
      }

      const role = p.role;
      const phoneE164 = p.phoneE164;
      const countryCode = p.countryCode;
      const region = p.region;

      if (!role || !phoneE164 || !countryCode || !region) {
        nav("/register", { replace: true });
        return;
      }

      nav(routeForRole(role), { replace: true });
    } catch (error: unknown) {
      if (error instanceof Error) setErr(error.message);
      else setErr(typeof error === "string" ? error : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#050505",
          border: "1px solid #2A3A4D",
          padding: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>RE:TRACE</div>
            <div style={{ fontSize: 13, color: "#2A3A4D" }}>Sign in</div>
          </div>
          <Link to="/" style={{ fontSize: 13, color: "#FFFFFF", textDecoration: "none" }}>
            Back
          </Link>
        </div>

        <form onSubmit={submit} style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#2A3A4D" }}>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              placeholder="you@example.com"
              style={inputStyle}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 13, color: "#2A3A4D" }}>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={6}
              placeholder="min 6 chars"
              style={inputStyle}
            />
          </label>

          {err && <div style={{ color: "#ff6b6b", fontSize: 13 }}>{err}</div>}

          <button disabled={loading} style={primaryBtn}>
            {loading ? "Please wait…" : "Sign in"}
          </button>

          <div style={{ marginTop: 6, fontSize: 13, color: "#2A3A4D" }}>
            Don’t have an account?{" "}
            <Link to="/register" style={{ color: "#1C6FFF", textDecoration: "none" }}>
              Register organization →
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
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
  fontWeight: 800,
  cursor: "pointer",
};