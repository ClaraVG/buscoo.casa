from elasticsearch import Elasticsearch

es = Elasticsearch("http://localhost:9200")
INDEX_NAME = "pisos_index"

def search_items(query=None, neighborhood=None, price_range=None, rooms=None):
    must = []
    filters = []

    if query:
        must.append({
            "multi_match": {
                "query": query,
                "fields": ["title", "neighborhood"]
            }
        })

    if neighborhood:
        filters.append({"term": {"neighborhood": neighborhood}})

    if price_range:
        filters.append({"range": {"price_eur": {"gte": price_range[0], "lte": price_range[1]}}})

    if rooms:
        filters.append({"term": {"rooms": rooms}})

    query_body = {"bool": {}}
    if must:
        query_body["bool"]["must"] = must
    if filters:
        query_body["bool"]["filter"] = filters

    res = es.search(index=INDEX_NAME, query=query_body, size=50)
    return [hit["_source"] for hit in res["hits"]["hits"]]

def cluster_results(results, by="rooms"):
    clusters = {}
    for doc in results:
        key = doc.get(by, "unknown")
        clusters.setdefault(key, []).append(doc)
    return clusters

if __name__ == "__main__":
    print("Search results:")
    results = search_items(query="piso", neighborhood="A Coruna Capital", price_range=(500, 1000))
    for r in results:
        print(r.get("title"), "-", r.get("price_eur"), "€")

    print("\nClusters by rooms:")
    clusters = cluster_results(results, by="rooms")
    for k, v in clusters.items():
        print(f"{k} rooms: {[doc.get('title') for doc in v]}")
