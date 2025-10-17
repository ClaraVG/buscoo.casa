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

            geo = data.get("geo") if isinstance(data.get("geo"), dict) else {}
            item["latitude"] = geo.get("latitude")
            item["longitude"] = geo.get("longitude")

            images = data.get("image")
            if isinstance(images, list):
                item["images"] = images
            elif isinstance(images, str):
                item["images"] = [images]

        # ---- 2) Fallbacks por URL/DOM/JS ----

        # listing_id desde la URL (/alquilar/<slug>-57579337885_106500/)
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

        # Bloques de características (habitaciones, baños, m2, planta)
        # Unimos texto de posibles secciones de características
        features_text = " ".join(
            x.strip()
            for x in response.xpath(
                "//*[contains(@class,'features') or contains(@class,'caracter') or contains(@class,'characteristics') or contains(@class,'details')]//text()"
            ).getall()
            if x.strip()
        ).lower()

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

        # rooms
        if item.get("rooms") is None and features_text:
            item["rooms"] = grab_int_from(r"(\d+)\s*(?:hab|habitac)", features_text)

        # bathrooms
        if item.get("bathrooms") is None and features_text:
            item["bathrooms"] = grab_int_from(r"(\d+)\s*(?:bañ|bano|baños)", features_text)

        # surface_m2
        if item.get("surface_m2") is None and features_text:
            s = grab_float_from(r"(\d+(?:[.,]\d+)?)\s*(?:m²|m2)", features_text)
            item["surface_m2"] = int(s) if s is not None else None

        # floor (texto)
        if not item.get("floor"):
            floor_txt = response.xpath("//*[contains(translate(.,'PLANTAplanta','planta'),'planta')][1]//text()").get()
            item["floor"] = floor_txt.strip() if floor_txt else ""

        # flags (ya tenías ascensor/exterior; mantenemos)
        def has_flag(word):
            return response.xpath(
                f"//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{word}')][1]"
            ).get() is not None

        if item.get("has_elevator") is None:
            item["has_elevator"] = True if has_flag("ascensor") else None
        if item.get("is_exterior") is None:
            item["is_exterior"] = True if has_flag("exterior") else None

        # Agencia (publisher) en bloques de agencia / breadcrumbs de autor
        if not item.get("agency"):
            agency_bits = response.xpath(
                "//*[contains(@class,'agency') or contains(@class,'publisher') or contains(@class,'inmobiliaria')]//text()"
            ).getall()
            agency = " ".join(x.strip() for x in agency_bits if x.strip())
            item["agency"] = agency or None

        # Teléfono (si hubiera enlace tel:)
        if not item.get("phone"):
            phone = response.xpath("//a[contains(@href,'tel:')]/@href").get()
            item["phone"] = phone.replace("tel:", "") if phone else None

        # Fecha publicación/actualización en texto o meta
        if not item.get("published_at"):
            pub = (
                response.xpath("//*[contains(.,'Actualizado') or contains(.,'Publicado')][1]//text()").get()
                or response.xpath("//meta[@property='article:modified_time']/@content").get()
            )
            item["published_at"] = pub.strip() if pub else ""

        # Coordenadas: intenta sacarlas de scripts (lat/lng).
        if item.get("latitude") is None or item.get("longitude") is None:
            scripts = "\n".join(response.xpath("//script/text()").getall())
            # "latitude": 43.36, "longitude": -8.40
            m = re.search(r'"latitude"\s*:\s*"?([0-9\.\-,]+)"?\s*,\s*"longitude"\s*:\s*"?([0-9\.\-,]+)"?', scripts)
            if not m:
                # lat: 43.36, lng: -8.40  (u otras variantes)
                m = re.search(r'lat(?:itude)?\s*[:=]\s*([0-9\.\-,]+).*?(?:lng|lon(?:gitude)?)\s*[:=]\s*([0-9\.\-,]+)', scripts, re.DOTALL|re.IGNORECASE)
            if m:
                try:
                    item["latitude"] = float(m.group(1).replace(",", "."))
                    item["longitude"] = float(m.group(2).replace(",", "."))
                except Exception:
                    pass

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
