"""
generate_synthetic_docs.py
Generates 25 supplier documents, computes 384-dimensional embeddings, and saves to MongoDB.
"""
import os
import random
from datetime import datetime, timedelta
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
import dns.resolver

# Fix DNS for Windows SRV lookups (Google DNS)
dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
dns.resolver.default_resolver.nameservers = ['8.8.8.8', '8.8.4.4']

# Load env vars from the root directory
load_dotenv(dotenv_path="../.env")

MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI not found in .env file")

print("Loading SentenceTransformer model (all-MiniLM-L6-v2)...")
# This creates 384-dimensional embeddings
model = SentenceTransformer("all-MiniLM-L6-v2")

print("Connecting to MongoDB...")
client = MongoClient(MONGO_URI)
db = client.get_default_database()
supplier_docs_col = db["supplier_docs"]
suppliers_col = db["suppliers"]

# Fetch existing suppliers to link docs
suppliers = list(suppliers_col.find())
if not suppliers:
    raise ValueError("No suppliers found in DB. Run Node seed script first.")

# ── Document Templates ────────────────────────────────────────────────────────
INVOICE_TEMPLATES = [
    "Invoice #{id}: Order for {qty} units of {sku}. Total amount: ${amount}. Payment terms: {terms}. Discount applied: {discount}%.",
    "Fulfillment Invoice #{id} - {sku} x {qty}. Grand total: ${amount} ({terms}). Includes volume discount of {discount}%.",
    "Billing Statement #{id} for {qty}x {sku}. Final amount: ${amount} on {terms} terms. We applied a {discount}% wholesale discount."
]

NEGOTIATION_TEMPLATES = [
    "Re: Pricing for {sku}. We can offer a {discount}% discount on your next order of {qty}+ units. Total would be ${amount}. Outcome: {outcome}.",
    "Discussion regarding {sku} volume pricing. If you order {qty} units, we can drop the price by {discount}%, bringing the total to ${amount}. Outcome: {outcome}.",
    "Follow-up on {sku} restock. We cannot offer a {discount}% discount right now, but we can fulfill {qty} units for ${amount}. Outcome: {outcome}."
]

SKUS = ["ELEC-001", "ELEC-002", "HOME-001", "HOME-002", "SPRT-001", "SPRT-002", "OFFC-001", "OFFC-002"]

docs = []
doc_id_counter = 1000

for i in range(25):
    supplier = random.choice(suppliers)
    sku = random.choice(SKUS)
    qty = random.choice([50, 100, 200, 500])
    discount = random.choice([0, 5, 10, 15])
    amount = qty * random.uniform(10.0, 80.0)
    outcome = random.choice(["accepted", "rejected", "pending"])
    doc_type = random.choice(["invoice", "negotiation_email"])
    
    date = datetime.now() - timedelta(days=random.randint(1, 180))
    
    if doc_type == "invoice":
        content = random.choice(INVOICE_TEMPLATES).format(
            id=doc_id_counter, qty=qty, sku=sku, amount=round(amount, 2), 
            terms=supplier.get("payment_terms", "NET30"), discount=discount
        )
        title = f"Invoice #{doc_id_counter} - {sku}"
        outcome = "accepted"
    else:
        content = random.choice(NEGOTIATION_TEMPLATES).format(
            sku=sku, discount=discount, qty=qty, amount=round(amount, 2), outcome=outcome
        )
        title = f"Email Thread: Pricing for {sku}"
        
    doc_id_counter += 1
    
    # Generate vector embedding for the content
    embedding = model.encode(content).tolist()
    
    docs.append({
        "supplier_id": supplier["_id"],
        "doc_type": doc_type,
        "title": title,
        "content": content,
        "metadata": {
            "product_sku": sku,
            "date": date,
            "amount": round(amount, 2),
            "discount_pct": discount,
            "outcome": outcome
        },
        "embedding": embedding,
        "created_at": datetime.now()
    })

print("Clearing old supplier_docs...")
supplier_docs_col.delete_many({})

print(f"Inserting {len(docs)} embedded documents...")
supplier_docs_col.insert_many(docs)

print("\n[DONE] Successfully generated and embedded 25 supplier documents.")
