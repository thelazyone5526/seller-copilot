from typing import Any, Dict

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI(title="Seller Copilot ML API")


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
    price_range_pct: float
    price_steps: int


class GenerateEmailRequest(BaseModel):
    product_context: Dict[str, Any]
    supplier_context: Dict[str, Any]
    supplier_id: str
    action_type: str


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/ml/optimize-price")
def optimize_price(payload: OptimizePriceRequest) -> Dict[str, float]:
    return {
        "recommended_price": 24.99,
        "predicted_demand": 87,
        "estimated_profit": 1131.13,
        "confidence_score": 0.82,
    }


@app.post("/rag/generate-email")
def generate_email(payload: GenerateEmailRequest) -> Dict[str, Any]:
    return {
        "message": "Generate supplier email draft (stub)",
        "draft_email": "Draft email placeholder.",
        "supplier_id": payload.supplier_id,
        "action_type": payload.action_type,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
