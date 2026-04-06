import { useState, useEffect } from "react";
import { savings as savingsApi, wallets as walletsApi } from "../services/api.js";

const SYM = { KES: "KSh", USD: "$", EUR: "€", GBP: "£", UGX: "USh", TZS: "TSh", NGN: "₦", GHS: "₵" };

const EMOJIS = ["🎯", "🏠", "✈️", "🎓", "💼", "🏥", "🚗", "💍", "📱", "🌱", "🏋️", "🎉"];

export default function SavingsPage() {
  const [goals,   setGoals]   = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // "create"|"deposit"
  const [selected,setSelected]= useState(null);
  const [form,    setForm]    = useState({});
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState("");
  const [err,     setErr]     = useState("");

  const load = () => {
    Promise.all([savingsApi.list(), walletsApi.list()])
      .then(([g, w]) => { setGoals(g.results ?? g ?? []); setWallets(w); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openCreate = () => {
    setForm({
      wallet: wallets.find(w => w.is_primary)?.ref ?? "",
      emoji: "🎯", name: "", target_amount: "", auto_save: false,
      frequency: "M", auto_amount: "", is_locked: false,
    });
    setErr(""); setMsg(""); setModal("create");
  };

  const openDeposit = (goal) => {
    setSelected(goal);
    setForm({ goal: goal.ref, amount: "" });
    setErr(""); setModal("deposit");
  };

  const doCreate = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      await savingsApi.create(form);
      setMsg("Savings goal created! 🎯"); setModal(null); load();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const doDeposit = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await savingsApi.deposit(form);
      setMsg(r.message || "Saved!"); setModal(null); load();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const totalSaved = goals.reduce((acc, g) => acc + parseFloat(g.current || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>Savings Goals</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Automated, goal-based savings with AI recommendations
          </p>
        </div>
        <button className="btn btn-gold" onClick={openCreate}>
          <i className="bi bi-plus-lg" /> New Goal
        </button>
      </div>

      {msg && (
        <div style={{ background: "var(--teal-glow)", border: "1px solid var(--border-teal)", borderRadius: "var(--radius-sm)", padding: "12px 16px", color: "var(--teal)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <i className="bi bi-check-circle-fill" /> {msg}
        </div>
      )}

      {/* Total savings banner */}
      {goals.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, var(--bg-card), var(--bg-raised))",
          border: "1px solid var(--border-teal)", borderRadius: "var(--radius-xl)",
          padding: "24px 28px", display: "flex", alignItems: "center", gap: 24,
          boxShadow: "var(--shadow-teal)",
        }}>
          <div style={{ fontSize: 36 }}>🐖</div>
          <div>
            <div style={{ color: "var(--text-secondary)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
              Total Saved Across All Goals
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 34, color: "var(--teal)" }}>
              KSh {totalSaved.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{goals.length}</div>
            <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Active Goal{goals.length !== 1 ? "s" : ""}</div>
          </div>
        </div>
      )}

      {/* Goals grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 200, borderRadius: "var(--radius-lg)" }} />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
          <h3 style={{ marginBottom: 8 }}>Start saving today</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24, maxWidth: 340, margin: "0 auto 24px" }}>
            Set a goal — school fees, a new phone, emergency fund — and SafariPay will help you get there automatically.
          </p>
          <button className="btn btn-gold" onClick={openCreate} style={{ margin: "0 auto" }}>
            <i className="bi bi-plus-lg" /> Create First Goal
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {goals.map(goal => {
            const sym = SYM[goal.currency] || goal.currency;
            const achieved = Boolean(goal.achieved_at);
            return (
              <div key={goal.ref} className={`card ${achieved ? "card-gold" : ""}`} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 28 }}>{goal.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{goal.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {goal.is_locked ? <><i className="bi bi-lock-fill" style={{ color: "var(--gold)" }} /> Locked</> : "Flexible"}
                        {goal.auto_save && <> · Auto-save</>}
                      </div>
                    </div>
                  </div>
                  {achieved && <span className="badge badge-gold"><i className="bi bi-trophy-fill" /> Done!</span>}
                </div>

                {/* Amounts */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                    <span style={{ color: "var(--teal)", fontWeight: 700, fontFamily: "var(--font-display)" }}>
                      {sym} {Number(goal.current).toLocaleString()}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                      of {sym} {Number(goal.target).toLocaleString()}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${goal.progress}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                    <span>{goal.progress}% reached</span>
                    {goal.target_date && (
                      <span>🗓 {new Date(goal.target_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
                    )}
                  </div>
                </div>

                {/* Action */}
                {!achieved && (
                  <button className="btn btn-teal btn-sm" onClick={() => openDeposit(goal)} style={{ alignSelf: "flex-start" }}>
                    <i className="bi bi-plus-circle" /> Save to this goal
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", zIndex: 201 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18 }}>{modal === "create" ? "New Savings Goal" : "Deposit to Goal"}</h2>
              <button className="btn btn-ghost" onClick={() => setModal(null)}><i className="bi bi-x-lg" /></button>
            </div>
            {err && (
              <div style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 16, color: "var(--coral)", fontSize: 13 }}>
                {err}
              </div>
            )}

            {modal === "create" && (
              <form onSubmit={doCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Emoji picker */}
                <div className="form-group">
                  <label className="form-label">Choose Icon</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {EMOJIS.map(em => (
                      <button key={em} type="button" onClick={() => set("emoji", em)} style={{
                        width: 40, height: 40, borderRadius: "var(--radius-sm)", fontSize: 20,
                        border: `2px solid ${form.emoji === em ? "var(--gold)" : "var(--border)"}`,
                        background: form.emoji === em ? "var(--gold-subtle)" : "var(--bg-deep)",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all var(--transition)",
                      }}>{em}</button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Goal Name</label>
                  <input className="form-input" required placeholder="e.g. Emergency Fund, MacBook Pro…" onChange={e => set("name", e.target.value)} />
                </div>

                <div className="form-group">
                  <label className="form-label">Wallet</label>
                  <select className="form-input" required value={form.wallet || ""} onChange={e => set("wallet", e.target.value)}>
                    <option value="" disabled>Select wallet</option>
                    {wallets.map(w => <option key={w.ref} value={w.ref}>{w.currency} — Balance: {SYM[w.currency]}{Number(w.balance).toLocaleString()}</option>)}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Target Amount</label>
                    <input className="form-input" type="number" step="0.01" min="1" required placeholder="50000" onChange={e => set("target_amount", e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Target Date</label>
                    <input className="form-input" type="date" onChange={e => set("target_date", e.target.value)} />
                  </div>
                </div>

                {/* Auto-save toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-deep)", borderRadius: "var(--radius-sm)", padding: "12px 14px", border: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Automatic Savings</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Automatically deduct on schedule</div>
                  </div>
                  <button type="button" onClick={() => set("auto_save", !form.auto_save)} style={{
                    width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                    background: form.auto_save ? "var(--teal)" : "var(--bg-raised)",
                    position: "relative", transition: "background var(--transition)",
                  }}>
                    <div style={{
                      position: "absolute", top: 2, left: form.auto_save ? 22 : 2, width: 20, height: 20,
                      borderRadius: "50%", background: "#fff", transition: "left var(--transition)",
                    }} />
                  </button>
                </div>

                {form.auto_save && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Frequency</label>
                      <select className="form-input" value={form.frequency} onChange={e => set("frequency", e.target.value)}>
                        <option value="D">Daily</option>
                        <option value="W">Weekly</option>
                        <option value="M">Monthly</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Amount Each Time</label>
                      <input className="form-input" type="number" step="0.01" min="1" placeholder="500" onChange={e => set("auto_amount", e.target.value)} />
                    </div>
                  </div>
                )}

                {/* Lock toggle */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gold-subtle)", border: "1px solid var(--border-gold)", borderRadius: "var(--radius-sm)", padding: "12px 14px", cursor: "pointer" }}
                  onClick={() => set("is_locked", !form.is_locked)}>
                  <input type="checkbox" checked={form.is_locked} readOnly style={{ accentColor: "var(--gold)", width: 16, height: 16 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>🔒 Lock this goal</div>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Prevent early withdrawal until the target is reached</div>
                  </div>
                </div>

                <button type="submit" className="btn btn-gold" style={{ justifyContent: "center" }} disabled={busy}>
                  {busy ? "Creating…" : "Create Savings Goal"}
                </button>
              </form>
            )}

            {modal === "deposit" && selected && (
              <form onSubmit={doDeposit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "var(--bg-deep)", borderRadius: "var(--radius-sm)", padding: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>{selected.emoji}</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{selected.name}</div>
                  <div style={{ color: "var(--teal)", fontSize: 13 }}>
                    {selected.progress}% complete · {SYM[selected.currency]}{Number(selected.current).toLocaleString()} saved
                  </div>
                  <div className="progress-track" style={{ margin: "10px 0 0" }}>
                    <div className="progress-fill" style={{ width: `${selected.progress}%` }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount to Save ({selected.currency})</label>
                  <input className="form-input" type="number" step="0.01" min="1" required
                    placeholder={`Remaining: ${SYM[selected.currency]}${(parseFloat(selected.target) - parseFloat(selected.current)).toLocaleString()}`}
                    onChange={e => set("amount", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Transaction PIN</label>
                  <input className="form-input" type="password" maxLength={4} required placeholder="••••" onChange={e => set("pin", e.target.value)} />
                </div>
                <button type="submit" className="btn btn-teal" style={{ justifyContent: "center" }} disabled={busy}>
                  {busy ? "Saving…" : "Confirm Deposit 🎯"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}