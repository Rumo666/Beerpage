import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const { altPasswort, neuesPasswort } = await req.json();

    if (!altPasswort || !neuesPasswort) return NextResponse.json({ error: "Fehlende Felder" }, { status: 400 });
    if (neuesPasswort.length < 8) return NextResponse.json({ error: "Mindestens 8 Zeichen" }, { status: 400 });

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true },
    });

    if (!user?.password) return NextResponse.json({ error: "Kein Passwort gesetzt" }, { status: 400 });

    const valid = await bcrypt.compare(altPasswort, user.password);
    if (!valid) return NextResponse.json({ error: "Aktuelles Passwort falsch" }, { status: 400 });

    const hash = await bcrypt.hash(neuesPasswort, 12);
    await prisma.user.update({ where: { id: session.user.id }, data: { password: hash } });

    return NextResponse.json({ success: true });
}