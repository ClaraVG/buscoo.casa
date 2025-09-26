import scrapy


class ExampleSpider(scrapy.Spider):
    name = "example"
    allowed_domains = ["www.idealista.com"]
    start_urls = ["https://www.idealista.com/alquiler-viviendas/a-coruna/monte-alto-zalaeta-atocha/"]

    def parse(self, response):
        pass
