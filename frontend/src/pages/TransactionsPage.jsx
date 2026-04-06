import { useState, useEffect } from "react";
import { transactions as txnApi } from "../services/api.js";

const SYM = { KES:"KSh",USD:"$",EUR:"€",GBP:"£",UGX:"USh",TZS:"TSh",NGN:"₦",GHS:"₵" };
const ICONS = {
  SEND:{icon:"bi-arrow-up-right",color:"#ff6b6b"},RECEIVE:{icon:"bi-arrow-down-left",color:"#00d4b4"},
  DEPOSIT:{icon:"bi-plus-circle",color:"#00d4b4"},WITHDRAW:{icon:"bi-dash-circle",color:"#ff6b6b"},
  LOAN_CREDIT:{icon:"bi-bank",color:"#f5c842"},LOAN_DEBIT:{icon:"bi-bank",color:"#ff6b6b"},
  SAVINGS_IN:{icon:"bi-piggy-bank",color:"#f5c842"},SAVINGS_OUT:{icon:"bi-piggy-bank",color:"#ff6b6b"},
  FEE:{icon:"bi-receipt",color:"#8a9fc2"},REVERSAL:{icon:"bi-arrow-counterclockwise",color:"#8a9fc2"},
};
const DEBIT_TYPES = new Set(["SEND","WITHDRAW","LOAN_DEBIT","SAVINGS_IN","FEE"]);

const STATUS_BADGE = {
  COMPLETED: "badge-teal", PENDING: "badge-gold", FAILED: "badge-red", REVERSED: "badge-muted",
};

export default function TransactionsPage() {
  const [list,   setList]   = useState([]);
  const [loading,setLoading]= useState(true);
  const [filter, setFilter] = useState("");

  const load = (type="") => {
    setLoading(true);
    txnApi.list(type ? { type } : {})
      .then(r => setList(r.results ?? r ?? []))
      .catch(console.error)
      .finally(()=>setLoading(false));
  };

  useEffect(()=>load(), []);

  const onFilter = t => { setFilter(t); load(t); };

  const FILTERS = ["","SEND","RECEIVE","DEPOSIT","LOAN_CREDIT","LOAN_DEBIT","SAVINGS_IN"];
  const FILTER_LABELS = { "":"All","SEND":"Sent","RECEIVE":"Received","DEPOSIT":"Deposits",
    "LOAN_CREDIT":"Loan In","LOAN_DEBIT":"Loan Out","SAVINGS_IN":"Savings" };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <div>
        <h1 style={{fontSize:26,marginBottom:4}}>Transactions</h1>
        <p style={{color:"var(--text-secondary)",fontSize:14}}>Full history of your money movements</p>
      </div>

      {/* Filter chips */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {FILTERS.map(f=>(
          <button key={f} onClick={()=>onFilter(f)} style={{
            padding:"6px 16px",borderRadius:"100px",border:"1px solid",
            borderColor: filter===f?"var(--gold)":"var(--border)",
            background: filter===f?"var(--gold-subtle)":"transparent",
            color: filter===f?"var(--gold)":"var(--text-secondary)",
            fontSize:13,cursor:"pointer",transition:"all var(--transition)",
            fontWeight: filter===f ? 600 : 400,
          }}>{FILTER_LABELS[f]}</button>
        ))}
      </div>

      <div className="card" style={{padding:0,overflow:"hidden"}}>
        {loading ? (
          <div style={{padding:24}}>
            {[1,2,3,4,5].map(i=><div key={i} className="shimmer" style={{height:60,borderRadius:8,marginBottom:10}}/>)}
          </div>
        ) : list.length===0 ? (
          <div style={{padding:"60px 24px",textAlign:"center"}}>
            <i className="bi bi-inbox" style={{fontSize:36,color:"var(--text-muted)",display:"block",marginBottom:12}}/>
            <p style={{color:"var(--text-secondary)",fontSize:14}}>No transactions found.</p>
          </div>
        ) : list.map((txn,idx)=>{
          const meta = ICONS[txn.txn_type]||{icon:"bi-circle",color:"#8a9fc2"};
          const debit = DEBIT_TYPES.has(txn.txn_type);
          return (
            <div key={txn.ref} style={{
              display:"flex",alignItems:"center",gap:16,padding:"16px 20px",
              borderBottom: idx<list.length-1?"1px solid var(--border)":"none",
              transition:"background var(--transition)",
            }}>
              <div style={{width:40,height:40,borderRadius:10,flexShrink:0,background:`${meta.color}15`,display:"flex",alignItems:"center",justifyContent:"center",color:meta.color,fontSize:16}}>
                <i className={`bi ${meta.icon}`}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  {txn.counterparty_label||txn.description||txn.txn_type}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginTop:3}}>
                  <span style={{fontSize:11,color:"var(--text-muted)"}}>
                    {new Date(txn.created_at).toLocaleString("en-KE",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                  </span>
                  <span style={{fontSize:10,fontFamily:"monospace",color:"var(--text-muted)"}}>{txn.ref.slice(0,12)}…</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                <div style={{fontFamily:"var(--font-display)",fontWeight:700,color:debit?"var(--coral)":"var(--teal)",fontSize:15}}>
                  {debit?"−":"+"}{SYM[txn.currency]||txn.currency}{Number(txn.amount).toLocaleString()}
                </div>
                <span className={`badge ${STATUS_BADGE[txn.status]||"badge-muted"}`}>{txn.status}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}