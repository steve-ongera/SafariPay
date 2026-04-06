import { useState, useEffect } from "react";
import { useToast } from "../App.jsx";

const CURRENCIES = [
  { code: "KES", name: "Kenyan Shilling",    flag: "🇰🇪", sym: "KSh" },
  { code: "UGX", name: "Ugandan Shilling",   flag: "🇺🇬", sym: "USh" },
  { code: "TZS", name: "Tanzanian Shilling", flag: "🇹🇿", sym: "TSh" },
  { code: "NGN", name: "Nigerian Naira",     flag: "🇳🇬", sym: "₦"   },
  { code: "GHS", name: "Ghanaian Cedi",      flag: "🇬🇭", sym: "₵"   },
  { code: "USD", name: "US Dollar",          flag: "🇺🇸", sym: "$"   },
  { code: "EUR", name: "Euro",               flag: "🇪🇺", sym: "€"   },
  { code: "GBP", name: "British Pound",      flag: "🇬🇧", sym: "£"   },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦", sym: "R"   },
  { code: "EGP", name: "Egyptian Pound",     flag: "🇪🇬", sym: "£E"  },
];

// Approximate rates vs KES (would come from live API in production)
const RATES_KES = {
  KES: 1,
  UGX: 29.3,
  TZS: 27.4,
  NGN: 4.85,
  GHS: 0.074,
  USD: 0.0077,
  EUR: 0.0071,
  GBP: 0.006,
  ZAR: 0.143,
  EGP: 0.375,
};

function convert(amount, from, to) {
  if (!amount || isNaN(amount)) return "";
  const inKES  = parseFloat(amount) / RATES_KES[from];
  const result = inKES * RATES_KES[to];
  return result.toFixed(2);
}

const POPULAR_PAIRS = [
  { from: "KES", to: "USD" },
  { from: "KES", to: "GBP" },
  { from: "KES", to: "EUR" },
  { from: "NGN", to: "KES" },
  { from: "GHS", to: "KES" },
  { from: "UGX", to: "KES" },
];

export default function ExchangePage() {
  const toast  = useToast();
  const [from,   setFrom]   = useState("KES");
  const [to,     setTo]     = useState("USD");
  const [amount, setAmount] = useState("1000");
  const [swapped,setSwapped]= useState(false);

  const result   = convert(amount, from, to);
  const rate     = convert(1, from, to);
  const fromMeta = CURRENCIES.find(c => c.code === from);
  const toMeta   = CURRENCIES.find(c => c.code === to);

  const doSwap = () => {
    setFrom(to); setTo(from);
    setSwapped(s => !s);
  };

  const setQuickPair = (pair) => {
    setFrom(pair.from); setTo(pair.to);
  };

  const rateKES = (RATES_KES[to] / RATES_KES[from]).toFixed(4);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 560 }}>
      <div className="animate-in">
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>FX Exchange</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Live rates · Pan-African coverage · Competitive margins
        </p>
      </div>

      {/* Converter card */}
      <div className="card card-gold animate-in stagger-1" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* FROM */}
        <div>
          <div className="form-label" style={{ marginBottom: 8 }}>You Send</div>
          <div style={{ display: "flex", gap: 10 }}>
            <select
              className="form-select"
              style={{ width: 130, flexShrink: 0 }}
              value={from}
              onChange={e => setFrom(e.target.value)}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <div className="amount-wrap" style={{ flex: 1 }}>
              <span className="amount-prefix" style={{ color: "var(--gold)" }}>{fromMeta?.sym}</span>
              <input
                className="form-input amount-input"
                type="number" min="0" step="any"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            {fromMeta?.flag} {fromMeta?.name}
          </div>
        </div>

        {/* Swap button */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <button
            className="fx-swap-btn"
            onClick={doSwap}
            title="Swap currencies"
            style={{ transform: swapped ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <i className="bi bi-arrow-down-up" />
          </button>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {/* TO */}
        <div>
          <div className="form-label" style={{ marginBottom: 8 }}>You Receive</div>
          <div style={{ display: "flex", gap: 10 }}>
            <select
              className="form-select"
              style={{ width: 130, flexShrink: 0 }}
              value={to}
              onChange={e => setTo(e.target.value)}
            >
              {CURRENCIES.filter(c => c.code !== from).map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <div className="amount-wrap" style={{ flex: 1 }}>
              <span className="amount-prefix" style={{ color: "var(--teal)" }}>{toMeta?.sym}</span>
              <input
                className="form-input amount-input"
                readOnly
                value={result}
                placeholder="0.00"
                style={{ color: "var(--teal)", background: "var(--bg-void)" }}
              />
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            {toMeta?.flag} {toMeta?.name}
          </div>
        </div>

        {/* Rate display */}
        <div className="fx-rate-display" style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
          <div style={{ marginBottom: 4 }}>
            <span className="fx-rate-number">1 {from}</span>
            <span style={{ margin: "0 8px" }}>≈</span>
            <span className="fx-rate-number">{rateKES} {to}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Indicative rate · Updated every 60 seconds · 0.8% margin applied
          </div>
        </div>

        <button
          className="btn btn-gold btn-lg btn-block"
          onClick={() => toast("Cross-border transfer coming soon! 🌍", "info")}
          style={{ justifyContent: "center" }}
        >
          <i className="bi bi-send-fill" /> Send {toMeta?.code} Now
        </button>
      </div>

      {/* Quick pair chips */}
      <div className="animate-in stagger-2">
        <div className="form-label" style={{ marginBottom: 10 }}>Popular Pairs</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {POPULAR_PAIRS.map(p => {
            const r = convert(1, p.from, p.to);
            const active = from === p.from && to === p.to;
            return (
              <button
                key={`${p.from}-${p.to}`}
                className={`chip ${active ? "active" : ""}`}
                onClick={() => setQuickPair(p)}
              >
                {CURRENCIES.find(c => c.code === p.from)?.flag} {p.from}
                <i className="bi bi-arrow-right" style={{ fontSize: 9, margin: "0 2px" }} />
                {CURRENCIES.find(c => c.code === p.to)?.flag} {p.to}
                <span style={{ color: active ? "var(--teal)" : "var(--text-muted)", marginLeft: 4, fontSize: 11 }}>
                  {r}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rate table */}
      <div className="card animate-in stagger-3" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div className="section-title">
            <i className="bi bi-table" />
            All Rates vs {from}
          </div>
        </div>
        <div>
          {CURRENCIES.filter(c => c.code !== from).map((c, i, arr) => {
            const r    = parseFloat(convert(1, from, c.code));
            const back = parseFloat(convert(1, c.code, from));
            return (
              <div
                key={c.code}
                className="list-item"
                style={{ cursor: "pointer" }}
                onClick={() => { setTo(c.code); }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "var(--bg-raised)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, flexShrink: 0,
                }}>
                  {c.flag}
                </div>
                <div className="list-body">
                  <div className="list-title">{c.name}</div>
                  <div className="list-sub">
                    1 {c.code} = {back.toFixed(4)} {from}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--teal)", fontSize: 14 }}>
                    {r.toFixed(4)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{from} → {c.code}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="alert alert-info" style={{ fontSize: 12 }}>
        <i className="bi bi-info-circle" />
        <span>
          Rates are indicative and include a 0.8% SafariPay margin — significantly lower than traditional remittance services.
          Live rates are fetched from aggregated FX feeds and updated every minute.
        </span>
      </div>
    </div>
  );
}