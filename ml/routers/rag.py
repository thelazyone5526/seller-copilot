import os
from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel
from openai import OpenAI  # Groq uses OpenAI-compatible API
from pymongo import MongoClient

router = APIRouter()


class GenerateEmailRequest(BaseModel):
    product_context: Dict[str, Any]
    supplier_context: Dict[str, Any]
    supplier_id: str
    action_type: str  # "initial_request" | "price_negotiation"


def _get_query_embedding(text: str, openai_client: OpenAI) -> list:
    """Use OpenAI API for embeddings — no heavy local model needed."""
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding


def _generate_with_llm(pc: Dict, sc: Dict, supplier_id: str, action_type: str) -> str:
    groq_api_key   = os.getenv("GROQ_API_KEY")
    openai_api_key = os.getenv("OPENAI_API_KEY")
    mongo_uri      = os.getenv("MONGO_URI")

    if not groq_api_key or groq_api_key == "paste_your_groq_key_here":
        return "[Error: Missing GROQ_API_KEY — add it to your .env]"

    # --- 1. Vector Search Retrieval (optional, skipped if OpenAI quota exceeded) ---
    context_str = "No past documents found for this supplier."
    if openai_api_key and mongo_uri:
        try:
            from bson import ObjectId
            openai_client = OpenAI(api_key=openai_api_key)
            mongo_client  = MongoClient(mongo_uri)
            db = mongo_client.get_default_database()

            query_text = (
                f"pricing and volume negotiation for {pc.get('name')} {pc.get('sku')}"
                if action_type == "price_negotiation"
                else f"invoice and stock for {pc.get('name')} {pc.get('sku')}"
            )
            query_vector = _get_query_embedding(query_text, openai_client)

            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "supplier_vector_index",
                        "path": "embedding",
                        "queryVector": query_vector,
                        "numCandidates": 10,
                        "limit": 3,
                        "filter": {"supplier_id": ObjectId(supplier_id)}
                    }
                },
                {"$project": {"content": 1, "score": {"$meta": "vectorSearchScore"}}}
            ]

            retrieved_docs = list(db.supplier_docs.aggregate(pipeline))
            if retrieved_docs:
                context_str = "\n".join([f"- {doc['content']}" for doc in retrieved_docs])
        except Exception as e:
            print(f"Vector Search skipped: {e}")

    # --- 2. LLM Generation via Groq (free, fast, OpenAI-compatible) ---
    if action_type == "initial_request":
        prompt = f"""You are an expert procurement manager writing to a supplier.
Write an urgent, professional email to {sc.get("contact_name", "the supplier")} at {sc.get("name", "their company")}.

Context:
- Product: {pc.get("name")} (SKU: {pc.get("sku")})
- We only have {pc.get("current_stock")} units left.
- We need to urgently order {pc.get("suggested_reorder_qty")} units.
- Our payment terms are {sc.get("payment_terms", "NET30")}.

Past Context from Supplier Documents:
{context_str}

Instructions:
1. Include a clear subject line starting with "Subject: "
2. Ask for availability, dispatch date, and if volume pricing applies.
3. Be professional but firm about the urgency.
4. Keep it under 150 words. Output only the email, nothing else."""
    else:
        prompt = f"""You are an expert procurement manager writing to a supplier.
Write a price negotiation email to {sc.get("contact_name", "the supplier")} at {sc.get("name", "their company")}.

Context:
- Product: {pc.get("name")} (SKU: {pc.get("sku")})
- We are planning to order {pc.get("suggested_reorder_qty")} units.
- Our payment terms are {sc.get("payment_terms", "NET30")}.

Past Context from Supplier Documents:
{context_str}

Instructions:
1. Include a clear subject line starting with "Subject: "
2. Ask for a better price due to volume and long relationship.
3. Ask to schedule a brief call this week.
4. Keep it under 150 words. Output only the email, nothing else."""

    try:
        groq_client = OpenAI(
            api_key=groq_api_key,
            base_url="https://api.groq.com/openai/v1"
        )
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=300,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq Error: {str(e)}. Falling back to templates.")
        if action_type == "initial_request":
            return f"""Subject: Urgent Restock Request — {pc.get("name", "Product")} ({pc.get("sku", "N/A")})

Dear {sc.get("contact_name", "Procurement Team")},

We urgently need to order {pc.get("suggested_reorder_qty")} units of {pc.get("name")}. 
Our current inventory has fallen to {pc.get("current_stock")} units.

Given our {sc.get("payment_terms", "NET30")} payment terms, please confirm availability and earliest dispatch date.

Best regards,
Seller Copilot"""
        else:
            return f"""Subject: Pricing Review Request — {pc.get("name", "Product")} ({pc.get("sku", "N/A")})

Dear {sc.get("contact_name", "Procurement Team")},

We are planning to order {pc.get("suggested_reorder_qty")} units of {pc.get("name")}. Given our order volume, could we discuss improved pricing? Can we schedule a call this week?

Best regards,
Seller Copilot"""


@router.post("/rag/generate-email")
def generate_email(payload: GenerateEmailRequest) -> Dict:
    pc = payload.product_context
    sc = payload.supplier_context
    draft = _generate_with_llm(pc, sc, payload.supplier_id, payload.action_type)
    return {
        "draft_email": draft,
        "action_type": payload.action_type,
        "supplier_id": payload.supplier_id,
    }
