"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FeedPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [bewertungen, setBewertungen] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [geprosted, setGeprosted] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    useEffect(() => {
        if (status === "authenticated") {
            fetch("/api/beers")
                .then((r) => r.json())
                .then((d) => {
                    setBewertungen(d.bewertungen || []);
                    // Prost-Status initialisieren
                    const prostMap: Record<string, boolean> = {};
                    (d.bewertungen || []).forEach((b: any) => {
                        prostMap[b.id] = b.prost?.length > 0;
                    });
                    setGeprosted(prostMap);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [status]);

    const handleProst = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setGeprosted(prev => ({ ...prev, [id]: !prev[id] }));
        await fetch(`/api/beers/${id}/prost`, { method: "POST" });
    };

    if (status === "loading" || loading) return (
        <div style={{ minHeight: "100vh", background: "#0E0C07", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: "#C8963E", fontSize: 32 }}>🍺</div>
        </div>
    );

    const s = {
        wrap: { minHeight: "100vh", background: "#0E0C07", color: "#EDE5D0", fontFamily: "system-ui, sans-serif", paddingBottom: 80 },
        header: { background: "#1A1710", borderBottom: "1px solid #2E2820", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky" as const, top: 0, zIndex: 50 },
        title: { fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 900, color: "#C8963E" },
        nav: { position: "fixed" as const, bottom: 0, left: 0, right: 0, background: "#1A1710", borderTop: "1px solid #2E2820", display: "flex", justifyContent: "space-around", padding: "8px 0 16px" },
        navBtn: { background: "none", border: "none", color: "#5A5040", cursor: "pointer", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2, fontSize: 10, padding: "4px 12px" },
        fab: { position: "fixed" as const, bottom: 72, right: 20, width: 54, height: 54, borderRadius: "50%", background: "linear-gradient(135deg, #C8963E, #8B6A2F)", border: "none", color: "#0E0C07", fontSize: 24, cursor: "pointer", boxShadow: "0 4px 20px rgba(200,150,62,0.4)", display: "flex", alignItems: "center", justifyContent: "center" },
        card: { background: "#1A1710", borderRadius: 14, border: "1px solid #2E2820", margin: "0 16px 12px", overflow: "hidden", cursor: "pointer" as const, transition: "border-color .2s" },
        empty: { textAlign: "center" as const, padding: "60px 20px", color: "#5A5040" },
    };

    return (
        <div style={s.wrap}>
            {/* Header */}
            <div style={s.header}>
                <span style={s.title}>🍺 BierBuddy</span>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#8A7D66" }}>Hi, {session?.user?.name}</span>
                    <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ background: "none", border: "1px solid #2E2820", borderRadius: 8, color: "#8A7D66", padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Feed */}
            <div style={{ padding: "16px 0" }}>
                {bewertungen.length === 0 ? (
                    <div style={s.empty}>
                        <div style={{ fontSize: 64, marginBottom: 16 }}>🍺</div>
                        <p style={{ fontSize: 16, marginBottom: 8 }}>Noch keine Bewertungen</p>
                        <p style={{ fontSize: 13 }}>Sei der Erste und bewerte ein Bier!</p>
                    </div>
                ) : (
                    bewertungen.map((b: any) => (
                        <div
                            key={b.id}
                            style={s.card}
                            onClick={() => router.push(`/bier/${b.id}`)}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = "#8B6A2F")}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = "#2E2820")}
                        >
                            <div style={{ padding: 14 }}>

                                {/* User + Zeit + Sorte */}
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(200,150,62,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                                        {b.user?.image || "🍺"}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>{b.user?.name}</div>
                                        <div style={{ fontSize: 10, color: "#5A5040" }}>{new Date(b.createdAt).toLocaleDateString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                                    </div>
                                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(200,150,62,0.1)", color: "#C8963E", fontWeight: 700, whiteSpace: "nowrap" as const, flexShrink: 0 }}>{b.sorte}</span>
                                </div>

                                {/* Hauptbereich: Infos links, Bild rechts */}
                                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>

                                    {/* Infos links */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, margin: "0 0 2px", lineHeight: 1.3 }}>{b.name}</h3>
                                        {b.brauerei && <div style={{ fontSize: 11, color: "#8A7D66", marginBottom: 6 }}>{b.brauerei}</div>}

                                        {/* Sterne */}
                                        <div style={{ fontSize: 16, marginBottom: 6, letterSpacing: 1 }}>
                                            {[1,2,3,4,5].map(st => <span key={st} style={{ color: st <= b.sterne ? "#C8963E" : "#2E2820" }}>★</span>)}
                                        </div>

                                        {/* Geschmack Tags */}
                                        {b.geschmack?.length > 0 && (
                                            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                                                {b.geschmack.slice(0, 4).map((g: string) => (
                                                    <span key={g} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 10, background: "#2E2820", color: "#8A7D66" }}>{g}</span>
                                                ))}
                                            </div>
                                        )}

                                        {b.notizen && (
                                            <p style={{ fontSize: 12, color: "#8A7D66", marginTop: 6, fontStyle: "italic", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                                                „{b.notizen}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Bild rechts – hochformat freundlich */}
                                    {b.bildUrls?.[0] && (
                                        <div style={{ flexShrink: 0, width: 80, height: 110, borderRadius: 10, overflow: "hidden", border: "1px solid #2E2820", background: "#0E0C07" }}>
                                            <img
                                                src={b.bildUrls[0]}
                                                alt={b.name}
                                                style={{ width: "100%", height: "100%", objectFit: "contain" as const }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Aktionen – stopPropagation damit Klick nicht zur Detailseite geht */}
                            <div style={{ display: "flex", borderTop: "1px solid #2E2820" }}>
                                <button
                                    onClick={(e) => handleProst(e, b.id)}
                                    style={{
                                        flex: 1, padding: "10px", background: "none", border: "none",
                                        borderRight: "1px solid #2E2820",
                                        color: geprosted[b.id] ? "#C8963E" : "#8A7D66",
                                        cursor: "pointer", fontSize: 13, fontWeight: geprosted[b.id] ? 700 : 400,
                                        transition: "color .2s",
                                    }}
                                >
                                    🍻 {(b._count?.prost || 0) + (geprosted[b.id] ? 1 : 0)} Prost!
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); router.push(`/bier/${b.id}#kommentare`); }}
                                    style={{ flex: 1, padding: "10px", background: "none", border: "none", color: "#8A7D66", cursor: "pointer", fontSize: 13 }}
                                >
                                    💬 {b._count?.kommentare || 0}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* FAB - Neue Bewertung */}
            <button style={s.fab} onClick={() => router.push("/bier/neu")}>+</button>

            {/* Bottom Nav */}
            <nav style={s.nav}>
                {[
                    { icon: "🏠", label: "Feed", path: "/feed" },
                    { icon: "🔍", label: "Suche", path: "/suche" },
                    { icon: "📖", label: "Wissen", path: "/wiki" },
                    { icon: "🏆", label: "Rangliste", path: "/rangliste" },
                    { icon: "👤", label: "Profil", path: "/profil" },
                ].map((item) => (
                    <button key={item.path} style={{ ...s.navBtn, color: item.path === "/feed" ? "#C8963E" : "#5A5040" }} onClick={() => router.push(item.path)}>
                        <span style={{ fontSize: 20 }}>{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}