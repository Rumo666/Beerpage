import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
    name: z.string().min(1).optional(),
    brauerei: z.string().optional(),
    sorte: z.string().optional(),
    notizen: z.string().optional(),
    sterne: z.number().min(1).max(5).optional(),
    geschmack: z.array(z.string()).optional(),
    mundgefuehl: z.string().optional(),
    kohlensaeure: z.string().optional(),
    farbe: z.string().optional(),
    preis: z.string().optional(),
    nochmal: z.string().optional(),
});

// Hilfsfunktion: Darf der User diese Bewertung bearbeiten?
async function canEdit(bewertungId: string, session: any) {
    const bewertung = await prisma.bewertung.findUnique({ where: { id: bewertungId } });
    if (!bewertung) return { allowed: false, bewertung: null };
    const isOwner = bewertung.userId === session.user.id;
    const isAdmin = session.user.rolle === "ADMIN";
    return { allowed: isOwner || isAdmin, bewertung };
}

// GET – Einzelne Bewertung (bereits in beer-detail-api)
export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const { id } = await context.params;

    const bewertung = await prisma.bewertung.findUnique({
        where: { id },
        include: {
            user: { select: { id: true, name: true, image: true } },
            _count: { select: { kommentare: true, prost: true } },
        },
    });

    if (!bewertung) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const kommentare = await prisma.kommentar.findMany({
        where: { bewertungId: id },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, image: true } } },
    });

    const geprosted = await prisma.prost.findFirst({
        where: { bewertungId: id, userId: session.user.id },
    });

    let dbBier = null;
    if (bewertung.bierDbId) {
        dbBier = await prisma.bierDatenbank.findUnique({ where: { id: bewertung.bierDbId } });
    }
    if (!dbBier && bewertung.ean) {
        dbBier = await prisma.bierDatenbank.findFirst({ where: { ean: bewertung.ean } });
    }
    if (!dbBier && bewertung.name) {
        dbBier = await prisma.bierDatenbank.findFirst({
            where: { name: { contains: bewertung.name.split(" ")[0], mode: "insensitive" } },
        });
    }

    // Darf der aktuelle User editieren/löschen?
    const isOwner = bewertung.userId === session.user.id;
    const isAdmin = session.user.rolle === "ADMIN";
    const canEdit = isOwner || isAdmin;

    return NextResponse.json({ bewertung, kommentare, dbBier, geprosted: !!geprosted, canEdit, isOwner, isAdmin });
}

// PATCH – Bewertung editieren
export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const { id } = await context.params;
    const { allowed, bewertung } = await canEdit(id, session);

    if (!allowed) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    if (!bewertung) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    try {
        const body = await req.json();
        const data = updateSchema.parse(body);

        const updated = await prisma.bewertung.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.brauerei !== undefined && { brauerei: data.brauerei }),
                ...(data.sorte !== undefined && { sorte: data.sorte }),
                ...(data.notizen !== undefined && { notizen: data.notizen }),
                ...(data.sterne && { sterne: data.sterne }),
                ...(data.geschmack && { geschmack: data.geschmack }),
                ...(data.mundgefuehl !== undefined && { mundgefuehl: data.mundgefuehl }),
                ...(data.kohlensaeure !== undefined && { kohlensaeure: data.kohlensaeure }),
                ...(data.farbe !== undefined && { farbe: data.farbe }),
                ...(data.preis !== undefined && { preis: data.preis }),
                ...(data.nochmal !== undefined && { nochmal: data.nochmal }),
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Ungültige Daten" }, { status: 400 });
        }
        return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
    }
}

// DELETE – Bewertung löschen
export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const { id } = await context.params;
    const { allowed } = await canEdit(id, session);

    if (!allowed) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

    // Zuerst abhängige Daten löschen
    await prisma.$transaction([
        prisma.kommentar.deleteMany({ where: { bewertungId: id } }),
        prisma.prost.deleteMany({ where: { bewertungId: id } }),
        prisma.bewertung.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
}