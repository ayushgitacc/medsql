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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const chatEndRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, resultData, waitingForResults]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setDrawerOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

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

  const SidebarContent = ({ onClose }) => (
    <>
      <div style={{
        padding: "18px 16px 12px",
        borderBottom: d ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(15,25,50,0.15)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.28em", color: d ? "rgba(0,255,204,0.6)" : "rgba(0,80,160,0.7)", fontFamily: "'Roboto Mono', monospace", marginBottom: 4, fontWeight: 900 }}>DATABASE SCHEMA</div>
          <div style={{ fontSize: 11, color: d ? "rgba(255,255,255,0.3)" : "rgba(15,25,50,0.45)", fontFamily: "'Roboto Mono', monospace" }}>{TABLES.length} tables · {TABLES.reduce((a,t)=>a+t.cols.length,0)} columns</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: d ? "rgba(255,255,255,0.5)" : "rgba(15,25,50,0.5)", fontSize: 22, lineHeight: 1, padding: "4px 8px", borderRadius: 8, transition: "all 0.2s" }} className="drawer-close-btn">✕</button>
        )}
      </div>

      <div className="sidebar-scroll" style={{ flex: 1, overflowY: "auto", padding: "12px 10px", minHeight: 0 }}>
        {TABLES.map((t, i) => (
          <div key={t.name} className="table-card" onClick={() => setActiveTable(activeTable === t.name ? null : t.name)}
            style={{
              marginBottom: 8, borderRadius: 14, overflow: "hidden", cursor: "pointer",
              border: activeTable === t.name ? `1.5px solid ${t.color}66` : d ? "1px solid rgba(255,255,255,0.09)" : "1.5px solid rgba(15,25,50,0.14)",
              background: activeTable === t.name
                ? (d ? `rgba(4,20,36,0.95)` : "rgba(255,255,255,0.97)")
                : (d ? "rgba(6,18,34,0.6)" : "rgba(255,255,255,0.72)"),
              boxShadow: activeTable === t.name
                ? `0 0 0 1px ${t.color}22, 0 8px 32px ${t.glow}22`
                : d ? "none" : "0 2px 10px rgba(15,25,50,0.07)",
              transition: "all 0.25s ease",
            }}>
            <div style={{ padding: "11px 13px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                background: `linear-gradient(135deg, ${t.color}22, ${t.color}08)`,
                border: `1.5px solid ${t.color}44`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: t.color,
                boxShadow: activeTable === t.name ? `0 0 16px ${t.glow}` : "none",
                transition: "box-shadow 0.3s",
              }}>{t.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: activeTable === t.name ? t.color : d ? "#e8f4ff" : "#0d1f3c", letterSpacing: "0.01em", fontFamily: "'Roboto', sans-serif" }}>{t.name}</div>
                <div style={{ fontSize: 10, color: d ? "rgba(255,255,255,0.35)" : "rgba(15,25,50,0.45)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Roboto', sans-serif" }}>{t.desc}</div>
              </div>
              <div style={{ color: d ? "rgba(255,255,255,0.25)" : "rgba(15,25,50,0.35)", fontSize: 11, transform: activeTable === t.name ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }}>▾</div>
            </div>
            {activeTable === t.name && (
              <div style={{ padding: "0 13px 13px", borderTop: `1px solid ${t.color}18` }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                  {t.cols.map(c => (
                    <span key={c} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 6, background: `${t.color}14`, border: `1.5px solid ${t.color}38`, color: t.color, fontFamily: "'Roboto Mono', monospace" }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: "10px 16px", borderTop: d ? "1px solid rgba(255,255,255,0.07)" : "1.5px solid rgba(15,25,50,0.1)", fontSize: 10, color: d ? "rgba(255,255,255,0.2)" : "rgba(15,25,50,0.4)", fontFamily: "'Roboto Mono', monospace", flexShrink: 0 }}>
        ORACLE XE · localhost:1521
      </div>
    </>
  );

  return (
    <div style={{
      height: "100dvh",
      width: "100vw",
      fontFamily: "'Roboto', sans-serif",
      color: d ? "#e8f4ff" : "#0d1f3c",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden",
      background: d ? "#020b18" : "#eef3fb",
    }}>
      <style>{CSS(d)}</style>

      {/* Background layers */}
      <div className="bg-animate" />
      <div className="noise" />
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />
      <div className="orb orb4" />

      {/* Mobile drawer overlay */}
      <div
        onClick={() => setDrawerOpen(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Mobile drawer */}
      <aside
        style={{
          position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 201,
          width: 288,
          background: d ? "rgba(4,14,30,0.98)" : "rgba(238,243,251,0.98)",
          backdropFilter: "blur(24px)",
          borderRight: d ? "1px solid rgba(0,255,204,0.15)" : "2px solid rgba(15,25,50,0.18)",
          display: "flex", flexDirection: "column",
          transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.35s cubic-bezier(0.34,1.2,0.64,1)",
          boxShadow: drawerOpen ? (d ? "8px 0 60px rgba(0,255,204,0.12)" : "8px 0 40px rgba(15,25,50,0.18)") : "none",
        }}
        className="mobile-drawer"
      >
        <SidebarContent onClose={() => setDrawerOpen(false)} />
      </aside>

      {/* ── HEADER ── */}
      <header style={{
        zIndex: 100,
        background: d ? "rgba(2,11,24,0.75)" : "rgba(238,243,251,0.85)",
        backdropFilter: "blur(24px)",
        borderBottom: d ? "1px solid rgba(0,255,204,0.1)" : "2px solid rgba(15,25,50,0.14)",
        padding: "0 20px",
        height: 58,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
        boxShadow: d ? "none" : "0 2px 16px rgba(15,25,50,0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Mobile schema trigger */}
          <button
            className="schema-trigger"
            onClick={() => setDrawerOpen(true)}
            title="View Database Schema"
            style={{
              display: "none",
              alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 10,
              border: d ? "1px solid rgba(0,255,204,0.25)" : "1.5px solid rgba(15,25,50,0.2)",
              cursor: "pointer",
              background: d ? "rgba(0,255,204,0.08)" : "rgba(15,25,50,0.06)",
              color: d ? "#00ffcc" : "#0d1f3c",
              fontSize: 16, flexShrink: 0,
              transition: "all 0.2s",
              marginRight: 2,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><rect x="1" y="2" width="16" height="4" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="7" width="16" height="4" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="12" width="16" height="4" rx="2" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>

          <span style={{ fontSize: 30, lineHeight: 1, background: "linear-gradient(135deg, #00ffcc, #44ccff, #aa88ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>⬡</span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, fontFamily: "'Roboto', sans-serif", color: d ? "#e8f4ff" : "#0d1f3c" }}>
              MedSQL<span className="accent-text">.ai</span>
            </div>
            <div style={{ fontSize: 9, color: d ? "rgba(0,255,204,0.6)" : "rgba(0,80,160,0.65)", letterSpacing: "0.2em", marginTop: 2, fontFamily: "'Roboto Mono', monospace", fontWeight: 500 }} className="header-subtitle">
              CLINICAL INTELLIGENCE
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 10, color: d ? "rgba(255,255,255,0.35)" : "rgba(15,25,50,0.45)", fontFamily: "'Roboto Mono', monospace", letterSpacing: "0.1em" }} className="theme-label">
            {d ? "DARK" : "LIGHT"}
          </span>
          <div onClick={() => setDark(!d)} style={{
            width: 52, height: 27, borderRadius: 14, cursor: "pointer", position: "relative",
            background: d ? "linear-gradient(90deg, rgba(0,255,204,0.2), rgba(68,204,255,0.2))" : "linear-gradient(90deg, rgba(255,180,0,0.18), rgba(255,120,50,0.18))",
            border: d ? "1px solid rgba(0,255,204,0.3)" : "1.5px solid rgba(15,25,50,0.25)",
            transition: "all 0.4s ease",
          }}>
            <div style={{
              position: "absolute", top: 3, left: d ? 27 : 3,
              width: 19, height: 19, borderRadius: "50%",
              background: d ? "linear-gradient(135deg, #00ffcc, #44ccff)" : "linear-gradient(135deg, #ffaa00, #ff6644)",
              boxShadow: d ? "0 0 12px rgba(0,255,204,0.8)" : "0 0 12px rgba(255,170,0,0.8)",
              transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10,
            }}>{d ? "🌙" : "☀️"}</div>
          </div>
        </div>
      </header>

      {/* ── MAIN (fills remaining height) ── */}
      <main style={{
        display: "flex",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Desktop Sidebar */}
        <aside
          className="desktop-sidebar"
          style={{
            width: 268, minWidth: 240,
            background: d ? "rgba(4,14,30,0.75)" : "rgba(238,243,251,0.82)",
            backdropFilter: "blur(20px)",
            borderRight: d ? "1px solid rgba(255,255,255,0.07)" : "2px solid rgba(15,25,50,0.13)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
          <SidebarContent onClose={null} />
        </aside>

        {/* ── CHAT SECTION ── */}
        <section style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "14px 20px 14px",
          overflow: "hidden",
          minWidth: 0,
        }} className="chat-section">

          {/* Email row */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            marginBottom: 12, padding: "9px 14px",
            borderRadius: 12,
            background: d ? "rgba(4,14,30,0.65)" : "rgba(255,255,255,0.8)",
            backdropFilter: "blur(12px)",
            border: d ? "1px solid rgba(255,255,255,0.08)" : "1.5px solid rgba(15,25,50,0.15)",
            boxShadow: d ? "none" : "0 2px 12px rgba(15,25,50,0.07)",
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 9, letterSpacing: "0.22em", color: d ? "rgba(0,255,204,0.55)" : "rgba(0,60,140,0.65)", fontFamily: "'Roboto Mono', monospace", whiteSpace: "nowrap", fontWeight: 600 }}>OPERATOR</div>
            <input className="glass-input" type="email" placeholder="you@hospital.org" value={email} onChange={e => setEmail(e.target.value)}
              style={{ flex: 1, maxWidth: 280, background: "transparent", border: "none", outline: "none", color: d ? "#e8f4ff" : "#0d1f3c", fontSize: 13, fontFamily: "'Roboto', sans-serif" }} />
            {email && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00ffcc", boxShadow: "0 0 10px rgba(0,255,204,0.8)", flexShrink: 0 }} />}
          </div>

          {/* Messages — flex-grow, scrollable */}
          <div className="chat-scroll" style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 12,
            paddingRight: 2,
            minHeight: 0,
          }}>
            {messages.length === 0 && !resultData && (
              <div style={{ margin: "auto", textAlign: "center", padding: 24 }}>
                <div className="empty-icon" style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, background: d ? "rgba(0,255,204,0.08)" : "rgba(0,100,200,0.07)", border: d ? "1px solid rgba(0,255,204,0.2)" : "1.5px solid rgba(0,100,200,0.18)" }}>◈</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: d ? "rgba(255,255,255,0.55)" : "rgba(15,25,50,0.55)", fontFamily: "'Roboto', sans-serif" }}>Ready for your query</div>
                <div style={{ fontSize: 12, color: d ? "rgba(255,255,255,0.25)" : "rgba(15,25,50,0.38)", lineHeight: 1.8, fontFamily: "'Roboto', sans-serif" }}>
                  Ask anything about your patient data.<br />SQL is auto-generated and executed.
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%", animation: "slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
                <div style={{ fontSize: 9, color: d ? "rgba(255,255,255,0.25)" : "rgba(15,25,50,0.4)", marginBottom: 4, textAlign: m.role === "user" ? "right" : "left", fontFamily: "'Roboto Mono', monospace", letterSpacing: "0.08em" }}>
                  {m.role === "user" ? (email || "YOU") : m.role === "error" ? "⚠ ERROR" : "◈ SQL"} · {m.time}
                </div>
                <div style={{
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "11px 15px",
                  backdropFilter: "blur(16px)",
                  background: m.role === "user"
                    ? d ? "linear-gradient(135deg, rgba(68,204,255,0.2), rgba(170,136,255,0.15))"
                        : "linear-gradient(135deg, rgba(0,80,200,0.1), rgba(100,60,200,0.08))"
                    : m.role === "error"
                    ? d ? "rgba(255,40,80,0.12)" : "rgba(200,0,50,0.07)"
                    : d ? "rgba(0,255,204,0.07)" : "rgba(255,255,255,0.88)",
                  border: m.role === "user"
                    ? d ? "1px solid rgba(68,204,255,0.25)" : "1.5px solid rgba(0,80,200,0.2)"
                    : m.role === "error"
                    ? "1.5px solid rgba(255,40,80,0.28)"
                    : d ? "1px solid rgba(0,255,204,0.15)" : "1.5px solid rgba(15,25,50,0.14)",
                  boxShadow: m.role !== "user"
                    ? d ? "0 4px 20px rgba(0,255,204,0.07)" : "0 4px 18px rgba(15,25,50,0.09)"
                    : "none",
                }}>
                  <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: m.role === "assistant" ? "'Roboto Mono', monospace" : "'Roboto', sans-serif", fontWeight: m.role === "user" ? 500 : 400, color: m.role === "user" ? (d ? "#c8e8ff" : "#0d1f3c") : m.role === "error" ? "#ff4488" : (d ? "#00ffcc" : "#074fa3") }}>{m.text}</pre>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: "flex-start", animation: "slideUp 0.3s ease" }}>
                <div style={{ fontSize: 9, color: d ? "rgba(0,255,204,0.45)" : "rgba(0,80,160,0.55)", marginBottom: 4, fontFamily: "'Roboto Mono', monospace" }}>◈ SQL · Generating...</div>
                <div style={{ borderRadius: "16px 16px 16px 4px", padding: "13px 18px", background: d ? "rgba(0,255,204,0.07)" : "rgba(255,255,255,0.85)", border: d ? "1px solid rgba(0,255,204,0.15)" : "1.5px solid rgba(15,25,50,0.13)", backdropFilter: "blur(16px)", boxShadow: d ? "none" : "0 4px 16px rgba(15,25,50,0.08)" }}>
                  <div className="wave-dots">
                    {[0,1,2,3,4].map(i => <div key={i} className="wave-dot" style={{ animationDelay: `${i*0.12}s`, background: d ? "#00ffcc" : "#0066cc" }} />)}
                  </div>
                </div>
              </div>
            )}

            {waitingForResults && (
              <div style={{ alignSelf: "stretch", animation: "slideUp 0.3s ease" }}>
                <div style={{ fontSize: 9, color: d ? "rgba(255,170,0,0.65)" : "rgba(150,80,0,0.65)", marginBottom: 4, fontFamily: "'Roboto Mono', monospace" }}>⬡ ORACLE · Executing...</div>
                <div style={{ borderRadius: 14, padding: "13px 18px", background: d ? "rgba(255,170,0,0.06)" : "rgba(255,248,235,0.95)", border: d ? "1px solid rgba(255,170,0,0.18)" : "1.5px solid rgba(180,100,0,0.2)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", gap: 14, boxShadow: d ? "none" : "0 4px 16px rgba(180,100,0,0.07)" }}>
                  <div className="wave-dots">
                    {[0,1,2,3,4].map(i => <div key={i} className="wave-dot" style={{ animationDelay: `${i*0.12}s`, background: d ? "#ffaa00" : "#cc7700" }} />)}
                  </div>
                  <span style={{ fontSize: 12, color: d ? "rgba(255,170,0,0.75)" : "rgba(150,80,0,0.75)", fontFamily: "'Roboto', sans-serif" }}>Running query on Oracle database...</span>
                </div>
              </div>
            )}

            {resultData && !waitingForResults && (
              <div style={{ alignSelf: "stretch", animation: "slideUp 0.3s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 9, color: d ? "rgba(255,170,0,0.65)" : "rgba(150,80,0,0.65)", fontFamily: "'Roboto Mono', monospace", fontWeight: 600 }}>
                    ⬡ RESULTS · {resultData.rows?.length ?? 0} rows
                  </span>
                  {resultData.rows?.length > 0 && !resultData.error && (
                    <button onClick={downloadExcel} className="dl-btn" style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 8, border: d ? "1px solid rgba(0,255,204,0.3)" : "1.5px solid rgba(15,25,50,0.22)", background: d ? "rgba(0,255,204,0.08)" : "rgba(255,255,255,0.9)", color: d ? "#00ffcc" : "#0d1f3c", fontSize: 10, fontFamily: "'Roboto Mono', monospace", cursor: "pointer", letterSpacing: "0.08em", transition: "all 0.2s ease", boxShadow: d ? "none" : "0 2px 8px rgba(15,25,50,0.08)", fontWeight: 600 }}>
                      <span style={{ fontSize: 13 }}>⬇</span> EXPORT
                    </button>
                  )}
                </div>
                <div style={{ borderRadius: 14, overflow: "hidden", border: d ? "1px solid rgba(255,170,0,0.2)" : "1.5px solid rgba(15,25,50,0.15)", background: d ? "rgba(12,8,2,0.82)" : "rgba(255,255,255,0.94)", backdropFilter: "blur(16px)", boxShadow: d ? "0 8px 40px rgba(255,170,0,0.07)" : "0 6px 28px rgba(15,25,50,0.1)" }}>
                  {resultData.error ? (
                    <div style={{ padding: "14px 18px", color: "#ff4488", fontSize: 13, fontFamily: "'Roboto', sans-serif" }}>⚠ {resultData.error}</div>
                  ) : resultData.rows?.length === 0 ? (
                    <div style={{ padding: "14px 18px", color: d ? "rgba(255,255,255,0.3)" : "rgba(15,25,50,0.4)", fontSize: 13, fontFamily: "'Roboto', sans-serif" }}>No rows returned.</div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Roboto Mono', monospace" }}>
                        <thead>
                          <tr style={{ background: d ? "rgba(255,170,0,0.08)" : "rgba(15,25,50,0.05)", borderBottom: d ? "1px solid rgba(255,170,0,0.2)" : "1.5px solid rgba(15,25,50,0.13)" }}>
                            <th style={{ padding: "9px 13px", textAlign: "center", fontSize: 9, letterSpacing: "0.2em", color: d ? "rgba(255,255,255,0.2)" : "rgba(15,25,50,0.35)", width: 36, borderRight: d ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(15,25,50,0.07)" }}>#</th>
                            {resultData.columns.map(col => (
                              <th key={col} style={{ padding: "9px 15px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", color: d ? "#ffaa00" : "#0d1f3c", borderRight: d ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(15,25,50,0.06)", whiteSpace: "nowrap", fontWeight: 700 }}>{col.toUpperCase()}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {resultData.rows.map((row, ri) => (
                            <tr key={ri} className="result-row" style={{ borderBottom: d ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(15,25,50,0.06)", background: ri%2===0 ? "transparent" : (d ? "rgba(255,255,255,0.015)" : "rgba(15,25,50,0.025)") }}>
                              <td style={{ padding: "7px 13px", textAlign: "center", color: d ? "rgba(255,255,255,0.18)" : "rgba(15,25,50,0.3)", fontSize: 10, borderRight: d ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(15,25,50,0.06)" }}>{ri+1}</td>
                              {row.map((cell, ci) => (
                                <td key={ci} style={{ padding: "7px 15px", color: cell ? (d ? "#d8eeff" : "#0d1f3c") : (d ? "rgba(255,255,255,0.15)" : "rgba(15,25,50,0.3)"), fontSize: 12, borderRight: d ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(15,25,50,0.05)", whiteSpace: "nowrap" }}>{cell || "—"}</td>
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

          {/* ── INPUT BAR (fixed at bottom) ── */}
          <div style={{
            borderRadius: 18,
            background: d ? "rgba(4,14,30,0.8)" : "rgba(255,255,255,0.9)",
            backdropFilter: "blur(20px)",
            border: d ? "1px solid rgba(255,255,255,0.09)" : "1.5px solid rgba(15,25,50,0.16)",
            padding: "12px 14px",
            boxShadow: d ? "0 -4px 40px rgba(0,0,0,0.3)" : "0 -2px 24px rgba(15,25,50,0.1), 0 0 0 1px rgba(255,255,255,0.6) inset",
            flexShrink: 0,
          }}>
            <textarea className="chat-textarea" rows={2} placeholder="Ask about your patient data... e.g. Show top 10 patients with high cholesterol" value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKey}
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", color: d ? "#e8f4ff" : "#0d1f3c", fontSize: 14, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6, marginBottom: 8 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: d ? "rgba(255,255,255,0.2)" : "rgba(15,25,50,0.35)", fontFamily: "'Roboto Mono', monospace" }} className="enter-hint">↵ Enter · ⇧ Shift+Enter newline</span>
              <button onClick={sendMessage} disabled={loading || waitingForResults} className="send-btn"
                style={{
                  height: 38, padding: "0 20px", borderRadius: 11, border: "none", cursor: "pointer",
                  background: loading || waitingForResults
                    ? (d ? "rgba(255,255,255,0.06)" : "rgba(15,25,50,0.07)")
                    : "linear-gradient(135deg, #00ffcc, #44ccff)",
                  color: loading || waitingForResults ? (d ? "rgba(255,255,255,0.3)" : "rgba(15,25,50,0.35)") : "#020b18",
                  fontFamily: "'Roboto', sans-serif", fontWeight: 700, fontSize: 13,
                  transition: "all 0.25s ease",
                  boxShadow: loading || waitingForResults ? "none" : "0 4px 20px rgba(0,255,204,0.4)",
                  display: "flex", alignItems: "center", gap: 7,
                  flexShrink: 0,
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
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Roboto+Mono:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body { height: 100%; overflow: hidden; }

    /* ── Animated gradient background ── */
    .bg-animate {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background: ${d
        ? `radial-gradient(ellipse 80% 60% at 20% 20%, rgba(0,255,200,0.11) 0%, transparent 60%),
           radial-gradient(ellipse 60% 80% at 80% 10%, rgba(68,100,255,0.13) 0%, transparent 55%),
           radial-gradient(ellipse 70% 50% at 50% 90%, rgba(170,80,255,0.09) 0%, transparent 60%),
           radial-gradient(ellipse 50% 60% at 90% 70%, rgba(255,60,120,0.07) 0%, transparent 55%)`
        : `radial-gradient(ellipse 90% 70% at 10% 10%, rgba(200,225,255,0.9) 0%, transparent 55%),
           radial-gradient(ellipse 70% 60% at 85% 15%, rgba(200,215,255,0.7) 0%, transparent 50%),
           radial-gradient(ellipse 60% 70% at 60% 85%, rgba(210,230,255,0.6) 0%, transparent 55%),
           radial-gradient(ellipse 50% 50% at 5% 80%, rgba(220,240,255,0.5) 0%, transparent 50%)`
      };
      animation: gradShift 14s ease-in-out infinite alternate;
    }
    @keyframes gradShift {
      0%   { opacity: 1; transform: scale(1) rotate(0deg); }
      50%  { opacity: 0.88; transform: scale(1.05) rotate(0.8deg); }
      100% { opacity: 1; transform: scale(1.02) rotate(-0.4deg); }
    }

    /* ── Noise texture ── */
    .noise {
      position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: ${d ? 0.022 : 0.018};
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-size: 180px;
    }

    /* ── Floating orbs ── */
    .orb { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; filter: blur(70px); }
    .orb1 { width: 480px; height: 480px; top: -15%; left: -10%; background: ${d ? "rgba(0,255,200,0.08)" : "rgba(150,200,255,0.45)"}; animation: orbDrift 18s ease-in-out infinite; }
    .orb2 { width: 400px; height: 400px; top: 10%; right: -8%; background: ${d ? "rgba(80,100,255,0.1)" : "rgba(180,200,255,0.38)"}; animation: orbDrift 22s ease-in-out infinite reverse; }
    .orb3 { width: 340px; height: 340px; bottom: -10%; left: 30%; background: ${d ? "rgba(180,80,255,0.08)" : "rgba(200,215,255,0.3)"}; animation: orbDrift 26s ease-in-out infinite 4s; }
    .orb4 { width: 260px; height: 260px; bottom: 20%; right: 20%; background: ${d ? "rgba(255,60,120,0.06)" : "rgba(190,210,255,0.28)"}; animation: orbDrift 20s ease-in-out infinite reverse 8s; }
    @keyframes orbDrift {
      0%,100% { transform: translate(0,0) scale(1); }
      25%  { transform: translate(40px,-30px) scale(1.08); }
      50%  { transform: translate(-20px,50px) scale(0.94); }
      75%  { transform: translate(30px,20px) scale(1.04); }
    }

    /* ── Accent text ── */
    .accent-text { background: linear-gradient(90deg, #00ffcc, #44ccff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }

    /* ── Scrollbars ── */
    .sidebar-scroll::-webkit-scrollbar, .chat-scroll::-webkit-scrollbar { width: 3px; }
    .sidebar-scroll::-webkit-scrollbar-track, .chat-scroll::-webkit-scrollbar-track { background: transparent; }
    .sidebar-scroll::-webkit-scrollbar-thumb, .chat-scroll::-webkit-scrollbar-thumb {
      background: ${d ? "rgba(0,255,204,0.22)" : "rgba(15,25,50,0.2)"};
      border-radius: 3px;
    }

    /* ── Table card hover ── */
    .table-card:hover { border-color: ${d ? "rgba(255,255,255,0.16)" : "rgba(15,25,50,0.24)"} !important; transform: translateX(3px); }

    /* ── Textarea placeholder ── */
    .chat-textarea::placeholder { color: ${d ? "rgba(255,255,255,0.2)" : "rgba(15,25,50,0.28)"}; }

    /* ── Email input placeholder ── */
    .glass-input::placeholder { color: ${d ? "rgba(255,255,255,0.2)" : "rgba(15,25,50,0.3)"}; }

    /* ── Empty icon pulse ── */
    .empty-icon { animation: emptyPulse 3s ease-in-out infinite; }
    @keyframes emptyPulse {
      0%,100% { box-shadow: 0 0 20px ${d ? "rgba(0,255,204,0.15)" : "rgba(0,100,200,0.12)"}; }
      50%      { box-shadow: 0 0 40px ${d ? "rgba(0,255,204,0.35)" : "rgba(0,100,200,0.28)"}; }
    }

    /* ── Wave dots ── */
    .wave-dots { display: flex; align-items: center; gap: 5px; }
    .wave-dot { width: 7px; height: 7px; border-radius: 50%; animation: waveDot 1s ease-in-out infinite; }
    @keyframes waveDot {
      0%,100% { transform: translateY(0); opacity: 0.4; }
      50%      { transform: translateY(-7px); opacity: 1; }
    }

    /* ── Send button ── */
    .send-btn:hover:not(:disabled) { transform: translateY(-1px) scale(1.03); box-shadow: 0 8px 28px rgba(0,255,204,0.5) !important; }
    .send-btn:disabled { cursor: not-allowed; }

    /* ── Spin ring ── */
    .spin-ring { width: 13px; height: 13px; border-radius: 50%; border: 2px solid ${d ? "rgba(255,255,255,0.15)" : "rgba(15,25,50,0.15)"}; border-top-color: ${d ? "rgba(255,255,255,0.5)" : "rgba(15,25,50,0.5)"}; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Results ── */
    .dl-btn:hover { background: ${d ? "rgba(0,255,204,0.14)" : "rgba(15,25,50,0.07)"} !important; transform: translateY(-1px); }
    .result-row:hover td { background: ${d ? "rgba(255,170,0,0.05)" : "rgba(15,25,50,0.04)"} !important; }
    .result-row:last-child td { border-bottom: none; }

    /* ── Drawer close btn ── */
    .drawer-close-btn:hover { background: ${d ? "rgba(255,255,255,0.08)" : "rgba(15,25,50,0.06)"} !important; color: ${d ? "#fff" : "#0d1f3c"} !important; }

    /* ── Schema trigger hover ── */
    .schema-trigger:hover { background: ${d ? "rgba(0,255,204,0.15)" : "rgba(15,25,50,0.1)"} !important; }

    /* ── Slide-up animation ── */
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ════════════════════════════════
       RESPONSIVE — mobile
    ════════════════════════════════ */
    @media (max-width: 767px) {
      .desktop-sidebar { display: none !important; }
      .schema-trigger  { display: flex !important; }
      .header-subtitle { display: none; }
      .theme-label     { display: none; }
      .chat-section    { padding: 10px 10px 10px !important; }
      .enter-hint      { display: none; }
    }

    @media (max-width: 400px) {
      .chat-section { padding: 6px 6px 6px !important; }
    }
  `;
}