"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RefreshButton(){
  const [busy,setBusy]=useState(false); const [msg,setMsg]=useState(""); const router=useRouter();
  async function run(){
    setBusy(true); setMsg("");
    try{const r=await fetch('/api/refresh',{method:'POST'}); const j=await r.json(); if(!r.ok) throw new Error(j.error||'Refresh failed'); setMsg(`完成：新增 ${j.sources?.reduce((a:number,x:any)=>a+(x.inserted||0),0)||0} 条`); router.refresh();}
    catch(e:any){setMsg(e.message||String(e));} finally{setBusy(false);}
  }
  return <div><button className="primary" onClick={run} disabled={busy}>{busy?'Refreshing…':'Refresh sources'}</button>{msg&&<div className={msg.startsWith('完成')?'muted':'error'} style={{marginTop:8,fontSize:12}}>{msg}</div>}</div>
}
