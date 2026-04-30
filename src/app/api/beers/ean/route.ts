import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const ean = searchParams.get("ean");

  if (!ean) return NextResponse.json({ error: "EAN fehlt" }, { status: 400 });

  // 1. In eigener Datenbank suchen
  const lokalBier = await prisma.bierDatenbank.findUnique({
    where: { ean: ean.replace(/[^\d]/g, "") },
  });

  if (lokalBier) {
    // Prüfen ob bereits bewertet
    const bereitsBewertet = await prisma.bewertung.findFirst({
      where: { ean: lokalBier.ean || undefined },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { prost: true } },
      },
    });

    return NextResponse.json({
      quelle: "lokal",
      bier: lokalBier,
      bereitsBewertet: bereitsBewertet
        ? {
            id: bereitsBewertet.id,
            user: bereitsBewertet.user,
            sterne: bereitsBewertet.sterne,
            prost: bereitsBewertet._count.prost,
          }
        : null,
    });
  }

  // 2. Fallback: Open Food Facts API
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${ean}.json`,
      { next: { revalidate: 3600 } }
    );
    const offData = await res.json();

    if (offData.status === 1 && offData.product) {
      const p = offData.product;
      return NextResponse.json({
        quelle: "openfoodfacts",
        bier: {
          name: p.product_name || p.product_name_de || "",
          brauerei: p.brands || "",
          land: p.countries_tags?.[0]?.replace("en:", "") || "",
          bildUrl: p.image_url || p.image_front_url || "",
          ean,
          zutaten: p.ingredients_text_de || p.ingredients_text || "",
          alkoholProzent: parseFloat(p.nutriments?.["alcohol_100g"]) || null,
        },
        bereitsBewertet: null,
      });
    }
  } catch (e) {
    console.error("Open Food Facts Fehler:", e);
  }

  return NextResponse.json({ quelle: null, bier: null, bereitsBewertet: null });
}
