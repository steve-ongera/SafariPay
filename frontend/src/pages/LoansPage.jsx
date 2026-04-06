import { useState, useEffect } from "react";
import { loans as loansApi, wallets as walletsApi } from "../services/api.js";

const STATUS_META = {
  PENDING:   { color: "#f5c842", bg: "var(--gold-subtle)",   icon: "bi-clock",             label: "Under Review" },
  APPROVED:  { color: "#00d4b4", bg: "var(--teal-glow)",     icon: "bi-check-circle",      label: "Approved" },
  ACTIVE:    { color: "#00d4b4", bg: "var(--teal-glow)",     icon: "bi-activity",          label: "Active" },
  REPAID:    { color: "#4caf50", bg: "rgba(76,175,80,0.1)",  icon: "bi-check2-all",        label: "Fully Repaid" },
  DEFAULTED: { color: "#ff6b6b", bg: "rgba(255,107,107,0.1)",icon: "bi-exclamation-circle",label: "Defaulted" },
  REJECTED:  { color: "#8a9fc2", bg: "rgba(138,159,194,0.1)",icon: "bi-x-circle",          label: "Rejected" },
};

const SYM = { KES:"KSh",USD:"$",EUR:"€",GBP:"£",UGX:"USh",TZS:"TSh",NGN:"₦",GHS:"₵" };

export default function LoansPage() {
  const [list,     setList]     = useState([]);
  const [wallets,  setWallets]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // "apply"|"repay"
  const [selected, setSelected] = useState(null); // loan for repay
  const [form,     setForm]     = useState({});
  const [busy,     setBusy]     = useState(false);
  const [msg,      setMsg]      = useState("");
  const [err,      setErr]      = useState("");

  const load = () => {
    Promise.all([loansApi.list(), walletsApi.list()])
      .then(([l, w]) => { setList(l.results ?? l ?? []); setWallets(w); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openApply = () => {
    setForm({ wallet: wallets.find(w => w.is_primary)?.ref ?? "", duration_days: 30, purpose: "" });
    setErr(""); setMsg(""); setModal("apply");
  };

  const openRepay = (loan) => {
    setSelected(loan);
    setForm({ loan: loan.ref, amount: "" });
    setErr(""); setModal("repay");
  };

  const doApply = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await loansApi.apply(form);
      setMsg(r.message || "Application submitted!"); setModal(null); load();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const doRepay = async e => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await loansApi.repay(form);
      setMsg(`${r.message} Outstanding: ${r.outstanding}`);
      setModal(null); load();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const activeLoan = list.find(l => l.status === "ACTIVE" || l.status === "APPROVED");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>Micro-Loans</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            AI-powered instant credit — no paperwork required
          </p>
        </div>
        {!activeLoan && (
          <button className="btn btn-gold" onClick={openApply}>
            <i className="bi bi-bank" /> Apply for Loan
          </button>
        )}
      </div>

      {msg && (
        <div style={{ background: "var(--teal-glow)", border: "1px solid var(--border-teal)", borderRadius: "var(--radius-sm)", padding: "12px 16px", color: "var(--teal)", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
          <i className="bi bi-check-circle-fill" /> {msg}
        </div>
      )}

      {/* Credit score teaser */}
      <div style={{
        background: "linear-gradient(135deg, rgba(245,200,66,0.06) 0%, rgba(0,212,180,0.04) 100%)",
        border: "1px solid var(--border-gold)", borderRadius: "var(--radius-lg)",
        padding: "20px 24px", display: "flex", alignItems: "center", gap: 20,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "conic-gradient(var(--gold) 0% 65%, var(--bg-raised) 65% 100%)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative",
        }}>
          <div style={{
            position: "absolute", inset: 6, borderRadius: "50%", background: "var(--bg-card)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "var(--gold)",
          }}>AI</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>Your Credit Health</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Based on your transaction history and repayment behavior. Make regular deposits and repay loans on time to improve your score.
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--gold)" }}>
            Good
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Credit Standing</div>
        </div>
      </div>

      {/* Loan list */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[1, 2].map(i => <div key={i} className="shimmer" style={{ height: 140, borderRadius: "var(--radius-lg)" }} />)}
        </div>
      ) : list.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "56px 24px" }}>
          <i className="bi bi-bank" style={{ fontSize: 40, color: "var(--text-muted)", display: "block", marginBottom: 16 }} />
          <h3 style={{ marginBottom: 8 }}>No loan history yet</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
            Apply for your first micro-loan. Instant decision, competitive rates.
          </p>
          <button className="btn btn-gold" onClick={openApply} style={{ margin: "0 auto" }}>
            <i className="bi bi-bank" /> Apply Now
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {list.map(loan => {
            const meta   = STATUS_META[loan.status] || STATUS_META.PENDING;
            const sym    = SYM[loan.currency] || loan.currency;
            const progress = loan.principal > 0
              ? Math.round((1 - (parseFloat(loan.outstanding) / parseFloat(loan.principal))) * 100)
              : 100;

            return (
              <div key={loan.ref} className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                        {loan.ref}
                      </span>
                      <span style={{ padding: "2px 10px", borderRadius: "100px", fontSize: 11, fontWeight: 600, background: meta.bg, color: meta.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <i className={`bi ${meta.icon}`} /> {meta.label}
                      </span>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26 }}>
                      {sym} {Number(loan.principal).toLocaleString()}
                    </div>
                    <div style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
                      {loan.interest_rate} · {loan.duration_days} days
                      {loan.due_date && ` · Due ${new Date(loan.due_date).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`}
                    </div>
                  </div>

                  {(loan.status === "ACTIVE") && (
                    <button className="btn btn-teal btn-sm" onClick={() => openRepay(loan)}>
                      <i className="bi bi-arrow-up-circle" /> Repay
                    </button>
                  )}
                </div>

                {/* Repayment progress */}
                {(loan.status === "ACTIVE" || loan.status === "REPAID") && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                      <span>Repayment Progress</span>
                      <span style={{ color: "var(--teal)", fontWeight: 600 }}>
                        {sym} {Number(loan.outstanding).toLocaleString()} remaining
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                      {progress}% repaid
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* HOW IT WORKS */}
      <div className="card card-teal" style={{ marginTop: 8 }}>
        <h3 style={{ fontSize: 15, marginBottom: 16 }}><i className="bi bi-info-circle" style={{ color: "var(--teal)", marginRight: 8 }} />How SafariPay Micro-Loans Work</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          {[
            { icon: "bi-cpu", title: "AI Scoring", text: "Your transaction history determines your limit and rate — no paperwork." },
            { icon: "bi-lightning-charge-fill", title: "Instant Decision", text: "Get approved in seconds based on your SafariPay activity." },
            { icon: "bi-graph-up-arrow", title: "Build Credit", text: "Repaying on time boosts your score and unlocks better rates." },
          ].map(it => (
            <div key={it.title} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <i className={`bi ${it.icon}`} style={{ color: "var(--teal)", fontSize: 20 }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>{it.title}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>{it.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ width: "100%", maxWidth: 440, zIndex: 201 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18 }}>{modal === "apply" ? "Apply for Micro-Loan" : "Repay Loan"}</h2>
              <button className="btn btn-ghost" onClick={() => setModal(null)}><i className="bi bi-x-lg" /></button>
            </div>
            {err && (
              <div style={{ background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 16, color: "var(--coral)", fontSize: 13 }}>
                {err}
              </div>
            )}

            {modal === "apply" && (
              <form onSubmit={doApply} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Wallet to credit</label>
                  <select className="form-input" required value={form.wallet || ""} onChange={e => set("wallet", e.target.value)}>
                    <option value="" disabled>Select wallet</option>
                    {wallets.map(w => (
                      <option key={w.ref} value={w.ref}>{w.currency} — {SYM[w.currency]}{Number(w.balance).toLocaleString()}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input className="form-input" type="number" step="0.01" min="100" max="500000" required placeholder="e.g. 5000" onChange={e => set("amount", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Duration (days)</label>
                  <select className="form-input" value={form.duration_days} onChange={e => set("duration_days", parseInt(e.target.value))}>
                    {[7, 14, 30, 60, 90, 180].map(d => <option key={d} value={d}>{d} days</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Purpose</label>
                  <input className="form-input" required placeholder="e.g. Stock for business, school fees…" onChange={e => set("purpose", e.target.value)} />
                </div>
                <div style={{ background: "var(--gold-subtle)", border: "1px solid var(--border-gold)", borderRadius: "var(--radius-sm)", padding: "10px 14px", color: "var(--text-secondary)", fontSize: 12 }}>
                  <i className="bi bi-shield-check" style={{ color: "var(--gold)", marginRight: 6 }} />
                  Your rate is calculated after submission based on your credit profile. Funds are credited to your wallet immediately upon approval.
                </div>
                <button type="submit" className="btn btn-gold" style={{ justifyContent: "center" }} disabled={busy}>
                  {busy ? "Submitting…" : "Submit Application"}
                </button>
              </form>
            )}

            {modal === "repay" && selected && (
              <form onSubmit={doRepay} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "var(--bg-deep)", borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Outstanding Balance</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--coral)" }}>
                    {SYM[selected.currency]}{Number(selected.outstanding).toLocaleString()}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Repayment Amount</label>
                  <input className="form-input" type="number" step="0.01" min="1" required placeholder={`Max: ${selected.outstanding}`} onChange={e => set("amount", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Transaction PIN</label>
                  <input className="form-input" type="password" maxLength={4} required placeholder="••••" onChange={e => set("pin", e.target.value)} />
                </div>
                <button type="submit" className="btn btn-teal" style={{ justifyContent: "center" }} disabled={busy}>
                  {busy ? "Processing…" : "Confirm Repayment"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}