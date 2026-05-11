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

const SORTEN = ["Alle","Pils","Helles","Weizen","IPA","Pale Ale","Stout","Porter","Märzen","Bock","Doppelbock","Schwarzbier","Kölsch","Alt","Rauchbier","Kellerbier","Witbier","Tripel","Dubbel","Saison","Berliner Weisse","Gose","Sonstiges"];
const LAENDER = ["Alle","Deutschland","Belgien","Niederlande","England","Schottland","Irland","USA","Frankreich","Italien","Tschechien","Japan","Österreich","Schweden","Dänemark","Norwegen"];

export default function KatalogPage() {
    const { status } = useSession();
    const router = useRouter();

    const [biere, setBiere] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [suche, setSuche] = useState("");
    const [sorte, setSorte] = useState("Alle");
    const [land, setLand] = useState("Alle");
    const [sterne, setSterne] = useState(0); // 0 = alle, 1-5 = genau diese Sterne
    const [showFilter, setShowFilter] = useState(false);

    const [scanActive, setScanActive] = useState(false);
    const [scanResult, setScanResult] = useState("");
    const scannerRef = useRef<any>(null);

    const searchTimer = useRef<any>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    const fetchBiere = useCallback(async (reset = false) => {
        if (loading) return;
        setLoading(true);
        const pg = reset ? 1 : currentPage;
        const params = new URLSearchParams({
            q: suche,
            sorte: sorte === "Alle" ? "" : sorte,
            land: land === "Alle" ? "" : land,
            sterne: sterne > 0 ? String(sterne) : "",
            page: String(pg),
            limit: "24",
        });
        try {
            const res = await fetch(`/api/katalog?${params}`);
            const data = await res.json();
            const newBiere = data.biere || [];
            if (reset) {
                setBiere(newBiere);
                setCurrentPage(2);
            } else {
                setBiere(prev => [...prev, ...newBiere]);
                setCurrentPage(p => p + 1);
            }
            setTotal(data.total || 0);
            setHasMore(newBiere.length === 24);
        } catch {}
        setLoading(false);
    }, [suche, sorte, land, sterne, currentPage, loading]);

    // Bei Filteränderung neu laden
    useEffect(() => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            setCurrentPage(1);
            fetchBiere(true);
        }, 350);
    }, [suche, sorte, land, sterne]);

    // Infinite Scroll
    useEffect(() => {
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore && !loading) {
                fetchBiere(false);
            }
        }, { threshold: 0.1 });
        if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
        return () => observerRef.current?.disconnect();
    }, [hasMore, loading, fetchBiere]);

    // EAN Scanner
    const startScanner = async () => {
        setScanActive(true);
        try {
            const { Html5Qrcode } = await import("html5-qrcode");
            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;
            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 100 } },
                (decodedText: string) => {
                    const ean = decodedText.replace(/[^\d]/g, "");
                    setScanResult(ean);
                    setSuche(ean);
                    stopScanner();
                },
                () => {}
            );
        } catch { setScanActive(false); }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch {}
            scannerRef.current = null;
        }
        setScanActive(false);
    };

    useEffect(() => { return () => { stopScanner(); }; }, []);

    const activeFilters = (sorte !== "Alle" ? 1 : 0) + (land !== "Alle" ? 1 : 0) + (sterne > 0 ? 1 : 0);

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>

            {/* Header */}
            <div style={{ background: C.card, borderBottom: `1px solid ${C.bd}`, padding: "14px 16px", position: "sticky" as const, top: 0, zIndex: 50 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <h1 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: C.ac, margin: 0, flex: 1 }}>🗄️ Katalog</h1>
                    <span style={{ fontSize: 12, color: C.txM }}>{total} Biere</span>
                    <button onClick={() => setShowFilter(p => !p)} style={{
                        padding: "6px 12px", borderRadius: 8,
                        border: `1px solid ${activeFilters > 0 ? C.ac : C.bd}`,
                        background: activeFilters > 0 ? C.acGlow : "transparent",
                        color: activeFilters > 0 ? C.ac : C.txD,
                        cursor: "pointer", fontSize: 12, fontWeight: 600,
                    }}>
                        Filter{activeFilters > 0 ? ` (${activeFilters})` : ""} {showFilter ? "▲" : "▼"}
                    </button>
                </div>

                {/* Suche + Scanner */}
                <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1, position: "relative" as const }}>
                        <input
                            placeholder="Name, Brauerei oder EAN…"
                            value={suche}
                            onChange={e => setSuche(e.target.value)}
                            style={{ width: "100%", padding: "10px 36px 10px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const }}
                        />
                        {suche && (
                            <button onClick={() => { setSuche(""); setScanResult(""); }} style={{ position: "absolute" as const, right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.txM, cursor: "pointer", fontSize: 16 }}>✕</button>
                        )}
                    </div>
                    <button onClick={scanActive ? stopScanner : startScanner} style={{
                        padding: "10px 14px", borderRadius: 10,
                        border: `1.5px solid ${scanActive ? C.ac : C.bd}`,
                        background: scanActive ? C.acGlow : "transparent",
                        color: scanActive ? C.ac : C.txD,
                        cursor: "pointer", fontSize: 18, flexShrink: 0,
                    }} title="EAN scannen">📷</button>
                </div>

                {/* Filter */}
                {showFilter && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column" as const, gap: 10 }}>
                        {/* Sorte */}
                        <div>
                            <div style={{ fontSize: 10, color: C.txM, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 5 }}>Biersorte</div>
                            <div style={{ display: "flex", gap: 5, overflowX: "auto" as const, paddingBottom: 4 }}>
                                {SORTEN.map(s => (
                                    <button key={s} onClick={() => setSorte(s)} style={{ padding: "5px 10px", borderRadius: 16, border: `1px solid ${sorte === s ? C.ac : C.bd}`, background: sorte === s ? C.acGlow : "transparent", color: sorte === s ? C.ac : C.txD, cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const, flexShrink: 0 }}>{s}</button>
                                ))}
                            </div>
                        </div>

                        {/* Land */}
                        <div>
                            <div style={{ fontSize: 10, color: C.txM, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 5 }}>Land</div>
                            <div style={{ display: "flex", gap: 5, overflowX: "auto" as const, paddingBottom: 4 }}>
                                {LAENDER.map(l => (
                                    <button key={l} onClick={() => setLand(l)} style={{ padding: "5px 10px", borderRadius: 16, border: `1px solid ${land === l ? C.ac : C.bd}`, background: land === l ? C.acGlow : "transparent", color: land === l ? C.ac : C.txD, cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" as const, flexShrink: 0 }}>{l}</button>
                                ))}
                            </div>
                        </div>

                        {/* Sterne – genau diese Bewertung */}
                        <div>
                            <div style={{ fontSize: 10, color: C.txM, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 5 }}>Bewertung (Community)</div>
                            <div style={{ display: "flex", gap: 5 }}>
                                <button onClick={() => setSterne(0)} style={{ padding: "5px 12px", borderRadius: 16, border: `1px solid ${sterne === 0 ? C.ac : C.bd}`, background: sterne === 0 ? C.acGlow : "transparent", color: sterne === 0 ? C.ac : C.txD, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Alle</button>
                                {[1,2,3,4,5].map(n => (
                                    <button key={n} onClick={() => setSterne(sterne === n ? 0 : n)} style={{ padding: "5px 12px", borderRadius: 16, border: `1px solid ${sterne === n ? C.ac : C.bd}`, background: sterne === n ? C.acGlow : "transparent", color: sterne === n ? C.ac : C.txD, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                                        {"★".repeat(n)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {activeFilters > 0 && (
                            <button onClick={() => { setSorte("Alle"); setLand("Alle"); setSterne(0); }} style={{ alignSelf: "flex-start" as const, padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(192,57,43,0.3)", background: "transparent", color: "#C0392B", cursor: "pointer", fontSize: 11 }}>
                                Filter zurücksetzen
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Scanner */}
            {scanActive && (
                <div style={{ padding: 16 }}>
                    <div style={{ borderRadius: 14, overflow: "hidden", border: `2px solid ${C.ac}`, position: "relative" as const, background: "#000" }}>
                        <div id="qr-reader" style={{ width: "100%" }} />
                        <button onClick={stopScanner} style={{ position: "absolute" as const, top: 8, right: 8, background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontSize: 12 }}>✕ Abbrechen</button>
                    </div>
                    <div style={{ textAlign: "center" as const, fontSize: 12, color: C.txD, marginTop: 8 }}>📷 Halte den EAN-Barcode in den Rahmen</div>
                </div>
            )}

            {scanResult && !scanActive && (
                <div style={{ margin: "10px 16px 0", padding: "8px 14px", borderRadius: 10, background: "#27AE6015", border: "1px solid #27AE6050", fontSize: 13, color: "#27AE60" }}>
                    ✅ EAN gescannt: {scanResult}
                </div>
            )}

            {/* Bier Grid */}
            <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {biere.map((b: any) => (
                    <div key={b.id}
                         onClick={() => router.push(`/katalog/${b.id}`)}
                         style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.bd}`, overflow: "hidden", cursor: "pointer", transition: "border-color .2s" }}
                         onMouseEnter={e => e.currentTarget.style.borderColor = C.acDim}
                         onMouseLeave={e => e.currentTarget.style.borderColor = C.bd}>

                        {/* Bild */}
                        <div style={{ height: 130, background: "#0a0807", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {b.bildUrl
                                ? <img src={b.bildUrl} alt={b.name} style={{ height: "100%", maxWidth: "100%", objectFit: "contain" as const }} />
                                : <span style={{ fontSize: 40 }}>🍺</span>
                            }
                        </div>

                        {/* Info */}
                        <div style={{ padding: "8px 10px" }}>
                            <div style={{ fontFamily: "Georgia, serif", fontSize: 12, fontWeight: 700, color: C.tx, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{b.name}</div>
                            <div style={{ fontSize: 10, color: C.txD, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{b.brauerei}</div>
                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                {(b.biersorte || b.bierstil) && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 8, background: C.acGlow, color: C.ac, fontWeight: 600 }}>{b.biersorte || b.bierstil}</span>}
                                {b.alkoholProzent && <span style={{ fontSize: 9, color: C.txM }}>{b.alkoholProzent}%</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Infinite Scroll Trigger */}
            <div ref={loadMoreRef} style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {loading && <span style={{ color: C.txM, fontSize: 13 }}>⏳ Laden…</span>}
                {!hasMore && biere.length > 0 && <span style={{ color: C.txM, fontSize: 12 }}>Alle {total} Biere geladen</span>}
            </div>

            {/* Leer */}
            {!loading && biere.length === 0 && (
                <div style={{ textAlign: "center" as const, padding: "60px 20px", color: C.txM }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🍺</div>
                    <div>Keine Biere gefunden</div>
                </div>
            )}

            {/* Bottom Nav */}
            <nav style={{ position: "fixed" as const, bottom: 0, left: 0, right: 0, background: C.card + "f5", borderTop: `1px solid ${C.bd}`, display: "flex", justifyContent: "space-around", padding: "8px 0 16px", backdropFilter: "blur(16px)" }}>
                {[
                    { icon: "🏠", label: "Feed", path: "/feed" },
                    { icon: "🗄️", label: "Katalog", path: "/katalog" },
                    { icon: "🔍", label: "Suche", path: "/suche" },
                    { icon: "🏆", label: "Rangliste", path: "/rangliste" },
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