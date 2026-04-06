import { useState } from "react";
import { auth as authApi } from "../services/api.js";
import { useAuth } from "../App.jsx";

export default function Register({ onSwitch }) {
  const { login } = useAuth();
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", password: "", password2: "",
  });
  const [error,  setError]  = useState("");
  const [loading,setLoading]= useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(""); 
    if (form.password !== form.password2) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await authApi.register(form);
      await authApi.login(form.email, form.password);
      const me = await authApi.me();
      login(me);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      background: "var(--bg-void)",
      backgroundImage: `
        radial-gradient(ellipse 70% 50% at 30% 0%, rgba(245,200,66,0.06) 0%, transparent 60%),
        radial-gradient(ellipse 60% 40% at 80% 100%, rgba(0,212,180,0.07) 0%, transparent 55%)
      `,
    }}>
      <div style={{ width: "100%", maxWidth: 460 }} className="animate-in">
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 60, height: 60, borderRadius: 16,
            background: "linear-gradient(135deg, var(--gold), var(--teal))",
            fontSize: 28, fontWeight: 800, color: "#06100a",
            fontFamily: "var(--font-display)", marginBottom: 14,
          }}>S</div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>Join SafariPay</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Your intelligent <span style={{ color: "var(--teal)" }}>African financial platform</span>
          </p>
        </div>

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

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" required placeholder="Amara"
                  value={form.first_name} onChange={e => set("first_name", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" required placeholder="Osei"
                  value={form.last_name} onChange={e => set("last_name", e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" required placeholder="you@example.com"
                value={form.email} onChange={e => set("email", e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input className="form-input" placeholder="+254 7XX XXX XXX"
                value={form.phone} onChange={e => set("phone", e.target.value)} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" required placeholder="min. 8 chars"
                  value={form.password} onChange={e => set("password", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm</label>
                <input className="form-input" type="password" required placeholder="repeat"
                  value={form.password2} onChange={e => set("password2", e.target.value)} />
              </div>
            </div>

            <div style={{
              background: "var(--teal-glow)", border: "1px solid var(--border-teal)",
              borderRadius: "var(--radius-sm)", padding: "10px 14px",
              color: "var(--text-secondary)", fontSize: 12,
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <i className="bi bi-shield-check" style={{ color: "var(--teal)", marginTop: 1 }} />
              A KES wallet is automatically created for you. More currencies can be added later.
            </div>

            <button type="submit" className="btn btn-teal btn-lg"
              style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
              disabled={loading}>
              {loading ? "Creating account…" : "Create Account — It's Free"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, color: "var(--text-secondary)", fontSize: 14 }}>
          Already have an account?{" "}
          <button onClick={onSwitch}
            style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}