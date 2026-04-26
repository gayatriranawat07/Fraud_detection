"""
model_training.py — Train XGBoost fraud detection model.
Usage:
    python model_training.py
    python model_training.py --strategy class_weight --threshold 0.5
"""

import argparse
import os
import pickle

import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.metrics import (
    classification_report, confusion_matrix,
    f1_score, precision_score, recall_score, roc_auc_score
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier


def train_model(csv_path="creditcard.csv", balance_strategy="smote", fraud_threshold=0.7):
    print(f"\n{'='*55}")
    print(f"  FraudGuard Model Training")
    print(f"  Strategy : {balance_strategy}  |  Threshold : {fraud_threshold}")
    print(f"{'='*55}\n")

    # ── Load data ──────────────────────────────────────────────────────────────
    print("Loading dataset...")
    df = pd.read_csv(csv_path)

    # Fix: some Kaggle versions use 'id' instead of 'Time'
    if 'id' in df.columns and 'Time' not in df.columns:
        df = df.rename(columns={'id': 'Time'})
        print("  [fix] Renamed column 'id' -> 'Time'")

    # Fix: drop any unnamed index columns
    unnamed = [c for c in df.columns if c.startswith("Unnamed")]
    if unnamed:
        df = df.drop(columns=unnamed)
        print(f"  [fix] Dropped unnamed columns: {unnamed}")

    # Validate required columns
    required = [f"V{i}" for i in range(1, 29)] + ["Amount", "Time", "Class"]
    missing  = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"CSV is missing required columns: {missing}\n"
                         f"Found columns: {list(df.columns)}")

    X = df.drop("Class", axis=1)
    y = df["Class"]

    print(f"Rows  : {len(df):,}")
    print(f"Fraud : {y.sum():,}  ({y.mean()*100:.3f}%)")
    print(f"Cols  : {list(X.columns)}\n")

    # ── Scale Amount and Time ──────────────────────────────────────────────────
    scaler = StandardScaler()
    X[["Amount", "Time"]] = scaler.fit_transform(X[["Amount", "Time"]])

    # ── Train/test split BEFORE balancing ─────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # ── Balance training data ──────────────────────────────────────────────────
    if balance_strategy == "smote":
        print("Applying SMOTE...")
        sm = SMOTE(random_state=42)
        X_train, y_train = sm.fit_resample(X_train, y_train)
        scale_pos_weight = 1
        print(f"After SMOTE — 0: {(y_train==0).sum():,}  1: {(y_train==1).sum():,}\n")
    else:
        print("Using scale_pos_weight strategy...")
        neg = (y_train == 0).sum()
        pos = (y_train == 1).sum()
        scale_pos_weight = neg / pos
        print(f"scale_pos_weight = {scale_pos_weight:.2f}\n")

    # ── Train ──────────────────────────────────────────────────────────────────
    print("Training XGBoost...")
    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        scale_pos_weight=scale_pos_weight,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
        tree_method="hist",
    )
    model.fit(X_train, y_train)
    print("Training complete.\n")

    # ── Evaluate ───────────────────────────────────────────────────────────────
    y_prob = model.predict_proba(X_test)[:, 1]
    y_pred = (y_prob >= fraud_threshold).astype(int)

    print(f"{'='*55}")
    print(f"  Evaluation  (threshold = {fraud_threshold})")
    print(f"{'='*55}")
    print(classification_report(y_test, y_pred, target_names=["Legit", "Fraud"]))

    prec = precision_score(y_test, y_pred, zero_division=0)
    rec  = recall_score(y_test, y_pred, zero_division=0)
    f1   = f1_score(y_test, y_pred, zero_division=0)
    auc  = roc_auc_score(y_test, y_prob)

    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1        : {f1:.4f}")
    print(f"  AUC-ROC   : {auc:.4f}")

    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    print(f"\n  Confusion Matrix:")
    print(f"  {'':14s}  Pred Legit   Pred Fraud")
    print(f"  {'Actual Legit':14s}  TN={tn:<10}   FP={fp}")
    print(f"  {'Actual Fraud':14s}  FN={fn:<10}   TP={tp}")
    print(f"{'='*55}\n")

    # ── Save ───────────────────────────────────────────────────────────────────
    os.makedirs("models", exist_ok=True)
    with open("models/xgb_model.pkl", "wb") as f:
        pickle.dump(model, f)
    with open("models/scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)
    with open("models/feature_names.pkl", "wb") as f:
        pickle.dump(list(X.columns), f)

    print("Model saved to models/")
    print("  models/xgb_model.pkl")
    print("  models/scaler.pkl")
    print("  models/feature_names.pkl\n")

    return model, scaler


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train FraudGuard XGBoost model")
    parser.add_argument("--csv",       default="creditcard.csv",  help="Path to dataset CSV")
    parser.add_argument("--strategy",  default="smote",           help="smote | class_weight")
    parser.add_argument("--threshold", default=0.7, type=float,   help="Fraud decision threshold")
    args = parser.parse_args()
    train_model(args.csv, args.strategy, args.threshold)