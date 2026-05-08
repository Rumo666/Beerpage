import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const { id } = await context.params;
    const { text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "Kein Text" }, { status: 400 });

    const kommentar = await prisma.kommentar.create({
        data: {
            text: text.trim(),
            bewertungId: id,
            userId: session.user.id,
        },
        include: { user: { select: { id: true, name: true, image: true } } },
    });

    return NextResponse.json(kommentar, { status: 201 });
}