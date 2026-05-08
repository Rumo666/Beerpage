import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const bewertung = await prisma.bewertung.findUnique({
        where: { id: params.id },
        include: {
            user: { select: { id: true, name: true, image: true } },
            _count: { select: { kommentare: true, prost: true } },
        },
    });

    if (!bewertung) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    // Kommentare laden
    const kommentare = await prisma.kommentar.findMany({
        where: { bewertungId: params.id },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, image: true } } },
    });

    // Prost-Status für aktuellen User
    const geprosted = await prisma.prost.findFirst({
        where: { bewertungId: params.id, userId: session.user.id },
    });

    // DB-Bier laden wenn verknüpft
    let dbBier = null;
    if (bewertung.bierDbId) {
        dbBier = await prisma.bierDatenbank.findUnique({
            where: { id: bewertung.bierDbId },
        });
    }

    // Falls keine DB-Verknüpfung, per EAN oder Name suchen
    if (!dbBier && bewertung.ean) {
        dbBier = await prisma.bierDatenbank.findFirst({
            where: { ean: bewertung.ean },
        });
    }

    if (!dbBier && bewertung.name) {
        dbBier = await prisma.bierDatenbank.findFirst({
            where: { name: { contains: bewertung.name.split(" ")[0], mode: "insensitive" } },
        });
    }

    return NextResponse.json({ bewertung, kommentare, dbBier, geprosted: !!geprosted });
}