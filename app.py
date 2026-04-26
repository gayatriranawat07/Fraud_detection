"""
app.py — FraudGuard Flask API
Compatible with: shap>=0.44, xgboost>=2.0, flask-jwt-extended>=4.6
"""

import os
import io
import json
import pickle
import traceback
import numpy as np
import pandas as pd
import shap
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity
)
from database import init_db, get_connection
from auth import register_user, verify_user

# ── App setup ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = "ccfd-super-secret-key-change-in-prod"
CORS(app)
jwt = JWTManager(app)

# ── Config ─────────────────────────────────────────────────────────────────────
FRAUD_THRESHOLD = float(os.environ.get("FRAUD_THRESHOLD", 0.7))
MODEL_PATH      = "models/xgb_model.pkl"
SCALER_PATH     = "models/scaler.pkl"
FEATURES_PATH   = "models/feature_names.pkl"

# ── Globals ────────────────────────────────────────────────────────────────────
model         = None
scaler        = None
feature_names = None
explainer     = None

# ── V1-V28 realistic standard deviations (from UCI dataset) ───────────────────
V_STDS = {
    "V1": 1.958, "V2": 1.651, "V3": 1.516, "V4": 1.416, "V5": 1.380,
    "V6": 1.332, "V7": 1.237, "V8": 1.194, "V9": 1.099, "V10": 1.089,
    "V11": 1.021, "V12": 0.999, "V13": 0.995, "V14": 0.959, "V15": 0.915,
    "V16": 0.876, "V17": 0.850, "V18": 0.838, "V19": 0.814, "V20": 0.771,
    "V21": 0.735, "V22": 0.726, "V23": 0.625, "V24": 0.606, "V25": 0.521,
    "V26": 0.482, "V27": 0.404, "V28": 0.330,
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def load_artifacts():
    """Load model, scaler, feature names, and build SHAP explainer at startup."""
    global model, scaler, feature_names, explainer
    if not os.path.exists(MODEL_PATH):
        print("WARNING: No trained model found. Run model_training.py first.")
        return
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    with open(SCALER_PATH, "rb") as f:
        scaler = pickle.load(f)
    with open(FEATURES_PATH, "rb") as f:
        feature_names = pickle.load(f)
    explainer = shap.TreeExplainer(model)
    print(f"Model loaded. Features: {len(feature_names)}. SHAP version: {shap.__version__}")


def simulate_v_features():
    """Return dict of realistic V1-V28 values sampled from dataset distribution."""
    return {f: float(np.random.normal(0.0, std)) for f, std in V_STDS.items()}


def safe_float(val, default=0.0):
    """Convert any value to float safely."""
    if val is None or val == "":
        return default
    if isinstance(val, (int, float, np.integer, np.floating)):
        return float(val)
    if isinstance(val, (list, np.ndarray)):
        try:
            return float(np.array(val).flatten()[0])
        except Exception:
            return default
    if isinstance(val, str):
        val = val.strip().replace("[", "").replace("]", "")
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def get_risk_level(prob):
    if prob >= FRAUD_THRESHOLD:
        return "High"
    if prob >= 0.3:
        return "Medium"
    return "Low"


def extract_shap_values(input_df):
    """
    Extract SHAP values as a clean 1D numpy array.
    Handles all SHAP versions:
      - shap >= 0.40: explainer(df) returns Explanation with .values
      - shap <  0.40: explainer.shap_values(df) returns list or ndarray
    """
    n = len(feature_names)

    # ── Try new API first (shap >= 0.40) ──────────────────────────────────────
    try:
        explanation = explainer(input_df)
        vals = np.array(explanation.values)

        # Shape (1, n_features, n_classes) — multioutput
        if vals.ndim == 3:
            sv = vals[0, :, 1]          # class 1 = fraud, row 0
        # Shape (1, n_features)
        elif vals.ndim == 2:
            sv = vals[0, :]
        # Shape (n_features,)
        else:
            sv = vals.flatten()

        return sv.flatten()[:n].astype(float)

    except Exception:
        pass

    # ── Fallback: old API ──────────────────────────────────────────────────────
    try:
        raw = explainer.shap_values(input_df)

        if isinstance(raw, list):
            # list[class0_array, class1_array]
            arr = np.array(raw[1] if len(raw) > 1 else raw[0])
        else:
            arr = np.array(raw)

        return arr.flatten()[:n].astype(float)

    except Exception as e:
        print(f"SHAP extraction failed: {e}")
        return np.zeros(n, dtype=float)


def build_input_df(data):
    """Build a properly typed DataFrame row from request data."""
    v_keys   = [f"V{i}" for i in range(1, 29)]
    missing  = [k for k in v_keys if data.get(k) in (None, "", [])]
    sim_vals = simulate_v_features() if missing else {}

    row = {}
    for f in feature_names:
        raw = data.get(f)
        if raw not in (None, "", []):
            row[f] = safe_float(raw)
        else:
            row[f] = sim_vals.get(f, 0.0)

    return pd.DataFrame([row]), bool(missing)


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def home():
    return jsonify({"status": "FraudGuard API is running"})


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400
    success, msg = register_user(username, password)
    if success:
        return jsonify({"message": msg}), 201
    return jsonify({"error": msg}), 400


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    if not username or not password:
        return jsonify({"error": "Username and password are required."}), 400
    user = verify_user(username, password)
    if not user:
        return jsonify({"error": "Invalid credentials."}), 401
    token = create_access_token(identity=str(user["id"]))
    return jsonify({
        "token":        token,
        "access_token": token,
        "username":     username
    }), 200


@app.route("/api/predict", methods=["POST"])
@jwt_required()
def predict():
    if model is None:
        return jsonify({"error": "Model not loaded. Run model_training.py first."}), 503

    user_id = int(get_jwt_identity())
    data    = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "JSON body is required."}), 400

    try:
        input_df, simulated = build_input_df(data)

        # Scale Amount and Time
        input_df[["Amount", "Time"]] = scaler.transform(input_df[["Amount", "Time"]])

        # Predict
        proba    = model.predict_proba(input_df)          # shape (1, 2)
        prob     = float(proba[0][1])
        is_fraud = int(prob >= FRAUD_THRESHOLD)

        # SHAP
        sv          = extract_shap_values(input_df)
        top_idx     = np.argsort(np.abs(sv))[-5:][::-1]
        top_reasons = [
            {"feature": feature_names[i], "impact": round(float(sv[i]), 4)}
            for i in top_idx
        ]

        # Persist
        amount   = safe_float(data.get("Amount", 0))
        time_val = safe_float(data.get("Time",   0))
        conn = get_connection()
        conn.execute(
            """INSERT INTO transactions
               (user_id, amount, time, fraud_probability, is_fraud, top_reasons)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, amount, time_val, prob, is_fraud, json.dumps(top_reasons))
        )
        conn.commit()
        conn.close()

        return jsonify({
            "fraud_probability":  round(prob * 100, 2),
            "is_fraud":           bool(is_fraud),
            "risk_level":         get_risk_level(prob),
            "top_reasons":        top_reasons,
            "simulated_features": simulated,
            "threshold_used":     FRAUD_THRESHOLD
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400


@app.route("/api/batch_predict", methods=["POST"])
@jwt_required()
def batch_predict():
    if model is None:
        return jsonify({"error": "Model not loaded."}), 503
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Send a CSV as field 'file'."}), 400

    user_id = int(get_jwt_identity())

    try:
        raw_csv = request.files["file"].read().decode("utf-8")
        df      = pd.read_csv(io.StringIO(raw_csv))
    except Exception:
        return jsonify({"error": "Could not parse CSV. Ensure it is valid UTF-8."}), 400

    # Fill missing columns
    sim = simulate_v_features()
    for col in [f"V{i}" for i in range(1, 29)]:
        if col not in df.columns:
            df[col] = sim[col]
    for col in ["Amount", "Time"]:
        if col not in df.columns:
            df[col] = 0.0

    try:
        inp = df[feature_names].copy().fillna(0.0)
        inp[["Amount", "Time"]] = scaler.transform(inp[["Amount", "Time"]])
        probs = model.predict_proba(inp)[:, 1]
    except Exception as e:
        return jsonify({"error": f"Batch prediction failed: {e}"}), 400

    results = []
    conn    = get_connection()
    for i, prob in enumerate(probs):
        p        = float(prob)
        is_fraud = int(p >= FRAUD_THRESHOLD)
        amount   = float(df["Amount"].iloc[i])
        time_val = float(df["Time"].iloc[i])
        results.append({
            "row":               i + 1,
            "amount":            amount,
            "fraud_probability": round(p * 100, 2),
            "is_fraud":          bool(is_fraud),
            "risk_level":        get_risk_level(p)
        })
        conn.execute(
            """INSERT INTO transactions
               (user_id, amount, time, fraud_probability, is_fraud, top_reasons)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, amount, time_val, p, is_fraud, json.dumps([]))
        )
    conn.commit()
    conn.close()

    return jsonify({
        "total_rows":      len(results),
        "high_risk_count": sum(1 for r in results if r["risk_level"] == "High"),
        "results":         results
    })


@app.route("/api/transactions", methods=["GET"])
@jwt_required()
def get_transactions():
    user_id     = int(get_jwt_identity())
    risk_filter = request.args.get("risk", "").strip()
    conn        = get_connection()

    if risk_filter == "High":
        rows = conn.execute(
            "SELECT * FROM transactions WHERE user_id=? AND fraud_probability>=?"
            " ORDER BY created_at DESC LIMIT 50",
            (user_id, FRAUD_THRESHOLD)
        ).fetchall()
    elif risk_filter == "Medium":
        rows = conn.execute(
            "SELECT * FROM transactions WHERE user_id=?"
            " AND fraud_probability>=0.3 AND fraud_probability<?"
            " ORDER BY created_at DESC LIMIT 50",
            (user_id, FRAUD_THRESHOLD)
        ).fetchall()
    elif risk_filter == "Low":
        rows = conn.execute(
            "SELECT * FROM transactions WHERE user_id=? AND fraud_probability<0.3"
            " ORDER BY created_at DESC LIMIT 50",
            (user_id,)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM transactions WHERE user_id=?"
            " ORDER BY created_at DESC LIMIT 50",
            (user_id,)
        ).fetchall()

    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/stats", methods=["GET"])
@jwt_required()
def get_stats():
    user_id = int(get_jwt_identity())
    conn    = get_connection()

    total = conn.execute(
        "SELECT COUNT(*) as c FROM transactions WHERE user_id=?",
        (user_id,)
    ).fetchone()["c"]

    fraudulent = conn.execute(
        "SELECT COUNT(*) as c FROM transactions WHERE user_id=? AND is_fraud=1",
        (user_id,)
    ).fetchone()["c"]

    avg_prob = conn.execute(
        "SELECT AVG(fraud_probability) as a FROM transactions WHERE user_id=?",
        (user_id,)
    ).fetchone()["a"] or 0.0

    alerts = conn.execute(
        "SELECT COUNT(*) as c FROM transactions"
        " WHERE user_id=? AND fraud_probability>=?"
        " AND created_at >= datetime('now','-1 day')",
        (user_id, FRAUD_THRESHOLD)
    ).fetchone()["c"]

    conn.close()
    return jsonify({
        "total_checked":        total,
        "fraudulent":           fraudulent,
        "legitimate":           total - fraudulent,
        "avg_risk_score":       round(float(avg_prob) * 100, 1),
        "high_risk_alerts_24h": alerts
    })


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    load_artifacts()
    app.run(debug=True, port=5000)