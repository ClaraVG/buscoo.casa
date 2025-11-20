from elasticsearch import Elasticsearch

# Inicializar cliente
es = Elasticsearch("http://localhost:9200")

INDEX_NAME = "pisos_index"

# Mapping adaptado con embedding y campos de pisos
mapping = {
    "mappings": {
        "properties": {
            "title": {"type": "text"},
            "description": {"type": "text"},
            "category": {"type": "keyword"},
            "price": {"type": "float"},
            "neighborhood": {"type": "keyword"},
            "rooms": {"type": "integer"},
            "bathrooms": {"type": "integer"},
            "surface_m2": {"type": "float"},
            "floor": {"type": "keyword"},
            "has_elevator": {"type": "boolean"},
            "is_exterior": {"type": "boolean"},
            "phone": {"type": "keyword"},
            "published_at": {"type": "date"},
            "latitude": {"type": "float"},
            "longitude": {"type": "float"},
            "images": {"type": "keyword"}
        }
    }
}

# def create_index():
#     if es.indices.exists(index=INDEX_NAME):
#         print(f"Index {INDEX_NAME} already exists.")
#     else:
#         es.indices.create(index=INDEX_NAME, body=mapping)
#         print(f"Index {INDEX_NAME} created successfully.")

def create_index():
    if es.indices.exists(index=INDEX_NAME):
        print(f"El índice {INDEX_NAME} ya existe. Borrándolo...")
        es.indices.delete(index=INDEX_NAME)
        print(f"Índice {INDEX_NAME} borrado.")

    es.indices.create(index=INDEX_NAME, body=mapping)
    print(f"Índice {INDEX_NAME} creado nuevamente con éxito.")

if __name__ == "__main__":
    create_index()