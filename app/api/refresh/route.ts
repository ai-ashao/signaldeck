import { NextResponse } from "next/server";
import { refreshAll } from "@/lib/pipeline";
export const runtime="nodejs";
export async function POST(){try{return NextResponse.json(await refreshAll());}catch(e:any){return NextResponse.json({error:e?.message||String(e)},{status:500});}}
