import { useState, useRef, useEffect } from "react";

const TABLES = [
  { name: "Glucose",     icon: "G", desc: "Glucose readings & monitoring",      cols: ["g_id","patient_id","glucose_value","reading_time","device_id","trend","checkup_date"],                                                            color: "#1a73e8" },
  { name: "Heart",       icon: "H", desc: "Heart disease & risk factors",        cols: ["h_id","patient_id","diagnosis_date","severity","cholesterol","blood_pressure","smoking_status","treatment_plan","record_date"],                    color: "#d93025" },
  { name: "Activity",    icon: "A", desc: "Glucose before & after exercise",     cols: ["a_id","patient_id","activity_type","duration_minutes","calories_burned","glucose_before","glucose_after","activity_date"],                         color: "#f29900" },
  { name: "Patients",    icon: "P", desc: "Master patient registry",             cols: ["patient_id","first_name","last_name","dob","gender","email","phone","created_at"],                                                                 color: "#1e8e3e" },
  { name: "Medications", icon: "M", desc: "Prescribed medications & dosages",    cols: ["m_id","patient_id","med_name","dosage","frequency","start_date","end_date","prescribed_by"],                                                       color: "#9334e6" },
];

const SUGGESTIONS = [
  "Show top 10 patients with highest glucose",
  "List patients with severe heart conditions",
  "Which medications are most prescribed?",
];

const FLASK_URL = import.meta.env.VITE_API_URL || "https://medsql.onrender.com";

export default function App() {
  const [dark, setDark]                     = useState(false);
  const [email, setEmail]                   = useState("");
  const [message, setMessage]               = useState("");
  const [messages, setMessages]             = useState([]);
  const [loading, setLoading]               = useState(false);
  const [activeTable, setActiveTable]       = useState(null);
  const [resultData, setResultData]         = useState(null);
  const [waitingForResults, setWaitingForResults] = useState(false);
  const [showSchema, setShowSchema]         = useState(false);
  const chatEndRef = useRef(null);
  const pollRef    = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, resultData, waitingForResults]);

  const startPolling = () => {
    setWaitingForResults(true); setResultData(null);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${FLASK_URL}/get-results`);
        const d = await r.json();
        if (d && (d.columns?.length > 0 || d.error)) {
          setResultData(d); setWaitingForResults(false); clearInterval(pollRef.current);
        }
      } catch { setWaitingForResults(false); clearInterval(pollRef.current); }
    }, 1200);
  };

  const send = async () => {
    if (!message.trim()) return;
    if (!email.trim()) { alert("Enter your email first."); return; }
    const um = { role:"user", text:message, time:new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) };
    setMessages(p => [...p, um]); setLoading(true); setResultData(null);
    const sent = message; setMessage("");
    try {
      const r = await fetch(`${FLASK_URL}/send-message`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({message:sent, email}) });
      const d = await r.json();
      setMessages(p => [...p, { role:"assistant", text:d.sql, time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) }]);
      startPolling();
    } catch {
      setMessages(p => [...p, { role:"error", text:"Could not connect to server.", time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) }]);
    } finally { setLoading(false); }
  };

  const handleKey = e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const downloadExcel = () => {
    if (!resultData?.rows?.length) return;
    const tsv = resultData.columns.join("\t") + "\n" + resultData.rows.map(r=>r.map(c=>c||"").join("\t")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([tsv],{type:"application/vnd.ms-excel"})), download:`medsql_${Date.now()}.xls` });
    a.click();
  };

  const D = dark;
  const T = {
    bg:       D ? "#0f0f0f" : "#ffffff",
    bgSub:    D ? "#1a1a1a" : "#f8f9fa",
    bgCard:   D ? "#212121" : "#ffffff",
    bgHover:  D ? "#2a2a2a" : "#f1f3f4",
    border:   D ? "#3c3c3c" : "#e0e0e0",
    text:     D ? "#e8eaed" : "#202124",
    textSub:  D ? "#9aa0a6" : "#5f6368",
    textMini: D ? "#5f6368" : "#9aa0a6",
    blue:     "#1a73e8",
    blueHov:  "#1557b0",
    ripple:   D ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
  };

  return (
    <div style={{ height:"100dvh", display:"flex", flexDirection:"column", fontFamily:"'Google Sans', 'Roboto', sans-serif", background:T.bg, color:T.text, overflow:"hidden" }}>
      <style>{css(D, T)}</style>

      {/* ── TOP APP BAR (YouTube / GPay style) ── */}
      <header className="appbar" style={{ background: D ? "#0f0f0f" : "#ffffff", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* Hamburger — mobile only */}
          <button className="icon-btn mobile-only" onClick={() => setShowSchema(!showSchema)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#1a73e8,#0d47a1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
            </div>
            <div>
              <div style={{ fontSize:17, fontWeight:700, lineHeight:1, letterSpacing:"-0.02em", color:T.text }}>
                MedSQL<span style={{ color:T.blue }}>.ai</span>
              </div>
              <div style={{ fontSize:9, color:T.textMini, letterSpacing:"0.08em", marginTop:1, fontFamily:"'Roboto Mono', monospace" }}>CLINICAL DATA PLATFORM</div>
            </div>
          </div>
        </div>

        {/* Right controls */}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          {/* Theme toggle — pill like GPay */}
          <button className="pill-btn" onClick={() => setDark(!D)}>
            {D
              ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/></svg> Light</>
              : <><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg> Dark</>
            }
          </button>
          {/* Avatar */}
          <div className="avatar-circle" style={{ background:T.blue }}>
            {email ? email[0].toUpperCase() : "?"}
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── SIDEBAR / NAV DRAWER ── */}
        {showSchema && <div className="scrim" onClick={() => setShowSchema(false)} />}
        <nav className={`nav-drawer ${showSchema ? "drawer-open" : ""}`} style={{ background:T.bgSub, borderRight:`1px solid ${T.border}` }}>

          <div style={{ padding:"16px 16px 10px" }}>
            <div style={{ fontSize:11, fontWeight:600, color:T.textMini, letterSpacing:"0.1em", marginBottom:12, fontFamily:"'Roboto Mono', monospace" }}>TABLES</div>
            {TABLES.map(t => (
              <div key={t.name}>
                <div className="nav-item" onClick={() => setActiveTable(activeTable===t.name ? null : t.name)}
                  style={{ background: activeTable===t.name ? (D?"rgba(26,115,232,0.12)":"rgba(26,115,232,0.08)") : "transparent", borderRadius:8 }}>
                  <div className="nav-icon" style={{ background:`${t.color}18`, color:t.color }}>{t.icon}</div>
                  <span style={{ fontSize:13, fontWeight: activeTable===t.name ? 600 : 400, color: activeTable===t.name ? t.color : T.text, flex:1 }}>{t.name}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color:T.textMini, transform: activeTable===t.name ? "rotate(180deg)" : "none", transition:"transform 0.2s", flexShrink:0 }}><path d="M7 10l5 5 5-5z"/></svg>
                </div>
                {activeTable===t.name && (
                  <div style={{ paddingLeft:36, paddingBottom:8, display:"flex", flexWrap:"wrap", gap:5 }}>
                    {t.cols.map(c => (
                      <span key={c} style={{ fontSize:10, padding:"2px 8px", borderRadius:12, background:D?"rgba(255,255,255,0.06)":T.bgHover, color:T.textSub, fontFamily:"'Roboto Mono', monospace" }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ margin:"0 16px", borderTop:`1px solid ${T.border}`, paddingTop:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#1e8e3e", boxShadow:"0 0 6px #1e8e3eaa" }} />
              <span style={{ fontSize:11, color:T.textSub, fontFamily:"'Roboto Mono', monospace" }}>Oracle DB · Connected</span>
            </div>
          </div>
        </nav>

        {/* ── MAIN CHAT AREA ── */}
        <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:T.bg }}>

          {/* Operator email bar — like a search bar */}
          <div style={{ padding:"10px 16px", borderBottom:`1px solid ${T.border}`, background: D?"#161616":T.bgSub }}>
            <div className="search-bar" style={{ background:T.bgCard, border:`1px solid ${T.border}` }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color:T.textSub, flexShrink:0 }}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              <input type="email" placeholder="Enter your email to continue..." value={email} onChange={e => setEmail(e.target.value)}
                style={{ flex:1, background:"transparent", border:"none", outline:"none", fontSize:13, color:T.text, fontFamily:"'Google Sans','Roboto',sans-serif" }} />
              {email && (
                <div style={{ display:"flex", alignItems:"center", gap:4, padding:"2px 10px", borderRadius:12, background:D?"rgba(30,142,62,0.15)":"rgba(30,142,62,0.1)", border:"1px solid rgba(30,142,62,0.3)" }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"#1e8e3e" }} />
                  <span style={{ fontSize:10, color:"#1e8e3e", fontWeight:600 }}>Active</span>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="msg-area" style={{ background:T.bg }}>

            {messages.length===0 && !resultData && (
              <div className="welcome">
                {/* Product icon like GPay */}
                <div style={{ width:72, height:72, borderRadius:20, background:"linear-gradient(135deg,#1a73e8,#0d47a1)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", boxShadow:"0 8px 32px rgba(26,115,232,0.35)" }}>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="white"><path d="M9.5 6.5v3h-3v-3h3M11 5H5v6h6V5zm-1.5 9.5v3h-3v-3h3M11 13H5v6h6v-6zm6.5-6.5v3h-3v-3h3M19 5h-6v6h6V5zm-6 8h1.5v1.5H13V13zm1.5 1.5H16V16h-1.5v-1.5zM16 13h1.5v1.5H16V13zm-3 3h1.5v1.5H13V16zm1.5 1.5H16V19h-1.5v-1.5zM16 16h1.5v1.5H16V16zm1.5-1.5H19V16h-1.5v-1.5zm0 3H19V19h-1.5v-1.5z"/></svg>
                </div>
                <div style={{ fontSize:22, fontWeight:700, color:T.text, marginBottom:8, letterSpacing:"-0.02em" }}>MedSQL.ai</div>
                <div style={{ fontSize:14, color:T.textSub, lineHeight:1.7, maxWidth:320, margin:"0 auto 24px" }}>
                  Ask questions about your clinical data in plain English. SQL is generated and executed automatically.
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8, maxWidth:380, margin:"0 auto" }}>
                  {SUGGESTIONS.map(s => (
                    <button key={s} className="suggestion" onClick={() => { setMessage(s); textareaRef.current?.focus(); }} style={{ background:T.bgCard, border:`1px solid ${T.border}`, color:T.text }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color:T.blue, flexShrink:0 }}><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                      <span style={{ fontSize:13, textAlign:"left" }}>{s}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color:T.textMini, marginLeft:"auto", flexShrink:0 }}><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`msg-row ${m.role==="user"?"row-right":"row-left"}`}>
                {m.role!=="user" && (
                  <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#1a73e8,#0d47a1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:16 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                  </div>
                )}
                <div style={{ maxWidth:"80%", minWidth:0 }}>
                  <div style={{ fontSize:11, color:T.textMini, marginBottom:4, fontFamily:"'Roboto Mono',monospace", textAlign: m.role==="user"?"right":"left" }}>
                    {m.role==="user" ? (email||"You") : m.role==="error" ? "Error" : "MedSQL AI"} · {m.time}
                  </div>
                  <div className="bubble" style={{
                    background: m.role==="user" ? T.blue : m.role==="error" ? (D?"rgba(217,48,37,0.12)":"#fce8e6") : T.bgCard,
                    color: m.role==="user" ? "#fff" : m.role==="error" ? "#d93025" : T.text,
                    borderRadius: m.role==="user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    border: m.role==="user" ? "none" : m.role==="error" ? "1px solid rgba(217,48,37,0.2)" : `1px solid ${T.border}`,
                    boxShadow: m.role==="user" ? "0 2px 12px rgba(26,115,232,0.3)" : D?"0 1px 4px rgba(0,0,0,0.4)":"0 1px 4px rgba(0,0,0,0.08)",
                  }}>
                    <pre style={{ margin:0, fontSize:13, lineHeight:1.75, whiteSpace:"pre-wrap", wordBreak:"break-word", fontFamily: m.role==="assistant"?"'Roboto Mono',monospace":"inherit", fontWeight:400 }}>{m.text}</pre>
                  </div>
                </div>
                {m.role==="user" && (
                  <div style={{ width:28, height:28, borderRadius:"50%", background:T.blue, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0, marginTop:16 }}>
                    {email ? email[0].toUpperCase() : "U"}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="msg-row row-left">
                <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#1a73e8,#0d47a1)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:16 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                </div>
                <div>
                  <div style={{ fontSize:11, color:T.textMini, marginBottom:4, fontFamily:"'Roboto Mono',monospace" }}>MedSQL AI · Generating...</div>
                  <div className="bubble" style={{ background:T.bgCard, border:`1px solid ${T.border}` }}>
                    <div style={{ display:"flex", gap:5, alignItems:"center", padding:"2px 0" }}>
                      {[0,1,2].map(i => <span key={i} className="dot" style={{ animationDelay:`${i*0.2}s`, background:T.blue }} />)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {waitingForResults && (
              <div className="status-chip" style={{ background:D?"rgba(242,153,0,0.1)":"#fef7e0", border:"1px solid rgba(242,153,0,0.3)" }}>
                <div className="spin" style={{ borderColor:"rgba(242,153,0,0.25)", borderTopColor:"#f29900" }} />
                <span style={{ fontSize:12, color:"#f29900", fontWeight:500 }}>Executing query on Oracle Autonomous Database...</span>
              </div>
            )}

            {resultData && !waitingForResults && (
              <div className="result-card" style={{ background:T.bgCard, border:`1px solid ${T.border}` }}>
                {/* Result header */}
                <div className="result-head" style={{ borderBottom:`1px solid ${T.border}`, background:D?"rgba(26,115,232,0.06)":T.bgSub }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: resultData.error?"#d93025":"#1e8e3e" }}><path d={resultData.error ? "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" : "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z"}/></svg>
                    <span style={{ fontSize:12, fontWeight:600, color: resultData.error?"#d93025":"#1e8e3e" }}>
                      {resultData.error ? "Query Failed" : `${resultData.rows?.length ?? 0} rows returned`}
                    </span>
                  </div>
                  {!resultData.error && resultData.rows?.length > 0 && (
                    <button className="export-btn" onClick={downloadExcel} style={{ background:D?"rgba(26,115,232,0.12)":"rgba(26,115,232,0.08)", border:"1px solid rgba(26,115,232,0.25)", color:T.blue }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                      Export
                    </button>
                  )}
                </div>
                {resultData.error ? (
                  <div style={{ padding:"14px 16px", color:"#d93025", fontSize:13, fontFamily:"'Roboto Mono',monospace" }}>{resultData.error}</div>
                ) : resultData.rows?.length===0 ? (
                  <div style={{ padding:"20px 16px", color:T.textSub, fontSize:13, textAlign:"center" }}>No results found.</div>
                ) : (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                      <thead>
                        <tr style={{ background:D?"rgba(255,255,255,0.03)":T.bgSub }}>
                          <th style={{ padding:"10px 14px", textAlign:"center", width:40, fontSize:11, color:T.textMini, borderBottom:`1px solid ${T.border}`, fontWeight:500 }}>#</th>
                          {resultData.columns.map(c => (
                            <th key={c} style={{ padding:"10px 16px", textAlign:"left", fontSize:11, color:T.textSub, borderBottom:`1px solid ${T.border}`, fontWeight:600, whiteSpace:"nowrap", letterSpacing:"0.04em" }}>{c.toUpperCase()}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {resultData.rows.map((row,ri) => (
                          <tr key={ri} className="trow">
                            <td style={{ padding:"10px 14px", textAlign:"center", fontSize:12, color:T.textMini, borderBottom:`1px solid ${T.border}` }}>{ri+1}</td>
                            {row.map((cell,ci) => (
                              <td key={ci} style={{ padding:"10px 16px", fontSize:13, color:cell?T.text:T.textMini, borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap" }}>{cell||"—"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* ── INPUT BAR — GPay / GMessages style ── */}
          <div className="input-bar" style={{ background:T.bg, borderTop:`1px solid ${T.border}` }}>
            <div className="input-inner" style={{ background:T.bgCard, border:`1px solid ${T.border}` }}>
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Ask about your patient data..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKey}
                style={{ flex:1, background:"transparent", border:"none", outline:"none", resize:"none", color:T.text, fontSize:14, lineHeight:1.5, fontFamily:"'Google Sans','Roboto',sans-serif", maxHeight:120, overflowY:"auto" }}
              />
              <button className="send-fab" onClick={send} disabled={loading||waitingForResults||!message.trim()} style={{ background: (loading||waitingForResults||!message.trim()) ? (D?"#333":"#e8eaed") : T.blue }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              </button>
            </div>
            <div style={{ textAlign:"center", marginTop:6, fontSize:10, color:T.textMini, fontFamily:"'Roboto Mono',monospace" }}>↵ Send · ⇧↵ New line</div>
          </div>
        </main>
      </div>
    </div>
  );
}

function css(D, T) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Roboto:wght@300;400;500;700&family=Roboto+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    input, textarea, button { font-family: 'Google Sans', 'Roboto', sans-serif; }
    textarea::placeholder, input::placeholder { color: ${T.textMini}; }
    button { cursor: pointer; }

    /* App bar */
    .appbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 16px; height: 56px; position: sticky; top: 0; z-index: 200;
      box-shadow: 0 1px 3px rgba(0,0,0,${D?0.4:0.12});
    }

    /* Icon button */
    .icon-btn {
      width: 40px; height: 40px; border-radius: 50%; border: none;
      background: transparent; color: ${T.textSub}; display: flex;
      align-items: center; justify-content: center; transition: background 0.15s;
    }
    .icon-btn:hover { background: ${T.ripple}; }

    /* Pill button (theme toggle) */
    .pill-btn {
      display: flex; align-items: center; gap: 6px; padding: 6px 14px;
      border-radius: 20px; border: 1px solid ${T.border};
      background: ${D?"rgba(255,255,255,0.05)":T.bgSub};
      color: ${T.textSub}; font-size: 12px; font-weight: 500; transition: all 0.2s;
    }
    .pill-btn:hover { background: ${T.bgHover}; border-color: ${T.blue}; color: ${T.blue}; }

    /* Avatar */
    .avatar-circle {
      width: 34px; height: 34px; border-radius: 50%; display: flex;
      align-items: center; justify-content: center; font-size: 14px;
      font-weight: 700; color: #fff; flex-shrink: 0;
    }

    /* Nav drawer */
    .nav-drawer {
      width: 240px; min-width: 240px; overflow-y: auto; overflow-x: hidden;
      transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
    }
    .nav-drawer::-webkit-scrollbar { width: 4px; }
    .nav-drawer::-webkit-scrollbar-thumb { background: ${D?"rgba(255,255,255,0.12)":T.border}; border-radius: 4px; }

    /* Nav items */
    .nav-item {
      display: flex; align-items: center; gap: 10px; padding: 9px 12px;
      border-radius: 8px; cursor: pointer; transition: background 0.15s; margin-bottom: 2px;
    }
    .nav-item:hover { background: ${T.bgHover} !important; }
    .nav-icon {
      width: 30px; height: 30px; border-radius: 7px; display: flex;
      align-items: center; justify-content: center; font-size: 12px;
      font-weight: 700; font-family: 'Roboto Mono', monospace; flex-shrink: 0;
    }

    /* Scrim */
    .scrim { position: fixed; inset: 0; top: 56px; z-index: 99; background: rgba(0,0,0,0.5); }

    /* Search bar (email) */
    .search-bar {
      display: flex; align-items: center; gap: 10px; padding: 8px 14px;
      border-radius: 24px; max-width: 560px;
    }

    /* Message area */
    .msg-area {
      flex: 1; overflow-y: auto; display: flex; flex-direction: column;
      gap: 12px; padding: 16px; scroll-behavior: smooth;
    }
    .msg-area::-webkit-scrollbar { width: 4px; }
    .msg-area::-webkit-scrollbar-thumb { background: ${D?"rgba(255,255,255,0.1)":T.border}; border-radius: 4px; }

    /* Welcome */
    .welcome { margin: auto; text-align: center; padding: 32px 16px; max-width: 480px; animation: fadeUp 0.4s ease; }

    /* Suggestions — like Google search chips */
    .suggestion {
      display: flex; align-items: center; gap: 10px; padding: 12px 16px;
      border-radius: 12px; text-align: left; width: 100%; font-size: 13px;
      font-weight: 400; transition: all 0.15s;
    }
    .suggestion:hover { background: ${D?"rgba(26,115,232,0.1)":"rgba(26,115,232,0.06)"} !important; border-color: ${T.blue} !important; }

    /* Message rows */
    .msg-row { display: flex; align-items: flex-start; gap: 10px; animation: slideUp 0.28s ease; }
    .row-left { flex-direction: row; }
    .row-right { flex-direction: row-reverse; }

    /* Bubble */
    .bubble { padding: 10px 14px; word-break: break-word; }

    /* Status chip */
    .status-chip {
      display: flex; align-items: center; gap: 10px; padding: 10px 16px;
      border-radius: 12px; animation: slideUp 0.28s ease; align-self: flex-start;
    }

    /* Dots loader */
    .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; animation: bounce 1.2s ease-in-out infinite; }
    @keyframes bounce { 0%,60%,100% { transform:translateY(0); opacity:0.3; } 30% { transform:translateY(-8px); opacity:1; } }

    /* Spinner */
    .spin { width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid; flex-shrink:0; animation: spin 0.85s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Result card */
    .result-card { border-radius: 12px; overflow: hidden; animation: slideUp 0.3s ease; }
    .result-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; }

    /* Export */
    .export-btn {
      display: flex; align-items: center; gap: 6px; padding: 5px 12px;
      border-radius: 20px; font-size: 12px; font-weight: 500; transition: all 0.15s;
    }
    .export-btn:hover { opacity: 0.85; transform: translateY(-1px); }

    /* Table rows */
    .trow:hover td { background: ${D?"rgba(255,255,255,0.03)":T.bgSub}; }
    .trow:last-child td { border-bottom: none !important; }

    /* Input bar */
    .input-bar { padding: 10px 16px 12px; }
    .input-inner {
      display: flex; align-items: flex-end; gap: 10px;
      border-radius: 24px; padding: 10px 10px 10px 16px;
    }

    /* Send FAB */
    .send-fab {
      width: 38px; height: 38px; border-radius: 50%; border: none; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; box-shadow: 0 2px 8px rgba(26,115,232,0.3);
    }
    .send-fab:not(:disabled):hover { transform: scale(1.08); box-shadow: 0 4px 16px rgba(26,115,232,0.45); }
    .send-fab:disabled { box-shadow: none; cursor: not-allowed; }

    /* Mobile only */
    .mobile-only { display: none; }

    /* Animations */
    @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeUp  { from { opacity:0; transform:translateY(6px);  } to { opacity:1; transform:translateY(0); } }

    /* ── Responsive ── */
    @media (max-width: 680px) {
      .nav-drawer {
        position: fixed; top: 56px; left: 0; bottom: 0; z-index: 100;
        transform: translateX(-100%); width: 78vw; max-width: 280px; min-width: unset;
      }
      .nav-drawer.drawer-open { transform: translateX(0); }
      .mobile-only { display: flex !important; }
    }
    @media (min-width: 681px) {
      .nav-drawer { transform: none !important; position: relative !important; }
      .mobile-only { display: none !important; }
    }
    @media (max-width: 400px) {
      .appbar { padding: 0 10px; }
      .input-bar { padding: 8px 10px 10px; }
      .msg-area { padding: 12px 10px; }
    }
  `;
}