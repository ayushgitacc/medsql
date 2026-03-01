import { useState, useRef, useEffect } from "react";

const TABLES = [
  { name: "Glucose", icon: "◎", desc: "Patient glucose readings & monitoring", cols: ["g_id", "patient_id", "glucose_value", "reading_time", "device_id", "trend", "checkup_date"], color: "#00ffcc", glow: "rgba(0,255,204,0.5)" },
  { name: "Heart", icon: "◈", desc: "Heart disease diagnosis & risk factors", cols: ["h_id", "patient_id", "diagnosis_date", "severity", "cholesterol", "blood_pressure", "smoking_status", "treatment_plan", "record_date"], color: "#ff4488", glow: "rgba(255,68,136,0.5)" },
  { name: "Activity", icon: "◉", desc: "Glucose before & after exercise", cols: ["a_id", "patient_id", "activity_type", "duration_minutes", "calories_burned", "glucose_before", "glucose_after", "activity_date"], color: "#ffaa00", glow: "rgba(255,170,0,0.5)" },
  { name: "Patients", icon: "⬡", desc: "Master patient registry", cols: ["patient_id", "first_name", "last_name", "dob", "gender", "email", "phone", "created_at"], color: "#aa88ff", glow: "rgba(170,136,255,0.5)" },
  { name: "Medications", icon: "⬟", desc: "Prescribed medications & dosages", cols: ["m_id", "patient_id", "med_name", "dosage", "frequency", "start_date", "end_date", "prescribed_by"], color: "#44ccff", glow: "rgba(68,204,255,0.5)" },
];

const FLASK_URL = import.meta.env.VITE_API_URL || "https://medsql.onrender.com";

export default function App() {
  const [dark, setDark] = useState(true);
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
      setMessages(p => [...p, { role: "error", text: "Cannot connect to Flask server.", time: new Date().toLocaleTimeString() }]);
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
    const tsv = headers + "\n" + rows;
    const blob = new Blob([tsv], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medsql_report_${new Date().toISOString().slice(0,10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const d = dark;

  return (
    <div style={{
      minHeight: "100vh",
      minHeight: "100dvh",
      fontFamily: "'Syne', sans-serif",
      color: d ? "#e8f4ff" : "#060e1e",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
      background: d ? "#020b18" : "#ddeeff",
    }}>
      <style>{CSS(d)}</style>

      <div className="bg-animate" />
      <div className="noise" />
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />
      <div className="orb orb4" />

      {/* HEADER */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: d ? "rgba(2,11,24,0.85)" : "rgba(200,228,255,0.85)",
        backdropFilter: "blur(24px)",
        borderBottom: d ? "1px solid rgba(0,255,204,0.15)" : "1px solid rgba(0,80,160,0.3)",
        padding: "0 16px",
        height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28, lineHeight: 1, background: "linear-gradient(135deg, #00ffcc, #44ccff, #aa88ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>⬡</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
              MedSQL<span className="accent-text">.ai</span>
            </div>
            <div style={{ fontSize: 9, color: d ? "rgba(0,255,204,0.6)" : "rgba(0,60,140,0.7)", letterSpacing: "0.18em", marginTop: 1, fontFamily: "'Share Tech Mono', monospace" }}>
              CLINICAL INTELLIGENCE
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Schema toggle button — mobile */}
          <button onClick={() => setShowSchema(!showSchema)} className="schema-btn" style={{
            padding: "6px 12px", borderRadius: 10, border: d ? "1px solid rgba(0,255,204,0.25)" : "1px solid rgba(0,80,160,0.4)",
            background: d ? "rgba(0,255,204,0.08)" : "rgba(0,80,160,0.1)",
            color: d ? "#00ffcc" : "#003a8c", fontSize: 11, fontFamily: "'Share Tech Mono', monospace",
            cursor: "pointer", letterSpacing: "0.08em",
          }}>
            {showSchema ? "✕ SCHEMA" : "⬡ SCHEMA"}
          </button>

          {/* Theme toggle */}
          <div onClick={() => setDark(!d)} style={{
            width: 48, height: 26, borderRadius: 13, cursor: "pointer", position: "relative",
            background: d ? "linear-gradient(90deg, rgba(0,255,204,0.2), rgba(68,204,255,0.2))" : "linear-gradient(90deg, rgba(255,180,0,0.25), rgba(255,120,50,0.25))",
            border: d ? "1px solid rgba(0,255,204,0.35)" : "1px solid rgba(200,100,0,0.5)",
            transition: "all 0.4s ease", flexShrink: 0,
          }}>
            <div style={{
              position: "absolute", top: 2, left: d ? 24 : 2,
              width: 20, height: 20, borderRadius: "50%",
              background: d ? "linear-gradient(135deg, #00ffcc, #44ccff)" : "linear-gradient(135deg, #ffaa00, #ff6644)",
              boxShadow: d ? "0 0 12px rgba(0,255,204,0.8)" : "0 0 12px rgba(255,170,0,0.9)",
              transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10,
            }}>{d ? "🌙" : "☀️"}</div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main style={{ display: "flex", flex: 1, maxHeight: "calc(100dvh - 56px)", overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* SIDEBAR — overlay on mobile */}
        {showSchema && (
          <div className="sidebar-overlay" onClick={() => setShowSchema(false)} />
        )}
        <aside className={`sidebar ${showSchema ? "sidebar-open" : ""}`} style={{
          background: d ? "rgba(4,14,30,0.95)" : "rgba(195,220,255,0.97)",
          backdropFilter: "blur(20px)",
          borderRight: d ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,80,160,0.25)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ padding: "14px 14px 10px", borderBottom: d ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,80,160,0.2)" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.28em", color: d ? "rgba(0,255,204,0.5)" : "rgba(0,60,140,0.8)", fontFamily: "'Share Tech Mono', monospace", marginBottom: 3 }}>DATABASE SCHEMA</div>
            <div style={{ fontSize: 10, color: d ? "rgba(255,255,255,0.25)" : "rgba(0,30,80,0.55)", fontFamily: "'Share Tech Mono', monospace" }}>{TABLES.length} tables · {TABLES.reduce((a,t)=>a+t.cols.length,0)} columns</div>
          </div>

          <div className="sidebar-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
            {TABLES.map((t, i) => (
              <div key={t.name} className="table-card" onClick={() => setActiveTable(activeTable === t.name ? null : t.name)}
                style={{
                  marginBottom: 7, borderRadius: 12, overflow: "hidden", cursor: "pointer",
                  border: activeTable === t.name ? `1px solid ${t.color}66` : d ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,60,140,0.25)",
                  background: activeTable === t.name ? (d ? `rgba(4,20,36,0.95)` : "rgba(210,232,255,0.98)") : (d ? "rgba(6,18,34,0.6)" : "rgba(210,230,255,0.7)"),
                  boxShadow: activeTable === t.name ? `0 0 0 1px ${t.color}22, 0 8px 32px ${t.glow}22` : "none",
                  transition: "all 0.25s ease",
                }}>
                <div style={{ padding: "10px 11px", display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                    background: `linear-gradient(135deg, ${t.color}22, ${t.color}08)`,
                    border: `1px solid ${t.color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, color: t.color,
                    boxShadow: activeTable === t.name ? `0 0 16px ${t.glow}` : "none",
                    transition: "box-shadow 0.3s",
                  }}>{t.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: activeTable === t.name ? t.color : d ? "#e8f4ff" : "#051535", letterSpacing: "0.01em" }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: d ? "rgba(255,255,255,0.35)" : "rgba(0,30,80,0.55)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.desc}</div>
                  </div>
                  <div style={{ color: d ? "rgba(255,255,255,0.3)" : "rgba(0,30,80,0.4)", fontSize: 11, transform: activeTable === t.name ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }}>▾</div>
                </div>
                {activeTable === t.name && (
                  <div style={{ padding: "0 11px 11px", borderTop: `1px solid ${t.color}20` }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {t.cols.map(c => (
                        <span key={c} style={{ fontSize: 9, padding: "3px 7px", borderRadius: 5, background: `${t.color}15`, border: `1px solid ${t.color}35`, color: d ? t.color : t.color, fontFamily: "'Share Tech Mono', monospace" }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: "8px 14px", borderTop: d ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,80,160,0.15)", fontSize: 9, color: d ? "rgba(255,255,255,0.15)" : "rgba(0,30,80,0.4)", fontFamily: "'Share Tech Mono', monospace" }}>
            ORACLE XE · localhost:1521
          </div>
        </aside>

        {/* CHAT */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 12px 10px", overflow: "hidden" }}>

          {/* Email row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 14px", borderRadius: 12, background: d ? "rgba(4,14,30,0.7)" : "rgba(195,218,255,0.85)", backdropFilter: "blur(12px)", border: d ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,80,160,0.3)" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", color: d ? "rgba(0,255,204,0.55)" : "rgba(0,50,130,0.8)", fontFamily: "'Share Tech Mono', monospace", whiteSpace: "nowrap" }}>OPERATOR</div>
            <input className="glass-input" type="email" placeholder="you@hospital.org" value={email} onChange={e => setEmail(e.target.value)}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: d ? "#e8f4ff" : "#040e28", fontSize: 13, fontFamily: "'Syne', sans-serif" }} />
            {email && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ffcc", boxShadow: "0 0 10px rgba(0,255,204,0.8)", flexShrink: 0 }} />}
          </div>

          {/* Messages */}
          <div className="chat-scroll" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 12, paddingRight: 2 }}>

            {messages.length === 0 && !resultData && (
              <div style={{ margin: "auto", textAlign: "center", padding: 24 }}>
                <div className="empty-icon" style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: d ? "rgba(0,255,204,0.08)" : "rgba(0,80,160,0.1)", border: d ? "1px solid rgba(0,255,204,0.2)" : "1px solid rgba(0,80,160,0.35)" }}>◈</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: d ? "rgba(255,255,255,0.6)" : "rgba(0,20,70,0.7)" }}>Ready for your query</div>
                <div style={{ fontSize: 12, color: d ? "rgba(255,255,255,0.25)" : "rgba(0,20,70,0.5)", lineHeight: 1.8 }}>
                  Ask anything about your patient data.<br />SQL is auto-generated and executed.
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
                <div style={{ fontSize: 9, color: d ? "rgba(255,255,255,0.25)" : "rgba(0,20,70,0.45)", marginBottom: 4, textAlign: m.role === "user" ? "right" : "left", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em" }}>
                  {m.role === "user" ? (email || "YOU") : m.role === "error" ? "⚠ ERROR" : "◈ SQL"} · {m.time}
                </div>
                <div style={{
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "10px 14px",
                  backdropFilter: "blur(16px)",
                  background: m.role === "user"
                    ? d ? "linear-gradient(135deg, rgba(68,204,255,0.2), rgba(170,136,255,0.15))" : "linear-gradient(135deg, rgba(0,80,200,0.18), rgba(80,40,180,0.14))"
                    : m.role === "error"
                    ? d ? "rgba(255,40,80,0.12)" : "rgba(180,0,40,0.1)"
                    : d ? "rgba(0,255,204,0.07)" : "rgba(0,60,150,0.08)",
                  border: m.role === "user"
                    ? d ? "1px solid rgba(68,204,255,0.25)" : "1px solid rgba(0,80,200,0.4)"
                    : m.role === "error"
                    ? d ? "1px solid rgba(255,40,80,0.25)" : "1px solid rgba(180,0,40,0.35)"
                    : d ? "1px solid rgba(0,255,204,0.15)" : "1px solid rgba(0,60,150,0.3)",
                }}>
                  <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: m.role === "assistant" ? "'Share Tech Mono', monospace" : "'Syne', sans-serif", fontWeight: m.role === "user" ? 500 : 400, color: m.role === "user" ? (d ? "#c8e8ff" : "#020c30") : m.role === "error" ? (d ? "#ff4488" : "#aa0030") : (d ? "#00ffcc" : "#003a8c") }}>{m.text}</pre>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: "flex-start", animation: "slideUp 0.3s ease" }}>
                <div style={{ fontSize: 9, color: d ? "rgba(0,255,204,0.4)" : "rgba(0,60,150,0.55)", marginBottom: 4, fontFamily: "'Share Tech Mono', monospace" }}>◈ SQL · Generating...</div>
                <div style={{ borderRadius: "16px 16px 16px 4px", padding: "12px 18px", background: d ? "rgba(0,255,204,0.07)" : "rgba(0,60,150,0.08)", border: d ? "1px solid rgba(0,255,204,0.15)" : "1px solid rgba(0,60,150,0.3)", backdropFilter: "blur(16px)" }}>
                  <div className="wave-dots">
                    {[0,1,2,3,4].map(i => <div key={i} className="wave-dot" style={{ animationDelay: `${i*0.12}s`, background: d ? "#00ffcc" : "#0055cc" }} />)}
                  </div>
                </div>
              </div>
            )}

            {waitingForResults && (
              <div style={{ alignSelf: "stretch", animation: "slideUp 0.3s ease" }}>
                <div style={{ fontSize: 9, color: d ? "rgba(255,170,0,0.6)" : "rgba(140,70,0,0.75)", marginBottom: 4, fontFamily: "'Share Tech Mono', monospace" }}>⬡ ORACLE · Executing...</div>
                <div style={{ borderRadius: 14, padding: "12px 16px", background: d ? "rgba(255,170,0,0.06)" : "rgba(180,90,0,0.08)", border: d ? "1px solid rgba(255,170,0,0.18)" : "1px solid rgba(180,90,0,0.35)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div className="wave-dots">
                    {[0,1,2,3,4].map(i => <div key={i} className="wave-dot" style={{ animationDelay: `${i*0.12}s`, background: d ? "#ffaa00" : "#cc6600" }} />)}
                  </div>
                  <span style={{ fontSize: 11, color: d ? "rgba(255,170,0,0.7)" : "rgba(140,70,0,0.8)" }}>Running query on Oracle database...</span>
                </div>
              </div>
            )}

            {resultData && !waitingForResults && (
              <div style={{ alignSelf: "stretch", animation: "slideUp 0.3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: d ? "rgba(255,170,0,0.6)" : "rgba(140,70,0,0.75)", fontFamily: "'Share Tech Mono', monospace" }}>
                    ⬡ RESULTS · {resultData.rows?.length ?? 0} rows
                  </span>
                  {resultData.rows?.length > 0 && !resultData.error && (
                    <button onClick={downloadExcel} className="dl-btn" style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 7, border: d ? "1px solid rgba(0,255,204,0.3)" : "1px solid rgba(0,60,150,0.45)", background: d ? "rgba(0,255,204,0.08)" : "rgba(0,60,150,0.1)", color: d ? "#00ffcc" : "#003a8c", fontSize: 10, fontFamily: "'Share Tech Mono', monospace", cursor: "pointer", letterSpacing: "0.08em", transition: "all 0.2s ease" }}>
                      <span style={{ fontSize: 12 }}>⬇</span> EXPORT
                    </button>
                  )}
                </div>
                <div style={{ borderRadius: 14, overflow: "hidden", border: d ? "1px solid rgba(255,170,0,0.2)" : "1px solid rgba(180,90,0,0.35)", background: d ? "rgba(12,8,2,0.85)" : "rgba(215,235,255,0.92)", backdropFilter: "blur(16px)" }}>
                  {resultData.error ? (
                    <div style={{ padding: "14px 16px", color: d ? "#ff4488" : "#aa0030", fontSize: 12 }}>⚠ {resultData.error}</div>
                  ) : resultData.rows?.length === 0 ? (
                    <div style={{ padding: "14px 16px", color: d ? "rgba(255,255,255,0.3)" : "rgba(0,20,70,0.45)", fontSize: 12 }}>No rows returned.</div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'Share Tech Mono', monospace" }}>
                        <thead>
                          <tr style={{ background: d ? "rgba(255,170,0,0.08)" : "rgba(180,90,0,0.08)", borderBottom: d ? "1px solid rgba(255,170,0,0.2)" : "1px solid rgba(180,90,0,0.3)" }}>
                            <th style={{ padding: "8px 12px", textAlign: "center", fontSize: 8, letterSpacing: "0.2em", color: d ? "rgba(255,255,255,0.2)" : "rgba(0,20,70,0.4)", width: 32, borderRight: d ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,20,70,0.1)" }}>#</th>
                            {resultData.columns.map(col => (
                              <th key={col} style={{ padding: "8px 14px", textAlign: "left", fontSize: 9, letterSpacing: "0.12em", color: d ? "#ffaa00" : "#804000", borderRight: d ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,20,70,0.08)", whiteSpace: "nowrap", fontWeight: 700 }}>{col.toUpperCase()}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {resultData.rows.map((row, ri) => (
                            <tr key={ri} className="result-row" style={{ borderBottom: d ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(0,20,70,0.08)", background: ri%2===0 ? "transparent" : (d ? "rgba(255,255,255,0.015)" : "rgba(0,20,70,0.03)") }}>
                              <td style={{ padding: "7px 12px", textAlign: "center", color: d ? "rgba(255,255,255,0.15)" : "rgba(0,20,70,0.35)", fontSize: 9, borderRight: d ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,20,70,0.08)" }}>{ri+1}</td>
                              {row.map((cell, ci) => (
                                <td key={ci} style={{ padding: "7px 14px", color: cell ? (d ? "#d8eeff" : "#040e28") : (d ? "rgba(255,255,255,0.15)" : "rgba(0,20,70,0.3)"), fontSize: 11, borderRight: d ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(0,20,70,0.06)", whiteSpace: "nowrap" }}>{cell || "—"}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ borderRadius: 18, background: d ? "rgba(4,14,30,0.85)" : "rgba(195,218,255,0.88)", backdropFilter: "blur(20px)", border: d ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,80,160,0.35)", padding: "12px 14px", boxShadow: d ? "0 -4px 40px rgba(0,0,0,0.3)" : "0 -4px 24px rgba(0,60,160,0.1)" }}>
            <textarea className="chat-textarea" rows={2} placeholder="Ask about your patient data..." value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKey}
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", color: d ? "#e8f4ff" : "#040e28", fontSize: 13, fontFamily: "'Syne', sans-serif", lineHeight: 1.6, marginBottom: 8 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: d ? "rgba(255,255,255,0.2)" : "rgba(0,20,70,0.4)", fontFamily: "'Share Tech Mono', monospace" }}>↵ send · ⇧↵ newline</span>
              <button onClick={sendMessage} disabled={loading || waitingForResults} className="send-btn"
                style={{
                  height: 38, padding: "0 20px", borderRadius: 11, border: "none", cursor: "pointer",
                  background: loading || waitingForResults ? (d ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)") : "linear-gradient(135deg, #00ffcc, #44ccff)",
                  color: loading || waitingForResults ? (d ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)") : "#020b18",
                  fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13,
                  transition: "all 0.25s ease",
                  boxShadow: loading || waitingForResults ? "none" : "0 4px 20px rgba(0,255,204,0.4)",
                  display: "flex", alignItems: "center", gap: 7,
                }}>
                {loading || waitingForResults
                  ? <><div className="spin-ring" /><span>Processing</span></>
                  : <><span>Generate</span><span style={{ fontSize: 15 }}>→</span></>
                }
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function CSS(d) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Share+Tech+Mono&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .bg-animate {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background: ${d
        ? `radial-gradient(ellipse 80% 60% at 20% 20%, rgba(0,255,200,0.12) 0%, transparent 60%),
           radial-gradient(ellipse 60% 80% at 80% 10%, rgba(68,100,255,0.14) 0%, transparent 55%),
           radial-gradient(ellipse 70% 50% at 50% 90%, rgba(170,80,255,0.10) 0%, transparent 60%)`
        : `radial-gradient(ellipse 80% 60% at 20% 20%, rgba(0,140,255,0.18) 0%, transparent 60%),
           radial-gradient(ellipse 60% 80% at 80% 10%, rgba(0,80,220,0.14) 0%, transparent 55%),
           radial-gradient(ellipse 70% 50% at 50% 90%, rgba(80,40,200,0.10) 0%, transparent 60%)`
      };
      animation: gradShift 14s ease-in-out infinite alternate;
    }
    @keyframes gradShift {
      0%   { opacity: 1; transform: scale(1); }
      50%  { opacity: 0.85; transform: scale(1.04); }
      100% { opacity: 1; transform: scale(1.02); }
    }

    .noise {
      position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: ${d ? 0.022 : 0.015};
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-size: 180px;
    }

    .orb { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(70px); }
    .orb1 { width: 400px; height: 400px; top: -15%; left: -10%; background: ${d ? "rgba(0,255,200,0.09)" : "rgba(0,100,255,0.14)"}; animation: orbDrift 18s ease-in-out infinite; }
    .orb2 { width: 350px; height: 350px; top: 10%; right: -8%; background: ${d ? "rgba(80,100,255,0.11)" : "rgba(0,60,200,0.12)"}; animation: orbDrift 22s ease-in-out infinite reverse; }
    .orb3 { width: 300px; height: 300px; bottom: -10%; left: 30%; background: ${d ? "rgba(180,80,255,0.09)" : "rgba(60,20,180,0.09)"}; animation: orbDrift 26s ease-in-out infinite 4s; }
    .orb4 { width: 240px; height: 240px; bottom: 20%; right: 20%; background: ${d ? "rgba(255,60,120,0.07)" : "rgba(0,40,160,0.08)"}; animation: orbDrift 20s ease-in-out infinite reverse 8s; }
    @keyframes orbDrift {
      0%,100% { transform: translate(0,0) scale(1); }
      25%  { transform: translate(40px,-30px) scale(1.08); }
      50%  { transform: translate(-20px,50px) scale(0.94); }
      75%  { transform: translate(30px,20px) scale(1.04); }
    }

    .accent-text { background: linear-gradient(90deg, #00ffcc, #44ccff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

    /* Sidebar — desktop: fixed width; mobile: overlay drawer */
    .sidebar {
      width: 252px;
      min-width: 252px;
      flex-shrink: 0;
      transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
    }
    .sidebar-overlay {
      display: none;
    }

    @media (max-width: 640px) {
      .sidebar {
        position: fixed;
        top: 56px;
        left: 0;
        bottom: 0;
        width: 80vw;
        max-width: 300px;
        min-width: unset;
        z-index: 200;
        transform: translateX(-100%);
      }
      .sidebar-open {
        transform: translateX(0) !important;
      }
      .sidebar-overlay {
        display: block;
        position: fixed;
        inset: 0;
        top: 56px;
        z-index: 199;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(2px);
      }
      .schema-btn {
        display: flex !important;
      }
    }

    @media (min-width: 641px) {
      .sidebar {
        transform: none !important;
        position: relative !important;
      }
      .schema-btn {
        display: none !important;
      }
    }

    .sidebar-scroll::-webkit-scrollbar, .chat-scroll::-webkit-scrollbar { width: 3px; }
    .sidebar-scroll::-webkit-scrollbar-track, .chat-scroll::-webkit-scrollbar-track { background: transparent; }
    .sidebar-scroll::-webkit-scrollbar-thumb, .chat-scroll::-webkit-scrollbar-thumb { background: ${d ? "rgba(0,255,204,0.2)" : "rgba(0,80,180,0.3)"}; border-radius: 3px; }

    .table-card:hover { border-color: ${d ? "rgba(255,255,255,0.18)" : "rgba(0,60,160,0.45)"} !important; transform: translateX(3px); }

    .chat-textarea::placeholder { color: ${d ? "rgba(255,255,255,0.2)" : "rgba(0,20,70,0.35)"}; }
    .glass-input::placeholder { color: ${d ? "rgba(255,255,255,0.2)" : "rgba(0,20,70,0.35)"}; }

    .empty-icon { animation: emptyPulse 3s ease-in-out infinite; }
    @keyframes emptyPulse {
      0%,100% { box-shadow: 0 0 20px ${d ? "rgba(0,255,204,0.15)" : "rgba(0,80,180,0.2)"}; }
      50% { box-shadow: 0 0 40px ${d ? "rgba(0,255,204,0.35)" : "rgba(0,80,180,0.4)"}; }
    }

    .wave-dots { display: flex; align-items: center; gap: 5px; }
    .wave-dot { width: 7px; height: 7px; border-radius: 50%; animation: waveDot 1s ease-in-out infinite; }
    @keyframes waveDot {
      0%,100% { transform: translateY(0); opacity: 0.4; }
      50% { transform: translateY(-7px); opacity: 1; }
    }

    .send-btn:hover:not(:disabled) { transform: translateY(-1px) scale(1.03); box-shadow: 0 8px 32px rgba(0,255,204,0.5) !important; }
    .send-btn:disabled { cursor: not-allowed; }

    .spin-ring { width: 13px; height: 13px; border-radius: 50%; border: 2px solid ${d ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}; border-top-color: ${d ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)"}; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .dl-btn:hover { background: ${d ? "rgba(0,255,204,0.15)" : "rgba(0,60,150,0.18)"} !important; transform: translateY(-1px); }
    .result-row:hover td { background: ${d ? "rgba(255,170,0,0.05)" : "rgba(0,40,120,0.05)"} !important; }
    .result-row:last-child td { border-bottom: none; }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(14px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `;
}