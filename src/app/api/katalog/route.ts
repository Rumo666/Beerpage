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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // EAN: nur Ziffern prüfen
    const isEan = /^\d{8,14}$/.test(q);

    const where: any = {};

    if (q) {
        if (isEan) {
            where.ean = { contains: q };
        } else {
            where.OR = [
                { name: { contains: q, mode: "insensitive" } },
                { brauerei: { contains: q, mode: "insensitive" } },
                { ean: { contains: q } },
                { biersorte: { contains: q, mode: "insensitive" } },
                { bierstil: { contains: q, mode: "insensitive" } },
                { land: { contains: q, mode: "insensitive" } },
            ];
        }
    }

    if (sorte) {
        where.OR = [
            ...(where.OR || []),
        ];
        where.AND = [
            ...(where.AND || []),
            {
                OR: [
                    { biersorte: { contains: sorte, mode: "insensitive" } },
                    { bierstil: { contains: sorte, mode: "insensitive" } },
                ]
            }
        ];
    }

    if (land) {
        where.AND = [
            ...(where.AND || []),
            { land: { contains: land, mode: "insensitive" } }
        ];
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
                trinktemperatur: true,
                geruch: true,
                geschmack: true,
            },
        }),
        prisma.bierDatenbank.count({ where }),
    ]);

    return NextResponse.json({ biere, total, page, pages: Math.ceil(total / limit) });
}