from elasticsearch import Elasticsearch

# Inicializar cliente
es = Elasticsearch("http://localhost:9200")

INDEX_NAME = "pisos_index"

# Mapping adaptado con embedding y campos de pisos
{
  "mappings": {
    "properties": {
      "url": { "type": "keyword" },
      "listing_id": { "type": "keyword" },
      "price_eur": { "type": "float" },

      "title": { "type": "text" },

      "rooms": { "type": "integer" },
      "bathrooms": { "type": "integer" },
      "surface_m2": { "type": "float" },
      "floor": { "type": "keyword" },

      "has_elevator": { "type": "boolean" },
      "is_exterior": { "type": "boolean" },

      "neighborhood": { "type": "keyword" },

      "images": { "type": "keyword" }
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