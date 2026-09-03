"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddUrl(){
  const [open,setOpen]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const router=useRouter();
  async function submit(formData:FormData){
    setBusy(true); setError('');
    try{const r=await fetch('/api/manual-url',{method:'POST',body:formData}); const j=await r.json(); if(!r.ok) throw new Error(j.error||'Add URL failed'); setOpen(false); router.refresh();}
    catch(e:any){setError(e.message||String(e));}finally{setBusy(false);}
  }
  return <>
    <button onClick={()=>setOpen(v=>!v)}>+ Add URL</button>
    {open&&<div className="form" style={{position:'absolute',right:20,top:72,width:'min(520px,calc(100vw - 40px))',zIndex:20,boxShadow:'0 16px 50px rgba(0,0,0,.14)'}}>
      <form action={submit} className="grid">
        <div><label>URL *</label><input name="url" type="url" required placeholder="https://x.com/... or any public page"/></div>
        <div><label>Title（抓取失败时填写）</label><input name="title" placeholder="Optional"/></div>
        <div><label>Summary（可选）</label><textarea name="summary" placeholder="Optional notes"/></div>
        {error&&<div className="error">{error}</div>}
        <div className="actions"><button className="primary" disabled={busy}>{busy?'Adding…':'Add to Radar'}</button><button type="button" onClick={()=>setOpen(false)}>Cancel</button></div>
      </form>
    </div>}
  </>
}
