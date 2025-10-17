
BOT_NAME = "buscoocasa"


SPIDER_MODULES = ["cardmarket.spiders"]
NEWSPIDER_MODULE = "cardmarket.spiders"

USER_AGENT_LIST = [ 'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0', 
                   'Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:42.0) Gecko/20100101 Firefox/42.0', 
                   'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36', 
                   'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36 OPR/38.0.2220.41',
                   'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1' ]

ROBOTSTXT_OBEY = True
USER_AGENT = "buscoocasa/1.0 (+https://tu-dominio-o-email)"
DOWNLOAD_DELAY = 0.5
