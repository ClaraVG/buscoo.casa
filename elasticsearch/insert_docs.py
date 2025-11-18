from elasticsearch import Elasticsearch
from sentence_transformers import SentenceTransformer

# Initialize client
es = Elasticsearch("http://localhost:9200")
INDEX_NAME = "items_index"

# Load embedding model for recommendations & clustering
model = SentenceTransformer("all-MiniLM-L6-v2")

# Example dataset
documents = [
    {
        "id": 1,
        "title": "Red Gaming Keyboard",
        "description": "Mechanical keyboard with red LED lighting.",
        "category": "electronics",
        "price": 49.99
    },
    {
        "id": 2,
        "title": "Blue Office Chair",
        "description": "Comfortable ergonomic chair.",
        "category": "furniture",
        "price": 129.99
    },
]

def insert_documents():
    for doc in documents:
        text_for_embedding = doc["title"] + " " + doc["description"]
        doc_embedding = model.encode(text_for_embedding).tolist()
        
        body = doc.copy()
        body["embedding"] = doc_embedding

        es.index(index=INDEX_NAME, id=doc["id"], body=body)
        print(f"Inserted document ID {doc['id']}")

if __name__ == "__main__":
    insert_documents()