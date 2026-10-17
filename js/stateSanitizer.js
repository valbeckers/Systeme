import { STATS } from "./config.js";
import { DEFS, SP } from "./questDefs.js?v=20261017-vacuum-v1";
import { BONUS_QUESTS } from "./bonusQuestDefs.js?v=20261017-editor-v1";
import { DUNGEONS } from "./dungeonDefs.js?v=20261017-editor-v1";
import { todayStr, next7AM } from "./dayCycle.js";
import { getLvl } from "./xp.js";
import { normalizeActiveBreach } from "./breachEngine.js?v=20261017-editor-v1";
import { cleanExerciseRotationByDay, cleanExerciseRotationEnabled } from "./exerciseRotation.js?v=20261017-editor-v1";
import { cleanInjuryPeriods } from "./injuryEngine.js?v=20261017-editor-v1";
import { cleanQuestTuning, applyQuestTuning } from "./questTuning.js?v=20261017-vacuum-v1";
import { cleanDrawPreferences, cleanDrawSnapshots } from "./drawPreferences.js?v=20261017-vacuum-v1";
import { cleanQuestCatalog } from "./questCatalog.js?v=20261017-editor-v1";

function migrateMergedEspritState(state){
  if(!state || typeof state !== "object") return state;
  const merge = obj => {
    if(!obj || typeof obj !== "object") return obj;
    const intelligence = Number(obj.Intelligence||0);
    const concentration = Number(obj.Concentration||0);
    if(intelligence || concentration || obj.Esprit==null){
      obj.Esprit = Number(obj.Esprit||0) + intelligence + concentration;
    }
    delete obj.Intelligence;
    delete obj.Concentration;
    return obj;
  };
  state.statXp = merge({...state.statXp});
  state.stats = {...(state.stats||{})};
  if(state.statXp.Esprit!=null){
    state.stats.Esprit = getLvl(state.statXp.Esprit);
  }else{
    state.stats = merge(state.stats);
  }
  delete state.stats.Intelligence;
  delete state.stats.Concentration;
  return state;
}

function migrateRuntimeQuestDefinitions(state){
  if(!state || typeof state !== "object") return state;

  const specialById = {};
  Object.entries(SP).forEach(([stat,list]) => (list||[]).forEach(q => { specialById[q.id] = {...q,stat:q.stat||stat}; }));
  if(Array.isArray(state.specialQuests)){
    state.specialQuests = state.specialQuests
      .map(q => {
        const tpl = specialById[q.id];
        if(!tpl) return q;
        return {
          ...q,
          ...tpl,
          sqid:q.sqid,
          progress:q.progress,
          startedAt:q.startedAt,
          expiresAt:q.expiresAt,
          completedAt:q.completedAt,
          summonedByToken:q.summonedByToken===true
        };
      });
  }

  return state;
}

function normalizeLegacyStat(stat){
  if(stat==="Intelligence" || stat==="Concentration") return "Esprit";
  return stat;
}

function activeSpecialQuestMap(){
  const map={};
  Object.entries(SP).forEach(([stat,list])=>(list||[]).forEach(q=>{ map[q.id]={...q,stat:q.stat||stat}; }));
  return map;
}

function cleanQuestLogByIds(log,allowedIds){
  const out={};
  Object.entries(log||{}).forEach(([day,items])=>{
    if(!items || typeof items!=="object") return;
    const row={};
    Object.entries(items).forEach(([id,val])=>{
      if(!allowedIds.has(id)) return;
      const n=Number(val);
      row[id]=Number.isFinite(n) ? n : val;
    });
    if(Object.keys(row).length) out[day]=row;
  });
  return out;
}

function cleanStatsObject(obj){
  const out={};
  STATS.forEach(stat=>{ out[stat]=0; });
  Object.entries(obj||{}).forEach(([stat,val])=>{
    const s=normalizeLegacyStat(stat);
    if(!STATS.includes(s)) return;
    const n=Number(val)||0;
    out[s]=(out[s]||0)+n;
  });
  return out;
}

function cleanStatLevelsFromXp(statXp,existingStats){
  const sx=cleanStatsObject(statXp||{});
  const hasXp=Object.values(sx).some(v=>v>0);
  if(hasXp){
    const levels={};
    STATS.forEach(stat=>{ levels[stat]=getLvl(sx[stat]||0); });
    return {statXp:sx,stats:levels};
  }
  const st=cleanStatsObject(existingStats||{});
  return {statXp:sx,stats:st};
}

function cleanSpecialQuestEntry(q,map,tuning){
  if(!q || !q.id || !map[q.id]) return null;
  const tpl=applyQuestTuning(map[q.id],tuning,todayStr(q.startedAt||Date.now()));
  return {
    ...tpl,
    sqid:q.sqid || ("sq_"+(q.startedAt||Date.now())),
    progress:q.progress==null ? 0 : q.progress,
    startedAt:q.startedAt || Date.now(),
    expiresAt:q.expiresAt || next7AM(q.startedAt||Date.now()),
    completedAt:q.completedAt || null,
    summonedByToken:q.summonedByToken===true
  };
}

function cleanCompletedSqLogEntry(q,map){
  if(!q || !q.id || !q.completedAt) return null;
  const tpl=map[q.id]||{id:q.id,name:q.name||"Quête urgente",icon:q.icon||"✦",xp:q.xp||0,stat:q.stat};
  return {
    sqid:q.sqid || ("sq_"+q.completedAt),
    id:tpl.id,
    name:tpl.name,
    icon:tpl.icon,
    xp:tpl.xp || 0,
    stat:normalizeLegacyStat(tpl.stat),
    completedAt:q.completedAt
  };
}

function cleanSqDrawLogEntry(q,map){
  if(!q) return null;
  const id=typeof q==="string"?q:q.id;
  if(!id||!/^[a-z][a-z0-9_]{2,63}$/.test(id)) return null;
  const tpl=map[id]||{id,stat:typeof q==="object"?q.stat:null};
  const drawnAt=Number((typeof q==="object"&&(q.drawnAt||q.startedAt||q.completedAt))||0)||Date.now();
  return {
    sqid:(typeof q==="object"&&q.sqid)||("draw_"+drawnAt+"_"+id),
    id:tpl.id,
    stat:normalizeLegacyStat(tpl.stat),
    drawnAt
  };
}

function cleanDailyExtraXp(extra){
  const allowed=new Set(["eventBonus","sq","breach","dungeon","streak","debt","elanBonus","inertiaMalus","regressionMalus"]);
  const out={};
  Object.entries(extra||{}).forEach(([day,row])=>{
    if(!row || typeof row!=="object") return;
    const clean={};
    Object.entries(row).forEach(([k,v])=>{
      if(!allowed.has(k)) return;
      const n=Number(v)||0;
      if(n!==0) clean[k]=n;
    });
    if(Object.keys(clean).length) out[day]=clean;
  });
  return out;
}

function cleanDungeonLog(log,catalog={}){
  const map={};
  (DUNGEONS||[]).forEach(d=>{ map[d.id]=d; });
  Object.values(cleanQuestCatalog(catalog)).filter(q=>q.kind==="dungeon").forEach(q=>{if(!map[q.id])map[q.id]={id:q.id,title:q.name,stat:q.stat};});
  return (log||[]).filter(e=>e&&typeof e.id==="string"&&/^[a-z][a-z0-9_]{2,63}$/.test(e.id)&&Number(e.completedAt)>0).map(e=>{
    const d=map[e.id]||{id:e.id,title:String(e.title||"Donjon"),stat:STATS.includes(e.stat)?e.stat:"Discipline"};
    const rb=e.ruptureBoss&&typeof e.ruptureBoss==="object" ? {
      id:e.ruptureBoss.id||null,
      name:e.ruptureBoss.name||"Boss de Rupture",
      objective:e.ruptureBoss.objective||""
    } : null;
    return {
      id:d.id,title:d.title,stat:d.stat,xp:e.xp||0,completedAt:e.completedAt,
      expiresAt:e.expiresAt||((e.completedAt||0)+86400000),
      rupture:!!e.rupture,ruptureBoss:rb
    };
  });
}

function cleanDungeonRunWeeks(obj){
  const out={};
  Object.entries(obj||{}).forEach(([wk,val])=>{
    const n=Number(val)||0;
    if(n>0) out[wk]=n;
  });
  return out;
}

function cleanSuspendedDungeon(value){
  if(!value||typeof value!=="object"||!value.dungeon||typeof value.dungeon!=="object")return null;
  const remainingMs=Math.max(0,Number(value.remainingMs)||0);
  const resumeDeadline=Number(value.resumeDeadline)||0;
  if(!remainingMs||!resumeDeadline)return null;
  const deadlineRemaining={};
  ["expiresAt","contractOriginalExpiresAt","chainDeadline","pressureDeadline"].forEach(field=>{
    const n=Number(value.deadlineRemaining&&value.deadlineRemaining[field]);
    if(Number.isFinite(n)&&n>=0)deadlineRemaining[field]=n;
  });
  return {
    id:value.dungeon.id||value.id,
    runId:value.dungeon.runId||value.runId,
    startedAt:Number(value.dungeon.startedAt||value.startedAt)||Date.now(),
    suspendedAt:Number(value.suspendedAt)||Date.now(),
    resumeDeadline,
    remainingMs,
    deadlineRemaining,
    dungeon:{...value.dungeon,anchorUsed:true}
  };
}

function cleanEnduranceChoiceByDay(obj){
  const out={};
  Object.entries(obj||{}).forEach(([day,id])=>{
    if((id==="run"||id==="walk"||id==="march") && /^\d{4}-\d{2}-\d{2}$/.test(day)) out[day]=id;
  });
  return out;
}

function cleanSelectedBonusQuestIdsByDay(obj,dailyLog,catalog){
  const allowed=new Set([...BONUS_QUESTS.map(q=>q.id),...Object.keys(cleanQuestCatalog(catalog))]);
  const out={};
  Object.entries(obj||{}).forEach(([day,ids])=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Array.isArray(ids))return;
    const clean=[...new Set(ids.filter(id=>allowed.has(id)))];
    if(clean.length)out[day]=clean;
  });
  // Migration douce : toute ancienne quête bonus réellement renseignée reste
  // sélectionnée sur son jour, sans inventer de sélection vide.
  Object.entries(dailyLog||{}).forEach(([day,row])=>{
    const progressed=Object.keys(row||{}).filter(id=>allowed.has(id)&&Number(row[id])>0);
    if(progressed.length)out[day]=[...new Set([...(out[day]||[]),...progressed])];
  });
  return out;
}

function cleanRegressionLog(obj){
  const out={};
  Object.entries(obj||{}).forEach(([day,activated])=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;

    // Anciennes sauvegardes : la valeur était simplement `true`.
    if(activated===true){
      out[day]=true;
      return;
    }

    // Depuis l'Orbe de régression, le journal mémorise l'identifiant de la
    // régression (ex. `reg_red`). Il faut conserver cette chaîne : la convertir
    // avec Number(...) la transformait en NaN et supprimait l'entrée à la
    // sauvegarde, ce qui faisait disparaître la régression de l'Historique.
    if(typeof activated==="string" && activated.trim()){
      out[day]=activated.trim();
      return;
    }

    // Compatibilité avec d'éventuelles anciennes valeurs numériques.
    if(Number(activated)>0) out[day]=true;
  });
  return out;
}

function cleanWeeklySummaries(items){
  if(!Array.isArray(items))return [];
  const seen=new Set();
  return items.map(item=>{
    if(!item||!/^\d{4}-W\d{2}$/.test(String(item.weekKey||""))||seen.has(item.weekKey))return null;
    seen.add(item.weekKey);
    return {
      weekKey:item.weekKey,
      startDay:item.startDay||null,
      endDay:item.endDay||null,
      createdAt:Number(item.createdAt)||Date.now(),
      xp:Number(item.xp)||0,
      regressionsExcluded:item.regressionsExcluded===true,
      successfulDays:Math.max(0,Math.min(7,Math.floor(Number(item.successfulDays)||0))),
      bestStreak:Math.max(0,Math.min(7,Math.floor(Number(item.bestStreak)||0))),
      dungeons:Math.max(0,Math.floor(Number(item.dungeons)||0)),
      portals:Math.max(0,Math.floor(Number(item.portals)||0)),
      professional:Array.isArray(item.professional)?item.professional.map(entry=>({
        id:String(entry&&entry.id||""),
        name:String(entry&&entry.name||""),
        unit:String(entry&&entry.unit||""),
        value:Number(entry&&entry.value)||0,
        target:Number(entry&&entry.target)||0,
        done:entry&&entry.done===true,
        bonusXp:Number(entry&&entry.bonusXp)||0
      })).filter(entry=>entry.id):[],
      professionalBonusXp:Number(item.professionalBonusXp)||0,
      streakBonusXp:Number(item.streakBonusXp)||0
    };
  }).filter(Boolean).sort((a,b)=>String(a.weekKey).localeCompare(String(b.weekKey)));
}

function cleanWeeklySummaryTracking(value){
  if(!value||!/^\d{4}-W\d{2}$/.test(String(value.weekKey||"")))return null;
  return {
    weekKey:value.weekKey,
    lastTotalXp:Number(value.lastTotalXp)||0,
    earnedXp:Number(value.earnedXp)||0
  };
}

function cleanWeightLog(value){
  if(!Array.isArray(value))return [];
  return value.filter(entry=>entry&&/^\d{4}-\d{2}-\d{2}$/.test(entry.date||"")&&
    Number.isFinite(Number(entry.weight))&&Number(entry.weight)>0&&Number(entry.weight)<=500&&
    Number.isFinite(Number(entry.recordedAt))&&Number(entry.recordedAt)>0)
    .map(entry=>({date:entry.date,weight:Number(entry.weight),recordedAt:Number(entry.recordedAt)}))
    .sort((a,b)=>a.recordedAt-b.recordedAt).slice(-5000);
}

export function cleanSystemState(raw){
  const data=migrateRuntimeQuestDefinitions(migrateMergedEspritState({...((raw&&typeof raw==="object")?raw:{})}));
  const catalogIds=Object.keys(cleanQuestCatalog(data.questCatalog));
  const dailyIds=new Set([...DEFS.filter(o=>o.daily).map(o=>o.id),...BONUS_QUESTS.map(o=>o.id),...catalogIds,"bonus_pullups","bonus_negative_pullups","bonus_australian_pullups"]);
  const weeklyIds=new Set([...DEFS.filter(o=>o.weekly).map(o=>o.id),...catalogIds]);
  const spMap=activeSpecialQuestMap();
  const statPack=cleanStatLevelsFromXp(data.statXp,data.stats);

  const specialQuests=(data.specialQuests||[])
    .map(q=>cleanSpecialQuestEntry(q,spMap,data.questTuning))
    .filter(Boolean);

  const completedSqLog=(data.completedSqLog||[])
    .map(q=>cleanCompletedSqLogEntry(q,spMap))
    .filter(Boolean);

  const sqDrawLog=(data.sqDrawLog||[])
    .map(q=>cleanSqDrawLogEntry(q,spMap))
    .filter(Boolean)
    .slice(-120);

  const sqStatCycle=(data.sqStatCycle||[])
    .map(normalizeLegacyStat)
    .filter(stat=>STATS.includes(stat));

  return {
    totalXp:Number(data.totalXp)||0,
    streak:Number(data.streak)||0,
    lastActiveDay:data.lastActiveDay||todayStr(),
    streakBonusDay:data.streakBonusDay||null,
    weeklyBonusWk:data.weeklyBonusWk||null,
    lastStreakDay:data.lastStreakDay||null,
    streakMilestones:Array.isArray(data.streakMilestones)?data.streakMilestones:[],
    xpMomentumLastProcessedDay:data.xpMomentumLastProcessedDay||todayStr(),
    xpMomentumVersion:Math.max(1,Math.floor(Number(data.xpMomentumVersion)||1)),
    inertiaMissedDays:Math.max(0,Math.floor(Number(data.inertiaMissedDays)||0)),
    inertiaPercent:Math.min(5,Math.max(0,Number(data.inertiaPercent)||0)),
    prestige:Number(data.prestige)||0,
    dailyLog:cleanQuestLogByIds(data.dailyLog,dailyIds),
    weightLog:cleanWeightLog(data.weightLog),
    injuryPeriods:cleanInjuryPeriods(data.injuryPeriods),
    weeklyLog:cleanQuestLogByIds(data.weeklyLog,weeklyIds),
    weeklySummaries:cleanWeeklySummaries(data.weeklySummaries),
    weeklySummaryTracking:cleanWeeklySummaryTracking(data.weeklySummaryTracking),
    weeklyQuestRewardPendingWeek:typeof data.weeklyQuestRewardPendingWeek==="string"?data.weeklyQuestRewardPendingWeek:null,
    weeklyQuestRewardClaimedWeeks:[...new Set((Array.isArray(data.weeklyQuestRewardClaimedWeeks)?data.weeklyQuestRewardClaimedWeeks:[]).filter(value=>typeof value==="string"))].slice(-104),
    stats:statPack.stats,
    statXp:statPack.statXp,
    specialQuests,
    sqCooldownUntil:data.sqCooldownUntil||null,
    sqFailureDay:typeof data.sqFailureDay==="string"?data.sqFailureDay:null,
    activeBreach:normalizeActiveBreach(data.activeBreach),
    completedBreach:data.completedBreach&&Number.isFinite(Number(data.completedBreach.completedAt))&&Number(data.completedBreach.completedAt)>0?{
      name:String(data.completedBreach.name||""),
      stat:STATS.includes(data.completedBreach.stat)?data.completedBreach.stat:null,
      completedAt:Number(data.completedBreach.completedAt)
    }:null,
    alliedGiftPending:(data.alliedGiftPending&&data.alliedGiftPending.breachId)?{
      breachId:String(data.alliedGiftPending.breachId),
      breachName:String(data.alliedGiftPending.breachName||"Portail allié"),
      createdAt:Number(data.alliedGiftPending.createdAt)||Date.now()
    }:null,
    breachRollDay:data.breachRollDay||null,
    breachTriggeredDay:data.breachTriggeredDay||null,
    activeDungeon:data.activeDungeon||null,
    suspendedDungeon:data.activeDungeon?null:cleanSuspendedDungeon(data.suspendedDungeon),
    dungeonRunDay:data.dungeonRunDay||null,
    dungeonSkipDay:data.dungeonSkipDay||null,
    dungeonRunsByWeek:cleanDungeonRunWeeks(data.dungeonRunsByWeek),
    dungeonKeyRollDay:data.dungeonKeyRollDay||null,
    dungeonKeys:Math.max(0,Math.floor(Number(data.dungeonKeys) || ((data.dungeonKeyRollWon===true && data.dungeonKeyDay)?1:0))),
    inventory:{
      masterContract:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.masterContract)||0)),
      recordHammer:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.recordHammer)||0)),
      teleportCrystal:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.teleportCrystal)||0)),
      invisibilityCape:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.invisibilityCape)||0)),
      debtAcknowledgement:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.debtAcknowledgement)||0)),
      destinyCompass:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.destinyCompass)||0)),
      mysteryMap:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.mysteryMap)||0)),
      rerollToken:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.rerollToken)||0)),
      rewriteRune:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.rewriteRune)||0)),
      recoveryOintment:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.recoveryOintment)||0)),
      counterpartBalance:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.counterpartBalance)||0))
      ,dimensionalAnchor:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.dimensionalAnchor)||0))
    },
    masterContractArmed:data.masterContractArmed===true,
    recordChallenge:data.recordChallenge||null,
    urgentCompassStat:STATS.includes(data.urgentCompassStat)?data.urgentCompassStat:null,
    dungeonMapStat:STATS.includes(data.dungeonMapStat)?data.dungeonMapStat:null,
    urgentTokenUseDay:data.urgentTokenUseDay||null,
    dungeonAccessOpen:data.dungeonAccessOpen===true,
    ruptureMalus:(data.ruptureMalus&&Number(data.ruptureMalus.expiresAt)>Date.now())?{pct:-0.25,startedAt:Number(data.ruptureMalus.startedAt)||Date.now(),expiresAt:Number(data.ruptureMalus.expiresAt)}:null,
    dungeonKeyDay:data.dungeonKeyDay||null,
    dungeonKeyRollWon:data.dungeonKeyRollWon===true,
    dungeonLog:cleanDungeonLog(data.dungeonLog,data.questCatalog),
    dailyExtraXp:cleanDailyExtraXp(data.dailyExtraXp),
    sqRerollDay:data.sqRerollDay||null,
    questDebt:data.questDebt||null,
    debtUsesByWeek:data.debtUsesByWeek||{},
    debtUseDay:data.debtUseDay||null,
    debtStreakRollMilestones:Array.isArray(data.debtStreakRollMilestones)?data.debtStreakRollMilestones:[],
    debtResolvedDays:data.debtResolvedDays||{},
    regressionLog:cleanRegressionLog(data.regressionLog),
    enduranceChoiceByDay:cleanEnduranceChoiceByDay(data.enduranceChoiceByDay),
    selectedBonusQuestIdsByDay:cleanSelectedBonusQuestIdsByDay(data.selectedBonusQuestIdsByDay,data.dailyLog,data.questCatalog),
    exerciseRotationByDay:cleanExerciseRotationByDay(data.exerciseRotationByDay),
    exerciseRotationEnabled:cleanExerciseRotationEnabled(data.exerciseRotationEnabled),
    drawPreferences:cleanDrawPreferences(data.drawPreferences,data.questCatalog),
    dailyDrawByDay:cleanDrawSnapshots(data.dailyDrawByDay,"daily"),
    vacuumDailyAdded:data.vacuumDailyAdded===true,
    questTuning:cleanQuestTuning(data.questTuning),
    questCatalog:cleanQuestCatalog(data.questCatalog),
    dailyCompletionAnimDay:data.dailyCompletionAnimDay||null,
    bonusCompletionAnimDay:data.bonusCompletionAnimDay||null,
    bonusFiveCompletionDay:data.bonusFiveCompletionDay||null,
    completedSqLog,
    sqDrawLog,
    sqStatCycle
  };
}

export function exportSystemState(state){
  return cleanSystemState(state);
}
