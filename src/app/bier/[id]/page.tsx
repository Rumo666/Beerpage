"use client";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

const C = {
    bg: "#0E0C07", card: "#1A1710", input: "#141208",
    ac: "#C8963E", acDim: "#8B6A2F", acGlow: "rgba(200,150,62,0.12)",
    tx: "#EDE5D0", txD: "#8A7D66", txM: "#5A5040",
    bd: "#2E2820", danger: "#C0392B", success: "#27AE60",
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: "16px", marginBottom: 12 }}>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 700, color: C.ac, margin: "0 0 10px", textTransform: "uppercase" as const, letterSpacing: 1 }}>{title}</h3>
            {children}
        </div>
    );
}

export default function BierDetailPage() {
    const { status } = useSession();
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [bewertung, setBewertung] = useState<any>(null);
    const [dbBier, setDbBier] = useState<any>(null);
    const [kommentare, setKommentare] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [kommentar, setKommentar] = useState("");
    const [sending, setSending] = useState(false);
    const [geprosted, setGeprosted] = useState(false);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    useEffect(() => {
        if (!id || status !== "authenticated") return;
        fetch(`/api/beers/${id}`)
            .then(r => r.json())
            .then(d => {
                setBewertung(d.bewertung);
                setDbBier(d.dbBier);
                setKommentare(d.kommentare || []);
                setGeprosted(d.geprosted || false);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id, status]);

    const handleProst = async () => {
        setGeprosted(p => !p);
        await fetch(`/api/beers/${id}/prost`, { method: "POST" });
    };

    const handleKommentar = async () => {
        if (!kommentar.trim()) return;
        setSending(true);
        const res = await fetch(`/api/beers/${id}/kommentar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: kommentar }),
        });
        if (res.ok) {
            const data = await res.json();
            setKommentare(prev => [...prev, data]);
            setKommentar("");
        }
        setSending(false);
    };

    if (loading) return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: C.ac, fontSize: 32 }}>🍺</div>
        </div>
    );

    if (!bewertung) return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" as const, gap: 12 }}>
            <div style={{ fontSize: 48 }}>🍺</div>
            <div style={{ color: C.txD }}>Bewertung nicht gefunden</div>
            <button onClick={() => router.push("/feed")} style={{ color: C.ac, background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>← Zurück zum Feed</button>
        </div>
    );

    const b = bewertung;
    const db = dbBier;

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: "system-ui, sans-serif", paddingBottom: 40 }}>

            {/* Header */}
            <div style={{ background: C.card, borderBottom: `1px solid ${C.bd}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky" as const, top: 0, zIndex: 50 }}>
                <button onClick={() => router.push("/feed")} style={{ background: "none", border: "none", color: C.tx, cursor: "pointer", fontSize: 20 }}>←</button>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 700, color: C.ac, margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{b.name}</h1>
            </div>

            <div style={{ padding: 16 }}>

                {/* Bild + Grundinfo */}
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, overflow: "hidden", marginBottom: 12 }}>
                    {b.bildUrls?.[0] && (
                        <div style={{ display: "flex", justifyContent: "center", background: "#0a0807", padding: "20px 0" }}>
                            <img src={b.bildUrls[0]} alt={b.name}
                                 style={{ height: 220, maxWidth: "100%", objectFit: "contain" as const }} />
                        </div>
                    )}
                    <div style={{ padding: 16 }}>
                        {/* User */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.acGlow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                                {b.user?.image || "🍺"}
                            </div>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{b.user?.name}</div>
                                <div style={{ fontSize: 10, color: C.txM }}>{new Date(b.createdAt).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                            {b.sorte && <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 20, background: C.acGlow, color: C.ac, fontWeight: 700 }}>{b.sorte}</span>}
                        </div>

                        {/* Name + Brauerei */}
                        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>{b.name}</h2>
                        {b.brauerei && <div style={{ fontSize: 13, color: C.txD, marginBottom: 10 }}>{b.brauerei}</div>}

                        {/* Sterne */}
                        <div style={{ fontSize: 28, letterSpacing: 2, marginBottom: 10 }}>
                            {[1,2,3,4,5].map(st => <span key={st} style={{ color: st <= b.sterne ? C.ac : C.bd }}>★</span>)}
                        </div>

                        {/* Aktionen */}
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={handleProst} style={{
                                flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${geprosted ? C.ac : C.bd}`,
                                background: geprosted ? C.acGlow : "transparent", color: geprosted ? C.ac : C.txD,
                                cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all .2s"
                            }}>
                                🍻 {(b._count?.prost || 0) + (geprosted ? 1 : 0)} Prost!
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bewertungsdetails */}
                <Section title="Meine Bewertung">
                    {b.geschmack?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 11, color: C.txD, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 6 }}>Geschmack</div>
                            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
                                {b.geschmack.map((g: string) => (
                                    <span key={g} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 12, background: C.acGlow, color: C.ac, fontWeight: 600, border: `1px solid ${C.ac}30` }}>{g}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    <InfoRow label="Mundgefühl" value={b.mundgefuehl} />
                    <InfoRow label="Kohlensäure" value={b.kohlensaeure} />
                    <InfoRow label="Farbe" value={b.farbe} />
                    <InfoRow label="Preis-Leistung" value={b.preis} />
                    <InfoRow label="Nochmal kaufen" value={b.nochmal === "ja" ? "👍 Ja" : b.nochmal === "nein" ? "👎 Nein" : b.nochmal === "vielleicht" ? "🤷 Vielleicht" : ""} />
                    {b.notizen && (
                        <div style={{ marginTop: 8, padding: "10px 12px", background: C.bgInput || C.input, borderRadius: 10, border: `1px solid ${C.bd}` }}>
                            <div style={{ fontSize: 11, color: C.txD, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }}>Notizen</div>
                            <p style={{ fontSize: 13, color: C.txD, margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>„{b.notizen}"</p>
                        </div>
                    )}
                </Section>

                {/* Datenbank-Infos */}
                {db && (
                    <Section title="🗄️ Aus der Datenbank">
                        <InfoRow label="Biersorte" value={db.biersorte || db.bierstil || ""} />
                        <InfoRow label="Brauart" value={db.brauart || ""} />
                        <InfoRow label="Alkohol" value={db.alkoholProzent ? `${db.alkoholProzent}%` : ""} />
                        <InfoRow label="Inhalt" value={db.inhaltMl ? `${db.inhaltMl} ml` : ""} />
                        <InfoRow label="Herkunft" value={db.herkunft || db.land || ""} />
                        <InfoRow label="Optik" value={db.optik || ""} />
                        <InfoRow label="Geruch" value={db.geruch || ""} />
                        <InfoRow label="Geschmack" value={db.geschmack || ""} />
                        <InfoRow label="Trinktemperatur" value={db.trinktemperatur || ""} />
                        <InfoRow label="Glastyp" value={db.glastyp || ""} />
                        <InfoRow label="Food Pairing" value={db.foodPairing || ""} />
                        <InfoRow label="EAN" value={db.ean || ""} />
                        <InfoRow label="Preis" value={db.preis ? `${db.preis} €` : ""} />
                        {db.zutaten && (
                            <div style={{ padding: "10px 0", borderBottom: `1px solid ${C.bd}` }}>
                                <div style={{ fontSize: 12, color: C.txD, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }}>Zutaten</div>
                                <div style={{ fontSize: 12, color: C.tx, lineHeight: 1.5 }}>{db.zutaten}</div>
                            </div>
                        )}
                    </Section>
                )}

                {/* Beschreibung aus DB */}
                {db?.beschreibung && (
                    <Section title="📖 Beschreibung">
                        <p style={{ fontSize: 13, color: C.txD, lineHeight: 1.7, margin: 0 }}>{db.beschreibung}</p>
                    </Section>
                )}

                {db?.geschichte && (
                    <Section title="🏛️ Geschichte">
                        <p style={{ fontSize: 13, color: C.txD, lineHeight: 1.7, margin: 0 }}>{db.geschichte}</p>
                    </Section>
                )}

                {db?.foodPairing && db.foodPairing.length > 50 && (
                    <Section title="🍽️ Food Pairing">
                        <p style={{ fontSize: 13, color: C.txD, lineHeight: 1.7, margin: 0 }}>{db.foodPairing}</p>
                    </Section>
                )}

                {/* Brauerei-Info */}
                {db?.brauereiAdresse && (
                    <Section title="🏭 Brauerei">
                        <InfoRow label="Name" value={db.brauerei || ""} />
                        <InfoRow label="Adresse" value={db.brauereiAdresse || ""} />
                        <InfoRow label="Land" value={db.land || ""} />
                    </Section>
                )}

                {/* Kommentare */}
                <Section title={`💬 Kommentare (${kommentare.length})`}>
                    {kommentare.length === 0 && (
                        <div style={{ color: C.txM, fontSize: 13, textAlign: "center" as const, padding: "10px 0" }}>
                            Noch keine Kommentare – sei der Erste!
                        </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: kommentare.length > 0 ? 14 : 0 }}>
                        {kommentare.map((k: any) => (
                            <div key={k.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.acGlow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
                                    {k.user?.image || "🍺"}
                                </div>
                                <div style={{ flex: 1, background: "#141208", borderRadius: 10, padding: "8px 12px", border: `1px solid ${C.bd}` }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: C.tx }}>{k.user?.name}</span>
                                        <span style={{ fontSize: 10, color: C.txM }}>{new Date(k.createdAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: C.txD, lineHeight: 1.5 }}>{k.text}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Kommentar schreiben */}
                    <div style={{ display: "flex", gap: 8 }}>
                        <input
                            placeholder="Kommentar schreiben…"
                            value={kommentar}
                            onChange={e => setKommentar(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleKommentar()}
                            style={{ flex: 1, padding: "10px 12px", background: "#141208", border: `1px solid ${C.bd}`, borderRadius: 20, color: C.tx, fontSize: 13, outline: "none" }}
                        />
                        <button onClick={handleKommentar} disabled={sending || !kommentar.trim()}
                                style={{ padding: "10px 16px", background: C.ac, color: C.bg, border: "none", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !kommentar.trim() ? 0.5 : 1 }}>
                            ➤
                        </button>
                    </div>
                </Section>
            </div>
        </div>
    );
}