# 🍺 BierBuddy – Konzeptdokument v2

## 1. Projektübersicht

**BierBuddy** ist eine geschlossene Community-PWA für Bierliebhaber. Mitglieder können Biere bewerten, Rezepte teilen, Dateien austauschen, Wissen im Wiki sammeln und Barcodes scannen, um Biere schnell zu identifizieren.

**Zielgruppe:** Geschlossener Personenkreis, 10–20 Nutzer zum Start
**Plattform:** Progressive Web App (PWA) – installierbar auf Handy, Tablet und Desktop
**Zugang:** Nur per Einladungscode vom Admin

---

## 2. Entschiedene Rahmenbedingungen

| Frage | Entscheidung |
|---|---|
| Nutzerzahl | 10–20 zum Start, skalierbar |
| Plattform | PWA (Mobile + Desktop) |
| Admin-Rechte | Volle Kontrolle (sperren, löschen, moderieren) |
| Benachrichtigungen | Ja – In-App + Push-Notifications (PWA) |
| Suchfunktion | Ja – Volltextsuche über Biere, Rezepte, Wiki |
| Upload-Grenze | Im Backend konfigurierbar (Admin-Einstellung) |
| Mengenumrechnung Rezepte | Ja (Nice-to-have für MVP2) |

---

## 3. Kernfunktionen

### 3.1 Bier-Bewertungssystem

**Basisdaten pro Eintrag:**
- Biername, Brauerei, Biersorte (aus Katalog wählbar)
- Foto / Bild-Upload (Flasche, Etikett, Glas) – mehrere Bilder möglich
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

### 3.2 EAN-Barcode-Scanner

- Kamera-basierter Barcode-Scanner direkt im Browser (kein App-Download)
- Technologie: `html5-qrcode` Library
- Ablauf: Kamera öffnen → EAN erkennen → Produktdaten aus Open Food Facts API abrufen → Formular automatisch vorbefüllen (Name, Brauerei, Bild)
- Fallback: Manuelle EAN-Eingabe mit Suchfunktion
- Bereits bewertete EANs werden erkannt → "Dieses Bier wurde schon X mal bewertet"

### 3.3 Community-Bereich

- **Globaler Feed:** Alle Bewertungen chronologisch, filterbar nach Sorte/Bewertung/User
- **Kommentare:** Unter jeder Bewertung und jedem Rezept
- **Ranglisten:**
  - Top-Biere nach Durchschnittsbewertung
  - Aktivste Bewerter
  - Meistbewertete Sorten
  - Bier der Woche/des Monats
- **"Prost!"-Reaktion** auf Bewertungen (Like-Äquivalent)

### 3.4 Rezepte-Bereich

- Homebrew-Rezepte anlegen und teilen
- Strukturierte Felder: Zutaten, Brauanleitung (Schritte), Schwierigkeit, Brauzeit, Ziel-Biersorte
- Mengenumrechnung für verschiedene Braukessel-Größen (MVP2)
- Bild-Upload für fertige Ergebnisse
- Kommentarfunktion: "Hab ich nachgebraut, hier mein Ergebnis"
- Bewertung von Rezepten durch die Community

### 3.5 Dateien-Bereich

- Gemeinsamer Datei-Ablageort für die Gruppe
- Upload-Typen: PDFs, Bilder, Dokumente (Brauanleitungen, Verkostungsbögen, Event-Pläne)
- Ordnerstruktur oder Tag-basierte Organisation
- Vorschau für Bilder und PDFs im Browser
- Download-Funktion
- Upload-Größe im Admin-Panel konfigurierbar (Standard z.B. 20 MB)

### 3.6 Wiki

Das Wiki dient als gemeinsame Wissensdatenbank der Community.

**Inhalte (Beispiele):**
- Bierstil-Lexikon (Was ist ein IPA? Was macht ein Märzen aus?)
- Brau-Grundlagen (Maischen, Läutern, Hopfenkochen, Gärung)
- Zutaten-Guide (Malzsorten, Hopfensorten, Hefen)
- Verkostungstipps & Sensorik
- Glossar (Stammwürze, IBU, EBC, OG/FG, Attenuation…)
- Equipment-Ratgeber
- Bezugsquellen & Empfehlungen

**Funktionen:**
- Jedes Mitglied kann Artikel anlegen und bearbeiten
- Versionsverlauf: Alle Änderungen nachvollziehbar, Rollback möglich
- Kategorien & Tags zur Strukturierung
- Interne Verlinkung zwischen Wiki-Artikeln
- Bilder einbetten
- Volltextsuche über alle Artikel
- Admin kann Artikel sperren oder schützen (nur Admin editierbar)

### 3.7 Globale Suche

Eine zentrale Suchleiste durchsucht alle Bereiche gleichzeitig:
- Bier-Bewertungen (Name, Brauerei, Sorte, EAN)
- Rezepte (Titel, Zutaten, Sorte)
- Wiki-Artikel (Titel, Inhalt)
- Dateien (Dateiname, Tags)

Filter kombinierbar: z.B. "Alle IPAs mit 4+ Sternen" oder "Rezepte mit Cascade-Hopfen"

### 3.8 Benachrichtigungen

**In-App (Glocken-Icon mit Badge):**
- "Max hat deine Bewertung kommentiert"
- "Neues Bier im Feed: Augustiner Edelstoff"
- "Lisa hat dein Rezept mit 5 Sternen bewertet"
- "Neuer Wiki-Artikel: Hopfensorten-Guide"
- Admin-Nachrichten an alle

**Push-Notifications (PWA):**
- Gleiche Events wie In-App, nur wenn User nicht aktiv in der App ist
- User kann pro Kategorie ein-/ausschalten (Einstellungen)

---

## 4. Seitenstruktur

```
/                    → Login
/feed                → Globaler Bewertungs-Feed (Startseite)
/bier/neu            → Neue Bewertung anlegen (+ Scanner)
/bier/:id            → Einzelansicht Bewertung + Kommentare
/scanner             → EAN-Scanner Standalone
/suche               → Globale Suche mit Filtern
/rezepte             → Rezepte-Übersicht
/rezepte/neu         → Neues Rezept anlegen
/rezepte/:id         → Einzelansicht Rezept + Kommentare
/wiki                → Wiki Startseite / Kategorieübersicht
/wiki/neu            → Neuen Artikel anlegen
/wiki/:slug          → Wiki-Artikel lesen
/wiki/:slug/edit     → Wiki-Artikel bearbeiten
/wiki/:slug/history  → Versionsverlauf
/dateien             → Datei-Ablage mit Ordnern/Tags
/rangliste           → Community-Ranglisten
/profil/:user        → Benutzerprofil + Stats
/profil/edit         → Eigenes Profil + Benachrichtigungs-Einstellungen
/admin               → Admin-Dashboard
/admin/users         → Userverwaltung (sperren, entfernen, Rolle ändern)
/admin/einladungen   → Einladungscodes generieren/verwalten
/admin/einstellungen → Upload-Limits, App-Einstellungen
```

**Navigation (Mobile Bottom-Bar / Desktop Sidebar):**

| Icon | Bereich |
|---|---|
| 🏠 | Feed |
| 🔍 | Suche |
| ➕ | Neues Bier (FAB-Button) |
| 📖 | Rezepte & Wiki |
| 👤 | Profil & Einstellungen |

---

## 5. Datenmodell

### User
```
id              UUID
benutzername    String (unique)
email           String (unique)
passwort_hash   String
avatar_url      String?
rolle           "admin" | "mitglied"
gesperrt        Boolean (default: false)
push_token      String? (für PWA Push)
benachrichtigungen JSON (Einstellungen pro Kategorie)
erstellt_am     DateTime
eingeladen_von  → User.id
```

### Bewertung
```
id              UUID
user_id         → User.id
biername        String
brauerei        String?
sorte           String (aus Katalog)
ean_code        String?
bild_urls       String[]
sterne          Int (1–5)
geschmack       String[] (bitter, süß, malzig, ...)
mundgefuehl     String? (leicht | mittel | vollmundig | cremig)
kohlensaeure    String? (wenig | mittel | stark)
farbe           String? (hellgelb | gold | bernstein | ...)
anlass_tags     String[]
nochmal_kaufen  String? (ja | nein | vielleicht)
preis_leistung  String? (schnäppchen | fair | teuer | überteuert)
notizen         String?
prost_count     Int (default: 0)
erstellt_am     DateTime
aktualisiert_am DateTime
```

### Kommentar
```
id              UUID
user_id         → User.id
bewertung_id    → Bewertung.id? (entweder Bewertung ODER Rezept)
rezept_id       → Rezept.id?
text            String
erstellt_am     DateTime
```

### Rezept
```
id              UUID
user_id         → User.id
titel           String
ziel_sorte      String
schwierigkeit   "einfach" | "mittel" | "fortgeschritten"
brauzeit_std    Float
basis_menge_l   Float (Liter, für Umrechnung)
zutaten         JSON[] ({name, menge, einheit})
schritte        JSON[] ({reihenfolge, beschreibung})
bild_urls       String[]
erstellt_am     DateTime
aktualisiert_am DateTime
```

### WikiArtikel
```
id              UUID
slug            String (unique, URL-freundlich)
titel           String
inhalt          String (Markdown)
kategorie       String
tags            String[]
erstellt_von    → User.id
zuletzt_bearbeitet_von → User.id
geschuetzt      Boolean (default: false, nur Admin editierbar)
erstellt_am     DateTime
aktualisiert_am DateTime
```

### WikiVersion
```
id              UUID
artikel_id      → WikiArtikel.id
inhalt          String (Markdown, Snapshot)
bearbeitet_von  → User.id
aenderungsnotiz String?
erstellt_am     DateTime
```

### Datei
```
id              UUID
user_id         → User.id
dateiname       String
dateipfad       String
dateityp        String (MIME-Type)
groesse_bytes   Int
tags            String[]
ordner          String? (Pfad)
erstellt_am     DateTime
```

### Einladung
```
id              UUID
code            String (unique)
erstellt_von    → User.id
max_nutzungen   Int
aktuelle_nutzungen Int (default: 0)
gueltig_bis     DateTime?
erstellt_am     DateTime
```

### Benachrichtigung
```
id              UUID
empfaenger_id   → User.id
typ             String (kommentar | prost | bewertung | rezept | wiki | admin)
titel           String
text            String
link            String (relative URL zum Ziel)
gelesen         Boolean (default: false)
erstellt_am     DateTime
```

### Prost (Likes)
```
id              UUID
user_id         → User.id
bewertung_id    → Bewertung.id
erstellt_am     DateTime
UNIQUE(user_id, bewertung_id)
```

---

## 6. Tech-Stack (Final)

| Schicht | Technologie | Begründung |
|---|---|---|
| Frontend | **Next.js 14+** (React, App Router) | SSR, PWA-fähig, API-Routes integriert |
| PWA | **next-pwa** + Service Worker | Installierbar, Offline-Cache, Push-Notifications |
| Backend/API | **Next.js API Routes** (Node.js) | Alles in einem Projekt, kein separater Server |
| Datenbank | **PostgreSQL** + **Prisma ORM** | Relational, robust, perfekt für strukturierte Daten |
| Auth | **NextAuth.js** (Credentials Provider) | Session-basiert, einfach für Invite-Only |
| Bild-Storage | **Cloudflare R2** (S3-kompatibel) | Günstig (10 GB frei), kein Egress-Kosten |
| Barcode-Scan | **html5-qrcode** (Frontend) | Läuft im Browser, kein natives SDK nötig |
| Produkt-API | **Open Food Facts API** | Frei, gute Abdeckung für Getränke-EANs |
| Push-Notifications | **Web Push API** + **web-push** (Node) | Standard-PWA-Push, kein Drittanbieter |
| Wiki-Rendering | **react-markdown** + **remark** | Markdown → HTML mit Syntax-Highlighting |
| Suche | **PostgreSQL Full-Text Search** | Reicht für 10–20 User locker, kein Elasticsearch nötig |
| Hosting | **Vercel** (App) + **Neon/Supabase** (DB) | Kostenloser Tier reicht für 10–20 User |

**Geschätzte monatliche Kosten bei 10–20 Usern:**
- Vercel Free Tier: 0 €
- Neon Free Tier (PostgreSQL): 0 € (0.5 GB DB)
- Cloudflare R2 Free Tier: 0 € (10 GB Storage)
- **Gesamt: 0 € zum Start**, skalierbar bei Wachstum

---

## 7. PWA-Features

| Feature | Umsetzung |
|---|---|
| Installierbar | Web App Manifest mit Icons, Splash Screen |
| Offline-Grundfunktion | Service Worker cached App-Shell + letzte Daten |
| Push-Notifications | Web Push API, User wählt Kategorien in Einstellungen |
| Kamera-Zugriff | MediaDevices API für Barcode-Scanner |
| Add to Homescreen | Automatischer Prompt nach 2. Besuch |

---

## 8. Admin-Dashboard

Der Admin hat ein eigenes Dashboard mit folgenden Funktionen:

**Userverwaltung:**
- Alle User auflisten mit Status (aktiv/gesperrt)
- User sperren / entsperren / entfernen
- Rolle ändern (Mitglied ↔ Admin)
- Aktivität einsehen (letzte Bewertung, letzter Login)

**Einladungen:**
- Neue Codes generieren (einmalig oder X-fach verwendbar)
- Gültigkeitsdauer setzen
- Übersicht: Wer hat welchen Code genutzt?

**Einstellungen:**
- Upload-Größenlimit anpassen (Standard: 20 MB)
- Erlaubte Dateitypen konfigurieren
- Wiki-Artikel sperren/freigeben
- Community-Statistiken einsehen

**Moderation:**
- Bewertungen / Kommentare / Dateien löschen
- Gemeldete Inhalte reviewen (falls Melde-Funktion gewünscht)

---

## 9. MVP-Phasen

### MVP 1 – Kern (Wochen 1–4)
- [ ] Auth: Login, Registrierung per Einladungscode
- [ ] PWA-Setup: Installierbar, App-Shell
- [ ] Bier-Bewertung: Alle anklickbaren Optionen, Bild-Upload
- [ ] EAN-Scanner: Kamera + Open Food Facts Lookup
- [ ] Feed: Chronologische Übersicht aller Bewertungen
- [ ] Profil: Basis-Ansicht mit eigenen Bewertungen
- [ ] Admin: User- und Einladungsverwaltung

### MVP 2 – Community (Wochen 5–7)
- [ ] Kommentare auf Bewertungen
- [ ] Prost!-Reaktion (Likes)
- [ ] Ranglisten (Top-Biere, aktivste User)
- [ ] Globale Suche mit Filtern
- [ ] In-App-Benachrichtigungen + Push

### MVP 3 – Wissen & Dateien (Wochen 8–10)
- [ ] Rezepte-Bereich (anlegen, teilen, kommentieren)
- [ ] Wiki (Artikel erstellen, bearbeiten, Versionsverlauf)
- [ ] Dateien-Bereich (Upload, Ordner, Vorschau)
- [ ] Mengenumrechnung bei Rezepten

### MVP 4 – Polish (Wochen 11–12)
- [ ] Offline-Modus verbessern
- [ ] Performance-Optimierung
- [ ] Onboarding-Flow für neue Mitglieder
- [ ] Feedback einarbeiten

---

## 10. Nächste Schritte

1. ✅ Konzept v1 erstellt
2. ✅ Offene Fragen geklärt
3. ✅ Konzept v2 mit allen Entscheidungen (dieses Dokument)
4. ⬜ **UI-Prototyp bauen** (interaktive React-App mit allen Screens)
5. ⬜ Projekt aufsetzen (Next.js + Prisma + PostgreSQL)
6. ⬜ MVP 1 entwickeln
7. ⬜ Testen mit ersten Usern
8. ⬜ Iterieren
