import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const existing = await prisma.prost.findFirst({
        where: { bewertungId: params.id, userId: session.user.id },
    });

    if (existing) {
        await prisma.prost.delete({ where: { id: existing.id } });
        return NextResponse.json({ geprosted: false });
    } else {
        await prisma.prost.create({
            data: { bewertungId: params.id, userId: session.user.id },
        });
        return NextResponse.json({ geprosted: true });
    }
}