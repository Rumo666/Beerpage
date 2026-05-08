#!/usr/bin/env python3
"""
BierBuddy – Bilder Upload zu Cloudflare R2
==========================================
Lädt alle Bilder aus dem lokalen bilder/ Ordner zu Cloudflare R2 hoch
und aktualisiert die biere_datenbank.json mit den neuen URLs.

Nutzung:
  1. SECRET_ACCESS_KEY unten eintragen
  2. python3 upload_bilder_r2.py
"""

import boto3
import os
import json
from pathlib import Path
from botocore.config import Config

# ─── KONFIGURATION – HIER ANPASSEN ───
ACCOUNT_ID = "f15e71b9b1d5c21a105354072e013c50"
ACCESS_KEY_ID = "f2ab34351f8abaaf12223c777f1a1f19"
SECRET_ACCESS_KEY = "HIER_DEINEN_SECRET_KEY_EINTRAGEN"  # ← eintragen!
BUCKET_NAME = "bierbuddy-bilder"
PUBLIC_URL = f"https://pub-{ACCOUNT_ID}.r2.dev"  # Wird später angepasst

# Pfade
BILDER_ORDNER = r"C:\Users\msomm\PyCharmMiscProject\bilder"
JSON_DATEI = "biere_datenbank.json"
JSON_OUTPUT = "biere_datenbank_r2.json"  # Aktualisierte Version

# ─── R2 CLIENT ───
s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=ACCESS_KEY_ID,
    aws_secret_access_key=SECRET_ACCESS_KEY,
    config=Config(signature_version="s3v4"),
    region_name="auto",
)

def upload_bilder():
    bilder_pfad = Path(BILDER_ORDNER)
    if not bilder_pfad.exists():
        print(f"❌ Ordner nicht gefunden: {BILDER_ORDNER}")
        return {}

    dateien = list(bilder_pfad.glob("*"))
    bild_dateien = [d for d in dateien if d.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]]
    print(f"📁 {len(bild_dateien)} Bilder gefunden in {BILDER_ORDNER}\n")

    # Content-Type Mapping
    content_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }

    uploaded = {}
    fehler = 0

    for i, datei in enumerate(bild_dateien, 1):
        key = datei.name  # Dateiname als R2-Key
        content_type = content_types.get(datei.suffix.lower(), "image/jpeg")

        print(f"  [{i:3d}/{len(bild_dateien)}] {datei.name[:50]:<50s} ", end="", flush=True)

        try:
            # Prüfen ob bereits hochgeladen
            try:
                s3.head_object(Bucket=BUCKET_NAME, Key=key)
                print("⏭️  bereits vorhanden")
                uploaded[datei.name] = f"{PUBLIC_URL}/{key}"
                continue
            except Exception:
                pass  # Noch nicht vorhanden, hochladen

            # Hochladen
            with open(datei, "rb") as f:
                s3.put_object(
                    Bucket=BUCKET_NAME,
                    Key=key,
                    Body=f,
                    ContentType=content_type,
                )

            r2_url = f"{PUBLIC_URL}/{key}"
            uploaded[datei.name] = r2_url
            print(f"✅")

        except Exception as e:
            print(f"❌ {e}")
            fehler += 1

    print(f"\n✅ {len(uploaded)} Bilder hochgeladen, {fehler} Fehler\n")
    return uploaded


def update_json(uploaded: dict):
    """Aktualisiert die JSON-Datenbank mit den neuen R2-URLs."""
    if not os.path.exists(JSON_DATEI):
        print(f"⚠️  {JSON_DATEI} nicht gefunden – überspringe JSON-Update")
        return

    with open(JSON_DATEI, "r", encoding="utf-8") as f:
        biere = json.load(f)

    updated = 0
    for bier in biere:
        bild_lokal = bier.get("bild_lokal", "")
        if bild_lokal:
            # Nur Dateiname extrahieren
            dateiname = Path(bild_lokal).name
            if dateiname in uploaded:
                bier["bild_url_r2"] = uploaded[dateiname]
                updated += 1

    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(biere, f, ensure_ascii=False, indent=2)

    print(f"💾 JSON aktualisiert: {updated} Biere mit R2-URL")
    print(f"   Gespeichert als: {JSON_OUTPUT}\n")


if __name__ == "__main__":
    print("=" * 60)
    print("🍺 BierBuddy – Bilder Upload zu Cloudflare R2")
    print("=" * 60)

    if SECRET_ACCESS_KEY == "HIER_DEINEN_SECRET_KEY_EINTRAGEN":
        print("❌ Bitte erst SECRET_ACCESS_KEY im Script eintragen!")
        exit(1)

    print(f"\n📡 Verbinde mit R2 Bucket: {BUCKET_NAME}")

    # Test-Verbindung
    try:
        s3.head_bucket(Bucket=BUCKET_NAME)
        print("✅ Verbindung erfolgreich!\n")
    except Exception as e:
        print(f"❌ Verbindungsfehler: {e}")
        exit(1)

    # Bilder hochladen
    uploaded = upload_bilder()

    # JSON aktualisieren
    if uploaded:
        update_json(uploaded)

    print("=" * 60)
    print("✅ FERTIG!")
    print("=" * 60)
    print("\nNächste Schritte:")
    print("1. Bucket in Cloudflare öffentlich machen")
    print("2. biere_datenbank_r2.json in Projektordner kopieren")
    print("3. npm run db:seed erneut ausführen")