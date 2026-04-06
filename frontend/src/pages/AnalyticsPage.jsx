import { useState, useEffect } from "react";
import { transactions as txnApi, wallets as walletsApi } from "../services/api.js";

const SYM = { KES:"KSh", USD:"$", EUR:"€", GBP:"£", UGX:"USh", TZS:"TSh", NGN:"₦", GHS:"₵" };

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CATEGORY_COLORS = {
  SEND:        { color: "#ff6b6b", label: "Transfers Out",   icon: "bi-arrow-up-right" },
  RECEIVE:     { color: "#00d4b4", label: "Transfers In",    icon: "bi-arrow-down-left" },
  DEPOSIT:     { color: "#4ade80", label: "Deposits",        icon: "bi-plus-circle" },
  LOAN_CREDIT: { color: "#f5c842", label: "Loan Credit",     icon: "bi-bank" },
  LOAN_DEBIT:  { color: "#fb923c", label: "Loan Repayment",  icon: "bi-bank" },
  SAVINGS_IN:  { color: "#a78bfa", label: "Savings",         icon: "bi-piggy-bank" },
  FEE:         { color: "#8a9fc2", label: "Fees",            icon: "bi-receipt" },
};

export default function AnalyticsPage() {
  const [txns,    setTxns]    = useState([]);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range,   setRange]   = useState("30"); // "7"|"30"|"90"

  useEffect(() => {
    Promise.all([txnApi.list(), walletsApi.list()])
      .then(([t, w]) => { setTxns(t.results ?? t ?? []); setWallets(w); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Derived stats ──
  const completed = txns.filter(t => t.status === "COMPLETED");
  const sent      = completed.filter(t => t.txn_type === "SEND").reduce((s, t) => s + parseFloat(t.amount), 0);
  const received  = completed.filter(t => t.txn_type === "RECEIVE").reduce((s, t) => s + parseFloat(t.amount), 0);
  const fees      = completed.filter(t => t.txn_type === "FEE").reduce((s, t) => s + parseFloat(t.amount), 0);
  const savings   = completed.filter(t => t.txn_type === "SAVINGS_IN").reduce((s, t) => s + parseFloat(t.amount), 0);

  // Category breakdown
  const byType = {};
  completed.forEach(t => {
    if (!byType[t.txn_type]) byType[t.txn_type] = 0;
    byType[t.txn_type] += parseFloat(t.amount);
  });
  const maxCat = Math.max(...Object.values(byType), 1);

  // Monthly activity (last 6 months)
  const now  = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const m = d.getMonth(); const y = d.getFullYear();
    const monthTxns = completed.filter(t => {
      const td = new Date(t.created_at);
      return td.getMonth() === m && td.getFullYear() === y;
    });
    const out = monthTxns.filter(t => ["SEND","LOAN_DEBIT","SAVINGS_IN"].includes(t.txn_type))
                         .reduce((s, t) => s + parseFloat(t.amount), 0);
    const inc = monthTxns.filter(t => ["RECEIVE","DEPOSIT","LOAN_CREDIT"].includes(t.txn_type))
                         .reduce((s, t) => s + parseFloat(t.amount), 0);
    return { label: MONTHS[m], out, inc };
  });
  const maxBar = Math.max(...monthlyData.flatMap(d => [d.out, d.inc]), 1);

  // Top transactions
  const topTxns = [...completed].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 5);

  const primaryWallet = wallets.find(w => w.is_primary);
  const sym = SYM[primaryWallet?.currency] || "KSh";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="animate-in" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>Analytics</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Your financial health at a glance</p>
        </div>
        <div className="filter-chips">
          {[["7","7 Days"],["30","30 Days"],["90","3 Months"]].map(([v,l]) => (
            <button key={v} className={`chip ${range === v ? "active" : ""}`} onClick={() => setRange(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid animate-in stagger-1">
        <StatCard icon="bi-arrow-up-right"     color="var(--coral)"  bg="var(--coral-glow)"
          label="Total Sent"       val={`${sym} ${sent.toLocaleString()}`}        loading={loading} />
        <StatCard icon="bi-arrow-down-left"    color="var(--teal)"   bg="var(--teal-glow)"
          label="Total Received"   val={`${sym} ${received.toLocaleString()}`}     loading={loading} />
        <StatCard icon="bi-piggy-bank-fill"    color="var(--purple)" bg="var(--purple-glow)"
          label="Saved"            val={`${sym} ${savings.toLocaleString()}`}      loading={loading} />
        <StatCard icon="bi-receipt"            color="var(--text-secondary)" bg="rgba(138,159,194,0.1)"
          label="Fees Paid"        val={fees > 0 ? `${sym} ${fees.toFixed(2)}` : "Free"} loading={loading} />
      </div>

      {/* Monthly bar chart */}
      <div className="card animate-in stagger-2">
        <div className="section-header" style={{ marginBottom: 20 }}>
          <div className="section-title">
            <i className="bi bi-bar-chart-line" />
            Monthly Flow
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--teal)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--teal)", display: "inline-block" }} />
              Income
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--coral)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--coral)", display: "inline-block" }} />
              Outgoing
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="shimmer" style={{ height: 36 }} />)}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {monthlyData.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ width: 28, fontSize: 11, color: "var(--text-muted)", textAlign: "right", flexShrink: 0 }}>
                  {d.label}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                  {d.inc > 0 && (
                    <div className="progress-track md">
                      <div className="progress-fill"
                        style={{ width: `${(d.inc / maxBar) * 100}%`, background: "linear-gradient(90deg,var(--teal-dim),var(--teal))" }} />
                    </div>
                  )}
                  {d.out > 0 && (
                    <div className="progress-track md">
                      <div className="progress-fill"
                        style={{ width: `${(d.out / maxBar) * 100}%`, background: "linear-gradient(90deg,var(--coral-dim, #c05555),var(--coral))" }} />
                    </div>
                  )}
                  {d.inc === 0 && d.out === 0 && (
                    <div className="progress-track md" />
                  )}
                </div>
                <div style={{ width: 70, fontSize: 11, color: "var(--text-muted)", textAlign: "right", flexShrink: 0 }}>
                  {sym} {Math.max(d.inc, d.out).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category breakdown */}
      <div className="card animate-in stagger-3">
        <div className="section-header" style={{ marginBottom: 20 }}>
          <div className="section-title"><i className="bi bi-pie-chart" /> By Category</div>
        </div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 28 }} />)}
          </div>
        ) : Object.keys(byType).length === 0 ? (
          <div className="empty-state" style={{ padding: "28px 0" }}>
            <i className="bi bi-inbox empty-icon" />
            <p className="empty-text">No transaction data yet</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {Object.entries(byType)
              .sort(([,a],[,b]) => b - a)
              .map(([type, amt]) => {
                const meta = CATEGORY_COLORS[type] || { color: "var(--text-secondary)", label: type, icon: "bi-circle" };
                const pct  = Math.round((amt / maxCat) * 100);
                return (
                  <div key={type} className="chart-bar-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 6, width: 130, flexShrink: 0 }}>
                      <i className={`bi ${meta.icon}`} style={{ color: meta.color, fontSize: 13 }} />
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="chart-bar-track" style={{ flex: 1 }}>
                      <div className="chart-bar-fill" style={{ width: `${pct}%`, background: meta.color }}>
                        {pct > 15 && <span>{pct}%</span>}
                      </div>
                    </div>
                    <div style={{ width: 90, fontSize: 12, color: "var(--text-secondary)", textAlign: "right", flexShrink: 0, fontFamily: "var(--font-display)", fontWeight: 600 }}>
                      {sym} {amt.toLocaleString()}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Top transactions */}
      <div className="card animate-in stagger-4" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--border)" }}>
          <div className="section-title"><i className="bi bi-star" /> Top Transactions</div>
        </div>
        {loading ? (
          <div style={{ padding: 20 }}>
            {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height: 50, marginBottom: 10 }} />)}
          </div>
        ) : topTxns.length === 0 ? (
          <div className="empty-state"><i className="bi bi-inbox empty-icon" /><p className="empty-text">No transactions yet</p></div>
        ) : (
          topTxns.map((t, i) => {
            const meta = CATEGORY_COLORS[t.txn_type] || { color: "var(--text-secondary)", icon: "bi-circle" };
            const isDebit = ["SEND","LOAN_DEBIT","SAVINGS_IN","FEE"].includes(t.txn_type);
            return (
              <div key={t.ref} className="list-item">
                <div className="list-icon" style={{ background: `${meta.color}18`, color: meta.color }}>
                  <i className={`bi ${meta.icon}`} />
                </div>
                <div className="list-body">
                  <div className="list-title">{t.counterparty_label || t.description || t.txn_type}</div>
                  <div className="list-sub">
                    {new Date(t.created_at).toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"})}
                  </div>
                </div>
                <div className="list-value" style={{ color: isDebit ? "var(--coral)" : "var(--teal)" }}>
                  {isDebit ? "−" : "+"}{sym} {Number(t.amount).toLocaleString()}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* AI insight */}
      <div className="insight-strip animate-in stagger-5">
        <span className="insight-emoji">🤖</span>
        <div className="insight-body">
          <div className="insight-title">AI Insight</div>
          <div className="insight-text">
            {received > sent
              ? `Great job! You received ${sym} ${(received - sent).toLocaleString()} more than you sent this period. Keep saving!`
              : sent > 0
              ? `You sent ${sym} ${(sent - received).toLocaleString()} more than received. Consider setting a savings goal.`
              : "Start transacting to unlock personalized AI financial insights."}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, color, bg, label, val, loading }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: bg, color }}><i className={`bi ${icon}`} /></div>
      <div className="stat-label">{label}</div>
      {loading
        ? <div className="shimmer" style={{ height: 28, width: 120 }} />
        : <div className="stat-value" style={{ fontSize: 20 }}>{val}</div>}
    </div>
  );
}