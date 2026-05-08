import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const MAX_SIZE_MB = parseInt(process.env.UPLOAD_MAX_SIZE_MB || "20");
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });

        // Größe prüfen
        if (file.size > MAX_SIZE_BYTES) {
            return NextResponse.json({ error: `Datei zu groß (max. ${MAX_SIZE_MB} MB)` }, { status: 400 });
        }

        // Typ prüfen
        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.type)) {
            return NextResponse.json({ error: "Nur Bilder erlaubt (JPG, PNG, WebP, GIF)" }, { status: 400 });
        }

        // Dateinamen sichern
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const filename = `${session.user.id}-${Date.now()}.${ext}`;
        const uploadDir = join(process.cwd(), "public", "uploads");

        // Ordner erstellen falls nicht vorhanden
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Datei speichern
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(join(uploadDir, filename), buffer);

        const url = `/uploads/${filename}`;
        return NextResponse.json({ url, filename });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
    }
}