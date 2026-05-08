import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const sorte = searchParams.get("sorte")?.trim() || "";
    const land = searchParams.get("land")?.trim() || "";
    const sterneFilter = parseInt(searchParams.get("sterne") || "0");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "24");
    const skip = (page - 1) * limit;

    const isEan = /^\d{8,14}$/.test(q);

    const where: any = { AND: [] };

    // Suche
    if (q) {
        if (isEan) {
            where.AND.push({ ean: { contains: q } });
        } else {
            where.AND.push({
                OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { brauerei: { contains: q, mode: "insensitive" } },
                    { ean: { contains: q } },
                    { biersorte: { contains: q, mode: "insensitive" } },
                    { bierstil: { contains: q, mode: "insensitive" } },
                    { land: { contains: q, mode: "insensitive" } },
                ],
            });
        }
    }

    // Sorte
    if (sorte) {
        where.AND.push({
            OR: [
                { biersorte: { contains: sorte, mode: "insensitive" } },
                { bierstil: { contains: sorte, mode: "insensitive" } },
            ],
        });
    }

    // Land
    if (land) {
        where.AND.push({ land: { contains: land, mode: "insensitive" } });
    }

    // Falls AND leer, entfernen
    if (where.AND.length === 0) delete where.AND;

    // Sterne-Filter: Biere mit genau dieser Community-Durchschnittsbewertung
    // Wir holen erst alle passenden Biere und filtern dann nach Bewertungen
    // (komplexe Aggregation – einfacher Ansatz: IDs der Biere mit passender Bewertung)
    let filteredIds: string[] | null = null;
    if (sterneFilter > 0) {
        const bewertungen = await prisma.bewertung.groupBy({
            by: ["bierDbId"],
            where: { bierDbId: { not: null } },
            _avg: { sterne: true },
            having: {
                sterne: {
                    _avg: {
                        gte: sterneFilter - 0.5,
                        lt: sterneFilter + 0.5,
                    },
                },
            },
        });
        filteredIds = bewertungen
            .map(b => b.bierDbId)
            .filter(Boolean) as string[];

        if (filteredIds.length === 0) {
            return NextResponse.json({ biere: [], total: 0, page, pages: 0 });
        }

        if (where.AND) {
            where.AND.push({ id: { in: filteredIds } });
        } else {
            where.id = { in: filteredIds };
        }
    }

    const [biere, total] = await Promise.all([
        prisma.bierDatenbank.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                brauerei: true,
                biersorte: true,
                bierstil: true,
                land: true,
                alkoholProzent: true,
                ean: true,
                bildUrl: true,
            },
        }),
        prisma.bierDatenbank.count({ where }),
    ]);

    return NextResponse.json({ biere, total, page, pages: Math.ceil(total / limit) });
}