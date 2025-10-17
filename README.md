# buscoo.casa

Desde la carpeta que contiene scrapy.cfg (es decir, buscoo.casa/buscoocasa):

# JSON Lines (recomendado para scraping)
scrapy crawl pisos -O data/pisos_a_coruna.jsonl -s FEED_EXPORT_ENCODING=utf-8

# CSV
scrapy crawl pisos -O data/pisos_a_coruna.csv -s FEED_EXPORT_ENCODING=utf-8

# JSON “bonito”
scrapy crawl pisos -O data/pisos_a_coruna.json -s FEED_EXPORT_ENCODING=utf-8
