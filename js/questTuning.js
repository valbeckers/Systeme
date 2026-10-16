import { EXERCISE_ROTATIONS } from "./exerciseRotation.js?v=20261014-calves-target-v1";
import { DEFS, SP } from "./questDefs.js?v=20261012-back-daily-v1";
import { BONUS_QUESTS } from "./bonusQuestDefs.js?v=20261012-back-daily-v1";

const TUNABLE_IDS=new Set([
  ...DEFS.filter(q=>q.daily&&!q.optional||q.weekly).map(q=>q.id),
  ...BONUS_QUESTS.map(q=>q.id),
  ...Object.values(EXERCISE_ROTATIONS).flat().map(x=>x.id),
  ...Object.values(SP).flat().map(q=>q.id)
]);
const REWARD_KEYS=new Set(["xpPer","xpPer2","xpPer3","binaryXp","xp","xp2","xp3"]);

function cleanRewards(raw){
  if(!raw||typeof raw!=="object")return null;
  const rewards={};
  for(const [key,value] of Object.entries(raw)){
    if(REWARD_KEYS.has(key)&&Number.isFinite(Number(value))&&Number(value)>0)rewards[key]=Number(value);
    if(key==="tiers"&&Array.isArray(value)){
      const tiers=value.map(t=>{
        const clean={};
        for(const field of ["xp","xp2","xp3"]){
          if(t&&Number.isFinite(Number(t[field]))&&Number(t[field])>0)clean[field]=Number(t[field]);
        }
        return clean;
      });
      if(tiers.some(t=>Object.keys(t).length))rewards.tiers=tiers;
    }
  }
  return Object.keys(rewards).length?rewards:null;
}

export function cleanQuestTuning(raw){
  const result={};
  for(const [id,revisions] of Object.entries(raw||{})){
    if(!TUNABLE_IDS.has(id)||!Array.isArray(revisions))continue;
    const valid=revisions.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r?.from||""))
      .map(r=>({
        from:r.from,
        target:r.target===null?null:(Number.isFinite(Number(r.target))&&Number(r.target)>0?Number(r.target):null),
        buttons:Array.isArray(r.buttons)&&r.buttons.length>0&&r.buttons.length<=3&&r.buttons.every(n=>Number.isFinite(Number(n))&&Number(n)>0)
          ?r.buttons.map(Number):null,
        rewards:cleanRewards(r.rewards)
      }))
      .sort((a,b)=>a.from.localeCompare(b.from));
    if(valid.length)result[id]=valid;
  }
  return result;
}

export function questTuningForDay(tuning,id,day){
  return (tuning?.[id]||[]).filter(r=>r.from<=day).at(-1)||null;
}

export function nextQuestTuning(tuning,id,day){
  return (tuning?.[id]||[]).find(r=>r.from===day)||null;
}

export function saveQuestTuning(tuning,id,from,target,buttons,rewards=null){
  if(!TUNABLE_IDS.has(id))return tuning;
  const clean=cleanQuestTuning(tuning);
  return {...clean,[id]:[...(clean[id]||[]).filter(r=>r.from!==from),{from,target,buttons,rewards:cleanRewards(rewards)}].sort((a,b)=>a.from.localeCompare(b.from))};
}

export function applyQuestTuning(obj,tuning,day){
  const revision=questTuningForDay(tuning,obj.exerciseId||obj.id,day);
  if(!revision)return obj;
  const configured={
    ...obj,
    ...(revision.target!=null?{target:revision.target,validateAt:revision.target,customTarget:true,finalTargetCap:undefined}:{ }),
    ...(revision.buttons?{quickAmounts:revision.buttons}:{ })
  };
  const rewards=revision.rewards;
  if(!rewards)return configured;
  for(const key of REWARD_KEYS){
    if(rewards[key]!=null)configured[key]=rewards[key];
  }
  if(Array.isArray(obj.tiers)&&Array.isArray(rewards.tiers)){
    configured.tiers=obj.tiers.map((tier,index)=>({...tier,...rewards.tiers[index]}));
    configured.xp=configured.tiers.reduce((sum,t)=>sum+(Number(t.xp)||0),0);
    if(configured.tiers.some(t=>t.xp2))configured.xp2=configured.tiers.reduce((sum,t)=>sum+(Number(t.xp2)||0),0);
  }else if(obj.id.startsWith("sp_")&&!obj.binary&&rewards.xpPer!=null){
    configured.xp=rewards.xpPer*(Number(configured.target)||1);
    if(rewards.xpPer2!=null)configured.xp2=rewards.xpPer2*(Number(configured.target)||1);
    if(rewards.xpPer3!=null)configured.xp3=rewards.xpPer3*(Number(configured.target)||1);
  }
  return configured;
}
