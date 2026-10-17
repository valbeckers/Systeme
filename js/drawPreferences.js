import { DEFS } from "./questDefs.js?v=20261017-editor-v1";
import { DUNGEONS } from "./dungeonDefs.js?v=20261017-editor-v1";
import { BREACH_POOL } from "./breachDefs.js?v=20261017-editor-v1";
import { storedQuestCatalog } from "./questCatalog.js?v=20261017-editor-v1";

export const DRAW_POOLS={
  daily:DEFS.filter(q=>q.daily&&!q.optional).map(q=>({id:q.id,label:q.name})),
  dungeon:DUNGEONS.map(q=>({id:q.id,label:q.title})),
  breach:BREACH_POOL.map(q=>({id:q.id,label:q.name}))
};

export function cleanDrawPreferences(raw,catalog=storedQuestCatalog()){
  const out={};
  for(const [pool,items] of Object.entries(DRAW_POOLS)){
    const valid=new Set([...items.map(item=>item.id),...Object.values(catalog||{}).filter(q=>q.kind===pool).map(q=>q.id)]);
    const selected=Array.isArray(raw?.[pool])?[...new Set(raw[pool].filter(id=>valid.has(id)))]:[...valid];
    out[pool]=selected.length?selected:[...valid];
  }
  return out;
}

export function eligiblePool(state,pool){
  const enabled=cleanDrawPreferences(state?.drawPreferences)[pool];
  return new Set(enabled);
}

export function snapshotDrawPools(state,day){
  const prefs=cleanDrawPreferences(state.drawPreferences);
  const daily={...(state.dailyDrawByDay||{})};
  let changed=false;
  if(!daily[day]){daily[day]=prefs.daily;changed=true;}
  return changed?{...state,dailyDrawByDay:daily}:state;
}

export function dailyEligibleForDay(state,day,id){
  const row=state.dailyDrawByDay?.[day];
  return !Array.isArray(row)||row.includes(id);
}

export function cleanDrawSnapshots(raw,pool){
  const valid=new Set(DRAW_POOLS[pool].map(item=>item.id));
  const out={};
  for(const [key,ids] of Object.entries(raw||{})){
    if(!Array.isArray(ids)||!/^\d{4}-(?:\d{2}-\d{2}|W\d{2})$/.test(key))continue;
    out[key]=[...new Set(ids.filter(id=>valid.has(id)))];
  }
  return out;
}
