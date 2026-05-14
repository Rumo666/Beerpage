import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const MAX_SIZE_MB = parseInt(process.env.UPLOAD_MAX_SIZE_MB || "20");
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 });

        if (file.size > MAX_SIZE_BYTES) {
            return NextResponse.json({ error: `Datei zu groß (max. ${MAX_SIZE_MB} MB)` }, { status: 400 });
        }

        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.type)) {
            return NextResponse.json({ error: "Nur Bilder erlaubt (JPG, PNG, WebP, GIF)" }, { status: 400 });
        }

        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const filename = `uploads/${session.user.id}-${Date.now()}.${ext}`;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        await r2.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: filename,
            Body: buffer,
            ContentType: file.type,
        }));

        const url = `${process.env.R2_PUBLIC_URL}/${filename}`;
        return NextResponse.json({ url, filename });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 });
    }
}