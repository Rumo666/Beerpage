#!/usr/bin/env python3
"""
BierBuddy Crawler – bierlinie-shop.de
======================================
Crawlt die Biersorten-Übersichtsseiten, folgt den Detaillinks
und extrahiert alle verfügbaren Daten pro Bier.

Ausgabe: biere_datenbank.json + biere_datenbank.csv

Nutzung:
    python3 bierlinie_crawler.py                    # Standard: max 10 Seiten
    python3 bierlinie_crawler.py --max-pages 50     # Mehr Seiten crawlen
    python3 bierlinie_crawler.py --max-pages 0      # Alle Seiten (kein Limit)
    python3 bierlinie_crawler.py --delay 2.0        # 2 Sek. Pause zwischen Requests
"""

import requests
from bs4 import BeautifulSoup
import json
import csv
import time
import re
import sys
import argparse
from urllib.parse import urljoin

# ─── KONFIGURATION ───
BASE_URL = "https://www.bierlinie-shop.de"
START_URL = f"{BASE_URL}/biersorten/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
}
OUTPUT_JSON = "biere_datenbank.json"
OUTPUT_CSV = "biere_datenbank.csv"


def get_page(url, session, delay=1.0):
    """Seite abrufen mit Fehlerbehandlung und Rate-Limiting."""
    try:
        time.sleep(delay)
        resp = session.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        return BeautifulSoup(resp.text, "lxml")
    except requests.RequestException as e:
        print(f"  ⚠️  Fehler beim Abrufen von {url}: {e}")
        return None


def extract_product_links(soup, base_url):
    """Alle Bier-Detaillinks von einer Übersichtsseite extrahieren."""
    links = set()
    if not soup:
        return links

    # Produktlinks folgen dem Muster: /biersorten/SLUG_ID_ID
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        full_url = urljoin(base_url, href)
        # Detailseiten haben das Muster: /biersorten/name_zahl_zahl
        if re.match(r".*/biersorten/[a-z0-9\-]+_\d+_\d+$", full_url, re.IGNORECASE):
            links.add(full_url)

    return links


def find_next_page(soup, base_url):
    """Nächste Übersichtsseite finden (Pagination)."""
    if not soup:
        return None

    # Suche nach Pagination-Links
    for a_tag in soup.find_all("a", href=True):
        # "Nächste Seite" oder ">" oder "»" Buttons
        text = a_tag.get_text(strip=True)
        if text in ["›", "»", "Nächste", "next", ">"]:
            return urljoin(base_url, a_tag["href"])

        # rel="next" Attribut
        if a_tag.get("rel") and "next" in a_tag.get("rel", []):
            return urljoin(base_url, a_tag["href"])

    # Alternativ: Seiten-Parameter in der URL
    # z.B. ?page=2 oder ?p=2
    page_links = []
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        if "page=" in href or "&p=" in href or "?p=" in href:
            page_links.append(urljoin(base_url, href))

    return None


def extract_beer_data(soup, url):
    """Alle verfügbaren Daten von einer Bier-Detailseite extrahieren."""
    if not soup:
        return None

    data = {"url": url}

    # ─── Name ───
    h1 = soup.find("h1")
    if h1:
        data["name"] = h1.get_text(strip=True)

    # ─── Strukturierte Daten (dt/dd Paare) ───
    field_mapping = {
        "artikelnummer": "artikelnummer",
        "art.nr": "artikelnummer",
        "art.-nr": "artikelnummer",
        "brauerei": "brauerei",
        "brewery": "brauerei",
        "alkoholgehalt": "alkohol",
        "alkohol": "alkohol",
        "abv": "alkohol",
        "inhalt": "inhalt_ml",
        "volumen": "inhalt_ml",
        "zutaten": "zutaten",
        "ingredients": "zutaten",
        "herkunft": "herkunft",
        "herkunftsland": "herkunft",
        "land": "herkunft",
        "stil": "bierstil",
        "bierstil": "bierstil",
        "sorte": "bierstil",
        "kategorie": "kategorie",
        "ean": "ean",
        "barcode": "ean",
        "gtin": "ean",
        "farbe": "farbe",
        "ibu": "ibu",
        "stammwürze": "stammwuerze",
        "empf. trinktemperatur": "trinktemperatur",
        "trinktemperatur": "trinktemperatur",
        "haltbar bis": "haltbarkeit",
        "haltbarkeit": "haltbarkeit",
        "nährwerte": "naehrwerte",
        "brennwert": "brennwert",
        "pfand": "pfand",
    }

    # Methode 1: dt/dd Paare
    for dt in soup.find_all("dt"):
        dd = dt.find_next_sibling("dd")
        if dd:
            key = dt.get_text(strip=True).lower().rstrip(":")
            value = dd.get_text(strip=True)
            for pattern, field_name in field_mapping.items():
                if pattern in key:
                    data[field_name] = value
                    break

    # Methode 2: Tabellen-Zeilen (th/td oder Label/Value Paare)
    for table in soup.find_all("table"):
        for row in table.find_all("tr"):
            cells = row.find_all(["th", "td"])
            if len(cells) >= 2:
                key = cells[0].get_text(strip=True).lower().rstrip(":")
                value = cells[1].get_text(strip=True)
                for pattern, field_name in field_mapping.items():
                    if pattern in key:
                        data[field_name] = value
                        break

    # Methode 3: Spans/Divs mit class-basiertem Key-Value
    for elem in soup.find_all(["span", "div", "li"], class_=re.compile(r"(property|attribute|feature|spec)", re.I)):
        text = elem.get_text(" ", strip=True)
        for pattern, field_name in field_mapping.items():
            if pattern in text.lower():
                # Versuche den Wert nach dem Doppelpunkt zu extrahieren
                if ":" in text:
                    value = text.split(":", 1)[1].strip()
                    data[field_name] = value
                break

    # ─── Preis ───
    price_selectors = [
        {"class_": re.compile(r"(price|preis)", re.I)},
        {"itemprop": "price"},
    ]
    for selector in price_selectors:
        price_elem = soup.find(["span", "div", "p", "meta"], **selector)
        if price_elem:
            if price_elem.name == "meta":
                data["preis"] = price_elem.get("content", "")
            else:
                price_text = price_elem.get_text(strip=True)
                # Preis bereinigen
                price_match = re.search(r"[\d]+[.,][\d]{2}", price_text)
                if price_match:
                    data["preis"] = price_match.group()
            if data.get("preis"):
                break

    # ─── Bild-URL ───
    img_selectors = [
        {"itemprop": "image"},
        {"class_": re.compile(r"(product|item|bier).*img", re.I)},
    ]
    # Hauptbild im Produktbereich
    main_content = soup.find(["div", "section"], class_=re.compile(r"(product|item|single)", re.I))
    search_area = main_content if main_content else soup

    for img in search_area.find_all("img", src=True):
        src = img.get("src", "") or img.get("data-src", "")
        if src and not any(skip in src.lower() for skip in ["logo", "icon", "banner", "payment", "ssl", "flag", "haendlerbund"]):
            data["bild_url"] = urljoin(url, src)
            break

    # ─── Beschreibung ───
    desc_selectors = [
        {"itemprop": "description"},
        {"class_": re.compile(r"(description|beschreibung|product.*text)", re.I)},
    ]
    for selector in desc_selectors:
        desc_elem = soup.find(["div", "p", "span"], **selector)
        if desc_elem:
            desc_text = desc_elem.get_text(" ", strip=True)
            if len(desc_text) > 20:  # Nur wenn es wirklich eine Beschreibung ist
                data["beschreibung"] = desc_text
                break

    # ─── Schema.org / JSON-LD Daten ───
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            ld = json.loads(script.string)
            if isinstance(ld, dict):
                if ld.get("@type") == "Product":
                    if "name" not in data and ld.get("name"):
                        data["name"] = ld["name"]
                    if "beschreibung" not in data and ld.get("description"):
                        data["beschreibung"] = ld["description"]
                    if "bild_url" not in data and ld.get("image"):
                        img = ld["image"]
                        data["bild_url"] = img[0] if isinstance(img, list) else img
                    if "ean" not in data and ld.get("gtin13"):
                        data["ean"] = ld["gtin13"]
                    if "ean" not in data and ld.get("gtin"):
                        data["ean"] = ld["gtin"]
                    if ld.get("brand"):
                        brand = ld["brand"]
                        if isinstance(brand, dict):
                            data.setdefault("brauerei", brand.get("name", ""))
                        elif isinstance(brand, str):
                            data.setdefault("brauerei", brand)
                    if ld.get("offers"):
                        offers = ld["offers"]
                        if isinstance(offers, dict):
                            data.setdefault("preis", offers.get("price", ""))
                            data.setdefault("waehrung", offers.get("priceCurrency", "EUR"))
                            data.setdefault("verfuegbarkeit", offers.get("availability", ""))
                        elif isinstance(offers, list) and offers:
                            data.setdefault("preis", offers[0].get("price", ""))
        except (json.JSONDecodeError, TypeError):
            pass

    # ─── Meta-Tags ───
    for meta in soup.find_all("meta"):
        prop = meta.get("property", "") or meta.get("name", "")
        content = meta.get("content", "")
        if prop == "og:image" and "bild_url" not in data:
            data["bild_url"] = content
        if prop == "og:description" and "beschreibung" not in data and len(content) > 20:
            data["beschreibung"] = content

    # ─── Alkohol-Wert bereinigen ───
    if "alkohol" in data:
        alk_match = re.search(r"[\d]+[.,]?\d*", data["alkohol"])
        if alk_match:
            data["alkohol_prozent"] = float(alk_match.group().replace(",", "."))

    # ─── Inhalt bereinigen ───
    if "inhalt_ml" in data:
        ml_match = re.search(r"[\d]+", data["inhalt_ml"])
        if ml_match:
            data["inhalt_ml_zahl"] = int(ml_match.group())

    # ─── Breadcrumb / Kategorien ───
    breadcrumbs = []
    for bc in soup.find_all(["ol", "ul"], class_=re.compile(r"breadcrumb", re.I)):
        for li in bc.find_all("li"):
            text = li.get_text(strip=True)
            if text and text not in ["Home", "Zur Startseite gehen"]:
                breadcrumbs.append(text)
    if breadcrumbs:
        data["kategorien"] = breadcrumbs

    # Schema.org BreadcrumbList
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            ld = json.loads(script.string)
            if isinstance(ld, dict) and ld.get("@type") == "BreadcrumbList":
                items = ld.get("itemListElement", [])
                bc_names = [item.get("item", {}).get("name", "") for item in items if item.get("item", {}).get("name", "")]
                bc_names = [n for n in bc_names if n not in ["Home", ""]]
                if bc_names and "kategorien" not in data:
                    data["kategorien"] = bc_names
        except (json.JSONDecodeError, TypeError):
            pass

    return data


def crawl(max_pages=10, delay=1.0):
    """Hauptfunktion: Crawlt Übersichtsseiten und folgt Detaillinks."""

    session = requests.Session()
    all_product_links = set()
    all_beers = []

    # ─── Phase 1: Übersichtsseiten crawlen, Produktlinks sammeln ───
    print("=" * 60)
    print("🍺 BierBuddy Crawler – bierlinie-shop.de")
    print("=" * 60)
    print(f"\n📋 Phase 1: Übersichtsseiten scannen...")
    print(f"   Max. Seiten: {'unbegrenzt' if max_pages == 0 else max_pages}")
    print(f"   Delay: {delay}s zwischen Requests\n")

    current_url = START_URL
    page_count = 0

    while current_url:
        page_count += 1
        if max_pages > 0 and page_count > max_pages:
            print(f"\n   ⏹️  Seitenlimit ({max_pages}) erreicht.")
            break

        print(f"   📄 Seite {page_count}: {current_url}")
        soup = get_page(current_url, session, delay)
        if not soup:
            break

        links = extract_product_links(soup, current_url)
        new_links = links - all_product_links
        all_product_links.update(new_links)
        print(f"      → {len(new_links)} neue Bier-Links gefunden (Gesamt: {len(all_product_links)})")

        if not new_links:
            # Versuche Pagination
            # Prüfe ob es ?page=N Links gibt
            next_page = None
            for a in soup.find_all("a", href=True):
                href = a["href"]
                if "page=" in href:
                    full = urljoin(current_url, href)
                    # Nächste Seite relativ zur aktuellen
                    match = re.search(r"page=(\d+)", href)
                    if match:
                        next_page = full
                        break

            if next_page and next_page != current_url:
                current_url = next_page
            else:
                print(f"\n   ✅ Keine weiteren Seiten gefunden.")
                break
        else:
            # Standard-Pagination versuchen
            next_url = find_next_page(soup, current_url)
            if next_url and next_url != current_url:
                current_url = next_url
            elif "page=" in current_url:
                # Seitenzahl hochzählen
                match = re.search(r"page=(\d+)", current_url)
                if match:
                    next_num = int(match.group(1)) + 1
                    current_url = re.sub(r"page=\d+", f"page={next_num}", current_url)
                else:
                    break
            else:
                # Erste Pagination versuchen
                current_url = f"{START_URL}?page=2"
                # Prüfen ob es klappt
                test_soup = get_page(current_url, session, delay)
                if not test_soup:
                    break
                test_links = extract_product_links(test_soup, current_url)
                if not test_links - all_product_links:
                    break

    print(f"\n   🔗 Gesamt: {len(all_product_links)} Bier-Detailseiten gefunden\n")

    # ─── Phase 2: Detailseiten crawlen ───
    print(f"📋 Phase 2: Bier-Details extrahieren...")
    print(f"   {len(all_product_links)} Biere zu verarbeiten\n")

    for i, link in enumerate(sorted(all_product_links), 1):
        print(f"   🍺 [{i}/{len(all_product_links)}] ", end="")
        soup = get_page(link, session, delay)
        if soup:
            beer = extract_beer_data(soup, link)
            if beer and beer.get("name"):
                all_beers.append(beer)
                name = beer.get("name", "?")[:50]
                brauerei = beer.get("brauerei", "?")
                ean = beer.get("ean", "–")
                print(f"✅ {name} | {brauerei} | EAN: {ean}")
            else:
                print(f"⚠️  Keine Daten: {link}")
        else:
            print(f"❌ Fehler: {link}")

    # ─── Phase 3: Daten speichern ───
    print(f"\n📋 Phase 3: Daten speichern...")

    # JSON
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(all_beers, f, ensure_ascii=False, indent=2)
    print(f"   💾 {OUTPUT_JSON} ({len(all_beers)} Biere)")

    # CSV
    if all_beers:
        # Alle vorkommenden Felder sammeln
        all_fields = []
        # Gewünschte Reihenfolge der wichtigsten Felder
        priority_fields = [
            "name", "brauerei", "ean", "artikelnummer", "bierstil", "kategorie",
            "alkohol", "alkohol_prozent", "inhalt_ml", "inhalt_ml_zahl",
            "zutaten", "herkunft", "farbe", "ibu", "stammwuerze",
            "trinktemperatur", "preis", "waehrung", "verfuegbarkeit",
            "pfand", "beschreibung", "bild_url", "url", "kategorien",
            "naehrwerte", "brennwert", "haltbarkeit",
        ]
        seen = set()
        for field in priority_fields:
            if any(field in beer for beer in all_beers):
                all_fields.append(field)
                seen.add(field)
        # Restliche Felder alphabetisch
        for beer in all_beers:
            for key in sorted(beer.keys()):
                if key not in seen:
                    all_fields.append(key)
                    seen.add(key)

        with open(OUTPUT_CSV, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=all_fields, extrasaction="ignore")
            writer.writeheader()
            for beer in all_beers:
                # Listen zu Strings konvertieren
                row = {}
                for k, v in beer.items():
                    if isinstance(v, list):
                        row[k] = " > ".join(str(x) for x in v)
                    else:
                        row[k] = v
                writer.writerow(row)
        print(f"   💾 {OUTPUT_CSV} ({len(all_beers)} Biere, {len(all_fields)} Spalten)")

    # ─── Zusammenfassung ───
    print(f"\n{'=' * 60}")
    print(f"✅ FERTIG!")
    print(f"   Biere gesamt:    {len(all_beers)}")
    if all_beers:
        with_ean = sum(1 for b in all_beers if b.get("ean"))
        with_img = sum(1 for b in all_beers if b.get("bild_url"))
        with_brauerei = sum(1 for b in all_beers if b.get("brauerei"))
        brauereien = set(b.get("brauerei", "") for b in all_beers if b.get("brauerei"))
        print(f"   Mit EAN-Code:    {with_ean}")
        print(f"   Mit Bild:        {with_img}")
        print(f"   Mit Brauerei:    {with_brauerei}")
        print(f"   Brauereien:      {len(brauereien)}")
    print(f"   Dateien:         {OUTPUT_JSON}, {OUTPUT_CSV}")
    print(f"{'=' * 60}\n")

    return all_beers


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BierBuddy Crawler – bierlinie-shop.de")
    parser.add_argument("--max-pages", type=int, default=10,
                        help="Max. Übersichtsseiten (0 = unbegrenzt, Standard: 10)")
    parser.add_argument("--delay", type=float, default=1.0,
                        help="Pause zwischen Requests in Sekunden (Standard: 1.0)")
    args = parser.parse_args()

    crawl(max_pages=args.max_pages, delay=args.delay)
