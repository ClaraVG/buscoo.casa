import scrapy

class CardMarketSpider(scrapy.Spider):
    name = "cardmarket"
    allowed_domains = ["cardmarket.com"]
    start_urls = ["https://www.cardmarket.com/es/Magic/Products/Singles"]

    def parse(self, response):
        # Select each product row
        for product in response.css("div.table-body > div.row.g-0"):
            name_spanish = product.css("a::text").get()
            name_english = product.css("div.fst-italic::text").get()
            link = product.css("a::attr(href)").get()

            if link:
                link = response.urljoin(link)

            yield {
                "name_spanish": name_spanish,
                "name_english": name_english,
                "link": link,
            }

        # Follow pagination if present
        next_page = response.css("a.page-link[rel='next']::attr(href)").get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)
