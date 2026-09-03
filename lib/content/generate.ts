import { getEvent } from "@/lib/db/queries";
import type { ContentType } from "@/lib/db/types";

export function buildBrief(eventId:string,type:ContentType){
  const e=getEvent(eventId); if(!e) throw new Error("Event not found");
  const title=e.canonical_title;
  const sourceLinks=e.sources.map((s:any)=>({name:s.source_name,title:s.title,url:s.original_url||s.url}));
  const evidence={title,summary:e.summary,primaryUrl:e.primary_url,sources:sourceLinks,risk:e.risk||"回原始来源核验事实。"};
  if(type==="short_video") return {type,evidence,titles:[`这个 AI 项目有点东西：${title}`,`刚发现一个值得演示的新工具：${title}`,`${title}，最值得看的不是名字，而是这个效果`,`如果你经常用 AI，可以看看 ${title}`,`又一个可以直接上手测试的 AI 新项目`],hooks:[e.hook_text||`我刚发现 ${title}`,`先看结果，这个东西把原来几步操作压到了一起。`,`我本来以为只是又一个 AI 工具，实际看 Demo 后有点不一样。`],script60:`【Hook】${e.hook_text||title}\n【展示】先放最强 Demo / 结果画面。\n【解释】一句话说明它解决什么问题。\n【演示】用 2–3 个步骤完成一次真实操作。\n【判断】它最适合谁，以及当前最大的限制。\n【CTA】需要地址就收藏，发布前核验免费政策和功能边界。`,script90:`在 60 秒结构基础上增加：项目背景、与现有方案对比、一次真实测试结果和一个明确的使用门槛。`,shotList:["0–3s 最强结果画面 + Hook","3–10s 项目/产品主页","10–30s 输入与操作过程","30–45s 输出结果 / Before-After","45–60s 适合谁 + 风险 + CTA"],requiredAssets:["官方主页截图","真实 Demo 录屏","原始来源链接","必要时 Before/After"],factCheck:["发布日期","是否真的免费/开源","核心功能是否已上线","演示结果是否来自真实测试"]};
  if(type==="long_video") return {type,evidence,sections:["发生了什么：只列已确认事实","为什么值得关注：它改变了哪个工作流/行业假设","背景：过去的做法是什么","这次变化与过去相比新在哪里","正面判断：谁最受益","反面判断：局限、成本、可靠性、生态依赖","连接自己的实践：我在哪个真实任务里会用它验证","结论：现在值得做什么、不值得做什么"],questions:[`我为什么会对 ${title} 感兴趣？`,`它解决的是新需求，还是把旧需求做得更便宜？`,`如果实际跑一次，最可能在哪一步翻车？`,`它对我当前 AI/开发工作流有什么直接影响？`,`三个月后这件事还值得讨论吗？`]};
  return {type,evidence,titleIdeas:[`我试了 ${title}，真正值得看的其实是这几点`,`${title} 是什么？先看这几个实际用途`,`又发现一个值得收藏的 AI 项目：${title}`,`${title} 值不值得用？功能、适合人群和限制`,`这周值得关注的 AI 工具：${title}`],outline:["开头：一句话说明为什么值得看","它是什么","解决什么问题","核心功能/实际效果","怎么用","适合谁","限制与风险","原始链接与结论"],numbersToVerify:["用户/Star/播放/收入等所有数字","价格与免费额度","发布时间","性能或效率提升幅度"],risk:e.risk||"避免复制聚合站摘要，回原始来源核验后重写。"};
}
