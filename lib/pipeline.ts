import { listSourceConfigs, insertRawItem, markSourceFetched } from "@/lib/db/queries";
import { fetchSource } from "@/lib/sources";
import { dedupPendingRawItems } from "@/lib/dedup";
import { scoreRecentEvents } from "@/lib/scoring";

let activeRefresh: Promise<Awaited<ReturnType<typeof runRefresh>>> | null = null;

async function runRefresh() {
  const sources=listSourceConfigs().filter((s:any)=>s.enabled);
  const report:any[]=[];
  for(const source of sources){
    try{
      const items=await fetchSource(source as any); let inserted=0;
      for(const item of items) if(insertRawItem(item)) inserted++;
      markSourceFetched(source.id); report.push({source:source.name,ok:true,fetched:items.length,inserted});
    }catch(error:any){report.push({source:source.name,ok:false,error:error?.message||String(error)});}
  }
  const dedup=dedupPendingRawItems();
  const scoring=await scoreRecentEvents();
  return {sources:report,dedup,scoring};
}

export function refreshAll() {
  if (!activeRefresh) {
    activeRefresh = runRefresh().finally(() => {
      activeRefresh = null;
    });
  }
  return activeRefresh;
}
