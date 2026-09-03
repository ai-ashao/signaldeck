import { NextRequest, NextResponse } from "next/server";
import { refreshAll } from "@/lib/pipeline";
export const runtime="nodejs";
export async function GET(req:NextRequest){const secret=process.env.CRON_SECRET;if(secret&&req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});try{return NextResponse.json(await refreshAll());}catch(e:any){return NextResponse.json({error:e?.message||String(e)},{status:500});}}
