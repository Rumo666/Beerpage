import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const typ = searchParams.get("typ") || "alle"; // alle | biere | wiki | rezepte | datenbank
  const minSterne = parseInt(searchParams.get("minSterne") || "0");
  const sorte = searchParams.get("sorte") || "";

  if (!q && !sorte) return NextResponse.json({ biere: [], wiki: [], rezepte: [], datenbank: [] });

  const results: any = {};

  if (typ === "alle" || typ === "biere") {
    results.biere = await prisma.bewertung.findMany({
      where: {
        AND: [
          q ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { brauerei: { contains: q, mode: "insensitive" } },
              { sorte: { contains: q, mode: "insensitive" } },
              { ean: { contains: q } },
              { notizen: { contains: q, mode: "insensitive" } },
            ],
          } : {},
          minSterne > 0 ? { sterne: { gte: minSterne } } : {},
          sorte ? { sorte: { contains: sorte, mode: "insensitive" } } : {},
        ],
      },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, image: true } } },
    });
  }

  if (typ === "alle" || typ === "datenbank") {
    results.datenbank = await prisma.bierDatenbank.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brauerei: { contains: q, mode: "insensitive" } },
          { ean: { contains: q } },
          { bierstil: { contains: q, mode: "insensitive" } },
          { land: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
    });
  }

  if (typ === "alle" || typ === "wiki") {
    results.wiki = await prisma.wikiArtikel.findMany({
      where: {
        OR: [
          { titel: { contains: q, mode: "insensitive" } },
          { inhalt: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ],
      },
      take: 5,
      select: { id: true, slug: true, titel: true, kategorie: true, createdAt: true },
    });
  }

  if (typ === "alle" || typ === "rezepte") {
    results.rezepte = await prisma.rezept.findMany({
      where: {
        OR: [
          { titel: { contains: q, mode: "insensitive" } },
          { zielSorte: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      include: { user: { select: { id: true, name: true } } },
    });
  }

  return NextResponse.json(results);
}
