import { NextRequest, NextResponse } from "next/server";
import { buildBrief } from "@/lib/content/generate";
import { createContentJob } from "@/lib/db/queries";
import type { ContentType } from "@/lib/db/types";
export const runtime="nodejs";
export async function POST(req:NextRequest){try{const {eventId,contentType}=await req.json();if(!eventId||!['short_video','long_video','wechat'].includes(contentType))return NextResponse.json({error:'Bad request'},{status:400});const brief=buildBrief(eventId,contentType as ContentType);const id=createContentJob(eventId,contentType as ContentType,brief);return NextResponse.json({id});}catch(e:any){return NextResponse.json({error:e?.message||String(e)},{status:500});}}
