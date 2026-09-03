import Link from "next/link";
import { notFound } from "next/navigation";
import { EventActions } from "@/components/EventActions";
import { getEvent } from "@/lib/db/queries";
export const dynamic="force-dynamic";
export default async function EventPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const e=getEvent(id);if(!e)notFound();return <>
  <div className="hero"><div><Link className="muted" href="/">← Radar</Link><h1 style={{marginTop:10}}>{e.canonical_title}</h1><p className="muted">{e.summary||'No summary.'}</p></div><div className="score">{e.overall_score??Math.max(0,Math.round(e.rule_score||0))}</div></div>
  <div className="row">
    <section className="prose"><h2>Content signal</h2><p><b>Best angle</b><br/>{e.best_angle||'—'}</p><p><b>Hook</b><br/>{e.hook_text||'—'}</p><p className="risk">⚠ {e.risk||'发布前回原始来源核验。'}</p><EventActions id={e.event_id} saved={Boolean(e.saved)} status={e.status}/></section>
    <section className="prose"><h2>Fit scores</h2><p>Short video: <b>{e.short_video_fit??'—'}</b></p><p>Long video: <b>{e.long_video_fit??'—'}</b></p><p>WeChat: <b>{e.wechat_fit??'—'}</b></p><p>Rule score: <b>{e.rule_score}</b></p><p>Model: <b>{e.model||'—'}</b></p></section>
  </div>
  <h2>Sources</h2><div className="grid">{e.sources.map((s:any)=><div className="card" key={s.id}><div className="meta"><span className="badge">{s.source_name}</span><span>{s.published_at||s.fetched_at}</span></div><p className="title" style={{marginTop:10}}>{s.title}</p>{s.summary&&<p className="muted">{s.summary.slice(0,500)}</p>}<div className="actions"><a className="button" target="_blank" rel="noreferrer" href={s.original_url||s.url}>Original ↗</a>{s.url!==s.original_url&&<a className="button" target="_blank" rel="noreferrer" href={s.url}>Aggregator ↗</a>}</div></div>)}</div>
</>}
