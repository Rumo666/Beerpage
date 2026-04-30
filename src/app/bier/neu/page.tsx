"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

const BEER_TYPES = ["Pils","Helles","Weizen","Märzen","Bock","Doppelbock","Schwarzbier","Kölsch","Alt","Lager","IPA","Pale Ale","Stout","Porter","Rauchbier","Kellerbier","Berliner Weisse","Gose","Witbier","Tripel","Dubbel","Saison","Sonstiges"];
const GESCHMACK = ["Bitter","Süß","Malzig","Hopfig","Fruchtig","Würzig","Röstaromen","Sauer"];
const MUND = ["Leicht","Mittel","Vollmundig","Cremig"];
const CO2 = ["Wenig","Mittel","Stark"];
const FARBEN = ["Hellgelb","Gold","Bernstein","Kupfer","Braun","Schwarz"];
const PREIS = ["Schnäppchen","Fair","Teuer","Überteuert"];
const NOCHMAL = [{l:"👍 Ja",v:"ja"},{l:"👎 Nein",v:"nein"},{l:"🤷 Vielleicht",v:"vielleicht"}];

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

function Input({ label, placeholder, value, onChange, type = "text" }: any) {
    return (
        <div style={{ marginBottom: 14 }}>
            {label && <SL>{label}</SL>}
            <input type={type} placeholder={placeholder} value={value} onChange={onChange} style={{
                width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`,
                borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const,
            }} />
        </div>
    );
}

export default function NeuesBierPage() {
    const { status } = useSession();
    const router = useRouter();

    // Formular-State
    const [name, setName] = useState("");
    const [brauerei, setBrauerei] = useState("");
    const [sorte, setSorte] = useState("");
    const [ean, setEan] = useState("");
    const [notizen, setNotizen] = useState("");
    const [sterne, setSterne] = useState(0);
    const [hovSterne, setHovSterne] = useState(0);
    const [geschmack, setGeschmack] = useState<string[]>([]);
    const [mund, setMund] = useState("");
    const [co2, setCo2] = useState("");
    const [farbe, setFarbe] = useState("");
    const [preis, setPreis] = useState("");
    const [nochmal, setNochmal] = useState("");
    const [bierDbId, setBierDbId] = useState("");

    // UI-State
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [eanLoading, setEanLoading] = useState(false);
    const [eanResult, setEanResult] = useState<any>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestTimer = useRef<any>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    // Autocomplete bei Namenseingabe
    const handleNameChange = (val: string) => {
        setName(val);
        clearTimeout(suggestTimer.current);
        if (val.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
        suggestTimer.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/beers/search?q=${encodeURIComponent(val)}&typ=datenbank`);
                const data = await res.json();
                setSuggestions(data.datenbank || []);
                setShowSuggestions(true);
            } catch {}
        }, 300);
    };

    // Bier aus DB auswählen → Felder vorausfüllen
    const selectFromDb = (bier: any) => {
        setName(bier.name || "");
        setBrauerei(bier.brauerei || bier.brauerei_detail || "");
        setSorte(bier.biersorte || bier.bierstil || "");
        setEan(bier.ean || "");
        setBierDbId(bier.id || "");
        // Geschmack aus DB vorausfüllen
        if (bier.geschmack) {
            const dbGeschmack = bier.geschmack.split(",").map((g: string) => g.trim());
            const matched = dbGeschmack.filter((g: string) =>
                GESCHMACK.some(opt => opt.toLowerCase() === g.toLowerCase())
            );
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
    };

    // EAN Lookup
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
                    bierDbId: bierDbId || undefined,
                }),
            });
            if (res.ok) {
                setSuccess(true);
                setTimeout(() => router.push("/feed"), 1500);
            } else {
                const d = await res.json();
                setError(d.error || "Fehler beim Speichern");
            }
        } catch {
            setError("Netzwerkfehler");
        }
        setSaving(false);
    };

    if (success) return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 64 }}>🍺</div>
            <div style={{ color: C.ac, fontSize: 20, fontWeight: 700, fontFamily: "Georgia, serif" }}>Bewertung gespeichert!</div>
            <div style={{ color: C.txD, fontSize: 13 }}>Weiterleitung zum Feed…</div>
        </div>
    );

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: "system-ui, sans-serif", paddingBottom: 100 }}>
            {/* Header */}
            <div style={{ background: C.card, borderBottom: `1px solid ${C.bd}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky" as const, top: 0, zIndex: 50 }}>
                <button type="button" onClick={() => router.push("/feed")} style={{ background: "none", border: "none", color: C.tx, cursor: "pointer", fontSize: 20, padding: 0 }}>←</button>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: C.ac, margin: 0 }}>Neues Bier bewerten</h1>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 16 }}>

                {/* EAN Scanner */}
                <div style={{ background: C.card, border: `1.5px dashed ${C.ac}`, borderRadius: 12, padding: 16, marginBottom: 20, textAlign: "center" as const }}>
                    <div style={{ fontSize: 13, color: C.txD, marginBottom: 10 }}>EAN-Code eingeben oder scannen</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <input
                            type="text"
                            placeholder="z.B. 4066600204404"
                            value={ean}
                            onChange={e => setEan(e.target.value)}
                            style={{ flex: 1, padding: "10px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.tx, fontSize: 14, outline: "none" }}
                        />
                        <button type="button" onClick={() => lookupEan(ean)} disabled={eanLoading} style={{
                            padding: "10px 16px", background: C.ac, color: C.bg, border: "none", borderRadius: 8,
                            fontWeight: 700, fontSize: 13, cursor: "pointer",
                        }}>
                            {eanLoading ? "⏳" : "🔍 Suchen"}
                        </button>
                    </div>

                    {/* EAN Ergebnis */}
                    {eanResult && (
                        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: eanResult.bier ? "#27AE6020" : "#C0392B20", border: `1px solid ${eanResult.bier ? "#27AE60" : C.danger}`, textAlign: "left" as const }}>
                            {eanResult.bier ? (
                                <>
                                    <div style={{ fontSize: 12, color: "#27AE60", fontWeight: 700, marginBottom: 4 }}>
                                        ✅ Gefunden ({eanResult.quelle === "lokal" ? "Datenbank" : "Open Food Facts"})
                                    </div>
                                    <div style={{ fontSize: 14, color: C.tx, fontWeight: 600 }}>{eanResult.bier.name}</div>
                                    <div style={{ fontSize: 12, color: C.txD }}>{eanResult.bier.brauerei}</div>
                                    {eanResult.bereitsBewertet && (
                                        <div style={{ fontSize: 11, color: C.ac, marginTop: 4 }}>
                                            ⚠️ Bereits von {eanResult.bereitsBewertet.user?.name} bewertet ({eanResult.bereitsBewertet.sterne}★)
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ fontSize: 13, color: C.danger }}>❌ Nicht in der Datenbank gefunden</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Biername mit Autocomplete */}
                <div style={{ marginBottom: 14, position: "relative" as const }}>
                    <SL>Biername *</SL>
                    <input
                        type="text"
                        placeholder="z.B. Augustiner Edelstoff – oder tippen für Vorschläge"
                        value={name}
                        onChange={e => handleNameChange(e.target.value)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        style={{ width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const }}
                    />
                    {/* Autocomplete Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div style={{ position: "absolute" as const, top: "100%", left: 0, right: 0, background: C.card, border: `1px solid ${C.bd}`, borderRadius: 10, zIndex: 100, maxHeight: 200, overflowY: "auto" as const }}>
                            {suggestions.slice(0, 8).map((b: any) => (
                                <div key={b.id} onClick={() => selectFromDb(b)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${C.bd}`, display: "flex", alignItems: "center", gap: 10 }}
                                     onMouseEnter={e => (e.currentTarget.style.background = C.bgHover || "#231F16")}
                                     onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                    {b.bildUrl && <img src={b.bildUrl} style={{ width: 32, height: 32, objectFit: "cover" as const, borderRadius: 4 }} alt="" />}
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: C.tx }}>{b.name}</div>
                                        <div style={{ fontSize: 11, color: C.txD }}>{b.brauerei} · {b.biersorte || b.bierstil}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Vorschau aus DB */}
                {bierDbId && eanResult?.bier?.bildUrl && (
                    <div style={{ background: C.card, borderRadius: 12, padding: 14, border: `1px solid ${C.bd}`, marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
                        <img src={eanResult.bier.bildUrl} style={{ width: 60, height: 60, objectFit: "cover" as const, borderRadius: 8 }} alt="" />
                        <div>
                            <div style={{ fontSize: 11, color: C.ac, fontWeight: 700, marginBottom: 4 }}>AUS DATENBANK</div>
                            {eanResult.bier.geruch && <div style={{ fontSize: 12, color: C.txD }}>👃 {eanResult.bier.geruch}</div>}
                            {eanResult.bier.trinktemperatur && <div style={{ fontSize: 12, color: C.txD }}>🌡️ {eanResult.bier.trinktemperatur}</div>}
                            {eanResult.bier.glastyp && <div style={{ fontSize: 12, color: C.txD }}>🥂 {eanResult.bier.glastyp}</div>}
                        </div>
                    </div>
                )}

                {/* Brauerei */}
                <Input label="Brauerei" placeholder="z.B. Augustiner München" value={brauerei} onChange={(e: any) => setBrauerei(e.target.value)} />

                {/* Biersorte */}
                <SL>Biersorte</SL>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, marginBottom: 6 }}>
                    {BEER_TYPES.map(s => <Chip key={s} label={s} active={sorte === s} onClick={() => setSorte(sorte === s ? "" : s)} />)}
                </div>

                {/* Sterne */}
                <SL>Gesamtbewertung *</SL>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4,5].map(s => (
                        <span key={s}
                              onClick={() => setSterne(s)}
                              onMouseEnter={() => setHovSterne(s)}
                              onMouseLeave={() => setHovSterne(0)}
                              style={{ fontSize: 36, color: (hovSterne || sterne) >= s ? C.ac : C.bd, cursor: "pointer", transition: "all .15s", userSelect: "none" as const }}>★</span>
                    ))}
                </div>

                {/* Geschmacksprofil */}
                <SL>Geschmacksprofil</SL>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {GESCHMACK.map(g => <Chip key={g} label={g} active={geschmack.includes(g)} onClick={() => toggle(geschmack, setGeschmack, g)} />)}
                </div>

                {/* Mundgefühl */}
                <SL>Mundgefühl</SL>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {MUND.map(m => <Chip key={m} label={m} active={mund === m} onClick={() => setMund(mund === m ? "" : m)} />)}
                </div>

                {/* Kohlensäure */}
                <SL>Kohlensäure</SL>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {CO2.map(k => <Chip key={k} label={k} active={co2 === k} onClick={() => setCo2(co2 === k ? "" : k)} />)}
                </div>

                {/* Farbe */}
                <SL>Farbe / Optik</SL>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {FARBEN.map(f => <Chip key={f} label={f} active={farbe === f} onClick={() => setFarbe(farbe === f ? "" : f)} />)}
                </div>

                {/* Preis-Leistung */}
                <SL>Preis-Leistung</SL>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {PREIS.map(p => <Chip key={p} label={p} active={preis === p} onClick={() => setPreis(preis === p ? "" : p)} />)}
                </div>

                {/* Nochmal kaufen */}
                <SL>Nochmal kaufen?</SL>
                <div style={{ display: "flex", gap: 8 }}>
                    {NOCHMAL.map(n => <Chip key={n.v} label={n.l} active={nochmal === n.v} onClick={() => setNochmal(nochmal === n.v ? "" : n.v)} />)}
                </div>

                {/* Notizen */}
                <div style={{ marginTop: 20, marginBottom: 14 }}>
                    <SL>Notizen</SL>
                    <textarea
                        placeholder="Geschmack, Besonderheiten, Erinnerungen…"
                        value={notizen}
                        onChange={e => setNotizen(e.target.value)}
                        rows={3}
                        style={{ width: "100%", padding: "11px 14px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 14, outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const, fontFamily: "inherit" }}
                    />
                </div>

                {/* Fehler */}
                {error && (
                    <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 14, background: "#C0392B20", border: `1px solid ${C.danger}40`, color: "#e74c3c", fontSize: 13 }}>
                        {error}
                    </div>
                )}

                {/* Speichern */}
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
