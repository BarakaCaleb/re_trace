import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase";

type Role = "customs" | "garage" | "dealer" | "recycler" | "oem";

function routeForRole(role: Role) {
  switch (role) {
    case "oem": return "/oem";
    case "customs": return "/customs";
    case "garage": return "/garage";
    case "dealer": return "/dealer";
    case "recycler": return "/recycler";
    default: return "/app";
  }
}

export default function Register() {
  const nav = useNavigate();

  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [role, setRole] = useState<Role>("dealer");
  const [region, setRegion] = useState("");

  const [phoneE164, setPhoneE164] = useState<string | undefined>();
  const [country, setCountry] = useState<Country>("KE");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErr(null);

    const name = fullName.trim();
    const org = orgName.trim();
    const reg = region.trim();
    const mail = email.trim().toLowerCase();

    if (!name) return setErr("Full name is required.");
    if (!org) return setErr("Organization name is required.");
    if (!reg) return setErr("Region / County / Province is required.");
    if (!country) return setErr("Country is required.");
    if (!phoneE164) return setErr("Phone number is required.");
    if (!isValidPhoneNumber(phoneE164)) return setErr("Enter a valid phone number.");
    if (!mail) return setErr("Email is required.");
    if (!password || password.length < 6) return setErr("Password must be at least 6 characters.");

    setLoading(true);

    try {
      const cred = await createUserWithEmailAndPassword(auth, mail, password);

      await setDoc(doc(db, "users", cred.user.uid), {
        fullName: name,
        orgName: org,
        role,
        region: reg,
        email: mail,
        phoneE164,
        countryCode: country,
        createdAt: serverTimestamp(),
        proPoints: 0,
      });

      nav(routeForRole(role), { replace: true });

    } catch (error: unknown) {
      if (error instanceof Error) setErr(error.message);
      else setErr("Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 560, background: "#050505", border: "1px solid #2A3A4D", padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>RE:TRACE</div>
            <div style={{ color: "#2A3A4D", fontSize: 13 }}>Register organization</div>
          </div>
          <Link to="/login" style={{ color: "#FFFFFF", textDecoration: "none", fontSize: 13 }}>
            Login
          </Link>
        </div>

        <form onSubmit={submit} style={{ marginTop: 16, display: "grid", gap: 12 }}>

          <Field label="Full name">
            <input autoFocus value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle}/>
          </Field>

          <Field label="Organization name">
            <input value={orgName} onChange={e => setOrgName(e.target.value)} style={inputStyle}/>
          </Field>

          <Field label="Region / County / Province">
            <input value={region} onChange={e => setRegion(e.target.value)} placeholder="e.g. Nairobi" style={inputStyle}/>
          </Field>

          <Field label="Account type">
            <select value={role} onChange={e => setRole(e.target.value as Role)} style={inputStyle}>
              <option value="customs">Customs</option>
              <option value="garage">Garage</option>
              <option value="dealer">Dealer</option>
              <option value="recycler">Recycler</option>
              <option value="oem">OEM</option>
            </select>
          </Field>

          <Field label="Phone number">
            <div style={phoneWrap}>
              <PhoneInput
                defaultCountry="KE"
                country={country}
                onCountryChange={(c) => setCountry((c ?? "KE") as Country)}
                value={phoneE164}
                onChange={setPhoneE164}
                international
                countryCallingCodeEditable={false}
              />
            </div>
          </Field>

          <div style={{ height: 1, background: "#2A3A4D", marginTop: 6 }} />

          <Field label="Email">
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" style={inputStyle}/>
          </Field>

          <Field label="Password">
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" minLength={6} style={inputStyle}/>
          </Field>

          {err && <div style={{ color: "#ff6b6b", fontSize: 13 }}>{err}</div>}

          <button disabled={loading} style={primaryBtn}>
            {loading ? "Creating…" : "Create account"}
          </button>

          <div style={{ color: "#2A3A4D", fontSize: 12 }}>
            Already registered?{" "}
            <Link to="/login" style={{ color: "#1C6FFF", textDecoration: "none" }}>
              Sign in →
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={{ color: "#2A3A4D", fontSize: 13 }}>{label}</span>
      {children}
    </label>
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

const phoneWrap: React.CSSProperties = {
  padding: 10,
  border: "1px solid #2A3A4D",
  background: "transparent",
};