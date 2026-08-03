// ─── MOTEUR DES BRÈCHES ────────────────────────────────────────────────────
// Ce fichier regroupe la normalisation, le tirage quotidien et la création
// des Boss de Rupture. Les définitions statiques restent dans breachDefs.js
// et dungeonDefs.js.

import { BREACH_POOL, BREACH_RUPTURE_BOSSES } from "./breachDefs.js";
import { eventDayStr, next7AM } from "./dayCycle.js";

function breachTemplateById(id){return BREACH_POOL.find(b=>b.id===id)||null;}
function breachRuptureTemplateById(id){return BREACH_RUPTURE_BOSSES[id]||null;}

function buildBreachRuptureBoss(breachId,raw={}){
  const breach=breachTemplateById(breachId);
  const tpl=breachRuptureTemplateById(breachId);
  if(!breach||!tpl)return null;
  const previous=Array.isArray(raw.guards)?raw.guards:[];
  const guards=tpl.guards.map(g=>{
    const old=previous.find(x=>x&&x.id===g.id)||{};
    const target=Math.max(1,Number(g.target)||1);
    return {...g,progress:Math.max(0,Math.min(target,Number(old.progress)||0))};
  });
  const startedAt=Number(raw.startedAt)||Date.now();
  return {...tpl,objective:breach.desc,guards,ruptureColor:"#ef4444",startedAt,expiresAt:Number(raw.expiresAt)||(startedAt+24*60*60*1000)};
}

function normalizeActiveBreach(entry){
  if(!entry||!entry.id)return null;
  const tpl=breachTemplateById(entry.id);if(!tpl)return null;
  const ruptureBoss=entry.ruptureBoss
    ? buildBreachRuptureBoss(tpl.id,entry.ruptureBoss)
    : null;
  return {...tpl,breachId:entry.breachId||("breach_"+(entry.startedAt||Date.now())),progress:Math.max(0,Math.min(tpl.target,Number(entry.progress)||0)),startedAt:Number(entry.startedAt)||Date.now(),expiresAt:ruptureBoss?ruptureBoss.expiresAt:(Number(entry.expiresAt)||((Number(entry.startedAt)||Date.now())+72*60*60*1000)),completedAt:entry.completedAt||null,ruptureBoss,rupturedAt:entry.rupturedAt||null,isBreach:true,alliedTeleport:entry.alliedTeleport===true};
}

function processDailyBreachRoll(state,now=Date.now()){
  const day=eventDayStr(now);
  const current=normalizeActiveBreach(state.activeBreach);
  if(current&&!current.completedAt){
    if(state.breachRollDay!==day)return {...state,activeBreach:current,breachRollDay:day};
    if(state.activeBreach&&state.activeBreach.id===current.id&&state.activeBreach.expiresAt===current.expiresAt)return state;
    return {...state,activeBreach:current};
  }
  if(state.breachRollDay===day)return state;
  if(Math.random()>=0.01)return {...state,activeBreach:null,breachRollDay:day};
  const tpl=BREACH_POOL[Math.floor(Math.random()*BREACH_POOL.length)];
  return {...state,activeBreach:{...tpl,breachId:"breach_"+now,progress:0,startedAt:now,expiresAt:now+72*60*60*1000,completedAt:null,ruptureBoss:null,isBreach:true},breachRollDay:day,breachTriggeredDay:day,specialQuests:(state.specialQuests||[]).filter(q=>q.completedAt||now>=(q.expiresAt||0)),sqCooldownUntil:next7AM(now),sqRerollDay:null};
}

function pickDungeonRuptureBoss(){
  // Compatibilité avec les anciennes sauvegardes / imports : les Boss alternatifs
  // du Contrat du Maître ont été supprimés.
  return null;
}

function pickBreachRuptureBoss(breachId){
  return buildBreachRuptureBoss(breachId);
}

export {
  buildBreachRuptureBoss,
  normalizeActiveBreach,
  processDailyBreachRoll,
  pickDungeonRuptureBoss,
  pickBreachRuptureBoss
};
