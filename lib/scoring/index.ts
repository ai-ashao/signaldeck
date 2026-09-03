import { db } from "@/lib/db";
import { getEvent, setRuleScore, upsertScore } from "@/lib/db/queries";
import { ruleScore } from "./rules";
import { heuristicScore } from "./heuristic";
import { ollamaScore } from "./ollama";

export async function scoreRecentEvents(limit=80) {
  const rows = db.prepare(`select id from events where status!='ignored' order by last_seen_at desc limit ?`).all(limit) as any[];
  let scored=0;
  for (const row of rows) {
    const full=getEvent(row.id); if(!full) continue;
    const rule=ruleScore(full,full.sources); setRuleScore(row.id,rule);
    if(rule < -10) continue;
    const base=heuristicScore(full,full.sources,rule);
    const result=await ollamaScore(full,full.sources,base);
    upsertScore(row.id,result); scored++;
  }
  return {scored};
}
