import json
import re
import scrapy
from urllib.parse import urljoin
from buscoocasa.items import PisosItem


class PisosSpider(scrapy.Spider):
    name = "pisos"
    allowed_domains = ["pisos.com", "www.pisos.com"]

    # Punto de arranque
    start_urls = ["https://www.pisos.com/alquiler/pisos-a_coruna_capital"]

    custom_settings = {
        "ROBOTSTXT_OBEY": True,   # Ponlo en False solo si tienes permiso y lo necesitas para pruebas
        "DOWNLOAD_DELAY": 0.5,
        "DEFAULT_REQUEST_HEADERS": {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "es-ES,es;q=0.9",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
            ),
        },
    }

    # ------------ helper: reconocer URLs de ficha reales ------------
    def _is_detail_url(self, url: str) -> bool:
        """
        Acepta URLs de ficha:
        - /inmueble/...  o  /ficha/...
        - /alquilar/<slug>-<numero_largo>_<numero>[/][?query]
        Evita categorías /alquiler/... y paginación.
        """
        if not url or not url.startswith("http"):
            return False

        # 1) patrones clásicos
        if re.search(r"/(inmueble|ficha)/", url):
            return True

        # 2) patrón de fichas /alquilar/<slug>-47558735799_101000/ (con o sin slash final y con o sin query)
        if re.search(r"/alquilar/[^/]+-\d{5,}(?:_\d+)?(?:/)?(?:\?.*)?$", url):
            return True

        return False

    # ------------ listado ------------
    def parse(self, response):
        seen = set()

        # 1) Enlaces en <a href="...">
        for href in response.xpath("//a[@href]/@href").getall():
            url = urljoin(response.url, href)
            if self._is_detail_url(url):
                seen.add(url)

        # 2) Enlaces en atributos data-href de cards
        for href in response.xpath("//*[@data-href]/@data-href").getall():
            url = urljoin(response.url, href)
            if self._is_detail_url(url):
                seen.add(url)

        # 3) Enlaces en scripts embebidos (detailUrl / "url")
        for raw in response.xpath("//script/text()").getall():
            for m in re.findall(r'"(?:detailUrl|url)"\s*:\s*"([^"]+)"', raw):
                url = urljoin(response.url, m.replace("\\/", "/"))
                if self._is_detail_url(url):
                    seen.add(url)

        self.logger.info(f"[pisos] enlaces de ficha detectados en la página: {len(seen)}")
        for i, u in enumerate(sorted(seen)):
            if i < 3:
                self.logger.info(f"[pisos] ejemplo enlace ficha: {u}")
            yield response.follow(u, callback=self.parse_detail)

        # Paginación
        next_url = (
            response.xpath("//a[@rel='next']/@href").get()
            or response.xpath("//a[contains(., 'Siguiente') or contains(@class,'next')]/@href").get()
        )
        if next_url:
            yield response.follow(next_url, callback=self.parse)

    # ------------ detalle ------------
    def parse_detail(self, response):
        item = PisosItem()
        item["url"] = response.url

        # Preferencia: JSON-LD
        ld_json_list = response.xpath("//script[@type='application/ld+json']/text()").getall()
        data = None
        for raw in ld_json_list:
            try:
                parsed = json.loads(raw.strip())
                if isinstance(parsed, list):
                    for block in parsed:
                        if isinstance(block, dict) and ("@type" in block):
                            data = data or block
                elif isinstance(parsed, dict):
                    data = data or parsed
            except Exception:
                continue

        if isinstance(data, dict):
            item["title"] = data.get("name")
            item["description"] = data.get("description")

            offer = data.get("offers") if isinstance(data.get("offers"), dict) else None
            if offer:
                price = offer.get("price")
                try:
                    item["price_eur"] = int(float(str(price).replace(",", "."))) if price is not None else None
                except Exception:
                    item["price_eur"] = None

            addr = data.get("address") if isinstance(data.get("address"), dict) else {}
            item["address"] = addr.get("streetAddress")
            item["municipality"] = addr.get("addressLocality")
            item["province"] = addr.get("addressRegion")
            item["neighborhood"] = addr.get("addressNeighborhood")

            geo = data.get("geo") if isinstance(data.get("geo"), dict) else {}
            item["latitude"] = geo.get("latitude")
            item["longitude"] = geo.get("longitude")

            images = data.get("image")
            if isinstance(images, list):
                item["images"] = images
            elif isinstance(images, str):
                item["images"] = [images]

        # Respaldo por selectores genéricos
        item["listing_id"] = (
            response.xpath("//*[contains(text(),'Referencia')]/following::text()[1]").get()
            or response.xpath("//*[contains(.,'Ref.')]/following::text()[1]").get()
        )
        if item["listing_id"]:
            item["listing_id"] = item["listing_id"].strip().strip(":·- ")

        if not item.get("price_eur"):
            price_txt = (
                response.xpath("//*[contains(@class,'price')]/text()").get()
                or response.xpath("//*[contains(.,'€')][1]/text()").get()
            )
            if price_txt:
                m = re.search(r"(\d[\d\.\s]*)\s*€", price_txt.replace("\xa0", " "))
                if m:
                    try:
                        item["price_eur"] = int(re.sub(r"[^\d]", "", m.group(1)))
                    except Exception:
                        pass

        if not item.get("title"):
            t = response.xpath("//h1//text()").get()
            item["title"] = t.strip() if t else None

        def grab_num(xpath):
            txt = response.xpath(xpath).get()
            if not txt:
                return None
            m = re.search(r"\d+", txt.replace(".", ""))
            return int(m.group()) if m else None

        item["rooms"] = grab_num("//*[contains(.,'habitación') or contains(.,'habitaciones')][1]//text()")
        item["bathrooms"] = grab_num("//*[contains(.,'baño') or contains(.,'baños')][1]//text()")
        item["surface_m2"] = grab_num("//*[contains(.,'m²') or contains(.,'m2')][1]//text()")

        floor_txt = response.xpath("//*[contains(.,'planta') and not(contains(.,'sin'))][1]//text()").get()
        item["floor"] = floor_txt.strip() if floor_txt else None

        def has_flag(word):
            return response.xpath(
                f"//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{word}')][1]"
            ).get() is not None

        item["has_elevator"] = True if has_flag("ascensor") else None
        item["is_exterior"] = True if has_flag("exterior") else None

        agency = response.xpath("//*[contains(@class,'agency') or contains(@class,'publisher')]//text()").getall()
        item["agency"] = " ".join(x.strip() for x in agency if x.strip()) or None

        phone = response.xpath("//a[contains(@href,'tel:')]/@href").get()
        item["phone"] = phone.replace("tel:", "") if phone else None

        pub = response.xpath("//*[contains(.,'publicado') or contains(.,'actualizado')]/text()").get()
        item["published_at"] = pub.strip() if pub else None

        # -------- normalización & filtro de falsos positivos --------
        def to_float(v):
            if v is None:
                return None
            if isinstance(v, (int, float)):
                return float(v)
            s = str(v).strip().replace(",", ".")
            try:
                return float(s)
            except Exception:
                return None

        item["latitude"] = to_float(item.get("latitude"))
        item["longitude"] = to_float(item.get("longitude"))

        title_ok = item.get("title") and not item["title"].lower().startswith("alquiler de ")
        if not item.get("price_eur") and not title_ok:
            return

        yield item
