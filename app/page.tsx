import Link from "next/link";
import { AddUrl } from "@/components/AddUrl";
import { RefreshButton } from "@/components/RefreshButton";
import { EventActions } from "@/components/EventActions";
import { getEvents, getStats } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

function ago(v:string){const d=Math.max(0,Date.now()-new Date(v).getTime());const h=Math.floor(d/36e5);if(h<1)return `${Math.max(1,Math.floor(d/60000))}m ago`;if(h<24)return `${h}h ago`;return `${Math.floor(h/24)}d ago`;}

export default async function Home({searchParams}:{searchParams:Promise<{tab?:string}>}){
  const {tab='top'}=await searchParams; const events=getEvents(tab,tab==='top'?10:30); const stats=getStats();
  const tabs=[['top','Top'],['short','Short Video'],['long','Long Video'],['wechat','WeChat'],['saved','Saved'],['ignored','Ignored'],['all','All']];
  return <>
    <section className="hero">
      <div><h1>Today&apos;s AI Content Signals</h1><p className="muted" style={{margin:0}}>Zero-key radar：聚合 → 去重 → 评分 → 人工选 1–3 条。</p></div>
      <div className="actions" style={{position:'relative'}}><AddUrl/><RefreshButton/></div>
    </section>
    <div className="kpis">
      <div className="kpi"><span>Raw / 24h</span><b>{stats.raw}</b></div>
      <div className="kpi"><span>Events / 24h</span><b>{stats.events}</b></div>
      <div className="kpi"><span>Scored / 24h</span><b>{stats.scored}</b></div>
      <div className="kpi"><span>Selected / 24h</span><b>{stats.selected}</b></div>
    </div>
    <div className="tabs">{tabs.map(([k,label])=><Link key={k} className={`tab ${tab===k?'active':''}`} href={`/?tab=${k}`}>{label}</Link>)}</div>
    <div className="grid">
      {events.length===0&&<div className="empty"><b>还没有候选内容</b><p>点击 Refresh sources 拉取 AIHOT、HN、Product Hunt 和 RSS。无需注册任何数据 API。</p></div>}
      {events.map((e:any)=>{
        const score=e.overall_score??Math.max(0,Math.round(e.rule_score||0));
        return <article className="card" key={e.event_id}>
          <div className="card-top">
            <div className="score">{score}</div>
            <div>
              <Link href={`/events/${e.event_id}`} className="title">{e.canonical_title}</Link>
              <div className="meta"><span>{ago(e.last_seen_at)}</span><span>·</span><span>{e.source_count} source{e.source_count===1?'':'s'}</span>{String(e.source_names||'').split(',').filter(Boolean).slice(0,4).map((s:string)=><span className="badge" key={s}>{s}</span>)}</div>
            </div>
            <a className="button" target="_blank" rel="noreferrer" href={e.primary_url}>Source ↗</a>
          </div>
          {e.overall_score!=null&&<div className="metrics">
            <div className="metric">Wow<b>{e.wow}/10</b></div><div className="metric">Visual<b>{e.visual}/10</b></div><div className="metric">Utility<b>{e.utility}/10</b></div><div className="metric">Hook<b>{e.hook}/10</b></div>
          </div>}
          {(e.best_angle||e.hook_text)&&<div className="angle"><strong>Recommended angle</strong>{e.best_angle}<br/><span className="muted">Hook: {e.hook_text}</span></div>}
          {e.risk&&<div className="risk">⚠ {e.risk}</div>}
          <EventActions id={e.event_id} saved={Boolean(e.saved)} status={e.status}/>
        </article>
      })}
    </div>
  </>
}
