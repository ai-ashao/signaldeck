import type { ScoreResult } from "@/lib/db/types";

function clamp(n:number,min=0,max=10){return Math.round(Math.max(min,Math.min(max,n)))}
const has=(t:string,re:RegExp)=>re.test(t);

export function heuristicScore(event:any, sources:any[], rule:number): ScoreResult {
  const text = `${event.canonical_title} ${event.summary || ''}`;
  const age = Math.max(0,(Date.now()-new Date(event.last_seen_at).getTime())/36e5);
  const freshness = clamp(age<12?10:age<24?9:age<72?7:age<168?5:3);
  const demo = has(text,/demo|video|image|browser|agent|generate|生成|自动|编辑|coding|workflow/i);
  const practical = has(text,/tool|app|github|open.?source|skill|mcp|agent|codex|claude|api|工具|开源|免费/i);
  const launch = has(text,/launch|release|introduc|new|发布|上线|开源|推出/i);
  const money = has(text,/saas|developer|coding|productivity|api|cloud|business|automation|效率|开发/i);
  const hype = has(text,/free|open.?source|agent|skill|mcp|codex|claude|browser|video|image|免费|开源/i);
  const sourceBoost = Math.min(3, Math.max(0, event.source_count-1));
  const wow = clamp(4 + (demo?2:0)+(hype?2:0)+sourceBoost*.4 + rule/35);
  const visual = clamp(3 + (demo?4:0)+(has(text,/video|image|browser|ui|design|生成|图片|视频/i)?2:0));
  const utility = clamp(3 + (practical?4:0)+(has(text,/free|open.?source|免费|开源/i)?1:0)+rule/45);
  const hook = clamp(4 + (hype?2:0)+(launch?1:0)+(demo?1:0)+sourceBoost*.5);
  const trend = clamp(3 + sourceBoost*1.2 + Math.max(0,rule)/20);
  const audience = clamp(4 + (practical?3:0)+(has(text,/ai|llm|claude|codex|agent|mcp|skill/i)?2:0));
  const commercial = clamp(3 + (money?4:0)+(practical?1:0));
  const short = Math.round(Math.min(100,(wow*1.5+visual*1.7+utility*1.2+hook*1.6+freshness*1.1+trend*.8+audience*1.1)*10/10));
  const long = Math.round(Math.min(100,(trend*1.4+audience*1.4+utility*1.1+freshness*.8+commercial*.8+Math.min(10,event.source_count+4)*1.0)*10/7.5));
  const wechat = Math.round(Math.min(100,(utility*1.3+hook*1.2+audience*1.2+commercial*1.2+trend+freshness)*10/6.9));
  const overall = Math.round(Math.min(100,(freshness+wow*1.5+visual*1.5+utility*1.3+hook*1.4+trend+audience*1.4+commercial*.9)*100/100));
  const noun = event.canonical_title.replace(/^(show hn:|introducing|launching)\s*/i,'').slice(0,52);
  const angle = practical ? `先展示结果，再讲 ${noun} 到底替你省了什么步骤` : `把 ${noun} 放进更大的 AI 趋势里解释：为什么现在值得关注`;
  const hookText = demo ? `我刚发现一个很适合直接上手演示的 AI 项目：${noun}` : `这条 AI 消息看起来普通，但背后有个值得注意的变化：${noun}`;
  const risk = event.source_count <= 1 ? "目前来源较少，发布前回到官方/原始链接核验关键事实。" : "多来源出现，但关键数字、免费政策和功能边界仍需回原始来源核验。";
  return {freshness,wow,visual,utility,hook,trend,audience,commercial,short_video_fit:short,long_video_fit:long,wechat_fit:wechat,overall_score:overall,why:`零 Key 启发式评分；规则分 ${rule}，来源 ${event.source_count} 个。`,best_angle:angle,hook_text:hookText,risk,model:"heuristic-v1",prompt_version:"zero-key-v1"};
}
