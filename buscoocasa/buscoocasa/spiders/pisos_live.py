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
        "ROBOTSTXT_OBEY": True,
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
        """
        if not url or not url.startswith("http"):
            return False
        if re.search(r"/(inmueble|ficha)/", url):
            return True
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

        # ---- 1) Preferencia: JSON-LD ----
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

            images = data.get("image")
            if isinstance(images, list):
                main = self._pick_main_image(images)
                item["images"] = [main] if main else None
            elif isinstance(images, str):
                main = self._pick_main_image([images])
                item["images"] = [main] if main else None


        # ---- 2) Fallbacks por URL/DOM/JS ----

        # listing_id desde la URL
        if not item.get("listing_id"):
            m = re.search(r"-([0-9]{6,})(?:_\d+)?/?", response.url)
            if m:
                item["listing_id"] = m.group(1)

        # Precio (si sigue vacío) buscando € en el DOM
        if not item.get("price_eur"):
            price_txt = (
                response.xpath("//*[contains(@class,'price') or contains(@class,'Price')]/text()").get()
                or response.xpath("//*[contains(.,'€')][1]/text()").get()
            )
            if price_txt:
                m = re.search(r"(\d[\d\.\s,]*)\s*€", price_txt.replace("\xa0", " "))
                if m:
                    try:
                        item["price_eur"] = int(float(m.group(1).replace(".", "").replace(",", ".")))
                    except Exception:
                        pass

        # Título si faltara
        if not item.get("title"):
            t = response.xpath("//h1//text()").get()
            item["title"] = t.strip() if t else None

        # --- Características en texto ---
        features_nodes = response.xpath(
            "//*[contains(@class,'features') or contains(@class,'caracter') or contains(@class,'characteristics') or contains(@class,'details')]//text()"
        ).getall()
        features_text = " ".join(x.strip() for x in features_nodes if x.strip()).lower()

        def grab_int_from(pattern, text):
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                try:
                    return int(m.group(1))
                except Exception:
                    return None
            return None

        def grab_float_from(pattern, text):
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                try:
                    return float(m.group(1).replace(".", "").replace(",", "."))
                except Exception:
                    return None
            return None

        # rooms (hab, habitaciones, dormitorios)
        if item.get("rooms") is None and features_text:
            item["rooms"] = grab_int_from(r"(\d+)\s*(?:hab|habitac|dormitori)", features_text)

        # bathrooms (baños/aseos)
        if item.get("bathrooms") is None and features_text:
            item["bathrooms"] = grab_int_from(r"(\d+)\s*(?:bañ|bano|baños|aseo|aseos|wc)", features_text)

        # surface_m2 (útiles o construidos o genérico)
        if item.get("surface_m2") is None and features_text:
            s = (grab_float_from(r"(\d+(?:[.,]\d+)?)\s*(?:m²|m2)\s*(?:útiles|utiles)", features_text)
                 or grab_float_from(r"(\d+(?:[.,]\d+)?)\s*(?:m²|m2)\s*(?:construid)", features_text)
                 or grab_float_from(r"(\d+(?:[.,]\d+)?)\s*(?:m²|m2)", features_text))
            item["surface_m2"] = int(s) if s is not None else None

        # flags: ascensor
        def has_flag(word):
            return response.xpath(
                f"//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{word}')][1]"
            ).get() is not None

        # neighborhood desde breadcrumbs o slug si faltara
        if not item.get("neighborhood"):
            crumb = response.xpath("//nav//a[contains(@href,'-a_coruna') or contains(@href,'a_coruna')]/text()").get()
            if crumb and crumb.strip():
                item["neighborhood"] = crumb.strip()
            else:
                # intenta del slug: .../alquilar/piso-os_mallos_a_falperra15007-...
                m = re.search(r"/alquilar/[^/]*?([a-z0-9_]+)-\d", response.url)
                if m:
                    slug = m.group(1)
                    # quita posibles prefijos de tipo de vivienda
                    slug = re.sub(r"^(piso|apartamento|atico|ático|chalet|estudio|loft|duplex|dúplex|adosado|casa|vivienda|bajo|atico)\-?", "", slug, flags=re.IGNORECASE)
                    item["neighborhood"] = slug.replace("_", " ").title()

        title_ok = item.get("title") and not item["title"].lower().startswith("alquiler de ")
        if not item.get("price_eur") and not title_ok:
            return

        # Si no hay imágenes en JSON-LD, intenta galería (miniaturas con data-src o src)
        if not item.get("images"):
            imgs = response.xpath(
                "//img[@src or @data-src]/@src | //img[@data-src]/@data-src"
            ).getall()
            imgs = [urljoin(response.url, u) for u in imgs if u]

            # nos quedamos solo con la PRIMERA imagen "buena"
            main = self._pick_main_image(imgs)
            item["images"] = [main] if main else None

        yield item


    def _pick_main_image(self, urls):
        """
        Recibe una lista de URLs y devuelve la primera que parezca una foto
        real (no logos, iconos, mapas, svg, etc.). Si no hay ninguna válida,
        devuelve None.
        """
        if not urls:
            return None

        for u in urls:
            if not u:
                continue
            lu = str(u).lower()

            # descartar logos, iconos, mapas, etc.
            if any(bad in lu for bad in [
                "logo-pisos",
                "/logo_",
                "/logos/",
                "/icons/",
                "googleplay_store",
                "appstore",
                "appgallery",
                "ic_instagram",
                "ic_facebook",
                "ic_twitter",
                "map.imghs.net",
            ]):
                continue

            # descartar formatos típicos de iconos
            if lu.endswith(".svg") or lu.endswith(".gif"):
                continue

            # si llega aquí, nos vale como foto principal
            return u

        return None

