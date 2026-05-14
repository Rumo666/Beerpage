"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

const C = {
    bg: "#0E0C07", card: "#1A1710", input: "#141208",
    ac: "#C8963E", acDim: "#8B6A2F", acGlow: "rgba(200,150,62,0.12)",
    tx: "#EDE5D0", txD: "#8A7D66", txM: "#5A5040",
    bd: "#2E2820", danger: "#C0392B",
};

const AVATAR_EMOJIS = ["🧔","👨","👩","🧑","👩‍🦰","👨‍🦱","🧑‍🍳","👷","🤠","🎅","🧙","🦸","👮","🕵️","👩‍🚀","🥷","🍺","🍻","🎩","🧢"];

export default function ProfilPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [user, setUser] = useState<any>(null);
    const [bewertungen, setBewertungen] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Edit-State
    const [editName, setEditName] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");
    const [error, setError] = useState("");

    // Passwort ändern
    const [showPwChange, setShowPwChange] = useState(false);
    const [altPw, setAltPw] = useState("");
    const [neuesPw, setNeuesPw] = useState("");
    const [pwSaving, setPwSaving] = useState(false);
    const [pwError, setPwError] = useState("");

    // Benachrichtigungen
    const [notifSettings, setNotifSettings] = useState({
        kommentare: true, prost: true, rezepte: true, wiki: true, admin: true,
    });

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    useEffect(() => {
        if (status !== "authenticated") return;
        fetch("/api/profil")
            .then(r => r.json())
            .then(d => {
                setUser(d.user);
                setBewertungen(d.bewertungen || []);
                setStats(d.stats);
                setEditName(d.user?.name || "");
                if (d.user?.benachrichtigungen) setNotifSettings(d.user.benachrichtigungen);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [status]);

    const handleAvatarUpload = async (files: FileList | null) => {
        if (!files?.[0]) return;
        setUploadLoading(true);
        const formData = new FormData();
        formData.append("file", files[0]);
        try {
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok && data.url) {
                await saveProfile({ image: data.url });
                setUser((prev: any) => ({ ...prev, image: data.url }));
            }
        } catch {}
        setUploadLoading(false);
        setShowAvatarPicker(false);
    };

    const handleEmojiAvatar = async (emoji: string) => {
        await saveProfile({ image: emoji });
        setUser((prev: any) => ({ ...prev, image: emoji }));
        setShowAvatarPicker(false);
    };

    const saveProfile = async (data: any) => {
        setSaving(true);
        setError("");
        try {
            const res = await fetch("/api/profil", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                const updated = await res.json();
                setUser(updated.user);
                setEditName(updated.user?.name || "");
                setSuccessMsg("Gespeichert!");
                await update();
                setTimeout(() => setSuccessMsg(""), 2000);
                setEditMode(false);
            } else {
                const d = await res.json();
                setError(d.error || "Fehler");
            }
        } catch { setError("Netzwerkfehler"); }
        setSaving(false);
    };

    const handlePasswordChange = async () => {
        if (!altPw || !neuesPw) return;
        if (neuesPw.length < 8) { setPwError("Mindestens 8 Zeichen"); return; }
        setPwSaving(true);
        setPwError("");
        const res = await fetch("/api/profil/passwort", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ altPasswort: altPw, neuesPasswort: neuesPw }),
        });
        if (res.ok) {
            setAltPw(""); setNeuesPw("");
            setShowPwChange(false);
            setSuccessMsg("Passwort geändert!");
            setTimeout(() => setSuccessMsg(""), 2000);
        } else {
            const d = await res.json();
            setPwError(d.error || "Fehler");
        }
        setPwSaving(false);
    };

    const isEmoji = (str: string) => str && !str.startsWith("/") && !str.startsWith("http");

    if (loading) return <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ color: C.ac, fontSize: 32 }}>🍺</div></div>;

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.tx, fontFamily: "system-ui, sans-serif", paddingBottom: 80 }}>

            {/* Header */}
            <div style={{ background: C.card, borderBottom: `1px solid ${C.bd}`, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky" as const, top: 0, zIndex: 50 }}>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: C.ac, margin: 0 }}>👤 Profil</h1>
                <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ background: "none", border: `1px solid ${C.bd}`, borderRadius: 8, color: C.txD, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>Logout</button>
            </div>

            <div style={{ padding: 16 }}>

                {/* Erfolgs-Meldung */}
                {successMsg && (
                    <div style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 12, background: "#27AE6020", border: "1px solid #27AE6050", color: "#27AE60", fontSize: 13, textAlign: "center" as const }}>
                        ✅ {successMsg}
                    </div>
                )}

                {/* Avatar + Name */}
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: 20, marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>

                        {/* Avatar */}
                        <div style={{ position: "relative" as const }}>
                            <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", border: `2px solid ${C.ac}40`, background: C.acGlow, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {user?.image && !isEmoji(user.image)
                                    ? <img src={user.image} style={{ width: "100%", height: "100%", objectFit: "cover" as const }} alt="" />
                                    : <span style={{ fontSize: 36 }}>{user?.image || "🍺"}</span>
                                }
                            </div>
                            <button onClick={() => setShowAvatarPicker(p => !p)} style={{
                                position: "absolute" as const, bottom: -2, right: -2, width: 26, height: 26,
                                borderRadius: "50%", background: C.ac, border: `2px solid ${C.bg}`,
                                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12,
                            }}>📷</button>
                        </div>

                        {/* Name + Rolle */}
                        <div style={{ flex: 1 }}>
                            {editMode ? (
                                <input value={editName} onChange={e => setEditName(e.target.value)}
                                       style={{ width: "100%", padding: "8px 12px", background: C.input, border: `1px solid ${C.ac}`, borderRadius: 8, color: C.tx, fontSize: 16, outline: "none", fontWeight: 700 }} />
                            ) : (
                                <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 800, color: C.tx }}>{user?.name}</div>
                            )}
                            <div style={{ fontSize: 11, marginTop: 4 }}>
                                <span style={{ padding: "2px 10px", borderRadius: 10, background: user?.rolle === "ADMIN" ? C.acGlow : C.bd, color: user?.rolle === "ADMIN" ? C.ac : C.txD, fontWeight: 700 }}>
                                    {user?.rolle === "ADMIN" ? "👑 Admin" : "Mitglied"}
                                </span>
                            </div>
                            <div style={{ fontSize: 11, color: C.txM, marginTop: 4 }}>{user?.email}</div>
                        </div>
                    </div>

                    {/* Avatar Picker */}
                    {showAvatarPicker && (
                        <div style={{ background: C.input, borderRadius: 10, border: `1px solid ${C.bd}`, padding: 14, marginBottom: 14 }}>
                            <div style={{ fontSize: 11, color: C.txD, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 10 }}>Avatar ändern</div>
                            <button onClick={() => fileInputRef.current?.click()} style={{
                                width: "100%", padding: 10, marginBottom: 10,
                                background: "transparent", border: `1.5px dashed ${C.ac}`,
                                borderRadius: 8, color: C.ac, fontSize: 13, fontWeight: 600, cursor: "pointer",
                            }}>
                                {uploadLoading ? "⏳ Hochladen…" : "📁 Eigenes Bild hochladen"}
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={e => handleAvatarUpload(e.target.files)} style={{ display: "none" }} />
                            <div style={{ fontSize: 11, color: C.txM, marginBottom: 8 }}>oder Emoji wählen:</div>
                            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                                {AVATAR_EMOJIS.map(e => (
                                    <button key={e} onClick={() => handleEmojiAvatar(e)} style={{
                                        width: 40, height: 40, borderRadius: 8, fontSize: 20,
                                        background: user?.image === e ? C.acGlow : C.bg,
                                        border: `1.5px solid ${user?.image === e ? C.ac : C.bd}`,
                                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>{e}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Edit Buttons */}
                    {editMode ? (
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => saveProfile({ name: editName })} disabled={saving} style={{ flex: 1, padding: 12, background: C.ac, color: C.bg, border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
                                {saving ? "Speichern…" : "💾 Speichern"}
                            </button>
                            <button onClick={() => { setEditMode(false); setEditName(user?.name || ""); }} style={{ padding: "12px 16px", background: "transparent", color: C.txD, border: `1px solid ${C.bd}`, borderRadius: 10, cursor: "pointer" }}>
                                Abbrechen
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setEditMode(true)} style={{ width: "100%", padding: 10, background: "transparent", border: `1px solid ${C.bd}`, borderRadius: 10, color: C.txD, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                            ✎ Name bearbeiten
                        </button>
                    )}
                    {error && <div style={{ marginTop: 8, fontSize: 12, color: C.danger }}>{error}</div>}
                </div>

                {/* Statistiken */}
                {stats && (
                    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 12 }}>
                        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700, color: C.ac, margin: "0 0 12px", textTransform: "uppercase" as const, letterSpacing: 1 }}>📊 Statistiken</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                            {[
                                ["🍺", stats.anzahlBewertungen, "Bewertungen", "/feed?user=me"],
                                ["⭐", stats.avgSterne ? stats.avgSterne.toFixed(1) : "–", "Ø Sterne", null],
                                ["🍻", stats.prostGegeben, "Prost!", "/profil/prost"],
                                ["💬", stats.kommentare, "Kommentare", "/profil/kommentare"],
                                ["🥇", stats.lieblingsSorte || "–", "Top Sorte", stats.lieblingsSorte ? `/katalog?sorte=${encodeURIComponent(stats.lieblingsSorte || "")}` : null],
                                ["🌍", stats.laender, "Länder", "/weltkarte"],
                            ].map(([icon, val, label, link]) => (
                                <div key={label as string}
                                     onClick={() => link && router.push(link as string)}
                                     style={{
                                         textAlign: "center" as const, background: C.input, borderRadius: 10,
                                         padding: "12px 8px", border: `1px solid ${C.bd}`,
                                         cursor: link ? "pointer" : "default",
                                         transition: "border-color .2s",
                                     }}
                                     onMouseEnter={e => { if (link) e.currentTarget.style.borderColor = C.ac; }}
                                     onMouseLeave={e => { if (link) e.currentTarget.style.borderColor = C.bd; }}>
                                    <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>
                                    <div style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 800, color: link ? C.ac : C.tx }}>{val}</div>
                                    <div style={{ fontSize: 10, color: C.txM }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Passwort ändern */}
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 12 }}>
                    <button onClick={() => setShowPwChange(p => !p)} style={{ width: "100%", background: "none", border: "none", color: C.txD, cursor: "pointer", fontSize: 14, fontWeight: 600, textAlign: "left" as const, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        🔒 Passwort ändern <span>{showPwChange ? "▲" : "▼"}</span>
                    </button>
                    {showPwChange && (
                        <div style={{ marginTop: 14 }}>
                            {[
                                { label: "Aktuelles Passwort", val: altPw, set: setAltPw },
                                { label: "Neues Passwort (min. 8 Zeichen)", val: neuesPw, set: setNeuesPw },
                            ].map(({ label, val, set }) => (
                                <div key={label} style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 11, color: C.txD, marginBottom: 5 }}>{label}</div>
                                    <input type="password" value={val} onChange={e => set(e.target.value)}
                                           style={{ width: "100%", padding: "10px 12px", background: C.input, border: `1px solid ${C.bd}`, borderRadius: 8, color: C.tx, fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
                                </div>
                            ))}
                            {pwError && <div style={{ fontSize: 12, color: C.danger, marginBottom: 8 }}>{pwError}</div>}
                            <button onClick={handlePasswordChange} disabled={pwSaving} style={{ width: "100%", padding: 12, background: C.ac, color: C.bg, border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
                                {pwSaving ? "Speichern…" : "Passwort ändern"}
                            </button>
                        </div>
                    )}
                </div>

                {/* Benachrichtigungen */}
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 12 }}>
                    <h3 style={{ fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700, color: C.ac, margin: "0 0 12px", textTransform: "uppercase" as const, letterSpacing: 1 }}>🔔 Benachrichtigungen</h3>
                    {[
                        { key: "kommentare", label: "Kommentare auf meine Bewertungen" },
                        { key: "prost", label: "Prost! auf meine Bewertungen" },
                        { key: "rezepte", label: "Neue Rezepte" },
                        { key: "wiki", label: "Neue Wiki-Artikel" },
                        { key: "admin", label: "Admin-Nachrichten" },
                    ].map(({ key, label }) => (
                        <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.bd}` }}>
                            <span style={{ fontSize: 13, color: C.tx }}>{label}</span>
                            <button onClick={async () => {
                                const updated = { ...notifSettings, [key]: !notifSettings[key as keyof typeof notifSettings] };
                                setNotifSettings(updated);
                                await fetch("/api/profil", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ benachrichtigungen: updated }) });
                            }} style={{
                                width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", transition: "background .2s",
                                background: notifSettings[key as keyof typeof notifSettings] ? C.ac : C.bd,
                                position: "relative" as const,
                            }}>
                                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute" as const, top: 3, transition: "left .2s", left: notifSettings[key as keyof typeof notifSettings] ? 23 : 3 }} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Eigene Bewertungen */}
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.bd}`, padding: 16, marginBottom: 12 }}>
                    <h3 style={{ fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700, color: C.ac, margin: "0 0 12px", textTransform: "uppercase" as const, letterSpacing: 1 }}>
                        🍺 Meine Bewertungen ({bewertungen.length})
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                        {bewertungen.slice(0, 10).map((b: any) => (
                            <div key={b.id} onClick={() => router.push(`/bier/${b.id}`)}
                                 style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.bd}`, cursor: "pointer", background: C.input }}
                                 onMouseEnter={e => (e.currentTarget.style.borderColor = C.acDim)}
                                 onMouseLeave={e => (e.currentTarget.style.borderColor = C.bd)}>
                                {b.bildUrls?.[0] && (
                                    <img src={b.bildUrls[0]} style={{ width: 36, height: 48, objectFit: "contain" as const, borderRadius: 6, background: C.bg }} alt="" />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{b.name}</div>
                                    <div style={{ fontSize: 11, color: C.txD }}>{b.sorte} · {new Date(b.createdAt).toLocaleDateString("de-DE")}</div>
                                </div>
                                <div style={{ fontSize: 14, color: C.ac, letterSpacing: 1, flexShrink: 0 }}>
                                    {"★".repeat(b.sterne)}
                                </div>
                            </div>
                        ))}
                        {bewertungen.length > 10 && (
                            <div style={{ textAlign: "center" as const, fontSize: 12, color: C.txM, padding: "4px 0" }}>+ {bewertungen.length - 10} weitere</div>
                        )}
                    </div>
                </div>

                {/* Danger Zone */}
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.danger}30`, padding: 16 }}>
                    <h3 style={{ fontFamily: "Georgia, serif", fontSize: 13, fontWeight: 700, color: C.danger, margin: "0 0 12px", textTransform: "uppercase" as const, letterSpacing: 1 }}>⚠️ Konto</h3>
                    <button onClick={() => signOut({ callbackUrl: "/login" })} style={{ width: "100%", padding: 12, background: "transparent", border: `1px solid ${C.danger}40`, borderRadius: 10, color: C.danger, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                        🚪 Abmelden
                    </button>
                </div>
            </div>

            {/* Bottom Nav */}
            <nav style={{ position: "fixed" as const, bottom: 0, left: 0, right: 0, background: C.card + "f5", borderTop: `1px solid ${C.bd}`, display: "flex", justifyContent: "space-around", padding: "8px 0 16px", backdropFilter: "blur(16px)" }}>
                {[
                    { icon: "🏠", label: "Feed", path: "/feed" },
                    { icon: "🗄️", label: "Katalog", path: "/katalog" },
                    { icon: "🔍", label: "Suche", path: "/suche" },
                    { icon: "🏆", label: "Rangliste", path: "/rangliste" },
                    { icon: "👤", label: "Profil", path: "/profil" },
                ].map(item => (
                    <button key={item.path} onClick={() => router.push(item.path)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2, padding: "4px 12px", color: item.path === "/profil" ? C.ac : C.txM, fontSize: 10 }}>
                        <span style={{ fontSize: 20 }}>{item.icon}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}