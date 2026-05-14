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

export default function ProfilProstPage() {
    const { status } = useSession();
    const router = useRouter();
    const [biere, setBiere] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    useEffect(() => {
        if (status !== "authenticated") return;
        fetch("/api/profil/prost")
            .then(r => r.json())
            .then(d => { setBiere(d.biere || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [status]);

    if (loading) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.ac, fontSize: 32 }}>🍺</div></div>;

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: "system-ui, sans-serif", paddingBottom: 40 }}>
            <div style={{ background: C.card, borderBottom: `1px solid ${C.bd}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky" as const, top: 0, zIndex: 50 }}>
                <button onClick={() => router.push("/profil")} style={{ background: "none", border: "none", color: C.tx, cursor: "pointer", fontSize: 20 }}>←</button>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: C.ac, margin: 0 }}>🍻 Meine Prosts ({biere.length})</h1>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {biere.length === 0 && <div style={{ textAlign: "center" as const, padding: "60px 0", color: C.txM }}>Noch keine Prosts gegeben</div>}
                {biere.map((b: any) => (
                    <div key={b.id} onClick={() => router.push(`/bier/${b.bewertungId}`)}
                         style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.bd}`, padding: 12, cursor: "pointer", display: "flex", gap: 12, alignItems: "center" }}
                         onMouseEnter={e => e.currentTarget.style.borderColor = C.acDim}
                         onMouseLeave={e => e.currentTarget.style.borderColor = C.bd}>
                        {b.bewertung?.bildUrls?.[0] && (
                            <img src={b.bewertung.bildUrls[0]} style={{ width: 44, height: 60, objectFit: "contain" as const, borderRadius: 6, background: C.bg }} alt="" />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{b.bewertung?.name}</div>
                            <div style={{ fontSize: 11, color: C.txD }}>{b.bewertung?.user?.name} · {new Date(b.createdAt).toLocaleDateString("de-DE")}</div>
                            <div style={{ fontSize: 13, color: C.ac }}>{"★".repeat(b.bewertung?.sterne || 0)}</div>
                        </div>
                        <span style={{ color: C.txM, fontSize: 16 }}>›</span>
                    </div>
                ))}
            </div>
        </div>
    );
}