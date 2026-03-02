import { useState, useRef, useEffect } from "react";

const TABLES = [
  { name: "Glucose",     icon: "◎", desc: "Patient glucose readings & monitoring",       cols: ["g_id","patient_id","glucose_value","reading_time","device_id","trend","checkup_date"],                                         color: "#00ffcc", glow: "rgba(0,255,204,0.5)"   },
  { name: "Heart",       icon: "◈", desc: "Heart disease diagnosis & risk factors",       cols: ["h_id","patient_id","diagnosis_date","severity","cholesterol","blood_pressure","smoking_status","treatment_plan","record_date"], color: "#ff4488", glow: "rgba(255,68,136,0.5)"  },
  { name: "Activity",    icon: "◉", desc: "Glucose before & after exercise",              cols: ["a_id","patient_id","activity_type","duration_minutes","calories_burned","glucose_before","glucose_after","activity_date"],      color: "#ffaa00", glow: "rgba(255,170,0,0.5)"   },
  { name: "Patients",    icon: "⬡", desc: "Master patient registry",                      cols: ["patient_id","first_name","last_name","dob","gender","email","phone","created_at"],                                             color: "#aa88ff", glow: "rgba(170,136,255,0.5)" },
  { name: "Medications", icon: "⬟", desc: "Prescribed medications & dosages",             cols: ["m_id","patient_id","med_name","dosage","frequency","start_date","end_date","prescribed_by"],                                   color: "#44ccff", glow: "rgba(68,204,255,0.5)"  },
];

const FLASK_URL = import.meta.env.VITE_API_URL || "https://medsql.onrender.com";

/**
 * Oracle SQL sanitiser — rewrites MySQL / generic SQL to Oracle-compatible syntax.
 *
 *  LIMIT n           →  FETCH FIRST n ROWS ONLY
 *  LIMIT n OFFSET m  →  OFFSET m ROWS FETCH NEXT n ROWS ONLY
 *  ISNULL(x,y)       →  NVL(x,y)
 *  IFNULL(x,y)       →  NVL(x,y)
 *  `backtick` idents →  "double-quoted" idents
 *  trailing ;        →  removed  (Oracle JDBC does not want it)
 */
function toOracleSQL(sql) {
  if (!sql || typeof sql !== "string") return sql;
  let s = sql.trim().replace(/;\s*$/, "");

  // LIMIT n OFFSET m
  s = s.replace(/\bLIMIT\s+(\d+)\s+OFFSET\s+(\d+)\b/gi,
    (_, lim, off) => `OFFSET ${off} ROWS FETCH NEXT ${lim} ROWS ONLY`);

  // LIMIT n
  s = s.replace(/\bLIMIT\s+(\d+)\b/gi,
    (_, n) => `FETCH FIRST ${n} ROWS ONLY`);

  // ISNULL / IFNULL → NVL
  s = s.replace(/\bIS(?:NULL|NULL)\s*\(/gi, "NVL(");
  s = s.replace(/\bIFNULL\s*\(/gi,          "NVL(");

  // backtick → double-quote
  s = s.replace(/`([^`]+)`/g, '"$1"');

  return s;
}

export default function App() {
  const [dark,              setDark]              = useState(true);
  const [email,             setEmail]             = useState("");
  const [message,           setMessage]           = useState("");
  const [messages,          setMessages]          = useState([]);
  const [loading,           setLoading]           = useState(false);
  const [activeTable,       setActiveTable]       = useState(null);
  const [resultData,        setResultData]        = useState(null);
  const [waitingForResults, setWaitingForResults] = useState(false);
  const [drawerOpen,        setDrawerOpen]        = useState(false);
  const chatEndRef = useRef(null);
  const pollRef    = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); },
    [messages, resultData, waitingForResults]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setDrawerOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const startPolling = () => {
    setWaitingForResults(true);
    setResultData(null);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`${FLASK_URL}/get-results`);
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
      const res  = await fetch(`${FLASK_URL}/send-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: sent, email }),
      });
      const data    = await res.json();
      const cleaned = toOracleSQL(data.sql);          // ← sanitise here
      setMessages(p => [...p, { role: "assistant", text: cleaned, time: new Date().toLocaleTimeString() }]);
      startPolling();
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
    if (!resultData?.rows?.length) return;
    const tsv  = [resultData.columns.join("\t"), ...resultData.rows.map(r => r.map(c => c ?? "").join("\t"))].join("\n");
    const blob = new Blob([tsv], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: `medsql_${new Date().toISOString().slice(0,10)}.xls` }).click();
    URL.revokeObjectURL(url);
  };

  const d = dark;

  /* ─── Sidebar panel content (shared by desktop aside + mobile drawer) ─── */
  const SidebarContent = ({ onClose }) => (
    <>
      <div style={{ padding: "20px 18px 14px", borderBottom: d ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.32em", color: d ? "rgba(0,255,204,0.55)" : "rgba(0,120,180,0.65)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 5, textTransform: "uppercase" }}>Database Schema</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: d ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)", fontFamily: "'Inter',sans-serif" }}>{TABLES.length} tables · {TABLES.reduce((a,t)=>a+t.cols.length,0)} columns</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="close-btn" style={{ background: "none", border: "none", cursor: "pointer", color: d ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)", fontSize: 18, lineHeight: 1, padding: "6px 8px", borderRadius: 9, transition: "all 0.2s", flexShrink: 0, marginTop: -2 }}>✕</button>
        )}
      </div>

      <div className="sidebar-scroll" style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
        {TABLES.map((t, i) => (
          <div key={t.name} className="table-card"
            onClick={() => setActiveTable(activeTable === t.name ? null : t.name)}
            style={{ marginBottom: 7, borderRadius: 13, overflow: "hidden", cursor: "pointer",
              border: activeTable === t.name ? `1px solid ${t.color}55` : d ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.08)",
              background: activeTable === t.name ? (d ? "rgba(4,20,36,0.96)" : "rgba(255,255,255,0.96)") : (d ? "rgba(6,18,34,0.55)" : "rgba(255,255,255,0.65)"),
              boxShadow: activeTable === t.name ? `0 0 0 1px ${t.color}16, 0 6px 26px ${t.glow}16` : "none",
              transition: "all 0.22s ease", animationDelay: `${i*0.05}s` }}>
            <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                background: `linear-gradient(135deg, ${t.color}1e, ${t.color}07)`,
                border: `1px solid ${t.color}2e`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, color: t.color,
                boxShadow: activeTable === t.name ? `0 0 14px ${t.glow}` : "none",
                transition: "box-shadow 0.28s" }}>{t.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: activeTable === t.name ? t.color : d ? "#e8f4ff" : "#0a1628", letterSpacing: "0.005em", fontFamily: "'Inter',sans-serif" }}>{t.name}</div>
                <div style={{ fontSize: 10.5, color: d ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Inter',sans-serif" }}>{t.desc}</div>
              </div>
              <div style={{ color: d ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)", fontSize: 10, transform: activeTable === t.name ? "rotate(180deg)" : "none", transition: "transform 0.22s ease", flexShrink: 0 }}>▾</div>
            </div>
            {activeTable === t.name && (
              <div style={{ padding: "0 12px 12px", borderTop: `1px solid ${t.color}12` }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                  {t.cols.map(c => (
                    <span key={c} style={{ fontSize: 10, padding: "3px 7px", borderRadius: 6, background: `${t.color}0e`, border: `1px solid ${t.color}26`, color: t.color, fontFamily: "'JetBrains Mono',monospace" }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: "10px 18px", borderTop: d ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)", fontSize: 10, color: d ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.18)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.08em", flexShrink: 0 }}>
        ORACLE XE · localhost:1521
      </div>
    </>
  );

  return (
    <div style={{ height: "100dvh", fontFamily: "'Inter',sans-serif", color: d ? "#e8f4ff" : "#0a1628", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", background: d ? "#020c1b" : "#f0f7ff" }}>
      <style>{CSS(d)}</style>

      <div className="bg-animate" />
      <div className="noise" />
      <div className="orb orb1" /><div className="orb orb2" /><div className="orb orb3" /><div className="orb orb4" />

      {/* Mobile overlay */}
      <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(5px)", opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? "auto" : "none", transition: "opacity 0.3s ease" }} />

      {/* Mobile drawer */}
      <aside style={{ position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 201, width: 290, background: d ? "rgba(2,10,22,0.98)" : "rgba(248,252,255,0.98)", backdropFilter: "blur(28px)", borderRight: d ? "1px solid rgba(0,255,204,0.12)" : "1px solid rgba(0,150,200,0.16)", display: "flex", flexDirection: "column", transform: drawerOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.33s cubic-bezier(0.34,1.15,0.64,1)", boxShadow: drawerOpen ? (d ? "14px 0 64px rgba(0,0,0,0.65)" : "14px 0 64px rgba(0,0,0,0.1)") : "none" }} className="mobile-drawer">
        <SidebarContent onClose={() => setDrawerOpen(false)} />
      </aside>

      {/* ── HEADER ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: d ? "rgba(2,12,27,0.74)" : "rgba(240,247,255,0.74)", backdropFilter: "blur(28px)", borderBottom: d ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,130,200,0.12)", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          {/* Mobile schema trigger */}
          <button className="schema-trigger" onClick={() => setDrawerOpen(true)} title="Database Schema"
            style={{ display: "none", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 9, border: "none", cursor: "pointer", background: d ? "rgba(0,255,204,0.09)" : "rgba(0,150,200,0.09)", color: d ? "#00ffcc" : "#007aaa", transition: "all 0.2s", flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1.2" width="14" height="3.4" rx="1.4" stroke="currentColor" strokeWidth="1.35"/><rect x="1" y="6.3" width="14" height="3.4" rx="1.4" stroke="currentColor" strokeWidth="1.35"/><rect x="1" y="11.4" width="14" height="3.4" rx="1.4" stroke="currentColor" strokeWidth="1.35"/></svg>
          </button>

          <span style={{ fontSize: 28, lineHeight: 1, background: "linear-gradient(135deg,#00ffcc 0%,#44ccff 50%,#aa88ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>⬡</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, fontFamily: "'Inter',sans-serif" }}>MedSQL<span className="accent-text">.ai</span></div>
            <div className="hdr-sub" style={{ fontSize: 9, color: d ? "rgba(0,255,204,0.52)" : "rgba(0,130,180,0.62)", letterSpacing: "0.22em", marginTop: 3, fontFamily: "'JetBrains Mono',monospace", textTransform: "uppercase" }}>Clinical Intelligence</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span className="theme-lbl" style={{ fontSize: 10, color: d ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.12em" }}>{d ? "DARK" : "LIGHT"}</span>
          <div onClick={() => setDark(!d)} style={{ width: 50, height: 26, borderRadius: 13, cursor: "pointer", position: "relative", background: d ? "linear-gradient(90deg,rgba(0,255,204,0.16),rgba(68,204,255,0.16))" : "linear-gradient(90deg,rgba(255,180,0,0.16),rgba(255,120,50,0.16))", border: d ? "1px solid rgba(0,255,204,0.26)" : "1px solid rgba(255,150,0,0.26)", transition: "all 0.34s ease" }}>
            <div style={{ position: "absolute", top: 3, left: d ? 24 : 3, width: 18, height: 18, borderRadius: "50%", background: d ? "linear-gradient(135deg,#00ffcc,#44ccff)" : "linear-gradient(135deg,#ffaa00,#ff6644)", boxShadow: d ? "0 0 10px rgba(0,255,204,0.85)" : "0 0 10px rgba(255,170,0,0.85)", transition: "all 0.36s cubic-bezier(0.34,1.56,0.64,1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>{d ? "🌙" : "☀️"}</div>
          </div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative", zIndex: 1, minHeight: 0 }}>

        {/* Desktop sidebar */}
        <aside className="desktop-sidebar" style={{ width: 264, minWidth: 236, background: d ? "rgba(3,13,28,0.76)" : "rgba(255,255,255,0.66)", backdropFilter: "blur(22px)", borderRight: d ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.07)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <SidebarContent onClose={null} />
        </aside>

        {/* ── CHAT ── */}
        <section className="chat-section" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "14px 18px 12px", overflow: "hidden", minWidth: 0, minHeight: 0 }}>

          {/* Email row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, padding: "8px 13px", borderRadius: 12, background: d ? "rgba(3,13,28,0.62)" : "rgba(255,255,255,0.68)", backdropFilter: "blur(14px)", border: d ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.07)", flexShrink: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.24em", color: d ? "rgba(0,255,204,0.5)" : "rgba(0,120,180,0.6)", fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap", textTransform: "uppercase" }}>Operator</div>
            <div style={{ width: 1, height: 13, background: d ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", flexShrink: 0 }} />
            <input className="glass-input" type="email" placeholder="you@hospital.org" value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: d ? "#e8f4ff" : "#0a1628", fontSize: 13, fontFamily: "'Inter',sans-serif", minWidth: 0 }} />
            {email && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#00ffcc", boxShadow: "0 0 8px rgba(0,255,204,0.9)", flexShrink: 0 }} />}
          </div>

          {/* Messages */}
          <div className="chat-scroll" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 11, marginBottom: 10, paddingRight: 2, minHeight: 0 }}>

            {messages.length === 0 && !resultData && (
              <div style={{ margin: "auto", textAlign: "center", padding: "20px 16px" }}>
                <div className="empty-icon" style={{ width: 60, height: 60, borderRadius: "50%", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, background: d ? "rgba(0,255,204,0.07)" : "rgba(0,150,200,0.07)", border: d ? "1px solid rgba(0,255,204,0.17)" : "1px solid rgba(0,150,200,0.17)" }}>◈</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6, color: d ? "rgba(255,255,255,0.52)" : "rgba(0,0,0,0.46)", fontFamily: "'Inter',sans-serif", letterSpacing: "-0.01em" }}>Ready for your query</div>
                <div style={{ fontSize: 12.5, color: d ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.26)", lineHeight: 1.9, fontFamily: "'Inter',sans-serif" }}>
                  Ask anything about your patient data.<br />SQL is auto-generated and executed.
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "84%", animation: "slideUp 0.26s cubic-bezier(0.34,1.4,0.64,1)" }}>
                <div style={{ fontSize: 9.5, color: d ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.26)", marginBottom: 4, textAlign: m.role === "user" ? "right" : "left", fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.06em" }}>
                  {m.role === "user" ? (email || "YOU") : m.role === "error" ? "⚠ ERROR" : "◈ SQL"} · {m.time}
                </div>
                <div style={{ borderRadius: m.role === "user" ? "15px 15px 4px 15px" : "15px 15px 15px 4px", padding: "10px 14px", backdropFilter: "blur(16px)",
                  background: m.role === "user"
                    ? d ? "linear-gradient(135deg,rgba(68,204,255,0.17),rgba(170,136,255,0.12))" : "linear-gradient(135deg,rgba(0,120,220,0.1),rgba(120,80,220,0.08))"
                    : m.role === "error" ? (d ? "rgba(255,40,80,0.11)" : "rgba(220,0,60,0.07)")
                    : d ? "rgba(0,255,204,0.055)" : "rgba(0,150,180,0.055)",
                  border: m.role === "user"
                    ? d ? "1px solid rgba(68,204,255,0.2)" : "1px solid rgba(0,120,220,0.16)"
                    : m.role === "error" ? "1px solid rgba(255,40,80,0.2)"
                    : d ? "1px solid rgba(0,255,204,0.12)" : "1px solid rgba(0,150,180,0.12)",
                  boxShadow: m.role === "assistant" ? (d ? "0 3px 18px rgba(0,255,204,0.055)" : "0 3px 18px rgba(0,150,180,0.06)") : "none",
                }}>
                  <pre style={{ margin: 0, fontSize: 12.5, lineHeight: 1.78, whiteSpace: "pre-wrap", wordBreak: "break-word",
                    fontFamily: m.role === "assistant" ? "'JetBrains Mono',monospace" : "'Inter',sans-serif",
                    fontWeight: m.role === "user" ? 500 : 400,
                    color: m.role === "user" ? (d ? "#c8e8ff" : "#0a3060") : m.role === "error" ? "#ff4488" : (d ? "#00ffcc" : "#007aaa")
                  }}>{m.text}</pre>
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ alignSelf: "flex-start", animation: "slideUp 0.26s ease" }}>
                <div style={{ fontSize: 9.5, color: d ? "rgba(0,255,204,0.36)" : "rgba(0,150,180,0.42)", marginBottom: 4, fontFamily: "'JetBrains Mono',monospace" }}>◈ SQL · Generating...</div>
                <div style={{ borderRadius: "15px 15px 15px 4px", padding: "12px 16px", background: d ? "rgba(0,255,204,0.055)" : "rgba(0,150,180,0.055)", border: d ? "1px solid rgba(0,255,204,0.12)" : "1px solid rgba(0,150,180,0.12)", backdropFilter: "blur(16px)" }}>
                  <div className="wave-dots">{[0,1,2,3,4].map(j => <div key={j} className="wave-dot" style={{ animationDelay: `${j*0.11}s`, background: d ? "#00ffcc" : "#0099cc" }} />)}</div>
                </div>
              </div>
            )}

            {waitingForResults && (
              <div style={{ alignSelf: "stretch", animation: "slideUp 0.26s ease" }}>
                <div style={{ fontSize: 9.5, color: d ? "rgba(255,170,0,0.52)" : "rgba(180,100,0,0.52)", marginBottom: 4, fontFamily: "'JetBrains Mono',monospace" }}>⬡ ORACLE · Executing...</div>
                <div style={{ borderRadius: 13, padding: "12px 16px", background: d ? "rgba(255,170,0,0.05)" : "rgba(200,120,0,0.05)", border: d ? "1px solid rgba(255,170,0,0.15)" : "1px solid rgba(200,120,0,0.14)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", gap: 11 }}>
                  <div className="wave-dots">{[0,1,2,3,4].map(j => <div key={j} className="wave-dot" style={{ animationDelay: `${j*0.11}s`, background: d ? "#ffaa00" : "#cc7700" }} />)}</div>
                  <span style={{ fontSize: 12, color: d ? "rgba(255,170,0,0.62)" : "rgba(180,100,0,0.62)", fontFamily: "'Inter',sans-serif" }}>Running on Oracle…</span>
                </div>
              </div>
            )}

            {resultData && !waitingForResults && (
              <div style={{ alignSelf: "stretch", animation: "slideUp 0.26s ease" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 5 }}>
                  <span style={{ fontSize: 9.5, color: d ? "rgba(255,170,0,0.55)" : "rgba(180,100,0,0.55)", fontFamily: "'JetBrains Mono',monospace" }}>⬡ RESULTS · {resultData.rows?.length ?? 0} rows</span>
                  {resultData.rows?.length > 0 && !resultData.error && (
                    <button onClick={downloadExcel} className="dl-btn" style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 7, border: d ? "1px solid rgba(0,255,204,0.26)" : "1px solid rgba(0,150,180,0.26)", background: d ? "rgba(0,255,204,0.065)" : "rgba(0,150,180,0.065)", color: d ? "#00ffcc" : "#007aaa", fontSize: 10, fontFamily: "'JetBrains Mono',monospace", cursor: "pointer", letterSpacing: "0.07em", transition: "all 0.2s ease" }}>⬇ EXPORT</button>
                  )}
                </div>
                <div style={{ borderRadius: 13, overflow: "hidden", border: d ? "1px solid rgba(255,170,0,0.16)" : "1px solid rgba(200,120,0,0.14)", background: d ? "rgba(10,6,0,0.84)" : "rgba(255,252,240,0.9)", backdropFilter: "blur(16px)", boxShadow: d ? "0 5px 32px rgba(255,170,0,0.06)" : "0 5px 32px rgba(200,120,0,0.04)" }}>
                  {resultData.error ? (
                    <div style={{ padding: "13px 16px", color: "#ff4488", fontSize: 12.5, fontFamily: "'Inter',sans-serif" }}>⚠ {resultData.error}</div>
                  ) : resultData.rows?.length === 0 ? (
                    <div style={{ padding: "13px 16px", color: d ? "rgba(255,255,255,0.26)" : "rgba(0,0,0,0.26)", fontSize: 12.5, fontFamily: "'Inter',sans-serif" }}>No rows returned.</div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }}>
                        <thead>
                          <tr style={{ background: d ? "rgba(255,170,0,0.065)" : "rgba(200,120,0,0.045)", borderBottom: d ? "1px solid rgba(255,170,0,0.16)" : "1px solid rgba(200,120,0,0.12)" }}>
                            <th style={{ padding: "8px 11px", textAlign: "center", fontSize: 9, letterSpacing: "0.18em", color: d ? "rgba(255,255,255,0.17)" : "rgba(0,0,0,0.2)", width: 34, borderRight: d ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.04)" }}>#</th>
                            {resultData.columns.map(col => (
                              <th key={col} style={{ padding: "8px 13px", textAlign: "left", fontSize: 10, letterSpacing: "0.1em", color: d ? "#ffaa00" : "#966200", borderRight: d ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.04)", whiteSpace: "nowrap", fontWeight: 700 }}>{col.toUpperCase()}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {resultData.rows.map((row, ri) => (
                            <tr key={ri} className="result-row" style={{ borderBottom: d ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(0,0,0,0.04)", background: ri%2===0 ? "transparent" : (d ? "rgba(255,255,255,0.012)" : "rgba(0,0,0,0.012)") }}>
                              <td style={{ padding: "7px 11px", textAlign: "center", color: d ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.18)", fontSize: 10, borderRight: d ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(0,0,0,0.03)" }}>{ri+1}</td>
                              {row.map((cell, ci) => (
                                <td key={ci} style={{ padding: "7px 13px", color: cell ? (d ? "#d8eeff" : "#0a2040") : (d ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.18)"), fontSize: 12, borderRight: d ? "1px solid rgba(255,255,255,0.03)" : "1px solid rgba(0,0,0,0.03)", whiteSpace: "nowrap" }}>{cell ?? "—"}</td>
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

          {/* Input bar */}
          <div style={{ borderRadius: 16, background: d ? "rgba(3,13,28,0.8)" : "rgba(255,255,255,0.8)", backdropFilter: "blur(22px)", border: d ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(0,0,0,0.09)", padding: "11px 13px", boxShadow: d ? "0 -3px 30px rgba(0,0,0,0.28)" : "0 -3px 30px rgba(0,0,0,0.05)", flexShrink: 0 }}>
            <textarea className="chat-textarea" rows={2} placeholder="Ask about your patient data…  e.g. Show top 10 patients with high cholesterol" value={message} onChange={e => setMessage(e.target.value)} onKeyDown={handleKey}
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", color: d ? "#e8f4ff" : "#0a1628", fontSize: 13.5, fontFamily: "'Inter',sans-serif", lineHeight: 1.65, marginBottom: 8 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span className="enter-hint" style={{ fontSize: 10, color: d ? "rgba(255,255,255,0.17)" : "rgba(0,0,0,0.2)", fontFamily: "'JetBrains Mono',monospace" }}>↵ send · ⇧↵ newline</span>
              <button onClick={sendMessage} disabled={loading || waitingForResults} className="send-btn"
                style={{ height: 37, padding: "0 18px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: loading || waitingForResults ? (d ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)") : "linear-gradient(135deg,#00ffcc,#44ccff)",
                  color: loading || waitingForResults ? (d ? "rgba(255,255,255,0.26)" : "rgba(0,0,0,0.26)") : "#020c1b",
                  fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 13,
                  transition: "all 0.2s ease",
                  boxShadow: loading || waitingForResults ? "none" : "0 3px 16px rgba(0,255,204,0.36)",
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {loading || waitingForResults
                  ? <><div className="spin-ring" /><span>Processing</span></>
                  : <><span>Generate</span><span style={{ fontSize: 14 }}>→</span></>}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ═══════════════════════════════ CSS ═══════════════════════════════════════*/
function CSS(d) {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* Force exact viewport height — critical on mobile (address bar aware) */
    html { height: 100%; }
    body { height: 100%; overflow: hidden; }
    #root { height: 100%; }

    .bg-animate {
      position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background: ${d
        ? `radial-gradient(ellipse 80% 60% at 18% 18%, rgba(0,255,200,0.11) 0%, transparent 60%),
           radial-gradient(ellipse 60% 80% at 82% 10%, rgba(68,100,255,0.13) 0%, transparent 55%),
           radial-gradient(ellipse 70% 50% at 50% 92%, rgba(170,80,255,0.09) 0%, transparent 60%),
           radial-gradient(ellipse 50% 60% at 88% 70%, rgba(255,60,120,0.07) 0%, transparent 55%)`
        : `radial-gradient(ellipse 80% 60% at 18% 18%, rgba(0,200,180,0.14) 0%, transparent 60%),
           radial-gradient(ellipse 60% 80% at 82% 10%, rgba(0,100,255,0.09) 0%, transparent 55%),
           radial-gradient(ellipse 70% 50% at 50% 92%, rgba(120,60,255,0.07) 0%, transparent 60%)`};
      animation: gradShift 15s ease-in-out infinite alternate;
    }
    @keyframes gradShift {
      0%   { opacity:1;    transform:scale(1)    rotate(0deg); }
      40%  { opacity:0.88; transform:scale(1.05) rotate(0.7deg); }
      100% { opacity:1;    transform:scale(1.02) rotate(-0.4deg); }
    }

    .noise {
      position: fixed; inset: 0; z-index: 0; pointer-events: none; opacity: ${d ? 0.019 : 0.010};
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      background-size: 180px;
    }

    .orb { position:fixed; border-radius:50%; pointer-events:none; z-index:0; filter:blur(72px); }
    .orb1 { width:460px; height:460px; top:-13%; left:-9%;  background:${d?"rgba(0,255,200,0.08)":"rgba(0,200,180,0.10)"}; animation:orbDrift 18s ease-in-out infinite; }
    .orb2 { width:380px; height:380px; top:12%;  right:-8%; background:${d?"rgba(80,100,255,0.10)":"rgba(0,80,220,0.07)"}; animation:orbDrift 22s ease-in-out infinite reverse; }
    .orb3 { width:320px; height:320px; bottom:-9%; left:32%; background:${d?"rgba(180,80,255,0.08)":"rgba(120,60,200,0.06)"}; animation:orbDrift 27s ease-in-out infinite 4s; }
    .orb4 { width:240px; height:240px; bottom:22%; right:18%; background:${d?"rgba(255,60,120,0.06)":"rgba(200,0,80,0.04)"}; animation:orbDrift 21s ease-in-out infinite reverse 7s; }
    @keyframes orbDrift {
      0%,100% { transform:translate(0,0) scale(1); }
      25%  { transform:translate(36px,-26px) scale(1.07); }
      50%  { transform:translate(-16px,44px) scale(0.95); }
      75%  { transform:translate(26px,16px)  scale(1.03); }
    }

    .accent-text { background:linear-gradient(90deg,#00ffcc,#44ccff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

    .sidebar-scroll::-webkit-scrollbar, .chat-scroll::-webkit-scrollbar { width:3px; }
    .sidebar-scroll::-webkit-scrollbar-track, .chat-scroll::-webkit-scrollbar-track { background:transparent; }
    .sidebar-scroll::-webkit-scrollbar-thumb, .chat-scroll::-webkit-scrollbar-thumb { background:${d?"rgba(0,255,204,0.17)":"rgba(0,150,200,0.2)"}; border-radius:3px; }

    .table-card:hover { border-color:${d?"rgba(255,255,255,0.13)":"rgba(0,0,0,0.13)"} !important; transform:translateX(2px); }

    .chat-textarea::placeholder { color:${d?"rgba(255,255,255,0.17)":"rgba(0,0,0,0.21)"}; }
    .glass-input::placeholder   { color:${d?"rgba(255,255,255,0.19)":"rgba(0,0,0,0.24)"}; }

    .empty-icon { animation:emptyPulse 3.2s ease-in-out infinite; }
    @keyframes emptyPulse {
      0%,100% { box-shadow:0 0 16px ${d?"rgba(0,255,204,0.11)":"rgba(0,150,200,0.11)"}; }
      50%     { box-shadow:0 0 34px ${d?"rgba(0,255,204,0.27)":"rgba(0,150,200,0.25)"}; }
    }

    .wave-dots { display:flex; align-items:center; gap:5px; }
    .wave-dot  { width:6px; height:6px; border-radius:50%; animation:waveDot 0.92s ease-in-out infinite; }
    @keyframes waveDot {
      0%,100% { transform:translateY(0); opacity:0.32; }
      50%     { transform:translateY(-5px); opacity:1; }
    }

    .send-btn:hover:not(:disabled) { transform:translateY(-1px) scale(1.02); box-shadow:0 6px 24px rgba(0,255,204,0.46) !important; }
    .send-btn:disabled { cursor:not-allowed; }

    .spin-ring { width:13px; height:13px; border-radius:50%; border:2px solid ${d?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)"}; border-top-color:${d?"rgba(255,255,255,0.46)":"rgba(0,0,0,0.42)"}; animation:spin 0.8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }

    .dl-btn:hover { background:${d?"rgba(0,255,204,0.13)":"rgba(0,150,180,0.11)"} !important; box-shadow:0 0 11px ${d?"rgba(0,255,204,0.2)":"rgba(0,150,180,0.16)"}; transform:translateY(-1px); }
    .result-row:hover td { background:${d?"rgba(255,170,0,0.038)":"rgba(200,120,0,0.034)"} !important; }
    .result-row:last-child td { border-bottom:none; }

    .close-btn:hover        { background:${d?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.05)"} !important; color:${d?"#fff":"#000"} !important; }
    .schema-trigger:hover   { background:${d?"rgba(0,255,204,0.15)":"rgba(0,150,200,0.15)"} !important; box-shadow:0 0 11px ${d?"rgba(0,255,204,0.25)":"rgba(0,150,200,0.2)"}; }

    @keyframes slideUp {
      from { opacity:0; transform:translateY(11px) scale(0.98); }
      to   { opacity:1; transform:translateY(0)    scale(1); }
    }

    /* ══════════════ RESPONSIVE ══════════════ */
    @media (max-width: 767px) {
      .desktop-sidebar { display:none !important; }
      .schema-trigger  { display:flex !important; }
      .hdr-sub         { display:none; }
      .theme-lbl       { display:none; }
      .enter-hint      { display:none; }
      .chat-section    { padding:10px 10px 10px !important; }
    }
    @media (max-width: 380px) {
      .chat-section { padding:7px 7px 7px !important; }
    }
  `;
}