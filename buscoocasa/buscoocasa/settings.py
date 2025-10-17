BOT_NAME = "buscoocasa"

SPIDER_MODULES = ["buscoocasa.spiders"]
NEWSPIDER_MODULE = "buscoocasa.spiders"

# Ajustes base
ROBOTSTXT_OBEY = True         # ponlo en False sólo si procede
DOWNLOAD_DELAY = 0.5
FEED_EXPORT_ENCODING = "utf-8"
USER_AGENT = "buscoocasa/1.0 (+https://tu-dominio-o-email)"

# Si más adelante usas pipelines/middlewares, los añades aquí.
