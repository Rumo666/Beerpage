import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const { text } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "Kein Text" }, { status: 400 });

    const kommentar = await prisma.kommentar.create({
        data: {
            text: text.trim(),
            bewertungId: params.id,
            userId: session.user.id,
        },
        include: { user: { select: { id: true, name: true, image: true } } },
    });

    return NextResponse.json(kommentar, { status: 201 });
}