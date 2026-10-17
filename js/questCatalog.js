// Catalogue personnel : stocké avec la sauvegarde principale, donc exportable.
// La lecture se fait avant la construction des listes de tirage au chargement.
export const CATALOG_KINDS=["daily","bonus","weekly","urgent","dungeon","breach"];
const STATS=new Set(["Sante","Force","Esprit","Endurance","Agilite","Discipline"]);
const validId=id=>typeof id==="string"&&/^[a-z][a-z0-9_]{2,63}$/.test(id);
const positive=n=>Number.isFinite(Number(n))&&Number(n)>0;
const limited=(value,length=100)=>String(value||"").trim().slice(0,length);

export function cleanQuestCatalog(raw){
  const out={};
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return out;
  for(const [id,entry] of Object.entries(raw).slice(0,250)){
    if(!validId(id)||!entry||!CATALOG_KINDS.includes(entry.kind)||!/^\d{4}-\d{2}-\d{2}$/.test(entry.from||""))continue;
    if(!limited(entry.name)||!STATS.has(entry.stat)||!positive(entry.target)||!positive(entry.xpPer))continue;
    const kind=entry.kind;
    const clean={id,kind,from:entry.from,name:limited(entry.name),stat:entry.stat,unit:limited(entry.unit,24)||"succès",target:Number(entry.target),xpPer:Number(entry.xpPer),binary:entry.binary===true,icon:limited(entry.icon,12)||"✦"};
    if(STATS.has(entry.category))clean.category=entry.category;
    if(kind==="weekly"){
      clean.completionBonusXp=Number.isFinite(Number(entry.completionBonusXp))&&Number(entry.completionBonusXp)>=0?Number(entry.completionBonusXp):0;
      clean.overGoalXpPer=Number.isFinite(Number(entry.overGoalXpPer))&&Number(entry.overGoalXpPer)>=0?Number(entry.overGoalXpPer):0;
    }
    if(entry.stat2&&STATS.has(entry.stat2)&&entry.stat2!==entry.stat&&positive(entry.xpPer2)){
      clean.stat2=entry.stat2;clean.xpPer2=Number(entry.xpPer2);
    }
    if(["","push","negative_pullups","abs","squats"].includes(entry.family))clean.family=entry.family;
    if(Array.isArray(entry.tiers)&&entry.tiers.length<=8){
      const tiers=entry.tiers.filter(t=>positive(t?.at)&&positive(t?.xp)).map(t=>({at:Number(t.at),xp:Number(t.xp),stat:clean.stat,...(clean.stat2&&positive(t.xp2)?{xp2:Number(t.xp2),stat2:clean.stat2}:{})})).sort((a,b)=>a.at-b.at);
      if(tiers.length&&tiers.every((t,i)=>i===0||t.at>tiers[i-1].at)&&tiers.at(-1).at===clean.target)clean.tiers=tiers;
    }
    if(kind==="dungeon"){
      clean.rooms=(Array.isArray(entry.rooms)?entry.rooms:[]).slice(0,12).filter(r=>limited(r?.name)&&limited(r?.desc)).map(r=>({name:limited(r.name),desc:limited(r.desc,180),...(limited(r.masterClause,180)?{masterClause:limited(r.masterClause,180)}:{})}));
      if(clean.rooms.length<2)continue;
      clean.short=limited(entry.short)||clean.name;
      clean.color=/^#[0-9a-f]{6}$/i.test(entry.color||"")?entry.color:"#a78bfa";
    }
    if(kind==="breach"){
      clean.bossObjective=limited(entry.bossObjective,180)||clean.name;
      clean.step=positive(entry.step)?Number(entry.step):1;
      clean.bossName=limited(entry.bossName)||"Boss de Rupture";
      clean.guards=(Array.isArray(entry.guards)?entry.guards:[]).slice(0,8).filter(g=>limited(g?.name)&&limited(g?.objective)&&positive(g?.target)).map((g,i)=>({id:id+"_guard_"+i,name:limited(g.name),objective:limited(g.objective,180),unit:limited(g.unit,24)||"rep",target:Number(g.target),step:positive(g.step)?Number(g.step):1}));
      if(!clean.guards.length)continue;
    }
    out[id]=clean;
  }
  return out;
}

function storedState(){
  for(const key of ["sl_v3","sl_v3_backup1","sl_v3_backup2","sl_v3_backup3"]){
    try{const raw=localStorage.getItem(key);if(raw){const parsed=JSON.parse(raw);if(parsed&&typeof parsed==="object")return parsed;}}catch{}
  }
  return {};
}
export function storedQuestCatalog(){return cleanQuestCatalog(storedState().questCatalog);}
const snapshot=storedState();
const loaded=cleanQuestCatalog(snapshot.questCatalog);
const day=(()=>{const d=new Date();if(d.getHours()<5)d.setDate(d.getDate()-1);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");})();
const active=Object.values(loaded).filter(q=>q.from<=day&&!(snapshot.activeDungeon?.id===q.id||snapshot.suspendedDungeon?.dungeon?.id===q.id)&&!(snapshot.activeBreach?.id===q.id&&!snapshot.activeBreach?.completedAt)&&!(snapshot.specialQuests||[]).some(s=>s.id===q.id&&!s.completedAt));
const ROTATION_IDS=new Set(["pushups","dips","pullups","australian_pullups","crunches","leg_raises","plank","side_plank","lunges"]);
export function activeCatalogEntry(id){return active.find(q=>q.id===id)||null;}

function catalogObject(q){
  const {id,kind,name,stat,unit,target,xpPer,binary,icon,stat2,xpPer2,tiers,family,category}=q;
  if(kind==="dungeon")return {id,title:name,short:q.short,stat,icon,color:q.color,reward:{xp:xpPer,stat,...(stat2?{xp2:xpPer2,stat2}:{})},rooms:q.rooms};
  if(kind==="breach")return {id,name,bossObjective:q.bossObjective,icon,unit,target,step:q.step,binary,xp:xpPer,stat,...(stat2?{xp2:xpPer2,stat2}:{}),desc:""};
  if(kind==="urgent")return {id,name,icon,unit,target,stat,days:1,binary,...(tiers?.length?{tiers,xp:tiers.reduce((n,t)=>n+t.xp,0)}:{xp:xpPer,xp2:stat2?xpPer2:undefined,stat2})};
  return {id,name,icon,unit,stat,base:target,target,weekly:kind==="weekly",daily:kind!=="weekly",optional:kind==="bonus",selectableBonus:kind==="bonus",fixedBase:true,category:category||stat,binary,customTarget:true,family:family||null,tiers:tiers?.length?tiers:undefined,xpPer,binaryXp:binary?xpPer:undefined,stat2:stat2||null,xpPer2:stat2?xpPer2:null,...(kind==="weekly"?{hardCap:true,completionBonusXp:q.completionBonusXp||0,overGoalXpPer:q.overGoalXpPer||0,overGoalStat:stat}:{})};
}

export function mergeQuestCatalog(defaults,kind){
  const out=defaults.filter(q=>!active.some(c=>c.id===q.id&&c.kind!==kind&&!(kind==="daily"&&q.optional&&c.kind==="bonus"))).map(q=>{
    const override=active.find(c=>c.id===q.id&&c.kind===kind);
    return override?(q.legacyRotation?{...q}: {...q,...catalogObject(override)}):q;
  });
  for(const entry of active.filter(c=>c.kind===kind&&!out.some(q=>q.id===c.id)&&!(kind==="daily"&&ROTATION_IDS.has(c.id))))out.push(catalogObject(entry));
  return out;
}

export function applyRotationCatalog(obj){
  const entry=activeCatalogEntry(obj.exerciseId);
  if(!entry||entry.kind!=="daily")return obj;
  return {...obj,name:entry.name,unit:entry.unit,target:entry.target,customTarget:true,xpPer:entry.binary?0:entry.xpPer,binary:entry.binary,binaryXp:entry.binary?entry.xpPer:undefined,stat:entry.stat,stat2:entry.stat2||null,xpPer2:entry.xpPer2||null,tiers:entry.tiers||undefined,family:entry.family||undefined};
}

export function mergeUrgentCatalog(groups){
  const all=Object.entries(groups).flatMap(([stat,items])=>items.map(q=>({...q,stat:q.stat||stat})));
  const merged=mergeQuestCatalog(all,"urgent");
  return Object.fromEntries(Object.keys(groups).map(stat=>[stat,merged.filter(q=>q.stat===stat)]));
}

export function mergeBreachBosses(defaults){
  const bosses={...defaults};
  active.filter(q=>q.kind==="breach").forEach(q=>{bosses[q.id]={id:q.id+"_boss",name:q.bossName,guards:q.guards};});
  return bosses;
}
