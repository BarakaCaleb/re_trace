export default function OEMPassport(){

  const drivers=[
    {label:"Age > 12 Years",pct:22},
    {label:"Deregistered > 9 Months",pct:18},
    {label:"Port Re-Sighting",pct:24},
    {label:"No Service 24 Months",pct:14},
  ]

  const signals=[
    "Production",
    "Registration",
    "Service",
    "Deregistration",
    "Customs",
    "Diagnostics"
  ]

  return(
    <div style={{maxWidth:1440, margin:"0 auto", padding:32}}>

      {/* HEADER */}
      <div className="panel" style={{padding:28}}>
        <div className="grid-12">

          <div style={{gridColumn:"span 8"}}>
            <div className="muted">Digital Vehicle Passport</div>

            <div style={{
              fontFamily:"monospace",
              fontSize:34,
              fontWeight:700,
              marginTop:6
            }}>
              WBA8E9G51GNU12345
            </div>

            <div className="muted" style={{marginTop:10}}>
              Model: BMW 3 Series • Year: 2014 • Engine: 2.0L Diesel • Plant: Munich
            </div>
          </div>

          <div style={{gridColumn:"span 4", textAlign:"right"}}>
            <Badge text="Deregistered – Under Monitoring" />
            <Risk level="High Risk" confidence="72%" />
          </div>

        </div>
      </div>


      {/* LIFECYCLE */}
      <div className="grid-12 section">

        <Card title="Formal Lifecycle Record" span={6}>
          <Row label="Production Date" value="2014-03-22" ok/>
          <Row label="First Registration" value="Germany" ok/>
          <Row label="Warranty Status" value="Expired"/>
          <Row label="Last Authorized Service" value="2021-08-11" ok/>
          <Row label="Recall Completion" value="Complete" ok/>
          <Row label="Deregistration" value="2023-07-14"/>
        </Card>

        <Card title="Downstream Continuity Signals" span={6}>
          <Row label="Total Re-Sightings" value="5"/>
          <Row label="Last Region" value="Kenya"/>
          <Row label="Sources" value="Customs, Diagnostics"/>
          <Row label="Since Deregistration" value="11 months"/>

          <div style={{marginTop:18}}>
            <div className="muted">Confidence</div>
            <div style={{height:6, background:"#222", marginTop:6}}>
              <div style={{width:"72%", height:6, background:"var(--accent)"}}/>
            </div>
          </div>
        </Card>

      </div>


      {/* RISK */}
      <div className="panel section" style={{padding:24}}>
        <h2>Risk Intelligence Breakdown</h2>

        <div className="grid-12">

          <div style={{gridColumn:"span 6"}}>
            <Score label="ELV Likelihood" val="78%" />
            <Score label="Informal Market Probability" val="64%" />
          </div>

          <div style={{gridColumn:"span 6"}}>
            {drivers.map(d=>(
              <div key={d.label} style={{display:"flex", justifyContent:"space-between", marginBottom:10}}>
                <span>{d.label}</span>
                <span className="muted">{d.pct}%</span>
              </div>
            ))}
          </div>

        </div>
      </div>


      {/* TIMELINE */}
      <div className="panel section" style={{padding:24}}>
        <h2>Signal Activity Overview</h2>

        <div style={{display:"flex", gap:18, marginTop:20}}>
          {signals.map(s=>(
            <div key={s} style={{textAlign:"center"}}>
              <div style={{
                width:12,height:12,borderRadius:50,
                background:"var(--accent)", margin:"0 auto"
              }}/>
              <div className="muted" style={{marginTop:6,fontSize:13}}>
                {s}
              </div>
            </div>
          ))}
        </div>

        <button style={{marginTop:22, border:"1px solid var(--muted)", padding:"10px 20px"}}>
          View Full Signal Timeline →
        </button>
      </div>


      {/* SUSTAINABILITY */}
      <div className="panel section" style={{padding:24}}>
        <h2>Circularity & Reporting Impact</h2>

        <div className="grid-12">

          <Metric label="Lifecycle Continuation" val="Active"/>
          <Metric label="ELV Risk Index" val="High"/>
          <Metric label="Monitoring Status" val="Tracking"/>

        </div>
      </div>

    </div>
  )
}


function Card({title,children,span}:{title:string,children:any,span:number}){
  return(
    <div style={{gridColumn:`span ${span}`}} className="panel">
      <div style={{padding:24}}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  )
}

function Row({label,value,ok}:{label:string,value:string,ok?:boolean}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
      <span className="muted">{label}</span>
      <span>{value} {ok && "✓"}</span>
    </div>
  )
}

function Badge({text}:{text:string}){
  return(
    <div style={{
      border:"1px solid var(--accent)",
      color:"var(--accent)",
      padding:"6px 12px",
      display:"inline-block"
    }}>
      {text}
    </div>
  )
}

function Risk({level,confidence}:{level:string,confidence:string}){
  return(
    <div style={{marginTop:12}}>
      <div style={{fontWeight:700}}>{level}</div>
      <div className="muted">Confidence: {confidence}</div>
    </div>
  )
}

function Score({label,val}:{label:string,val:string}){
  return(
    <div style={{marginBottom:18}}>
      <div className="muted">{label}</div>
      <div style={{fontSize:30,fontWeight:700}}>{val}</div>
    </div>
  )
}

function Metric({label,val}:{label:string,val:string}){
  return(
    <div style={{gridColumn:"span 4"}}>
      <div className="muted">{label}</div>
      <div style={{fontSize:28,fontWeight:700}}>{val}</div>
    </div>
  )
}