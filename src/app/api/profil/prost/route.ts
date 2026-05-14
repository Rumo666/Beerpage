import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const biere = await prisma.prost.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: {
            bewertung: {
                select: {
                    id: true, name: true, sterne: true, bildUrls: true,
                    user: { select: { name: true } },
                },
            },
        },
    });

    // bewertungId für den Link
    const result = biere.map(p => ({
        ...p,
        bewertungId: p.bewertungId,
    }));

    return NextResponse.json({ biere: result });
}