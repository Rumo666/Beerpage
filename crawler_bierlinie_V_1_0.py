#!/usr/bin/env python3
"""
BierBuddy Crawler v3 – bierlinie-shop.de
==========================================
- Liest alle Biere aus der Übersichtstabelle
- Crawlt Detailseiten für EAN, Zutaten, Preis, Beschreibung etc.
- Lädt Produktbilder herunter in /bilder/ Ordner
- Extrahiert die komplette Beschreibung (alle h2-Abschnitte)

Ausgabe:
  biere_datenbank.json   – Alle Daten als JSON
  biere_datenbank.csv    – Alle Daten als CSV
  bilder/                – Heruntergeladene Produktbilder

Nutzung:
  python3 bierlinie_crawler.py                  # Alle Biere
  python3 bierlinie_crawler.py --limit 10       # Nur erste 10
  python3 bierlinie_crawler.py --skip-details   # Nur Tabellendaten
  python3 bierlinie_crawler.py --skip-images    # Keine Bilder downloaden
  python3 bierlinie_crawler.py --delay 2.0      # 2s Pause zwischen Requests
"""

import requests
from bs4 import BeautifulSoup
import json
import csv
import time
import re
import os
import argparse
from urllib.parse import urljoin, urlparse
from collections import Counter
from pathlib import Path

# ─── KONFIGURATION ───
BASE_URL = "https://www.bierlinie-shop.de"
LIST_URL = f"{BASE_URL}/bierlinie/alles-ueber-bier/bier-liste-shop"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
}
OUTPUT_JSON = "biere_datenbank.json"
OUTPUT_CSV = "biere_datenbank.csv"
IMAGE_DIR = "bilder"


def get_page(url, session, delay=1.0):
    """Seite abrufen mit Fehlerbehandlung und Rate-Limiting."""
    time.sleep(delay)
    try:
        resp = session.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "html.parser")
    except requests.RequestException as e:
        print(f"  ⚠️  Fehler: {e}")
        return None


def download_image(url, filename, session, delay=0.3):
    """Bild herunterladen und lokal speichern."""
    try:
        time.sleep(delay)
        resp = session.get(url, headers=HEADERS, timeout=15, stream=True)
        resp.raise_for_status()

        # Content-Type prüfen
        content_type = resp.headers.get("Content-Type", "")
        if "image" not in content_type and "octet-stream" not in content_type:
            return None

        filepath = os.path.join(IMAGE_DIR, filename)
        with open(filepath, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)

        size_kb = os.path.getsize(filepath) / 1024
        return filepath, size_kb

    except requests.RequestException:
        return None


def make_safe_filename(name, ext=".jpg"):
    """Sicheren Dateinamen aus Biername erzeugen."""
    # Umlaute ersetzen
    replacements = {
        "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
        "Ä": "Ae", "Ö": "Oe", "Ü": "Ue",
        "å": "a", "Å": "A", "é": "e", "è": "e", "ê": "e",
        "ø": "o", "æ": "ae",
    }
    safe = name
    for old, new in replacements.items():
        safe = safe.replace(old, new)

    # Nur sichere Zeichen behalten
    safe = re.sub(r"[^a-zA-Z0-9\-_]", "_", safe)
    safe = re.sub(r"_+", "_", safe).strip("_")
    safe = safe[:80]  # Max 80 Zeichen

    return f"{safe}{ext}"


def parse_beer_table(soup):
    """Alle Biere aus der Übersichtstabelle extrahieren."""
    beers = []
    table = soup.find("table")
    if not table:
        print("  ❌ Keine Tabelle gefunden!")
        return beers

    rows = table.find_all("tr")
    for row in rows[1:]:
        cells = row.find_all("td")
        if len(cells) < 5:
            continue

        link_tag = cells[0].find("a", href=True)
        if not link_tag:
            continue

        name = link_tag.get_text(strip=True)
        url = urljoin(BASE_URL, link_tag["href"])
        land = cells[1].get_text(strip=True)
        alkohol = cells[2].get_text(strip=True)
        bierstil = cells[3].get_text(strip=True)
        brauerei = cells[4].get_text(strip=True)

        alk_zahl = None
        alk_match = re.search(r"[\d]+[.,]?\d*", alkohol)
        if alk_match:
            alk_zahl = float(alk_match.group().replace(",", "."))

        inhalt_match = re.search(r"(\d+[.,]?\d*)\s*l", name, re.IGNORECASE)
        inhalt_ml = None
        if inhalt_match:
            inhalt_l = float(inhalt_match.group(1).replace(",", "."))
            inhalt_ml = int(inhalt_l * 1000)

        beer = {
            "name": name,
            "brauerei": brauerei,
            "land": land,
            "alkohol": alkohol,
            "alkohol_prozent": alk_zahl,
            "bierstil": bierstil,
            "inhalt_ml": inhalt_ml,
            "detail_url": url,
        }
        beers.append(beer)

    return beers


def extract_description_sections(soup):
    """
    Extrahiert alle Beschreibungs-Abschnitte der Detailseite.
    Die Seite nutzt h2-Überschriften gefolgt von Absätzen:
      - Allgemeine Beschreibung
      - Geschichte und Herstellung
      - Aussehen und Geruch
      - Geschmack
      - Trinktemperatur
      - Food Pairing
    """
    sections = {}
    full_text_parts = []

    # Alle h2-Elemente finden, die zur Beschreibung gehören
    # (nicht Navigation/Header h2s)
    h2_elements = soup.find_all("h2")

    for h2 in h2_elements:
        title = h2.get_text(strip=True)

        # Navigation/Shop-Elemente überspringen
        if not title or len(title) < 5:
            continue
        skip_words = ["warenkorb", "newsletter", "service", "zahlung",
                      "versand", "kontakt", "konto", "sortiment"]
        if any(w in title.lower() for w in skip_words):
            continue

        # Alle folgenden Absätze sammeln bis zum nächsten h2
        content_parts = []
        sibling = h2.find_next_sibling()
        while sibling and sibling.name != "h2":
            if sibling.name in ["p", "div", "ul", "ol"]:
                text = sibling.get_text(" ", strip=True)
                if text and len(text) > 10:
                    content_parts.append(text)
            sibling = sibling.find_next_sibling()

        if content_parts:
            section_text = " ".join(content_parts)

            # Abschnitt kategorisieren
            title_lower = title.lower()
            if "geschmack" in title_lower or "schmeckt" in title_lower:
                sections["geschmack_beschreibung"] = section_text
            elif "aussehen" in title_lower or "aussieht" in title_lower or "riecht" in title_lower:
                sections["aussehen_geruch"] = section_text
            elif "geschichte" in title_lower or "herstellung" in title_lower:
                sections["geschichte"] = section_text
            elif "trinktemperatur" in title_lower or "temperatur" in title_lower:
                sections["trinktemperatur_info"] = section_text
                # Temperatur-Wert extrahieren
                temp_match = re.search(r"(\d+)\s*[-–]\s*(\d+)\s*°?\s*C", section_text)
                if temp_match:
                    sections["trinktemperatur"] = f"{temp_match.group(1)}-{temp_match.group(2)} °C"
            elif "passt" in title_lower or "pairing" in title_lower or "speise" in title_lower:
                sections["food_pairing"] = section_text
            else:
                # Allgemeine Beschreibung (meist der erste Abschnitt)
                if "beschreibung" not in sections:
                    sections["beschreibung"] = section_text
                else:
                    sections["beschreibung"] += " " + section_text

            full_text_parts.append(f"## {title}\n{section_text}")

    # Gesamttext
    if full_text_parts:
        sections["beschreibung_komplett"] = "\n\n".join(full_text_parts)

    return sections


def extract_detail_data(soup, url):
    """Alle Daten von einer Bier-Detailseite extrahieren."""
    if not soup:
        return {}

    data = {}

    # ─── Strukturierte Felder (dt/dd) ───
    field_map = {
        # Identifikation
        "artikelnummer": "artikelnummer",
        "art.nr": "artikelnummer",
        "art.-nr": "artikelnummer",
        "ean": "ean",
        "barcode": "ean",
        "gtin": "ean",
        # Bier-Eigenschaften
        "biersorte": "biersorte",
        "bierstil": "biersorte",
        "sorte": "biersorte",
        "brauart": "brauart",
        "gärung": "brauart",
        "farbe": "farbe",
        "optik": "optik",
        "geruch": "geruch",
        "aroma": "geruch",
        "geschmack": "geschmack",
        "ibu": "ibu",
        "stammwürze": "stammwuerze",
        "stammwuerze": "stammwuerze",
        # Servieren
        "empf. trinktemperatur": "trinktemperatur",
        "trinktemperatur": "trinktemperatur",
        "glastyp": "glastyp",
        "glas": "glastyp",
        "foodpairing": "food_pairing",
        "food pairing": "food_pairing",
        "passt zu": "food_pairing",
        # Inhaltsstoffe
        "zutaten": "zutaten",
        "ingredients": "zutaten",
        "nährwerte": "naehrwerte",
        "brennwert": "brennwert",
        "kalorien": "kalorien",
        # Herkunft
        "herkunft": "herkunft",
        "herkunftsland": "herkunft",
        "alkoholgehalt": "alkohol_detail",
        "alkohol": "alkohol_detail",
        "inhalt": "inhalt_detail",
        # Brauerei
        "brauerei": "brauerei_detail",
        "verantwortlicher": "verantwortlicher",
        # Sonstiges
        "pfand": "pfand",
    }

    # dt/dd Paare auslesen – Brauerei-Adresse speziell behandeln
    brauerei_parts = []
    capture_brauerei = False

    for dt in soup.find_all("dt"):
        dd = dt.find_next_sibling("dd")
        if dd:
            key = dt.get_text(strip=True).lower().rstrip(":")
            # dd kann mehrere Zeilen haben (z.B. Brauerei-Adresse)
            # Alle Textzeilen sammeln
            value_lines = []
            for content in dd.children:
                if isinstance(content, str):
                    text = content.strip()
                    if text:
                        value_lines.append(text)
                elif hasattr(content, 'get_text'):
                    text = content.get_text(strip=True)
                    if text:
                        value_lines.append(text)

            value = dd.get_text(strip=True)
            if not value:
                continue

            # Brauerei mit Adresse: mehrere Zeilen zusammenfassen
            if "brauerei" in key and len(value_lines) > 1:
                data["brauerei_detail"] = value_lines[0]  # Name
                # Adresszeilen (alles nach dem Namen, ohne "verantwortlicher...")
                addr_lines = []
                for line in value_lines[1:]:
                    if "verantwortlich" in line.lower():
                        data["verantwortlicher"] = line
                    else:
                        addr_lines.append(line)
                if addr_lines:
                    data["brauerei_adresse"] = ", ".join(addr_lines)
                continue

            for pattern, field_name in field_map.items():
                if pattern in key:
                    data[field_name] = value
                    break

    # ─── Tabellen-Felder ───
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                key = cells[0].get_text(strip=True).lower().rstrip(":")
                value = cells[1].get_text(strip=True)
                if value:
                    for pattern, field_name in field_map.items():
                        if pattern in key:
                            data[field_name] = value
                            break

    # ─── Sidebar Info-Blocks (Icon + Label + Value) ───
    # Die rechte Spalte hat Blöcke mit SVG-Icons, einem fettgedruckten Label
    # (z.B. "Biersorte:") und darunter den Wert (z.B. "Pilsner").
    # Diese sind NICHT als dt/dd gebaut, sondern als freie Textblöcke.
    # Wir suchen nach allen Textstellen die ein bekanntes Label enthalten.
    #
    # Strategie: Alle Elemente finden die ein Icon-Bild (beer-type.svg,
    # destination.svg, etc.) als Geschwister/Kind haben, oder einfach
    # den gesamten Seitentext nach "Label:\nWert" Mustern durchsuchen.

    sidebar_labels = {
        "Biersorte:": "biersorte",
        "Herkunft:": "herkunft_detail",
        "Brauart:": "brauart",
        "Alkoholgehalt:": "alkohol_detail",
        "Optik:": "optik",
        "Geruch:": "geruch",
        "Geschmack:": "geschmack",
        "Trinktemperatur:": "trinktemperatur",
        "Glastyp:": "glastyp",
        "Foodpairing:": "food_pairing",
        "Food Pairing:": "food_pairing",
    }

    # Methode: Suche nach fettgedruckten Labels im Text
    for bold in soup.find_all(["strong", "b"]):
        bold_text = bold.get_text(strip=True)
        for label, field_name in sidebar_labels.items():
            if bold_text == label or bold_text == label.rstrip(":"):
                # Wert ist der nächste Text nach dem Label
                parent = bold.parent
                if parent:
                    full_text = parent.get_text(strip=True)
                    # Label entfernen um den Wert zu bekommen
                    value = full_text.replace(bold_text, "").strip()
                    if value and field_name not in data:
                        data[field_name] = value
                break

    # Methode 2: Gesamttext-basierte Extraktion als Fallback
    # Suche nach "Label:\nWert" im gerenderten Seitentext
    page_text = soup.get_text("\n", strip=True)
    for label, field_name in sidebar_labels.items():
        if field_name in data:
            continue  # Bereits gefunden
        # Suche "Label:" gefolgt von Wert in der nächsten Zeile
        pattern = re.escape(label) + r"\s*\n+\s*(.+)"
        match = re.search(pattern, page_text)
        if match:
            value = match.group(1).strip()
            # Stopp wenn nächstes Label beginnt oder zu lang
            if len(value) < 200 and not value.endswith(":"):
                data[field_name] = value

    # Brauerei-Block speziell: Hat mehrere Zeilen (Name, Adresse, Verantwortlicher)
    if "brauerei_detail" not in data:
        brau_match = re.search(
            r"Brauerei:\s*\n+\s*(.+?)(?:\n\s*(.+?))?(?:\n\s*(.+?))?(?:\n\s*(.+?))?\n",
            page_text
        )
        if brau_match:
            lines = [g.strip() for g in brau_match.groups() if g and g.strip()]
            if lines:
                data["brauerei_detail"] = lines[0]
                addr = []
                for line in lines[1:]:
                    if "verantwortlich" in line.lower():
                        data["verantwortlicher"] = line
                    else:
                        addr.append(line)
                if addr:
                    data["brauerei_adresse"] = ", ".join(addr)

    # Trinktemperatur bereinigen (z.B. "6 - 10°C" → "6-10 °C")
    if data.get("trinktemperatur"):
        temp = data["trinktemperatur"]
        temp_match = re.search(r"(\d+)\s*[-–]\s*(\d+)", temp)
        if temp_match:
            data["trinktemperatur"] = f"{temp_match.group(1)}-{temp_match.group(2)} °C"

    # Zutaten: manchmal als freier Text auf der Seite (nicht in dt/dd)
    if "zutaten" not in data:
        zut_match = re.search(r"Zutaten:\s*(.+?)(?:\n|$)", page_text)
        if zut_match:
            data["zutaten"] = zut_match.group(1).strip()

    # Pfand: manchmal als freier Text
    if "pfand" not in data:
        pfand_match = re.search(r"zzgl\.\s*Pfand\s*([\d,]+\s*€)", page_text)
        if pfand_match:
            data["pfand"] = pfand_match.group(1)

    # ─── Preis ───
    price_elem = soup.find(["span", "div"], class_=re.compile(r"price", re.I))
    if price_elem:
        price_match = re.search(r"[\d]+[.,][\d]{2}", price_elem.get_text())
        if price_match:
            data["preis_eur"] = price_match.group().replace(",", ".")
    price_meta = soup.find("meta", {"itemprop": "price"})
    if price_meta and "preis_eur" not in data:
        data["preis_eur"] = price_meta.get("content", "")

    # ─── Bild-URLs (alle Produktbilder sammeln) ───
    skip_imgs = [
        "logo", "icon", "banner", "payment", "ssl", "flag", "haendlerbund",
        "paypal", "klarna", "visa", "mastercard", "frontend/Webshop",
        "Mehrweg.png", "Einweg.png", "widget", "sprite",
    ]
    bild_urls = []
    for img in soup.find_all("img"):
        src = img.get("data-src") or img.get("src") or ""
        if not src:
            continue
        if any(s in src for s in skip_imgs):
            continue
        full_src = urljoin(url, src)
        # Nur CDN-Bilder / Produktbilder
        if "plentymarkets" in full_src or "/item/" in full_src:
            if full_src not in bild_urls:
                bild_urls.append(full_src)

    # Fallback: og:image
    if not bild_urls:
        og_img = soup.find("meta", property="og:image")
        if og_img and og_img.get("content"):
            content = og_img["content"]
            if not any(s in content for s in skip_imgs):
                bild_urls.append(content)

    if bild_urls:
        data["bild_url"] = bild_urls[0]  # Hauptbild
        if len(bild_urls) > 1:
            data["weitere_bilder"] = bild_urls[1:]

    # ─── Beschreibung (alle Abschnitte) ───
    desc_sections = extract_description_sections(soup)
    data.update(desc_sections)

    # Falls keine h2-Beschreibung gefunden, Fallback auf og:description
    if "beschreibung" not in data and "beschreibung_komplett" not in data:
        og_desc = soup.find("meta", property="og:description")
        if og_desc and og_desc.get("content") and len(og_desc["content"]) > 30:
            data["beschreibung"] = og_desc["content"]

    # ─── Schema.org / JSON-LD ───
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            ld = json.loads(script.string)
            if isinstance(ld, dict) and ld.get("@type") == "Product":
                if "ean" not in data:
                    ean_val = ld.get("gtin13") or ld.get("gtin") or ld.get("gtin8") or ""
                    if ean_val:
                        data["ean"] = str(ean_val)
                if not bild_urls and ld.get("image"):
                    img = ld["image"]
                    data["bild_url"] = img[0] if isinstance(img, list) else img
                if ld.get("offers"):
                    offers = ld["offers"]
                    if isinstance(offers, list):
                        offers = offers[0] if offers else {}
                    if isinstance(offers, dict):
                        if "preis_eur" not in data and offers.get("price"):
                            data["preis_eur"] = str(offers["price"])
                        avail = offers.get("availability", "")
                        if avail:
                            data["verfuegbar"] = "InStock" in avail
        except (json.JSONDecodeError, TypeError, KeyError):
            pass

    # EAN bereinigen
    if data.get("ean"):
        ean_clean = re.sub(r"[^\d]", "", str(data["ean"]))
        data["ean"] = ean_clean if len(ean_clean) >= 8 else ""

    return data


def crawl(limit=0, skip_details=False, skip_images=False, delay=1.0):
    """Hauptfunktion."""
    session = requests.Session()

    # Bilder-Ordner erstellen
    if not skip_images and not skip_details:
        os.makedirs(IMAGE_DIR, exist_ok=True)

    print("=" * 65)
    print("🍺 BierBuddy Crawler v3 – bierlinie-shop.de")
    print("   Jetzt mit Bild-Download & Beschreibungs-Extraktion!")
    print("=" * 65)

    # ─── Phase 1: Übersichtstabelle ───
    print(f"\n📋 Phase 1: Bier-Liste laden...")
    print(f"   Quelle: {LIST_URL}\n")

    soup = get_page(LIST_URL, session, delay=0.5)
    if not soup:
        print("❌ Konnte die Bier-Liste nicht laden!")
        return []

    beers = parse_beer_table(soup)
    print(f"   ✅ {len(beers)} Biere in der Tabelle gefunden\n")

    if not beers:
        return []

    if limit > 0:
        beers = beers[:limit]
        print(f"   ⚠️  Limit: Nur erste {limit} Biere\n")

    # ─── Phase 2: Detailseiten + Bilder ───
    if not skip_details:
        total_images = 0
        total_size_mb = 0

        print(f"📋 Phase 2: Detailseiten crawlen ({len(beers)} Biere)...")
        print(f"   Delay: {delay}s | Bilder: {'Ja' if not skip_images else 'Nein'}\n")

        for i, beer in enumerate(beers, 1):
            url = beer.get("detail_url", "")
            name_short = beer.get("name", "?")[:42]
            print(f"   🍺 [{i:3d}/{len(beers)}] {name_short:<42s} ", end="", flush=True)

            detail_soup = get_page(url, session, delay)
            if detail_soup:
                detail_data = extract_detail_data(detail_soup, url)
                beer.update(detail_data)

                # ─── Bild herunterladen ───
                if not skip_images and beer.get("bild_url"):
                    img_url = beer["bild_url"]
                    # Dateiendung aus URL oder Content-Type
                    parsed = urlparse(img_url)
                    ext = os.path.splitext(parsed.path)[1] or ".jpg"
                    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
                        ext = ".jpg"

                    img_filename = make_safe_filename(beer["name"], ext)
                    result = download_image(img_url, img_filename, session)

                    if result:
                        filepath, size_kb = result
                        beer["bild_lokal"] = filepath
                        total_images += 1
                        total_size_mb += size_kb / 1024

                # Status ausgeben
                status = []
                if beer.get("ean"):
                    status.append(f"EAN:{beer['ean']}")
                if beer.get("preis_eur"):
                    status.append(f"{beer['preis_eur']}€")
                if beer.get("bild_lokal"):
                    status.append("📷")
                if beer.get("zutaten"):
                    status.append("🧪")
                if beer.get("geschmack"):
                    status.append("👅")
                if beer.get("geruch"):
                    status.append("👃")
                if beer.get("glastyp"):
                    status.append("🥂")
                if beer.get("beschreibung") or beer.get("beschreibung_komplett"):
                    status.append("📝")
                print(f"✅ {' | '.join(status) if status else 'Basisdaten'}")
            else:
                print("❌ Fehler")

        if not skip_images:
            print(f"\n   📷 {total_images} Bilder heruntergeladen ({total_size_mb:.1f} MB)")
    else:
        print("⏭️  Detailseiten übersprungen (--skip-details)\n")

    # ─── Phase 3: Speichern ───
    print(f"\n📋 Phase 3: Daten speichern...")

    # JSON
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(beers, f, ensure_ascii=False, indent=2)
    print(f"   💾 {OUTPUT_JSON}")

    # CSV
    priority_fields = [
        "name", "brauerei", "brauerei_detail", "brauerei_adresse",
        "verantwortlicher", "land", "herkunft", "herkunft_detail",
        "ean", "artikelnummer",
        "bierstil", "biersorte", "brauart",
        "alkohol", "alkohol_prozent", "alkohol_detail",
        "inhalt_ml", "inhalt_detail", "zutaten",
        "optik", "farbe", "geruch", "geschmack",
        "ibu", "stammwuerze",
        "trinktemperatur", "glastyp", "food_pairing",
        "preis_eur", "pfand", "verfuegbar",
        "beschreibung", "geschmack_beschreibung", "aussehen_geruch",
        "geschichte", "trinktemperatur_info",
        "beschreibung_komplett",
        "bild_url", "bild_lokal", "detail_url",
        "naehrwerte", "brennwert", "kalorien",
    ]
    all_keys = set()
    for beer in beers:
        all_keys.update(beer.keys())

    fieldnames = [f for f in priority_fields if f in all_keys]
    for k in sorted(all_keys):
        if k not in fieldnames:
            fieldnames.append(k)

    with open(OUTPUT_CSV, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for beer in beers:
            row = {}
            for k, v in beer.items():
                if isinstance(v, list):
                    row[k] = ", ".join(str(x) for x in v)
                elif isinstance(v, bool):
                    row[k] = "Ja" if v else "Nein"
                elif v is None:
                    row[k] = ""
                else:
                    row[k] = v
            writer.writerow(row)
    print(f"   💾 {OUTPUT_CSV}")

    # ─── Zusammenfassung ───
    with_ean = sum(1 for b in beers if b.get("ean"))
    with_img = sum(1 for b in beers if b.get("bild_lokal"))
    with_preis = sum(1 for b in beers if b.get("preis_eur"))
    with_zutaten = sum(1 for b in beers if b.get("zutaten"))
    with_beschr = sum(1 for b in beers if b.get("beschreibung") or b.get("beschreibung_komplett"))
    with_geschm = sum(1 for b in beers if b.get("geschmack"))
    with_geruch = sum(1 for b in beers if b.get("geruch"))
    with_optik = sum(1 for b in beers if b.get("optik"))
    with_glastyp = sum(1 for b in beers if b.get("glastyp"))
    with_food = sum(1 for b in beers if b.get("food_pairing"))
    with_brauart = sum(1 for b in beers if b.get("brauart"))
    with_adresse = sum(1 for b in beers if b.get("brauerei_adresse"))
    brauereien = set(b.get("brauerei", "") for b in beers if b.get("brauerei"))
    laender = set(b.get("land", "") for b in beers if b.get("land"))

    print(f"\n{'=' * 65}")
    print(f"✅ FERTIG!")
    print(f"{'=' * 65}")
    print(f"   Biere gesamt:         {len(beers)}")
    print(f"   Brauereien:           {len(brauereien)}")
    print(f"   Länder:               {len(laender)}")
    print(f"   ─────────────────────────────────")
    print(f"   Mit EAN-Code:         {with_ean}")
    print(f"   Mit Bild (lokal):     {with_img}")
    print(f"   Mit Preis:            {with_preis}")
    print(f"   Mit Zutaten:          {with_zutaten}")
    print(f"   ─────────────────────────────────")
    print(f"   Mit Geschmack:        {with_geschm}")
    print(f"   Mit Geruch:           {with_geruch}")
    print(f"   Mit Optik:            {with_optik}")
    print(f"   Mit Brauart:          {with_brauart}")
    print(f"   Mit Glastyp:          {with_glastyp}")
    print(f"   Mit Food Pairing:     {with_food}")
    print(f"   Mit Brauerei-Adresse: {with_adresse}")
    print(f"   ─────────────────────────────────")
    print(f"   Mit Beschreibung:     {with_beschr}")
    print(f"   Spalten in CSV:       {len(fieldnames)}")
    print(f"{'=' * 65}\n")

    land_counts = Counter(b.get("land", "?") for b in beers)
    print("   🌍 Top-Länder:")
    for land, count in land_counts.most_common(10):
        print(f"      {land:<25s} {count:>4d} Biere")

    print()
    return beers


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BierBuddy Crawler v3")
    parser.add_argument("--limit", type=int, default=0,
                        help="Nur die ersten N Biere crawlen (0 = alle)")
    parser.add_argument("--skip-details", action="store_true",
                        help="Nur Tabellendaten, keine Detailseiten")
    parser.add_argument("--skip-images", action="store_true",
                        help="Keine Bilder herunterladen")
    parser.add_argument("--delay", type=float, default=1.0,
                        help="Pause zwischen Requests in Sekunden (Standard: 1.0)")
    args = parser.parse_args()

    crawl(limit=args.limit, skip_details=args.skip_details,
          skip_images=args.skip_images, delay=args.delay)
