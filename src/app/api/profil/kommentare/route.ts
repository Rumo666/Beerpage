import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const kommentare = await prisma.kommentar.findMany({
        where: { userId: session.user.id, bewertungId: { not: null } },
        orderBy: { createdAt: "desc" },
        include: {
            bewertung: { select: { id: true, name: true } },
        },
    });

    return NextResponse.json({ kommentare });
}