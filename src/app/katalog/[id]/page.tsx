"use client";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

const C = {
    bg: "#0E0C07", card: "#1A1710", input: "#141208",
    ac: "#C8963E", acDim: "#8B6A2F", acGlow: "rgba(200,150,62,0.12)",
    tx: "#EDE5D0", txD: "#8A7D66", txM: "#5A5040",
    bd: "#2E2820",
};

function InfoRow({ label, value }: { label: string; value: string }) {
    if (!value) return null;
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: `1px solid ${C.bd}` }}>
            <span style={{ fontSize: 12, color: C.txD, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, flexShrink: 0, marginRight: 12 }}>{label}</span>
            <span style={{ fontSize: 13, color: C.tx, textAlign: "right" as const }}>{value}</span>
        </div>
    );
}

export default function KatalogDetailPage() {
    const { status } = useSession();
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [bier, setBier] = useState<any>(null);
    const [bewertungen, setBewertungen] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    useEffect(() => {
        if (!id || status !== "authenticated") return;
        fetch(`/api/katalog/${id}`)
            .then(r => r.json())
            .then(d => {
                setBier(d.bier);
                setBewertungen(d.bewertungen || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id, status]);

    if (loading) return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: C.ac, fontSize: 32 }}>🍺</div>
        </div>
    );

    if (!bier) return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" as const, gap: 12 }}>
            <div style={{ fontSize: 48 }}>🍺</div>
            <div style={{ color: C.txD }}>Bier nicht gefunden</div>
            <button onClick={() => router.push("/katalog")} style={{ color: C.ac, background: "none", border: "none", cursor: "pointer" }}>← Zurück</button>
        </div>
    );

    const avgSterne = bewertungen.length > 0
        ? (bewertungen.reduce((s, b) => s + b.sterne, 0) / bewertungen.length).toFixed(1)
        : null;

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: "system-ui, sans-serif", paddingBottom: 40 }}>

            {/* Header */}
            <div style={{ background: C.card, borderBottom: `1px solid ${C.bd}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky" as const, top: 0, zIndex: 50 }}>
                <button onClick={() => router.push("/katalog")} style={{ background: "none", border: "none", color: C.tx, cursor: "pointer", fontSize: 20 }}>←</button>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, color: C.ac, margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{bier.name}</h1>
            </div>

            <div style={{ padding: 16 }}>

                {/* Bild + Basis */}
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, overflow: "hidden", marginBottom: 12 }}>
                    {bier.bildUrl && (
                        <div style={{ display: "flex", justifyContent: "center", background: "#0a0807", padding: "24px 0" }}>
                            <img src={bier.bildUrl} alt={bier.name} style={{ height: 240, maxWidth: "100%", objectFit: "contain" as const }} />
                        </div>
                    )}
                    <div style={{ padding: 16 }}>
                        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 800, margin: "0 0 4px" }}>{bier.name}</h2>
                        {bier.brauerei && <div style={{ fontSize: 13, color: C.txD, marginBottom: 10 }}>{bier.brauerei}</div>}

                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, marginBottom: 12 }}>
                            {(bier.biersorte || bier.bierstil) && <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 16, background: C.acGlow, color: C.ac, fontWeight: 600 }}>{bier.biersorte || bier.bierstil}</span>}
                            {bier.land && <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 16, background: C.bd, color: C.txD }}>🌍 {bier.land}</span>}
                            {bier.alkoholProzent && <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 16, background: C.bd, color: C.txD }}>🍶 {bier.alkoholProzent}%</span>}
                        </div>

                        {avgSterne && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                <span style={{ fontSize: 22, color: C.ac }}>★ {avgSterne}</span>
                                <span style={{ fontSize: 12, color: C.txD }}>({bewertungen.length} Bewertung{bewertungen.length !== 1 ? "en" : ""})</span>
                            </div>
                        )}

                        {/* Jetzt bewerten Button */}
                        <button onClick={() => router.push(`/bier/neu?bierDbId=${bier.id}&ean=${bier.ean || ""}`)}
                                style={{ width: "100%", padding: 12, background: `linear-gradient(135deg, ${C.ac}, ${C.acDim})`, color: C.bg, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                            🍺 Dieses Bier bewerten
                        </button>
                    </div>
                </div>

                {/* Details */}
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 12 }}>
                    <h3 style={{ fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700, color: C.ac, margin: "0 0 10px", textTransform: "uppercase" as const, letterSpacing: 1 }}>Details</h3>
                    <InfoRow label="Brauart" value={bier.brauart || ""} />
                    <InfoRow label="Optik" value={bier.optik || ""} />
                    <InfoRow label="Geruch" value={bier.geruch || ""} />
                    <InfoRow label="Geschmack" value={bier.geschmack || ""} />
                    <InfoRow label="Trinktemperatur" value={bier.trinktemperatur || ""} />
                    <InfoRow label="Glastyp" value={bier.glastyp || ""} />
                    <InfoRow label="Food Pairing" value={bier.foodPairing || ""} />
                    <InfoRow label="Inhalt" value={bier.inhaltMl ? `${bier.inhaltMl} ml` : ""} />
                    <InfoRow label="IBU" value={bier.ibu || ""} />
                    <InfoRow label="Stammwürze" value={bier.stammwuerze || ""} />
                    <InfoRow label="Preis" value={bier.preis ? `${bier.preis} €` : ""} />
                    <InfoRow label="EAN" value={bier.ean || ""} />
                    <InfoRow label="Artikelnummer" value={bier.artikelnummer || ""} />
                    {bier.zutaten && (
                        <div style={{ padding: "10px 0" }}>
                            <div style={{ fontSize: 12, color: C.txD, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }}>Zutaten</div>
                            <div style={{ fontSize: 12, color: C.tx, lineHeight: 1.5 }}>{bier.zutaten}</div>
                        </div>
                    )}
                </div>

                {/* Beschreibung */}
                {bier.beschreibung && (
                    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 12 }}>
                        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700, color: C.ac, margin: "0 0 10px", textTransform: "uppercase" as const, letterSpacing: 1 }}>📖 Beschreibung</h3>
                        <p style={{ fontSize: 13, color: C.txD, lineHeight: 1.7, margin: 0 }}>{bier.beschreibung}</p>
                    </div>
                )}

                {bier.geschichte && (
                    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 12 }}>
                        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700, color: C.ac, margin: "0 0 10px", textTransform: "uppercase" as const, letterSpacing: 1 }}>🏛️ Geschichte</h3>
                        <p style={{ fontSize: 13, color: C.txD, lineHeight: 1.7, margin: 0 }}>{bier.geschichte}</p>
                    </div>
                )}

                {/* Brauerei */}
                {bier.brauereiAdresse && (
                    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 12 }}>
                        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700, color: C.ac, margin: "0 0 10px", textTransform: "uppercase" as const, letterSpacing: 1 }}>🏭 Brauerei</h3>
                        <InfoRow label="Name" value={bier.brauerei || ""} />
                        <InfoRow label="Adresse" value={bier.brauereiAdresse || ""} />
                        <InfoRow label="Land" value={bier.land || ""} />
                    </div>
                )}

                {/* Community Bewertungen */}
                {bewertungen.length > 0 && (
                    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 12 }}>
                        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700, color: C.ac, margin: "0 0 12px", textTransform: "uppercase" as const, letterSpacing: 1 }}>
                            ⭐ Community Bewertungen ({bewertungen.length})
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                            {bewertungen.map((bw: any) => (
                                <div key={bw.id} onClick={() => router.push(`/bier/${bw.id}`)}
                                     style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.bd}`, cursor: "pointer", background: "#141208" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600 }}>{bw.user?.name}</span>
                                        <span style={{ fontSize: 16, color: C.ac, letterSpacing: 1 }}>
                                            {[1,2,3,4,5].map(s => <span key={s} style={{ color: s <= bw.sterne ? C.ac : C.bd }}>★</span>)}
                                        </span>
                                    </div>
                                    {bw.notizen && <div style={{ fontSize: 12, color: C.txD, fontStyle: "italic" }}>„{bw.notizen}"</div>}
                                    {bw.geschmack?.length > 0 && (
                                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const, marginTop: 4 }}>
                                            {bw.geschmack.map((g: string) => <span key={g} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 8, background: C.bd, color: C.txD }}>{g}</span>)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}