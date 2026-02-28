import requests
import sys
from flask import Flask, jsonify, request          # ▼ CHANGE 1 — added `request`
from flask_cors import CORS                        # ▼ CHANGE 2 — new import (pip install flask-cors)
import threading

OLLAMA_URL = "http://localhost:11434"
MODEL = "llama3.2:3b"

TABLE_SCHEMA = {
    "Glucose": {
        "desc": "Glucose Monitoring – patient glucose readings.",
        "cols": ["g_id", "patient_id", "glucose_value", "reading_time", "device_id", "trend", "checkup_date"],
    },
    "Heart": {
        "desc": "Heart Disease – diagnosis and risk factors.",
        "cols": ["h_id", "patient_id", "diagnosis_date", "severity", "cholesterol", "blood_pressure", "smoking_status", "treatment_plan", "record_date"],
    },
    "Activity": {
        "desc": "Glucose before and after exercise",
        "cols": ["a_id", "patient_id", "activity_type", "duration_minutes", "calories_burned", "glucose_before", "glucose_after", "activity_date"],
    },
    "Patients": {
        "desc": "Master patient table.",
        "cols": ["patient_id", "first_name", "last_name", "dob", "gender", "email", "phone", "created_at"],
    },
    "Medications": {
        "desc": "Medications prescribed to patients.",
        "cols": ["m_id", "patient_id", "med_name", "dosage", "frequency", "start_date", "end_date", "prescribed_by"],
    },
}

def build_system_prompt():
    schema = ""
    for table, info in TABLE_SCHEMA.items():
        schema += f"\n{table}: {info['desc']}\n  columns: {', '.join(info['cols'])}\n"

    return f"""You are an expert SQL query generator. Your ONLY job is to produce SQL queries.

## STRICT RULES — FOLLOW WITHOUT EXCEPTION:

# QUERY OUTPUT RULES
1. ONLY output raw SQL queries. No explanations, no chat, no apologies, no markdown fences.
2. Always end every query with a semicolon (;).
3. Use uppercase for ALL SQL keywords: SELECT, FROM, WHERE, JOIN, ON, GROUP BY, ORDER BY, HAVING, DISTINCT.

# SCHEMA RULES
4. ONLY use tables and columns that exist in the DATABASE SCHEMA below. NEVER invent or assume columns.
5. Every column you use MUST belong to the table it is selected from. Cross-check before writing.
6. Always respect primary keys and foreign keys as defined in the schema.

# ALIAS RULES
7. Use aliases ONLY when querying more than one table.
8. NEVER use AS keyword for aliases.
9. Use these FIXED aliases always — never deviate:
   - Patients      → P
   - Glucose       → G
   - Heart         → H
   - Activity      → A
   - Medications   → M
10. An alias can ONLY access columns from its own table:
    - P.column → must exist in Patients
    - G.column → must exist in Glucose
    - H.column → must exist in Heart
    - A.column → must exist in Activity
    - M.column → must exist in Medications

# STRICT JOIN RULES - have to follow
11. ONLY use this join syntax: FROM Table1 A, Table2 B WHERE A.key = B.key
12. NEVER use JOIN, INNER JOIN, LEFT JOIN, RIGHT JOIN, or any explicit join keyword.

# AMBIGUITY RULES
13. If confidence is below 75%, ask one clarifying question. Do NOT guess.
14. If the request CANNOT be answered with the given schema, respond ONLY with:
    -- Cannot generate query: [brief reason]

## DATABASE SCHEMA:
{schema}"""

history = []
latest_sql = ""
latest_results = None                              # ▼ CHANGE 3 — stores results from Java

def chat(user_message):
    global latest_sql
    history.append({"role": "user", "content": user_message})
    payload = {
        "model": MODEL,
        "messages": [{"role": "system", "content": build_system_prompt()}, *history],
        "stream": False,
        "options": {"temperature": 0.1},
    }
    resp = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=320)
    reply = resp.json()["message"]["content"].strip()
    history.append({"role": "assistant", "content": reply})
    latest_sql = reply
    return reply

app = Flask(__name__)
CORS(app)                                          # ▼ CHANGE 4 — allow React to call Flask

@app.route("/get-query", methods=["GET"])
def get_query():
    global latest_sql
    sql = latest_sql
    latest_sql = ""
    return jsonify({"sql": sql})

# ▼ CHANGE 5 — receives message from React frontend, returns generated SQL
@app.route("/send-message", methods=["POST"])
def send_message():
    global latest_results
    latest_results = None
    data = request.get_json()
    user_message = data.get("message", "").strip()
    if not user_message:
        return jsonify({"error": "Empty message"}), 400
    sql = chat(user_message)
    return jsonify({"sql": sql})

# ▼ CHANGE 6 — Java POSTs results here after executing
@app.route("/post-results", methods=["POST"])
def post_results():
    global latest_results
    latest_results = request.get_json()
    return jsonify({"status": "ok"})

# ▼ CHANGE 7 — React polls this to get query results
@app.route("/get-results", methods=["GET"])
def get_results():
    global latest_results
    data = latest_results
    latest_results = None
    return jsonify(data if data else {"columns": [], "rows": [], "error": None})

def main():
    print("SQL Assistant (Ollama) — type /tables, /reset, or /exit\n")

    try:
        requests.get(f"{OLLAMA_URL}/api/tags", timeout=5)
    except Exception:
        print(f"Cannot connect to Ollama at {OLLAMA_URL}. Run: ollama serve")
        sys.exit(1)

    while True:
        user_input = input("You > ").strip()
        if not user_input:
            continue
        if user_input == "/exit":
            break
        elif user_input == "/reset":
            history.clear()
            print("History cleared.\n")
        elif user_input == "/tables":
            for t, info in TABLE_SCHEMA.items():
                print(f"  {t}: {', '.join(info['cols'])}")
            print()
        else:
            print("\n" + chat(user_input) + "\n")

if __name__ == "__main__":
    threading.Thread(target=lambda: app.run(port=5000), daemon=True).start()
    main()