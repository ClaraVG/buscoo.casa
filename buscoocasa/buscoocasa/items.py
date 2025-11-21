import scrapy

class PisosItem(scrapy.Item):
    listing_id = scrapy.Field()
    url = scrapy.Field()
    title = scrapy.Field()
    price_eur = scrapy.Field()
    address = scrapy.Field()
    municipality = scrapy.Field()
    province = scrapy.Field()
    neighborhood = scrapy.Field()
    surface_m2 = scrapy.Field()
    rooms = scrapy.Field()
    bathrooms = scrapy.Field()
    description = scrapy.Field()
    images = scrapy.Field()
