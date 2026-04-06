import { useState, useEffect } from "react";
import { auth as authApi } from "../services/api.js";
import { useAuth } from "../App.jsx";

const TIER_META = {
  BASIC:    { color: "var(--text-secondary)", label: "Basic",    icon: "bi-person",          desc: "KYC Level 0 — limited features" },
  STANDARD: { color: "var(--teal)",           label: "Standard", icon: "bi-person-check",    desc: "KYC Level 1 — most features unlocked" },
  PREMIUM:  { color: "var(--gold)",           label: "Premium",  icon: "bi-person-badge",    desc: "KYC Level 2 — full access" },
  BUSINESS: { color: "#a78bfa",               label: "Business", icon: "bi-building",        desc: "Business account — all features + API" },
};

const KYC_LABELS = ["Not Verified", "Basic Verified", "Standard Verified", "Fully Verified"];

export default function ProfilePage() {
  const { user: ctxUser, logout } = useAuth();
  const [profile, setProfile] = useState(ctxUser);
  const [editMode,setEditMode]= useState(false);
  const [form,    setForm]    = useState({});
  const [pinForm, setPinForm] = useState({ pin: "", pin2: "", current: "" });
  const [section, setSection] = useState("profile"); // "profile"|"pin"|"security"
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState("");
  const [err,     setErr]     = useState("");

  useEffect(() => {
    authApi.me().then(setProfile).catch(console.error);
  }, []);

  const set    = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setPin = (k, v) => setPinForm(f => ({ ...f, [k]: v }));

  const startEdit = () => {
    const [first, ...rest] = (profile.name || "").split(" ");
    setForm({ first_name: first, last_name: rest.join(" "), phone: profile.phone || "", display_name: profile.display_name || "" });
    setErr(""); setMsg(""); setEditMode(true);
  };

  const saveProfile = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const updated = await authApi.updateMe(form);
      setProfile(updated); setEditMode(false); setMsg("Profile updated successfully.");
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const savePin = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      await authApi.setPin(pinForm);
      setPinForm({ pin: "", pin2: "", current: "" });
      setMsg("Transaction PIN updated."); setSection("profile");
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const tier = TIER_META[profile?.tier] || TIER_META.BASIC;
  const kyc  = KYC_LABELS[profile?.kyc_level ?? 0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 640 }}>
      <div>
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>Profile & Settings</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Manage your account and security</p>
      </div>

      {msg && (
        <div style={{ background: "var(--teal-glow)", border: "1px solid var(--border-teal)", borderRadius: "var(--radius-sm)", padding: "12px 16px", color: "var(--teal)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <i className="bi bi-check-circle-fill" /> {msg}
        </div>
      )}
      {err && (
        <div style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: "var(--radius-sm)", padding: "12px 16px", color: "var(--coral)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <i className="bi bi-exclamation-triangle-fill" /> {err}
        </div>
      )}

      {/* Profile card */}
      <div className="card card-gold">
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, var(--teal), var(--gold))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "#06100a",
          }}>
            {(profile?.display_name || profile?.name || "U")[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700 }}>
              {profile?.display_name || profile?.name || "—"}
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
              {profile?.email}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ padding: "3px 10px", borderRadius: "100px", fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.05)", color: tier.color, border: `1px solid ${tier.color}33`, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <i className={`bi ${tier.icon}`} /> {tier.label}
              </span>
              <span className="badge badge-muted">
                <i className="bi bi-shield-check" /> {kyc}
              </span>
            </div>
          </div>
          {!editMode && (
            <button className="btn btn-outline btn-sm" onClick={startEdit}>
              <i className="bi bi-pencil" /> Edit
            </button>
          )}
        </div>

        {/* Public ID */}
        <div style={{ background: "var(--bg-deep)", borderRadius: "var(--radius-sm)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 2 }}>Your SafariPay ID</div>
            <div style={{ fontFamily: "monospace", fontSize: 13, color: "var(--gold)" }}>{profile?.public_id}</div>
          </div>
          <button className="btn btn-ghost btn-sm" title="Copy ID" onClick={() => { navigator.clipboard.writeText(profile?.public_id || ""); setMsg("ID copied!"); }}>
            <i className="bi bi-copy" />
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: "flex", gap: 4, background: "var(--bg-card)", borderRadius: "var(--radius-md)", padding: 4, border: "1px solid var(--border)" }}>
        {[
          { key: "profile",  label: "Personal Info",  icon: "bi-person" },
          { key: "pin",      label: "Transaction PIN", icon: "bi-shield-lock" },
          { key: "security", label: "Security",        icon: "bi-lock" },
        ].map(t => (
          <button key={t.key} onClick={() => { setSection(t.key); setEditMode(false); setErr(""); setMsg(""); }} style={{
            flex: 1, padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
            background: section === t.key ? "var(--bg-raised)" : "transparent",
            color: section === t.key ? "var(--text-primary)" : "var(--text-muted)",
            fontFamily: "var(--font-body)", fontSize: 13, fontWeight: section === t.key ? 600 : 400,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "all var(--transition)",
          }}>
            <i className={`bi ${t.icon}`} /> {t.label}
          </button>
        ))}
      </div>

      {/* Section: Profile edit */}
      {section === "profile" && (
        <div className="card">
          {!editMode ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <InfoRow label="Full Name"    value={profile?.name || "—"} />
              <InfoRow label="Display Name" value={profile?.display_name || "—"} />
              <InfoRow label="Email"        value={profile?.email || "—"} />
              <InfoRow label="Phone"        value={profile?.phone || "Not set"} />
              <InfoRow label="Member Since" value={profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "—"} />
            </div>
          ) : (
            <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input className="form-input" value={form.first_name || ""} onChange={e => set("first_name", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input className="form-input" value={form.last_name || ""} onChange={e => set("last_name", e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input className="form-input" value={form.display_name || ""} onChange={e => set("display_name", e.target.value)} placeholder="How you appear to others" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone || ""} onChange={e => set("phone", e.target.value)} placeholder="+254 7XX XXX XXX" />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn btn-gold" disabled={busy}>{busy ? "Saving…" : "Save Changes"}</button>
                <button type="button" className="btn btn-outline" onClick={() => setEditMode(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Section: PIN */}
      {section === "pin" && (
        <div className="card">
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, marginBottom: 6 }}>Transaction PIN</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
              Your 4-digit PIN is required to confirm all money transfers, loan repayments, and savings deposits.
            </p>
          </div>
          <form onSubmit={savePin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Current PIN (if already set)</label>
              <input className="form-input" type="password" maxLength={4} placeholder="••••" value={pinForm.current} onChange={e => setPin("current", e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">New PIN</label>
                <input className="form-input" type="password" maxLength={4} required placeholder="••••" value={pinForm.pin} onChange={e => setPin("pin", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm PIN</label>
                <input className="form-input" type="password" maxLength={4} required placeholder="••••" value={pinForm.pin2} onChange={e => setPin("pin2", e.target.value)} />
              </div>
            </div>
            <div style={{ background: "var(--gold-subtle)", border: "1px solid var(--border-gold)", borderRadius: "var(--radius-sm)", padding: "10px 14px", color: "var(--text-secondary)", fontSize: 12 }}>
              <i className="bi bi-shield-fill-check" style={{ color: "var(--gold)", marginRight: 6 }} />
              PIN is hashed with PBKDF2 and never stored in plain text.
            </div>
            <button type="submit" className="btn btn-gold" disabled={busy}>{busy ? "Updating…" : "Set Transaction PIN"}</button>
          </form>
        </div>
      )}

      {/* Section: Security */}
      {section === "security" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 4 }}>Account Security</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
              Your SafariPay account uses military-grade security.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: "bi-key-fill",           color: "var(--gold)",  title: "Password",            sub: "Change via email reset link" },
                { icon: "bi-phone-fill",          color: "var(--teal)",  title: "Two-Factor Auth",     sub: "SMS OTP — coming soon" },
                { icon: "bi-fingerprint",         color: "var(--gold)",  title: "Biometric Login",     sub: "Face ID / fingerprint — coming soon" },
                { icon: "bi-geo-alt-fill",        color: "var(--teal)",  title: "Login Notifications", sub: "Alerts for new device logins" },
              ].map(it => (
                <div key={it.title} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${it.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: it.color, fontSize: 16, flexShrink: 0 }}>
                    <i className={`bi ${it.icon}`} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{it.title}</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{it.sub}</div>
                  </div>
                  <i className="bi bi-chevron-right" style={{ color: "var(--text-muted)", fontSize: 12 }} />
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ border: "1px solid rgba(255,107,107,0.2)", background: "rgba(255,107,107,0.04)" }}>
            <h3 style={{ fontSize: 15, marginBottom: 4, color: "var(--coral)" }}>
              <i className="bi bi-exclamation-triangle" style={{ marginRight: 8 }} />Danger Zone
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
              Signing out will end your current session. Your data and wallets are safe.
            </p>
            <button className="btn btn-outline btn-sm" onClick={logout} style={{ borderColor: "rgba(255,107,107,0.4)", color: "var(--coral)" }}>
              <i className="bi bi-box-arrow-right" /> Sign Out of SafariPay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{value}</span>
    </div>
  );
}