import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bewertungSchema = z.object({
  name: z.string().min(1),
  brauerei: z.string().optional(),
  sorte: z.string().optional(),
  ean: z.string().optional(),
  bildUrls: z.array(z.string()).default([]),
  sterne: z.number().min(1).max(5),
  geschmack: z.array(z.string()).default([]),
  mundgefuehl: z.string().optional(),
  kohlensaeure: z.string().optional(),
  farbe: z.string().optional(),
  preis: z.string().optional(),
  nochmal: z.string().optional(),
  notizen: z.string().optional(),
  bierDbId: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const [bewertungen, total] = await Promise.all([
    prisma.bewertung.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { kommentare: true, prost: true } },
        prost: { where: { userId: session.user.id }, select: { id: true } },
      },
    }),
    prisma.bewertung.count(),
  ]);

  return NextResponse.json({ bewertungen, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  try {
    const body = await req.json();
    const data = bewertungSchema.parse(body);

    // Falls EAN vorhanden, Bier-DB verknüpfen
    let bierDbId = data.bierDbId;
    if (!bierDbId && data.ean) {
      const dbBier = await prisma.bierDatenbank.findUnique({ where: { ean: data.ean } });
      if (dbBier) bierDbId = dbBier.id;
    }

    const bewertung = await prisma.bewertung.create({
      data: {
        userId: session.user.id,
        name: data.name,
        brauerei: data.brauerei,
        sorte: data.sorte,
        ean: data.ean,
        bildUrls: data.bildUrls,
        sterne: data.sterne,
        geschmack: data.geschmack,
        mundgefuehl: data.mundgefuehl,
        kohlensaeure: data.kohlensaeure,
        farbe: data.farbe,
        preis: data.preis,
        nochmal: data.nochmal,
        notizen: data.notizen,
        bierDbId,
      },
    });

    return NextResponse.json(bewertung, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ungültige Eingaben" }, { status: 400 });
    }
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
