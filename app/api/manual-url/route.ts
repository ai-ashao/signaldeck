import { NextRequest, NextResponse } from "next/server";
import { manualUrlItem } from "@/lib/sources/manual";
import { insertRawItem } from "@/lib/db/queries";
import { dedupPendingRawItems } from "@/lib/dedup";
import { scoreRecentEvents } from "@/lib/scoring";
export const runtime="nodejs";
export async function POST(req:NextRequest){try{const f=await req.formData();const url=String(f.get('url')||'').trim();if(!url)return NextResponse.json({error:'URL required'},{status:400});const item=await manualUrlItem(url,String(f.get('title')||'').trim()||undefined,String(f.get('summary')||'').trim()||undefined);insertRawItem(item);dedupPendingRawItems();await scoreRecentEvents(30);return NextResponse.json({ok:true});}catch(e:any){return NextResponse.json({error:e?.message||String(e)},{status:400});}}
