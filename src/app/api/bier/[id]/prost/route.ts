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

    const existing = await prisma.prost.findFirst({
        where: { bewertungId: id, userId: session.user.id },
    });

    if (existing) {
        await prisma.prost.delete({ where: { id: existing.id } });
        return NextResponse.json({ geprosted: false });
    } else {
        await prisma.prost.create({
            data: { bewertungId: id, userId: session.user.id },
        });
        return NextResponse.json({ geprosted: true });
    }
}