import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div style={{ minHeight: "100vh", padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>Re:Trace</div>
        <nav style={{ display: "flex", gap: 12 }}>
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <Link to="/login">Login</Link>
        </nav>
      </header>

      <main style={{ paddingTop: 48 }}>
        <h1 style={{ fontSize: 44, lineHeight: 1.1, marginBottom: 12 }}>
          Traceability for End-of-Life assets and circular supply chains.
        </h1>
        <p style={{ fontSize: 18, maxWidth: 750, opacity: 0.85 }}>
          Register assets, scan QR to view a Digital Passport, and write append-only lifecycle events with proof attachments.
          Built for recyclers, workshops, and regulators.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <Link to="/login" style={{ padding: "10px 14px", border: "1px solid #111", borderRadius: 10 }}>
            View MVP
          </Link>
          <a href="#how" style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 10 }}>
            How it works
          </a>
        </div>

        <div style={{ marginTop: 18, fontSize: 13, opacity: 0.7 }}>
          Case study reference: “BMW ELV circular economy challenge” (concept demo; no affiliation implied).
        </div>

        <section id="how" style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 26 }}>How it works</h2>
          <ol style={{ marginTop: 10, lineHeight: 1.8 }}>
            <li><b>Register</b> an asset (vehicle/battery/part) and generate a QR code.</li>
            <li><b>Scan</b> the QR to open a Digital Passport.</li>
            <li><b>Verify</b> lifecycle events (append-only) with audit-ready history.</li>
          </ol>
        </section>

        <section id="features" style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 26 }}>What the MVP shows</h2>
          <ul style={{ marginTop: 10, lineHeight: 1.8 }}>
            <li>Auth + role-ready structure</li>
            <li>Asset creation + QR</li>
            <li>Passport view + status</li>
            <li>Append-only event timeline</li>
            <li>Dashboard metrics</li>
          </ul>
        </section>

        <footer style={{ marginTop: 60, borderTop: "1px solid #eee", paddingTop: 16, fontSize: 12, opacity: 0.75 }}>
          Re:Trace is an independent concept prototype. Brand references are for discussion/case-study only and do not imply
          affiliation or endorsement.
        </footer>
      </main>
    </div>
  );
}