import { useState, useEffect } from "react";
import { useAuth } from "../App.jsx";
import { wallets, transactions } from "../services/api.js";

const CURRENCY_SYMBOLS = { KES: "KSh", USD: "$", EUR: "€", GBP: "£", UGX: "USh", TZS: "TSh", NGN: "₦", GHS: "₵" };

export default function Dashboard() {
  const { user } = useAuth();
  const [wList,  setWList]  = useState([]);
  const [txns,   setTxns]   = useState([]);
  const [loading,setLoading]= useState(true);

  useEffect(() => {
    Promise.all([wallets.list(), transactions.list({ limit: 5 })])
      .then(([w, t]) => { setWList(w); setTxns(t.results ?? t ?? []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalKES = wList.find(w => w.currency === "KES")?.balance ?? "0.00";

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Hero greeting */}
      <div className="animate-in">
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 4 }}>
          {greeting()}, <span style={{ color: "var(--gold)" }}>{user?.display_name?.split(" ")[0] || "there"}</span> 👋
        </p>
        <h1 style={{ fontSize: 30 }}>Your Financial Hub</h1>
      </div>

      {/* Primary balance card */}
      <div style={{
        background: "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-raised) 100%)",
        border: "1px solid var(--border-gold)",
        borderRadius: "var(--radius-xl)",
        padding: "32px",
        position: "relative", overflow: "hidden",
        boxShadow: "var(--shadow-gold)",
        animation: "fadeUp 0.4s ease both 0.05s",
      }}>
        {/* Decorative rings */}
        <div style={{
          position: "absolute", right: -40, top: -40,
          width: 200, height: 200, borderRadius: "50%",
          border: "1px solid rgba(245,200,66,0.1)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", right: -10, top: -10,
          width: 130, height: 130, borderRadius: "50%",
          border: "1px solid rgba(245,200,66,0.07)", pointerEvents: "none",
        }} />

        <div style={{ color: "var(--text-secondary)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          Primary Balance · KES
        </div>
        {loading ? (
          <div className="shimmer" style={{ height: 48, width: 200, borderRadius: 8, marginBottom: 8 }} />
        ) : (
          <div style={{
            fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 800,
            color: "var(--text-primary)", marginBottom: 4, letterSpacing: "-1px",
          }}>
            KSh <span style={{ color: "var(--gold)" }}>{Number(totalKES).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
          <QuickBtn icon="bi-arrow-up-circle-fill"   label="Send"    color="var(--gold)" />
          <QuickBtn icon="bi-arrow-down-circle-fill" label="Receive" color="var(--teal)" />
          <QuickBtn icon="bi-plus-circle-fill"       label="Add Money" color="var(--text-secondary)" />
        </div>
      </div>

      {/* Wallets grid */}
      <section style={{ animation: "fadeUp 0.4s ease both 0.1s" }}>
        <SectionHeader title="My Wallets" icon="bi-wallet2" />
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {[1,2].map(i => <div key={i} className="shimmer" style={{ height: 90, borderRadius: "var(--radius-md)" }} />)}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {wList.map(w => <WalletCard key={w.ref} wallet={w} />)}
          </div>
        )}
      </section>

      {/* Recent transactions */}
      <section style={{ animation: "fadeUp 0.4s ease both 0.15s" }}>
        <SectionHeader title="Recent Activity" icon="bi-clock-history" />
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              {[1,2,3].map(i => (
                <div key={i} className="shimmer" style={{ height: 54, borderRadius: 8, marginBottom: 10 }} />
              ))}
            </div>
          ) : txns.length === 0 ? (
            <EmptyState icon="bi-inbox" text="No transactions yet. Make your first transfer!" />
          ) : (
            txns.map((t, idx) => <TxnRow key={t.ref} txn={t} last={idx === txns.length - 1} />)
          )}
        </div>
      </section>

      {/* AI Insight teaser */}
      <div style={{
        background: "linear-gradient(135deg, rgba(0,212,180,0.06) 0%, rgba(245,200,66,0.04) 100%)",
        border: "1px solid var(--border-teal)",
        borderRadius: "var(--radius-lg)", padding: "20px 24px",
        display: "flex", alignItems: "center", gap: 16,
        animation: "fadeUp 0.4s ease both 0.2s",
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: "var(--teal-glow)", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
        }}>🤖</div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>AI Financial Insight</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            You're spending 23% less than last month. Consider moving KSh 2,000 to your savings goal.
          </div>
        </div>
        <button className="btn btn-teal btn-sm" style={{ marginLeft: "auto", flexShrink: 0 }}>
          View
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ title, icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <i className={`bi ${icon}`} style={{ color: "var(--text-secondary)", fontSize: 15 }} />
      <h2 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h2>
    </div>
  );
}

function WalletCard({ wallet }) {
  const sym = CURRENCY_SYMBOLS[wallet.currency] || wallet.currency;
  return (
    <div className="card" style={{ padding: 18, position: "relative" }}>
      {wallet.is_frozen && (
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          <span className="badge badge-red"><i className="bi bi-snow2" /> Frozen</span>
        </div>
      )}
      <div style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {wallet.currency}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20 }}>
        {sym} {Number(wallet.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </div>
      {wallet.is_primary && (
        <div style={{ marginTop: 8 }}>
          <span className="badge badge-gold">Primary</span>
        </div>
      )}
    </div>
  );
}

const TXN_ICONS = {
  SEND:        { icon: "bi-arrow-up-right",    color: "#ff6b6b" },
  RECEIVE:     { icon: "bi-arrow-down-left",   color: "#00d4b4" },
  DEPOSIT:     { icon: "bi-plus-circle",       color: "#00d4b4" },
  WITHDRAW:    { icon: "bi-dash-circle",       color: "#ff6b6b" },
  LOAN_CREDIT: { icon: "bi-bank",             color: "#f5c842" },
  LOAN_DEBIT:  { icon: "bi-bank",             color: "#ff6b6b" },
  SAVINGS_IN:  { icon: "bi-piggy-bank",       color: "#f5c842" },
  SAVINGS_OUT: { icon: "bi-piggy-bank",       color: "#ff6b6b" },
  FEE:         { icon: "bi-receipt",          color: "#8a9fc2" },
  REVERSAL:    { icon: "bi-arrow-counterclockwise", color: "#8a9fc2" },
};

function TxnRow({ txn, last }) {
  const meta   = TXN_ICONS[txn.txn_type] || { icon: "bi-circle", color: "#8a9fc2" };
  const isDebit= ["SEND","WITHDRAW","LOAN_DEBIT","SAVINGS_IN","FEE"].includes(txn.txn_type);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 20px",
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: `${meta.color}15`, display: "flex", alignItems: "center", justifyContent: "center",
        color: meta.color, fontSize: 16,
      }}>
        <i className={`bi ${meta.icon}`} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {txn.counterparty_label || txn.description || txn.txn_type}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {new Date(txn.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: isDebit ? "var(--coral)" : "var(--teal)", fontSize: 15 }}>
        {isDebit ? "−" : "+"}{CURRENCY_SYMBOLS[txn.currency] || txn.currency} {Number(txn.amount).toLocaleString()}
      </div>
    </div>
  );
}

function QuickBtn({ icon, label, color }) {
  return (
    <button style={{
      background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)", padding: "8px 16px",
      color, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
      fontSize: 13, fontWeight: 600, fontFamily: "var(--font-display)",
      transition: "all var(--transition)",
    }}>
      <i className={`bi ${icon}`} /> {label}
    </button>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ padding: "40px 24px", textAlign: "center" }}>
      <i className={`bi ${icon}`} style={{ fontSize: 32, color: "var(--text-muted)", display: "block", marginBottom: 12 }} />
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{text}</p>
    </div>
  );
}