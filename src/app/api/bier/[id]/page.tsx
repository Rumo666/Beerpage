"use client";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

const C = {
    bg: "#0E0C07", card: "#1A1710", input: "#141208",
    ac: "#C8963E", acDim: "#8B6A2F", acGlow: "rgba(200,150,62,0.12)",
    tx: "#EDE5D0", txD: "#8A7D66", txM: "#5A5040",
    bd: "#2E2820", danger: "#C0392B",
};

const GESCHMACK_OPT = ["Bitter","Süß","Malzig","Hopfig","Fruchtig","Würzig","Röstaromen","Sauer"];
const MUND_OPT = ["Leicht","Mittel","Vollmundig","Cremig"];
const CO2_OPT = ["Wenig","Mittel","Stark"];
const FARB_OPT = ["Hellgelb","Gold","Bernstein","Kupfer","Braun","Schwarz"];
const PREIS_OPT = ["Schnäppchen","Fair","Teuer","Überteuert"];
const NOCHMAL_OPT = [{l:"👍 Ja",v:"ja"},{l:"👎 Nein",v:"nein"},{l:"🤷 Vielleicht",v:"vielleicht"}];

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
        <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 12 }}>
            <h3 style={{ fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700, color: C.ac, margin: "0 0 10px", textTransform: "uppercase" as const, letterSpacing: 1 }}>{title}</h3>
            {children}
        </div>
    );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick} style={{ padding: "5px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600, border: `1.5px solid ${active ? C.ac : C.bd}`, background: active ? C.acGlow : "transparent", color: active ? C.ac : C.txD, cursor: "pointer" }}>
            {label}
        </button>
    );
}

export default function BierDetailPage() {
    const { status, data: session } = useSession();
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [bewertung, setBewertung] = useState<any>(null);
    const [dbBier, setDbBier] = useState<any>(null);
    const [kommentare, setKommentare] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [canEdit, setCanEdit] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const [kommentar, setKommentar] = useState("");
    const [sending, setSending] = useState(false);
    const [geprosted, setGeprosted] = useState(false);

    // Edit Bewertung
    const [editMode, setEditMode] = useState(false);
    const [editSterne, setEditSterne] = useState(0);
    const [editNotizen, setEditNotizen] = useState("");
    const [editGeschmack, setEditGeschmack] = useState<string[]>([]);
    const [editMund, setEditMund] = useState("");
    const [editCo2, setEditCo2] = useState("");
    const [editFarbe, setEditFarbe] = useState("");
    const [editPreis, setEditPreis] = useState("");
    const [editNochmal, setEditNochmal] = useState("");
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Edit Kommentar
    const [editKommentarId, setEditKommentarId] = useState<string | null>(null);
    const [editKommentarText, setEditKommentarText] = useState("");
    const [savingKommentar, setSavingKommentar] = useState(false);
    const [deleteKommentarId, setDeleteKommentarId] = useState<string | null>(null);

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    useEffect(() => {
        if (!id || status !== "authenticated") return;
        fetch(`/api/bier/${id}`)
            .then(r => r.json())
            .then(d => {
                setBewertung(d.bewertung);
                setDbBier(d.dbBier);
                setKommentare(d.kommentare || []);
                setGeprosted(d.geprosted || false);
                setCanEdit(d.canEdit || false);
                setIsAdmin(d.isAdmin || false);
                if (d.bewertung) {
                    setEditSterne(d.bewertung.sterne || 0);
                    setEditNotizen(d.bewertung.notizen || "");
                    setEditGeschmack(d.bewertung.geschmack || []);
                    setEditMund(d.bewertung.mundgefuehl || "");
                    setEditCo2(d.bewertung.kohlensaeure || "");
                    setEditFarbe(d.bewertung.farbe || "");
                    setEditPreis(d.bewertung.preis || "");
                    setEditNochmal(d.bewertung.nochmal || "");
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id, status]);

    const handleProst = async () => {
        setGeprosted(p => !p);
        await fetch(`/api/bier/${id}/prost`, { method: "POST" });
    };

    const handleKommentar = async () => {
        if (!kommentar.trim()) return;
        setSending(true);
        const res = await fetch(`/api/bier/${id}/kommentar`, {
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

    const handleSaveBewertung = async () => {
        setSaving(true);
        const res = await fetch(`/api/bier/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sterne: editSterne, notizen: editNotizen, geschmack: editGeschmack, mundgefuehl: editMund, kohlensaeure: editCo2, farbe: editFarbe, preis: editPreis, nochmal: editNochmal }),
        });
        if (res.ok) {
            const updated = await res.json();
            setBewertung((prev: any) => ({ ...prev, ...updated }));
            setEditMode(false);
        }
        setSaving(false);
    };

    const handleDeleteBewertung = async () => {
        setDeleting(true);
        const res = await fetch(`/api/bier/${id}`, { method: "DELETE" });
        if (res.ok) router.push("/feed");
        setDeleting(false);
    };

    const handleSaveKommentar = async (kommentarId: string) => {
        setSavingKommentar(true);
        const res = await fetch(`/api/bier/${id}/kommentar/${kommentarId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: editKommentarText }),
        });
        if (res.ok) {
            const updated = await res.json();
            setKommentare(prev => prev.map(k => k.id === kommentarId ? updated : k));
            setEditKommentarId(null);
        }
        setSavingKommentar(false);
    };

    const handleDeleteKommentar = async (kommentarId: string) => {
        const res = await fetch(`/api/bier/${id}/kommentar/${kommentarId}`, { method: "DELETE" });
        if (res.ok) {
            setKommentare(prev => prev.filter(k => k.id !== kommentarId));
            setDeleteKommentarId(null);
        }
    };

    const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
        set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

    const canEditKommentar = (k: any) => k.user?.id === session?.user?.id || isAdmin;

    if (loading) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.ac, fontSize: 32 }}>🍺</div></div>;

    if (!bewertung) return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" as const, gap: 12 }}>
            <div style={{ fontSize: 48 }}>🍺</div>
            <div style={{ color: C.txD }}>Bewertung nicht gefunden</div>
            <button onClick={() => router.push("/feed")} style={{ color: C.ac, background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>← Zurück</button>
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
                {canEdit && (
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setEditMode(true)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.bd}`, background: "transparent", color: C.txD, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>✎</button>
                        <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.danger}40`, background: "transparent", color: C.danger, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🗑</button>
                    </div>
                )}
            </div>

            <div style={{ padding: 16 }}>

                {/* Bild + Grundinfo */}
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, overflow: "hidden", marginBottom: 12 }}>
                    {b.bildUrls?.[0] && (
                        <div style={{ display: "flex", justifyContent: "center", background: "#0a0807", padding: "20px 0" }}>
                            <img src={b.bildUrls[0]} alt={b.name} style={{ height: 220, maxWidth: "100%", objectFit: "contain" as const }} />
                        </div>
                    )}
                    <div style={{ padding: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.acGlow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{b.user?.image || "🍺"}</div>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{b.user?.name}</div>
                                <div style={{ fontSize: 10, color: C.txM }}>{new Date(b.createdAt).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                            {b.sorte && <span style={{ marginLeft: "auto", fontSize: 11, padding: "3px 10px", borderRadius: 20, background: C.acGlow, color: C.ac, fontWeight: 700 }}>{b.sorte}</span>}
                        </div>
                        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>{b.name}</h2>
                        {b.brauerei && <div style={{ fontSize: 13, color: C.txD, marginBottom: 10 }}>{b.brauerei}</div>}
                        <div style={{ fontSize: 28, letterSpacing: 2, marginBottom: 10 }}>
                            {[1,2,3,4,5].map(st => <span key={st} style={{ color: st <= b.sterne ? C.ac : C.bd }}>★</span>)}
                        </div>
                        <button onClick={handleProst} style={{ width: "100%", padding: "10px", borderRadius: 10, border: `1.5px solid ${geprosted ? C.ac : C.bd}`, background: geprosted ? C.acGlow : "transparent", color: geprosted ? C.ac : C.txD, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                            🍻 {(b._count?.prost || 0) + (geprosted ? 1 : 0)} Prost!
                        </button>
                    </div>
                </div>

                {/* Bewertungsdetails */}
                <Section title="Bewertung">
                    {b.geschmack?.length > 0 && (
                        <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 11, color: C.txD, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 6 }}>Geschmack</div>
                            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5 }}>
                                {b.geschmack.map((g: string) => <span key={g} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 12, background: C.acGlow, color: C.ac, fontWeight: 600 }}>{g}</span>)}
                            </div>
                        </div>
                    )}
                    <InfoRow label="Mundgefühl" value={b.mundgefuehl} />
                    <InfoRow label="Kohlensäure" value={b.kohlensaeure} />
                    <InfoRow label="Farbe" value={b.farbe} />
                    <InfoRow label="Preis-Leistung" value={b.preis} />
                    <InfoRow label="Nochmal kaufen" value={b.nochmal === "ja" ? "👍 Ja" : b.nochmal === "nein" ? "👎 Nein" : b.nochmal === "vielleicht" ? "🤷 Vielleicht" : ""} />
                    {b.notizen && (
                        <div style={{ marginTop: 8, padding: "10px 12px", background: C.input, borderRadius: 10, border: `1px solid ${C.bd}` }}>
                            <div style={{ fontSize: 11, color: C.txD, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }}>Notizen</div>
                            <p style={{ fontSize: 13, color: C.txD, margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>„{b.notizen}"</p>
                        </div>
                    )}
                </Section>

                {/* DB Infos */}
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
                        {db.zutaten && <div style={{ padding: "10px 0" }}><div style={{ fontSize: 12, color: C.txD, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 4 }}>Zutaten</div><div style={{ fontSize: 12, color: C.tx, lineHeight: 1.5 }}>{db.zutaten}</div></div>}
                    </Section>
                )}

                {db?.beschreibung && <Section title="📖 Beschreibung"><p style={{ fontSize: 13, color: C.txD, lineHeight: 1.7, margin: 0 }}>{db.beschreibung}</p></Section>}
                {db?.geschichte && <Section title="🏛️ Geschichte"><p style={{ fontSize: 13, color: C.txD, lineHeight: 1.7, margin: 0 }}>{db.geschichte}</p></Section>}
                {db?.brauereiAdresse && (
                    <Section title="🏭 Brauerei">
                        <InfoRow label="Name" value={db.brauerei || ""} />
                        <InfoRow label="Adresse" value={db.brauereiAdresse || ""} />
                        <InfoRow label="Land" value={db.land || ""} />
                    </Section>
                )}

                {/* Kommentare */}
                <Section title={`💬 Kommentare (${kommentare.length})`}>
                    {kommentare.length === 0 && <div style={{ color: C.txM, fontSize: 13, textAlign: "center" as const, padding: "10px 0" }}>Noch keine Kommentare</div>}
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: 14 }}>
                        {kommentare.map((k: any) => (
                            <div key={k.id} style={{ display: "flex", gap: 8 }}>
                                <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.acGlow, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{k.user?.image || "🍺"}</div>
                                <div style={{ flex: 1, background: C.input, borderRadius: 10, padding: "8px 12px", border: `1px solid ${C.bd}` }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700 }}>{k.user?.name}</span>
                                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                            <span style={{ fontSize: 10, color: C.txM }}>{new Date(k.createdAt).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</span>
                                            {canEditKommentar(k) && (
                                                <>
                                                    <button onClick={() => { setEditKommentarId(k.id); setEditKommentarText(k.text); }} style={{ background: "none", border: "none", color: C.txD, cursor: "pointer", fontSize: 11, padding: "0 4px" }}>✎</button>
                                                    <button onClick={() => setDeleteKommentarId(k.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 11, padding: "0 4px" }}>🗑</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {editKommentarId === k.id ? (
                                        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                                            <input value={editKommentarText} onChange={e => setEditKommentarText(e.target.value)}
                                                   style={{ flex: 1, padding: "6px 10px", background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.tx, fontSize: 13, outline: "none" }} />
                                            <button onClick={() => handleSaveKommentar(k.id)} disabled={savingKommentar} style={{ padding: "6px 10px", background: C.ac, color: C.bg, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✓</button>
                                            <button onClick={() => setEditKommentarId(null)} style={{ padding: "6px 10px", background: "transparent", color: C.txD, border: `1px solid ${C.bd}`, borderRadius: 8, cursor: "pointer", fontSize: 12 }}>✕</button>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 13, color: C.txD }}>{k.text}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <input placeholder="Kommentar schreiben…" value={kommentar} onChange={e => setKommentar(e.target.value)} onKeyDown={e => e.key === "Enter" && handleKommentar()}
                               style={{ flex: 1, padding: "10px 12px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 20, color: C.tx, fontSize: 13, outline: "none" }} />
                        <button onClick={handleKommentar} disabled={sending || !kommentar.trim()}
                                style={{ padding: "10px 16px", background: C.ac, color: C.bg, border: "none", borderRadius: 20, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !kommentar.trim() ? 0.5 : 1 }}>➤</button>
                    </div>
                </Section>
            </div>

            {/* EDIT BEWERTUNG MODAL */}
            {editMode && (
                <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, overflowY: "auto" as const }}>
                    <div style={{ maxWidth: 480, margin: "0 auto", padding: 16, paddingBottom: 40 }}>
                        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.bd}`, padding: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <h2 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: C.ac, margin: 0 }}>Bewertung bearbeiten</h2>
                                <button onClick={() => setEditMode(false)} style={{ background: "none", border: "none", color: C.txD, cursor: "pointer", fontSize: 20 }}>✕</button>
                            </div>
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 11, color: C.txD, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 }}>Sterne</div>
                                <div style={{ display: "flex", gap: 4 }}>
                                    {[1,2,3,4,5].map(s => <span key={s} onClick={() => setEditSterne(s)} style={{ fontSize: 34, color: s <= editSterne ? C.ac : C.bd, cursor: "pointer", userSelect: "none" as const }}>★</span>)}
                                </div>
                            </div>
                            {[
                                { label: "Geschmack", opts: GESCHMACK_OPT, multi: true, val: editGeschmack, set: setEditGeschmack },
                                { label: "Mundgefühl", opts: MUND_OPT, multi: false, val: editMund, set: setEditMund },
                                { label: "Kohlensäure", opts: CO2_OPT, multi: false, val: editCo2, set: setEditCo2 },
                                { label: "Farbe", opts: FARB_OPT, multi: false, val: editFarbe, set: setEditFarbe },
                                { label: "Preis-Leistung", opts: PREIS_OPT, multi: false, val: editPreis, set: setEditPreis },
                            ].map(({ label, opts, multi, val, set }) => (
                                <div key={label} style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 11, color: C.txD, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 }}>{label}</div>
                                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                                        {opts.map((o: string) => (
                                            <Chip key={o} label={o}
                                                  active={multi ? (val as string[]).includes(o) : val === o}
                                                  onClick={() => multi ? toggle(val as string[], set as any, o) : (set as any)(val === o ? "" : o)} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, color: C.txD, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 }}>Nochmal kaufen?</div>
                                <div style={{ display: "flex", gap: 6 }}>
                                    {NOCHMAL_OPT.map(n => <Chip key={n.v} label={n.l} active={editNochmal === n.v} onClick={() => setEditNochmal(editNochmal === n.v ? "" : n.v)} />)}
                                </div>
                            </div>
                            <div style={{ marginBottom: 20 }}>
                                <div style={{ fontSize: 11, color: C.txD, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 }}>Notizen</div>
                                <textarea value={editNotizen} onChange={e => setEditNotizen(e.target.value)} rows={3}
                                          style={{ width: "100%", padding: "10px 12px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 10, color: C.tx, fontSize: 13, outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const, fontFamily: "inherit" }} />
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                                <button onClick={handleSaveBewertung} disabled={saving} style={{ flex: 1, padding: 14, background: `linear-gradient(135deg, ${C.ac}, ${C.acDim})`, color: C.bg, border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                                    {saving ? "Speichern…" : "💾 Speichern"}
                                </button>
                                <button onClick={() => setEditMode(false)} style={{ padding: "14px 20px", background: "transparent", color: C.txD, border: `1px solid ${C.bd}`, borderRadius: 10, cursor: "pointer", fontSize: 14 }}>Abbrechen</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE BEWERTUNG */}
            {showDeleteConfirm && (
                <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.danger}40`, padding: 24, maxWidth: 360, width: "100%" }}>
                        <div style={{ fontSize: 40, textAlign: "center" as const, marginBottom: 12 }}>🗑️</div>
                        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: C.tx, margin: "0 0 8px", textAlign: "center" as const }}>Bewertung löschen?</h3>
                        <p style={{ fontSize: 13, color: C.txD, textAlign: "center" as const, marginBottom: 20, lineHeight: 1.5 }}>
                            Die Bewertung von <strong>{b.name}</strong> wird unwiderruflich gelöscht. Der Katalogeintrag bleibt erhalten.
                        </p>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={handleDeleteBewertung} disabled={deleting} style={{ flex: 1, padding: 12, background: C.danger, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                                {deleting ? "Löschen…" : "Ja, löschen"}
                            </button>
                            <button onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, padding: 12, background: "transparent", color: C.txD, border: `1px solid ${C.bd}`, borderRadius: 10, cursor: "pointer", fontSize: 14 }}>Abbrechen</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE KOMMENTAR */}
            {deleteKommentarId && (
                <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.danger}40`, padding: 24, maxWidth: 320, width: "100%" }}>
                        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: C.tx, margin: "0 0 12px", textAlign: "center" as const }}>Kommentar löschen?</h3>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => handleDeleteKommentar(deleteKommentarId)} style={{ flex: 1, padding: 12, background: C.danger, color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Löschen</button>
                            <button onClick={() => setDeleteKommentarId(null)} style={{ flex: 1, padding: 12, background: "transparent", color: C.txD, border: `1px solid ${C.bd}`, borderRadius: 10, cursor: "pointer", fontSize: 14 }}>Abbrechen</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}