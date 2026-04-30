"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", inviteCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Fehler bei der Registrierung");
      setLoading(false);
    } else {
      router.push("/login?registered=1");
    }
  };

  const inputStyle = {
    width: "100%", padding: "14px 16px",
    background: "#1A1710", border: "1px solid #2E2820",
    borderRadius: 12, color: "#EDE5D0", fontSize: 15, outline: "none",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(170deg, #0E0C07 0%, #1a1208 100%)", padding: 16,
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48 }}>🍺</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#C8963E", fontFamily: "Georgia, serif" }}>
            Registrieren
          </h1>
          <p style={{ color: "#8A7D66", fontSize: 13, marginTop: 4 }}>
            Du brauchst einen Einladungscode
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {[
            { key: "inviteCode", label: "Einladungscode", type: "text", placeholder: "BIER-XXXXXX" },
            { key: "name", label: "Dein Name", type: "text", placeholder: "Max Mustermann" },
            { key: "email", label: "E-Mail", type: "email", placeholder: "max@beispiel.de" },
            { key: "password", label: "Passwort", type: "password", placeholder: "Mind. 8 Zeichen" },
          ].map((f) => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                required
                style={inputStyle}
              />
            </div>
          ))}

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 14,
              background: "rgba(192,57,43,0.15)", border: "1px solid rgba(192,57,43,0.3)",
              color: "#e74c3c", fontSize: 13,
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: 16, marginTop: 6,
            background: "linear-gradient(135deg, #C8963E, #8B6A2F)",
            color: "#0E0C07", border: "none", borderRadius: 12,
            fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
          }}>
            {loading ? "Registrieren…" : "Konto erstellen"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link href="/login" style={{ color: "#8A7D66", fontSize: 14 }}>
            ← Zurück zum Login
          </Link>
        </div>
      </div>
    </div>
  );
}
