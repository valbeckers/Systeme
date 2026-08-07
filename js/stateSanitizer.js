import { STATS } from "./config.js";
import { DEFS, SP } from "./questDefs.js";
import { DUNGEONS } from "./dungeonDefs.js";
import { todayStr, next7AM } from "./dayCycle.js";
import { getLvl } from "./xp.js";
import { normalizeActiveBreach } from "./breachEngine.js";
import { cleanStoredActiveElixir, cleanStoredSuspendedElixir } from "./elixirEngine.js";
import { cleanExerciseRotationByDay } from "./exerciseRotation.js";

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

function cleanSpecialQuestEntry(q,map){
  if(!q || !q.id || !map[q.id]) return null;
  const tpl=map[q.id];
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
  if(!q || !q.id || !map[q.id] || !q.completedAt) return null;
  const tpl=map[q.id];
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
  if(!id || !map[id]) return null;
  const tpl=map[id];
  const drawnAt=Number((typeof q==="object"&&(q.drawnAt||q.startedAt||q.completedAt))||0)||Date.now();
  return {
    sqid:(typeof q==="object"&&q.sqid)||("draw_"+drawnAt+"_"+id),
    id:tpl.id,
    stat:normalizeLegacyStat(tpl.stat),
    drawnAt
  };
}

function cleanDailyExtraXp(extra){
  const allowed=new Set(["eventBonus","sq","breach","dungeon","streak","debt"]);
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

function cleanDungeonLog(log){
  const map={};
  (DUNGEONS||[]).forEach(d=>{ map[d.id]=d; });
  return (log||[]).filter(e=>e&&e.id&&map[e.id]).map(e=>{
    const d=map[e.id];
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

function cleanEnduranceChoiceByDay(obj){
  const out={};
  Object.entries(obj||{}).forEach(([day,id])=>{
    if((id==="run"||id==="walk"||id==="march") && /^\d{4}-\d{2}-\d{2}$/.test(day)) out[day]=id;
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

export function cleanSystemState(raw){
  const data=migrateRuntimeQuestDefinitions(migrateMergedEspritState({...((raw&&typeof raw==="object")?raw:{})}));
  const dailyIds=new Set(DEFS.filter(o=>o.daily).map(o=>o.id));
  const weeklyIds=new Set(DEFS.filter(o=>o.weekly).map(o=>o.id));
  const spMap=activeSpecialQuestMap();
  const statPack=cleanStatLevelsFromXp(data.statXp,data.stats);

  const specialQuests=(data.specialQuests||[])
    .map(q=>cleanSpecialQuestEntry(q,spMap))
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
    prestige:Number(data.prestige)||0,
    dailyLog:cleanQuestLogByIds(data.dailyLog,dailyIds),
    weeklyLog:cleanQuestLogByIds(data.weeklyLog,weeklyIds),
    stats:statPack.stats,
    statXp:statPack.statXp,
    specialQuests,
    sqCooldownUntil:data.sqCooldownUntil||null,
    activeBreach:normalizeActiveBreach(data.activeBreach),
    alliedGiftPending:(data.alliedGiftPending&&data.alliedGiftPending.breachId)?{
      breachId:String(data.alliedGiftPending.breachId),
      breachName:String(data.alliedGiftPending.breachName||"Brèche alliée"),
      createdAt:Number(data.alliedGiftPending.createdAt)||Date.now()
    }:null,
    breachRollDay:data.breachRollDay||null,
    breachTriggeredDay:data.breachTriggeredDay||null,
    activeDungeon:data.activeDungeon||null,
    dungeonRunDay:data.dungeonRunDay||null,
    dungeonSkipDay:data.dungeonSkipDay||null,
    dungeonRunsByWeek:cleanDungeonRunWeeks(data.dungeonRunsByWeek),
    dungeonKeyRollDay:data.dungeonKeyRollDay||null,
    dungeonKeys:Math.max(0,Math.floor(Number(data.dungeonKeys) || ((data.dungeonKeyRollWon===true && data.dungeonKeyDay)?1:0))),
    inventory:{
      majorElixir:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.majorElixir)||0)),
      minorElixir:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.minorElixir)||0)),
      supremeElixir:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.supremeElixir)||0)),
      transmutationGrimoire:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.transmutationGrimoire)||0)),
      masterContract:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.masterContract)||0)),
      recordHammer:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.recordHammer)||0)),
      teleportCrystal:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.teleportCrystal)||0)),
      invisibilityCape:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.invisibilityCape)||0)),
      debtAcknowledgement:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.debtAcknowledgement)||0)),
      destinyCompass:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.destinyCompass)||0)),
      mysteryMap:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.mysteryMap)||0)),
      etherStopper:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.etherStopper)||0)),
      rerollToken:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.rerollToken)||0)),
      alchemicalCatalyst:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.alchemicalCatalyst)||0)),
      recoveryOintment:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.recoveryOintment)||0)),
      counterpartBalance:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.counterpartBalance)||0))
    },
    masterContractArmed:data.masterContractArmed===true,
    recordChallenge:data.recordChallenge||null,
    urgentCompassStat:STATS.includes(data.urgentCompassStat)?data.urgentCompassStat:null,
    dungeonMapStat:STATS.includes(data.dungeonMapStat)?data.dungeonMapStat:null,
    suspendedElixir:cleanStoredSuspendedElixir(data.suspendedElixir),
    urgentTokenUseDay:data.urgentTokenUseDay||null,
    alchemicalCatalystArmed:data.alchemicalCatalystArmed===true,
    dungeonAccessOpen:data.dungeonAccessOpen===true,
    activeElixir:cleanStoredActiveElixir(data.activeElixir),
    ruptureMalus:(data.ruptureMalus&&Number(data.ruptureMalus.expiresAt)>Date.now())?{pct:-0.25,startedAt:Number(data.ruptureMalus.startedAt)||Date.now(),expiresAt:Number(data.ruptureMalus.expiresAt)}:null,
    dungeonKeyDay:data.dungeonKeyDay||null,
    dungeonKeyRollWon:data.dungeonKeyRollWon===true,
    dungeonLog:cleanDungeonLog(data.dungeonLog),
    dailyExtraXp:cleanDailyExtraXp(data.dailyExtraXp),
    sqRerollDay:data.sqRerollDay||null,
    questDebt:data.questDebt||null,
    debtUsesByWeek:data.debtUsesByWeek||{},
    debtUseDay:data.debtUseDay||null,
    debtStreakRollMilestones:Array.isArray(data.debtStreakRollMilestones)?data.debtStreakRollMilestones:[],
    debtResolvedDays:data.debtResolvedDays||{},
    regressionLog:cleanRegressionLog(data.regressionLog),
    enduranceChoiceByDay:cleanEnduranceChoiceByDay(data.enduranceChoiceByDay),
    exerciseRotationByDay:cleanExerciseRotationByDay(data.exerciseRotationByDay),
    dailyCompletionAnimDay:data.dailyCompletionAnimDay||null,
    bonusCompletionAnimDay:data.bonusCompletionAnimDay||null,
    completedSqLog,
    sqDrawLog,
    sqStatCycle
  };
}

export function exportSystemState(state){
  return cleanSystemState(state);
}
