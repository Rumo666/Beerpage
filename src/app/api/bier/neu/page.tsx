"use client";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";

const BEER_TYPES = ["Pils","Helles","Weizen","Märzen","Bock","Doppelbock","Schwarzbier","Kölsch","Alt","Lager","IPA","Pale Ale","Stout","Porter","Rauchbier","Kellerbier","Berliner Weisse","Gose","Witbier","Tripel","Dubbel","Saison","Sonstiges"];
const GESCHMACK = ["Bitter","Süß","Malzig","Hopfig","Fruchtig","Würzig","Röstaromen","Sauer"];
const MUND = ["Leicht","Mittel","Vollmundig","Cremig"];
const CO2 = ["Wenig","Mittel","Stark"];
const FARBEN = ["Hellgelb","Gold","Bernstein","Kupfer","Braun","Schwarz"];
const OPTIK_OPT = ["klar","leicht trüb","trüb","naturtrüb","blank"];
const PREIS = ["Schnäppchen","Fair","Teuer","Überteuert"];
const NOCHMAL = [{l:"👍 Ja",v:"ja"},{l:"👎 Nein",v:"nein"},{l:"🤷 Vielleicht",v:"vielleicht"}];
const BRAUART = ["untergärig","obergärig","spontangärig","Mischgärung"];
const GLASTYP = ["Pint Glas","Pilsener Glas","Weizenglas","Tulpenglas","Pokal","Becher","Krug","Stange","Kelch","Snifter","IPA Glas","Sonstiges"];

const C = {
    bg: "#0E0C07", card: "#1A1710", input: "#141208",
    ac: "#C8963E", acDim: "#8B6A2F",
    tx: "#EDE5D0", txD: "#8A7D66", txM: "#5A5040",
    bd: "#2E2820", danger: "#C0392B",
};

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} style={{
            padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
            border: `1.5px solid ${active ? C.ac : C.bd}`,
            background: active ? C.ac + "20" : "transparent",
            color: active ? C.ac : C.txD,
            cursor: "pointer", transition: "all .2s", whiteSpace: "nowrap" as const,
        }}>{label}</button>
    );
}

function SL({ children }: { children: React.ReactNode }) {
    return <div style={{ fontSize: 11, fontWeight: 700, color: C.txD, textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 8, marginTop: 20 }}>{children}</div>;
}

function NeuesBierInner() {
    const { status } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scannerRef = useRef<any>(null);

    // Basis
    const [name, setName] = useState("");
    const [brauerei, setBrauerei] = useState("");
    const [sorte, setSorte] = useState("");
    const [ean, setEan] = useState("");
    const [notizen, setNotizen] = useState("");
    const [bildUrls, setBildUrls] = useState<string[]>([]);
    const [bierDbId, setBierDbId] = useState(searchParams.get("bierDbId") || "");

    // Bewertung
    const [sterne, setSterne] = useState(0);
    const [hovSterne, setHovSterne] = useState(0);
    const [geschmack, setGeschmack] = useState<string[]>([]);
    const [mund, setMund] = useState("");
    const [co2, setCo2] = useState("");
    const [farbe, setFarbe] = useState("");
    const [preis, setPreis] = useState("");
    const [nochmal, setNochmal] = useState("");

    // Erweiterte DB-Felder
    const [brauart, setBrauart] = useState("");
    const [optik, setOptik] = useState("");
    const [geruch, setGeruch] = useState("");
    const [geschmackText, setGeschmackText] = useState("");
    const [trinktemperatur, setTrinktemperatur] = useState("");
    const [glastyp, setGlastyp] = useState("");
    const [foodPairing, setFoodPairing] = useState("");
    const [zutaten, setZutaten] = useState("");
    const [alkohol, setAlkohol] = useState("");
    const [inhaltMl, setInhaltMl] = useState("");
    const [land, setLand] = useState("");

    // UI
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [eanLoading, setEanLoading] = useState(false);
    const [eanResult, setEanResult] = useState<any>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [scanActive, setScanActive] = useState(false);
    const [showErweitert, setShowErweitert] = useState(false);
    const suggestTimer = useRef<any>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    // Falls von Katalog-Seite mit bierDbId aufgerufen
    useEffect(() => {
        const dbId = searchParams.get("bierDbId");
        const eanParam = searchParams.get("ean");
        if (dbId) setBierDbId(dbId);
        if (eanParam) {
            setEan(eanParam);
            lookupEan(eanParam);
        }
    }, []);

    const handleImageUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setUploadLoading(true);
        for (const file of Array.from(files)) {
            const formData = new FormData();
            formData.append("file", file);
            try {
                const res = await fetch("/api/upload", { method: "POST", body: formData });
                const data = await res.json();
                if (res.ok && data.url) setBildUrls(prev => [...prev, data.url]);
            } catch {}
        }
        setUploadLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const startScanner = async () => {
        setScanActive(true);
        try {
            const { Html5Qrcode } = await import("html5-qrcode");
            const scanner = new Html5Qrcode("ean-scanner");
            scannerRef.current = scanner;
            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 100 } },
                (decoded: string) => {
                    const e = decoded.replace(/[^\d]/g, "");
                    setEan(e);
                    stopScanner();
                    lookupEan(e);
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

    const handleNameChange = (val: string) => {
        setName(val);
        clearTimeout(suggestTimer.current);
        if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
        suggestTimer.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/katalog?q=${encodeURIComponent(val)}&limit=8`);
                const data = await res.json();
                setSuggestions(data.biere || []);
                setShowSuggestions(true);
            } catch {}
        }, 300);
    };

    const selectFromDb = (bier: any) => {
        setName(bier.name || "");
        setBrauerei(bier.brauerei || "");
        setSorte(bier.biersorte || bier.bierstil || "");
        setEan(bier.ean || "");
        setBierDbId(bier.id || "");
        if (bier.bildUrl) setBildUrls([bier.bildUrl]);
        // Erweiterte Felder aus DB übernehmen
        if (bier.brauart) setBrauart(bier.brauart);
        if (bier.optik) setOptik(bier.optik);
        if (bier.geruch) setGeruch(bier.geruch);
        if (bier.geschmack) setGeschmackText(bier.geschmack);
        if (bier.trinktemperatur) setTrinktemperatur(bier.trinktemperatur);
        if (bier.glastyp) setGlastyp(bier.glastyp);
        if (bier.foodPairing) setFoodPairing(bier.foodPairing);
        if (bier.zutaten) setZutaten(bier.zutaten);
        if (bier.alkoholProzent) setAlkohol(String(bier.alkoholProzent));
        if (bier.inhaltMl) setInhaltMl(String(bier.inhaltMl));
        if (bier.land) setLand(bier.land);
        // Geschmack-Chips
        if (bier.geschmack) {
            const matched = bier.geschmack.split(",").map((g: string) => g.trim())
                .filter((g: string) => GESCHMACK.some(opt => opt.toLowerCase() === g.toLowerCase()));
            setGeschmack(matched);
        }
        if (bier.optik || bier.farbe) {
            const f = (bier.optik || bier.farbe || "").toLowerCase();
            const matched = FARBEN.find(opt => f.includes(opt.toLowerCase()));
            if (matched) setFarbe(matched);
        }
        setSuggestions([]);
        setShowSuggestions(false);
        setEanResult({ bier, quelle: "lokal" });
        setShowErweitert(true);
    };

    const lookupEan = async (eanVal: string) => {
        if (!eanVal || eanVal.length < 8) return;
        setEanLoading(true);
        setEanResult(null);
        try {
            const res = await fetch(`/api/beers/ean?ean=${eanVal}`);
            const data = await res.json();
            setEanResult(data);
            if (data.bier) selectFromDb(data.bier);
        } catch {}
        setEanLoading(false);
    };

    const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
        set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) { setError("Biername ist erforderlich"); return; }
        if (sterne === 0) { setError("Bitte Sterne vergeben"); return; }
        setSaving(true);
        setError("");
        try {
            const res = await fetch("/api/beers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name, brauerei, sorte, ean, notizen,
                    sterne, geschmack,
                    mundgefuehl: mund,
                    kohlensaeure: co2,
                    farbe, preis, nochmal,
                    bildUrls,
                    bierDbId: bierDbId || undefined,
                }),
            });
            if (res.ok) { setSuccess(true); setTimeout(() => router.push("/feed"), 1500); }
            else { const d = await res.json(); setError(d.error || "Fehler"); }
        } catch { setError("Netzwerkfehler"); }
        setSaving(false);
    };

    if (success) return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" as const, gap: 16 }}>
            <div style={{ fontSize: 64 }}>🍺</div>
            <div style={{ color: C.ac, fontSize: 20, fontWeight: 700 }}>Bewertung gespeichert!</div>
        </div>
    );

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: "system-ui, sans-serif", paddingBottom: 100 }}>
            <div style={{ background: C.card, borderBottom: `1px solid ${C.bd}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky" as const, top: 0, zIndex: 50 }}>
                <button type="button" onClick={() => router.push("/feed")} style={{ background: "none", border: "none", color: C.tx, cursor: "pointer", fontSize: 20 }}>←</button>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: C.ac, margin: 0 }}>Neues Bier bewerten</h1>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 16 }}>

                {/* EAN Scanner */}
                <div style={{ background: C.card, border: `1.5px dashed ${C.ac}`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, color: C.txD, marginBottom: 10, textAlign: "center" as const }}>EAN-Code scannen oder eingeben</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <input type="text" placeholder="z.B. 4066600204404" value={ean} onChange={e => setEan(e.target.value)}
                               style={{ flex: 1, padding: "10px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.tx, fontSize: 14, outline: "none" }} />
                        <button type="button" onClick={() => lookupEan(ean)} disabled={eanLoading}
                                style={{ padding: "10px 14px", background: C.ac, color: C.bg, border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
                            {eanLoading ? "⏳" : "🔍"}
                        </button>
                        <button type="button" onClick={scanActive ? stopScanner : startScanner}
                                style={{ padding: "10px 14px", background: scanActive ? C.acGlow || C.ac + "20" : "transparent", border: `1px solid ${scanActive ? C.ac : C.bd}`, borderRadius: 8, color: scanActive ? C.ac : C.txD, cursor: "pointer", fontSize: 16 }}>
                            📷
                        </button>
                    </div>
                    {scanActive && <div id="ean-scanner" style={{ marginTop: 12, borderRadius: 10, overflow: "hidden" }} />}
                    {eanResult && (
                        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: eanResult.bier ? "#27AE6020" : "#C0392B20", border: `1px solid ${eanResult.bier ? "#27AE60" : C.danger}` }}>
                            {eanResult.bier
                                ? <div style={{ fontSize: 12, color: "#27AE60", fontWeight: 700 }}>✅ Gefunden – Felder ausgefüllt{eanResult.bereitsBewertet ? ` · ⚠️ Bereits bewertet von ${eanResult.bereitsBewertet.user?.name}` : ""}</div>
                                : <div style={{ fontSize: 13, color: C.danger }}>❌ Nicht gefunden – bitte manuell eintragen</div>
                            }
                        </div>
                    )}
                </div>

                {/* Bilder */}
                <SL>Fotos</SL>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 16 }}>
                    {bildUrls.map((url, i) => (
                        <div key={i} style={{ position: "relative" as const, width: 80, height: 80 }}>
                            <img src={url} alt="" style={{ width: 80, height: 80, objectFit: "cover" as const, borderRadius: 10, border: `1px solid ${C.bd}` }} />
                            <button type="button" onClick={() => setBildUrls(prev => prev.filter((_, idx) => idx !== i))}
                                    style={{ position: "absolute" as const, top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", background: C.danger, border: `2px solid ${C.bg}`, color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                        </div>
                    ))}
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadLoading}
                            style={{ width: 80, height: 80, borderRadius: 10, border: `1.5px dashed ${C.ac}`, background: C.card, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", color: C.ac, fontSize: 11, fontWeight: 600 }}>
                        {uploadLoading ? "⏳" : <><span style={{ fontSize: 24 }}>+</span><span>Foto</span></>}
                    </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={e => handleImageUpload(e.target.files)} style={{ display: "none" }} />

                {/* Biername */}
                <div style={{ marginBottom: 14, position: "relative" as const }}>
                    <SL>Biername *</SL>
                    <input type="text" placeholder="z.B. Augustiner Edelstoff" value={name}
                           onChange={e => handleNameChange(e.target.value)}
                           onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                           style={{ width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
                    {showSuggestions && suggestions.length > 0 && (
                        <div style={{ position: "absolute" as const, top: "100%", left: 0, right: 0, background: C.card, border: `1px solid ${C.bd}`, borderRadius: 10, zIndex: 100, maxHeight: 220, overflowY: "auto" as const, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                            {suggestions.map((b: any) => (
                                <div key={b.id} onClick={() => selectFromDb(b)}
                                     style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${C.bd}`, display: "flex", alignItems: "center", gap: 10 }}
                                     onMouseEnter={e => (e.currentTarget.style.background = "#231F16")}
                                     onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                    {b.bildUrl && <img src={b.bildUrl} style={{ width: 36, height: 36, objectFit: "cover" as const, borderRadius: 6 }} alt="" />}
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: C.tx }}>{b.name}</div>
                                        <div style={{ fontSize: 11, color: C.txD }}>{b.brauerei} · {b.biersorte || b.bierstil} · {b.land}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* DB Vorschau */}
                {bierDbId && eanResult?.bier && (
                    <div style={{ background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.ac}30`, marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
                        {eanResult.bier.bildUrl && <img src={eanResult.bier.bildUrl} style={{ width: 56, height: 56, objectFit: "cover" as const, borderRadius: 8 }} alt="" />}
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, color: C.ac, fontWeight: 700, marginBottom: 4 }}>AUS DATENBANK</div>
                            {eanResult.bier.geruch && <div style={{ fontSize: 12, color: C.txD }}>👃 {eanResult.bier.geruch}</div>}
                            {eanResult.bier.trinktemperatur && <div style={{ fontSize: 12, color: C.txD }}>🌡️ {eanResult.bier.trinktemperatur}</div>}
                            {eanResult.bier.glastyp && <div style={{ fontSize: 12, color: C.txD }}>🥂 {eanResult.bier.glastyp}</div>}
                        </div>
                    </div>
                )}

                {/* Brauerei */}
                <div style={{ marginBottom: 14 }}>
                    <SL>Brauerei</SL>
                    <input type="text" placeholder="z.B. Augustiner München" value={brauerei} onChange={e => setBrauerei(e.target.value)}
                           style={{ width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
                </div>

                {/* Land */}
                <div style={{ marginBottom: 14 }}>
                    <SL>Herkunftsland</SL>
                    <input type="text" placeholder="z.B. Deutschland, Belgien…" value={land} onChange={e => setLand(e.target.value)}
                           style={{ width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
                </div>

                {/* Biersorte */}
                <SL>Biersorte</SL>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {BEER_TYPES.map(s => <Chip key={s} label={s} active={sorte === s} onClick={() => setSorte(sorte === s ? "" : s)} />)}
                </div>

                {/* Sterne */}
                <SL>Gesamtbewertung *</SL>
                <div style={{ display: "flex", gap: 4 }}>
                    {[1,2,3,4,5].map(s => (
                        <span key={s} onClick={() => setSterne(s)} onMouseEnter={() => setHovSterne(s)} onMouseLeave={() => setHovSterne(0)}
                              style={{ fontSize: 38, color: (hovSterne || sterne) >= s ? C.ac : C.bd, cursor: "pointer", userSelect: "none" as const }}>★</span>
                    ))}
                </div>

                {/* ─── BEWERTUNGS-FELDER ─── */}
                <SL>Geschmacksprofil</SL>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {GESCHMACK.map(g => <Chip key={g} label={g} active={geschmack.includes(g)} onClick={() => toggle(geschmack, setGeschmack, g)} />)}
                </div>

                <SL>Mundgefühl</SL>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {MUND.map(m => <Chip key={m} label={m} active={mund === m} onClick={() => setMund(mund === m ? "" : m)} />)}
                </div>

                <SL>Kohlensäure</SL>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {CO2.map(k => <Chip key={k} label={k} active={co2 === k} onClick={() => setCo2(co2 === k ? "" : k)} />)}
                </div>

                <SL>Farbe / Optik</SL>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {FARBEN.map(f => <Chip key={f} label={f} active={farbe === f} onClick={() => setFarbe(farbe === f ? "" : f)} />)}
                </div>

                <SL>Preis-Leistung</SL>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {PREIS.map(p => <Chip key={p} label={p} active={preis === p} onClick={() => setPreis(preis === p ? "" : p)} />)}
                </div>

                <SL>Nochmal kaufen?</SL>
                <div style={{ display: "flex", gap: 8 }}>
                    {NOCHMAL.map(n => <Chip key={n.v} label={n.l} active={nochmal === n.v} onClick={() => setNochmal(nochmal === n.v ? "" : n.v)} />)}
                </div>

                <div style={{ marginTop: 20, marginBottom: 14 }}>
                    <SL>Notizen</SL>
                    <textarea placeholder="Geschmack, Besonderheiten, Erinnerungen…" value={notizen} onChange={e => setNotizen(e.target.value)} rows={3}
                              style={{ width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const, fontFamily: "inherit" }} />
                </div>

                {/* ─── ERWEITERTE FELDER ─── */}
                <button type="button" onClick={() => setShowErweitert(p => !p)} style={{
                    width: "100%", padding: 12, marginBottom: 16, background: "transparent",
                    border: `1px solid ${C.bd}`, borderRadius: 10, color: C.txD,
                    cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}>
                    {showErweitert ? "▲ Weniger Details" : "▼ Mehr Details (Brauart, Geruch, Glastyp…)"}
                </button>

                {showErweitert && (
                    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 16 }}>
                        <div style={{ fontSize: 12, color: C.ac, fontWeight: 700, marginBottom: 16, textTransform: "uppercase" as const, letterSpacing: 1 }}>Erweiterte Bier-Details</div>

                        {/* Brauart */}
                        <SL>Brauart</SL>
                        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                            {BRAUART.map(b => <Chip key={b} label={b} active={brauart === b} onClick={() => setBrauart(brauart === b ? "" : b)} />)}
                        </div>

                        {/* Alkohol */}
                        <SL>Alkoholgehalt (%)</SL>
                        <input type="number" step="0.1" placeholder="z.B. 5.2" value={alkohol} onChange={e => setAlkohol(e.target.value)}
                               style={{ width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />

                        {/* Inhalt */}
                        <SL>Inhalt (ml)</SL>
                        <input type="number" placeholder="z.B. 500" value={inhaltMl} onChange={e => setInhaltMl(e.target.value)}
                               style={{ width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />

                        {/* Optik */}
                        <SL>Optik (Aussehen)</SL>
                        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 8 }}>
                            {OPTIK_OPT.map(o => <Chip key={o} label={o} active={optik === o} onClick={() => setOptik(optik === o ? "" : o)} />)}
                        </div>
                        <input type="text" placeholder="Weitere Beschreibung…" value={optik} onChange={e => setOptik(e.target.value)}
                               style={{ width: "100%", padding: "10px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 13, outline: "none", boxSizing: "border-box" as const }} />

                        {/* Geruch */}
                        <SL>Geruch / Aroma</SL>
                        <input type="text" placeholder="z.B. frisches Gras, Zitrus, Malz" value={geruch} onChange={e => setGeruch(e.target.value)}
                               style={{ width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />

                        {/* Geschmack Text */}
                        <SL>Geschmack (Freitext)</SL>
                        <input type="text" placeholder="z.B. hopfenbitter, Zitrus, malzig" value={geschmackText} onChange={e => setGeschmackText(e.target.value)}
                               style={{ width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />

                        {/* Trinktemperatur */}
                        <SL>Trinktemperatur</SL>
                        <input type="text" placeholder="z.B. 6-10 °C" value={trinktemperatur} onChange={e => setTrinktemperatur(e.target.value)}
                               style={{ width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />

                        {/* Glastyp */}
                        <SL>Glastyp</SL>
                        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                            {GLASTYP.map(g => <Chip key={g} label={g} active={glastyp === g} onClick={() => setGlastyp(glastyp === g ? "" : g)} />)}
                        </div>

                        {/* Food Pairing */}
                        <SL>Food Pairing</SL>
                        <input type="text" placeholder="z.B. gegrillter Fisch, Käse…" value={foodPairing} onChange={e => setFoodPairing(e.target.value)}
                               style={{ width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const, marginTop: 8 }} />

                        {/* Zutaten */}
                        <SL>Zutaten</SL>
                        <textarea placeholder="z.B. Wasser, Gerstenmalz, Hopfen, Hefe" value={zutaten} onChange={e => setZutaten(e.target.value)} rows={2}
                                  style={{ width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const, fontFamily: "inherit" }} />
                    </div>
                )}

                {error && <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14, background: "#C0392B20", border: `1px solid ${C.danger}40`, color: "#e74c3c", fontSize: 13 }}>{error}</div>}

                <button type="submit" disabled={saving} style={{
                    width: "100%", padding: 16, marginTop: 8,
                    background: saving ? C.acDim : `linear-gradient(135deg, ${C.ac}, ${C.acDim})`,
                    color: C.bg, border: "none", borderRadius: 12,
                    fontSize: 16, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 24px rgba(200,150,62,0.35)",
                }}>
                    {saving ? "Wird gespeichert…" : "🍺 Bewertung speichern"}
                </button>
            </form>
        </div>
    );
}

export default function NeuesBierPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: "100vh", background: "#0E0C07", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: "#C8963E", fontSize: 32 }}>🍺</div></div>}>
            <NeuesBierInner />
        </Suspense>
    );
}