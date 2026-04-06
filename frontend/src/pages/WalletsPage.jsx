// ═══════════════════════════════════════════════════════════════════════════
// WalletsPage.jsx
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { wallets as walletsApi } from "../services/api.js";

const SYM = { KES:"KSh",USD:"$",EUR:"€",GBP:"£",UGX:"USh",TZS:"TSh",NGN:"₦",GHS:"₵" };

export function WalletsPage() {
  const [list,   setList]   = useState([]);
  const [loading,setLoading]= useState(true);
  const [sending,setSending]= useState(false);
  const [modal,  setModal]  = useState(null); // "send"|"deposit"|"add"
  const [form,   setForm]   = useState({});
  const [msg,    setMsg]    = useState("");
  const [err,    setErr]    = useState("");

  const load = () => walletsApi.list().then(setList).catch(console.error).finally(()=>setLoading(false));
  useEffect(()=>{ load(); },[]);

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const openModal = (type, wallet) => {
    setForm(wallet ? { from_wallet: wallet.ref, currency: wallet.currency } : {});
    setMsg(""); setErr(""); setModal(type);
  };

  const doSend = async e => {
    e.preventDefault(); setSending(true); setErr("");
    try {
      const r = await walletsApi.send(form);
      setMsg(r.message || "Transfer sent!"); setModal(null); load();
    } catch(ex) { setErr(ex.message); } finally { setSending(false); }
  };

  const doDeposit = async e => {
    e.preventDefault(); setSending(true); setErr("");
    try {
      const r = await walletsApi.deposit({ ...form, provider: "MPESA" });
      setMsg(r.message || "Deposited!"); setModal(null); load();
    } catch(ex) { setErr(ex.message); } finally { setSending(false); }
  };

  const doAddWallet = async e => {
    e.preventDefault(); setSending(true); setErr("");
    try {
      await walletsApi.create(form.currency);
      setMsg("Wallet created!"); setModal(null); load();
    } catch(ex) { setErr(ex.message); } finally { setSending(false); }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <h1 style={{fontSize:26,marginBottom:4}}>My Wallets</h1>
          <p style={{color:"var(--text-secondary)",fontSize:14}}>{list.length} wallet{list.length!==1?"s":""} active</p>
        </div>
        <button className="btn btn-gold" onClick={()=>openModal("add")}>
          <i className="bi bi-plus-lg"/> Add Currency
        </button>
      </div>

      {msg && <div style={{background:"var(--teal-glow)",border:"1px solid var(--border-teal)",borderRadius:"var(--radius-sm)",padding:"12px 16px",color:"var(--teal)",fontSize:13,display:"flex",gap:8,alignItems:"center"}}><i className="bi bi-check-circle-fill"/>{msg}</div>}

      {loading ? (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
          {[1,2].map(i=><div key={i} className="shimmer" style={{height:160,borderRadius:"var(--radius-lg)"}}/>)}
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
          {list.map(w=>(
            <div key={w.ref} className={`card ${w.is_primary?"card-gold":""}`} style={{position:"relative"}}>
              {w.is_primary && <div style={{position:"absolute",top:16,right:16}}><span className="badge badge-gold">Primary</span></div>}
              {w.is_frozen  && <div style={{position:"absolute",top:w.is_primary?44:16,right:16}}><span className="badge badge-red"><i className="bi bi-snow2"/> Frozen</span></div>}
              <div style={{color:"var(--text-muted)",fontSize:11,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>{w.currency} Wallet</div>
              <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:28,marginBottom:4}}>
                {SYM[w.currency]||w.currency} <span style={{color:w.is_primary?"var(--gold)":"var(--text-primary)"}}>{Number(w.balance).toLocaleString(undefined,{minimumFractionDigits:2})}</span>
              </div>
              <div style={{fontSize:11,color:"var(--text-muted)",marginBottom:20,fontFamily:"monospace"}}>{w.ref}</div>
              <div style={{display:"flex",gap:8}}>
                <button className="btn btn-sm btn-teal" onClick={()=>openModal("deposit",w)} disabled={w.is_frozen}><i className="bi bi-plus-circle"/> Deposit</button>
                <button className="btn btn-sm btn-outline" onClick={()=>openModal("send",w)} disabled={w.is_frozen}><i className="bi bi-send"/> Send</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal backdrop */}
      {modal && (
        <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(4px)"}}>
          <div onClick={e=>e.stopPropagation()} className="card" style={{width:"100%",maxWidth:420,zIndex:201}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <h2 style={{fontSize:18}}>
                {modal==="send"?"Send Money":modal==="deposit"?"Add Funds":"Add Wallet"}
              </h2>
              <button className="btn-ghost btn" onClick={()=>setModal(null)}><i className="bi bi-x-lg"/></button>
            </div>
            {err && <div style={{background:"rgba(255,107,107,0.08)",border:"1px solid rgba(255,107,107,0.2)",borderRadius:"var(--radius-sm)",padding:"10px 14px",marginBottom:16,color:"var(--coral)",fontSize:13}}>{err}</div>}

            {modal==="send" && (
              <form onSubmit={doSend} style={{display:"flex",flexDirection:"column",gap:14}}>
                <div className="form-group"><label className="form-label">Recipient (ID, phone, or wallet ref)</label><input className="form-input" required placeholder="SP... or +254..." onChange={e=>set("to_identifier",e.target.value)}/></div>
                <div className="form-group"><label className="form-label">Amount ({form.currency})</label><input className="form-input" type="number" step="0.01" min="1" required onChange={e=>set("amount",e.target.value)}/></div>
                <div className="form-group"><label className="form-label">Transaction PIN</label><input className="form-input" type="password" maxLength={4} required placeholder="••••" onChange={e=>set("pin",e.target.value)}/></div>
                <div className="form-group"><label className="form-label">Note (optional)</label><input className="form-input" placeholder="What's it for?" onChange={e=>set("description",e.target.value)}/></div>
                <button type="submit" className="btn btn-gold" style={{justifyContent:"center"}} disabled={sending}>{sending?"Sending…":"Send Money"}</button>
              </form>
            )}
            {modal==="deposit" && (
              <form onSubmit={doDeposit} style={{display:"flex",flexDirection:"column",gap:14}}>
                <div className="form-group"><label className="form-label">Amount ({form.currency})</label><input className="form-input" type="number" step="0.01" min="1" required onChange={e=>set("amount",e.target.value)}/></div>
                <div style={{background:"var(--gold-subtle)",border:"1px solid var(--border-gold)",borderRadius:"var(--radius-sm)",padding:"10px 14px",color:"var(--text-secondary)",fontSize:12}}>
                  <i className="bi bi-phone-fill" style={{color:"var(--gold)",marginRight:6}}/>
                  M-Pesa STK push will be sent to your registered number.
                </div>
                <button type="submit" className="btn btn-teal" style={{justifyContent:"center"}} disabled={sending}>{sending?"Processing…":"Deposit via M-Pesa"}</button>
              </form>
            )}
            {modal==="add" && (
              <form onSubmit={doAddWallet} style={{display:"flex",flexDirection:"column",gap:14}}>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-input" required onChange={e=>set("currency",e.target.value)} defaultValue="">
                    <option value="" disabled>Select currency</option>
                    {["USD","EUR","GBP","UGX","TZS","NGN","GHS"].map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-gold" style={{justifyContent:"center"}} disabled={sending}>{sending?"Creating…":"Create Wallet"}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default WalletsPage;