import { useState } from "react";
import { auth as authApi } from "../services/api.js";
import { useAuth } from "../App.jsx";

export default function Login({ onSwitch }) {
  const { login } = useAuth();
  const [form,   setForm]   = useState({ email: "", password: "" });
  const [error,  setError]  = useState("");
  const [loading,setLoading]= useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await authApi.login(form.email, form.password);
      const me = await authApi.me();
      login(me);
    } catch (err) {
      setError(err.message || "Login failed. Check your credentials.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      background: "var(--bg-void)",
      backgroundImage: `
        radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,212,180,0.08) 0%, transparent 65%),
        radial-gradient(ellipse 50% 40% at 90% 100%, rgba(245,200,66,0.06) 0%, transparent 55%)
      `,
    }}>
      <div style={{ width: "100%", maxWidth: 420 }} className="animate-in">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, borderRadius: 18,
            background: "linear-gradient(135deg, var(--teal), var(--gold))",
            fontSize: 32, fontWeight: 800, color: "#06100a",
            fontFamily: "var(--font-display)", marginBottom: 16,
            boxShadow: "0 8px 32px rgba(0,212,180,0.3)",
          }}>S</div>
          <h1 style={{ fontSize: 28, marginBottom: 6 }}>
            Welcome back
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Sign in to your <span style={{ color: "var(--gold)" }}>SafariPay</span> account
          </p>
        </div>

        {/* Card */}
        <div className="card">
          {error && (
            <div style={{
              background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)",
              borderRadius: "var(--radius-sm)", padding: "12px 14px", marginBottom: 20,
              color: "var(--coral)", fontSize: 13, display: "flex", alignItems: "center", gap: 8,
            }}>
              <i className="bi bi-exclamation-triangle-fill" /> {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email" required placeholder="you@example.com"
                value={form.email}
                onChange={e => set("email", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password" required placeholder="••••••••"
                value={form.password}
                onChange={e => set("password", e.target.value)}
              />
            </div>

            <button
              type="submit" className="btn btn-gold btn-lg"
              style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
              disabled={loading}
            >
              {loading ? <><i className="bi bi-arrow-repeat" style={{ animation: "spin 1s linear infinite" }} /> Signing in…</> : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 24, color: "var(--text-secondary)", fontSize: 14 }}>
          New to SafariPay?{" "}
          <button
            onClick={onSwitch}
            style={{ background: "none", border: "none", color: "var(--teal)", cursor: "pointer", fontWeight: 600, fontSize: 14 }}
          >
            Create account
          </button>
        </p>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}