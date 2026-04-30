# 🍺 BierBuddy

Private Bier-Community als Progressive Web App (PWA).

## Features

- 🍺 Bier-Bewertungen mit anklickbaren Kategorien (Geschmack, Optik, Geruch, Mundgefühl...)
- 📱 PWA – auf Handy, Tablet und Desktop installierbar
- 📷 EAN-Scanner – Bier per Kamera-Scan erkennen
- 🗄️ Bier-Datenbank – aus bierlinie-shop.de gecrawlte Daten
- 📖 Wiki – gemeinsames Bier-Wissen
- 🍳 Rezepte – Homebrew-Rezepte teilen
- 📁 Dateien – gemeinsame Dateiablage
- 🔒 Geschlossene Community – Zugang nur per Einladungscode
- 👑 Admin-Panel – User- und Einladungsverwaltung
- 🔔 Push-Notifications

---

## Setup (Lokale Entwicklung)

### 1. Voraussetzungen

- **Node.js 18+** → [nodejs.org](https://nodejs.org)
- **Git** → [git-scm.com](https://git-scm.com)
- **Neon-Account** (PostgreSQL) → [neon.tech](https://neon.tech)

### 2. Projekt einrichten

```bash
# Repository klonen (nachdem du es auf GitHub hochgeladen hast)
git clone https://github.com/DEIN_USERNAME/bierbuddy.git
cd bierbuddy

# Dependencies installieren
npm install

# Prisma Client generieren
npm run db:generate
```

### 3. Umgebungsvariablen

Kopiere `.env.example` zu `.env.local` und fülle die Werte aus:

```bash
cp .env.example .env.local
```

Öffne `.env.local` und trage ein:

```env
# Von Neon Dashboard → Connection Details → Connection string
DATABASE_URL="postgresql://user:passwort@ep-xxx.eu-west-2.aws.neon.tech/bierbuddy?sslmode=require"

# Zufälligen String generieren (z.B. mit: openssl rand -base64 32)
NEXTAUTH_SECRET="dein-geheimer-zufallsstring"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Datenbank einrichten

```bash
# Schema in die Datenbank pushen
npm run db:push

# Seed: Admin-User + Einladungscode + Bier-Import
npm run db:seed
```

Der Seed gibt dir:
- Admin-Login: `admin@bierbuddy.de` / `BierBuddy2024!`
- Einen Einladungscode zum Einladen weiterer Mitglieder

### 5. Bier-Datenbank importieren (optional)

Lege deine `biere_datenbank.json` (aus dem Crawler) in den Projektordner und führe aus:

```bash
npm run db:seed
```

### 6. App starten

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000)

---

## Deployment auf Vercel

### 1. GitHub-Repository erstellen

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN_USERNAME/bierbuddy.git
git push -u origin main
```

### 2. Vercel verbinden

1. [vercel.com](https://vercel.com) → **New Project**
2. GitHub-Repository auswählen
3. **Environment Variables** hinzufügen:
   - `DATABASE_URL` → Connection String von Neon
   - `NEXTAUTH_SECRET` → Zufälliger String
   - `NEXTAUTH_URL` → `https://deine-domain.vercel.app`
4. **Deploy** klicken

### 3. Datenbank nach Deployment

Nach dem ersten Deployment einmalig ausführen:

```bash
# In Vercel: Settings → Functions → Run Command
npx prisma db push
```

Oder lokal mit Production-DB:
```bash
DATABASE_URL="deine-neon-url" npx prisma db push
DATABASE_URL="deine-neon-url" npm run db:seed
```

---

## Bier-Datenbank einpflegen

1. Crawler ausführen (aus dem `bierlinie_crawler.py` Skript)
2. `biere_datenbank.json` in den Projektordner kopieren
3. `npm run db:seed` ausführen
4. Alle Biere sind in der DB und beim EAN-Scan abrufbar

---

## Eigene Domain

1. Vercel → dein Projekt → **Domains**
2. Domain eintragen (z.B. `bierbuddy.de`)
3. DNS-Einträge bei deinem Domain-Anbieter setzen:
   ```
   A     @     76.76.21.21
   CNAME www   cname.vercel-dns.com
   ```
4. SSL wird automatisch von Vercel eingerichtet

---

## Push Notifications einrichten (optional)

```bash
# VAPID Keys generieren
npx web-push generate-vapid-keys
```

Eintragen in `.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_EMAIL="mailto:deine@email.de"
```

---

## Nützliche Befehle

```bash
npm run dev          # Entwicklungsserver starten
npm run build        # Produktions-Build erstellen
npm run db:push      # Schema → Datenbank synchronisieren
npm run db:seed      # Admin + Daten importieren
npm run db:studio    # Prisma Studio (Datenbank-GUI) öffnen
```

---

## Umzug zu Hetzner/Coolify (später)

Der Code läuft überall wo Node.js läuft. Für einen Umzug:

1. Hetzner VPS erstellen (Ubuntu, ~4€/Monat)
2. Coolify installieren (automatisches Deployment)
3. Repository in Coolify verbinden
4. Environment Variables übertragen
5. PostgreSQL bei Supabase EU oder direkt auf dem VPS
6. Domain umleiten

---

## Techstack

| Schicht | Technologie |
|---|---|
| Framework | Next.js 15 (App Router) |
| Sprache | TypeScript |
| Datenbank | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | NextAuth.js |
| PWA | next-pwa |
| Barcode | html5-qrcode |
| Hosting | Vercel |
