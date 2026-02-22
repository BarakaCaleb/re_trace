import { Link } from "react-router-dom"

export default function Landing(){
  return(
    <div style={{maxWidth:1440, margin:"0 auto", padding:32}}>

      {/* NAV */}
      <nav style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div style={{fontWeight:700,fontSize:20}}>RETRACE</div>

        <div style={{display:"flex",gap:24, alignItems:"center"}}>
          <a href="#customs">Customs</a>
          <a href="#garages">Garages</a>
          <a href="#dealers">Dealers</a>
          <a href="#recyclers">Recyclers</a>
          <Link to="/login">Login</Link>

          <Link to="/register" style={{
            background:"var(--accent)",
            padding:"10px 18px",
            fontWeight:600,
            borderRadius:15,
          }}>
            Get Started
          </Link>
        </div>
      </nav>


      {/* HERO */}
      <section className="section" style={{marginTop:80}}>
        <h1 style={{fontSize:40, fontWeight:700}}>
          Lifecycle Intelligence for End-of-Life Vehicles
        </h1>

        <p style={{fontSize:16, maxWidth:700}} className="muted">
          Track VIN signals across regions. Detect downstream lifecycle activity.
          Generate audit-ready evidence for regulators, recyclers, and OEM teams.
        </p>

        <div style={{marginTop:28, display:"flex", gap:16}}>
          <Link to="/register" style={{background:"var(--accent)", padding:"14px 22px"}}>
            Search VIN
          </Link>

          <a href="#how" style={{border:"1px solid var(--muted)", padding:"14px 22px"}}>
            How it Works
          </a>
        </div>
      </section>


      {/* TRUST STRIP */}
      <section className="section">
        <div className="panel" style={{padding:24, display:"flex", justifyContent:"space-between", borderRadius:8}}>
          <span>Customs Authorities</span>
          <span>OEM Compliance Teams</span>
          <span>Dealership Networks</span>
          <span>Certified Recyclers</span>
        </div>
      </section>


      {/* HOW */}
      <section id="how" className="section">
        <h2 style={{fontSize:28}}>How ReTrace Works</h2>

        <div className="grid-12 section" style={{borderRadius:8}}>
          <Step title="Search VIN" text="Retrieve lifecycle intelligence report"/>
          <Step title="Log Signals" text="Add sightings or lifecycle events"/>
          <Step title="Analyze Patterns" text="Detect cross-regional movement"/>
        </div>
      </section>


      {/* CTA */}
      <section className="section">
        <div className="panel" style={{padding:48, textAlign:"center"}}>
          <h2>Start Monitoring Lifecycle Activity</h2>
          <Link to="/register" style={{marginTop:18, display:"inline-block", background:"var(--accent)", padding:"14px 28px", borderRadius:8}}>
            Register Organization
          </Link>
        </div>
      </section>

    </div>
  )
}

function Step({title,text}:{title:string,text:string}){
  return(
    <div style={{gridColumn:"span 4"}} className="panel">
      <div style={{padding:24}}>
        <h3>{title}</h3>
        <p className="muted">{text}</p>
      </div>
    </div>
  )
}