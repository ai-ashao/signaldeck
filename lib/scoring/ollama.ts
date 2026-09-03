import { z } from "zod";
import type { ScoreResult } from "@/lib/db/types";

const schema = z.object({
  freshness:z.number(),wow:z.number(),visual:z.number(),utility:z.number(),hook:z.number(),trend:z.number(),audience:z.number(),commercial:z.number(),
  short_video_fit:z.number(),long_video_fit:z.number(),wechat_fit:z.number(),overall_score:z.number(),why:z.string(),best_angle:z.string(),hook_text:z.string(),risk:z.string()
});

export async function ollamaScore(event:any, sources:any[], fallback:ScoreResult): Promise<ScoreResult> {
  const model = process.env.OLLAMA_MODEL;
  if (!model) return fallback;
  const base = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const prompt = `你是中文 AI 科技内容编辑。请评估该事件做营销短视频、深度长视频、公众号的价值。\n标题：${event.canonical_title}\n摘要：${event.summary||''}\n来源数：${event.source_count}\n来源：${sources.map((s:any)=>s.source_name).join(', ')}\n\n0-10评分 freshness,wow,visual,utility,hook,trend,audience,commercial；0-100评分 short_video_fit,long_video_fit,wechat_fit,overall_score。best_angle只给一个角度；hook_text自然但不能捏造；risk指出最大事实风险。只输出 JSON。`;
  try {
    const res = await fetch(`${base}/api/chat`, {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({model,messages:[{role:"user",content:prompt}],stream:false,format:"json"}),signal:AbortSignal.timeout(30000)});
    if (!res.ok) return fallback;
    const data = await res.json();
    const parsed = schema.safeParse(JSON.parse(data.message?.content || "{}"));
    if (!parsed.success) return fallback;
    const x=parsed.data;
    return {...x,model:`ollama:${model}`,prompt_version:"content-score-v1"};
  } catch { return fallback; }
}
