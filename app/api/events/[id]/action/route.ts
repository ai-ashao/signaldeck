import { NextRequest, NextResponse } from "next/server";
import { setEventAction } from "@/lib/db/queries";
export const runtime="nodejs";
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const {id}=await params;const {action}=await req.json();if(!['save','unsave','ignore','restore'].includes(action))return NextResponse.json({error:'Bad action'},{status:400});setEventAction(id,action);return NextResponse.json({ok:true});}catch(e:any){return NextResponse.json({error:e?.message||String(e)},{status:500});}}
