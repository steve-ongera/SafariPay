import { useState, useEffect, useRef } from "react";
import { wallets as walletsApi } from "../services/api.js";
import { useToast } from "../App.jsx";

const SYM = { KES:"KSh", USD:"$", EUR:"€", GBP:"£", UGX:"USh", TZS:"TSh", NGN:"₦", GHS:"₵" };

const FEES = (amount) => {
  const a = parseFloat(amount) || 0;
  if (a <= 0)      return 0;
  if (a <= 100)    return 0;
  if (a <= 1000)   return 5;
  if (a <= 5000)   return 15;
  if (a <= 20000)  return 35;
  if (a <= 100000) return 60;
  return 100;
};

// Recent/favourite contacts — would come from API in production
const RECENT = [
  { name: "Wanjiku M.", id: "SP4A2C8D1E9F3B", initials: "WM", color: "var(--teal)" },
  { name: "Osei Kwame", id: "SP8B1D4F2A7C3E", initials: "OK", color: "var(--gold)" },
  { name: "Amara D.",   id: "SP3E9C2D6A1F4B", initials: "AD", color: "var(--purple)" },
  { name: "Chidi N.",   id: "SPAC72D49E1F38", initials: "CN", color: "var(--coral)" },
];

const STEPS = ["Recipient", "Amount & Note", "Confirm & PIN"];

export default function SendPage() {
  const toast = useToast();
  const [step,    setStep]   = useState(0);
  const [wallets, setWallets]= useState([]);
  const [form,    setForm]   = useState({
    from_wallet: "", to_identifier: "", amount: "", pin: "", description: "",
  });
  const [resolved, setResolved] = useState(null); // { name, id }
  const [busy,     setBusy]    = useState(false);
  const [done,     setDone]    = useState(false);
  const pinRef = useRef(null);

  useEffect(() => {
    walletsApi.list().then(w => {
      setWallets(w);
      const primary = w.find(x => x.is_primary);
      if (primary) setForm(f => ({ ...f, from_wallet: primary.ref }));
    }).catch(console.error);
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectContact = (c) => {
    set("to_identifier", c.id);
    setResolved(c);
  };

  const srcWallet = wallets.find(w => w.ref === form.from_wallet);
  const fee       = FEES(form.amount);
  const total     = (parseFloat(form.amount) || 0) + fee;
  const sym       = SYM[srcWallet?.currency] || "KSh";

  const goNext = () => {
    if (step === 0 && !form.to_identifier) { toast("Enter a recipient", "warning"); return; }
    if (step === 1 && (!form.amount || parseFloat(form.amount) <= 0)) { toast("Enter a valid amount", "warning"); return; }
    if (step === 1 && parseFloat(form.amount) > parseFloat(srcWallet?.balance || 0)) { toast("Insufficient balance", "error"); return; }
    setStep(s => s + 1);
    if (step === 1) setTimeout(() => pinRef.current?.focus(), 100);
  };

  const submit = async () => {
    if (form.pin.length !== 4) { toast("Enter your 4-digit PIN", "warning"); return; }
    setBusy(true);
    try {
      await walletsApi.send(form);
      setDone(true);
      toast("Transfer sent successfully! 🎉", "success");
    } catch (ex) {
      toast(ex.message || "Transfer failed", "error");
    } finally { setBusy(false); }
  };

  const reset = () => {
    setDone(false); setStep(0); setResolved(null);
    setForm(f => ({ ...f, to_identifier: "", amount: "", pin: "", description: "" }));
  };

  // ── Success screen ──
  if (done) {
    return (
      <div className="send-shell animate-scale-in" style={{ maxWidth: 480, margin: "40px auto", textAlign: "center" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "var(--teal-glow)", border: "2px solid var(--teal-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, margin: "0 auto 20px",
            animation: "pulse-teal 2s infinite",
          }}>✓</div>
          <h1 style={{ fontSize: 26, marginBottom: 8 }}>Money Sent! 🎉</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            {sym} {Number(form.amount).toLocaleString()} was sent successfully
          </p>
        </div>

        <div className="card" style={{ textAlign: "left", marginBottom: 24 }}>
          <Row label="To"       val={resolved?.name || form.to_identifier} />
          <Row label="Amount"   val={`${sym} ${Number(form.amount).toLocaleString()}`} />
          <Row label="Fee"      val={fee > 0 ? `${sym} ${fee}` : "Free"} />
          <Row label="Total"    val={`${sym} ${total.toLocaleString()}`} last />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-teal btn-lg" onClick={reset}>Send Again</button>
          <button className="btn btn-outline btn-lg" onClick={reset}>Done</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="animate-in">
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>Send Money</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 24 }}>
          Instant transfers · Lower fees than M-Pesa
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: i < step ? "var(--teal)" : i === step ? "var(--gold)" : "var(--bg-raised)",
              border: `2px solid ${i < step ? "var(--teal)" : i === step ? "var(--gold)" : "var(--border)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700,
              color: i <= step ? "#050c18" : "var(--text-muted)",
              flexShrink: 0, transition: "all 0.3s",
            }}>
              {i < step ? <i className="bi bi-check" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: "0 4px",
                background: i < step ? "var(--teal)" : "var(--bg-raised)",
                transition: "background 0.3s",
              }} />
            )}
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 20, textAlign: "center" }}>
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </p>

      {/* ── STEP 0: Recipient ── */}
      {step === 0 && (
        <div className="card animate-in" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div className="form-label" style={{ marginBottom: 10 }}>From Wallet</div>
            <select className="form-select" value={form.from_wallet} onChange={e => set("from_wallet", e.target.value)}>
              {wallets.map(w => (
                <option key={w.ref} value={w.ref}>
                  {w.currency} — {SYM[w.currency]}{Number(w.balance).toLocaleString()} {w.is_primary ? "(Primary)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Recipient — SafariPay ID, phone, or wallet ref</label>
            <input
              className="form-input"
              placeholder="SP... or +254 7XX XXX XXX"
              value={form.to_identifier}
              onChange={e => { set("to_identifier", e.target.value); setResolved(null); }}
            />
          </div>

          {resolved && (
            <div className="recipient-pill animate-in-fast">
              <div className="recipient-avatar" style={{ background: `${resolved.color}22`, color: resolved.color }}>
                {resolved.initials}
              </div>
              <span style={{ flex: 1, fontWeight: 600 }}>{resolved.name}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                {resolved.id.slice(0, 10)}…
              </span>
              <button className="btn btn-ghost btn-xs" onClick={() => { setResolved(null); set("to_identifier", ""); }}>
                <i className="bi bi-x" />
              </button>
            </div>
          )}

          {/* Recent contacts */}
          <div>
            <div className="form-label" style={{ marginBottom: 10 }}>Recent Contacts</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {RECENT.map(c => (
                <button
                  key={c.id}
                  onClick={() => selectContact(c)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                    padding: "10px 14px",
                    border: `1px solid ${form.to_identifier === c.id ? "var(--teal-border)" : "var(--border)"}`,
                    background: form.to_identifier === c.id ? "var(--teal-subtle)" : "var(--bg-deep)",
                    borderRadius: "var(--r-md)", cursor: "pointer",
                    transition: "all var(--duration-fast)", minWidth: 70,
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: `${c.color}20`, color: c.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 12,
                  }}>{c.initials}</div>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {c.name.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-gold w-full" onClick={goNext} style={{ justifyContent: "center" }}>
            Continue <i className="bi bi-arrow-right" />
          </button>
        </div>
      )}

      {/* ── STEP 1: Amount ── */}
      {step === 1 && (
        <div className="card animate-in" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {resolved && (
            <div className="recipient-pill">
              <div className="recipient-avatar" style={{ background: `${resolved.color}22`, color: resolved.color }}>
                {resolved.initials}
              </div>
              <span style={{ fontWeight: 600 }}>{resolved.name}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Amount ({srcWallet?.currency || "KES"})</label>
            <div className="amount-wrap">
              <span className="amount-prefix">{sym}</span>
              <input
                className="form-input amount-input"
                type="number" step="0.01" min="1"
                placeholder="0.00" autoFocus
                value={form.amount}
                onChange={e => set("amount", e.target.value)}
              />
            </div>
            {srcWallet && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                Available: <span style={{ color: "var(--teal)" }}>{sym} {Number(srcWallet.balance).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Quick amount chips */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {[100, 500, 1000, 2000, 5000].map(a => (
              <button key={a} className={`chip ${form.amount == a ? "active" : ""}`}
                onClick={() => set("amount", String(a))}>
                {sym} {a.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Note (optional)</label>
            <input className="form-input" placeholder="What's it for? Rent, lunch, biz…"
              value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          {/* Fee breakdown */}
          {parseFloat(form.amount) > 0 && (
            <div className="animate-in-fast" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="fee-row">
                <span className="fee-label">Amount</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600 }}>{sym} {Number(form.amount).toLocaleString()}</span>
              </div>
              <div className="fee-row">
                <span className="fee-label">SafariPay Fee</span>
                <span className="fee-value">{fee === 0 ? "FREE" : `${sym} ${fee}`}</span>
              </div>
              <div className="fee-row" style={{ borderTop: "1px solid var(--border)", marginTop: 2, paddingTop: 10 }}>
                <span style={{ fontWeight: 700 }}>Total Deducted</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--text-primary)", fontSize: 16 }}>
                  {sym} {total.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-outline" onClick={() => setStep(0)}>
              <i className="bi bi-arrow-left" /> Back
            </button>
            <button className="btn btn-gold flex-1" style={{ justifyContent: "center" }} onClick={goNext}>
              Review <i className="bi bi-arrow-right" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Confirm ── */}
      {step === 2 && (
        <div className="card animate-in" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>You're sending</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 36, color: "var(--gold)", letterSpacing: "-1px" }}>
              {sym} {Number(form.amount).toLocaleString()}
            </div>
            {fee > 0 && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>+ {sym} {fee} fee</div>}
          </div>

          <div style={{ background: "var(--bg-deep)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
            <Row label="To"         val={resolved?.name || form.to_identifier} />
            <Row label="ID / Ref"   val={(form.to_identifier.slice(0, 14) + "…")} mono />
            <Row label="From"       val={`${srcWallet?.currency} Wallet`} />
            {form.description && <Row label="Note" val={form.description} />}
            <Row label="Fee"        val={fee === 0 ? "Free ✓" : `${sym} ${fee}`} />
            <Row label="Total"      val={`${sym} ${total.toLocaleString()}`} last bold />
          </div>

          <div className="form-group">
            <label className="form-label">Transaction PIN</label>
            <input
              ref={pinRef}
              className="form-input pin-input"
              type="password" maxLength={4} inputMode="numeric"
              placeholder="• • • •"
              value={form.pin}
              onChange={e => set("pin", e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>

          <div className="alert alert-gold">
            <i className="bi bi-shield-lock-fill" />
            <span>This transfer is instant and irreversible. Double-check the recipient before confirming.</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-outline" onClick={() => setStep(1)}>
              <i className="bi bi-arrow-left" /> Back
            </button>
            <button className="btn btn-gold flex-1" style={{ justifyContent: "center" }}
              onClick={submit} disabled={busy || form.pin.length < 4}>
              {busy
                ? <><i className="bi bi-arrow-repeat spin" /> Sending…</>
                : <><i className="bi bi-send-fill" /> Confirm & Send</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, val, last, bold, mono }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "11px 14px",
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</span>
      <span style={{
        fontSize: 13.5,
        fontWeight: bold ? 800 : 500,
        color: bold ? "var(--gold)" : "var(--text-primary)",
        fontFamily: mono ? "var(--font-mono)" : "inherit",
      }}>{val}</span>
    </div>
  );
}