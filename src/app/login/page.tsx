"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error === "Konto gesperrt"
        ? "Dein Konto wurde gesperrt."
        : "E-Mail oder Passwort falsch.");
      setLoading(false);
    } else {
      router.push("/feed");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(170deg, #0E0C07 0%, #1a1208 100%)", padding: 16,
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🍺</div>
          <h1 style={{
            fontSize: 36, fontWeight: 900, color: "#C8963E",
            fontFamily: "Georgia, serif", letterSpacing: "-0.5px",
          }}>
            BierBuddy
          </h1>
          <p style={{ color: "#8A7D66", fontSize: 14, marginTop: 4 }}>
            Die private Bier-Community
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%", padding: "14px 16px",
                background: "#1A1710", border: "1px solid #2E2820",
                borderRadius: 12, color: "#EDE5D0", fontSize: 15, outline: "none",
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%", padding: "14px 16px",
                background: "#1A1710", border: "1px solid #2E2820",
                borderRadius: 12, color: "#EDE5D0", fontSize: 15, outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 10, marginBottom: 16,
              background: "rgba(192,57,43,0.15)", border: "1px solid rgba(192,57,43,0.3)",
              color: "#e74c3c", fontSize: 13,
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: 16,
            background: "linear-gradient(135deg, #C8963E, #8B6A2F)",
            color: "#0E0C07", border: "none", borderRadius: 12,
            fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "Einloggen…" : "Einloggen"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link href="/register" style={{ color: "#C8963E", fontSize: 14 }}>
            Noch kein Konto? Einladungscode einlösen →
          </Link>
        </div>
      </div>
    </div>
  );
}
