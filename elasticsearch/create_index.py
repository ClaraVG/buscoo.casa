from elasticsearch import Elasticsearch

# Initialize client
es = Elasticsearch("http://localhost:9200")

INDEX_NAME = "items_index"

# Index mapping with category field and vector field (optional for clustering)
mapping = {
    "mappings": {
        "properties": {
            "title": {"type": "text"},
            "description": {"type": "text"},
            "category": {"type": "keyword"},
            "price": {"type": "float"},
            # Optional vector field for clustering / recommendations
            "embedding": {
                "type": "dense_vector",
                "dims": 384
            }
        }
    }
}

def create_index():
    if es.indices.exists(INDEX_NAME):
        print(f"Index {INDEX_NAME} already exists.")
    else:
        es.indices.create(index=INDEX_NAME, body=mapping)
        print(f"Index {INDEX_NAME} created successfully.")

if __name__ == "__main__":
    create_index()