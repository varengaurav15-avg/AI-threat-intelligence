import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, socket } from "../api/index";

// ── FALLBACK DATA (shown while API loads) ────────────────────
const FALLBACK_THREATS = [];
const FALLBACK_ENDPOINTS = [
  { id:1, name:"DESKTOP-X",  os:"Windows 11",    ip:"192.168.1.42",  status:"INCIDENT", lastSeen:"Just now",  incidents:2, agent:"v2.1.4", cpu:78, mem:62 },
  { id:2, name:"SERVER-01",  os:"Ubuntu 22.04",  ip:"192.168.1.10",  status:"INCIDENT", lastSeen:"2 min ago", incidents:1, agent:"v2.1.4", cpu:91, mem:84 },
  { id:3, name:"LAPTOP-DEV", os:"macOS 14",      ip:"192.168.1.55",  status:"HEALTHY",  lastSeen:"5 min ago", incidents:0, agent:"v2.1.4", cpu:34, mem:48 },
  { id:4, name:"WEB-SERVER", os:"Ubuntu 22.04",  ip:"192.168.1.20",  status:"HEALTHY",  lastSeen:"1 min ago", incidents:0, agent:"v2.1.4", cpu:22, mem:31 },
  { id:5, name:"DB-SERVER",  os:"Windows Server",ip:"192.168.1.30",  status:"WARNING",  lastSeen:"3 min ago", incidents:0, agent:"v2.1.3", cpu:55, mem:77 },
];
const FALLBACK_ACTIVITY = [
  { time:"08:42", msg:"NVD sync — waiting for first data...", type:"info" },
];
const FALLBACK_SOURCES = [
  { name:"NVD CVE API",      url:"services.nvd.nist.gov",   count:0,  matched:0,  status:"ACTIVE", interval:"15 min",    icon:"🛡", color:"#38bdf8", lastSync:"--" },
  { name:"AlienVault OTX",   url:"otx.alienvault.com",      count:0,  matched:0,  status:"ACTIVE", interval:"30 min",    icon:"👁", color:"#a78bfa", lastSync:"--" },
  { name:"AbuseIPDB",        url:"abuseipdb.com",           count:0,  matched:0,  status:"ACTIVE", interval:"20 min",    icon:"🌐", color:"#fb923c", lastSync:"--" },
  { name:"RSS Threat Feeds", url:"Krebs · BleepingComputer",count:0,  matched:0,  status:"ACTIVE", interval:"60 min",    icon:"📰", color:"#34d399", lastSync:"--" },
  { name:"Endpoint Agents",  url:"Monitoring local machine",count:0,  matched:0,  status:"ACTIVE", interval:"Real-time", icon:"💻", color:"#f472b6", lastSync:"Live" },
  { name:"EPSS API",         url:"first.org/epss",          count:0,  matched:0,  status:"ACTIVE", interval:"Daily",     icon:"📊", color:"#fbbf24", lastSync:"--" },
];

// ── CONSTANTS ────────────────────────────────────────────────
const SEV   = { CRITICAL:"#ef4444", HIGH:"#f97316", MEDIUM:"#eab308", LOW:"#22c55e" };
const SEVBG = { CRITICAL:"rgba(239,68,68,0.1)", HIGH:"rgba(249,115,22,0.1)", MEDIUM:"rgba(234,179,8,0.1)", LOW:"rgba(34,197,94,0.1)" };
const SRC   = { NVD:"#38bdf8", OTX:"#a78bfa", RSS:"#34d399", AbuseIPDB:"#fb923c", AGENT:"#f472b6" };
const MCOL  = ["#38bdf8","#a78bfa","#fb923c","#34d399","#ef4444","#fbbf24"];

const NAV = [
  { id:"overview",  label:"Overview",       icon:"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id:"threats",   label:"Global Threats", icon:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  { id:"endpoints", label:"My Endpoints",   icon:"M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" },
  { id:"incidents", label:"Incidents",      icon:"M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id:"brief",     label:"AI Brief",       icon:"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { id:"sources",   label:"Data Sources",   icon:"M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" },
];

const NODES = [
  { id:"apt29", label:"APT29",         type:"actor",   x:340, y:160, color:"#ef4444" },
  { id:"apt28", label:"APT28",         type:"actor",   x:340, y:320, color:"#ef4444" },
  { id:"cve1",  label:"CVE-2024-3400", type:"cve",     x:180, y:100, color:"#f97316" },
  { id:"cve2",  label:"CVE-2024-21762",type:"cve",     x:180, y:220, color:"#f97316" },
  { id:"cve3",  label:"CVE-2024-1709", type:"cve",     x:180, y:340, color:"#eab308" },
  { id:"vpn",   label:"VPN Campaign",  type:"campaign",x:500, y:200, color:"#a78bfa" },
  { id:"ia",    label:"Initial Access",type:"tactic",  x:500, y:330, color:"#38bdf8" },
  { id:"exfil", label:"Exfiltration",  type:"tactic",  x:620, y:265, color:"#38bdf8" },
];
const EDGES = [
  ["apt29","cve1"],["apt29","cve2"],["apt28","cve3"],["apt28","cve2"],
  ["cve1","vpn"],["cve2","vpn"],["cve3","ia"],["vpn","exfil"],["ia","exfil"],
];

// ── SMALL COMPONENTS ─────────────────────────────────────────
function SVGIcon({ d, size=18, color="currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

function Badge({ label, color, bg }) {
  return (
    <span style={{ background:bg||`${color}18`, color, border:`1px solid ${color}30`, borderRadius:5, padding:"2px 8px", fontSize:10, fontWeight:700, letterSpacing:"0.4px", whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

function ScoreRing({ score, color, size=48 }) {
  const r = (size/2)-5, circ = 2*Math.PI*r, dash = ((score||0)/100)*circ;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}20`} strokeWidth="3"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:size>44?14:11, fontWeight:800, color, lineHeight:1 }}>{score||0}</span>
      </div>
    </div>
  );
}

function Bar({ pct, color }) {
  return (
    <div style={{ height:6, background:"#0f1923", borderRadius:3, overflow:"hidden", flex:1 }}>
      <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${color}99,${color})`, borderRadius:3, transition:"width 1.2s cubic-bezier(.4,0,.2,1)" }}/>
    </div>
  );
}

function PulseDot({ color="#22c55e", size=8 }) {
  return (
    <span style={{ position:"relative", display:"inline-flex", width:size, height:size, flexShrink:0 }}>
      <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:color, opacity:0.4, animation:"ping 2s cubic-bezier(0,0,.2,1) infinite" }}/>
      <span style={{ position:"relative", borderRadius:"50%", width:size, height:size, background:color, display:"block" }}/>
    </span>
  );
}

// ── MAIN DASHBOARD ───────────────────────────────────────────
export default function Dashboard() {

  // ── REAL API CALLS ──
  const qc = useQueryClient();

  const { data: threats = FALLBACK_THREATS } = useQuery({
    queryKey: ["threats"],
    queryFn:  () => api.getThreats().then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["incidents"],
    queryFn:  () => api.getIncidents().then(r => r.data),
    refetchInterval: 10000,
  });

  const { data: stats = {} } = useQuery({
    queryKey: ["stats"],
    queryFn:  () => api.getStats().then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: briefData = {} } = useQuery({
    queryKey: ["brief"],
    queryFn:  () => api.getBrief().then(r => r.data),
  });

  // Real-time WebSocket — new incident → refresh all data + notify
  useEffect(() => {
    socket.on("new_incident", (data) => {
      qc.invalidateQueries(["threats"]);
      qc.invalidateQueries(["incidents"]);
      qc.invalidateQueries(["stats"]);
      window.electronAPI?.notify("ThreatLens Alert", data?.title || "New incident detected");
    });
    return () => socket.off("new_incident");
  }, []);

  // Use real data — fall back to static while loading
  const THREATS   = threats.length > 0 ? threats : FALLBACK_THREATS;
  const ENDPOINTS = FALLBACK_ENDPOINTS;
  const ACTIVITY  = FALLBACK_ACTIVITY;
  const SOURCES   = FALLBACK_SOURCES;

  // ── LOCAL STATE ──
  const [tab, setTab]             = useState("overview");
  const [selected, setSelected]   = useState(null);
  const [sevFilter, setSevFilter] = useState("ALL");
  const [originFilter, setOriginFilter] = useState("ALL");
  const [search, setSearch]       = useState("");
  const [briefSection, setBriefSection] = useState(0);

  // ── COMPUTED VALUES ──
  const critCount    = stats.critical ?? THREATS.filter(t=>t.severity==="CRITICAL"&&!t.resolved).length;
  const epCount      = stats.endpoint ?? THREATS.filter(t=>t.origin==="ENDPOINT"&&!t.resolved).length;
  const resolvedCount= stats.resolved ?? THREATS.filter(t=>t.resolved).length;

  const filteredThreats = THREATS.filter(t => {
    const s = sevFilter==="ALL"    || t.severity===sevFilter;
    const o = originFilter==="ALL" || t.origin===originFilter;
    const q = !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.cve?.toLowerCase().includes(search.toLowerCase());
    return s && o && q;
  });

  const parseMitre = (tags) => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    try { return JSON.parse(tags); } catch { return []; }
  };

  return (
    <div style={{ display:"flex", height:"100vh", background:"#060c14", color:"#cbd5e1", fontFamily:"'DM Sans',system-ui,sans-serif", fontSize:14, overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#1e3352;border-radius:4px}
        ::-webkit-scrollbar-track{background:transparent}
        @keyframes ping{75%,100%{transform:scale(2);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp 0.4s cubic-bezier(.4,0,.2,1) forwards}
        .nav-btn{transition:all 0.18s;cursor:pointer;border:none;background:none;width:100%;text-align:left}
        .nav-btn:hover .nav-label{color:#e2e8f0!important}
        .nav-btn:hover .nav-bg{background:rgba(255,255,255,0.04)!important}
        .card{transition:border-color 0.2s,transform 0.2s,box-shadow 0.2s}
        .card:hover{border-color:#1e3352!important;transform:translateY(-1px);box-shadow:0 8px 32px rgba(0,0,0,0.3)}
        .threat-row{transition:background 0.15s,border-color 0.15s;cursor:pointer}
        .threat-row:hover{background:#0c1825!important;border-color:#1e3352!important}
        .threat-row.sel{background:#0c1825!important;border-color:#2563eb!important}
        .chip{transition:all 0.15s;cursor:pointer;border:none;font-family:inherit}
        .chip:hover{opacity:0.8}
        .ep-row{transition:background 0.15s;cursor:pointer}
        .ep-row:hover{background:#0c1825!important}
        input{outline:none}
        input::placeholder{color:#334155}
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width:232, background:"#07101a", borderRight:"1px solid #0f1e2e", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"24px 20px 18px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:14 }}>
            <div style={{ width:36, height:36, background:"linear-gradient(135deg,#ef4444 0%,#f97316 100%)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0, boxShadow:"0 4px 16px rgba(239,68,68,0.3)" }}>⚡</div>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:"#f1f5f9", letterSpacing:"-0.4px", lineHeight:1 }}>ThreatLens</div>
              <div style={{ fontSize:10, color:"#ef4444", letterSpacing:"2.5px", fontWeight:600, marginTop:2 }}>AI PLATFORM</div>
            </div>
          </div>
          <div style={{ background:"#0c1825", border:"1px solid #0f1e2e", borderRadius:8, padding:"8px 12px", display:"flex", alignItems:"center", gap:8 }}>
            <PulseDot color="#22c55e" size={7}/>
            <span style={{ fontSize:11, color:"#64748b" }}>All systems operational</span>
          </div>
        </div>

        <nav style={{ padding:"4px 12px", flex:1 }}>
          <div style={{ fontSize:10, color:"#1e3352", letterSpacing:"1.5px", padding:"8px 8px 6px", fontWeight:600 }}>MENU</div>
          {NAV.map(n => {
            const active = tab===n.id;
            const badge = n.id==="threats"   ? THREATS.filter(t=>!t.resolved&&t.origin==="GLOBAL").length
                        : n.id==="incidents" ? epCount
                        : null;
            return (
              <button key={n.id} className="nav-btn" onClick={()=>{setTab(n.id);setSelected(null);}}>
                <div className="nav-bg" style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", borderRadius:9, marginBottom:1,
                  background: active?"rgba(37,99,235,0.14)":"transparent",
                  borderLeft: active?"2px solid #3b82f6":"2px solid transparent",
                }}>
                  <SVGIcon d={n.icon} size={17} color={active?"#60a5fa":"#334155"}/>
                  <span className="nav-label" style={{ fontSize:13, fontWeight:active?600:400, color:active?"#93c5fd":"#475569", flex:1 }}>{n.label}</span>
                  {badge>0 && <span style={{ background:"rgba(239,68,68,0.15)", color:"#ef4444", fontSize:10, padding:"1px 7px", borderRadius:20, fontWeight:700 }}>{badge}</span>}
                </div>
              </button>
            );
          })}
        </nav>

        <div style={{ padding:"14px 16px", borderTop:"1px solid #0f1e2e" }}>
          <div style={{ background:"#0c1825", borderRadius:10, padding:"11px 13px", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, background:"linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>A</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, color:"#e2e8f0", fontWeight:600 }}>SOC Analyst</div>
              <div style={{ fontSize:11, color:"#334155" }}>Tier 2 · Active</div>
            </div>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", flexShrink:0 }}/>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Top bar */}
        <header style={{ height:58, borderBottom:"1px solid #0f1e2e", background:"#07101a", display:"flex", alignItems:"center", padding:"0 28px", gap:16, flexShrink:0 }}>
          <div style={{ flex:1 }}>
            <span style={{ fontSize:18, fontWeight:700, color:"#f1f5f9", letterSpacing:"-0.3px" }}>
              {NAV.find(n=>n.id===tab)?.label}
            </span>
            <span style={{ fontSize:12, color:"#334155", marginLeft:12 }}>
              {tab==="overview"  && "Unified threat landscape"}
              {tab==="threats"   && `${filteredThreats.filter(t=>t.origin==="GLOBAL").length} global threats`}
              {tab==="endpoints" && `${ENDPOINTS.length} machines monitored`}
              {tab==="incidents" && `${epCount} active incidents`}
              {tab==="brief"     && "AI-generated · daily at 08:00"}
              {tab==="sources"   && `${SOURCES.length} active sources`}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {epCount>0 && (
              <div style={{ display:"flex", alignItems:"center", gap:7, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"6px 12px" }}>
                <PulseDot color="#ef4444" size={7}/>
                <span style={{ fontSize:12, color:"#ef4444", fontWeight:600 }}>{epCount} Live Incident{epCount>1?"s":""}</span>
              </div>
            )}
            <div style={{ background:"#0c1825", border:"1px solid #0f1e2e", borderRadius:8, padding:"6px 13px", fontSize:12, color:"#475569" }}>
              {new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} UTC
            </div>
          </div>
        </header>

        <main style={{ flex:1, overflow:"auto" }}>

          {/* ══ OVERVIEW ══ */}
          {tab==="overview" && (
            <div className="fade-up" style={{ padding:28 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
                {[
                  { label:"Critical Threats", val:critCount,     sub:"unresolved",     color:"#ef4444", icon:"🔴", bg:"rgba(239,68,68,0.06)" },
                  { label:"Live Incidents",   val:epCount,       sub:"on endpoints",   color:"#f472b6", icon:"💻", bg:"rgba(244,114,182,0.06)" },
                  { label:"CVEs Ingested",    val:stats.total??THREATS.filter(t=>t.origin==="GLOBAL").length, sub:"since midnight", color:"#38bdf8", icon:"📡", bg:"rgba(56,189,248,0.06)" },
                  { label:"Resolved Today",   val:resolvedCount, sub:"last 24 hours",  color:"#22c55e", icon:"✓",  bg:"rgba(34,197,94,0.06)" },
                ].map((m,i)=>(
                  <div key={i} className="card" style={{ background:m.bg, border:`1px solid ${m.color}18`, borderRadius:14, padding:"20px 22px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                      <span style={{ fontSize:11, color:m.color, fontWeight:600, letterSpacing:"0.3px", textTransform:"uppercase" }}>{m.label}</span>
                      <span style={{ fontSize:22 }}>{m.icon}</span>
                    </div>
                    <div style={{ fontSize:44, fontWeight:800, color:"#f8fafc", lineHeight:1, marginBottom:4, fontFamily:"'Instrument Serif',serif" }}>{m.val}</div>
                    <div style={{ fontSize:12, color:"#475569" }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:22 }}>
                {/* Priority queue */}
                <div className="card" style={{ background:"#07101a", border:"1px solid #0f1e2e", borderRadius:14, padding:20, gridColumn:"span 2" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>Unified Priority Queue</div>
                    <button onClick={()=>setTab("threats")} style={{ background:"none", border:"1px solid #1e3352", borderRadius:6, padding:"4px 12px", color:"#60a5fa", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>View all →</button>
                  </div>
                  {THREATS.filter(t=>!t.resolved).length === 0 ? (
                    <div style={{ textAlign:"center", padding:"40px 0", color:"#334155", fontSize:13 }}>
                      Loading threats from API...
                    </div>
                  ) : (
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {THREATS.filter(t=>!t.resolved).slice(0,5).map((t,i)=>(
                        <div key={i} style={{ display:"flex", alignItems:"center", gap:12, background:"#0c1825", borderRadius:10, padding:"11px 14px" }}>
                          <div style={{ fontSize:12, color:"#334155", fontWeight:700, width:16, textAlign:"center" }}>#{i+1}</div>
                          <ScoreRing score={Math.round(t.priority_score??t.score??0)} color={SEV[t.severity]||"#ef4444"} size={40}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, color:"#cbd5e1", fontWeight:500, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.title}</div>
                            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                              <Badge label={t.severity} color={SEV[t.severity]||"#ef4444"}/>
                              <Badge label={t.origin==="ENDPOINT"?"ENDPOINT":"GLOBAL"} color={t.origin==="ENDPOINT"?"#f472b6":"#38bdf8"}/>
                              {t.asset_match && <Badge label="ASSET MATCH" color="#22c55e"/>}
                            </div>
                          </div>
                          <div style={{ fontSize:11, color:"#334155", flexShrink:0 }}>{t.ts || t.created_at?.slice(11,16) || "--"}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Severity split */}
                <div className="card" style={{ background:"#07101a", border:"1px solid #0f1e2e", borderRadius:14, padding:20 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", marginBottom:18 }}>Severity Split</div>
                  {[
                    { label:"Critical", count:THREATS.filter(t=>t.severity==="CRITICAL").length, pct:80, color:"#ef4444" },
                    { label:"High",     count:THREATS.filter(t=>t.severity==="HIGH").length,     pct:60, color:"#f97316" },
                    { label:"Medium",   count:THREATS.filter(t=>t.severity==="MEDIUM").length,   pct:20, color:"#eab308" },
                    { label:"Low",      count:THREATS.filter(t=>t.severity==="LOW").length,      pct:40, color:"#22c55e" },
                  ].map((b,i)=>(
                    <div key={i} style={{ marginBottom:15 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontSize:12, color:"#94a3b8" }}>{b.label}</span>
                        <span style={{ fontSize:12, color:b.color, fontWeight:700 }}>{b.count}</span>
                      </div>
                      <Bar pct={Math.min(100, b.count * 20)} color={b.color}/>
                    </div>
                  ))}
                  <div style={{ marginTop:20, paddingTop:16, borderTop:"1px solid #0f1e2e" }}>
                    <div style={{ fontSize:11, color:"#334155", marginBottom:10, letterSpacing:"0.5px" }}>ORIGIN SPLIT</div>
                    <div style={{ display:"flex", gap:8 }}>
                      <div style={{ flex:1, background:"rgba(56,189,248,0.06)", border:"1px solid rgba(56,189,248,0.12)", borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
                        <div style={{ fontSize:22, fontWeight:800, color:"#38bdf8", fontFamily:"'Instrument Serif',serif" }}>{THREATS.filter(t=>t.origin==="GLOBAL").length}</div>
                        <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>Global</div>
                      </div>
                      <div style={{ flex:1, background:"rgba(244,114,182,0.06)", border:"1px solid rgba(244,114,182,0.12)", borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
                        <div style={{ fontSize:22, fontWeight:800, color:"#f472b6", fontFamily:"'Instrument Serif',serif" }}>{THREATS.filter(t=>t.origin==="ENDPOINT").length}</div>
                        <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>Endpoint</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                {/* Activity */}
                <div className="card" style={{ background:"#07101a", border:"1px solid #0f1e2e", borderRadius:14, padding:20 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", marginBottom:16 }}>Activity Log</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {ACTIVITY.map((a,i)=>{
                      const dc = a.type==="critical"?"#ef4444":a.type==="ai"?"#a78bfa":a.type==="warn"?"#f97316":a.type==="resolved"?"#22c55e":"#38bdf8";
                      return (
                        <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                          <span style={{ fontSize:11, color:"#1e3352", minWidth:36, marginTop:1 }}>{a.time}</span>
                          <div style={{ width:6, height:6, borderRadius:"50%", background:dc, flexShrink:0, marginTop:5 }}/>
                          <span style={{ fontSize:12, color:"#475569", lineHeight:1.5 }}>{a.msg}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Endpoint health */}
                <div className="card" style={{ background:"#07101a", border:"1px solid #0f1e2e", borderRadius:14, padding:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>Endpoint Health</div>
                    <button onClick={()=>setTab("endpoints")} style={{ background:"none", border:"1px solid #1e3352", borderRadius:6, padding:"4px 12px", color:"#60a5fa", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Manage →</button>
                  </div>
                  {ENDPOINTS.map((ep,i)=>{
                    const sc = ep.status==="INCIDENT"?"#ef4444":ep.status==="WARNING"?"#f97316":"#22c55e";
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:i<ENDPOINTS.length-1?"1px solid #0f1e2e":"none" }}>
                        <PulseDot color={sc} size={7}/>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, color:"#cbd5e1", fontWeight:500 }}>{ep.name}</div>
                          <div style={{ fontSize:11, color:"#334155" }}>{ep.os} · {ep.ip}</div>
                        </div>
                        {ep.incidents>0 && <Badge label={`${ep.incidents} incident${ep.incidents>1?"s":""}`} color="#ef4444"/>}
                        <Badge label={ep.status} color={sc}/>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ══ GLOBAL THREATS ══ */}
          {tab==="threats" && (
            <div className="fade-up" style={{ padding:28 }}>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:20, flexWrap:"wrap" }}>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {["ALL","CRITICAL","HIGH","MEDIUM","LOW"].map(f=>(
                    <button key={f} className="chip" onClick={()=>setSevFilter(f)} style={{
                      border:`1px solid ${sevFilter===f?(SEV[f]||"#2563eb"):"#0f1e2e"}`,
                      background:sevFilter===f?(SEVBG[f]||"rgba(37,99,235,0.1)"):"transparent",
                      color:sevFilter===f?(SEV[f]||"#60a5fa"):"#334155",
                      padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:600,
                    }}>{f}</button>
                  ))}
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  {["ALL","GLOBAL","ENDPOINT"].map(f=>(
                    <button key={f} className="chip" onClick={()=>setOriginFilter(f)} style={{
                      border:`1px solid ${originFilter===f?"#2563eb":"#0f1e2e"}`,
                      background:originFilter===f?"rgba(37,99,235,0.1)":"transparent",
                      color:originFilter===f?"#60a5fa":"#334155",
                      padding:"6px 14px", borderRadius:7, fontSize:12, fontWeight:500,
                    }}>{f}</button>
                  ))}
                </div>
                <div style={{ marginLeft:"auto" }}>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search CVE ID or title…"
                    style={{ background:"#0c1825", border:"1px solid #0f1e2e", borderRadius:8, padding:"8px 14px", color:"#cbd5e1", fontSize:13, width:270, fontFamily:"inherit" }}/>
                </div>
              </div>

              {filteredThreats.length === 0 && (
                <div style={{ textAlign:"center", padding:"60px 0", color:"#334155", fontSize:14 }}>
                  {THREATS.length === 0 ? "Loading threats from API... Run seed.py if this persists." : "No threats match your filters."}
                </div>
              )}

              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {filteredThreats.map(t=>{
                  const mitreTags = parseMitre(t.mitre_tags || t.mitre);
                  const score     = Math.round(t.priority_score ?? t.score ?? 0);
                  const sev       = t.severity || "MEDIUM";
                  return (
                    <div key={t.id}>
                      <div className={`threat-row card${selected?.id===t.id?" sel":""}`}
                        onClick={()=>setSelected(selected?.id===t.id?null:t)}
                        style={{ background:"#07101a", border:`1px solid ${selected?.id===t.id?"#2563eb":"#0f1e2e"}`, borderRadius:12, padding:"16px 20px", opacity:t.resolved?0.45:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                          <ScoreRing score={score} color={SEV[sev]||"#ef4444"} size={50}/>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", gap:8, marginBottom:7, alignItems:"center", flexWrap:"wrap" }}>
                              <span style={{ fontSize:11, color:"#60a5fa", fontWeight:700 }}>{t.cve || "ENDPOINT EVENT"}</span>
                              <Badge label={sev} color={SEV[sev]||"#ef4444"}/>
                              <Badge label={t.origin==="ENDPOINT"?"ENDPOINT":"GLOBAL"} color={t.origin==="ENDPOINT"?"#f472b6":"#38bdf8"}/>
                              {t.asset_match && <Badge label="ASSET MATCH" color="#22c55e"/>}
                              {t.resolved    && <Badge label="RESOLVED" color="#22c55e"/>}
                              {t.machine     && <Badge label={t.machine} color="#f472b6"/>}
                              <span style={{ marginLeft:"auto", fontSize:11, color:"#334155" }}>{t.ts || t.created_at?.slice(11,16) || "--"}</span>
                            </div>
                            <div style={{ fontSize:15, fontWeight:600, color:"#e2e8f0", marginBottom:9 }}>{t.title}</div>
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              <Badge label={t.source||"UNKNOWN"} color={SRC[t.source]||"#60a5fa"}/>
                              {mitreTags.map((m,mi)=>(
                                <Badge key={mi} label={`⚔ ${m}`} color={MCOL[mi]||"#38bdf8"}/>
                              ))}
                              {t.epss_score>0 && <span style={{ marginLeft:"auto", fontSize:11, color:"#334155" }}>EPSS {(t.epss_score*100).toFixed(0)}%</span>}
                            </div>
                          </div>
                          <div style={{ color:"#1e3352", fontSize:20, transition:"transform 0.2s", transform:selected?.id===t.id?"rotate(90deg)":"none", flexShrink:0 }}>›</div>
                        </div>
                      </div>

                      {selected?.id===t.id && (
                        <div className="fade-up" style={{ background:"#040c16", border:"1px solid #0f1e2e", borderTop:"none", borderRadius:"0 0 12px 12px", padding:"20px 20px 22px" }}>
                          <div style={{ display:"flex", gap:14 }}>
                            <div style={{ width:36, height:36, background:"rgba(167,139,250,0.12)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>🤖</div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:11, color:"#a78bfa", fontWeight:700, letterSpacing:"1px", marginBottom:10 }}>AI ANALYST SUMMARY</div>
                              <p style={{ fontSize:13, color:"#64748b", lineHeight:1.8, marginBottom:16 }}>
                                {t.ai_summary || t.summary || "AI summary not yet generated for this threat."}
                              </p>
                              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                                <button style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", padding:"7px 14px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>🚨 Escalate</button>
                                <button onClick={()=>api.resolveThreat(t.id).then(()=>qc.invalidateQueries(["threats"]))}
                                  style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", color:"#22c55e", padding:"7px 14px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>✓ Resolve</button>
                                <button style={{ background:"rgba(56,189,248,0.08)", border:"1px solid rgba(56,189,248,0.2)", color:"#38bdf8", padding:"7px 14px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>🔗 View in NVD</button>
                                {t.origin==="ENDPOINT" && <button style={{ background:"rgba(244,114,182,0.08)", border:"1px solid rgba(244,114,182,0.2)", color:"#f472b6", padding:"7px 14px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>🖥 Sandbox Report</button>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Knowledge graph */}
              <div className="card" style={{ background:"#07101a", border:"1px solid #0f1e2e", borderRadius:14, padding:22, marginTop:20 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", marginBottom:4 }}>Threat Knowledge Graph</div>
                <div style={{ fontSize:12, color:"#334155", marginBottom:16 }}>Relationships between threat actors, CVEs, campaigns, and MITRE tactics</div>
                <div style={{ display:"flex", gap:12, marginBottom:14 }}>
                  {[["#ef4444","Threat Actor"],["#f97316","CVE"],["#a78bfa","Campaign"],["#38bdf8","Tactic"]].map(([c,l])=>(
                    <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:8, height:8, borderRadius:"50%", background:c }}/>
                      <span style={{ fontSize:11, color:"#475569" }}>{l}</span>
                    </div>
                  ))}
                </div>
                <svg viewBox="0 0 720 420" style={{ width:"100%", height:220, borderRadius:8, background:"#040c16" }}>
                  {EDGES.map(([a,b],i)=>{
                    const na=NODES.find(n=>n.id===a), nb=NODES.find(n=>n.id===b);
                    return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke="#0f1e2e" strokeWidth="1.5"/>;
                  })}
                  {NODES.map(n=>(
                    <g key={n.id}>
                      <circle cx={n.x} cy={n.y} r={n.type==="actor"?22:n.type==="campaign"?18:14} fill={`${n.color}15`} stroke={n.color} strokeWidth="1.5"/>
                      <text x={n.x} y={n.y+1} textAnchor="middle" dominantBaseline="middle" fill={n.color} fontSize={n.type==="actor"?10:9} fontFamily="DM Sans,sans-serif" fontWeight="600">
                        {n.label.length>12?n.label.slice(0,11)+"…":n.label}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          )}

          {/* ══ ENDPOINTS ══ */}
          {tab==="endpoints" && (
            <div className="fade-up" style={{ padding:28 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:22 }}>
                {[
                  { label:"Machines Online", val:ENDPOINTS.length,                                   color:"#38bdf8" },
                  { label:"Active Incidents",val:ENDPOINTS.filter(e=>e.status==="INCIDENT").length,  color:"#ef4444" },
                  { label:"Agent Coverage",  val:"100%",                                              color:"#22c55e" },
                ].map((m,i)=>(
                  <div key={i} className="card" style={{ background:"#07101a", border:`1px solid ${m.color}18`, borderRadius:12, padding:"18px 20px" }}>
                    <div style={{ fontSize:11, color:m.color, fontWeight:600, letterSpacing:"0.3px", marginBottom:12 }}>{m.label}</div>
                    <div style={{ fontSize:38, fontWeight:800, color:"#f8fafc", fontFamily:"'Instrument Serif',serif" }}>{m.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {ENDPOINTS.map((ep,i)=>{
                  const sc=ep.status==="INCIDENT"?"#ef4444":ep.status==="WARNING"?"#f97316":"#22c55e";
                  return (
                    <div key={i} className="ep-row card" style={{ background:"#07101a", border:`1px solid ${ep.status==="INCIDENT"?"rgba(239,68,68,0.2)":"#0f1e2e"}`, borderRadius:12, padding:"18px 22px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                        <div style={{ width:44, height:44, background:`${sc}12`, border:`1px solid ${sc}25`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>💻</div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                            <span style={{ fontSize:15, fontWeight:700, color:"#e2e8f0" }}>{ep.name}</span>
                            <Badge label={ep.status} color={sc}/>
                            {ep.incidents>0 && <Badge label={`${ep.incidents} incident${ep.incidents>1?"s":""}`} color="#ef4444"/>}
                          </div>
                          <div style={{ display:"flex", gap:16 }}>
                            <span style={{ fontSize:12, color:"#475569" }}>{ep.os}</span>
                            <span style={{ fontSize:12, color:"#334155" }}>{ep.ip}</span>
                            <span style={{ fontSize:12, color:"#334155" }}>Agent {ep.agent}</span>
                            <span style={{ fontSize:12, color:"#334155" }}>Last seen {ep.lastSeen}</span>
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:20, flexShrink:0 }}>
                          {[["CPU",ep.cpu],["MEM",ep.mem]].map(([l,v])=>(
                            <div key={l} style={{ textAlign:"center" }}>
                              <div style={{ fontSize:11, color:"#334155", marginBottom:5 }}>{l}</div>
                              <div style={{ fontSize:16, fontWeight:700, color:v>80?"#ef4444":v>60?"#f97316":"#22c55e" }}>{v}%</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {ep.status==="INCIDENT" && (
                        <div style={{ marginTop:14, paddingTop:14, borderTop:"1px solid #0f1e2e", display:"flex", gap:8 }}>
                          <button onClick={()=>setTab("incidents")} style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", padding:"7px 14px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>🔍 View Incidents</button>
                          <button style={{ background:"rgba(244,114,182,0.08)", border:"1px solid rgba(244,114,182,0.2)", color:"#f472b6", padding:"7px 14px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>🧪 Open Sandbox</button>
                          <button style={{ background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.2)", color:"#f87171", padding:"7px 14px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>🔌 Isolate Machine</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ INCIDENTS ══ */}
          {tab==="incidents" && (
            <div className="fade-up" style={{ padding:28 }}>
              {incidents.length === 0 && THREATS.filter(t=>t.origin==="ENDPOINT").length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px 0", color:"#334155", fontSize:14 }}>
                  No endpoint incidents detected yet. The agent will report here when it finds something.
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {(incidents.length > 0 ? incidents : THREATS.filter(t=>t.origin==="ENDPOINT")).map((t,i)=>{
                    const mitreTags = parseMitre(t.mitre_tags || t.mitre);
                    return (
                      <div key={i} className="card" style={{ background:"#07101a", border:`1px solid ${t.resolved?"#0f1e2e":"rgba(239,68,68,0.18)"}`, borderRadius:14, padding:22, opacity:t.resolved?0.5:1 }}>
                        <div style={{ display:"flex", gap:16, alignItems:"flex-start" }}>
                          <div style={{ width:46, height:46, background:"rgba(239,68,68,0.1)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                            {(t.title||"").includes("ansom")?"🔒":(t.title||"").includes("C2")?"🌐":"⚠️"}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap", alignItems:"center" }}>
                              <span style={{ fontSize:15, fontWeight:700, color:"#f1f5f9" }}>{t.title}</span>
                              <Badge label="ENDPOINT EVENT" color="#f472b6"/>
                              {!t.resolved && (
                                <div style={{ display:"flex", alignItems:"center", gap:6, marginLeft:"auto" }}>
                                  <PulseDot color="#ef4444" size={7}/>
                                  <span style={{ fontSize:11, color:"#ef4444", fontWeight:600 }}>ACTIVE</span>
                                </div>
                              )}
                            </div>
                            <p style={{ fontSize:13, color:"#475569", lineHeight:1.7, marginBottom:14 }}>
                              {t.ai_summary || t.summary || "Processing..."}
                            </p>
                            {t.machine && (
                              <div style={{ background:"#040c16", border:"1px solid #0f1e2e", borderRadius:10, padding:"14px 16px", marginBottom:14 }}>
                                <div style={{ fontSize:11, color:"#334155", letterSpacing:"1px", marginBottom:10 }}>INCIDENT TIMELINE</div>
                                {[
                                  { time:"00:00", event:"Anomaly detected by endpoint monitor",             color:"#f97316" },
                                  { time:"00:01", event:"File sent to VirusTotal for quick hash check",    color:"#a78bfa" },
                                  { time:"00:02", event:"AI scoring and MITRE mapping completed",          color:"#38bdf8" },
                                  { time:"00:03", event:"AI verdict determined — auto-response triggered", color:"#ef4444" },
                                  { time:"00:04", event:"Process killed · File quarantined · Analyst notified", color:"#22c55e" },
                                ].map((ev,ei)=>(
                                  <div key={ei} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:ei<4?10:0 }}>
                                    <span style={{ fontSize:11, color:"#334155", minWidth:40, marginTop:1 }}>+{ev.time}</span>
                                    <div style={{ width:6, height:6, borderRadius:"50%", background:ev.color, flexShrink:0, marginTop:4 }}/>
                                    <span style={{ fontSize:12, color:"#64748b" }}>{ev.event}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{ display:"flex", gap:8 }}>
                              <button style={{ background:"rgba(244,114,182,0.08)", border:"1px solid rgba(244,114,182,0.2)", color:"#f472b6", padding:"7px 14px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>🧪 Sandbox Report</button>
                              <button style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)", color:"#a78bfa", padding:"7px 14px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>📋 Full Playbook</button>
                              <button onClick={()=>api.resolveThreat(t.id).then(()=>qc.invalidateQueries(["incidents"]))}
                                style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", color:"#22c55e", padding:"7px 14px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>✓ Mark Resolved</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ AI BRIEF ══ */}
          {tab==="brief" && (
            <div className="fade-up" style={{ padding:28, maxWidth:860 }}>
              <div style={{ background:"#07101a", border:"1px solid #0f1e2e", borderRadius:14, overflow:"hidden" }}>
                <div style={{ background:"linear-gradient(135deg,rgba(167,139,250,0.1) 0%,rgba(37,99,235,0.06) 100%)", borderBottom:"1px solid #0f1e2e", padding:"22px 28px", display:"flex", gap:16, alignItems:"center" }}>
                  <div style={{ width:48, height:48, background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.2)", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🤖</div>
                  <div>
                    <div style={{ fontSize:18, fontWeight:700, color:"#f1f5f9", letterSpacing:"-0.3px" }}>Morning Threat Brief</div>
                    <div style={{ fontSize:12, color:"#475569", marginTop:3 }}>
                      Generated by ThreatLens AI · {briefData.generated_at ? new Date(briefData.generated_at).toLocaleString() : "Loading..."}
                    </div>
                  </div>
                  <div style={{ marginLeft:"auto" }}>
                    <div style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", borderRadius:7, padding:"6px 12px", fontSize:12, color:"#22c55e" }}>✦ Fresh</div>
                  </div>
                </div>

                <div style={{ display:"flex", borderBottom:"1px solid #0f1e2e", background:"#040c16" }}>
                  {["Overview","Global Threats","Endpoint Incidents","Recommendations"].map((s,i)=>(
                    <button key={i} className="chip" onClick={()=>setBriefSection(i)} style={{
                      padding:"12px 20px", background:"none",
                      color:briefSection===i?"#a78bfa":"#334155",
                      borderBottom:briefSection===i?"2px solid #a78bfa":"2px solid transparent",
                      fontSize:13, fontWeight:briefSection===i?600:400,
                      borderTop:"none", borderLeft:"none", borderRight:"none", borderRadius:0, fontFamily:"inherit"
                    }}>{s}</button>
                  ))}
                </div>

                <div style={{ padding:28 }}>
                  {briefSection===0 && (
                    <div>
                      <p style={{ fontSize:13, color:"#64748b", lineHeight:1.9, marginBottom:22 }}>
                        {briefData.brief
                          ? briefData.brief.slice(0, 400) + "..."
                          : "Brief is being generated. Run the backend and ensure OpenAI API key is configured."}
                      </p>
                      {briefData.brief && (
                        <div style={{ background:"#040c16", border:"1px solid #0f1e2e", borderRadius:10, padding:20 }}>
                          <div style={{ fontSize:11, color:"#334155", letterSpacing:"1px", marginBottom:12 }}>FULL AI BRIEF</div>
                          <p style={{ fontSize:13, color:"#64748b", lineHeight:1.9, whiteSpace:"pre-wrap" }}>{briefData.brief}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {briefSection===1 && (
                    <div>
                      <p style={{ fontSize:13, color:"#64748b", lineHeight:1.9, marginBottom:20 }}>
                        {THREATS.filter(t=>t.origin==="GLOBAL").length} global CVEs ingested. Sorted by ThreatLens priority score.
                      </p>
                      {THREATS.filter(t=>t.origin==="GLOBAL").slice(0,5).map((t,i)=>{
                        const score = Math.round(t.priority_score ?? t.score ?? 0);
                        return (
                          <div key={i} style={{ display:"flex", gap:14, padding:"14px 0", borderBottom:i<4?"1px solid #0f1e2e":"none", alignItems:"flex-start" }}>
                            <ScoreRing score={score} color={SEV[t.severity]||"#ef4444"} size={44}/>
                            <div>
                              <div style={{ display:"flex", gap:7, marginBottom:6, flexWrap:"wrap" }}>
                                <span style={{ fontSize:11, color:"#60a5fa", fontWeight:700 }}>{t.cve}</span>
                                <Badge label={t.severity} color={SEV[t.severity]||"#ef4444"}/>
                                {t.asset_match && <Badge label="YOUR STACK" color="#22c55e"/>}
                              </div>
                              <div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0", marginBottom:6 }}>{t.title}</div>
                              <p style={{ fontSize:13, color:"#64748b", lineHeight:1.7 }}>{t.ai_summary || t.summary || "Processing..."}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {briefSection===2 && (
                    <div>
                      <p style={{ fontSize:13, color:"#64748b", lineHeight:1.9, marginBottom:20 }}>
                        {incidents.length || THREATS.filter(t=>t.origin==="ENDPOINT").length} endpoint incidents detected. Review and clear after forensics.
                      </p>
                      {(incidents.length > 0 ? incidents : THREATS.filter(t=>t.origin==="ENDPOINT")).map((t,i)=>(
                        <div key={i} style={{ padding:"16px", background:"#040c16", borderRadius:10, border:"1px solid rgba(239,68,68,0.15)", marginBottom:14 }}>
                          <div style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                            {t.machine && <Badge label={t.machine} color="#f472b6"/>}
                            <Badge label="AUTO-RESPONDED" color="#22c55e"/>
                            <span style={{ fontSize:11, color:"#334155", marginLeft:"auto" }}>{t.ts || t.created_at?.slice(11,16) || "--"}</span>
                          </div>
                          <div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0", marginBottom:7 }}>{t.title}</div>
                          <p style={{ fontSize:13, color:"#64748b", lineHeight:1.7 }}>{t.ai_summary || t.summary || "Processing..."}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {briefSection===3 && (
                    <div>
                      {["Immediate (Today)","Short-term (This Week)","Ongoing"].map((phase,pi)=>(
                        <div key={pi} style={{ marginBottom:22 }}>
                          <div style={{ fontSize:12, color:"#334155", letterSpacing:"1px", fontWeight:600, marginBottom:12 }}>{phase.toUpperCase()}</div>
                          {[
                            ["Patch all CRITICAL CVEs matching your asset profile","Isolate any machines with active endpoint incidents","Rotate credentials on affected systems"],
                            ["Review EPSS scores for all HIGH severity CVEs","Run full endpoint scan with updated YARA signatures","Audit CI/CD pipeline access logs"],
                            ["Schedule weekly EPSS score reviews","Enable real-time Slack alerts for CRITICAL incidents","Keep asset inventory up to date with software versions"],
                          ][pi].map((rec,ri)=>(
                            <div key={ri} style={{ display:"flex", gap:10, marginBottom:10, alignItems:"flex-start" }}>
                              <span style={{ color:"#22c55e", fontSize:14, marginTop:1 }}>›</span>
                              <span style={{ fontSize:13, color:"#64748b", lineHeight:1.6 }}>{rec}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ padding:"14px 28px 20px", borderTop:"1px solid #0f1e2e", display:"flex", gap:8 }}>
                  <button style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)", color:"#a78bfa", padding:"8px 16px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>📋 Copy Brief</button>
                  <button style={{ background:"rgba(56,189,248,0.08)", border:"1px solid rgba(56,189,248,0.2)", color:"#38bdf8", padding:"8px 16px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>📤 Export PDF</button>
                  <button style={{ background:"rgba(34,197,94,0.08)", border:"1px solid rgba(34,197,94,0.2)", color:"#22c55e", padding:"8px 16px", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>📨 Send to Team</button>
                </div>
              </div>
            </div>
          )}

          {/* ══ DATA SOURCES ══ */}
          {tab==="sources" && (
            <div className="fade-up" style={{ padding:28 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
                {SOURCES.map((s,i)=>(
                  <div key={i} className="card" style={{ background:"#07101a", border:"1px solid #0f1e2e", borderRadius:14, padding:22 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                      <div style={{ width:44, height:44, background:`${s.color}12`, border:`1px solid ${s.color}25`, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{s.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:"#e2e8f0" }}>{s.name}</div>
                        <div style={{ fontSize:11, color:"#334155", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.url}</div>
                      </div>
                      <PulseDot color="#22c55e" size={7}/>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
                      {[["Today",s.count],["Matched",s.matched],["Interval",s.interval]].map(([l,v])=>(
                        <div key={l} style={{ background:"#040c16", borderRadius:8, padding:"9px 10px" }}>
                          <div style={{ fontSize:10, color:"#334155", marginBottom:4 }}>{l}</div>
                          <div style={{ fontSize:13, color:s.color, fontWeight:700 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:11, color:"#334155" }}>Last sync: {s.lastSync}</span>
                      <Badge label="ACTIVE" color="#22c55e"/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}