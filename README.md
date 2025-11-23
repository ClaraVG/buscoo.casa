# Prerrequisitos

Tener instalado `python3` con `scrapy`, `elasticsearch`, `npm` y/o `yarn`. 

# INSTALACIÓN DE LBRERÍAS REQUERIDAS

```
npm install react@18 react-dom@18
npm install recharts
npm install rc-slider
```

# EJECUCIÓN
### Scrapy

Nosotros ya aportamos un archivo `pisos_a_coruna.jsonl`, pero en caso de querer generarlo de nuevo:

- Desde `buscoo.casa/buscoocasa`
```
scrapy crawl pisos -O data/pisos_a_coruna.jsonl -s FEED_EXPORT_ENCODING=utf-8
```

### Elasticsearch

Inicializar el servidor de elasticsearch donde se haya descargado
```
bin/elasticsearch
```

Creación de índices e inserción de elementos

- desde `buscoo.casa/elasticsearch`

```
python3 create_index.py 
python3 insert_docs.py
```

### ElasticSearch UI

Para inicializar el servidor web

```
cd buscoo.casa/app-search-reference-ui-react-master
npm start
```

<!-- # CSV
scrapy crawl pisos -O data/pisos_a_coruna.csv -s FEED_EXPORT_ENCODING=utf-8

# JSON “bonito”
scrapy crawl pisos -O data/pisos_a_coruna.json -s FEED_EXPORT_ENCODING=utf-8 -->
