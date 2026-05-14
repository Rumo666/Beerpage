import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true, name: true, email: true, image: true,
            rolle: true, createdAt: true, benachrichtigungen: true,
            gesperrt: true,
        },
    });

    if (!user) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });

    const bewertungen = await prisma.bewertung.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        select: {
            id: true, name: true, sorte: true, sterne: true,
            bildUrls: true, createdAt: true,
        },
    });

    const [prostCount, kommentarCount] = await Promise.all([
        prisma.prost.count({ where: { userId: session.user.id } }),
        prisma.kommentar.count({ where: { userId: session.user.id } }),
    ]);

    const avgSterne = bewertungen.length > 0
        ? bewertungen.reduce((s, b) => s + b.sterne, 0) / bewertungen.length
        : null;

    const sortenCount: Record<string, number> = {};
    bewertungen.forEach(b => { if (b.sorte) sortenCount[b.sorte] = (sortenCount[b.sorte] || 0) + 1; });
    const lieblingsSorte = Object.entries(sortenCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const dbBiere = await prisma.bierDatenbank.findMany({
        where: { bewertungen: { some: { userId: session.user.id } } },
        select: { land: true },
    });
    const laender = new Set(dbBiere.map(b => b.land).filter(Boolean)).size;

    return NextResponse.json({
        user,
        bewertungen,
        stats: {
            anzahlBewertungen: bewertungen.length,
            avgSterne,
            prostGegeben: prostCount,
            kommentare: kommentarCount,
            lieblingsSorte,
            laender,
        },
    });
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const body = await req.json();
    const { name, image, benachrichtigungen } = body;

    const updateData: any = {};
    if (name !== undefined) {
        if (!name.trim()) return NextResponse.json({ error: "Name darf nicht leer sein" }, { status: 400 });
        updateData.name = name.trim();
    }
    if (image !== undefined) updateData.image = image;
    if (benachrichtigungen !== undefined) updateData.benachrichtigungen = benachrichtigungen;

    const user = await prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
            id: true, name: true, email: true, image: true,
            rolle: true, benachrichtigungen: true,
        },
    });

    return NextResponse.json({ user });
}