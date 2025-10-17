import json
import re
import scrapy
from urllib.parse import urljoin, urlparse, parse_qs
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

            geo = data.get("geo") if isinstance(data.get("geo"), dict) else {}
            item["latitude"] = geo.get("latitude")
            item["longitude"] = geo.get("longitude")

            # Agencia / publisher desde JSON-LD si existiese
            seller = data.get("seller") or data.get("publisher") or data.get("brand")
            if isinstance(seller, dict):
                item["agency"] = seller.get("name")

            images = data.get("image")
            if isinstance(images, list):
                item["images"] = images
            elif isinstance(images, str):
                item["images"] = [images]

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

        # floor (texto): bajo, entresuelo, principal, 1º, 2ª, etc.
        if not item.get("floor"):
            floor_txt = (
                response.xpath("//*[contains(translate(.,'PLANTAplanta','planta'),'planta')][1]//text()").get()
                or response.xpath("//*[contains(.,'bajo') or contains(.,'entresuelo') or contains(.,'principal') or contains(.,'ático') or contains(.,'ático')][1]//text()").get()
            )
            item["floor"] = floor_txt.strip() if floor_txt else ""

        # flags: ascensor / exterior (también marca interior => exterior False)
        def has_flag(word):
            return response.xpath(
                f"//*[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{word}')][1]"
            ).get() is not None

        if item.get("has_elevator") is None:
            item["has_elevator"] = True if has_flag("ascensor") else None

        if item.get("is_exterior") is None:
            if has_flag("interior"):
                item["is_exterior"] = False
            elif has_flag("exterior"):
                item["is_exterior"] = True
            else:
                item["is_exterior"] = None

        # Agencia / publisher (bloques de agencia, breadcrumbs y scripts)
        if not item.get("agency"):
            agency_bits = response.xpath(
                "//*[contains(@class,'agency') or contains(@class,'publisher') or contains(@class,'inmobiliaria') or contains(@class,'author') or contains(@class,'company')]//text()"
            ).getall()
            agency = " ".join(x.strip() for x in agency_bits if x.strip())
            if not agency:
                # intenta desde scripts: "agencyName": "..."
                scripts = "\n".join(response.xpath("//script/text()").getall())
                m = re.search(r'"(?:agencyName|publisher|seller)"\s*:\s*"?\{?[^}]*?"name"\s*:\s*"([^"]+)"', scripts, re.IGNORECASE)
                if not m:
                    m = re.search(r'"(?:agencyName|agency|inmobiliaria)"\s*:\s*"([^"]+)"', scripts, re.IGNORECASE)
                if m:
                    agency = m.group(1).strip()
            item["agency"] = agency or None

        # Teléfono
        if not item.get("phone"):
            phone = response.xpath("//a[contains(@href,'tel:')]/@href").get()
            if not phone:
                # busca teléfono en scripts (formato español)
                scripts = "\n".join(response.xpath("//script/text()").getall())
                m = re.search(r"(?:\+34\s*)?(\d{3}\s?\d{2}\s?\d{2}\s?\d{2})", scripts)
                phone = m.group(0) if m else None
            item["phone"] = phone.replace("tel:", "") if phone else None

        # Fecha publicación/actualización -> normaliza a ISO YYYY-MM-DD si es posible
        if not item.get("published_at"):
            pub = (
                response.xpath("//*[contains(.,'Actualizado') or contains(.,'Publicado')][1]//text()").get()
                or response.xpath("//meta[@property='article:modified_time']/@content").get()
                or response.xpath("//meta[@property='article:published_time']/@content").get()
            )
            pub = pub.strip() if pub else ""
            iso = self._normalize_date(pub)
            item["published_at"] = iso or pub

        # Coordenadas: JSON, atributos, scripts y querystrings de mapas
        if item.get("latitude") is None or item.get("longitude") is None:
            # 1) atributos data-lat/lng
            lat_attr = response.xpath("//*[@data-lat]/@data-lat").get()
            lng_attr = response.xpath("//*[@data-lng]/@data-lng").get()
            # 2) scripts con latitude/longitude o mapCenter
            scripts = "\n".join(response.xpath("//script/text()").getall())
            m = re.search(r'"latitude"\s*:\s*"?([0-9\.\-,]+)"?\s*,\s*"longitude"\s*:\s*"?([0-9\.\-,]+)"?', scripts)
            if not m:
                m = re.search(r'mapCenter"\s*:\s*\{[^}]*?lat"\s*:\s*([0-9\.\-,]+)\s*,\s*"?(?:lng|lon|longitude)"?\s*:\s*([0-9\.\-,]+)', scripts, re.IGNORECASE)
            # 3) URLs de mapa con ?center=lat,lon
            if not m:
                for href in response.xpath("//iframe/@src | //img/@src | //a/@href").getall():
                    qs = parse_qs(urlparse(urljoin(response.url, href)).query)
                    if "center" in qs and qs["center"]:
                        parts = qs["center"][0].split(",")
                        if len(parts) == 2:
                            lat_attr = lat_attr or parts[0]
                            lng_attr = lng_attr or parts[1]

            def to_f(v):
                if not v:
                    return None
                try:
                    return float(str(v).replace(",", "."))
                except Exception:
                    return None

            lat = to_f((m.group(1) if m else None) or lat_attr)
            lng = to_f((m.group(2) if m else None) or lng_attr)
            item["latitude"] = lat if lat is not None else item.get("latitude")
            item["longitude"] = lng if lng is not None else item.get("longitude")

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

        # Si no hay imágenes en JSON-LD, intenta galería (miniaturas con data-src o src)
        if not item.get("images"):
            imgs = response.xpath("//img[@src or @data-src]/@src | //img[@data-src]/@data-src").getall()
            imgs = [urljoin(response.url, u) for u in imgs if u]
            item["images"] = list(dict.fromkeys([u for u in imgs if "fotos" in u or "imghs" in u])) or None

        yield item

    # -------- helpers --------
    def _normalize_date(self, raw: str):
        """Convierte 'Actualizado el 12/10/2025' o '2025-10-12T...' a 'YYYY-MM-DD' si puede."""
        if not raw:
            return None
        raw = raw.strip()
        # ISO directo
        m = re.search(r"(\d{4})-(\d{2})-(\d{2})", raw)
        if m:
            return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
        # dd/mm/yyyy
        m = re.search(r"(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})", raw)
        if m:
            d, mo, y = m.groups()
            return f"{y}-{int(mo):02d}-{int(d):02d}"
        return None
