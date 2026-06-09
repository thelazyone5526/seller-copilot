import os
from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel
import google.generativeai as genai
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer

router = APIRouter()

# Load SentenceTransformer once at startup
print("[RAG Router] Loading SentenceTransformer model...")
embedder = SentenceTransformer("all-MiniLM-L6-v2")

class GenerateEmailRequest(BaseModel):
    product_context: Dict[str, Any]
    supplier_context: Dict[str, Any]
    supplier_id: str
    action_type: str  # "initial_request" | "price_negotiation"

def _generate_with_llm(pc: Dict, sc: Dict, supplier_id: str, action_type: str) -> str:
    # Safely get the API key
    api_key = os.getenv("GEMINI_API_KEY")
    mongo_uri = os.getenv("MONGO_URI")
    
    if not api_key:
        return "[Error: Missing GEMINI_API_KEY in .env file. Add your key and restart FastAPI.]"
    if not mongo_uri:
        return "[Error: Missing MONGO_URI in .env file.]"

    # --- 1. Vector Search Retrieval ---
    try:
        from bson import ObjectId
        client = MongoClient(mongo_uri)
        db = client.get_default_database()
        
        # Determine query for vector search based on action type
        query_text = f"pricing and volume negotiation for {pc.get('name')} {pc.get('sku')}" if action_type == "price_negotiation" else f"invoice and stock for {pc.get('name')} {pc.get('sku')}"
        query_vector = embedder.encode(query_text).tolist()
        
        # Atlas Vector Search pipeline
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
            {
                "$project": {
                    "content": 1,
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]
        
        retrieved_docs = list(db.supplier_docs.aggregate(pipeline))
        context_str = "\n".join([f"- {doc['content']}" for doc in retrieved_docs])
        if not context_str:
            context_str = "No past documents found for this supplier."
            
    except Exception as e:
        print(f"Vector Search Error: {e}")
        context_str = "[Failed to retrieve past context due to Vector Search error.]"

    # --- 2. LLM Generation ---
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')

    if action_type == "initial_request":
        prompt = f"""
You are an expert procurement manager writing to a supplier.
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
3. Reference the past context if relevant (e.g., past discounts).
4. Be professional but firm about the urgency.
5. Keep it under 150 words.
"""
    else:
        prompt = f"""
You are an expert procurement manager writing to a supplier.
Write a price negotiation email to {sc.get("contact_name", "the supplier")} at {sc.get("name", "their company")}.

Context:
- Product: {pc.get("name")} (SKU: {pc.get("sku")})
- We are planning to order {pc.get("suggested_reorder_qty")} units.
- Our payment terms are {sc.get("payment_terms", "NET30")}.

Past Context from Supplier Documents:
{context_str}

Instructions:
1. Include a clear subject line starting with "Subject: "
2. Ask for a better price due to our order volume and long relationship.
3. Reference past negotiations or invoices from the provided context to strengthen our position.
4. Ask to schedule a brief call this week.
5. Keep it under 150 words.
"""

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        # Fallback to local templates if Gemini fails
        print(f"Gemini Error: {str(e)}. Falling back to local templates.")
        if action_type == "initial_request":
            return f"""Subject: Urgent Restock Request — {pc.get("name", "Product")} ({pc.get("sku", "N/A")})

Dear {sc.get("contact_name", "Procurement Team")},

We urgently need to order {pc.get("suggested_reorder_qty")} units of {pc.get("name")}. 
Our current inventory has fallen to {pc.get("current_stock")} units.

Given our existing {sc.get("payment_terms", "NET30")} payment terms, please confirm:
1. Availability of {pc.get("suggested_reorder_qty")} units
2. Earliest possible dispatch date
3. Any applicable volume pricing

Best regards,
Seller Copilot"""
        else:
            return f"""Subject: Pricing Review Request — {pc.get("name", "Product")} ({pc.get("sku", "N/A")})

Dear {sc.get("contact_name", "Procurement Team")},

We are planning to order {pc.get("suggested_reorder_qty")} units of {pc.get("name")}. 
Given the volume of this order and our long-standing relationship, we would like to explore whether improved pricing is available.

Could we schedule a brief call this week to discuss terms? 

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
