// ─── INITIALISATION ET MIGRATIONS HISTORIQUES ───────────────────────────────
// Ce fichier construit l'état initial de l'application à partir de la
// sauvegarde courante ou, à défaut, des données historiques importées.
// Il conserve également les migrations ponctuelles encore nécessaires.

import { DEFS, SP } from "./questDefs.js";
import { next7AM } from "./dayCycle.js";
import { getLvl } from "./xp.js";
import { loadStoredState } from "./storage.js";
import { cleanSystemState } from "./stateSanitizer.js";
import { normalizeActiveBreach } from "./breachEngine.js";

const loadState = () => loadStoredState(cleanSystemState);

// ─── DONNEES IMPORTEES ─────────────────────────────────────────────────────

const IMPORTED = {
  totalXp:45775, streak:6, lastActiveDay:"2026-05-11",
  streakBonusDay:"2026-05-10", weeklyBonusWk:"2026-W15", lastStreakDay:"2026-05-10",
  streakMilestones:[7,14],
  prestige:0,
  dailyLog:{
    "2026-04-06":{water:8,push:36,abs:72,sleep:1},
    "2026-04-07":{water:8,push:36,abs:72,squats:15,reading:11,flex:5,sleep:1,med:6},
    "2026-04-08":{water:11,push:100,abs:115,squats:35,reading:48,sleep:1,med:6,flex:20},
    "2026-04-09":{water:9,sleep:1,push:41,abs:64,squats:16,reading:13,flex:0,med:0},
    "2026-04-10":{water:13,sleep:1,push:77,abs:110,squats:40,reading:14,flex:5,med:20},
    "2026-04-11":{water:10,push:45,sleep:1,abs:130,flex:3,squats:25,reading:32,nosugar:1},
    "2026-04-12":{water:8,sleep:1,reading:29,push:64,abs:99,squats:37,flex:3,nosugar:1},
    "2026-04-13":{water:11,push:45,sleep:1,abs:110,squats:23,reading:14,nosugar:1},
    "2026-04-14":{push:65,abs:108,squats:25,water:10,sleep:1,reading:20,nosugar:1},
    "2026-04-15":{water:9,sleep:1,push:90,abs:111,squats:22,med:10,reading:19,nosugar:0,grips:4.2,flex:0},
    "2026-04-16":{water:12,push:106,abs:190,squats:34,reading:27,sleep:1,nosugar:1,grips:12.5,med:5},
    "2026-04-17":{water:9,push:68,abs:130,squats:42,reading:21,sleep:1,nosugar:1,grips:9},
    "2026-04-18":{water:13,sleep:1,push:75,abs:126,squats:36,nosugar:0},
    "2026-04-19":{sleep:1,water:9,nosugar:1,reading:18,push:88,abs:134,squats:32,grips:8.6,med:5},
    "2026-04-20":{sleep:1,push:68,abs:128,squats:34,water:12,nosugar:1,protein:1,reading:29,grips:9,med:5},
    "2026-04-21":{water:12,sleep:1,push:68,abs:125,squats:38,reading:22,protein:1,nosugar:1,grips:11},
    "2026-04-22":{water:8,sleep:1,push:114,abs:247,squats:46,reading:24,grips:16.7,nosugar:1,protein:1,med:5},
    "2026-04-23":{water:8,sleep:1,push:60,abs:118,squats:36,reading:7,nosugar:0,protein:1,flex:0,grips:0,med:8},
    "2026-04-24":{sleep:0,push:90,abs:126,squats:40,water:8,protein:1,grips:10.5,nosugar:1,reading:26,flex:0,med:0},
    "2026-04-25":{water:8,sleep:0,nosugar:1,protein:1,push:90,abs:126,squats:40,reading:26,grips:10.5},
    "2026-04-26":{water:10,sleep:1,nosugar:1,protein:1,push:124,abs:164,squats:46,reading:28,grips:10.5},
    "2026-04-27":{water:11,sleep:1,nosugar:0,protein:0,push:75,abs:153,squats:40,reading:31,grips:0,flex:0,med:15},
    "2026-04-28":{sleep:1,push:77,abs:155,squats:41,water:10,reading:26,protein:1,nosugar:1},
    "2026-04-29":{sleep:1,med:15,push:240,abs:213,squats:62,water:9,nosugar:0,reading:22,protein:0},
    "2026-04-30":{sleep:1,push:82,abs:150,squats:40,water:10,protein:1,reading:21,nosugar:1,grips:15},
    "2026-05-01":{sleep:1,push:70,water:9,abs:147,squats:20,grips:16,protein:0,reading:20,med:5,nosugar:0},
    "2026-05-02":{sleep:1,water:11,push:66,abs:76,squats:30,reading:11.5,grips:28,nosugar:0,protein:0},
    "2026-05-03":{water:10,sleep:1,push:90,abs:130,squats:30,grips:11,protein:1,reading:10,nosugar:1},
    "2026-05-04":{water:12,sleep:1,push:74,abs:88,squats:22,protein:1,nosugar:1,reading:14,grips:11.5,med:15},
    "2026-05-05":{water:10,sleep:1,push:76,abs:98,squats:33,protein:1,nosugar:1,calves:60,reading:22,med:15,grips:10},
    "2026-05-06":{sleep:1,push:216,abs:180,calves:224,water:11,squats:28,med:20,reading:16.5,nosugar:1,protein:1},
    "2026-05-07":{sleep:1,water:14,push:63,abs:140,squats:35,calves:95,nosugar:1,protein:1,reading:19.5,flex:0,grips:15,med:0,walk:0},
    "2026-05-08":{sleep:1,water:11,push:59,abs:125,squats:36,calves:65,nosugar:0,protein:0,reading:14,med:15,flex:0,grips:0,walk:0},
    "2026-05-09":{sleep:1,water:10,push:103,abs:150,squats:32,calves:100,walk:3,nosugar:0,med:12,protein:0,grips:10,reading:15},
    "2026-05-10":{water:11,sleep:1,push:69,abs:150,squats:45,calves:70,reading:24,nosugar:0,protein:0,flex:0,grips:12,med:15,walk:3,run:4.51},
    "2026-05-11":{water:4,sleep:1,abs:127,push:56,squats:35,calves:45}
  },
  weeklyLog:{"2026-W15":{run:13},"2026-W16":{run:8.52},"2026-W17":{walk:6.5,run:0},"2026-W18":{run:12.56,walk:8},"2026-W19":{run:10.42,walk:3}},
  stats:{Sante:getLvl(10100),Force:getLvl(13488),Esprit:getLvl(12700),Endurance:getLvl(2962),Agilite:getLvl(1652),Discipline:getLvl(3150)},
  statXp:{Sante:10100,Force:13488,Esprit:12700,Endurance:2962,Agilite:1652,Discipline:3150},
  specialQuests:[],
  sqCooldownUntil:null,
  activeBreach:null,
  alliedGiftPending:null,
  breachRollDay:null,
  breachTriggeredDay:null,
  activeDungeon:null,
  dungeonRunDay:null,
  dungeonSkipDay:null,
  dungeonRunsByWeek:{},
  dungeonLog:[],
  ruptureMalus:null,
  dailyExtraXp:{},
  sqRerollDay:null,
  completedSqLog:[],
  sqDrawLog:[],
  sqStatCycle:[],
  regressionLog:{},
  enduranceChoiceByDay:{},
  exerciseRotationByDay:{},
  dailyCompletionAnimDay:null,
  bonusCompletionAnimDay:null,
  masterContractArmed:false,
  recordChallenge:null,
  urgentCompassStat:null,
  suspendedElixir:null,
  urgentTokenUseDay:null,
  alchemicalCatalystArmed:false,
  objectives:DEFS,
};

export function migrateGripsToMin(dailyLog){
  // Grips était en secondes (xpPer:0.1), maintenant en minutes (xpPer:10)
  // Seuil : si valeur > 30 on suppose que c'est des secondes → convertir
  // (personne ne fait 30+ min de hand grips d'une traite)
  const out={};
  for(const [day,log] of Object.entries(dailyLog)){
    if(log.grips!=null && log.grips>60){
      out[day]={...log, grips:Math.round(log.grips/60*10)/10};
    } else {
      out[day]=log;
    }
  }
  return out;
}

function migrateSleepToHours(dailyLog){
  // Ancienne version : Sommeil était binaire (0/1 nuit).
  // Nouvelle version : la durée est enregistrée en heures avec un objectif fixe de 8 h.
  const out={};
  for(const [day,log] of Object.entries(dailyLog||{})){
    const row={...(log||{})};
    if(row.sleep===1) row.sleep=8;
    out[day]=row;
  }
  return out;
}

function resetInvalidRunningRecord(dailyLog){
  const out={};
  for(const [day,log] of Object.entries(dailyLog||{})){
    const row={...(log||{})};
    const run=Number(row.run);
    // Ancienne valeur erronée qui alimentait le record journalier Running.
    if(Number.isFinite(run) && (
      Math.abs(run-15.1)<0.001 ||
      Math.abs(run-15.09)<0.001 ||
      Math.abs(run-10.12)<0.001
    )) delete row.run;
    out[day]=row;
  }
  return out;
}

export function buildInitialState(){
  const saved=loadState();
  if(!saved)return {...IMPORTED,dailyLog:resetInvalidRunningRecord(migrateSleepToHours(IMPORTED.dailyLog)),sleepHoursMigrated:true};
  const sourceLog=saved.sleepHoursMigrated
    ? (saved.dailyLog||IMPORTED.dailyLog)
    : migrateSleepToHours(saved.dailyLog||IMPORTED.dailyLog);
  const migratedLog=resetInvalidRunningRecord(migrateGripsToMin(sourceLog));
  const out={
    ...IMPORTED,
    ...saved,
    objectives:DEFS,
    specialQuests:saved.specialQuests||[],
    sqCooldownUntil:saved.sqCooldownUntil||null,
    activeBreach:normalizeActiveBreach(saved.activeBreach),
    alliedGiftPending:saved.alliedGiftPending||null,
    breachRollDay:saved.breachRollDay||null,
    breachTriggeredDay:saved.breachTriggeredDay||null,
    sqRerollDay:saved.sqRerollDay||null,
    activeDungeon:saved.activeDungeon||null,
    dungeonRunDay:saved.dungeonRunDay||null,
    dungeonSkipDay:saved.dungeonSkipDay||null,
    dungeonRunsByWeek:saved.dungeonRunsByWeek||{},
    dungeonLog:saved.dungeonLog||[],
    inventory:saved.inventory||{majorElixir:0,minorElixir:0,supremeElixir:0,transmutationGrimoire:0,masterContract:0,recordHammer:0,teleportCrystal:0,invisibilityCape:0,debtAcknowledgement:0,destinyCompass:0,etherStopper:0,rerollToken:0,alchemicalCatalyst:0},
    masterContractArmed:saved.masterContractArmed===true,
    recordChallenge:saved.recordChallenge||null,
    urgentCompassStat:saved.urgentCompassStat||null,
    suspendedElixir:saved.suspendedElixir||null,
    urgentTokenUseDay:saved.urgentTokenUseDay||null,
    alchemicalCatalystArmed:saved.alchemicalCatalystArmed===true,
    dungeonAccessOpen:saved.dungeonAccessOpen===true,
    activeElixir:saved.activeElixir||null,
    ruptureMalus:saved.ruptureMalus||null,
    dailyExtraXp:saved.dailyExtraXp||IMPORTED.dailyExtraXp||{},
    regressionLog:saved.regressionLog||{},
    enduranceChoiceByDay:saved.enduranceChoiceByDay||{},
    exerciseRotationByDay:saved.exerciseRotationByDay||{},
    completedSqLog:saved.completedSqLog||[],
    sqDrawLog:saved.sqDrawLog||[],
    sqStatCycle:saved.sqStatCycle||[],
    stats:saved.stats||IMPORTED.stats,
    statXp:saved.statXp||IMPORTED.statXp,
    dailyLog:migratedLog,
    sleepHoursMigrated:true,
    weeklyLog:saved.weeklyLog||IMPORTED.weeklyLog,
    totalXp:Math.max(saved.totalXp||0, IMPORTED.totalXp),
    prestige:saved.prestige||IMPORTED.prestige||0,
  };
  // Recalcul defensif: rebuild stats levels from statXp (cohérence après changement de formule)
  const recomputed={};
  Object.keys(out.statXp).forEach(k=>{ recomputed[k]=getLvl(out.statXp[k]||0); });
  out.stats=recomputed;
  // Migration: re-aligner expiresAt des SQ actives sur le prochain 7h
  // et des épreuves actives sur le prochain lundi 7h
  const removedSpecialQuestIds=new Set(["sp_lunge","sp_plank","sp_deadhang","sp_pull","sp_dips"]);
  const validSpecialQuestIds=new Set(
    Object.values(SP).flat().map(q=>q.id).filter(Boolean)
  );
  const isRemovedOrOrphanedSpecialQuest=q=>!!(
    q && (
      removedSpecialQuestIds.has(q.id) ||
      !validSpecialQuestIds.has(q.id)
    )
  );
  const hadRemovedActive=(out.specialQuests||[]).some(q=>isRemovedOrOrphanedSpecialQuest(q)&&!q.completedAt);
  out.specialQuests = (out.specialQuests||[])
    .filter(q=>!isRemovedOrOrphanedSpecialQuest(q))
    .map(q=>{
      if(q.completedAt) return q;
      // Pour une quête active, expiresAt = prochain 7h après startedAt
      return {...q, expiresAt: next7AM(q.startedAt||Date.now())};
    });
  out.completedSqLog=(out.completedSqLog||[]).filter(entry=>{
    const id=typeof entry==="string"?entry:entry&&entry.id;
    return !id || validSpecialQuestIds.has(id);
  });
  // Migration du nouveau journal de tirages : on reprend l'historique existant et
  // la quête actuellement visible afin qu'une Relance ne réinitialise pas son cycle.
  const drawCandidates=[...(out.sqDrawLog||[]),...(out.completedSqLog||[]),...(out.specialQuests||[])];
  const drawSeen=new Set();
  out.sqDrawLog=drawCandidates.map(entry=>{
    if(!entry) return null;
    const id=typeof entry==="string"?entry:entry.id;
    if(!id || !validSpecialQuestIds.has(id)) return null;
    const sqid=typeof entry==="string"?("legacy_"+id):entry.sqid||("legacy_"+id+"_"+(entry.drawnAt||entry.startedAt||entry.completedAt||0));
    if(drawSeen.has(sqid)) return null;
    drawSeen.add(sqid);
    return {sqid,id,stat:entry.stat||null,drawnAt:Number(entry.drawnAt||entry.startedAt||entry.completedAt)||Date.now()};
  }).filter(Boolean).slice(-120);
  if(hadRemovedActive) {
    out.sqCooldownUntil=null;
    out.sqRerollDay=null;
  }
  if(out.activeDungeon && !out.activeDungeon.completedAt){
    const ad=out.activeDungeon;
    if(ad.ruptureBoss && !ad.contractConstraint) out.activeDungeon=null;
    else out.activeDungeon={...ad,ruptureBoss:null,rupturedAt:null};
  }
  return out;
}
