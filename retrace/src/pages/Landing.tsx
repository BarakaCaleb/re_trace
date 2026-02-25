import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div style={{ maxWidth: 1440, margin: "0 auto", padding: 32 }}>
      {/* NAV */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: 0.4 }}>RETRACE</div>

        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          <a href="#customs" style={navLink}>
            Customs
          </a>
          <a href="#garages" style={navLink}>
            Garages
          </a>
          <a href="#dealers" style={navLink}>
            Dealers
          </a>
          <a href="#recyclers" style={navLink}>
            Recyclers
          </a>
          <Link to="/login" style={navLink}>
            Login
          </Link>

          <Link
            to="/register"
            style={{
              background: "var(--accent)",
              padding: "10px 18px",
              fontWeight: 700,
              borderRadius: 12,
              color: "#fff",
              textDecoration: "none",
              border: "1px solid var(--accent)",
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="section" style={{ marginTop: 80 }}>
        <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1 }}>
          Lifecycle Intelligence for End-of-Life Vehicles
        </h1>

        <p style={{ fontSize: 16, maxWidth: 780, lineHeight: 1.7 }} className="muted">
          Track VIN signals across regions. Detect downstream lifecycle activity. Generate audit-ready evidence for
          regulators, recyclers, and OEM teams.
        </p>

        <div style={{ marginTop: 28, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <Link
            to="/register"
            style={{
              background: "var(--accent)",
              padding: "14px 22px",
              borderRadius: 10,
              color: "#fff",
              textDecoration: "none",
              fontWeight: 800,
              border: "1px solid var(--accent)",
            }}
          >
            Search VIN
          </Link>

          <a
            href="#how"
            style={{
              border: "1px solid var(--muted)",
              padding: "14px 22px",
              borderRadius: 10,
              color: "#fff",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            How it Works
          </a>
        </div>
      </section>

      {/* TRUST STRIP (clickable -> scroll to sections) */}
      <section className="section">
        <div className="panel" style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, borderRadius: 8 }}>
          <a href="#customs" style={actorPill}>
            Customs Authorities
          </a>
          <a href="#oem" style={actorPill}>
            OEM Compliance Teams
          </a>
          <a href="#dealers" style={actorPill}>
            Dealership Networks
          </a>
          <a href="#recyclers" style={actorPill}>
            Certified Recyclers
          </a>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="section">
        <h2 style={{ fontSize: 28, margin: 0 }}>How ReTrace Works</h2>
        <div className="muted" style={{ marginTop: 10, maxWidth: 860, lineHeight: 1.7 }}>
          Downstream actors use RE:TRACE to make their own work easier (verification, technical reference, documentation).
          Signals are generated as a by-product — creating a regional lifecycle intelligence map.
        </div>

        <div className="grid-12 section">
          <Step title="Search VIN" text="Retrieve a lifecycle intelligence report anchored to VIN identity." />
          <Step title="Generate Signals" text="Verification events create passive re-sighting datapoints by region." />
          <Step title="Analyze Patterns" text="OEMs see movement, concentrations, and high-risk clusters over time." />
        </div>
      </section>

      {/* ACTOR BENEFITS */}
      <section id="customs" className="section" style={actorSection}>
        <div style={actorHeader}>
          <h2 style={actorTitle}>Customs Authorities</h2>
          <div className="muted" style={actorSub}>
            Faster clearance • Risk visibility • Reduced misclassification
          </div>
        </div>
        <div style={benefitsGrid}>
          <Benefit title="Verify lifecycle in seconds" text="Instant deregistration + continuity signals to support classification decisions." />
          <Benefit title="Explainable risk drivers" text="Age thresholds, deregistration window, export flags and re-sightings — not guesses." />
          <Benefit title="Exportable evidence" text="Download or attach a lifecycle snapshot to clearance reports for audit trails." />
          <Benefit title="Passive re-sighting signals" text="Every verification logs country + region + timestamp as a datapoint." />
        </div>
      </section>

      <section id="garages" className="section" style={actorSection}>
        <div style={actorHeader}>
          <h2 style={actorTitle}>Garages</h2>
          <div className="muted" style={actorSub}>
            Practical workshop tool • Better parts confidence • Customer trust
          </div>
        </div>
        <div style={benefitsGrid}>
          <Benefit title="Wrench’s Wikipedia" text="VIN-specific torque specs, fluid capacities, service intervals — a lite ISTA experience." />
          <Benefit title="Counterfeit Killer" text="Part compatibility checks reduce failures and comebacks." />
          <Benefit title="Trust Premium" text="Generate a ‘RE:TRACE Verified’ health check certificate for customers." />
          <Benefit title="Pro Points" text="Earn rewards for verified interactions — encourages repeat usage." />
        </div>
      </section>

      <section id="dealers" className="section" style={actorSection}>
        <div style={actorHeader}>
          <h2 style={actorTitle}>Dealers</h2>
          <div className="muted" style={actorSub}>
            Reduce fraud • Validate provenance • Improve remarketing quality
          </div>
        </div>
        <div style={benefitsGrid}>
          <Benefit title="Inventory confidence" text="Detect downstream continuity or high-risk signals before purchase/sale." />
          <Benefit title="Fraud / mismatch reduction" text="Flag lifecycle patterns that don’t match declared import/export status." />
          <Benefit title="Audit-ready reporting" text="Generate lifecycle summaries that improve buyer trust and compliance." />
          <Benefit title="Market intelligence" text="See aggregated patterns by region: top models, risk spikes, average age." />
        </div>
      </section>

      <section id="recyclers" className="section" style={actorSection}>
        <div style={actorHeader}>
          <h2 style={actorTitle}>Recyclers</h2>
          <div className="muted" style={actorSub}>
            Better ELV identification • Component insight • Reporting impact
          </div>
        </div>
        <div style={benefitsGrid}>
          <Benefit title="ELV identification support" text="Lifecycle continuity + risk scoring helps reduce misclassification." />
          <Benefit title="Component-level visibility" text="Parts verification events map real-world component circulation." />
          <Benefit title="Better circularity reporting" text="Tie recovery actions to OEM sustainability metrics and audit needs." />
          <Benefit title="Operational prioritization" text="Focus efforts on higher-impact vehicles and regions based on signals." />
        </div>
      </section>

      <section id="oem" className="section" style={actorSection}>
        <div style={actorHeader}>
          <h2 style={actorTitle}>OEM Compliance Teams</h2>
          <div className="muted" style={actorSub}>
            Regional visibility • Explainable risk • Audit-ready evidence
          </div>
        </div>
        <div style={benefitsGrid}>
          <Benefit title="Digital Vehicle Passport" text="Persistent VIN record: confirmed + inferred data with signal timelines." />
          <Benefit title="Country → Region heat" text="Detect clusters and movement patterns for ELV leakage monitoring." />
          <Benefit title="ESG + compliance readiness" text="Evidence accumulation supports reporting and enforcement collaboration." />
          <Benefit title="Seed VIN catalog" text="Upload VINs so Europe-origin identity links to downstream activity." />
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="panel" style={{ padding: 48, textAlign: "center", borderRadius: 10 }}>
          <h2 style={{ margin: 0, fontSize: 28 }}>Start Monitoring Lifecycle Activity</h2>
          <div className="muted" style={{ marginTop: 10 }}>
            Register your organization to access dashboards and VIN verification utilities.
          </div>
          <Link
            to="/register"
            style={{
              marginTop: 18,
              display: "inline-block",
              background: "var(--accent)",
              padding: "14px 28px",
              borderRadius: 10,
              color: "#fff",
              textDecoration: "none",
              fontWeight: 800,
              border: "1px solid var(--accent)",
            }}
          >
            Register Organization
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={footerWrap}>
        <div style={footerGrid}>
          <div>
            <div style={{ fontWeight: 900, letterSpacing: 0.6 }}>RE:TRACE</div>
            <div className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
              Lifecycle intelligence for end-of-life vehicles. Built for compliance, auditability, and downstream
              visibility.
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="#oem" style={footerLink}>OEM</a>
              <a href="#customs" style={footerLink}>Customs</a>
              <a href="#garages" style={footerLink}>Garages</a>
              <a href="#dealers" style={footerLink}>Dealers</a>
              <a href="#recyclers" style={footerLink}>Recyclers</a>
            </div>
          </div>

          <div>
            <div style={footerTitle}>Product</div>
            <Link to="/login" style={footerLink}>Login</Link><br />
            <Link to="/register" style={footerLink}>Get Started</Link><br />
            <a href="#how" style={footerLink}>How it works</a><br />
            <a href="#customs" style={footerLink}>Use cases</a>
          </div>

          <div>
            <div style={footerTitle}>Company</div>
            <a href="#how" style={footerLink}>About</a><br />
            <a href="#how" style={footerLink}>Contact</a><br />
            <a href="mailto:hello@retrace.local" style={footerLink}>hello@retrace.local</a>
            <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
              Nairobi • Global operations
            </div>
          </div>

          <div>
            <div style={footerTitle}>Legal</div>
            <a href="#" style={footerLink}>Terms</a><br />
            <a href="#" style={footerLink}>Privacy</a><br />
            <a href="#" style={footerLink}>Security</a>
            <div className="muted" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
              Signals are generated as a by-product of verification use.
            </div>
          </div>

          <div>
            <div style={footerTitle}>Updates</div>
            <div className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
              Get product updates and rollout notes.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <input placeholder="Email address" style={footerInput} />
              <button style={footerBtn}>Subscribe</button>
            </div>
            <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
              We care about privacy and will never spam you.
            </div>
          </div>
        </div>

        <div style={footerBottom}>
          <div className="muted" style={{ fontSize: 12 }}>
            © {new Date().getFullYear()} RE:TRACE. All rights reserved.
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <a href="#" style={footerLink}>LinkedIn</a>
            <a href="#" style={footerLink}>X</a>
            <a href="#" style={footerLink}>GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ gridColumn: "span 4" }} className="panel">
      <div style={{ padding: 24 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <p className="muted" style={{ lineHeight: 1.7 }}>
          {text}
        </p>
      </div>
    </div>
  );
}

function Benefit({ title, text }: { title: string; text: string }) {
  return (
    <div className="panel" style={{ padding: 18, borderRadius: 10 }}>
      <div style={{ fontWeight: 900 }}>{title}</div>
      <div className="muted" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.7 }}>
        {text}
      </div>
    </div>
  );
}

/* ---------- styles ---------- */

const navLink: React.CSSProperties = {
  color: "#fff",
  textDecoration: "none",
  fontSize: 14,
  opacity: 0.95,
};

const actorPill: React.CSSProperties = {
  border: "1px solid var(--muted)",
  padding: "14px 16px",
  textDecoration: "none",
  color: "#fff",
  borderRadius: 8,
  display: "block",
  textAlign: "center",
  fontWeight: 700,
};

const actorSection: React.CSSProperties = {
  paddingTop: 64,
  borderTop: "1px solid var(--muted)",
};

const actorHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  flexWrap: "wrap",
};

const actorTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 900,
};

const actorSub: React.CSSProperties = {
  fontSize: 14,
  maxWidth: 720,
  lineHeight: 1.7,
};

const benefitsGrid: React.CSSProperties = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
};

const footerWrap: React.CSSProperties = {
  marginTop: 80,
  borderTop: "1px solid var(--muted)",
  paddingTop: 40,
  paddingBottom: 24,
};

const footerGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr",
  gap: 24,
};

const footerTitle: React.CSSProperties = {
  fontWeight: 900,
  marginBottom: 10,
};

const footerLink: React.CSSProperties = {
  color: "#fff",
  textDecoration: "none",
  fontSize: 13,
  opacity: 0.9,
};

const footerInput: React.CSSProperties = {
  flex: 1,
  padding: 10,
  border: "1px solid var(--muted)",
  background: "transparent",
  color: "#fff",
  outline: "none",
};

const footerBtn: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid var(--accent)",
  background: "var(--accent)",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const footerBottom: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  borderTop: "1px solid var(--muted)",
  marginTop: 28,
  paddingTop: 18,
};