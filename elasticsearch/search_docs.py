from elasticsearch import Elasticsearch
from sentence_transformers import SentenceTransformer

es = Elasticsearch("http://localhost:9200")
INDEX_NAME = "pisos_index"
model = SentenceTransformer("all-MiniLM-L6-v2")

# ---- SEARCH WITH OPTIONAL FILTERS ---- #
def search_items(query, category=None, price_range=None):
    must = [{"multi_match": {"query": query, "fields": ["title", "description"]}}]
    filter_conditions = []

    if category:
        filter_conditions.append({"term": {"category": category}})

    if price_range:
        filter_conditions.append({"range": {"price": {"gte": price_range[0], "lte": price_range[1]}}})

    body = {
        "query": {
            "bool": {
                "must": must,
                "filter": filter_conditions
            }
        }
    }

    res = es.search(index=INDEX_NAME, body=body)
    return res["hits"]["hits"]

# ---- RECOMMEND ITEMS BASED ON VECTOR SIMILARITY ---- #
def recommend_similar(query, top_k=5):
    emb = model.encode(query).tolist()

    body = {
        "query": {
            "script_score": {
                "query": {"match_all": {}},
                "script": {
                    "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                    "params": {"query_vector": emb}
                }
            }
        },
        "size": top_k
    }

    res = es.search(index=INDEX_NAME, body=body)
    return res["hits"]["hits"]

# ---- SIMPLE CLUSTERING (KMEANS) OF SEARCH RESULTS ---- #
def cluster_results(query, n_clusters=2):
    from sklearn.cluster import KMeans
    import numpy as np

    results = search_items(query)
    embeddings = [doc['_source']['embedding'] for doc in results]
    titles = [doc['_source']['title'] for doc in results]

    X = np.array(embeddings)
    kmeans = KMeans(n_clusters=n_clusters, random_state=0).fit(X)

    clusters = {i: [] for i in range(n_clusters)}
    for label, title in zip(kmeans.labels_, titles):
        clusters[label].append(title)

    return clusters


if __name__ == "__main__":
    print("Search results:")
    print(search_items("keyboard", category="electronics"))

    print("Recommendations:")
    print(recommend_similar("comfortable chair"))

    print("Clusters:")
    print(cluster_results("chair", n_clusters=2))