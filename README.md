# 🛡️ FraudGuard — Credit Card Fraud Detection System

A full-stack machine learning web application for real-time credit card fraud detection. Built with Flask, React, XGBoost, and SHAP explainability.

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![Flask](https://img.shields.io/badge/Flask-3.0-black?style=flat-square&logo=flask)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![XGBoost](https://img.shields.io/badge/XGBoost-2.1.4-orange?style=flat-square)


---

## 📸 Features

- 🔐 **JWT Authentication** — Register, login, auto-logout on token expiry
- 🤖 **XGBoost ML Model** — Trained on the UCI Credit Card Fraud dataset (284,807 transactions)
- 📊 **SHAP Explanations** — Visual bar chart showing top contributing factors for every prediction
- 🎯 **Risk Meter** — Animated progress bar with Low / Medium / High colour coding
- 📋 **Dashboard** — Live stats, fraud vs legitimate pie chart, risk score bar chart
- 🔍 **Filter Transactions** — Filter history by High / Medium / Low risk
- 📤 **Batch CSV Upload** — Score multiple transactions at once
- 💾 **Export CSV** — Download your transaction history
- ⚙️ **Auto-simulation** — V1–V28 features auto-simulated if not provided
- 🚨 **24h Alert Banner** — Highlights high-risk activity in the last 24 hours

---

## 🏗️ Project Structure

```
ccfd-app/
├── backend/
│   ├── app.py                 # Flask API — all routes
│   ├── model_training.py      # XGBoost training script
│   ├── database.py            # SQLite setup
│   ├── auth.py                # JWT auth helpers
│   ├── requirements.txt
│   ├── creditcard.csv         # ← you provide this
│   └── models/                # ← generated after training
│       ├── xgb_model.pkl
│       ├── scaler.pkl
│       └── feature_names.pkl
│
└── frontend/
    ├── index.html
    ├── package.json
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── services/
        │   └── api.js              # Axios instance + JWT interceptor
        ├── components/
        │   ├── Navbar.jsx
        │   ├── StatsCard.jsx
        │   └── TransactionTable.jsx
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            └── TransactionCheck.jsx
```

---

## 🔌 API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/register` | ❌ | Create new user |
| POST | `/api/login` | ❌ | Login, returns JWT |
| POST | `/api/predict` | ✅ | Single transaction prediction |
| POST | `/api/batch_predict` | ✅ | Batch CSV prediction |
| GET | `/api/transactions` | ✅ | Transaction history (filterable) |
| GET | `/api/stats` | ✅ | Dashboard statistics |

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Recharts, Axios |
| Backend | Flask 3, Flask-JWT-Extended, Flask-CORS |
| ML Model | XGBoost 2.1.4, scikit-learn, imbalanced-learn (SMOTE) |
| Explainability | SHAP 0.49.1 |
| Database | SQLite |
| Auth | JWT (JSON Web Tokens) |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- `creditcard.csv` from [Kaggle — Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)

---

### 1. Clone the repo

```bash
git clone https://github.com/your-username/ccfd-app.git
cd ccfd-app
```

---

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
.\venv\Scripts\Activate.ps1

# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

### 3. Add the dataset

Download `creditcard.csv` from [Kaggle](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud) and place it in:

```
ccfd-app/backend/creditcard.csv
```

> **Note:** If your CSV has an `id` column instead of `Time`, the training script handles it automatically.

---

### 4. Train the model

```bash
python model_training.py
```

Optional arguments:
```bash
python model_training.py --strategy class_weight --threshold 0.5
```

| Argument | Default | Options |
|----------|---------|---------|
| `--csv` | `creditcard.csv` | path to CSV |
| `--strategy` | `smote` | `smote`, `class_weight` |
| `--threshold` | `0.7` | 0.0 – 1.0 |

Training takes ~5–10 minutes. You'll see precision, recall, F1, AUC-ROC, and a confusion matrix on completion.

---

### 5. Start the backend

```bash
python app.py
```

Backend runs at: `http://localhost:5000`

---

### 6. Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🧪 Testing the API (PowerShell)

```powershell
# Register
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/register" `
  -Method POST -ContentType "application/json" `
  -Body '{"username":"testuser","password":"test1234"}'

# Login and save token
$res   = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"username":"testuser","password":"test1234"}'
$token = $res.token

# Predict (Amount + Time only — V1-V28 auto-simulated)
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/predict" `
  -Method POST -ContentType "application/json" `
  -Headers @{Authorization="Bearer $token"} `
  -Body '{"Amount":100,"Time":50}'

# Stats
Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/stats" `
  -Method GET -Headers @{Authorization="Bearer $token"}
```

---

## 🧠 Model Details

| Property | Value |
|----------|-------|
| Algorithm | XGBoost (Gradient Boosted Trees) |
| Dataset | UCI Credit Card Fraud (284,807 transactions) |
| Features | V1–V28 (PCA), Amount, Time |
| Class Imbalance | Handled with SMOTE |
| Fraud Threshold | 0.7 (configurable via env var) |
| Explainability | SHAP TreeExplainer |

### Changing the fraud threshold at runtime

```powershell
# Windows PowerShell
$env:FRAUD_THRESHOLD="0.5"; python app.py

# Mac/Linux
FRAUD_THRESHOLD=0.5 python app.py
```

---

## 📊 Sample Prediction Response

```json
{
  "fraud_probability": 94.73,
  "is_fraud": true,
  "risk_level": "High",
  "threshold_used": 0.7,
  "simulated_features": false,
  "top_reasons": [
    { "feature": "V14", "impact": -0.8312 },
    { "feature": "V4",  "impact":  0.6201 },
    { "feature": "V12", "impact": -0.5934 },
    { "feature": "V10", "impact": -0.4102 },
    { "feature": "V11", "impact":  0.3871 }
  ]
}
```

---

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FRAUD_THRESHOLD` | `0.7` | Minimum probability to classify as fraud |
| `JWT_SECRET_KEY` | hardcoded | Change in production |

---

## ⚠️ Known Issues & Notes

- `creditcard.csv` is not included in the repo (144MB) — download from Kaggle
- Always **retrain** after changing XGBoost version — `.pkl` format changes between versions
- JWT tokens expire after **15 minutes** — re-login to get a fresh token
- SHAP explanation adds ~1–2 seconds per prediction (computed server-side)

---



---

## 🙏 Acknowledgements

- Dataset: [ULB Machine Learning Group](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)
- SHAP: [Scott Lundberg et al.](https://github.com/slundberg/shap)
- XGBoost: [Chen & Guestrin](https://github.com/dmlc/xgboost)
