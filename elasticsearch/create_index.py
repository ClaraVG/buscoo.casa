from elasticsearch import Elasticsearch

# Initialize client
es = Elasticsearch("http://localhost:9200")

INDEX_NAME = "pisos_index"

# Index mapping with category field and vector field
mapping = {
    "mappings": {
        "properties": {
            "title": {"type": "text"},
            "description": {"type": "text"},
            "category": {"type": "keyword"},
            "price": {"type": "float"},
            "embedding": {
                "type": "dense_vector",
                "dims": 384
            }
        }
    }
}

def create_index():
    # FIX → use keyword argument: index=INDEX_NAME
    if es.indices.exists(index=INDEX_NAME):
        print(f"Index {INDEX_NAME} already exists.")
    else:
        # FIX → index, mappings must be keyword arguments
        es.indices.create(index=INDEX_NAME, body=mapping)
        print(f"Index {INDEX_NAME} created successfully.")

if __name__ == "__main__":
    create_index()
