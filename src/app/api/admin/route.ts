import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";

async function requireAdmin(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (session?.user?.rolle !== "ADMIN") return null;
  return session;
}

// GET /api/admin?typ=users|einladungen|stats
export async function GET(req: Request) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const typ = searchParams.get("typ") || "users";

  if (typ === "users") {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, rolle: true,
        gesperrt: true, createdAt: true, image: true,
        _count: { select: { bewertungen: true, kommentare: true } },
      },
    });
    return NextResponse.json(users);
  }

  if (typ === "einladungen") {
    const einladungen = await prisma.einladung.findMany({
      orderBy: { createdAt: "desc" },
      include: { ersteller: { select: { name: true } } },
    });
    return NextResponse.json(einladungen);
  }

  if (typ === "stats") {
    const [users, bewertungen, rezepte, wikiArtikel, dateien] = await Promise.all([
      prisma.user.count(),
      prisma.bewertung.count(),
      prisma.rezept.count(),
      prisma.wikiArtikel.count(),
      prisma.datei.count(),
    ]);
    return NextResponse.json({ users, bewertungen, rezepte, wikiArtikel, dateien });
  }

  return NextResponse.json({ error: "Unbekannter Typ" }, { status: 400 });
}

// POST /api/admin - User sperren, Einladung erstellen etc.
export async function POST(req: Request) {
  const session = await requireAdmin(req);
  if (!session) return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });

  const body = await req.json();
  const { aktion } = body;

  if (aktion === "einladung_erstellen") {
    const schema = z.object({
      maxNutzungen: z.number().min(1).max(100).default(1),
      gueltigBis: z.string().optional(),
    });
    const data = schema.parse(body);

    const code = `BIER-${randomBytes(3).toString("hex").toUpperCase()}`;

    const einladung = await prisma.einladung.create({
      data: {
        code,
        erstelltVon: session.user.id,
        maxNutzungen: data.maxNutzungen,
        gueltigBis: data.gueltigBis ? new Date(data.gueltigBis) : null,
      },
    });
    return NextResponse.json(einladung);
  }

  if (aktion === "user_sperren") {
    const { userId, gesperrt } = body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { gesperrt },
    });
    return NextResponse.json(user);
  }

  if (aktion === "user_rolle") {
    const { userId, rolle } = body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { rolle },
    });
    return NextResponse.json(user);
  }

  if (aktion === "upload_limit") {
    // In einer echten App würde man das in der DB speichern
    // Für jetzt: einfach Bestätigung zurückgeben
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
}
