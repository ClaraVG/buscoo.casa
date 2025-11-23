BOT_NAME = "buscoocasa"

SPIDER_MODULES = ["buscoocasa.spiders"]
NEWSPIDER_MODULE = "buscoocasa.spiders"

ROBOTSTXT_OBEY = True
DOWNLOAD_DELAY = 0.5
FEED_EXPORT_ENCODING = "utf-8"

# User-Agent global
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# Encabezados
DEFAULT_REQUEST_HEADERS = {
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9",
}
