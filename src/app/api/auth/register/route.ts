import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  inviteCode: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Einladungscode prüfen
    const einladung = await prisma.einladung.findUnique({
      where: { code: data.inviteCode },
    });

    if (!einladung || !einladung.aktiv) {
      return NextResponse.json({ error: "Ungültiger Einladungscode" }, { status: 400 });
    }

    if (einladung.gueltigBis && einladung.gueltigBis < new Date()) {
      return NextResponse.json({ error: "Einladungscode abgelaufen" }, { status: 400 });
    }

    if (einladung.aktuelleNutzungen >= einladung.maxNutzungen) {
      return NextResponse.json({ error: "Einladungscode bereits verbraucht" }, { status: 400 });
    }

    // Prüfen ob E-Mail bereits vorhanden
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "E-Mail bereits registriert" }, { status: 400 });
    }

    // Passwort hashen
    const passwordHash = await bcrypt.hash(data.password, 12);

    // User erstellen + Einladung aktualisieren in einer Transaktion
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          eingeladenVon: einladung.erstelltVon,
        },
      });

      await tx.einladung.update({
        where: { id: einladung.id },
        data: {
          aktuelleNutzungen: { increment: 1 },
          aktiv: einladung.aktuelleNutzungen + 1 >= einladung.maxNutzungen ? false : true,
        },
      });

      return newUser;
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Ungültige Eingaben", details: error.errors }, { status: 400 });
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 });
  }
}
