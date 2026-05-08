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

    const bier = await prisma.bierDatenbank.findUnique({ where: { id } });
    if (!bier) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    // Community Bewertungen für dieses Bier
    const bewertungen = await prisma.bewertung.findMany({
        where: { bierDbId: id },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
    });

    return NextResponse.json({ bier, bewertungen });
}