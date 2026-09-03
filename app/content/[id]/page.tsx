import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentJob } from "@/lib/db/queries";
export const dynamic="force-dynamic";
export default async function ContentPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const j=getContentJob(id);if(!j)notFound();return <>
  <div className="hero"><div><Link className="muted" href={`/events/${j.event_id}`}>← Event</Link><h1 style={{marginTop:10}}>{j.content_type.replace('_',' ')} brief</h1><p className="muted">{j.canonical_title}</p></div><a className="button" target="_blank" rel="noreferrer" href={j.primary_url}>Original ↗</a></div>
  <section className="prose"><pre>{JSON.stringify(j.brief,null,2)}</pre></section>
</>}
