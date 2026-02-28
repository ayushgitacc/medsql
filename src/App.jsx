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
      setMessages(p => [...p, { role: "error", text: "Cannot connect to Flask server on port 5000.", time: new Date().toLocaleTimeString() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };


  // ▼ Download results as Excel (CSV-based .xls that Excel opens natively)
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
      fontFamily: "'Syne', sans-serif",
      color: d ? "#e8f4ff" : "#0a1628",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
      background: d ? "#020b18" : "#f0f7ff",
    }}>
      <style>{CSS(d)}</style>

      {/* Animated gradient background */}
      <div className="bg-animate" />

      {/* Noise texture */}
      <div className="noise" />

      {/* Floating orbs */}
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />
      <div className="orb orb4" />

      {/* HEADER */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: d ? "rgba(2,11,24,0.7)" : "rgba(240,247,255,0.7)",
        backdropFilter: "blur(24px)",
        borderBottom: d ? "1px solid rgba(0,255,204,0.1)" : "1px solid rgba(0,150,200,0.15)",
        padding: "0 28px",
        height: 62,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Logo mark */}
          <span style={{ fontSize: 34, lineHeight: 1, background: "linear-gradient(135deg, #00ffcc, #44ccff, #aa88ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>⬡</span>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>
              MedSQL<span className="accent-text">.ai</span>
            </div>
            <div style={{ fontSize: 10, color: d ? "rgba(0,255,204,0.6)" : "rgba(0,130,180,0.7)", letterSpacing: "0.18em", marginTop: 2, fontFamily: "'Share Tech Mono', monospace" }}>
              CLINICAL INTELLIGENCE PLATFORM
            </div>
          </div>
        </div>

        {/* Theme toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: d ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.1em" }}>
            {d ? "DARK" : "LIGHT"}
          </span>
          <div onClick={() => setDark(!d)} style={{
            width: 54, height: 28, borderRadius: 14, cursor: "pointer", position: "relative",
            background: d ? "linear-gradient(90deg, rgba(0,255,204,0.2), rgba(68,204,255,0.2))" : "linear-gradient(90deg, rgba(255,180,0,0.2), rgba(255,120,50,0.2))",
            border: d ? "1px solid rgba(0,255,204,0.3)" : "1px solid rgba(255,150,0,0.3)",
            transition: "all 0.4s ease",
          }}>
            <div style={{
              position: "absolute", top: 3, left: d ? 28 : 3,
              width: 20, height: 20, borderRadius: "50%",
              background: d ? "linear-gradient(135deg, #00ffcc, #44ccff)" : "linear-gradient(135deg, #ffaa00, #ff6644)",
              boxShadow: d ? "0 0 12px rgba(0,255,204,0.8)" : "0 0 12px rgba(255,170,0,0.8)",
              transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10,
            }}>{d ? "🌙" : "☀️"}</div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main style={{ display: "flex", flex: 1, maxHeight: "calc(100vh - 62px)", overflow: "hidden", position: "relative", zIndex: 1 }}>

        {/* SIDEBAR */}
        <aside style={{
          width: 272, minWidth: 252,
          background: d ? "rgba(4,14,30,0.75)" : "rgba(255,255,255,0.65)",
          backdropFilter: "blur(20px)",
          borderRight: d ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.07)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          <div style={{ padding: "18px 16px 12px", borderBottom: d ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.28em", color: d ? "rgba(0,255,204,0.5)" : "rgba(0,120,180,0.6)", fontFamily: "'Share Tech Mono', monospace", marginBottom: 4 }}>DATABASE SCHEMA</div>
            <div style={{ fontSize: 11, color: d ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)", fontFamily: "'Share Tech Mono', monospace" }}>{TABLES.length} tables · {TABLES.reduce((a,t)=>a+t.cols.length,0)} columns</div>
          </div>

          <div className="sidebar-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 10px" }}>
            {TABLES.map((t, i) => (
              <div key={t.name} className="table-card" onClick={() => setActiveTable(activeTable === t.name ? null : t.name)}
                style={{
                  marginBottom: 8, borderRadius: 14, overflow: "hidden", cursor: "pointer",
                  border: activeTable === t.name ? `1px solid ${t.color}55` : d ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.07)",
                  background: activeTable === t.name ? (d ? `rgba(4,20,36,0.95)` : "rgba(255,255,255,0.95)") : (d ? "rgba(6,18,34,0.6)" : "rgba(255,255,255,0.6)"),
                  boxShadow: activeTable === t.name ? `0 0 0 1px ${t.color}22, 0 8px 32px ${t.glow}22` : "none",
                  transition: "all 0.25s ease",
                  animationDelay: `${i * 0.06}s`,
                }}>
                <div style={{ padding: "11px 13px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${t.color}22, ${t.color}08)`,
                    border: `1px solid ${t.color}33`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: t.color,
                    boxShadow: activeTable === t.name ? `0 0 16px ${t.glow}` : "none",
                    transition: "box-shadow 0.3s",
                  }}>{t.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: activeTable === t.name ? t.color : d ? "#e8f4ff" : "#0a1628", letterSpacing: "0.01em" }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: d ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.desc}</div>
                  </div>
                  <div style={{ color: d ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)", fontSize: 11, transform: activeTable === t.name ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }}>▾</div>
                </div>
                {activeTable === t.name && (
                  <div style={{ padding: "0 13px 13px", borderTop: `1px solid ${t.color}15` }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                      {t.cols.map(c => (
                        <span key={c} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: `${t.color}12`, border: `1px solid ${t.color}30`, color: t.color, fontFamily: "'Share Tech Mono', monospace" }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: "10px 16px", borderTop: d ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)", fontSize: 10, color: d ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)", fontFamily: "'Share Tech Mono', monospace" }}>
            ORACLE XE · localhost:1521
          </div>
        </aside>

        {/* CHAT */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column", padding: "18px 24px 16px", overflow: "hidden" }}>

          {/* Email row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "10px 16px", borderRadius: 14, background: d ? "rgba(4,14,30,0.6)" : "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)", border: d ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", color: d ? "rgba(0,255,204,0.5)" : "rgba(0,120,180,0.6)", fontFamily: "'Share Tech Mono', monospace", whiteSpace: "nowrap" }}>OPERATOR</div>
            <input className="glass-input" type="email" placeholder="you@hospital.org" value={email} onChange={e => setEmail(e.target.value)}
              style={{ flex: 1, maxWidth: 280, background: "transparent", border: "none", outline: "none", color: d ? "#e8f4ff" : "#0a1628", fontSize: 13, fontFamily: "'Syne', sans-serif" }} />
            {email && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00ffcc", boxShadow: "0 0 10px rgba(0,255,204,0.8)", flexShrink: 0 }} />}
          </div>

          {/* Messages */}
          <div className="chat-scroll" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, marginBottom: 16, paddingRight: 4 }}>

            {messages.length === 0 && !resultData && (
              <div style={{ margin: "auto", textAlign: "center", padding: 32 }}>
                <div className="empty-icon" style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, background: d ? "rgba(0,255,204,0.08)" : "rgba(0,150,200,0.08)", border: d ? "1px solid rgba(0,255,204,0.2)" : "1px solid rgba(0,150,200,0.2)" }}>◈</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: d ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }}>Ready for your query</div>
                <div style={{ fontSize: 13, color: d ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)", lineHeight: 1.8 }}>
                  Ask anything about your patient data.<br />SQL is auto-generated and executed.
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%", animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
                <div style={{ fontSize: 10, color: d ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.3)", marginBottom: 5, textAlign: m.role === "user" ? "right" : "left", fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.08em" }}>
                  {m.role === "user" ? (email || "YOU") : m.role === "error" ? "⚠ ERROR" : "◈ SQL"} · {m.time}
                </div>
                <div style={{
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding: "12px 16px",
                  backdropFilter: "blur(16px)",
                  background: m.role === "user"
                    ? d ? "linear-gradient(135deg, rgba(68,204,255,0.2), rgba(170,136,255,0.15))" : "linear-gradient(135deg, rgba(0,120,220,0.12), rgba(120,80,220,0.1))"
                    : m.role === "error"
                    ? d ? "rgba(255,40,80,0.12)" : "rgba(220,0,60,0.08)"
                    : d ? "rgba(0,255,204,0.07)" : "rgba(0,150,180,0.07)",
                  border: m.role === "user"
                    ? d ? "1px solid rgba(68,204,255,0.25)" : "1px solid rgba(0,120,220,0.2)"
                    : m.role === "error"
                    ? "1px solid rgba(255,40,80,0.25)"
                    : d ? "1px solid rgba(0,255,204,0.15)" : "1px solid rgba(0,150,180,0.15)",
                  boxShadow: m.role === "assistant" ? (d ? "0 4px 24px rgba(0,255,204,0.08)" : "0 4px 24px rgba(0,150,180,0.08)") : "none",
                }}>
                  <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: m.role === "assistant" ? "'Share Tech Mono', monospace" : "'Syne', sans-serif", fontWeight: m.role === "user" ? 500 : 400, color: m.role === "user" ? (d ? "#c8e8ff" : "#0a3060") : m.role === "error" ? "#ff4488" : (d ? "#00ffcc" : "#007aaa") }}>{m.text}</pre>
                </div>
              </div>
            ))}

            {/* Generating */}
            {loading && (
              <div style={{ alignSelf: "flex-start", animation: "slideUp 0.3s ease" }}>
                <div style={{ fontSize: 10, color: d ? "rgba(0,255,204,0.4)" : "rgba(0,150,180,0.5)", marginBottom: 5, fontFamily: "'Share Tech Mono', monospace" }}>◈ SQL · Generating...</div>
                <div style={{ borderRadius: "18px 18px 18px 4px", padding: "14px 20px", background: d ? "rgba(0,255,204,0.07)" : "rgba(0,150,180,0.07)", border: d ? "1px solid rgba(0,255,204,0.15)" : "1px solid rgba(0,150,180,0.15)", backdropFilter: "blur(16px)" }}>
                  <div className="wave-dots">
                    {[0,1,2,3,4].map(i => <div key={i} className="wave-dot" style={{ animationDelay: `${i*0.12}s`, background: d ? "#00ffcc" : "#0099cc" }} />)}
                  </div>
                </div>
              </div>
            )}

            {/* Executing */}
            {waitingForResults && (
              <div style={{ alignSelf: "stretch", animation: "slideUp 0.3s ease" }}>
                <div style={{ fontSize: 10, color: d ? "rgba(255,170,0,0.6)" : "rgba(180,100,0,0.6)", marginBottom: 5, fontFamily: "'Share Tech Mono', monospace" }}>⬡ ORACLE · Executing...</div>
                <div style={{ borderRadius: 16, padding: "14px 20px", background: d ? "rgba(255,170,0,0.06)" : "rgba(200,120,0,0.06)", border: d ? "1px solid rgba(255,170,0,0.18)" : "1px solid rgba(200,120,0,0.18)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", gap: 14 }}>
                  <div className="wave-dots">
                    {[0,1,2,3,4].map(i => <div key={i} className="wave-dot" style={{ animationDelay: `${i*0.12}s`, background: d ? "#ffaa00" : "#cc7700" }} />)}
                  </div>
                  <span style={{ fontSize: 12, color: d ? "rgba(255,170,0,0.7)" : "rgba(180,100,0,0.7)" }}>Running query on Oracle database...</span>
                </div>
              </div>
            )}

            {/* Results */}
            {resultData && !waitingForResults && (
              <div style={{ alignSelf: "stretch", animation: "slideUp 0.3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: d ? "rgba(255,170,0,0.6)" : "rgba(180,100,0,0.6)", fontFamily: "'Share Tech Mono', monospace" }}>
                    ⬡ RESULTS · {resultData.rows?.length ?? 0} rows
                  </span>
                  {resultData.rows?.length > 0 && !resultData.error && (
                    <button onClick={downloadExcel} className="dl-btn" style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, border: d ? "1px solid rgba(0,255,204,0.3)" : "1px solid rgba(0,150,180,0.3)", background: d ? "rgba(0,255,204,0.08)" : "rgba(0,150,180,0.08)", color: d ? "#00ffcc" : "#007aaa", fontSize: 11, fontFamily: "'Share Tech Mono', monospace", cursor: "pointer", letterSpacing: "0.08em", transition: "all 0.2s ease" }}>
                      <span style={{ fontSize: 13 }}>⬇</span> EXPORT EXCEL
                    </button>
                  )}
                </div>
                <div style={{ borderRadius: 16, overflow: "hidden", border: d ? "1px solid rgba(255,170,0,0.2)" : "1px solid rgba(200,120,0,0.18)", background: d ? "rgba(12,8,2,0.8)" : "rgba(255,252,240,0.85)", backdropFilter: "blur(16px)", boxShadow: d ? "0 8px 40px rgba(255,170,0,0.08)" : "0 8px 40px rgba(200,120,0,0.06)" }}>
                  {resultData.error ? (
                    <div style={{ padding: "16px 20px", color: "#ff4488", fontSize: 13 }}>⚠ {resultData.error}</div>
                  ) : resultData.rows?.length === 0 ? (
                    <div style={{ padding: "16px 20px", color: d ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", fontSize: 13 }}>No rows returned.</div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Share Tech Mono', monospace" }}>
                        <thead>
                          <tr style={{ background: d ? "rgba(255,170,0,0.08)" : "rgba(200,120,0,0.06)", borderBottom: d ? "1px solid rgba(255,170,0,0.2)" : "1px solid rgba(200,120,0,0.15)" }}>
                            <th style={{ padding: "9px 14px", textAlign: "center", fontSize: 9, letterSpacing: "0.2em", color: d ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)", width: 38, borderRight: d ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)" }}>#</th>
                            {resultData.columns.map(col => (
                              <th key={col} style={{ padding: "9px 16px", textAlign: "left", fontSize: 10, letterSpacing: "0.12em", color: d ? "#ffaa00" : "#996600", borderRight: d ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.04)", whiteSpace: "nowrap", fontWeight: 700 }}>{col.toUpperCase()}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {resultData.rows.map((row, ri) => (
                            <tr key={ri} className="result-row" style={{ borderBottom: d ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(0,0,0,0.04)", background: ri%2===0 ? "transparent" : (d ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.015)") }}>
                              <td style={{ padding: "8px 14px", textAlign: "center", color: d ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)", fontSize: 10, borderRight: d ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.04)" }}>{ri+1}</td>
                              {row.map((cell, ci) => (
                                <td key={ci} style={{ padding: "8px 16px", color: cell ? (d ? "#d8eeff" : "#0a2040") : (d ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.2)"), fontSize: 12, borderRight: d ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(0,0,0,0.03)", whiteSpace: "nowrap" }}>{cell || "—"}</td>
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
          <div style={{ borderRadius: 20, background: d ? "rgba(4,14,30,0.75)" : "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", border: d ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)", padding: "14px 16px", boxShadow: d ? "0 -4px 40px rgba(0,0,0,0.3)" : "0 -4px 40px rgba(0,0,0,0.06)" }}>
            <textarea className="chat-textarea" rows={2} placeholder="Ask about your patient data... e.g. Show top 10 patients with high cholesterol" value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKey}
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", color: d ? "#e8f4ff" : "#0a1628", fontSize: 14, fontFamily: "'Syne', sans-serif", lineHeight: 1.6, marginBottom: 10 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: d ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)", fontFamily: "'Share Tech Mono', monospace" }}>↵ Enter to send · ⇧ Shift+Enter for newline</span>
              <button onClick={sendMessage} disabled={loading || waitingForResults} className="send-btn"
                style={{
                  height: 40, padding: "0 22px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: loading || waitingForResults ? (d ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)") : "linear-gradient(135deg, #00ffcc, #44ccff)",
                  color: loading || waitingForResults ? (d ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)") : "#020b18",
                  fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13,
                  transition: "all 0.25s ease",
                  boxShadow: loading || waitingForResults ? "none" : "0 4px 20px rgba(0,255,204,0.4)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                {loading || waitingForResults
                  ? <><div className="spin-ring" /><span>Processing</span></>
                  : <><span>Generate</span><span style={{ fontSize: 16 }}>→</span></>
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

    /* ── Animated gradient background ── */
    .bg-animate {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background: ${d
        ? `radial-gradient(ellipse 80% 60% at 20% 20%, rgba(0,255,200,0.12) 0%, transparent 60%),
           radial-gradient(ellipse 60% 80% at 80% 10%, rgba(68,100,255,0.14) 0%, transparent 55%),
           radial-gradient(ellipse 70% 50% at 50% 90%, rgba(170,80,255,0.10) 0%, transparent 60%),
           radial-gradient(ellipse 50% 60% at 90% 70%, rgba(255,60,120,0.08) 0%, transparent 55%)`
        : `radial-gradient(ellipse 80% 60% at 20% 20%, rgba(0,200,180,0.15) 0%, transparent 60%),
           radial-gradient(ellipse 60% 80% at 80% 10%, rgba(0,100,255,0.10) 0%, transparent 55%),
           radial-gradient(ellipse 70% 50% at 50% 90%, rgba(120,60,255,0.08) 0%, transparent 60%)`
      };
      animation: gradShift 14s ease-in-out infinite alternate;
    }
    @keyframes gradShift {
      0%   { opacity: 1; transform: scale(1)   rotate(0deg); }
      33%  { opacity: 0.85; transform: scale(1.06) rotate(1deg); }
      66%  { opacity: 0.95; transform: scale(0.97) rotate(-0.5deg); }
      100% { opacity: 1; transform: scale(1.03) rotate(0.5deg); }
    }

    /* ── Noise ── */
    .noise {
      position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: ${d ? 0.022 : 0.012};
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-size: 180px;
    }

    /* ── Floating orbs ── */
    .orb { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(70px); }
    .orb1 { width: 500px; height: 500px; top: -15%; left: -10%; background: ${d ? "rgba(0,255,200,0.09)" : "rgba(0,200,180,0.12)"}; animation: orbDrift 18s ease-in-out infinite; }
    .orb2 { width: 420px; height: 420px; top: 10%; right: -8%; background: ${d ? "rgba(80,100,255,0.11)" : "rgba(0,80,220,0.09)"}; animation: orbDrift 22s ease-in-out infinite reverse; }
    .orb3 { width: 360px; height: 360px; bottom: -10%; left: 30%; background: ${d ? "rgba(180,80,255,0.09)" : "rgba(120,60,200,0.07)"}; animation: orbDrift 26s ease-in-out infinite 4s; }
    .orb4 { width: 280px; height: 280px; bottom: 20%; right: 20%; background: ${d ? "rgba(255,60,120,0.07)" : "rgba(200,0,80,0.05)"}; animation: orbDrift 20s ease-in-out infinite reverse 8s; }
    @keyframes orbDrift {
      0%,100% { transform: translate(0,0) scale(1); }
      25%  { transform: translate(40px,-30px) scale(1.08); }
      50%  { transform: translate(-20px,50px) scale(0.94); }
      75%  { transform: translate(30px,20px) scale(1.04); }
    }

    /* ── Logo ── */
    .accent-text { background: linear-gradient(90deg, #00ffcc, #44ccff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

    /* ── Scrollbars ── */
    .sidebar-scroll::-webkit-scrollbar, .chat-scroll::-webkit-scrollbar { width: 3px; }
    .sidebar-scroll::-webkit-scrollbar-track, .chat-scroll::-webkit-scrollbar-track { background: transparent; }
    .sidebar-scroll::-webkit-scrollbar-thumb, .chat-scroll::-webkit-scrollbar-thumb { background: ${d ? "rgba(0,255,204,0.2)" : "rgba(0,150,200,0.25)"}; border-radius: 3px; }

    /* ── Table card ── */
    .table-card:hover { border-color: rgba(255,255,255,0.15) !important; transform: translateX(3px); }

    /* ── Chat ── */
    .chat-textarea::placeholder { color: ${d ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.25)"}; }

    /* ── Empty icon pulse ── */
    .empty-icon { animation: emptyPulse 3s ease-in-out infinite; }
    @keyframes emptyPulse {
      0%,100% { box-shadow: 0 0 20px ${d ? "rgba(0,255,204,0.15)" : "rgba(0,150,200,0.15)"}; }
      50% { box-shadow: 0 0 40px ${d ? "rgba(0,255,204,0.35)" : "rgba(0,150,200,0.3)"}; }
    }

    /* ── Wave dots loader ── */
    .wave-dots { display: flex; align-items: center; gap: 5px; }
    .wave-dot { width: 7px; height: 7px; border-radius: 50%; animation: waveDot 1s ease-in-out infinite; }
    @keyframes waveDot {
      0%,100% { transform: translateY(0); opacity: 0.4; }
      50% { transform: translateY(-7px); opacity: 1; }
    }

    /* ── Send button ── */
    .send-btn:hover:not(:disabled) { transform: translateY(-1px) scale(1.03); box-shadow: 0 8px 32px rgba(0,255,204,0.5) !important; }
    .send-btn:disabled { cursor: not-allowed; }

    /* ── Spin ring ── */
    .spin-ring { width: 14px; height: 14px; border-radius: 50%; border: 2px solid ${d ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}; border-top-color: ${d ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Results table ── */
    .dl-btn:hover { background: rgba(0,255,204,0.15) !important; box-shadow: 0 0 14px rgba(0,255,204,0.25); transform: translateY(-1px); }
    .result-row:hover td { background: ${d ? "rgba(255,170,0,0.05)" : "rgba(200,120,0,0.04)"} !important; }
    .result-row:last-child td { border-bottom: none; }

    /* ── Animations ── */
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(14px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
}