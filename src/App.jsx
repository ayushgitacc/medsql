import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";

const TABLES = [
  {
    name: "Glucose",
    icon: "🍬",
    desc: "Patient glucose readings",
    color: "#FBBC05",
  },
  {
    name: "Heart",
    icon: "❤️",
    desc: "Heart disease records",
    color: "#EA4335",
  },
  {
    name: "Patients",
    icon: "👥",
    desc: "Patient registry",
    color: "#34A853",
  },
  {
    name: "Medications",
    icon: "💊",
    desc: "Prescribed medications",
    color: "#4285F4",
  },
];

const QUICK_QUERIES = [
  "Show diabetic patients",
  "Patients with high cholesterol",
  "Average glucose levels",
  "Recent medications",
  "Heart risk patients",
];

const FLASK_URL =
  import.meta.env.VITE_API_URL ||
  "https://medsql.onrender.com";

export default function App() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] =
    useState(null);
  const [waiting, setWaiting] =
    useState(false);

  const pollRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, resultData]);

  const startPolling = () => {
    setWaiting(true);

    if (pollRef.current)
      clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${FLASK_URL}/get-results`
        );

        const data = await res.json();

        if (
          data &&
          (data.columns?.length > 0 ||
            data.error)
        ) {
          setResultData(data);
          setWaiting(false);
          clearInterval(pollRef.current);
        }
      } catch {
        setWaiting(false);
        clearInterval(pollRef.current);
      }
    }, 1200);
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    if (!email.trim()) {
      alert("Please enter email");
      return;
    }

    const userMsg = {
      role: "user",
      text: message,
    };

    setMessages((p) => [...p, userMsg]);

    const sent = message;

    setMessage("");

    setLoading(true);

    try {
      const res = await fetch(
        `${FLASK_URL}/send-message`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            message: sent,
            email,
          }),
        }
      );

      const data = await res.json();

      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          text: data.sql,
        },
      ]);

      startPolling();
    } catch {
      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          text: "Cannot connect to server.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();
      sendMessage();
    }
  };

  const downloadExcel = () => {
    if (!resultData?.rows?.length) return;

    const worksheetData =
      resultData.rows.map((row) =>
        Object.fromEntries(
          resultData.columns.map(
            (col, i) => [
              col,
              row[i] ?? "",
            ]
          )
        )
      );

    const worksheet =
      XLSX.utils.json_to_sheet(
        worksheetData
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Results"
    );

    XLSX.writeFile(
      workbook,
      "medsql-results.xlsx"
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#ffffff",
        display: "flex",
        fontFamily:
          "'Roboto', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* SIDEBAR */}

      <div
        style={{
          width: 280,
          borderRight:
            "1px solid #e5e7eb",
          padding: 24,
          background: "#fff",
          overflowY: "auto",
          display:
            window.innerWidth < 900
              ? "none"
              : "block",
        }}
      >
        {/* LOGO */}

        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: "-1px",
            marginBottom: 6,
          }}
        >
          <span
            style={{ color: "#4285F4" }}
          >
            M
          </span>

          <span
            style={{ color: "#EA4335" }}
          >
            e
          </span>

          <span
            style={{ color: "#FBBC05" }}
          >
            d
          </span>

          <span
            style={{ color: "#4285F4" }}
          >
            S
          </span>

          <span
            style={{ color: "#34A853" }}
          >
            Q
          </span>

          <span
            style={{ color: "#EA4335" }}
          >
            L
          </span>
        </div>

        <div
          style={{
            color: "#5f6368",
            marginBottom: 30,
            fontSize: 14,
          }}
        >
          AI Medical Database
          Assistant
        </div>

        {/* TABLES */}

        <div
          style={{
            border:
              "1px solid #e5e7eb",
            borderRadius: 24,
            padding: 18,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "#4285F4",
              marginBottom: 18,
            }}
          >
            DATABASE SCHEMA
          </div>

          {TABLES.map((t) => (
            <div
              key={t.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                padding: 14,
                border:
                  "1px solid #f1f3f4",
                borderRadius: 18,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 26,
                  }}
                >
                  {t.icon}
                </div>

                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    {t.name}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#5f6368",
                    }}
                  >
                    {t.desc}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding:
                    "7px 12px",
                  borderRadius: 999,
                  background: `${t.color}15`,
                  color: t.color,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Table
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding:
            window.innerWidth < 768
              ? 14
              : 24,
        }}
      >
        {/* TOP BAR */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "flex-end",
            marginBottom: 20,
          }}
        >
          <input
            type="email"
            placeholder="Enter email..."
            value={email}
            onChange={(e) =>
              setEmail(
                e.target.value
              )
            }
            style={{
              width:
                window.innerWidth < 768
                  ? "100%"
                  : 280,
              padding:
                "12px 18px",
              borderRadius: 999,
              border:
                "1px solid #dadce0",
              outline: "none",
              fontSize: 14,
            }}
          />
        </div>

        {/* HERO */}

        <div
          style={{
            marginBottom: 24,
          }}
        >
          <h1
            style={{
              fontSize:
                window.innerWidth <
                768
                  ? 34
                  : 52,
              margin: 0,
              fontWeight: 700,
              color: "#202124",
            }}
          >
            Hello, Ayush 👋
          </h1>

          <p
            style={{
              color: "#5f6368",
              fontSize: 18,
              marginTop: 10,
            }}
          >
            Ask anything about your
            medical database
          </p>

          {/* QUICK QUERIES */}

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 28,
            }}
          >
            {QUICK_QUERIES.map(
              (q, i) => (
                <button
                  key={i}
                  onClick={() =>
                    setMessage(q)
                  }
                  style={{
                    border:
                      "1px solid #dadce0",
                    background:
                      "#fff",
                    padding:
                      "12px 18px",
                    borderRadius: 999,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                    color:
                      "#3c4043",
                    transition:
                      "0.2s",
                    boxShadow:
                      "0 1px 3px rgba(0,0,0,0.06)",
                    width:
                      window.innerWidth <
                      768
                        ? "100%"
                        : "auto",
                  }}
                >
                  {q}
                </button>
              )
            )}
          </div>
        </div>

        {/* CHAT */}

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingBottom: 20,
          }}
        >
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent:
                  m.role === "user"
                    ? "flex-end"
                    : "flex-start",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  maxWidth:
                    window.innerWidth <
                    768
                      ? "100%"
                      : "78%",

                  padding: 18,

                  borderRadius: 22,

                  background:
                    m.role ===
                    "user"
                      ? "#E8F0FE"
                      : "linear-gradient(135deg, rgba(66,133,244,0.08), rgba(234,67,53,0.06), rgba(251,188,5,0.05), rgba(52,168,83,0.05))",

                  border:
                    m.role ===
                    "assistant"
                      ? "1px solid rgba(66,133,244,0.15)"
                      : "none",
                }}
              >
                <div
                  style={{
                    whiteSpace:
                      "pre-wrap",
                    wordBreak:
                      "break-word",

                    fontSize: 15,

                    lineHeight: 1.7,

                    background:
                      m.role ===
                      "assistant"
                        ? "linear-gradient(90deg,#4285F4,#EA4335,#FBBC05,#34A853)"
                        : "none",

                    WebkitBackgroundClip:
                      m.role ===
                      "assistant"
                        ? "text"
                        : "unset",

                    WebkitTextFillColor:
                      m.role ===
                      "assistant"
                        ? "transparent"
                        : "#202124",

                    fontWeight:
                      m.role ===
                      "assistant"
                        ? 700
                        : 500,

                    color:
                      m.role ===
                      "user"
                        ? "#202124"
                        : "unset",
                  }}
                >
                  {m.text}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div
              style={{
                color: "#5f6368",
                marginBottom: 14,
              }}
            >
              Generating SQL...
            </div>
          )}

          {waiting && (
            <div
              style={{
                color: "#5f6368",
                marginBottom: 14,
              }}
            >
              Executing query...
            </div>
          )}

          {/* RESULTS */}

          {resultData?.rows
            ?.length > 0 && (
            <div
              style={{
                border:
                  "1px solid #e5e7eb",

                borderRadius: 24,

                padding: 20,

                marginTop: 20,

                overflowX:
                  "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",

                  marginBottom: 20,

                  color:
                    "#34A853",

                  fontWeight: 700,

                  flexWrap: "wrap",

                  gap: 12,
                }}
              >
                <span>
                  Query executed
                  successfully
                </span>

                <button
                  onClick={
                    downloadExcel
                  }
                  style={{
                    border:
                      "1px solid #dadce0",

                    background:
                      "#fff",

                    padding:
                      "10px 18px",

                    borderRadius: 999,

                    cursor:
                      "pointer",
                  }}
                >
                  Download
                  Excel
                </button>
              </div>

              <table
                style={{
                  width: "100%",
                  borderCollapse:
                    "collapse",
                  minWidth: 700,
                }}
              >
                <thead>
                  <tr>
                    {resultData.columns.map(
                      (c) => (
                        <th
                          key={c}
                          style={{
                            border:
                              "1px solid #f1f3f4",

                            padding: 14,

                            background:
                              "#f8f9fa",

                            textAlign:
                              "left",
                          }}
                        >
                          {c}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {resultData.rows.map(
                    (row, ri) => (
                      <tr key={ri}>
                        {row.map(
                          (
                            cell,
                            ci
                          ) => (
                            <td
                              key={
                                ci
                              }
                              style={{
                                border:
                                  "1px solid #f1f3f4",

                                padding: 14,
                              }}
                            >
                              {cell}
                            </td>
                          )
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* INPUT */}

        <div
          style={{
            marginTop: 18,

            display: "flex",

            alignItems: "center",

            gap: 12,

            border:
              "1px solid #dadce0",

            borderRadius: 999,

            padding:
              "14px 18px",

            boxShadow:
              "0 2px 10px rgba(0,0,0,0.06)",
          }}
        >
          <textarea
            rows={2}
            placeholder="Ask anything about your medical database..."
            value={message}
            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }
            onKeyDown={handleKey}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              resize: "none",
              fontSize: 15,
              fontFamily:
                "'Roboto', sans-serif",
            }}
          />

          <button
            onClick={sendMessage}
            disabled={
              loading || waiting
            }
            style={{
              width: 52,
              height: 52,
              borderRadius:
                "50%",
              border: "none",
              background:
                "#4285F4",
              color: "#fff",
              fontSize: 24,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}