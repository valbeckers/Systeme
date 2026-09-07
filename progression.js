import { RANK_STAT_REQUIREMENTS, STATS } from "./config.js";
import { DEFS } from "./questDefs.js";

// Compte combien de statistiques atteignent un niveau seuil.
export function countStatsAtLevel(stats, threshold){
  let n=0;
  Object.values(stats||{}).forEach(lvl=>{if((lvl||0)>=threshold)n++;});
  return n;
}

// Vrai si la condition de statistiques est remplie pour un palier donné.
export function meetsStatRequirement(stats, reqKey){
  const req=RANK_STAT_REQUIREMENTS[reqKey];
  if(!req) return true;
  return countStatsAtLevel(stats,req.level)>=req.count;
}

// Progression des objectifs par rang (linéaire E->S)
export const RANK_BASES = {
  push:    [30, 44, 58,  72,  86,  100],
  abs:     [60, 88, 116, 144, 172, 200],
  squats:  [15, 22, 29,  36,  43,  50],
  calves:  [30, 44, 58,  72,  86,  100],
  reading: [5, 10, 15, 20, 25, 30],
  run:     [4,  5,  6,   7,   8,   10],
  med:     [15, 18, 21,  24,  27,  30],
  flex:    [15, 18, 21,  24,  27,  30],
  walk:    [4,  5,  6,   7,   8,   10],
  march:   [4,  5,  6,   7,   8,   10],
  balance: [5,  10, 15,  20,  25,  30],
  grips:   [10, 12, 14,  16,  18,  20],
};


// Progression des objectifs par niveau de stat
// Les habitudes fixes restent inchangées : Hydratation, Sommeil, Grip, Méditation, Équilibre.
export const STAT_LEVEL_BASES = {
  push:   {stat:"Force",     base:30, step:6,  cap:100},
  abs:    {stat:"Force",     base:60, step:12, cap:200},
  squats: {stat:"Force",     base:15, step:3,  cap:50},
  calves: {stat:"Force",     base:30, step:6,  cap:100},
  reading:{stat:"Esprit",    base:10, step:2,  cap:30},
};
export const STAT_LEVEL_TABLES = {
  run:  {stat:"Endurance", values:[3,4,5,6,6,7,7,8,9,10], cap:10},
  walk: {stat:"Endurance", values:[3,4,5,6,6,7,7,8,9,10], cap:10},
  march:{stat:"Endurance", values:[3,4,5,6,6,7,7,8,9,10], cap:10},
};
export function statLevelTier(level){
  const lvl=Number(level)||1;
  if(lvl<10) return 0;
  return Math.floor((lvl-10)/5)+1;
}
export function legRaiseTargetForForceLevel(level){
  const lvl=Math.max(1,Number(level)||1);
  const target=lvl<10 ? 30 : 30+(Math.floor((lvl-10)/5)+1)*6;
  return Math.min(100,target);
}
export function getStatLevelTarget(objId, stats){
  if(objId==="negative_pullups"){
    const squatTarget=getStatLevelTarget("squats",stats);
    return Math.max(1,Math.ceil((Number(squatTarget)||0)/2));
  }
  const linear=STAT_LEVEL_BASES[objId];
  if(linear){
    const level=Number((stats||{})[linear.stat])||1;
    const target=linear.base + statLevelTier(level)*linear.step;
    return Math.min(linear.cap,target);
  }
  const table=STAT_LEVEL_TABLES[objId];
  if(table){
    const level=Number((stats||{})[table.stat])||1;
    const idx=Math.min(table.values.length-1,statLevelTier(level));
    return Math.min(table.cap,table.values[idx]);
  }
  return null;
}

// XP cumulé requis pour atteindre l'Ascension N (1..10)
// Pattern : base S→Asc1 = 1 152 000, puis ×1.2 à chaque saut
export function getAscensionXpRequired(prestigeLevel){
  const S_XP = 3720000;          // xpRequired du rang S
  const BASE_JUMP = 2304000;     // XP du saut S → Ascension 1
  let cum = S_XP;
  let jump = BASE_JUMP;
  for(let i=1;i<=prestigeLevel;i++){
    cum += jump;
    jump = jump * 1.2;
  }
  return Math.round(cum);
}

export function getRankBase(objId, rankIdx, prestige, stats){
  const def = DEFS.find(o=>o.id===objId);
  // Si la quête a un objectif fixe, on ne scale jamais
  if(def?.fixedBase) return def.base;

  const statTarget = getStatLevelTarget(objId, stats);
  if(statTarget != null) return statTarget;

  // Fallback historique : utilisé uniquement si aucune règle par niveau de stat n'existe.
  const base = RANK_BASES[objId]?.[rankIdx] ?? (def?.base ?? 0);
  if(!prestige||prestige===0)return base;
  const sBase = RANK_BASES[objId]?.[5] ?? base;
  if(objId==="reading" || objId==="run" || objId==="walk" || objId==="march") return sBase;
  return Math.round(sBase * Math.pow(1.2, prestige));
}

export const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X"];
export const MAX_PRESTIGE = 10;
export const getTarget  = base => base; // pas de scaling rang pour l'instant
export const sortStat   = arr => [...arr].sort((a,b)=>STATS.indexOf(a.stat)-STATS.indexOf(b.stat));
