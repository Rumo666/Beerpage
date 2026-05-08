"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

const C = {
    bg: "#0E0C07", card: "#1A1710", input: "#141208",
    ac: "#C8963E", acDim: "#8B6A2F", acGlow: "rgba(200,150,62,0.12)",
    tx: "#EDE5D0", txD: "#8A7D66", txM: "#5A5040",
    bd: "#2E2820",
};

const SORTEN = ["Alle","Pils","Helles","Weizen","IPA","Pale Ale","Stout","Porter","Märzen","Bock","Kölsch","Alt","Rauchbier","Witbier","Tripel","Dubbel","Saison","Sonstiges"];
const LAENDER = ["Alle","Deutschland","Belgien","Niederlande","England","Schottland","Irland","USA","Frankreich","Italien","Tschechien","Japan","Österreich"];

export default function KatalogPage() {
    const { status } = useSession();
    const router = useRouter();

    const [biere, setBiere] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Filter
    const [suche, setSuche] = useState("");
    const [sorte, setSorte] = useState("Alle");
    const [land, setLand] = useState("Alle");
    const [showFilter, setShowFilter] = useState(false);

    // Scanner
    const [scanActive, setScanActive] = useState(false);
    const [scanResult, setScanResult] = useState("");
    const scannerRef = useRef<any>(null);
    const scannerDivRef = useRef<HTMLDivElement>(null);

    const searchTimer = useRef<any>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    const fetchBiere = useCallback(async (reset = false) => {
        setLoading(true);
        const currentPage = reset ? 1 : page;
        const params = new URLSearchParams({
            q: suche,
            sorte: sorte === "Alle" ? "" : sorte,
            land: land === "Alle" ? "" : land,
            page: String(currentPage),
            limit: "20",
        });
        try {
            const res = await fetch(`/api/katalog?${params}`);
            const data = await res.json();
            if (reset) {
                setBiere(data.biere || []);
                setPage(2);
            } else {
                setBiere(prev => [...prev, ...(data.biere || [])]);
                setPage(p => p + 1);
            }
            setTotal(data.total || 0);
            setHasMore((data.biere || []).length === 20);
        } catch {}
        setLoading(false);
    }, [suche, sorte, land, page]);

    useEffect(() => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => fetchBiere(true), 400);
    }, [suche, sorte, land]);

    // EAN Scanner
    const startScanner = async () => {
        setScanActive(true);
        try {
            const { Html5Qrcode } = await import("html5-qrcode");
            const scanner = new Html5Qrcode("qr-scanner-div");
            scannerRef.current = scanner;
            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 280, height: 120 } },
                (decodedText: string) => {
                    const ean = decodedText.replace(/[^\d]/g, "");
                    setScanResult(ean);
                    setSuche(ean);
                    stopScanner();
                },
                () => {}
            );
        } catch (e) {
            setScanActive(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch {}
            scannerRef.current = null;
        }
        setScanActive(false);
    };

    useEffect(() => { return () => { stopScanner(); }; }, []);

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>

            {/* Header */}
            <div style={{ background: C.card, borderBottom: `1px solid ${C.bd}`, padding: "14px 16px", position: "sticky" as const, top: 0, zIndex: 50 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <h1 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: C.ac, margin: 0, flex: 1 }}>🗄️ Katalog</h1>
                    <button onClick={() => setShowFilter(p => !p)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${showFilter ? C.ac : C.bd}`, background: showFilter ? C.acGlow : "transparent", color: showFilter ? C.ac : C.txD, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        Filter {showFilter ? "▲" : "▼"}
                    </button>
                </div>

                {/* Suche + Scanner */}
                <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, position: "relative" as const }}>
                        <input
                            placeholder="Name oder EAN suchen…"
                            value={suche}
                            onChange={e => setSuche(e.target.value)}
                            style={{ width: "100%", padding: "10px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const }}
                        />
                        {suche && (
                            <button onClick={() => { setSuche(""); setScanResult(""); }} style={{ position: "absolute" as const, right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.txM, cursor: "pointer", fontSize: 16 }}>✕</button>
                        )}
                    </div>
                    <button onClick={scanActive ? stopScanner : startScanner} style={{
                        padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${scanActive ? C.ac : C.bd}`,
                        background: scanActive ? C.acGlow : "transparent", color: scanActive ? C.ac : C.txD,
                        cursor: "pointer", fontSize: 18, flexShrink: 0,
                    }}>
                        📷
                    </button>
                </div>

                {/* Filter */}
                {showFilter && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column" as const, gap: 8 }}>
                        <div>
                            <div style={{ fontSize: 10, color: C.txM, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }}>Biersorte</div>
                            <div style={{ display: "flex", gap: 5, overflowX: "auto" as const, paddingBottom: 4 }}>
                                {SORTEN.map(s => (
                                    <button key={s} onClick={() => setSorte(s)} style={{ padding: "5px 10px", borderRadius: 16, border: `1px solid ${sorte === s ? C.ac : C.bd}`, background: sorte === s ? C.acGlow : "transparent", color: sorte === s ? C.ac : C.txD, cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const, flexShrink: 0 }}>{s}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 10, color: C.txM, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }}>Land</div>
                            <div style={{ display: "flex", gap: 5, overflowX: "auto" as const, paddingBottom: 4 }}>
                                {LAENDER.map(l => (
                                    <button key={l} onClick={() => setLand(l)} style={{ padding: "5px 10px", borderRadius: 16, border: `1px solid ${land === l ? C.ac : C.bd}`, background: land === l ? C.acGlow : "transparent", color: land === l ? C.ac : C.txD, cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const, flexShrink: 0 }}>{l}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Scanner Fenster */}
            {scanActive && (
                <div style={{ padding: 16 }}>
                    <div style={{ borderRadius: 14, overflow: "hidden", border: `2px solid ${C.ac}`, position: "relative" as const }}>
                        <div id="qr-scanner-div" ref={scannerDivRef} style={{ width: "100%" }} />
                        <button onClick={stopScanner} style={{ position: "absolute" as const, top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", borderRadius: 20, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Abbrechen</button>
                    </div>
                    <div style={{ textAlign: "center" as const, fontSize: 12, color: C.txD, marginTop: 8 }}>Halte den EAN-Code in den Rahmen</div>
                </div>
            )}

            {scanResult && !scanActive && (
                <div style={{ margin: "12px 16px 0", padding: "8px 14px", borderRadius: 10, background: "#27AE6020", border: "1px solid #27AE60", fontSize: 13, color: "#27AE60" }}>
                    ✅ EAN gescannt: {scanResult}
                </div>
            )}

            {/* Ergebnis-Info */}
            <div style={{ padding: "10px 16px 0", fontSize: 12, color: C.txM }}>
                {total > 0 ? `${total} Biere gefunden` : loading ? "Suche…" : "Keine Biere gefunden"}
            </div>

            {/* Bier-Liste */}
            <div style={{ padding: "10px 16px", display: "flex", flexDirection: "column" as const, gap: 8 }}>
                {biere.map((b: any) => (
                    <div key={b.id} onClick={() => router.push(`/katalog/${b.id}`)}
                         style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.bd}`, padding: 12, cursor: "pointer", display: "flex", gap: 12, alignItems: "center", transition: "border-color .2s" }}
                         onMouseEnter={e => e.currentTarget.style.borderColor = C.acDim}
                         onMouseLeave={e => e.currentTarget.style.borderColor = C.bd}>

                        {/* Bild */}
                        <div style={{ width: 56, height: 76, borderRadius: 8, overflow: "hidden", background: "#0a0807", flexShrink: 0, border: `1px solid ${C.bd}` }}>
                            {b.bildUrl ? (
                                <img src={b.bildUrl} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "contain" as const }} />
                            ) : (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>🍺</div>
                            )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 700, color: C.tx, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{b.name}</div>
                            <div style={{ fontSize: 11, color: C.txD, marginBottom: 4 }}>{b.brauerei}</div>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" as const }}>
                                {(b.biersorte || b.bierstil) && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: C.acGlow, color: C.ac, fontWeight: 600 }}>{b.biersorte || b.bierstil}</span>}
                                {b.land && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: C.bd, color: C.txD }}>{b.land}</span>}
                                {b.alkoholProzent && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: C.bd, color: C.txD }}>{b.alkoholProzent}%</span>}
                            </div>
                            {b.ean && <div style={{ fontSize: 10, color: C.txM, marginTop: 3 }}>EAN: {b.ean}</div>}
                        </div>

                        <span style={{ color: C.txM, fontSize: 16, flexShrink: 0 }}>›</span>
                    </div>
                ))}

                {/* Mehr laden */}
                {hasMore && !loading && biere.length > 0 && (
                    <button onClick={() => fetchBiere(false)} style={{ width: "100%", padding: 12, background: "transparent", border: `1px solid ${C.bd}`, borderRadius: 12, color: C.txD, cursor: "pointer", fontSize: 14 }}>
                        Mehr laden…
                    </button>
                )}

                {loading && (
                    <div style={{ textAlign: "center" as const, padding: 20, color: C.txD }}>⏳ Laden…</div>
                )}
            </div>

            {/* Bottom Nav */}
            <nav style={{ position: "fixed" as const, bottom: 0, left: 0, right: 0, background: C.card + "f5", borderTop: `1px solid ${C.bd}`, display: "flex", justifyContent: "space-around", padding: "8px 0 16px", backdropFilter: "blur(16px)" }}>
                {[
                    { icon: "🏠", label: "Feed", path: "/feed" },
                    { icon: "🔍", label: "Suche", path: "/suche" },
                    { icon: "🗄️", label: "Katalog", path: "/katalog" },
                    { icon: "👤", label: "Profil", path: "/profil" },
                ].map(item => (
                    <button key={item.path} onClick={() => router.push(item.path)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2, padding: "4px 12px", color: item.path === "/katalog" ? C.ac : C.txM, fontSize: 10, fontWeight: item.path === "/katalog" ? 700 : 500 }}>
                        <span style={{ fontSize: 20 }}>{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}