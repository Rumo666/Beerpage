import { PrismaClient, Rolle } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("🍺 BierBuddy Datenbank-Setup...\n");

  // ─── Admin User erstellen ───
  const adminEmail = process.env.ADMIN_EMAIL || "admin@bierbuddy.de";
  const adminPassword = process.env.ADMIN_PASSWORD || "BierBuddy2024!";
  const adminName = process.env.ADMIN_NAME || "Admin";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const hash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash: hash,
        rolle: Rolle.ADMIN,
      },
    });
    console.log(`✅ Admin-User erstellt: ${adminEmail}`);
    console.log(`   Passwort: ${adminPassword}`);
    console.log(`   ⚠️  Bitte Passwort nach dem ersten Login ändern!\n`);

    // Ersten Einladungscode erstellen
    const code = `BIER-${randomBytes(3).toString("hex").toUpperCase()}`;
    await prisma.einladung.create({
      data: {
        code,
        erstelltVon: admin.id,
        maxNutzungen: 20,
      },
    });
    console.log(`🎟️  Erster Einladungscode: ${code}`);
    console.log(`   (20 Nutzungen, kein Ablaufdatum)\n`);
  } else {
    console.log(`ℹ️  Admin bereits vorhanden: ${adminEmail}\n`);
  }

  // ─── Bier-Datenbank importieren ───
  const dbPath = join(process.cwd(), "biere_datenbank.json");

  if (existsSync(dbPath)) {
    console.log("📦 Importiere Bier-Datenbank...");
    const biere = JSON.parse(readFileSync(dbPath, "utf-8"));
    let imported = 0;
    let skipped = 0;

    for (const bier of biere) {
      try {
        await prisma.bierDatenbank.upsert({
          where: {
            ean: bier.ean || `no-ean-${bier.name}-${bier.brauerei}`,
          },
          update: {
            name: bier.name || "",
            brauerei: bier.brauerei_detail || bier.brauerei || null,
            brauereiAdresse: bier.brauerei_adresse || null,
            land: bier.land || null,
            herkunft: bier.herkunft_detail || bier.herkunft || null,
            bierstil: bier.bierstil || null,
            biersorte: bier.biersorte || null,
            brauart: bier.brauart || null,
            alkoholProzent: bier.alkohol_prozent || null,
            inhaltMl: bier.inhalt_ml || null,
            zutaten: bier.zutaten || null,
            optik: bier.optik || null,
            farbe: bier.farbe || null,
            geruch: bier.geruch || null,
            geschmack: bier.geschmack || null,
            ibu: bier.ibu || null,
            stammwuerze: bier.stammwuerze || null,
            trinktemperatur: bier.trinktemperatur || null,
            glastyp: bier.glastyp || null,
            foodPairing: bier.food_pairing || null,
            preis: bier.preis_eur ? parseFloat(bier.preis_eur) : null,
            beschreibung: bier.beschreibung || null,
            geschmackBeschreibung: bier.geschmack_beschreibung || null,
            aussehen: bier.aussehen_geruch || null,
            geschichte: bier.geschichte || null,
            beschreibungKomplett: bier.beschreibung_komplett || null,
            bildUrl: bier.bild_url || null,
            bildLokal: bier.bild_lokal || null,
            detailUrl: bier.detail_url || null,
          },
          create: {
            name: bier.name || "",
            ean: bier.ean || null,
            artikelnummer: bier.artikelnummer || null,
            brauerei: bier.brauerei_detail || bier.brauerei || null,
            brauereiAdresse: bier.brauerei_adresse || null,
            land: bier.land || null,
            herkunft: bier.herkunft_detail || bier.herkunft || null,
            bierstil: bier.bierstil || null,
            biersorte: bier.biersorte || null,
            brauart: bier.brauart || null,
            alkoholProzent: bier.alkohol_prozent || null,
            inhaltMl: bier.inhalt_ml || null,
            zutaten: bier.zutaten || null,
            optik: bier.optik || null,
            farbe: bier.farbe || null,
            geruch: bier.geruch || null,
            geschmack: bier.geschmack || null,
            ibu: bier.ibu || null,
            stammwuerze: bier.stammwuerze || null,
            trinktemperatur: bier.trinktemperatur || null,
            glastyp: bier.glastyp || null,
            foodPairing: bier.food_pairing || null,
            preis: bier.preis_eur ? parseFloat(bier.preis_eur) : null,
            beschreibung: bier.beschreibung || null,
            geschmackBeschreibung: bier.geschmack_beschreibung || null,
            aussehen: bier.aussehen_geruch || null,
            geschichte: bier.geschichte || null,
            beschreibungKomplett: bier.beschreibung_komplett || null,
            bildUrl: bier.bild_url || null,
            bildLokal: bier.bild_lokal || null,
            detailUrl: bier.detail_url || null,
          },
        });
        imported++;
      } catch (e) {
        skipped++;
      }
    }
    console.log(`   ✅ ${imported} Biere importiert, ${skipped} übersprungen\n`);
  } else {
    console.log("ℹ️  Keine biere_datenbank.json gefunden – überspringe Bier-Import");
    console.log("   (Lege die Datei im Projektordner ab und führe npm run db:seed erneut aus)\n");
  }

  console.log("✅ Setup abgeschlossen!");
  console.log("   Starte die App mit: npm run dev");
  console.log("   Öffne: http://localhost:3000");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
