import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH – Kommentar bearbeiten
export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string; kommentarId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const { kommentarId } = await context.params;
    const { text } = await req.json();

    if (!text?.trim()) return NextResponse.json({ error: "Kein Text" }, { status: 400 });

    const kommentar = await prisma.kommentar.findUnique({ where: { id: kommentarId } });
    if (!kommentar) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const isOwner = kommentar.userId === session.user.id;
    const isAdmin = session.user.rolle === "ADMIN";
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

    const updated = await prisma.kommentar.update({
        where: { id: kommentarId },
        data: { text: text.trim() },
        include: { user: { select: { id: true, name: true, image: true } } },
    });

    return NextResponse.json(updated);
}

// DELETE – Kommentar löschen
export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string; kommentarId: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const { kommentarId } = await context.params;

    const kommentar = await prisma.kommentar.findUnique({ where: { id: kommentarId } });
    if (!kommentar) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const isOwner = kommentar.userId === session.user.id;
    const isAdmin = session.user.rolle === "ADMIN";
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

    await prisma.kommentar.delete({ where: { id: kommentarId } });

    return NextResponse.json({ success: true });
}