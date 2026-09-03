"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EventActions({id,saved,status}:{id:string,saved:boolean,status:string}){
  const router=useRouter(); const [busy,setBusy]=useState('');
  async function action(value:string){setBusy(value); try{await fetch(`/api/events/${id}/action`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:value})});router.refresh();}finally{setBusy('')}}
  async function job(type:string){setBusy(type);try{const r=await fetch('/api/content-jobs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventId:id,contentType:type})});const j=await r.json();if(r.ok) router.push(`/content/${j.id}`);}finally{setBusy('')}}
  return <div className="card-actions">
    <button onClick={()=>action(saved?'unsave':'save')} disabled={!!busy}>{saved?'Unsave':'Save'}</button>
    {status==='ignored'?<button onClick={()=>action('restore')} disabled={!!busy}>Restore</button>:<button onClick={()=>action('ignore')} disabled={!!busy}>Ignore</button>}
    <button onClick={()=>job('short_video')} disabled={!!busy}>Short video</button>
    <button onClick={()=>job('long_video')} disabled={!!busy}>Long video</button>
    <button onClick={()=>job('wechat')} disabled={!!busy}>WeChat</button>
  </div>
}
