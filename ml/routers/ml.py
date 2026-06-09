import pickle
import numpy as np
from pathlib import Path
from typing import Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# ── Load model at startup ──────────────────────────────────────────────────────
MODEL_PATH = Path(__file__).parent.parent / "model.pkl"
_model = None
_feature_cols = []

try:
    with open(MODEL_PATH, "rb") as f:
        bundle = pickle.load(f)
    _model = bundle["model"]
    _feature_cols = bundle["feature_cols"]
    print(f"[ML Router] XGBoost model loaded from {MODEL_PATH}")
except FileNotFoundError:
    print(f"[ML Router] WARNING: model.pkl not found at {MODEL_PATH}. Run train.py first.")


class OptimizePriceRequest(BaseModel):
    unit_price: float
    cost_price: float
    customers: int
    holiday: int
    weekday: int
    weekend: int
    comp_1: float
    comp_2: float
    comp_3: float
    ps1: float
    ps2: float
    ps3: float
    fp1: float
    fp2: float
    fp3: float
    lag_price: float
    volume: int
    product_score: float
    price_range_pct: float = 0.30
    price_steps: int = 30


@router.post("/ml/optimize-price")
def optimize_price(payload: OptimizePriceRequest) -> Dict:
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run ml/train.py first.")

    base_price = payload.unit_price
    cost = payload.cost_price
    min_price = base_price * (1 - payload.price_range_pct)
    max_price = base_price * (1 + payload.price_range_pct)
    # Enforce minimum margin: price must be > cost
    min_price = max(min_price, cost * 1.05)
    candidate_prices = np.linspace(min_price, max_price, payload.price_steps)

    # Base feature dict (everything except unit_price)
    base = {
        "cost_price":    cost,
        "customers":     payload.customers,
        "holiday":       payload.holiday,
        "weekday":       payload.weekday,
        "weekend":       payload.weekend,
        "comp_1":        payload.comp_1,
        "comp_2":        payload.comp_2,
        "comp_3":        payload.comp_3,
        "ps1":           payload.ps1,
        "ps2":           payload.ps2,
        "ps3":           payload.ps3,
        "fp1":           payload.fp1,
        "fp2":           payload.fp2,
        "fp3":           payload.fp3,
        "lag_price":     payload.lag_price,
        "volume":        payload.volume,
        "product_score": payload.product_score,
    }

    results = []
    for price in candidate_prices:
        features = {**base, "unit_price": price}
        row = np.array([[features[k] for k in _feature_cols]])
        demand = float(max(0, _model.predict(row)[0]))
        profit = demand * (price - cost)
        results.append({"price": price, "demand": demand, "profit": profit})

    best = max(results, key=lambda x: x["profit"])

    # Confidence: 1 − (std / mean) of top-5 profits, clamped [0, 1]
    top5 = sorted([r["profit"] for r in results], reverse=True)[:5]
    mean_p = float(np.mean(top5))
    std_p = float(np.std(top5))
    confidence = float(np.clip(1.0 - (std_p / mean_p if mean_p > 0 else 0), 0.0, 1.0))

    return {
        "recommended_price": round(best["price"], 2),
        "predicted_demand":  round(best["demand"]),
        "estimated_profit":  round(best["profit"], 2),
        "confidence_score":  round(confidence, 4),
    }
