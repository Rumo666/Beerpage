import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const { id } = await context.params;

    const bewertung = await prisma.bewertung.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, image: true } },
            _count: { select: { kommentare: true, prost: true } },
        },
    });

    if (!bewertung) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const kommentare = await prisma.kommentar.findMany({
        where: { bewertungId: id },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, image: true } } },
    });

    const geprosted = await prisma.prost.findFirst({
        where: { bewertungId: id, userId: session.user.id },
    });

    let dbBier = null;
    if (bewertung.bierDbId) {
        dbBier = await prisma.bierDatenbank.findUnique({ where: { id: bewertung.bierDbId } });
    }
    if (!dbBier && bewertung.ean) {
        dbBier = await prisma.bierDatenbank.findFirst({ where: { ean: bewertung.ean } });
    }
    if (!dbBier && bewertung.name) {
        dbBier = await prisma.bierDatenbank.findFirst({
            where: { name: { contains: bewertung.name.split(" ")[0], mode: "insensitive" } },
        });
    }

    return NextResponse.json({ bewertung, kommentare, dbBier, geprosted: !!geprosted });
}