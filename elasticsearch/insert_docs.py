from elasticsearch import Elasticsearch, helpers
import json

# Elasticsearch connection
es = Elasticsearch("http://localhost:9200")
INDEX_NAME = "pisos_index"

def load_jsonl(file_path):
    docs = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            docs.append(json.loads(line))
    return docs

def insert_docs(file_path):
    docs = load_jsonl(file_path)
    actions = []
    for doc in docs:
        # Normalizamos los campos que podrían dar problemas con el mapping
        doc["published_at"] = doc.get("published_at") or "1970-01-01T00:00:00Z"
        doc["latitude"] = float(doc.get("latitude") or 0.0)
        doc["longitude"] = float(doc.get("longitude") or 0.0)

        action = {
            "_index": INDEX_NAME,
            "_id": doc.get("listing_id"),
            "_source": doc
        }
        actions.append(action)

    # Bulk insert
    helpers.bulk(es, actions)
    print(f"Inserted {len(actions)} documents into {INDEX_NAME}")

if __name__ == "__main__":
    jsonl_file = "../buscoocasa/data/pisos_a_coruna.jsonl"
    insert_docs(jsonl_file)
