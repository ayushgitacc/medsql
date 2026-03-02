import requests
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.1-8b-instant"

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

    return f"""You are an Oracle Database 21c SQL expert. Your ONLY job is to produce SQL queries that supports in oracle.

## STRICT RULES — FOLLOW WITHOUT EXCEPTION:

# QUERY OUTPUT RULES
1. ONLY output raw SQL queries 1 at a time. No explanations, no chat, no apologies, no markdown fences.
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
latest_results = None

def chat(user_message):
    global latest_sql
    history.append({"role": "user", "content": user_message})
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": MODEL,
        "messages": [{"role": "system", "content": build_system_prompt()}, *history],
        "temperature": 0.1,
    }
    resp = requests.post(GROQ_URL, json=payload, headers=headers, timeout=30)
    reply = resp.json()["choices"][0]["message"]["content"].strip()
    history.append({"role": "assistant", "content": reply})
    latest_sql = reply
    return reply

app = Flask(__name__)
CORS(app)

@app.route("/get-query", methods=["GET"])
def get_query():
    global latest_sql
    sql = latest_sql
    latest_sql = ""
    return jsonify({"sql": sql})

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

@app.route("/post-results", methods=["POST"])
def post_results():
    global latest_results
    latest_results = request.get_json()
    return jsonify({"status": "ok"})

@app.route("/get-results", methods=["GET"])
def get_results():
    global latest_results
    data = latest_results
    latest_results = None
    return jsonify(data if data else {"columns": [], "rows": [], "error": None})



if __name__ == "__main__":
    app.run(port=5000)