from elasticsearch import Elasticsearch

es = Elasticsearch("http://localhost:9200")
INDEX_NAME = "pisos_index"

# Search items with optional filters ---
def search_items(query, neighborhood=None, price_range=None, rooms=None):
    must = []
    filter_conditions = []

    if query:
        must.append({
            "multi_match": {
                "query": query,
                "fields": ["title", "neighborhood"]
            }
        })

    if neighborhood:
        filter_conditions.append({"term": {"neighborhood.keyword": neighborhood}})

    if price_range:
        filter_conditions.append({
            "range": {"price_eur": {"gte": price_range[0], "lte": price_range[1]}}
        })

    if rooms:
        filter_conditions.append({"term": {"rooms": rooms}})

    query_body = {
        "bool": {
            "must": must,
            "filter": filter_conditions
        }
    }

    res = es.search(index=INDEX_NAME, query=query_body, size=50)
    return [hit["_source"] for hit in res["hits"]["hits"]]

# Clustering by price range or rooms ---
def cluster_results(results, by="rooms"):
    clusters = {}
    for doc in results:
        key = doc.get(by, "unknown")
        if key not in clusters:
            clusters[key] = []
        clusters[key].append(doc)
    return clusters

if __name__ == "__main__":
    print("Search results:")
    results = search_items(query="apartamento", neighborhood="A Coruna Capital", price_range=(500, 1000))
    for r in results:
        print(r["title"], "-", r["price_eur"], "€")

    print("\nClusters by rooms:")
    clusters = cluster_results(results, by="rooms")
    for k, v in clusters.items():
        print(f"{k} rooms: {[doc['title'] for doc in v]}")
