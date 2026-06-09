"""
train.py -- Train XGBoost demand model on real retail pricing data.
Run from the ml/ directory: python train.py
Output: ml/model.pkl

Dataset: retail_price.csv (676 rows, real Brazilian e-commerce data)
Target: qty (units sold) -- we learn demand as a function of price & context
Cost proxy: freight_price (actual fulfillment cost per unit)
"""
import os
import pickle
import numpy as np
import pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split

# ── Load real dataset ──────────────────────────────────────────────────────────
CSV_PATH = r"C:\Users\anshk\Downloads\retail_price.csv"

print(f"[1/4] Loading dataset from {CSV_PATH} ...")
df = pd.read_csv(CSV_PATH)
print(f"      Loaded {len(df)} rows x {len(df.columns)} columns")

# ── Feature Engineering ────────────────────────────────────────────────────────
# cost_price: use freight_price as the fulfillment cost proxy
# (actual margin = unit_price - freight_price)
df["cost_price"] = df["freight_price"]

# Clip qty outliers (99th percentile) to reduce noise
df["qty"] = df["qty"].clip(upper=df["qty"].quantile(0.99))

# ── Feature columns (same names as the ML router expects) ─────────────────────
FEATURE_COLS = [
    "unit_price", "cost_price", "customers", "holiday", "weekday", "weekend",
    "comp_1", "comp_2", "comp_3", "ps1", "ps2", "ps3",
    "fp1", "fp2", "fp3", "lag_price", "volume", "product_score",
]

X = df[FEATURE_COLS]
y = df["qty"]   # demand

print(f"[2/4] Features: {FEATURE_COLS}")
print(f"      Target  : qty (demand)")
print(f"      y range : {y.min():.0f} – {y.max():.0f} units")

# ── Train / Validation Split ───────────────────────────────────────────────────
X_train, X_val, y_train, y_val = train_test_split(
    X, y, test_size=0.15, random_state=42
)

# ── Train XGBoost ──────────────────────────────────────────────────────────────
print("[3/4] Training XGBoost model ...")
model = XGBRegressor(
    n_estimators=300,
    max_depth=4,
    learning_rate=0.08,
    colsample_bytree=0.8,
    subsample=0.85,
    min_child_weight=3,
    random_state=42,
    verbosity=0,
)
model.fit(
    X_train, y_train,
    eval_set=[(X_val, y_val)],
    verbose=False,
)

# ── Evaluate ───────────────────────────────────────────────────────────────────
val_preds = model.predict(X_val)
mae = np.mean(np.abs(val_preds - y_val))
sample_pred = model.predict(X.iloc[:1])[0]

print(f"      Val MAE          : {mae:.2f} units")
print(f"      Sample prediction: {sample_pred:.1f} units demand")

# Feature importance (top 5)
importances = pd.Series(model.feature_importances_, index=FEATURE_COLS)
print("\n      Top 5 features by importance:")
for feat, imp in importances.nlargest(5).items():
    print(f"        {feat:<20} {imp:.4f}")

# ── Save model + feature list ──────────────────────────────────────────────────
MODEL_PATH = "model.pkl"
with open(MODEL_PATH, "wb") as f:
    pickle.dump({"model": model, "feature_cols": FEATURE_COLS}, f)

print(f"\n[4/4] Saved -> {MODEL_PATH}")
print("      Restart FastAPI server to load the new model.")
