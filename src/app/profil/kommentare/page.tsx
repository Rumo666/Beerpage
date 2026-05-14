"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const C = {
    bg: "#0E0C07", card: "#1A1710", input: "#141208",
    ac: "#C8963E", acDim: "#8B6A2F",
    tx: "#EDE5D0", txD: "#8A7D66", txM: "#5A5040",
    bd: "#2E2820",
};

export default function ProfilKommentarePage() {
    const { status } = useSession();
    const router = useRouter();
    const [kommentare, setKommentare] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    useEffect(() => {
        if (status !== "authenticated") return;
        fetch("/api/profil/kommentare")
            .then(r => r.json())
            .then(d => { setKommentare(d.kommentare || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [status]);

    if (loading) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.ac, fontSize: 32 }}>🍺</div></div>;

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: "system-ui, sans-serif", paddingBottom: 40 }}>
            <div style={{ background: C.card, borderBottom: `1px solid ${C.bd}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky" as const, top: 0, zIndex: 50 }}>
                <button onClick={() => router.push("/profil")} style={{ background: "none", border: "none", color: C.tx, cursor: "pointer", fontSize: 20 }}>←</button>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: C.ac, margin: 0 }}>💬 Meine Kommentare ({kommentare.length})</h1>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {kommentare.length === 0 && <div style={{ textAlign: "center" as const, padding: "60px 0", color: C.txM }}>Noch keine Kommentare geschrieben</div>}
                {kommentare.map((k: any) => (
                    <div key={k.id} onClick={() => router.push(`/bier/${k.bewertungId}`)}
                         style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.bd}`, padding: 14, cursor: "pointer" }}
                         onMouseEnter={e => e.currentTarget.style.borderColor = C.acDim}
                         onMouseLeave={e => e.currentTarget.style.borderColor = C.bd}>
                        <div style={{ fontSize: 12, color: C.ac, fontWeight: 700, marginBottom: 4 }}>{k.bewertung?.name}</div>
                        <div style={{ fontSize: 13, color: C.txD, fontStyle: "italic", marginBottom: 4 }}>„{k.text}"</div>
                        <div style={{ fontSize: 10, color: C.txM }}>{new Date(k.createdAt).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}