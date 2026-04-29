# 🍺 BierBuddy – Konzeptdokument

## 1. Projektübersicht

**BierBuddy** ist eine geschlossene Community-Webapp für Bierliebhaber. Mitglieder können Biere bewerten, Rezepte teilen, Dateien austauschen und Barcodes scannen, um Biere schnell zu identifizieren.

**Zielgruppe:** Ausgewählter, geschlossener Personenkreis (Einladungssystem)

---

## 2. Kernfunktionen

### 2.1 Bier-Bewertungssystem

**Basisdaten pro Eintrag:**
- Biername, Brauerei, Biersorte (aus Katalog wählbar)
- Foto / Bild-Upload (Flasche, Etikett, Glas)
- EAN-Code (manuell oder per Kamera-Scan)

**Anklickbare Bewertungsoptionen:**

| Kategorie | Optionen (Auswahl per Tap/Klick) |
|---|---|
| Gesamtbewertung | ★ 1–5 Sterne |
| Geschmacksprofil | Bitter · Süß · Malzig · Hopfig · Fruchtig · Würzig · Röstaromen · Sauer |
| Mundgefühl / Körper | Leicht · Mittel · Vollmundig · Cremig |
| Kohlensäure | Wenig · Mittel · Stark |
| Optik / Farbe | Hellgelb · Gold · Bernstein · Kupfer · Braun · Schwarz |
| Anlass-Tags | Grillabend · Bar · Restaurant · Zuhause · Urlaub · Feier · Verkostung |
| Nochmal kaufen? | 👍 Ja · 👎 Nein · 🤷 Vielleicht |
| Preis-Leistung | Schnäppchen · Fair · Teuer · Überteuert |

**Freitextfeld:** Persönliche Notizen, Geschmacksbeschreibung

### 2.2 EAN-Barcode-Scanner

- Kamera-basierter Barcode-Scanner (im Browser, kein App-Download nötig)
- Technologie: `quagga2` oder `html5-qrcode` Library
- Ablauf: Kamera öffnen → EAN erkennen → Produktdaten aus Open Food Facts API abrufen → Formular automatisch vorbefüllen (Name, Brauerei, Bild)
- Fallback: Manuelle EAN-Eingabe mit Suchfunktion
- Bereits bewertete EANs werden erkannt und verlinkt

### 2.3 Community-Bereich

- **Globaler Feed:** Alle Bewertungen chronologisch, filterbar nach Sorte/Bewertung
- **Kommentare:** Unter jeder Bewertung können andere Mitglieder kommentieren
- **Ranglisten:**
  - Top-Biere nach Durchschnittsbewertung
  - Aktivste Bewerter
  - Meistbewertete Sorten
- **Likes / "Prost!"-Reaktion** auf Bewertungen

### 2.4 Rezepte-Bereich

- Homebrew-Rezepte anlegen und teilen
- Strukturierte Felder: Zutaten, Brauanleitung (Schritte), Schwierigkeit, Brauzeit, Ziel-Biersorte
- Bild-Upload für fertige Ergebnisse
- Kommentarfunktion: "Hab ich nachgebraut, hier mein Ergebnis"
- Bewertung von Rezepten durch die Community

### 2.5 Dateien-Bereich

- Gemeinsamer Datei-Ablageort für die Gruppe
- Upload-Typen: PDFs, Bilder, Dokumente (z.B. Brauanleitungen, Verkostungsbögen, Event-Pläne)
- Ordnerstruktur oder Tag-basierte Organisation
- Vorschau für Bilder und PDFs
- Download-Funktion

### 2.6 Benutzermanagement

**Geschlossenes System mit Einladungen:**
- Registrierung nur per Einladungslink oder -code
- Admin kann Einladungscodes generieren (einmalig oder mehrfach verwendbar)
- Kein öffentliches Registrierungsformular

**Benutzerrollen:**

| Rolle | Rechte |
|---|---|
| Admin | Alles: User verwalten, Einladungen, Inhalte moderieren, Dateien löschen |
| Mitglied | Bewerten, Rezepte anlegen, Dateien hochladen, Kommentieren |

**Profil:**
- Benutzername, Avatar-Bild
- Persönliche Statistiken: Anzahl Bewertungen, Lieblingssorten, Durchschnittsbewertung
- Aktivitätsverlauf

---

## 3. Seitenstruktur

```
/               → Login / Landing
/feed           → Globaler Bewertungs-Feed (Startseite nach Login)
/bier/neu       → Neue Bewertung anlegen (+ Scanner)
/bier/:id       → Einzelansicht einer Bewertung mit Kommentaren
/scanner        → EAN-Scanner Standalone
/rezepte        → Rezepte-Übersicht
/rezepte/neu    → Neues Rezept anlegen
/rezepte/:id    → Einzelansicht Rezept
/dateien        → Datei-Ablage
/rangliste      → Community-Ranglisten
/profil/:user   → Benutzerprofil + persönliche Stats
/profil/edit    → Eigenes Profil bearbeiten
/admin          → Userverwaltung, Einladungscodes (nur Admin)
```

---

## 4. Datenmodell (vereinfacht)

### User
```
id
benutzername
email
passwort_hash
avatar_url
rolle: "admin" | "mitglied"
erstellt_am
eingeladen_von → User.id
```

### Bewertung
```
id
user_id → User.id
biername
brauerei
sorte                   (z.B. "IPA", "Weizen")
ean_code                (optional)
bild_urls[]             (Array von Bild-Pfaden)
sterne                  (1–5)
geschmack[]             (Array: bitter, süß, malzig, ...)
mundgefuehl             (leicht | mittel | vollmundig | cremig)
kohlensaeure            (wenig | mittel | stark)
farbe                   (hellgelb | gold | bernstein | ...)
anlass_tags[]           (Array: grillabend, bar, ...)
nochmal_kaufen          (ja | nein | vielleicht)
preis_leistung          (schnäppchen | fair | teuer | überteuert)
notizen                 (Freitext)
erstellt_am
```

### Kommentar
```
id
bewertung_id → Bewertung.id   ODER   rezept_id → Rezept.id
user_id → User.id
text
erstellt_am
```

### Rezept
```
id
user_id → User.id
titel
ziel_sorte
schwierigkeit           (einfach | mittel | fortgeschritten)
brauzeit_stunden
zutaten[]               (Array von {name, menge, einheit})
schritte[]              (Array von {reihenfolge, beschreibung})
bild_urls[]
erstellt_am
```

### Datei
```
id
user_id → User.id
dateiname
dateipfad
dateityp                (pdf | bild | dokument)
tags[]
groesse_bytes
erstellt_am
```

### Einladung
```
id
code
erstellt_von → User.id
max_nutzungen
aktuelle_nutzungen
gueltig_bis
```

---

## 5. Tech-Stack-Empfehlung

### Option A: Klassisch (empfohlen für den Anfang)

| Schicht | Technologie | Warum |
|---|---|---|
| Frontend | **Next.js** (React) | SSR, Routing, API-Routes in einem Paket |
| Backend/API | **Next.js API Routes** oder **Express.js** | Schnell aufgesetzt, große Community |
| Datenbank | **PostgreSQL** + Prisma ORM | Zuverlässig, relational, gut für strukturierte Daten |
| Auth | **NextAuth.js** | Session-Management, einfach anpassbar für Invite-Only |
| Bild-Storage | **S3-kompatibel** (AWS S3, Cloudflare R2, MinIO) | Skalierbar, günstig |
| Barcode-Scan | **html5-qrcode** (Frontend-Library) | Kein Backend nötig, läuft im Browser |
| Produkt-Lookup | **Open Food Facts API** | Frei, gute Abdeckung für Getränke |
| Hosting | **Vercel** (Frontend) + **Railway/Render** (DB) | Einfaches Deployment |

### Option B: Fullstack Node.js (mehr Kontrolle)

| Schicht | Technologie |
|---|---|
| Frontend | React (Vite) oder Vue.js |
| Backend | Express.js oder Fastify |
| Datenbank | PostgreSQL oder MongoDB |
| Auth | Passport.js + JWT |
| Hosting | VPS (Hetzner, DigitalOcean) mit Docker |

### Antwort auf die Node.js-Frage

**Ja, Node.js ist sinnvoll** – besonders weil:
- Frontend (React) und Backend dieselbe Sprache sprechen (JavaScript/TypeScript)
- Große Auswahl an Libraries für Barcode-Scanning, Bild-Upload, Auth
- Einfaches Deployment mit Vercel/Railway
- Gut geeignet für eine Community-App mit Echtzeit-Potential (z.B. Live-Feed via WebSockets später)

---

## 6. Offene Entscheidungen

Folgende Punkte sollten vor der Entwicklung geklärt werden:

1. **Erwartete Nutzerzahl?** (10 Freunde vs. 100+ Mitglieder → beeinflusst Hosting-Kosten)
2. **Mobile-First oder Desktop-First?** (oder als PWA für beide?)
3. **Soll der Admin bestehende User sperren/entfernen können?**
4. **Benachrichtigungen?** (z.B. "X hat deine Bewertung kommentiert" – per E-Mail, Push, oder nur in-App?)
5. **Soll es eine Suchfunktion über alle Biere geben?** (z.B. "Zeig mir alle IPAs mit 4+ Sternen")
6. **Braucht der Rezepte-Bereich Mengenumrechnung?** (z.B. für verschiedene Braukessel-Größen)
7. **Dateigrößen-Limit für Uploads?**

---

## 7. Nächste Schritte

1. ✅ Konzept erstellen (dieses Dokument)
2. ⬜ Offene Fragen klären
3. ⬜ UI/UX-Prototyp als interaktive React-App (kann ich hier bauen)
4. ⬜ Tech-Stack final entscheiden
5. ⬜ Datenbank-Schema aufsetzen
6. ⬜ MVP entwickeln (Kern: Auth + Bewertungen + Scanner)
7. ⬜ Community-Features ergänzen (Feed, Kommentare, Ranglisten)
8. ⬜ Rezepte + Dateien ergänzen
9. ⬜ Testing + Deployment
