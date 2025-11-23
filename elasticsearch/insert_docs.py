from elasticsearch import Elasticsearch, helpers
import json

# Conexión a Elasticsearch
es = Elasticsearch("http://localhost:9200")
INDEX_NAME = "pisos_index"

def load_jsonl(file_path):
# Carga un archivo JSONL y devuelve una lista de pisos
    docs = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            docs.append(json.loads(line))
    return docs

def insert_docs(file_path):

# Inserta todos los pisos
    docs = load_jsonl(file_path)
    actions = []

    for doc in docs:
        action = {
            "_index": INDEX_NAME,
            "_id": doc.get("listing_id"),
            "_source": doc,
        }
        actions.append(action)

    helpers.bulk(es, actions)
    print(f"Inserted {len(actions)} documents into {INDEX_NAME}")

if __name__ == "__main__":
    jsonl_file = "../buscoocasa/data/pisos_a_coruna.jsonl"
    insert_docs(jsonl_file)
