import { useState, useRef, useEffect } from "react";

const TABLES = [
  { name: "Glucose", icon: "G", desc: "Patient glucose readings & monitoring", cols: ["g_id", "patient_id", "glucose_value", "reading_time", "device_id", "trend", "checkup_date"], accent: "#6366f1" },
  { name: "Heart", icon: "H", desc: "Heart disease diagnosis & risk factors", cols: ["h_id", "patient_id", "diagnosis_date", "severity", "cholesterol", "blood_pressure", "smoking_status", "treatment_plan", "record_date"], accent: "#f43f5e" },
  { name: "Activity", icon: "A", desc: "Glucose before & after exercise", cols: ["a_id", "patient_id", "activity_type", "duration_minutes", "calories_burned", "glucose_before", "glucose_after", "activity_date"], accent: "#f59e0b" },
  { name: "Patients", icon: "P", desc: "Master patient registry", cols: ["patient_id", "first_name", "last_name", "dob", "gender", "email", "phone", "created_at"], accent: "#10b981" },
  { name: "Medications", icon: "M", desc: "Prescribed medications & dosages", cols: ["m_id", "patient_id", "med_name", "dosage", "frequency", "start_date", "end_date", "prescribed_by"], accent: "#0ea5e9" },
];

const FLASK_URL = import.meta.env.VITE_API_URL || "https://medsql.onrender.com";

export default function App() {
  const [dark, setDark] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTable, setActiveTable] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [waitingForResults, setWaitingForResults] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const chatEndRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, resultData, waitingForResults]);

  const startPollingResults = () => {
    setWaitingForResults(true);
    setResultData(null);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${FLASK_URL}/get-results`);
        const data = await res.json();
        if (data && (data.columns?.length > 0 || data.error)) {
          setResultData(data);
          setWaitingForResults(false);
          clearInterval(pollRef.current);
        }
      } catch {
        setWaitingForResults(false);
        clearInterval(pollRef.current);
      }
    }, 1200);
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    if (!email.trim()) { alert("Please enter your email first."); return; }
    const userMsg = { role: "user", text: message, time: new Date().toLocaleTimeString() };
    setMessages(p => [...p, userMsg]);
    setLoading(true);
    setResultData(null);
    const sent = message;
    setMessage("");
    try {
      const res = await fetch(`${FLASK_URL}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: sent, email }),
      });
      const data = await res.json();
      setMessages(p => [...p, { role: "assistant", text: data.sql, time: new Date().toLocaleTimeString() }]);
      startPollingResults();
    } catch {
      setMessages(p => [...p, { role: "error", text: "Cannot connect to server.", time: new Date().toLocaleTimeString() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const downloadExcel = () => {
    if (!resultData || !resultData.rows?.length) return;
    const headers = resultData.columns.join("\t");
    const rows = resultData.rows.map(r => r.map(c => c || "").join("\t")).join("\n");
    const blob = new Blob([headers + "\n" + rows], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medsql_${new Date().toISOString().slice(0,10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const d = dark;
  const v = {
    bg:        d ? "#0d0f14" : "#f8f7f4",
    surface:   d ? "#161920" : "#ffffff",
    border:    d ? "rgba(255,255,255,0.08)" : "rgba(99,102,241,0.14)",
    text:      d ? "#e8eaf0" : "#1a1b2e",
    textSub:   d ? "rgba(232,234,240,0.45)" : "rgba(26,27,46,0.5)",
    textMuted: d ? "rgba(232,234,240,0.25)" : "rgba(26,27,46,0.32)",
    accent:    "#6366f1",
    gridLine:  d ? "rgba(99,102,241,0.055)" : "rgba(99,102,241,0.07)",
  };

  return (
    <div style={{ minHeight:"100dvh", fontFamily:"'DM Sans', sans-serif", color:v.text, display:"flex", flexDirection:"column", background:v.bg, position:"relative", overflow:"hidden" }}>
      <style>{styles(d, v)}</style>
      <div className="grid-bg" />
      <div className="blob blob1" />
      <div className="blob blob2" />
      <div className="blob blob3" />

      {/* HEADER */}
      <header style={{ position:"sticky", top:0, zIndex:200, height:58, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", background: d ? "rgba(13,15,20,0.92)" : "rgba(248,247,244,0.92)", backdropFilter:"blur(20px)", borderBottom:`1px solid ${v.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div className="logo-mark">
            <span style={{ fontSize:16, fontWeight:900, color:"#fff", fontFamily:"'Playfair Display', serif", fontStyle:"italic" }}>M</span>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700, letterSpacing:"-0.03em", fontFamily:"'Playfair Display', serif", lineHeight:1 }}>
              MedSQL<span style={{ color:v.accent }}>.</span><span style={{ color:"#f43f5e" }}>ai</span>
            </div>
            <div style={{ fontSize:9, letterSpacing:"0.22em", color:v.textMuted, fontFamily:"'DM Mono', monospace", marginTop:2 }}>CLINICAL INTELLIGENCE</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button className="schema-toggle" onClick={() => setShowSchema(!showSchema)}>
            {showSchema ? "✕" : "⊞"} Schema
          </button>
          <button className="theme-btn" onClick={() => setDark(!d)}>
            <span>{d ? "☀" : "☾"}</span>
            <span style={{ fontSize:10, fontFamily:"'DM Mono', monospace", letterSpacing:"0.08em" }}>{d ? "LIGHT" : "DARK"}</span>
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main style={{ display:"flex", flex:1, overflow:"hidden", maxHeight:"calc(100dvh - 58px)" }}>
        {showSchema && <div className="overlay" onClick={() => setShowSchema(false)} />}

        {/* SIDEBAR */}
        <aside className={`sidebar ${showSchema ? "sidebar-open" : ""}`} style={{ background: d ? "rgba(22,25,32,0.98)" : "rgba(255,255,255,0.98)", borderRight:`1px solid ${v.border}` }}>
          <div style={{ padding:"16px 16px 12px", borderBottom:`1px solid ${v.border}` }}>
            <div style={{ fontSize:9, letterSpacing:"0.3em", color:v.accent, fontFamily:"'DM Mono', monospace", marginBottom:4 }}>DATABASE SCHEMA</div>
            <div style={{ fontSize:11, color:v.textMuted, fontFamily:"'DM Mono', monospace" }}>{TABLES.length} tables · {TABLES.reduce((a,t)=>a+t.cols.length,0)} cols</div>
          </div>
          <div className="sidebar-inner">
            {TABLES.map((t) => (
              <div key={t.name} className="table-card" onClick={() => setActiveTable(activeTable === t.name ? null : t.name)}
                style={{ borderLeft: activeTable === t.name ? `3px solid ${t.accent}` : "3px solid transparent", background: activeTable === t.name ? `${t.accent}10` : "transparent" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 12px" }}>
                  <div style={{ width:32, height:32, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, fontFamily:"'DM Mono', monospace", flexShrink:0, background:`${t.accent}18`, color:t.accent, border:`1px solid ${t.accent}28` }}>{t.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, color: activeTable === t.name ? t.accent : v.text }}>{t.name}</div>
                    <div style={{ fontSize:10, color:v.textMuted, marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.desc}</div>
                  </div>
                  <div style={{ color:v.textMuted, fontSize:12, transition:"transform 0.2s", transform: activeTable === t.name ? "rotate(90deg)" : "none" }}>›</div>
                </div>
                {activeTable === t.name && (
                  <div style={{ padding:"0 12px 12px", display:"flex", flexWrap:"wrap", gap:4 }}>
                    {t.cols.map(c => (
                      <span key={c} style={{ fontSize:9, padding:"2px 7px", borderRadius:4, background:`${t.accent}12`, color:t.accent, fontFamily:"'DM Mono', monospace", border:`1px solid ${t.accent}22` }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ padding:"10px 16px", borderTop:`1px solid ${v.border}`, display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", boxShadow:"0 0 6px #10b981aa" }} />
            <span style={{ fontSize:9, color:v.textMuted, fontFamily:"'DM Mono', monospace", letterSpacing:"0.1em" }}>ORACLE DB CONNECTED</span>
          </div>
        </aside>

        {/* CHAT */}
        <section style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", padding:"14px 16px 14px" }}>
          {/* Email bar */}
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 14px", borderRadius:12, marginBottom:12, background: d ? "rgba(30,34,48,0.8)" : "#fff", border:`1px solid ${v.border}`, backdropFilter:"blur(12px)" }}>
            <div style={{ fontSize:9, letterSpacing:"0.2em", color:v.accent, fontFamily:"'DM Mono', monospace", flexShrink:0 }}>OPERATOR</div>
            <input type="email" placeholder="doctor@hospital.org" value={email} onChange={e => setEmail(e.target.value)}
              style={{ flex:1, background:"transparent", border:"none", outline:"none", color:v.text, fontSize:13, fontFamily:"'DM Sans', sans-serif", minWidth:0 }} />
            {email && <div style={{ width:7, height:7, borderRadius:"50%", background:"#10b981", boxShadow:"0 0 8px #10b981aa", flexShrink:0 }} />}
          </div>

          {/* Messages */}
          <div className="chat-scroll">
            {messages.length === 0 && !resultData && (
              <div className="empty-state">
                <div style={{ width:80, height:80, borderRadius:"50%", margin:"0 auto 20px", background: d ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.07)", border:"1.5px solid rgba(99,102,241,0.22)", display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  <div className="pulse-ring" />
                  <span style={{ fontSize:30, position:"relative", zIndex:1 }}>⚕</span>
                </div>
                <div style={{ fontSize:20, fontWeight:700, fontFamily:"'Playfair Display', serif", color:v.text, marginBottom:8 }}>Ask your clinical data</div>
                <div style={{ fontSize:13, color:v.textSub, lineHeight:1.9, maxWidth:280 }}>Natural language → SQL → Results.<br/>Powered by Oracle Autonomous DB.</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center", marginTop:20 }}>
                  {["Top glucose readings", "Heart risk patients", "Medication overview"].map(s => (
                    <button key={s} className="chip" onClick={() => setMessage(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`msg-row ${m.role === "user" ? "msg-right" : "msg-left"}`}>
                {m.role !== "user" && (
                  <div className="avatar-ai" style={{ background: m.role === "error" ? "#f43f5e18" : "#6366f118", color: m.role === "error" ? "#f43f5e" : v.accent, border:`1px solid ${m.role === "error" ? "#f43f5e28" : "#6366f128"}` }}>
                    {m.role === "error" ? "!" : "⌘"}
                  </div>
                )}
                <div style={{ maxWidth:"84%", minWidth:0 }}>
                  <div style={{ fontSize:9, color:v.textMuted, marginBottom:4, fontFamily:"'DM Mono', monospace", textAlign: m.role === "user" ? "right" : "left" }}>
                    {m.role === "user" ? (email || "YOU") : m.role === "error" ? "ERROR" : "SQL QUERY"} · {m.time}
                  </div>
                  <div style={{
                    padding:"11px 15px",
                    borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: m.role === "user" ? "linear-gradient(135deg, #6366f1, #818cf8)" : m.role === "error" ? (d ? "rgba(244,63,94,0.1)" : "rgba(244,63,94,0.06)") : (d ? "rgba(30,34,48,0.9)" : "#fff"),
                    border: m.role === "user" ? "none" : m.role === "error" ? "1px solid rgba(244,63,94,0.22)" : `1px solid ${v.border}`,
                    color: m.role === "user" ? "#fff" : m.role === "error" ? "#f43f5e" : v.text,
                    boxShadow: m.role === "user" ? "0 4px 18px rgba(99,102,241,0.35)" : d ? "0 2px 12px rgba(0,0,0,0.25)" : "0 2px 12px rgba(99,102,241,0.07)",
                  }}>
                    <pre style={{ margin:0, fontSize:12, lineHeight:1.8, whiteSpace:"pre-wrap", wordBreak:"break-word", fontFamily: m.role === "assistant" ? "'DM Mono', monospace" : "'DM Sans', sans-serif", fontWeight: m.role === "user" ? 500 : 400 }}>{m.text}</pre>
                  </div>
                </div>
                {m.role === "user" && (
                  <div className="avatar-user">{email ? email[0].toUpperCase() : "U"}</div>
                )}
              </div>
            ))}

            {loading && (
              <div className="msg-row msg-left">
                <div className="avatar-ai" style={{ background:"#6366f118", color:v.accent, border:"1px solid #6366f128" }}>⌘</div>
                <div>
                  <div style={{ fontSize:9, color:v.textMuted, marginBottom:4, fontFamily:"'DM Mono', monospace" }}>GENERATING SQL...</div>
                  <div style={{ padding:"12px 16px", borderRadius:"14px 14px 14px 4px", background: d ? "rgba(30,34,48,0.9)" : "#fff", border:`1px solid ${v.border}` }}>
                    <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                      {[0,1,2].map(i => <span key={i} className="dot" style={{ animationDelay:`${i*0.18}s`, background:v.accent }} />)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {waitingForResults && (
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:12, background: d ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.2)", animation:"slideUp 0.3s ease" }}>
                <div className="spin" style={{ borderColor:"rgba(245,158,11,0.2)", borderTopColor:"#f59e0b" }} />
                <span style={{ fontSize:12, color:"#f59e0b", fontFamily:"'DM Mono', monospace" }}>Executing on Oracle Autonomous DB...</span>
              </div>
            )}

            {resultData && !waitingForResults && (
              <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${v.border}`, background: d ? "rgba(22,25,32,0.95)" : "#fff", animation:"slideUp 0.35s ease", boxShadow: d ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(99,102,241,0.08)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:`1px solid ${v.border}`, background: d ? "rgba(99,102,241,0.05)" : "rgba(99,102,241,0.03)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background: resultData.error ? "#f43f5e" : "#10b981", boxShadow: `0 0 6px ${resultData.error ? "#f43f5e" : "#10b981"}` }} />
                    <span style={{ fontSize:11, fontFamily:"'DM Mono', monospace", color: resultData.error ? "#f43f5e" : "#10b981", letterSpacing:"0.08em" }}>
                      {resultData.error ? "QUERY FAILED" : `${resultData.rows?.length ?? 0} ROWS`}
                    </span>
                  </div>
                  {!resultData.error && resultData.rows?.length > 0 && (
                    <button className="export-btn" onClick={downloadExcel}>↓ Export</button>
                  )}
                </div>
                {resultData.error ? (
                  <div style={{ padding:"14px 16px", color:"#f43f5e", fontSize:12, fontFamily:"'DM Mono', monospace" }}>{resultData.error}</div>
                ) : resultData.rows?.length === 0 ? (
                  <div style={{ padding:"16px", color:v.textMuted, fontSize:13 }}>No rows returned.</div>
                ) : (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, fontFamily:"'DM Mono', monospace" }}>
                      <thead>
                        <tr style={{ background: d ? "rgba(99,102,241,0.05)" : "rgba(99,102,241,0.04)" }}>
                          <th style={{ padding:"9px 12px", textAlign:"center", fontSize:9, color:v.textMuted, borderBottom:`1px solid ${v.border}`, width:36 }}>#</th>
                          {resultData.columns.map(col => (
                            <th key={col} style={{ padding:"9px 14px", textAlign:"left", fontSize:9, letterSpacing:"0.1em", color:v.accent, fontWeight:600, borderBottom:`1px solid ${v.border}`, whiteSpace:"nowrap" }}>{col.toUpperCase()}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {resultData.rows.map((row, ri) => (
                          <tr key={ri} className="tbl-row">
                            <td style={{ padding:"8px 12px", textAlign:"center", color:v.textMuted, fontSize:10, borderBottom:`1px solid ${v.border}` }}>{ri+1}</td>
                            {row.map((cell, ci) => (
                              <td key={ci} style={{ padding:"8px 14px", color: cell ? v.text : v.textMuted, borderBottom:`1px solid ${v.border}`, whiteSpace:"nowrap" }}>{cell || "—"}</td>
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

          {/* Input box */}
          <div style={{ borderRadius:16, padding:"12px 14px", background: d ? "rgba(22,25,32,0.95)" : "#fff", border:`1px solid ${v.border}`, boxShadow: d ? "0 -4px 30px rgba(0,0,0,0.4)" : "0 -4px 30px rgba(99,102,241,0.07)", position:"relative", zIndex:1 }}>
            <textarea rows={2} placeholder="Ask anything about your patient data..." value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKey}
              style={{ width:"100%", background:"transparent", border:"none", outline:"none", resize:"none", color:v.text, fontSize:13, lineHeight:1.65, marginBottom:8, fontFamily:"'DM Sans', sans-serif" }} />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:10, color:v.textMuted, fontFamily:"'DM Mono', monospace" }}>↵ Send · ⇧↵ New line</span>
              <button className="send-btn" onClick={sendMessage} disabled={loading || waitingForResults}>
                {loading || waitingForResults ? <><div className="btn-spin" />Processing</> : <>Generate SQL <span style={{ fontSize:15 }}>⇥</span></>}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function styles(d, v) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    input, textarea, button { font-family: inherit; }
    textarea::placeholder, input::placeholder { color: ${v.textMuted}; }

    .grid-bg {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background-image: linear-gradient(${v.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${v.gridLine} 1px, transparent 1px);
      background-size: 44px 44px;
      mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 20%, transparent 100%);
    }

    .blob { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(90px); }
    .blob1 { width: 560px; height: 560px; top: -180px; left: -120px; background: ${d ? "rgba(99,102,241,0.13)" : "rgba(99,102,241,0.09)"}; animation: blobDrift 22s ease-in-out infinite; }
    .blob2 { width: 480px; height: 480px; bottom: -140px; right: -100px; background: ${d ? "rgba(244,63,94,0.1)" : "rgba(244,63,94,0.07)"}; animation: blobDrift 28s ease-in-out infinite reverse; }
    .blob3 { width: 380px; height: 380px; top: 45%; left: 45%; background: ${d ? "rgba(14,165,233,0.08)" : "rgba(14,165,233,0.06)"}; animation: blobDrift 20s ease-in-out infinite 6s; }
    @keyframes blobDrift { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(35px,-45px) scale(1.06); } 66% { transform: translate(-25px,35px) scale(0.95); } }

    .logo-mark {
      width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
      background: linear-gradient(135deg, #6366f1, #f43f5e);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(99,102,241,0.45);
    }

    .schema-toggle {
      display: none; padding: 6px 12px; border-radius: 8px;
      border: 1px solid ${v.border}; background: ${d ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.07)"};
      color: ${v.accent}; font-size: 11px; font-family: 'DM Mono', monospace; cursor: pointer;
      transition: all 0.2s; align-items: center; gap: 5px;
    }
    .schema-toggle:hover { background: rgba(99,102,241,0.15); }

    .theme-btn {
      display: flex; align-items: center; gap: 7px; padding: 6px 12px;
      border-radius: 8px; border: 1px solid ${v.border};
      background: ${d ? "rgba(255,255,255,0.05)" : "rgba(99,102,241,0.05)"};
      color: ${v.text}; cursor: pointer; font-size: 11px; transition: all 0.2s;
    }
    .theme-btn:hover { border-color: ${v.accent}; background: rgba(99,102,241,0.1); }

    .sidebar {
      width: 258px; min-width: 258px; display: flex; flex-direction: column;
      overflow: hidden; position: relative; z-index: 10;
      transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    .sidebar-inner { flex: 1; overflow-y: auto; padding: 6px 0; }
    .sidebar-inner::-webkit-scrollbar { width: 3px; }
    .sidebar-inner::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 3px; }

    .table-card { cursor: pointer; transition: all 0.2s; }
    .table-card:hover { background: ${d ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)"} !important; }

    .overlay { position: fixed; inset: 0; top: 58px; z-index: 9; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); }

    .chat-scroll {
      flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 14px;
      margin-bottom: 12px; padding-right: 4px; position: relative; z-index: 1;
    }
    .chat-scroll::-webkit-scrollbar { width: 3px; }
    .chat-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 3px; }

    .empty-state { margin: auto; text-align: center; padding: 32px 16px; animation: fadeUp 0.5s ease; }
    .pulse-ring {
      position: absolute; inset: -10px; border-radius: 50%;
      border: 1.5px solid rgba(99,102,241,0.18);
      animation: pulseRing 2.5s ease-in-out infinite;
    }
    @keyframes pulseRing { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.2; transform:scale(1.14); } }

    .chip {
      padding: 7px 14px; border-radius: 20px; font-size: 11px; cursor: pointer;
      background: ${d ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)"};
      border: 1px solid rgba(99,102,241,0.22); color: ${v.accent};
      font-family: 'DM Sans', sans-serif; font-weight: 500;
      transition: all 0.2s;
    }
    .chip:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(99,102,241,0.25); background: rgba(99,102,241,0.15); }

    .msg-row { display: flex; align-items: flex-start; gap: 10px; animation: slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1); }
    .msg-left { flex-direction: row; }
    .msg-right { flex-direction: row-reverse; }

    .avatar-ai {
      width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-family: 'DM Mono', monospace; margin-top: 18px;
    }
    .avatar-user {
      width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; margin-top: 18px;
      background: linear-gradient(135deg, #6366f1, #f43f5e);
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; color: #fff;
    }

    .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; animation: bounce 1.2s ease-in-out infinite; }
    @keyframes bounce { 0%,60%,100% { transform:translateY(0); opacity:0.35; } 30% { transform:translateY(-8px); opacity:1; } }

    .spin { width: 16px; height: 16px; border-radius: 50%; border: 2px solid; flex-shrink: 0; animation: spin 0.9s linear infinite; }
    .btn-spin { width: 13px; height: 13px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .tbl-row:hover td { background: ${d ? "rgba(99,102,241,0.05)" : "rgba(99,102,241,0.03)"}; }
    .tbl-row:last-child td { border-bottom: none !important; }

    .export-btn {
      padding: 5px 12px; border-radius: 7px; border: 1px solid rgba(99,102,241,0.22);
      background: rgba(99,102,241,0.08); color: ${v.accent}; font-size: 11px;
      font-family: 'DM Mono', monospace; cursor: pointer; transition: all 0.2s; letter-spacing: 0.05em;
    }
    .export-btn:hover { background: rgba(99,102,241,0.15); transform: translateY(-1px); }

    .send-btn {
      display: flex; align-items: center; gap: 8px; padding: 0 20px; height: 38px;
      border-radius: 10px; border: none; cursor: pointer; font-weight: 600; font-size: 13px;
      background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff;
      box-shadow: 0 4px 16px rgba(99,102,241,0.42); transition: all 0.25s;
      font-family: 'DM Sans', sans-serif;
    }
    .send-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 26px rgba(99,102,241,0.52); }
    .send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

    @keyframes slideUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

    @media (max-width: 700px) {
      .sidebar { position: fixed; top: 58px; left: 0; bottom: 0; transform: translateX(-100%); width: 82vw; max-width: 300px; min-width: unset; z-index: 100; }
      .sidebar-open { transform: translateX(0) !important; }
      .schema-toggle { display: flex !important; }
    }
    @media (min-width: 701px) {
      .sidebar { transform: none !important; position: relative !important; }
      .schema-toggle { display: none !important; }
    }
  `;
}