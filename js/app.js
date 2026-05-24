
const { h, render, Fragment } = preact;
const { useState, useEffect, useRef } = preactHooks;

// ─── CONSTANTES GLOBALES ────────────────────────────────────────────────────

const RANKS = [
  {id:"E",label:"\u00c9veill\u00e9",  color:"#9ca3af",glow:"#9ca3af11",bg:"#0f0f12",accent:"#6b7280",xpRequired:0},
  {id:"D",label:"Disciple",   color:"#8b82c4",glow:"#8b82c422",bg:"#0f0e14",accent:"#7068b0",xpRequired:120000},
  {id:"C",label:"Catalyseur", color:"#9070d4",glow:"#9070d433",bg:"#100e18",accent:"#7858c0",xpRequired:360000},
  {id:"B",label:"B\u00e2tisseur", color:"#8a5fd8",glow:"#8a5fd855",bg:"#0e0c1c",accent:"#7248c4",xpRequired:840000},
  {id:"A",label:"Ascendant",  color:"#9040e8",glow:"#9040e877",bg:"#0c0a1e",accent:"#7828d0",xpRequired:1800000},
  {id:"S",label:"Souverain",  color:"#8b2fff",glow:"#8b2fff99",bg:"#0a0820",accent:"#6d10f0",xpRequired:3720000},
];

// Conditions de stats pour débloquer chaque palier (rang ou ascension)
// rankId : id de RANKS pour D-S, ou "ASC_N" pour Ascension N (1-10)
const RANK_STAT_REQUIREMENTS = {
  D:      {count:3, level:10},
  C:      {count:3, level:20},
  B:      {count:4, level:25},
  A:      {count:5, level:30},
  S:      {count:5, level:37},
  ASC_1:  {count:5, level:42},
  ASC_2:  {count:5, level:45},
  ASC_3:  {count:5, level:49},
  ASC_4:  {count:5, level:52},
  ASC_5:  {count:5, level:55},
  ASC_6:  {count:6, level:56},
  ASC_7:  {count:6, level:58},
  ASC_8:  {count:6, level:60},
  ASC_9:  {count:6, level:63},
  ASC_10: {count:6, level:65},
};

// Compte combien de stats atteignent un niveau seuil
function countStatsAtLevel(stats, threshold){
  let n=0; Object.values(stats||{}).forEach(lvl=>{if((lvl||0)>=threshold)n++;}); return n;
}

// Vrai si la condition est remplie pour un palier donné
function meetsStatRequirement(stats, reqKey){
  const req = RANK_STAT_REQUIREMENTS[reqKey];
  if(!req) return true; // Pas de condition = OK (sécurité)
  return countStatsAtLevel(stats, req.level) >= req.count;
}

const STATS      = ["Sante","Force","Intelligence","Concentration","Endurance","Agilite","Discipline"];
const STAT_COLOR = {Sante:"#ef4444",Force:"#fb923c",Intelligence:"#ec4899",Concentration:"#22d3ee",Endurance:"#f59e0b",Agilite:"#4ade80",Discipline:"#c084fc"};
const STAT_LBL   = {Sante:"Sant\u00e9",Force:"Force",Intelligence:"Intelligence",Concentration:"Concentration",Endurance:"Endurance",Agilite:"Agilit\u00e9",Discipline:"Discipline"};
const CHARACTER_STATE_ICON_ASSETS = {
  sante:"./assets/character-state/sante.png",
  mental:"./assets/character-state/mental.png",
  energie:"./assets/character-state/energie.png",
  discipline:"./assets/character-state/discipline.png",
  force:"./assets/character-state/force.png",
  serenite:"./assets/character-state/serenite.png",
  sanction:"./assets/character-state/sanction.png",
  latent:"./assets/character-state/latent.png",
  desequilibre:"./assets/character-state/desequilibre.png",
  berserker:"./assets/character-state/berserker.png",
  construction:"./assets/character-state/construction.png",
  streak:"./assets/character-state/streak.png",
};

function CharacterStateIcon(id, fallback, size=26, extraStyle=""){
  const src = CHARACTER_STATE_ICON_ASSETS[id];
  if(src){
    return h("img",{
      src,
      alt:fallback||id,
      class:"character-state-img-icon",
      style:"width:"+size+"px;height:"+size+"px;object-fit:contain;display:inline-block;vertical-align:middle;flex-shrink:0;filter:var(--icon-filter,saturate(1.22));"+extraStyle
    });
  }
  return h("span",{style:"font-size:"+size+"px;line-height:1;display:inline-block;flex-shrink:0;"+extraStyle},fallback);
}


const QUEST_ICON_ASSETS = {
  water:"./assets/quests/water.png",
  sleep:"./assets/quests/sleep.png",
  protein:"./assets/quests/protein.png",
  mindmeal:"./assets/quests/mindmeal.png",
  push:"./assets/quests/push.png",
  abs:"./assets/quests/abs.png",
  squats:"./assets/quests/squats.png",
  reading:"./assets/quests/reading.png",
  balance:"./assets/quests/balance.png",
  adult:"./assets/quests/adult.png",
  run:"./assets/quests/run.png",
  calves:"./assets/quests/calves.png",
  flex:"./assets/quests/flex.png",
  grips:"./assets/quests/grips.png",
  med:"./assets/quests/med.png",
  pod:"./assets/quests/podcast.png",
  nosugar:"./assets/quests/nosugar.png",
  walk:"./assets/quests/walk.png",
  sp_flow20:"./assets/quests/urgent/animalflow.png",
  sp_cold:"./assets/quests/urgent/coldshower.png",
  sp_deadhang:"./assets/quests/urgent/deadhang.png",
  sp_dips:"./assets/quests/urgent/dips.png",
  sp_footwork:"./assets/quests/urgent/footwork.png",
  sp_declutter:"./assets/quests/urgent/freestuff.png",
  sp_fruits:"./assets/quests/urgent/fruits.png",
  sp_breath:"./assets/quests/urgent/heart.png",
  sp_fasting:"./assets/quests/urgent/jeune.png",
  sp_jump:"./assets/quests/urgent/jumprope.png",
  sp_silent:"./assets/quests/urgent/silentmoving.png",
  sp_learning:"./assets/quests/urgent/learning.png",
  sp_lunge:"./assets/quests/urgent/lunges.png",
  sp_fluide:"./assets/quests/urgent/martialflow.png",
  sp_memo30:"./assets/quests/urgent/memory.png",
  sp_nojunk:"./assets/quests/urgent/nojunkfood.png",
  sp_nophone3h:"./assets/quests/urgent/nophone.png",
  sp_plank:"./assets/quests/urgent/plank.png",
  sp_pull:"./assets/quests/urgent/pullups.png",
  sp_silence30:"./assets/quests/urgent/silence.png",
  sp_sun:"./assets/quests/urgent/sun.png",
  sp_task:"./assets/quests/urgent/task.png",
  sp_stairs:"./assets/quests/urgent/stairs.png",
  sp_wallsit:"./assets/quests/urgent/wallsit.png",
  sp_sprint:"./assets/quests/run.png",
  sp_walk30:"./assets/quests/walk.png",
  sp_flex30:"./assets/quests/flex.png",
  sp_balance_eyes:"./assets/quests/balance.png",
  ep_pullups:"./assets/epreuves/pullups.png",
  ep_wallsit:"./assets/epreuves/wallsit.png",
  ep_reading:"./assets/epreuves/reading.png",
  ep_4hwork:"./assets/epreuves/4hwork.png",
  ep_med:"./assets/epreuves/med.png",
  ep_deepwork:"./assets/epreuves/deepwork.png",
  ep_hike:"./assets/epreuves/hike.png",
  ep_run:"./assets/epreuves/run.png",
  ep_burpees:"./assets/epreuves/burpees.png",
  ep_clock:"./assets/epreuves/clock.png",
  ep_coldshower:"./assets/epreuves/coldshower.png",
  ep_nophone:"./assets/epreuves/nophone.png",
  ep_nojunkfood:"./assets/epreuves/nojunkfood.png",
  ep_broom:"./assets/epreuves/broom.png",
  ep_flex:"./assets/epreuves/flex.png",
  ep_martialflow:"./assets/epreuves/martialflow.png",
  dj_moine:"./assets/donjons/moine.png",
  dj_corps_silencieux:"./assets/donjons/corps_silencieux.png",
  dj_fondation:"./assets/donjons/fondations.png",
  dj_chasseur:"./assets/donjons/chasseur.png",
  nav_home:"./assets/nav/accueil.png",
  nav_quests:"./assets/nav/quetes.png",
  nav_stats:"./assets/nav/stats.png",
  nav_history:"./assets/nav/historique.png",
  nav_codex:"./assets/nav/codex.png",
  settings:"./assets/ui/reglages.png",
};

function QuestIcon(id, fallback, size=18, extraStyle=""){
  const src = QUEST_ICON_ASSETS[id];
  if(src){
    return h("img",{
      src,
      alt:fallback||id,
      class:"quest-img-icon",
      style:"width:"+size+"px;height:"+size+"px;object-fit:contain;display:inline-block;vertical-align:top;flex-shrink:0;filter:var(--icon-filter,saturate(1.22));"+extraStyle
    });
  }
  return h("span",{style:"font-size:"+size+"px;line-height:1;display:inline-block;flex-shrink:0;"+extraStyle},fallback);
}


const DEFS = [
  // ─── SANTÉ ────────────────────────────────────────────────────────────
  {id:"water",  name:"Hydratation",     unit:"verre", xpPer:10,  daily:true, weekly:false,optional:false,stat:"Sante",         icon:"\uD83D\uDCA7",               base:10, baseHistory:[{until:"2026-04-29",base:8}]},
  {id:"sleep",  name:"8h de sommeil",   unit:"nuit",  xpPer:0,   daily:true, weekly:false,optional:false,stat:"Sante",         icon:"\uD83D\uDECF\uFE0F",         base:1,  binary:true, binaryXp:200},
  {id:"adult",name:"",unit:"jour",xpPer:0,daily:true,weekly:false,optional:false,stat:"Discipline",icon:"🔴",base:1,binary:true,binaryXp:200,penaltyAll:true,startDate:"2026-05-21"},
  {id:"nosugar",name:"Pas de sucres transform\u00e9s", unit:"jour", xpPer:0, daily:true, weekly:false,optional:true, stat:"Sante", icon:"\uD83C\uDF4E",            base:1,  binary:true, binaryXp:200, penaltyXp:200},
  {id:"protein",name:"Repas \u00e9quilibr\u00e9",unit:"repas", xpPer:0,   daily:true, weekly:false,optional:false,stat:"Sante",         icon:"\uD83C\uDF4C",               base:1, target:2, validateAt:1, startDate:"2026-05-20", tiers:[{at:1,xp:200,stat:"Sante"},{at:2,xp:200,stat:"Sante",xp2:200,stat2:"Discipline"}]},
  // ─── FORCE ────────────────────────────────────────────────────────────
  {id:"push",   name:"Pompes",          unit:"rep",   xpPer:2,   daily:true, weekly:false,optional:false,stat:"Force",         icon:"\uD83E\uDDBE",               base:30, cap:3},
  {id:"abs",    name:"Abdominaux",      unit:"rep",   xpPer:1,   daily:true, weekly:false,optional:false,stat:"Force",         icon:"\uD83E\uDDCE\uD83C\uDFFB\u200D\u2642\uFE0F", base:60, cap:3},
  {id:"squats", name:"Squats",          unit:"rep",   xpPer:3,   daily:true, weekly:false,optional:false,stat:"Force",         icon:"\uD83E\uDDBF",               base:15, stat2:"Agilite", xpPer2:1, cap:3},
  {id:"calves", name:"Extensions mollets",unit:"rep", xpPer:1,   daily:true, weekly:false,optional:true, stat:"Force",         icon:"\uD83E\uDDBF",               base:30, stat2:"Agilite", xpPer2:1, cap:3},
  {id:"grips",  name:"Hand grips",      unit:"min",   xpPer:10,  daily:true, weekly:false,optional:true, stat:"Force",         icon:"\u270A\uD83C\uDFFB",         base:10, fixedBase:true, cap:3},
  // ─── INTELLIGENCE ─────────────────────────────────────────────────────
  {id:"reading",name:"Lecture",unit:"min",xpPer:10,daily:true,weekly:false,optional:false,stat:"Intelligence",icon:"📚",base:20,stat2:"Concentration",xpPer2:0,startDate:"2026-05-21",concBlock:10,concBlockXp:50},
  {id:"pod",    name:"\u00c9couter 1 podcast", unit:"jour", xpPer:0, daily:true, weekly:false,optional:true, stat:"Intelligence", icon:"\uD83C\uDF99\uFE0F",   base:1, binary:true, binaryXp:200},
  // ─── CONCENTRATION ────────────────────────────────────────────────────
  
  {id:"med",    name:"M\u00e9ditation", unit:"min",   xpPer:15,  daily:true, weekly:false,optional:true, stat:"Concentration",  icon:"\uD83E\uDDD8\uD83C\uDFFB\u200D\u2642\uFE0F", base:15, fixedBase:true, cap:2},
  // ─── ENDURANCE ────────────────────────────────────────────────────────
  {id:"run",    name:"Course",          iconKey:"run",          unit:"km",    xpPer:150, daily:false,weekly:true, optional:false,stat:"Endurance",      icon:"\uD83C\uDFC3\uD83C\uDFFB",   base:7,  stat2:"Agilite", xpPer2:30, cap:3},
  {id:"walk",   name:"Marche",          unit:"km",    xpPer:75,  daily:false,weekly:false,optional:true, stat:"Endurance",      icon:"\uD83D\uDEB6\uD83C\uDFFB\u200D\u2642\uFE0F", base:5, fixedBase:true},
  // ─── AGILITÉ ──────────────────────────────────────────────────────────
  {id:"flex",   name:"Souplesse",       unit:"min",   xpPer:50,  daily:true, weekly:false,optional:true, stat:"Agilite",        icon:"\uD83E\uDD38\uD83C\uDFFB",   base:15, fixedBase:true, stat2:"Endurance", xpPer2:10, cap:2},
  {id:"balance",name:"\u00c9quilibre sur un pied",unit:"min",xpPer:10,daily:true,weekly:false,optional:false,stat:"Agilite",    icon:"\uD83E\uDDB6\uD83C\uDFFB",   base:5, startDate:"2026-05-15", cap:3},
  // ─── DISCIPLINE ───────────────────────────────────────────────────────
  
  {id:"mindmeal",name:"Manger sans stimulation",unit:"repas",xpPer:0,daily:true,weekly:false,optional:true,stat:"Sante",icon:"🧠",base:1,target:2,validateAt:1,startDate:"2026-05-21",tiers:[{at:1,xp:200,stat:"Sante"},{at:2,xp:200,stat:"Sante",xp2:200,stat2:"Discipline"}]},
];

// Quetes speciales — par stat (25 au total)
const SP = {
  Sante:[
    {id:"sp_sun",     name:"10min de lumi\u00e8re naturelle", icon:"\u2600\uFE0F",                              unit:"min",  target:10,  xp:250, days:1, binary:true, desc:"10 min de lumi\u00e8re naturelle"},
    {id:"sp_fruits",  name:"Manger 5 fruits & l\u00e9gumes",  icon:"\uD83C\uDF4F",                              unit:"f/l",  target:5,   xp:250, days:1, binary:true, desc:"Manger 5 fruits et l\u00e9gumes"},
    {id:"sp_breath",  name:"10min de coh\u00e9rence cardiaque",icon:"\uD83D\uDC93",                             unit:"jour", target:1,   xp:250, days:1, binary:true, desc:"10 min de respiration contr\u00f4l\u00e9e"},
    {id:"sp_nojunk",  name:"Pas de junk-food",                icon:"\uD83C\uDF55",                              unit:"jour", target:1,   xp:250, days:1, binary:true, desc:"Z\u00e9ro junk-food"},
    {id:"sp_fasting", name:"Je\u00fbne 24h",                  icon:"\u23F3",                                    unit:"jour", target:1,   xp:1000, days:1, binary:true, desc:"Je\u00fbne 24h complet"},
  ],
  Force:[
    {id:"sp_pull",    name:"30 tractions",        icon:"\u270A\uD83C\uDFFB",                                   unit:"rep",  target:30,  xp:300, days:1, desc:"30 tractions"},
    {id:"sp_dips",    name:"100 dips",            icon:"\uD83D\uDC4A\uD83C\uDFFB",                             unit:"rep",  target:100, xp:300, days:1, desc:"100 dips"},
    {id:"sp_lunge",   name:"100 fentes",          icon:"\uD83E\uDDBF",                                         unit:"rep",  target:100, xp:300, xp2:100, stat2:"Endurance", days:1, desc:"100 fentes march\u00e9es"},
    {id:"sp_plank",   name:"10min de gainage",    icon:"\uD83E\uDDCE\uD83C\uDFFB\u200D\u2642\uFE0F",           unit:"min",  target:10,  xp:300, xp2:100, stat2:"Endurance", days:1, desc:"10 min de gainage"},
    {id:"sp_deadhang",name:"10min de dead hang",  icon:"\u270A\uD83C\uDFFB",                                   unit:"min",  target:10,  xp:250, xp2:100, stat2:"Endurance", days:1, desc:"10 min de dead hang"},
    {id:"sp_wallsit", name:"10min de chaise",     icon:"\uD83E\uDE91",                                         unit:"min",  target:10,  xp:300, xp2:300, stat2:"Endurance", days:1, desc:"10 min de chaise"},
  ],
  Intelligence:[
    {id:"sp_learning", name:"1h d'apprentissage actif",  icon:"\uD83C\uDF93",                                  unit:"jour",     target:1,  xp:300, xp2:100, stat2:"Concentration", xp3:100, stat3:"Discipline", days:1, binary:true, desc:"1h d'apprentissage actif"},
    {id:"sp_memo30",   name:"30min de m\u00e9morisation",icon:"\uD83E\uDDE0",                                  unit:"jour", target:1,  xp:300, xp2:100, stat2:"Concentration", xp3:100, stat3:"Discipline", days:1, binary:true, desc:"30 min de m\u00e9morisation active"},
  ],
  Concentration:[
    {id:"sp_silence30",name:"30min de silence",          icon:"\uD83E\uDD2B",                                  unit:"jour", target:1,  xp:500, xp2:250, stat2:"Discipline", days:1, binary:true, desc:"30 min sans parler ni consommer"},
    
    {id:"sp_nophone3h", name:"T\u00e9l\u00e9phone hors de port\u00e9e 3h", icon:"\uD83D\uDCF5",                unit:"jour", target:1, xp:300, xp2:150, stat2:"Discipline", days:1, binary:true, desc:"T\u00e9l\u00e9phone hors de port\u00e9e 3h"},
  ],
  Endurance:[
    {id:"sp_sprint",  name:"10 s\u00e9ries fractionn\u00e9 100m",icon:"\u26A1",                                 unit:"s\u00e9r.",target:10, xp:500, days:1, desc:"10 x 100m sprint/r\u00e9cup", noRestMode:true},
    {id:"sp_stairs",  name:"30 mont\u00e9es d'escaliers", icon:"\uD83E\uDE9C",                                 unit:"A/R",  target:30, xp:250, xp2:100, stat2:"Agilite", days:1, desc:"30 mont\u00e9es/descentes"},
    {id:"sp_jump",    name:"20min de corde \u00e0 sauter",icon:"\uD83D\uDCA6",                                 unit:"min",  target:20, xp:500, xp2:250, stat2:"Agilite", days:1, desc:"20 min de corde \u00e0 sauter", noRestMode:true},
    {id:"sp_walk30",  name:"30min de marche",     icon:"\uD83D\uDEB6\uD83C\uDFFB\u200D\u2642\uFE0F",           unit:"min",  target:30, xp:300, days:1, desc:"30 min de marche"},
  ],
  Agilite:[
    {id:"sp_flow20",  name:"20min d'animal flow", icon:"\uD83D\uDC0A",                                         unit:"min",  target:20, xp:750, days:1, tiers:[{at:10,xp:250,stat:"Agilite"},{at:20,xp:500,stat:"Agilite"}], desc:"20 min d'animal flow (palier \u00e0 10min)"},
    {id:"sp_flex30",  name:"30min de souplesse",  icon:"\uD83E\uDD38\uD83C\uDFFB",                             unit:"jour", target:1,  xp:1000, days:1, binary:true, desc:"30 min de souplesse"},
    {id:"sp_fluide",  name:"15min de flow martial", icon:"\uD83C\uDF0A",                              unit:"min",  target:15, xp:375, days:1, desc:"Capoeira flow / mouvement continu sans rupture"},
    {id:"sp_silent",  name:"10min de d\u00e9placements silencieux", icon:"\uD83D\uDC08",                          unit:"min",  target:10, xp:300, days:1, desc:"Marcher sans bruit (escaliers, pi\u00e8ces)"},
    {id:"sp_balance_eyes", name:"10min d'\u00e9quilibre yeux ferm\u00e9s", icon:"\uD83E\uDDB6\uD83C\uDFFB",          unit:"min",  target:10, xp:300, xp2:150, stat2:"Concentration", days:1, desc:"\u00c9quilibre sur un pied yeux ferm\u00e9s"},
    {id:"sp_footwork", name:"10min de footwork rapide", icon:"\u26A1",                                            unit:"min",  target:10, xp:250, step:5, days:1, desc:"Footwork rapide (carrelage, devant/derri\u00e8re/c\u00f4t\u00e9s)"},
  ],
  Discipline:[
    {id:"sp_cold",      name:"10min douche froide",             icon:"\uD83D\uDEBF",                          unit:"jour", target:1, xp:250, days:1, binary:true, desc:"10 min d'eau froide"},
    {id:"sp_task",      name:"Accomplir une t\u00e2che repouss\u00e9e", icon:"\uD83D\uDD57",                   unit:"jour", target:1, xp:250, days:1, binary:true, desc:"Accomplir une t\u00e2che repouss\u00e9e"},
    {id:"sp_declutter", name:"D\u00e9sencombrement",            icon:"\uD83D\uDCE6",                          unit:"objet",target:10,xp:250, days:1, desc:"Jeter/ranger 10 objets"},
  ],
};

// Couleurs et libellés des tiers (partagés avec les Épreuves)
const SQ_TIER_COLOR = {mineure:"#fbbf24", majeure:"#f59e0b", legendaire:"#f97316"};
const SQ_TIER_LABEL = {mineure:"Mineure", majeure:"Majeure", legendaire:"L\u00e9gendaire"};

// ─── ÉPREUVES (challenges 7 jours) ────────────────────────────────────────
const EPREUVE_COOLDOWN = {mineure:2*86400000, majeure:5*86400000, legendaire:7*86400000};
const EPREUVES = [
  // 12 épreuves au total, sans notion de tier
  {id:"ep_150pull",  name:"150 tractions",                      iconId:"ep_pullups", icon:"\u270A\uD83C\uDFFB",                       stat:"Force",        xp:3000, days:7, unit:"rep", target:150,
    desc:"Atteindre 150 tractions en 7 jours"},
  {id:"ep_wallsit60",name:"35min de chaise",                    iconId:"ep_wallsit", icon:"\uD83E\uDE91",                             stat:"Force",        xp:1500, xp2:500, stat2:"Endurance", days:7, unit:"min", target:35, dailyTrack:true, dailyTrackMin:5,
    desc:"35 minutes cumul\u00e9es de chaise sur la semaine"},
  {id:"ep_book",     name:"Lire un livre complet (300+ pages)", iconId:"ep_reading", icon:"\uD83D\uDCDA",                             stat:"Intelligence", xp:2000, xp2:1000, stat2:"Concentration", days:7, binary:true,
    desc:"Terminer un livre de 300 pages ou plus"},
  {id:"ep_project",  name:"4h de travail sur un projet professionnel",iconId:"ep_4hwork", icon:"\uD83E\uDDE0",                           stat:"Intelligence", xp:1000,  xp2:1000, stat2:"Concentration", xp3:1000, stat3:"Discipline", days:7, unit:"min", target:240,
    desc:"4 heures de travail sur un projet professionnel"},
  {id:"ep_medweek",  name:"M\u00e9ditation quotidienne",        iconId:"ep_med", icon:"\uD83E\uDDD8\uD83C\uDFFB\u200D\u2642\uFE0F",stat:"Concentration",xp:2500, days:7, streak7:true, streakDays:7, unit:"jour", target:7,
    desc:"M\u00e9diter chaque jour pendant 7 jours"},
  {id:"ep_deepwork5",name:"Deep Work 60min",                    iconId:"ep_deepwork", icon:"\u26AB",                                   stat:"Concentration",xp:2000, xp2:1000, stat2:"Discipline", days:7, cumDays:true, streakDays:5, unit:"jour", target:5,
    desc:"60 min de deep work 5 jours de suite"},
  {id:"ep_hike",     name:"Randonn\u00e9e longue (5h+)",        iconId:"ep_hike", icon:"\u26F0\uFE0F",                             stat:"Endurance",    xp:2000, days:7, binary:true,
    desc:"Randonn\u00e9e de 5 heures minimum"},
  {id:"ep_10km",     name:"Courir un 10km non-stop",            iconId:"ep_run", icon:"\uD83C\uDFC3\uD83C\uDFFB\u200D\u27A1\uFE0F",stat:"Endurance",   xp:2500, xp2:500, stat2:"Agilite", days:7, binary:true,
    desc:"Courir 10km non-stop"},
  {id:"ep_burpees",  name:"100 burpees",                        iconId:"ep_burpees", icon:"\uD83D\uDD25",                             stat:"Endurance",    xp:2000, xp2:1000, stat2:"Agilite", days:7, unit:"rep", target:100,
    desc:"100 burpees cumul\u00e9s"},
  {id:"ep_wakeup",   name:"R\u00e9veil \u00e0 la m\u00eame heure",iconId:"ep_clock", icon:"\uD83C\uDF05",                           stat:"Discipline",   xp:2000, xp2:1000, stat2:"Sante", days:7, streak7:true, streakDays:7, unit:"jour", target:7,
    desc:"Se lever \u00e0 la m\u00eame heure 7 jours de suite"},
  {id:"ep_coldweek", name:"Douche froide 10min quotidienne",    iconId:"ep_coldshower", icon:"\u2744\uFE0F",                             stat:"Discipline",   xp:2000, xp2:1000, stat2:"Sante", days:7, streak7:true, streakDays:7, unit:"jour", target:7,
    desc:"10 min de douche froide chaque jour pendant 7 jours"},
  {id:"ep_noscroll", name:"Pas de doomscrolling",               iconId:"ep_nophone", icon:"\uD83D\uDCF5",                             stat:"Intelligence", xp:2500, days:7, streak7:true, streakDays:7, unit:"jour", target:7,
    desc:"Z\u00e9ro scroll passif pendant 7 jours"},
  {id:"ep_nojunkwk", name:"Pas de junk-food",                   iconId:"ep_nojunkfood", icon:"\uD83C\uDF55",                             stat:"Sante",        xp:2000, xp2:1000, stat2:"Discipline", days:7, streak7:true, streakDays:7, unit:"jour", target:7,
    desc:"Z\u00e9ro junk-food pendant 7 jours"},
  {id:"ep_clean",    name:"Nettoyage total d'une pi\u00e8ce",   iconId:"ep_broom", icon:"\uD83E\uDDF9",                             stat:"Discipline",   xp:1500, days:7, binary:true,
    desc:"Nettoyer compl\u00e8tement une pi\u00e8ce"},
  {id:"ep_mob",      name:"Mobilit\u00e9 matinale",             iconId:"ep_flex", icon:"\uD83E\uDD38\uD83C\uDFFB\u200D\u2642\uFE0F",stat:"Agilite",     xp:2500, days:7, cumDays:true, streakDays:5, unit:"jour", target:5,
    desc:"Faire 15 min de mobilit\u00e9 5 jours sur 7"},
  {id:"ep_taichi",   name:"Tai Chi quotidien",                  iconId:"ep_martialflow", icon:"\u262F\uFE0F",                             stat:"Agilite",      xp:2000, xp2:1000, stat2:"Concentration", days:7, cumDays:true, streakDays:5, dailyMin:20, unit:"jour", target:5,
    desc:"Faire 20 min de Tai Chi 5 jours sur 7"},
];

// ─── DONJONS (slot hebdomadaire alternatif aux épreuves) ───────────────────
// Un donjon = plusieurs objectifs légers sur 7 jours, avec XP uniquement à la complétion totale.
const DONJONS = [
  {id:"dj_moine", kind:"donjon", name:"Donjon du Moine", icon:"🕯️", stat:"Concentration", xp:1500, xp2:1000, stat2:"Discipline", xp3:500, stat3:"Sante", days:7,
    desc:"Semaine orientée calme, attention et maîtrise de la stimulation",
    goals:[
      {id:"med3", label:"Méditation", target:3, unit:"sessions"},
      {id:"silence1", label:"Silence 30min", target:1, unit:"fois"},
      {id:"nophone1", label:"Téléphone hors de portée 3h", target:1, unit:"fois"},
      {id:"cleaninput1", label:"Aucun contenu passif", target:1, unit:"jour"}
    ]},
  {id:"dj_corps_silencieux", kind:"donjon", name:"Donjon du Corps silencieux", icon:"🐾", stat:"Agilite", xp:2000, xp2:500, stat2:"Concentration", xp3:500, stat3:"Discipline", days:7,
    desc:"Semaine de contrôle, coordination, mobilité et précision",
    goals:[
      {id:"footwork2", label:"Footwork rapide", target:2, unit:"sessions"},
      {id:"silent2", label:"Déplacements silencieux", target:2, unit:"sessions"},
      {id:"flow1", label:"Animal flow", target:1, unit:"session"},
      {id:"flex1", label:"Souplesse longue", target:1, unit:"session"}
    ]},
  {id:"dj_fondation", kind:"donjon", name:"Donjon des Fondations", icon:"🏛️", stat:"Sante", xp:2000, xp2:1000, stat2:"Discipline", days:7,
    desc:"Semaine de base : hydratation, repas, récupération et hygiène mentale",
    goals:[
      {id:"water5", label:"Hydratation complète", target:5, unit:"jours"},
      {id:"protein6", label:"Repas équilibré", target:6, unit:"repas"},
      {id:"mindmeal4", label:"Manger sans stimulation", target:4, unit:"repas"},
      {id:"breath1", label:"Cohérence cardiaque", target:1, unit:"fois"}
    ]},
  {id:"dj_chasseur", kind:"donjon", name:"Donjon du Chasseur", icon:"🏹", stat:"Endurance", xp:2000, xp2:1000, stat2:"Agilite", days:7,
    desc:"Semaine de mouvement : souffle, jambes, déplacement et résistance",
    goals:[
      {id:"run1", label:"Sortie course", target:1, unit:"sortie"},
      {id:"walk1", label:"Marche longue", target:1, unit:"sortie"},
      {id:"stairs1", label:"Escaliers", target:1, unit:"session"},
      {id:"cardio1", label:"Corde ou fractionné", target:1, unit:"session"}
    ]}
];

function pickRandomDonjon(completedIds){
  const avail = DONJONS.filter(d=>!completedIds.includes(d.id));
  if(avail.length===0) return null;
  return {tpl:avail[Math.floor(Math.random()*avail.length)]};
}

// Spawn programmé : prochain lundi à 7h00 local (à partir de "from", défaut now)
// Si on est lundi avant 7h, retourne aujourd'hui 7h.
function nextMondayAt7(from){
  const d = new Date(from||Date.now());
  const day = d.getDay(); // 0=dim, 1=lun, ...
  const result = new Date(d.getFullYear(),d.getMonth(),d.getDate(),7,0,0,0);
  if(day===1 && d.getHours()<7){
    // On est lundi avant 7h → cible aujourd'hui 7h
    return result.getTime();
  }
  // Avance jusqu'au prochain lundi
  const daysUntilMonday = day===0 ? 1 : (8-day);
  result.setDate(result.getDate()+daysUntilMonday);
  return result.getTime();
}

// Prochain 7h00 (aujourd'hui si on est avant 7h, sinon demain)
function next7AM(from){
  const d = new Date(from||Date.now());
  const result = new Date(d.getFullYear(),d.getMonth(),d.getDate(),7,0,0,0);
  if(d.getHours()<7) return result.getTime();
  result.setDate(result.getDate()+1);
  return result.getTime();
}

function pickRandomEpreuve(completedIds, cooldownUntil, statCycle){
  if(cooldownUntil && Date.now() < cooldownUntil) return null;
  const allAvail = EPREUVES.filter(e => !completedIds.includes(e.id));
  if(allAvail.length === 0) return null;
  const stats=["Sante","Force","Intelligence","Concentration","Endurance","Agilite","Discipline"];
  const cycle = statCycle||[];
  const remaining = stats.filter(s=>!cycle.includes(s));
  const pool = remaining.length===0 ? stats : remaining;
  // Filtrer pour ne garder que les stats qui ont au moins une épreuve disponible
  const usable = pool.filter(s=>allAvail.some(e=>e.stat===s));
  if(usable.length===0){
    // Fallback : aucune épreuve dispo dans les stats du cycle → on prend n'importe laquelle
    const ep = allAvail[Math.floor(Math.random()*allAvail.length)];
    return {tpl:ep, pickedStat:ep.stat, cycleReset:remaining.length===0};
  }
  const stat = usable[Math.floor(Math.random()*usable.length)];
  const avail = allAvail.filter(e=>e.stat===stat);
  const ep = avail[Math.floor(Math.random()*avail.length)];
  return {tpl:ep, pickedStat:stat, cycleReset:remaining.length===0};
}

const getRank    = xp => { for(let i=RANKS.length-1;i>=0;i--)if(xp>=RANKS[i].xpRequired)return RANKS[i]; return RANKS[0]; };
const getNext    = id => { const i=RANKS.findIndex(r=>r.id===id); return i<RANKS.length-1?RANKS[i+1]:null; };

// Rang effectif en tenant compte des conditions de stats.
// Si la condition pour passer au rang N n'est pas remplie, on reste au rang N-1
// même si l'XP suffit.
const getRankWithStats = (xp, stats) => {
  // On part du rang naturel (basé sur XP seul) puis on descend tant que la condition échoue
  let natural = getRank(xp);
  let idx = RANKS.findIndex(r=>r.id===natural.id);
  // On vérifie que toutes les conditions menant à ce rang sont OK
  while(idx > 0){
    const req = RANK_STAT_REQUIREMENTS[RANKS[idx].id];
    if(req && countStatsAtLevel(stats, req.level) < req.count){
      idx--; // condition non remplie : on redescend d'un cran
    } else {
      break;
    }
  }
  return RANKS[idx];
};

// Progression des objectifs par rang (linéaire E->S)
const RANK_BASES = {
  push:    [30, 44, 58,  72,  86,  100],
  abs:     [60, 88, 116, 144, 172, 200],
  squats:  [15, 22, 29,  36,  43,  50],
  calves:  [30, 44, 58,  72,  86,  100],
  reading: [20, 25, 30, 35, 40, 45],
  run:     [5,  7,  9,   11,  13,  15],
  med:     [15, 18, 21,  24,  27,  30],
  flex:    [15, 18, 21,  24,  27,  30],
  balance: [5,  10, 15,  20,  25,  30],
  grips:   [10, 12, 14,  16,  18,  20],
};

// XP cumulé requis pour atteindre l'Ascension N (1..10)
// Pattern : base S→Asc1 = 1 152 000, puis ×1.2 à chaque saut
function getAscensionXpRequired(prestigeLevel){
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

function getRankBase(objId, rankIdx, prestige){
  const def = DEFS.find(o=>o.id===objId);
  // Si la quête a un objectif fixe, on ne scale jamais
  if(def?.fixedBase) return def.base;
  const base = RANK_BASES[objId]?.[rankIdx] ?? (def?.base ?? 0);
  if(!prestige||prestige===0)return base;
  const sBase = RANK_BASES[objId]?.[5] ?? base;
  if(objId==="reading") return sBase;
  return Math.round(sBase * Math.pow(1.2, prestige));
}

const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X"];
const MAX_PRESTIGE = 10;
const getTarget  = base => base; // pas de scaling rang pour l'instant
const todayStr   = () => { const d=new Date(); const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0"); return y+"-"+m+"-"+day; };
const wkStr      = (d=new Date()) => {
  // Semaine ISO : commence le lundi
  const dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const day=dt.getUTCDay()||7; // dimanche=7
  dt.setUTCDate(dt.getUTCDate()+4-day); // jeudi de la semaine ISO
  const yearStart=new Date(Date.UTC(dt.getUTCFullYear(),0,1));
  const wk=Math.ceil(((dt-yearStart)/86400000+1)/7);
  return dt.getUTCFullYear()+"-W"+String(wk).padStart(2,"0");
};
const sortStat   = arr => [...arr].sort((a,b)=>STATS.indexOf(a.stat)-STATS.indexOf(b.stat));
// XP pour passer du niveau N au niveau N+1 : 1000 * 1.1^N
const xpForLvl   = l => Math.round(1000*Math.pow(1.1,l));
const totForLvl  = l => { let t=0; for(let i=0;i<l;i++)t+=xpForLvl(i); return t; };
const getLvl     = xp => { let l=0; while(xp>=totForLvl(l+1))l++; return l; };


function hexToRgb(hex){
  if(!hex) return null;
  const clean=String(hex).trim().replace("#","");
  const full=clean.length===3 ? clean.split("").map(c=>c+c).join("") : clean;
  if(full.length!==6) return null;
  const n=parseInt(full,16);
  if(Number.isNaN(n)) return null;
  return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}
function rgbToHue({r,g,b}){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  if(d===0) return 0;
  let h;
  if(max===r) h=((g-b)/d)%6;
  else if(max===g) h=(b-r)/d+2;
  else h=(r-g)/d+4;
  h*=60;
  if(h<0) h+=360;
  return h;
}
function iconThemeFilter(color){
  const rgb=hexToRgb(color);
  if(!rgb){
    return {
      base:"saturate(1.22) contrast(1.05)",
      active:"saturate(1.38) contrast(1.08) brightness(1.04)"
    };
  }

  const hue=rgbToHue(rgb);

  // Rotation volontairement limitée pour préserver le relief cristal.
  const rotate=Math.max(-42,Math.min(42,(hue-265)*0.42));

  return {
    base:
      "saturate(1.28) "+
      "contrast(1.06) "+
      "brightness(1.01) "+
      "hue-rotate("+rotate.toFixed(1)+"deg)",

    active:
      "saturate(1.45) "+
      "contrast(1.1) "+
      "brightness(1.05) "+
      "hue-rotate("+rotate.toFixed(1)+"deg)"
  };
}

const fmtNum = (v, max=2) => {
  const n = Number(v);
  if(!Number.isFinite(n)) return "0";
  if(Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toFixed(max).replace(/\.0+$/,"").replace(/(\.\d*?)0+$/,"$1");
};


function calcXp(obj,total,baseOverride){
  if(!obj||total<=0)return 0;
  const t = baseOverride!=null ? baseOverride : obj.base;
  if(obj.binary){return total>=t?(obj.binaryXp||50):0;}
  const xpPer=obj.xpPer;
  // Plafonner si cap défini
  const hasCap = (obj.cap || obj.capValue) && t && !obj.binary;
  const capThreshold = obj.capValue ? obj.capValue : (hasCap ? t * obj.cap : Infinity);
  const effectiveTotal = Math.min(total, capThreshold);
  // Cas spécial reading : Intelligence linéaire, Concentration gérée par validation de blocs
  if(obj.id==="reading") return effectiveTotal*xpPer;
  // Cas spécial water : linéaire dès le 1er
  if(obj.id==="water") return effectiveTotal*xpPer;
  // Cas spécial run : linéaire + 50% si ≥ 2x objectif
  if(obj.id==="run"){
    let xp = effectiveTotal*xpPer;
    if(effectiveTotal >= t*2) xp += Math.round(effectiveTotal*xpPer*0.5);
    return xp;
  }
  // Cas standard
  if(obj.optional){
    let xp = effectiveTotal*xpPer;
    const mult = Math.floor(effectiveTotal/t);
    if(mult>=2) xp += (mult-1)*t*xpPer;
    return xp;
  } else {
    if(effectiveTotal < t) return 0;
    let xp = effectiveTotal*xpPer;
    const mult = Math.floor(effectiveTotal/t);
    if(mult>=2) xp += (mult-1)*t*xpPer;
    return xp;
  }
}

function pickRandomSq(usedIds,restMode,statCycle,completedLog){
  const stats=["Sante","Force","Intelligence","Concentration","Endurance","Agilite","Discipline"];
  const cycle = statCycle||[];
  const remaining = stats.filter(s=>!cycle.includes(s));
  const cycleReset = remaining.length===0;
  const pool = cycleReset ? stats : remaining;

  // Anti-répétition : une même quête urgente ne peut pas revenir avant 4 cycles complets.
  // 4 cycles = 4 passages par les 7 stats = 28 quêtes urgentes tirées.
  const recentWindow = stats.length * 4;
  const recentIds = (completedLog||[])
    .slice(-recentWindow)
    .map(x=>typeof x==="string" ? x : x.id)
    .filter(Boolean);

  const availableForStat = (s, respectCooldown=true) => (SP[s]||[]).filter(t =>
    !usedIds.includes(t.id) &&
    !(t.noRestMode&&restMode) &&
    (!respectCooldown || !recentIds.includes(t.id))
  );

  let usable = pool.filter(s=>availableForStat(s,true).length>0);

  // Si le filtre 4 cycles bloque toutes les stats restantes, on garde le cycle par stat
  // et on relâche uniquement l'anti-répétition pour éviter un blocage.
  let respectCooldown = true;
  if(usable.length===0){
    usable = pool.filter(s=>availableForStat(s,false).length>0);
    respectCooldown = false;
  }

  if(usable.length===0){
    // Fallback global, d'abord avec cooldown, puis sans.
    for(const respect of [true,false]){
      for(const s of stats){
        const a=availableForStat(s,respect);
        if(a.length>0){
          const chosen=a[Math.floor(Math.random()*a.length)];
          return {tpl:{...chosen,stat:s}, pickedStat:s, cycleReset};
        }
      }
    }
    return null;
  }

  const stat = usable[Math.floor(Math.random()*usable.length)];
  const avail = availableForStat(stat,respectCooldown);
  const chosen = avail[Math.floor(Math.random()*avail.length)];
  return {tpl:{...chosen,stat}, pickedStat:stat, cycleReset};
}

const IMPORTED_VERSION = "2026-05-11-v4";
const BACKUP_KEYS = ["sl_v3","sl_v3_backup1","sl_v3_backup2","sl_v3_backup3"];

// Lecture : essaie la clé principale, sinon fallback automatique sur les backups
const loadState  = () => {
  for(const key of BACKUP_KEYS){
    try{
      const r=localStorage.getItem(key);
      if(!r) continue;
      const parsed=JSON.parse(r);
      if(parsed && typeof parsed === "object" && parsed.statXp){
        // Si on a r\u00e9cup\u00e9r\u00e9 depuis un backup, on r\u00e9-\u00e9crit la cl\u00e9 principale
        if(key !== "sl_v3"){
          try{ localStorage.setItem("sl_v3",r); }catch{}
        }
        return parsed;
      }
    }catch{}
  }
  return null;
};

// \u00c9criture : rotation des backups + sauvegarde principale
const saveState  = s  => {
  try{
    // On n'enregistre jamais "objectives" \u2014 les DEFS du code ont toujours priorit\u00e9
    const {objectives, ...toSave} = s;
    const json = JSON.stringify(toSave);
    // Rotation : backup2 \u2192 backup3, backup1 \u2192 backup2, current \u2192 backup1
    // (uniquement si la valeur courante est valide)
    try{
      const current = localStorage.getItem("sl_v3");
      const b1 = localStorage.getItem("sl_v3_backup1");
      const b2 = localStorage.getItem("sl_v3_backup2");
      // On ne fait la rotation que si la valeur change vraiment (pas \u00e0 chaque render)
      if(current && current !== json){
        if(b2) localStorage.setItem("sl_v3_backup3", b2);
        if(b1) localStorage.setItem("sl_v3_backup2", b1);
        localStorage.setItem("sl_v3_backup1", current);
      }
    }catch{}
    localStorage.setItem("sl_v3", json);
    localStorage.setItem("sl_version", IMPORTED_VERSION);
  }catch{}
};

// ─── DONNEES IMPORTEES ─────────────────────────────────────────────────────

const IMPORTED = {
  totalXp:45775, streak:6, lastActiveDay:"2026-05-11",
  streakBonusDay:"2026-05-10", weeklyBonusWk:"2026-W15", lastStreakDay:"2026-05-10",
  streakMilestones:[7,14], penaltyDay:"2026-05-01",
  prestige:0, restMode:false, walkTarget:0,
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
  stats:{Sante:getLvl(10100),Force:getLvl(13488),Intelligence:getLvl(9525),Concentration:getLvl(3175),Endurance:getLvl(2962),Agilite:getLvl(1652),Discipline:getLvl(3150)},
  statXp:{Sante:10100,Force:13488,Intelligence:9525,Concentration:3175,Endurance:2962,Agilite:1652,Discipline:3150},
  specialQuests:[],
  epreuves:[],
  epreuveCooldownUntil:null,
  sqCooldownUntil:null,
  completedEpreuveIds:[],
  completedSqLog:[],
  sqStatCycle:[],
  epStatCycle:[],
  capReached:{},
  objectives:DEFS,
};

function migrateGripsToMin(dailyLog){
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

function buildState(){
  const saved=loadState();
  if(!saved)return IMPORTED;
  const migratedLog=migrateGripsToMin(saved.dailyLog||IMPORTED.dailyLog);
  const out={
    ...IMPORTED,
    ...saved,
    objectives:DEFS,
    specialQuests:saved.specialQuests||[],
    epreuves:saved.epreuves||[],
    epreuveCooldownUntil:saved.epreuveCooldownUntil||null,
    sqCooldownUntil:saved.sqCooldownUntil||null,
    completedEpreuveIds:saved.completedEpreuveIds||[],
    completedSqLog:saved.completedSqLog||[],
    sqStatCycle:saved.sqStatCycle||[],
    epStatCycle:saved.epStatCycle||[],
    capReached:saved.capReached||{},
    stats:saved.stats||IMPORTED.stats,
    statXp:saved.statXp||IMPORTED.statXp,
    dailyLog:migratedLog,
    weeklyLog:saved.weeklyLog||IMPORTED.weeklyLog,
    totalXp:Math.max(saved.totalXp||0, IMPORTED.totalXp),
    prestige:saved.prestige||IMPORTED.prestige||0,
    restMode:saved.restMode||false,
    walkTarget:saved.walkTarget||0,
  };
  // Recalcul defensif: rebuild stats levels from statXp (cohérence après changement de formule)
  const recomputed={};
  Object.keys(out.statXp).forEach(k=>{ recomputed[k]=getLvl(out.statXp[k]||0); });
  out.stats=recomputed;
  // Migration: re-aligner expiresAt des SQ actives sur le prochain 7h
  // et des épreuves actives sur le prochain lundi 7h
  out.specialQuests = (out.specialQuests||[]).map(q=>{
    if(q.completedAt) return q;
    // Pour une quête active, expiresAt = prochain 7h après startedAt
    return {...q, expiresAt: next7AM(q.startedAt||Date.now())};
  });
  out.epreuves = (out.epreuves||[]).map(e=>{
    if(e.completedAt||e.failedAt) return e;
    return {...e, expiresAt: nextMondayAt7(e.startedAt||Date.now())};
  });
  return out;
}

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────

function App(){
  const [state,setState]   = useState(()=>{
    const base=buildState();
    // Auto-init quete speciale si aucune active
    const now=Date.now();
    const sqs=base.specialQuests||[];
    const hasActive=sqs.find(q=>!q.completedAt&&now<q.expiresAt);
    const sqCdUntil=base.sqCooldownUntil||0;
    const cooldownOk = now>=sqCdUntil;
    if(!hasActive&&cooldownOk){
      const result=pickRandomSq(sqs.map(q=>q.id),base.restMode,base.sqStatCycle,base.completedSqLog);
      if(result){
        const {tpl,pickedStat,cycleReset}=result;
        const sq={...tpl,sqid:"sq_"+now,progress:0,startedAt:now,expiresAt:next7AM(now),completedAt:null};
        const newCycle = cycleReset ? [pickedStat] : [...(base.sqStatCycle||[]),pickedStat];
        return {...base,specialQuests:[...sqs.filter(q=>q.completedAt),sq],sqStatCycle:newCycle,sqCooldownUntil:next7AM(now)};
      }
    }
    return base;
  });
  const [tab,setTab]       = useState("home");
  const scrollRef = useRef(null);
  function switchTab(id){ setTab(id); if(scrollRef.current) scrollRef.current.scrollTop=0; }
  const [rankUp,setRankUp] = useState(null);
  const [capAnim,setCapAnim] = useState(null);
  const [historyOpen,setHistoryOpen] = useState({week:false,records:false,totals:false});
  const [codexOpen,setCodexOpen] = useState({obl:false,bonus:false,sq:false,ep:false,dj:false});
  const [prestigeUp,setPrestigeUp] = useState(null);
  const [showStatReqDetail,setShowStatReqDetail] = useState(false);
  const [showRankReqStats,setShowRankReqStats] = useState(false);
  const [mobOpen,setMobOpen] = useState(false);
  const [floats,setFloats] = useState([]);
  const [showSet,setShowSet]       = useState(false);
  const [confirmReset,setConfirmReset] = useState(false);
  const [wkOff,setWkOff]  = useState(0);
  const inputs = useRef({});
  const walkTargetRef = useRef(state.walkTarget||0);
  // Sync ref from state on mount (after reload)
  useEffect(()=>{ walkTargetRef.current=state.walkTarget||0; },[]);

  // Migration grips sec→min sur le state en mémoire (au cas où localStorage non migré)
  useEffect(()=>{
    const needsMigration=Object.values(state.dailyLog).some(log=>log.grips!=null&&log.grips>60);
    if(needsMigration){
      setState(s=>({...s,dailyLog:migrateGripsToMin(s.dailyLog)}));
    }
  },[]);

  // Persistance
  useEffect(()=>{ saveState(state); },[state]);

  // Penalite jours manques (une seule fois au montage)
  useEffect(()=>{
    const t=todayStr();
    if(state.lastActiveDay&&state.lastActiveDay!==t){
      const diff=Math.round((new Date(t)-new Date(state.lastActiveDay))/86400000);
      if(diff>=2)setState(s=>({...s,totalXp:Math.max(0,s.totalXp-diff*10),streak:0}));
    }
  },[]);

  // Penalites quotidiennes : obj avec penaltyXp non valid\u00e9s la veille (\u00e9chec)
  useEffect(()=>{
    const t=todayStr();
    const lastChk=state.lastPenaltyCheck||null;
    if(lastChk===t) return; // d\u00e9j\u00e0 v\u00e9rifi\u00e9 aujourd'hui
    const defs=state.objectives||DEFS;
    const penalizable=defs.filter(o=>(o.penaltyXp||o.penaltyAll)&&o.daily&&o.binary);
    if(penalizable.length===0){
      setState(s=>({...s,lastPenaltyCheck:t}));
      return;
    }
    // Calculer la veille
    const yest=new Date(new Date(t)-86400000);
    const yestStr=yest.toISOString().slice(0,10);
    const dayLog=(state.dailyLog||{})[yestStr]||{};
    const curRank=getRankWithStats(state.totalXp||0,state.stats||{});
    const ri=RANKS.findIndex(r=>r.id===curRank.id);
    let totalPenalty=0;
    let sxDelta={};
    let penaltiesApplied=[];
    penalizable.forEach(obj=>{
      const startDate=obj.startDate;
      if(startDate && yestStr<startDate) return;
      const v=dayLog[obj.id]||0;
      const base=getRankBase(obj.id,ri,state.prestige||0);
      const validated=v>=base;
      if(!validated){
        if(obj.penaltyAll){
          // Quête rouge : vraie régression si non respectée
          totalPenalty+=14000;
          STATS.forEach(st=>{sxDelta[st]=(sxDelta[st]||0)-2000;});
          penaltiesApplied.push(obj.id);
          return;
        }
        const p=obj.penaltyXp||0;
        const baseStat=obj.stat;
        totalPenalty+=p;
        sxDelta[baseStat]=(sxDelta[baseStat]||0)-p;
        penaltiesApplied.push(obj.id);
      }
    });
    if(totalPenalty>0){
      setState(s=>{
        const newSx={...(s.statXp||{})};
        Object.keys(sxDelta).forEach(k=>{
          newSx[k]=Math.max(0,(newSx[k]||0)+sxDelta[k]);
        });
        const newStats={...(s.stats||{})};
        Object.keys(sxDelta).forEach(k=>{ newStats[k]=getLvl(newSx[k]||0); });
        const adultDays = penaltiesApplied.includes("adult") ? {...(s.adultPenaltyDays||{}),[yestStr]:true} : (s.adultPenaltyDays||{});
        return {...s,totalXp:Math.max(0,s.totalXp-totalPenalty),statXp:newSx,stats:newStats,adultPenaltyDays:adultDays,lastPenaltyCheck:t,lastPenaltiesApplied:{date:yestStr,ids:penaltiesApplied,total:totalPenalty}};
      });
    } else {
      setState(s=>({...s,lastPenaltyCheck:t}));
    }
  },[]);




  // ─── CALCULS DERIVES (dans l'ordre, sans circularite) ──────────────────

  const today = todayStr();
  const wk    = wkStr();
  const objs  = state.objectives||DEFS;
  const tLog  = state.dailyLog[today]||{};
  const wLog  = state.weeklyLog[wk]||{};
  const prestige = state.prestige||0;

  const effectiveXp = state.totalXp;
  const rank     = getRankWithStats(effectiveXp, state.stats);
  const naturalRank = getRank(effectiveXp); // rang qu'on aurait sans les conditions de stats
  const nextRank = getNext(rank.id);
  const ri       = RANKS.findIndex(r=>r.id===rank.id);

  // Condition de stats pour le prochain rang
  const nextRankReq = nextRank ? RANK_STAT_REQUIREMENTS[nextRank.id] : null;
  const nextRankStatsCount = nextRankReq ? countStatsAtLevel(state.stats, nextRankReq.level) : 0;
  const nextRankStatsOk = nextRankReq ? nextRankStatsCount >= nextRankReq.count : true;
  // Rang bloqué : on a l'XP mais pas les stats
  const rankBlocked = nextRank && effectiveXp >= nextRank.xpRequired && !nextRankStatsOk;

  // 5. Progression XP dans le rang
  const xpInRank = effectiveXp - rank.xpRequired;
  const xpToNext = nextRank ? nextRank.xpRequired - rank.xpRequired : 1;
  const rankPct  = nextRank ? Math.min(100,(xpInRank/xpToNext)*100) : 100;

  // 5b. Prestige disponible : rang S atteint + XP max du rang S
  const S_RANK = RANKS[RANKS.length-1];
  const ASCENSION_XP_NEEDED = prestige > 0 ? getAscensionXpRequired(prestige + 1) : getAscensionXpRequired(1);
  const ASCENSION_XP_START  = prestige > 0 ? getAscensionXpRequired(prestige) : S_RANK.xpRequired;
  const nextAscension = prestige + 1;
  const ascReq = RANK_STAT_REQUIREMENTS["ASC_"+nextAscension];
  const ascStatsCount = ascReq ? countStatsAtLevel(state.stats, ascReq.level) : 0;
  const ascStatsOk = ascReq ? ascStatsCount >= ascReq.count : true;
  const prestigeXpReached = prestige < MAX_PRESTIGE && !nextRank && effectiveXp >= ASCENSION_XP_NEEDED;
  const prestigeAvailable = prestigeXpReached && ascStatsOk;
  const prestigeBlocked = prestigeXpReached && !ascStatsOk;

  // 6. XP du jour (journalières uniquement, pas l'hebdo)
  const todayXp = Object.entries(tLog).reduce((s,[id,a])=>{
    const o=objs.find(x=>x.id===id); if(!o) return s;
    const b = o.base && !RANK_BASES[o.id] ? o.base : getRankBase(o.id, ri, prestige);
    return s + calcXp(o, a, b);
  },0) + (state.specialQuests||[]).filter(q=>q.completedAt&&new Date(q.completedAt).toDateString()===new Date().toDateString()).reduce((s,q)=>s+q.xp,0);

  // 7. Quetes journalieres obligatoires toutes faites ?
  const reqDailyObjs  = objs.filter(o=>!o.optional&&o.daily);
  // Quêtes actives pour un jour donné (exclut les quêtes ajoutées après ce jour)
  const activeOn = (day) => reqDailyObjs.filter(o=>!o.startDate||o.startDate<=day);
  // Base applicable pour un jour donné (gère baseHistory pour les changements rétroactifs)
  const getBaseForDay = (obj,day) => {
    if(!obj.baseHistory||!day) return obj.base;
    // On cherche le premier "until" >= day (l'historique est trié par date croissante)
    for(const h of obj.baseHistory){
      if(day<=h.until) return h.base;
    }
    return obj.base;
  };
  // Seuil pour considérer une quête comme "faite" (streak/historique)
  // Si validateAt est défini, on l'utilise ; sinon getBaseForDay (= la base)
  const getValidateThreshold = (obj, day) => {
    if(obj.validateAt != null) return obj.validateAt;
    return getBaseForDay(obj, day);
  };

  // 7b. Système de dette
  const yesterday = (()=>{ const d=new Date(today); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })();
  const reqWeeklyObjs = objs.filter(o=>!o.optional&&o.weekly);

  // Semaine précédente pour dette hebdo
  const prevWkDate = (()=>{ const d=new Date(today); d.setDate(d.getDate()-7); return d; })();
  const prevWk = wkStr(prevWkDate);

  const debt = (()=>{
    if(!state.lastActiveDay || state.lastActiveDay !== yesterday || state.streak <= 0) return {};
    const yLog  = state.dailyLog[yesterday]||{};
    const yWk   = wkStr(new Date(yesterday));
    const yWLog = state.weeklyLog[yWk]||{};
    const d = {};

    // 1. Sommeil : binaire → dette = 30min méditation le lendemain
    if((yLog["sleep"]||0) < 1) d["sleep_med"] = true;

    // 2. Eau : verres manquants s'ajoutent à l'objectif du lendemain
    const waterBase = getRankBase("water", ri, prestige);
    const waterDone = yLog["water"]||0;
    if(waterDone < waterBase) d["water_extra"] = waterBase - waterDone;

    // 3. Pompes, abdos, squats, lecture → ×1.5
    ["push","abs","squats","reading"].forEach(id=>{
      const o = activeOn(yesterday).find(x=>x.id===id);
      if(!o) return;
      const done = yLog[id]||0;
      const target = getRankBase(id, ri, prestige);
      if(done < target) d[id] = true;
    });

    // 4. Course et Marche (mode blessure) → dette semaine suivante ×1.5
    // Vérifier si la semaine précédente est bien terminée (hier = dernier jour de la semaine passée)
    const todayWk = wkStr();
    if(yWk !== todayWk){
      // On vient de changer de semaine — vérifier les hebdos de la semaine passée
      reqWeeklyObjs.forEach(o=>{
        const done = yWLog[o.id]||0;
        const target = getRankBase(o.id, ri, prestige);
        if(done < target) d["weekly_"+o.id] = true;
      });
      if(restMode && walkObj){
        const wDone = yWLog["walk"]||0;
        const wTarget = walkObj.base;
        if(wDone < wTarget) d["weekly_walk"] = true;
      }
    }
    return d;
  })();

  const debtActive = Object.keys(debt).length > 0;

  // Objectif effectif selon type de dette
  function getEffectiveTarget(objId, isWeekly=false){
    const obj = objs.find(o=>o.id===objId);
    // Si validateAt défini sur cet objectif, c'est le seuil de validation streak
    if(obj && obj.validateAt != null) return obj.validateAt;
    const base = getRankBase(objId, ri, prestige);
    if(!debtActive) return base;
    // Pompes/abdos/squats/lecture : ×1.5
    if(["push","abs","squats","reading"].includes(objId) && debt[objId]) return Math.ceil(base * 1.5);
    // Eau : base + verres manquants hier
    if(objId === "water" && debt["water_extra"]) return base + debt["water_extra"];
    // Course / Marche (dette semaine suivante)
    if(isWeekly && debt["weekly_"+objId]) return Math.ceil(base * 1.5);
    return base;
  }

  // La dette méditation (sommeil) s'ajoute comme objectif du jour
  const sleepDebtMed = debt["sleep_med"] ? 30 : 0; // 30min de méditation obligatoires

  const allDailyDone = (()=>{
    const dailyOk = reqDailyObjs.every(o=>(tLog[o.id]||0)>=getEffectiveTarget(o.id));
    if(!dailyOk) return false;
    // Vérifier dette sommeil → méditation 30min obligatoire
    if(sleepDebtMed > 0 && (tLog["med"]||0) < sleepDebtMed) return false;
    return true;
  })();

  // 8. Streak : on remonte à partir d'hier (aujourd'hui peut être incomplet sans casser le streak)
  const computedStreak = (()=>{
    let streak=0;
    const d=new Date(today);
    d.setDate(d.getDate()-1); // on commence par hier
    for(let i=0;i<365;i++){
      const dk=d.toISOString().slice(0,10);
      const log=state.dailyLog[dk]||{};
      if(!activeOn(dk).every(o=>(log[o.id]||0)>=getValidateThreshold(o,dk)))break;
      streak++; d.setDate(d.getDate()-1);
    }
    // Si aujourd'hui est complet, on l'ajoute au streak
    const todayLog=state.dailyLog[today]||{};
    const todayDone=activeOn(today).every(o=>(todayLog[o.id]||0)>=getEffectiveTarget(o.id));
    if(todayDone) streak++;
    return streak;
  })();

  // 9. Bonus hebdo
  const restMode = state.restMode||false;
  const walkDef = objs.find(o=>o.id==="walk");
  // En mode blessure : walk passe de bonus daily → hebdo avec objectif adapté
  const walkObj = restMode && walkDef ? (()=>{
    const walkTarget = walkTargetRef.current||state.walkTarget||0;
    return walkTarget>0
      ? {...walkDef, daily:false, weekly:true, optional:false, base:walkTarget}
      : null;
  })() : null;

  // Semaine validée si : quêtes journalières OK sur les jours passés + course atteinte
  const weeklyDone = (()=>{
    const ws=new Date(); ws.setDate(ws.getDate()-((ws.getDay()+6)%7)); ws.setHours(0,0,0,0);
    const days=Array.from({length:7},(_,i)=>{const d=new Date(ws);d.setDate(ws.getDate()+i);return d.toISOString().slice(0,10);});
    const pastDays=days.filter(d=>d<=today);
    if(pastDays.length===0)return false;
    const dailyOk=reqDailyObjs.every(o=>pastDays.every(d=>activeOn(d).indexOf(o)<0||(state.dailyLog[d]?.[o.id]||0)>=getEffectiveTarget(o.id)));
    if(!dailyOk)return false;
    const runBase=getEffectiveTarget("run", true);
    const runDone=wLog["run"]||0;
    if(runDone>=runBase)return true;
    if(restMode&&walkObj){
      const walkDone=wLog["walk"]||0;
      const walkBase=getEffectiveTarget("walk", true);
      const runCredit=walkDone*2;
      return (runDone+runCredit)>=runBase || walkDone>=walkBase;
    }
    return false;
  })();

  // 10. Quete speciale
  const [now,setNow] = useState(Date.now());
  useEffect(()=>{
    const id=setInterval(()=>setNow(Date.now()),30000); // tick toutes les 30s
    return ()=>clearInterval(id);
  },[]);
  const sqs         = state.specialQuests||[];
  const activeSq    = sqs.find(q=>!q.completedAt&&now<q.expiresAt)||null;
  const completedSq = sqs.find(q=>q.completedAt&&(now-q.completedAt)<86400000)||null;
  const sqCooldownUntil = state.sqCooldownUntil||null;
  const sqCooldownActive = sqCooldownUntil && now < sqCooldownUntil;
  const sqReady = !activeSq && !sqCooldownActive;

  // 11. Épreuves
  const epreuves = state.epreuves||[];
  const activeEp = epreuves.find(e=>!e.completedAt&&!e.failedAt&&now<e.expiresAt)||null;
  // Épreuve récemment complétée (visible tant que le cooldown court)
  const completedEp = epreuves.find(e=>e.completedAt&&(now-e.completedAt)<(7*86400000))||null;
  const cooldownUntil = state.epreuveCooldownUntil||null;
  const cooldownActive = cooldownUntil && now < cooldownUntil;
  const epReady = !activeEp && !cooldownActive;
  // Vérifier échec épreuve streak7 (si hier non validé)
  const failedEp = (()=>{
    if(!activeEp||!activeEp.streak7) return null;
    const yDay = yesterday;
    const yValidations = activeEp.dailyValidations||[];
    if(yValidations.length>0){
      const lastVal = yValidations[yValidations.length-1];
      if(lastVal !== yDay && activeEp.startedAtDay !== yDay) return activeEp;
    }
    return null;
  })();

  // Flags bonus
  const bonusGiven       = state.streakBonusDay===today;
  const weeklyBonusGiven = state.weeklyBonusWk===wk;
  const missedDays       = (()=>{
    if(!state.lastActiveDay)return 0;
    const d=Math.round((new Date(today)-new Date(state.lastActiveDay))/86400000);
    return d>1?d:0;
  })();


  // ─── EFFECTS ──────────────────────────────────────────────────────────

  // Couleur CSS du rang
  useEffect(()=>{
    const r=document.documentElement.style;
    r.setProperty("--rc",rank.color); r.setProperty("--rg",rank.glow);
    const iconFx=iconThemeFilter(rank.color);
    r.setProperty("--icon-filter",iconFx.base);
    r.setProperty("--icon-filter-active",iconFx.active);
    r.setProperty("--ra",rank.accent); r.setProperty("--bg",rank.bg);
    const app=document.querySelector("#app");
    if(app) app.style.background=rank.bg;
  },[rank.id]);

  // Sync streak
  useEffect(()=>{
    if(computedStreak!==state.streak)setState(s=>({...s,streak:computedStreak}));
  },[computedStreak]);

  // Bonus streak + increment streak au moment ou toutes les quetes sont faites
  useEffect(()=>{
    if(!allDailyDone)return;
    setState(s=>{
      const t=todayStr();
      let next={...s};
      if(s.lastStreakDay!==t)next={...next,lastStreakDay:t};
      if(s.streakBonusDay!==t){
        const sx={...next.statXp,Discipline:(next.statXp.Discipline||0)+250};
        const rkBefore=getRankWithStats(next.totalXp, next.stats);
        next={...next,totalXp:next.totalXp+250,statXp:sx,stats:{...next.stats,Discipline:getLvl(sx.Discipline)},streakBonusDay:t};
        const rkAfter=getRankWithStats(next.totalXp, next.stats);
        if(rkAfter.id!==rkBefore.id)setTimeout(()=>setRankUp(rkAfter),300);
        // Milestone tous les 7 jours de streak
        const newStreak=next.streak;
        const milestones=next.streakMilestones||[];
        if(newStreak>0 && newStreak%7===0 && !milestones.includes(newStreak)){
          const milestoneXp=500;
          const sx2={...sx,Discipline:(sx.Discipline||0)+milestoneXp};
          next={...next,totalXp:next.totalXp+milestoneXp,statXp:sx2,stats:{...next.stats,Discipline:getLvl(sx2.Discipline)},streakMilestones:[...milestones,newStreak]};
          setTimeout(()=>{
            const id1=Date.now()+Math.random(),id2=id1+0.1;
            setFloats(f=>[...f,{id:id1,y:"30%",txt:"\uD83C\uDFC6 MILESTONE "+newStreak+" JOURS !"},{id:id2,y:"35%",txt:"+500 XP Discipline"}]);
            setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id1&&p.id!==id2)),2000);
          },600);
        } else {
          setTimeout(()=>{
            const id1=Date.now()+Math.random(),id2=id1+0.1;
            setFloats(f=>[...f,{id:id1,y:"35%",txt:"\uD83D\uDD25 STREAK BONUS !"},{id:id2,y:"40%",txt:"+250 XP Discipline"}]);
            setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id1&&p.id!==id2)),1400);
          },300);
        }
      }
      return next;
    });
  },[allDailyDone]);

  // Auto-launch quete speciale si sqReady (pas active + cooldown passé)
  useEffect(()=>{
    if(!sqReady) return;
    setState(s=>{
      // Re-check dans le setter (state à jour)
      const sqsNow = s.specialQuests||[];
      const hasActive = sqsNow.find(q=>!q.completedAt&&Date.now()<q.expiresAt);
      const cd = s.sqCooldownUntil||0;
      if(hasActive || Date.now()<cd) return s;
      const result=pickRandomSq(sqsNow.map(q=>q.id),s.restMode,s.sqStatCycle);
      if(!result)return s;
      const {tpl,pickedStat,cycleReset}=result;
      const t = Date.now();
      const sq={...tpl,sqid:"sq_"+t,progress:0,startedAt:t,expiresAt:next7AM(t),completedAt:null};
      const newCycle = cycleReset ? [pickedStat] : [...(s.sqStatCycle||[]),pickedStat];
      return {...s,specialQuests:[...sqsNow.filter(q=>q.completedAt),sq],sqStatCycle:newCycle,sqCooldownUntil:next7AM(t)};
    });
  },[sqReady]);

  // Sauvegarder quête urgente complétée dans le log
  useEffect(()=>{
    if(!completedSq) return;
    setState(s=>{
      const log = s.completedSqLog||[];
      if(log.find(e=>e.sqid===completedSq.sqid)) return s;
      return {...s, completedSqLog:[...log,{sqid:completedSq.sqid,id:completedSq.id,name:completedSq.name,icon:completedSq.icon,xp:completedSq.xp,stat:completedSq.stat,completedAt:completedSq.completedAt}]};
    });
  },[completedSq?.sqid]);

  // Détection échec épreuve streak7
  useEffect(()=>{
    if(!activeEp||!activeEp.streak7) return;
    const yDay = yesterday;
    const vals = activeEp.dailyValidations||[];
    const startDay = activeEp.startedAtDay;
    if(startDay === today) return; // lancée aujourd'hui, pas encore de vérif
    if(vals.length === 0 || vals[vals.length-1] !== yDay){
      // Hier non validé → échec : cooldown jusqu'au prochain lundi 7h
      setState(s=>({...s,
        epreuves:s.epreuves.map(e=>e.epid===activeEp.epid?{...e,failedAt:Date.now()}:e),
        epreuveCooldownUntil:nextMondayAt7()
      }));
    }
  },[today]);

  // Auto-launch épreuve si epReady (= pas d'épreuve active + cooldown passé)
  useEffect(()=>{
    if(!epReady) return;
    setState(s=>{
      // Re-check dans le setter
      const eps = s.epreuves||[];
      const hasActive = eps.find(e=>!e.completedAt&&!e.failedAt&&Date.now()<e.expiresAt);
      const cd = s.epreuveCooldownUntil||0;
      if(hasActive || Date.now()<cd) return s;
      const completedIds = s.completedEpreuveIds||[];
      const rollDonjon = Math.random() < 0.20;
      let result = rollDonjon ? pickRandomDonjon(completedIds) : pickRandomEpreuve(completedIds, cd, s.epStatCycle);
      let pickedStat = null, cycleReset = false;

      // Fallback : si le type tiré n'a plus de contenu disponible, on prend l'autre.
      if(!result && rollDonjon) result = pickRandomEpreuve(completedIds, cd, s.epStatCycle);
      if(!result && !rollDonjon) result = pickRandomDonjon(completedIds);
      if(!result) return s;

      if(!result.tpl.kind || result.tpl.kind!=="donjon"){
        pickedStat = result.pickedStat;
        cycleReset = result.cycleReset;
      }

      const {tpl}=result;
      const t = Date.now();
      const ep={...tpl,epid:"ep_"+t,progress:0,goalProgress:{},startedAt:t,startedAtDay:today,expiresAt:nextMondayAt7(t),completedAt:null,failedAt:null,dailyValidations:[]};
      const newCycle = tpl.kind==="donjon" ? (s.epStatCycle||[]) : (cycleReset ? [pickedStat] : [...(s.epStatCycle||[]),pickedStat]);
      return {...s,epreuves:[...(s.epreuves||[]).filter(e=>e.completedAt||e.failedAt),ep],epStatCycle:newCycle,epreuveCooldownUntil:nextMondayAt7(t)};
    });
  },[epReady]);

  function spawnFloat(txt,e){
    const id=Date.now()+Math.random();
    setFloats(f=>[...f,{id,txt}]);
    setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),2300);
  }

  const STAT_LBL2={"Force":"Force","Sante":"Sant\u00e9","Intelligence":"Intelligence","Concentration":"Concentration","Endurance":"Endurance","Agilite":"Agilit\u00e9","Discipline":"Discipline"};
  function addXp(amount,stat,e,silent,showStat){
    setState(s=>{
      const nt=s.totalXp+amount;
      const sx={...s.statXp,[stat]:(s.statXp[stat]||0)+amount};
      const newStats={...s.stats,[stat]:getLvl(sx[stat])};
      const rkBefore=getRankWithStats(s.totalXp, s.stats);
      const rkAfter=getRankWithStats(nt, newStats);
      if(rkAfter.id!==rkBefore.id)setTimeout(()=>setRankUp(rkAfter),100);
      return {...s,totalXp:nt,statXp:sx,stats:newStats,lastActiveDay:todayStr()};
    });
    if(e&&!silent){
      const lbl=showStat?("+"+Math.round(amount)+" XP "+( STAT_LBL2[showStat]||showStat)):("+"+Math.round(amount)+" XP");
      spawnFloat(lbl,e);
    }
  }

  function validate(obj,e,forceVal){
    if(e){e.preventDefault();e.stopPropagation();}
    const el=document.getElementById("qi_"+obj.id);
    const raw=(inputs.current[obj.id]||"").toString().replace(",",".");
    const val=parseFloat(raw); if(!val||val<=0)return;
    inputs.current[obj.id]="";
    if(el){el.value="";setTimeout(()=>{try{el.focus();}catch(_){}},50);}
    const cur=(obj.weekly||obj.id==="walk")?(wLog[obj.id]||0):(tLog[obj.id]||0);
    let xp=0;
    let capJustReached=false; // true si on franchit le cap dans cette session
    // Calcul du cap (si défini)
    const b=getRankBase(obj.id,ri,prestige);
    const hasCap = (obj.cap || obj.capValue) && obj.base && !obj.binary;
    const capThreshold = obj.capValue ? obj.capValue : (hasCap ? b * obj.cap : Infinity);
    const prev=cur, next=cur+val;
    // Si déjà au-delà du cap : pas d'XP pour cette session
    const alreadyCapped = hasCap && prev >= capThreshold;
    // Si on franchit le cap pendant cette session, on plafonne le "next effectif" à capThreshold
    const effectiveNext = hasCap ? Math.min(next, capThreshold) : next;
    const effectiveVal = effectiveNext - prev; // partie qui compte pour l'XP
    if(hasCap && prev < capThreshold && next >= capThreshold){
      capJustReached = true;
    }
    // Tout objectif avec un base, non-binary, hors cas spéciaux (water/run) entre dans le système palier
    const isPalier = obj.base && !obj.binary && obj.id!=="water" && obj.id!=="run";
    // Cas spécial : quête avec tiers (repas équilibré x/2, etc.)
    if(obj.tiers && obj.tiers.length>0){
      // Sauvegarder le log d'abord
      setState(s=>{
        const d={...s.dailyLog};d[today]={...(d[today]||{}),[obj.id]:(d[today]?.[obj.id]||0)+val};
        return{...s,dailyLog:d,lastActiveDay:todayStr()};
      });
      // Calculer les tiers franchis
      const crossedTiers = obj.tiers.filter(t => prev < t.at && next >= t.at);
      if(crossedTiers.length>0){
        const xpByStat = {};
        crossedTiers.forEach(t=>{
          addXp(t.xp, t.stat, null, true);
          xpByStat[t.stat] = (xpByStat[t.stat]||0) + t.xp;
          if(t.xp2 && t.stat2){
            addXp(t.xp2, t.stat2, null, true);
            xpByStat[t.stat2] = (xpByStat[t.stat2]||0) + t.xp2;
          }
        });
        // Float global
        const lines = Object.entries(xpByStat).map(([stat,xp])=>"+"+xp+" XP "+(STAT_LBL2[stat]||stat));
        lines.forEach((txt,i)=>{
          const id=Date.now()+Math.random()+i*0.01;
          setFloats(f=>[...f,{id, y:(38+i*3)+"%", txt}]);
          setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),2300);
        });
      }
      return;
    }
    if(obj.id==="reading"){
      const intXp=Math.max(0,effectiveVal)*obj.xpPer;
      const concXp=Math.floor(Math.max(0,effectiveVal)/(obj.concBlock||10))*(obj.concBlockXp||50);
      setState(s=>{
        const d={...s.dailyLog};d[today]={...(d[today]||{}),[obj.id]:(d[today]?.[obj.id]||0)+val};
        let next2={...s,dailyLog:d,lastActiveDay:todayStr()};
        if(capJustReached){
          const periodKey = obj.weekly ? wk : today;
          next2={...next2, capReached:{...(next2.capReached||{}),[obj.id]:periodKey}};
        }
        return next2;
      });
      const ids=[];
      if(intXp>0){ addXp(intXp,obj.stat,null,true); ids.push({txt:"+"+Math.round(intXp)+" XP "+(STAT_LBL2[obj.stat]||obj.stat)}); }
      if(concXp>0){ addXp(concXp,obj.stat2,null,true); ids.push({txt:"+"+Math.round(concXp)+" XP "+(STAT_LBL2[obj.stat2]||obj.stat2)}); }
      if(ids.length){
        ids.forEach((it,i)=>{ const id=Date.now()+Math.random()+i*0.01; setFloats(f=>[...f,{id,y:(38+i*3)+"%",txt:it.txt}]); setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),2300); });
      } else if(!capJustReached && !alreadyCapped) spawnFloat("0 XP",e);
      if(capJustReached){ addXp(200,"Discipline",null,true); setCapAnim({obj,xMult:"60min"}); }
      return;
    }
    if(obj.binary){const was=cur>=getRankBase(obj.id,ri,prestige),now2=(cur+val)>=getRankBase(obj.id,ri,prestige); xp=(!was&&now2)?(obj.binaryXp||50):0;}
    else if(alreadyCapped){
      // Déjà cappé : 0 XP, mais on log la valeur quand même
      xp=0;
    }
    else if(isPalier){
      // Utilise effectiveVal (plafonné au cap si on dépasse)
      if(obj.optional){
        // Quêtes bonus : XP linéaire dès le début + 1 bonus par palier franchi à partir du palier 2
        xp=effectiveVal*obj.xpPer;
        const prevMult=prev<b?0:Math.floor(prev/b);
        const nextMult=effectiveNext<b?0:Math.floor(effectiveNext/b);
        for(let m=Math.max(2,prevMult+1);m<=nextMult;m++){
          xp+=b*obj.xpPer;
        }
      } else {
        // Quêtes journalières : 0 XP si objectif non atteint
        if(effectiveNext<b){xp=0;}
        else {
          const xpNext=effectiveNext*obj.xpPer;
          const xpPrev=prev>=b?prev*obj.xpPer:0;
          xp=xpNext-xpPrev;
          const prevMult=prev<b?1:Math.floor(prev/b);
          const nextMult=Math.floor(effectiveNext/b);
          for(let m=Math.max(2,prevMult+1);m<=nextMult;m++){
            xp+=b*obj.xpPer;
          }
        }
      }
    }
    else if(obj.id==="run"){
      // Course : linéaire 100xp/km + 50% bonus si total >= 2x objectif
      // Avec cap éventuel
      xp=effectiveVal*obj.xpPer;
      const totalAfter=effectiveNext;
      if(totalAfter>=b*2) xp+=Math.round(effectiveVal*obj.xpPer*0.5);
    }
    else if(obj.id==="walk"&&restMode){
      // Marche en mode blessure : linéaire 50xp/km + 50% bonus si total >= 2x objectif
      const bw=walkObj?walkObj.base:getRankBase("run",ri);
      xp=val*obj.xpPer;
      const totalAfter=cur+val;
      if(totalAfter>=bw*2) xp+=Math.round(val*obj.xpPer*0.5);
    }
    else{const nt=cur+val; if(cur>=b)xp=val*obj.xpPer; else if(nt<=b)xp=val*obj.xpPer; else xp=val*obj.xpPer;}
    setState(s=>{
      let next2 = s;
      if(obj.weekly||obj.id==="walk"){
        const w={...s.weeklyLog};w[wk]={...(w[wk]||{}),[obj.id]:(w[wk]?.[obj.id]||0)+val};
        // Stocker aussi dans dailyLog pour l'XP du jour
        const d2={...s.dailyLog};d2[today]={...(d2[today]||{}),[obj.id]:(d2[today]?.[obj.id]||0)+val};
        next2={...s,weeklyLog:w,dailyLog:d2,lastActiveDay:todayStr()};
      } else {
        const d={...s.dailyLog};d[today]={...(d[today]||{}),[obj.id]:(d[today]?.[obj.id]||0)+val};
        next2={...s,dailyLog:d,lastActiveDay:todayStr()};
      }
      // Marquer cap atteint
      if(capJustReached){
        const periodKey = obj.weekly ? wk : today;
        next2={...next2, capReached:{...(next2.capReached||{}),[obj.id]:periodKey}};
      }
      return next2;
    });
    if(xp>0){
      if(obj.stat2&&obj.xpPer2){
        // Double stat avec XP différents (flex:5+5, grips:5+5)
        const xp2=Math.round(xp*(obj.xpPer2/obj.xpPer));
        const id1=Date.now()+Math.random(), id2=id1+0.01;
        setFloats(f=>[...f,
          {id:id1,y:"38%",txt:"+"+Math.round(xp)+" XP "+(STAT_LBL2[obj.stat]||obj.stat)},
          {id:id2,y:"41%",txt:"+"+Math.round(xp2)+" XP "+(STAT_LBL2[obj.stat2]||obj.stat2)}
        ]);
        setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id1&&p.id!==id2)),2300);
        addXp(xp,obj.stat,null,true);
        addXp(xp2,obj.stat2,null,true);
      } else if(obj.stat2){
        // Double stat même XP (squats)
        const id1=Date.now()+Math.random(), id2=id1+0.01;
        setFloats(f=>[...f,
          {id:id1,y:"38%",txt:"+"+Math.round(xp)+" XP "+(STAT_LBL2[obj.stat]||obj.stat)},
          {id:id2,y:"41%",txt:"+"+Math.round(xp)+" XP "+(STAT_LBL2[obj.stat2]||obj.stat2)}
        ]);
        setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id1&&p.id!==id2)),2300);
        addXp(xp,obj.stat,null,true);
        addXp(xp,obj.stat2,null,true);
      } else {
        addXp(xp,obj.stat,e,false,obj.stat);
      }
    } else if(!capJustReached && !alreadyCapped) spawnFloat("0 XP",e);
    // Cap atteint : déclencher animation + bonus 200 XP Discipline
    if(capJustReached){
      addXp(200,"Discipline",null,true);
      setCapAnim({obj,xMult:obj.cap});
    }
  }

  function progressSq(sq,e,directVal){
    let val;
    if(directVal!==undefined){
      val = directVal;
    } else {
      const el=document.getElementById("sqi_"+sq.sqid); if(!el)return;
      const raw=el.value.toString().replace(",","."); el.value="";
      val=parseFloat(raw);
    }
    if(!val||val<=0)return;
    const newProg=Math.min(sq.target,sq.progress+val);
    const wasComplete=sq.progress>=sq.target;
    const nowComplete=newProg>=sq.target;

    // Si la quête a des paliers intermédiaires (tiers), on distribue le XP palier par palier
    if(sq.tiers&&sq.tiers.length>0){
      const crossedTiers = sq.tiers.filter(t=>sq.progress<t.at&&newProg>=t.at);
      if(crossedTiers.length>0){
        // Cumuler le XP par stat pour l'affichage
        const xpByStat = {};
        crossedTiers.forEach(t=>{
          addXp(t.xp,t.stat,null,true);
          xpByStat[t.stat]=(xpByStat[t.stat]||0)+t.xp;
          // xp2/stat2 du palier optionnel
          if(t.xp2&&t.stat2){
            addXp(t.xp2,t.stat2,null,true);
            xpByStat[t.stat2]=(xpByStat[t.stat2]||0)+t.xp2;
          }
        });
        const id1=Date.now()+Math.random();
        const id2=id1+0.1;
        const xpText = Object.entries(xpByStat).map(([stat,xp])=>{
          const lbl = STAT_LBL2[stat] || STAT_LBL[stat] || stat || "";
          return "+"+xp+" XP"+(lbl?" "+lbl:"");
        }).join("\n");
        const headerTxt = nowComplete ? "\uD83C\uDFC6 QU\u00c9TE VALID\u00c9E !" : "\u2728 PALIER FRANCHI !";
        setFloats(f=>[...f,
          {id:id1,y:"35%",txt:headerTxt},
          {id:id2,y:"40%",txt:xpText}
        ]);
        setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id1&&p.id!==id2)),1400);
      }
      setState(s=>({...s,specialQuests:s.specialQuests.map(q=>q.sqid===sq.sqid?{...q,progress:newProg,completedAt:(nowComplete&&!wasComplete)?Date.now():q.completedAt}:q),
        sqCooldownUntil:(nowComplete&&!wasComplete)?next7AM():(s.sqCooldownUntil||null)}));
      return;
    }

    // Comportement standard : XP uniquement à la complétion totale
    if(!wasComplete&&nowComplete){
      const xpPairs = [
        {xp:sq.xp, stat:sq.stat},
        sq.xp2&&sq.stat2 ? {xp:sq.xp2, stat:sq.stat2} : null,
        sq.xp3&&sq.stat3 ? {xp:sq.xp3, stat:sq.stat3} : null,
      ].filter(Boolean);
      xpPairs.forEach(p=>addXp(p.xp,p.stat,null,true));
      const id1=Date.now()+Math.random();
      const id2=id1+0.1;
      const xpText = xpPairs.map(p=>{
        const lbl = STAT_LBL2[p.stat] || STAT_LBL[p.stat] || p.stat || "";
        return "+"+p.xp+" XP"+(lbl?" "+lbl:"");
      }).join("\n");
      setFloats(f=>[...f,
        {id:id1,y:"35%",txt:"\uD83C\uDFC6 QU\u00c9TE VALID\u00c9E !"},
        {id:id2,y:"40%",txt:xpText}
      ]);
      setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id1&&p.id!==id2)),1400);
    }
    setState(s=>({...s,specialQuests:s.specialQuests.map(q=>q.sqid===sq.sqid?{...q,progress:newProg,completedAt:(nowComplete&&!wasComplete)?Date.now():q.completedAt}:q),
      sqCooldownUntil:(nowComplete&&!wasComplete)?next7AM():(s.sqCooldownUntil||null)}));
  }

  function launchNewSq(){
    setState(s=>{
      const result=pickRandomSq(s.specialQuests.map(q=>q.id),s.restMode,s.sqStatCycle);
      if(!result)return s;
      const {tpl,pickedStat,cycleReset}=result;
      const sq={...tpl,sqid:"sq_"+Date.now(),progress:0,startedAt:Date.now(),expiresAt:next7AM(Date.now()),completedAt:null};
      const newCycle = cycleReset ? [pickedStat] : [...(s.sqStatCycle||[]),pickedStat];
      return {...s,specialQuests:[...s.specialQuests.filter(q=>q.completedAt),sq],sqStatCycle:newCycle};
    });
  }

  function fmtCD(ms){
    const d=Math.floor(ms/86400000),hh=Math.floor((ms%86400000)/3600000),mm=Math.floor((ms%3600000)/60000);
    if(d>0)return d+"j "+hh+"h"; if(hh>0)return hh+"h "+mm+"min"; return mm+"min";
  }

  // ─── SOUS-COMPOSANTS ──────────────────────────────────────────────────

  function QI({obj}){
    const isWeekly = obj.weekly || obj.id==="walk";
    const t = getEffectiveTarget(obj.id, isWeekly);
    // Si obj.target est défini sans binary, on l'utilise pour l'affichage (ex: protein 1/2 → 2/2)
    const displayTarget = (obj.target && !obj.binary) ? obj.target : t;
    const d = isWeekly ? (wLog[obj.id]||0) : (tLog[obj.id]||0);

    // Détection dette par type
    const isDebtX15  = debtActive && ["push","abs","squats","reading"].includes(obj.id) && !!debt[obj.id];
    const isDebtWater = debtActive && obj.id==="water" && !!debt["water_extra"];
    const isDebtWeekly= debtActive && isWeekly && !!debt["weekly_"+obj.id];
    // Dette méditation (sommeil) — on modifie l'affichage de la quête méditation
    const isDebtMed  = sleepDebtMed > 0 && obj.id==="med";
    const medTarget  = isDebtMed ? Math.max(t, sleepDebtMed) : t;
    const effectiveT = isDebtMed ? medTarget : t;
    const isDebt = isDebtX15 || isDebtWater || isDebtWeekly || isDebtMed;
    const done=obj.binary?(d>=1):(d>=effectiveT);

    // Quêtes binaires : boutons Échec / Succès
    if(obj.binary){
      function setBinary(val,e){
        const curRaw=(obj.weekly||obj.id==="walk")?wLog[obj.id]:tLog[obj.id];
        const cur=curRaw||0;
        const wasD=cur>=1;
        const xp=(!wasD&&val>=1)?obj.binaryXp:0;
        const cx=e?e.clientX:200, cy=e?e.clientY:300;
        const shouldPenaltyAll = obj.penaltyAll && val===0 && curRaw!==0;
        setState(s=>{
          const d2={...s.dailyLog};
          d2[today]={...(d2[today]||{}),[obj.id]:val};
          let next={...s,dailyLog:d2,lastActiveDay:todayStr()};
          if(shouldPenaltyAll && !(s.adultPenaltyDays||{})[today]){
            const sx={...(s.statXp||{})};
            STATS.forEach(st=>{sx[st]=Math.max(0,(sx[st]||0)-1000);});
            const st={...(s.stats||{})};
            STATS.forEach(k=>{st[k]=getLvl(sx[k]||0);});
            next={...next,totalXp:Math.max(0,(s.totalXp||0)-7000),statXp:sx,stats:st,adultPenaltyDays:{...(s.adultPenaltyDays||{}),[today]:true}};
          }
          return next;
        });
        if(shouldPenaltyAll){
          const id=Date.now()+Math.random();
          setFloats(f=>[...f,{id,x:cx,y:cy,txt:"-7000 XP GLOBAL\n-1000 XP toutes stats"}]);
          setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),1800);
        }
        if(xp>0){
          const id=Date.now()+Math.random();
          setFloats(f=>[...f,{id,x:cx,y:cy,txt:"+"+xp+" XP "+(STAT_LBL[obj.stat]||obj.stat)}]);
          setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),1300);
          setState(s=>{
            const sx={...s.statXp,[obj.stat]:(s.statXp[obj.stat]||0)+xp};
            const st={...s.stats,[obj.stat]:getLvl(sx[obj.stat])};
            return {...s,totalXp:s.totalXp+xp,statXp:sx,stats:st,lastActiveDay:todayStr()};
          });
        }
      }
      const validated = tLog[obj.id] !== undefined;
      const failFlex = validated && !done ? 3 : 1;
      const succFlex = validated && done ? 3 : 1;
      return h("div",{class:"qi "+(done?"done":"")},
        h("div",{class:"qhdr",style:"display:flex;justify-content:space-between;align-items:flex-start;gap:8px"},
          h("div",{class:"qname",style:"flex:1;min-width:0;display:flex;align-items:flex-start;gap:6px;line-height:1.25;white-space:normal;overflow:visible"},QuestIcon(obj.id,obj.icon,20,"margin-top:-2px"),h("span",{style:"line-height:1.25;white-space:normal;overflow:visible;text-overflow:clip"},obj.name)),
          h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:0.5px;text-align:right;white-space:nowrap;flex-shrink:0;line-height:1.25;padding-top:1px"},
            obj.binaryXp+" XP · "+(STAT_LBL[obj.stat]||obj.stat)
          )
        ),
        obj.penaltyAll
          ? h("div",{style:"display:flex;gap:8px;margin-top:8px"},
              h("button",{
                onClick:e=>setBinary(1,e),
                style:"flex:1;padding:10px;border-radius:8px;border:1px solid "+(validated&&done?"var(--rc)":"rgba(255,255,255,0.08)")+";background:"+(validated&&done?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.02)")+";color:"+(validated&&done?"#4ade80":"rgba(255,255,255,0.7)")+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s;white-space:nowrap;overflow:hidden"
              }, "Succès ✓")
            )
          : h("div",{style:"display:flex;gap:8px;margin-top:8px"},
              h("button",{
                onClick:e=>setBinary(0,e),
                style:"flex:"+failFlex+";padding:"+(validated&&done?"6px 4px":"10px")+";border-radius:8px;border:1px solid "+(validated&&!done?"var(--rc)":"rgba(255,255,255,0.08)")+";background:rgba(255,255,255,0.02);color:"+(validated&&!done?"#ef4444":"rgba(255,255,255,0.25)")+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s;white-space:nowrap;overflow:hidden"
              },"✘ Échec"),
              h("button",{
                onClick:e=>setBinary(1,e),
                style:"flex:"+succFlex+";padding:"+(validated&&!done?"6px 4px":"10px")+";border-radius:8px;border:1px solid "+(validated&&done?"var(--rc)":"rgba(255,255,255,0.08)")+";background:"+(validated&&done?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.02)")+";color:"+(validated&&done?"#4ade80":"rgba(255,255,255,0.25)")+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s;white-space:nowrap;overflow:hidden"
              },"Succès ✓")
            ),

      );
    }

    const pct=(d/displayTarget)*100, over=d>displayTarget;
    const debtLabel = isDebtX15?"×1.5":isDebtWater?"+"+debt["water_extra"]+" verres":isDebtWeekly?"×1.5 hebdo":isDebtMed?"🛌 +30min obligatoire":"";
    // ── Système de cap ──
    const hasCap = (obj.cap || obj.capValue) && obj.base && !obj.binary;
    const capThreshold = obj.capValue ? obj.capValue : (hasCap ? (obj.base&&!RANK_BASES[obj.id]?obj.base:getRankBase(obj.id,ri,prestige))*obj.cap : Infinity);
    const isCapped = hasCap && d >= capThreshold;
    const capProgress = hasCap ? Math.min(1, d/capThreshold) : 0;
    const isNearCap = hasCap && !isCapped && capProgress >= 0.75;
    const remainingToCap = hasCap ? Math.max(0, capThreshold - d) : 0;
    // Couleur de la barre : du rang vers orange à l'approche du cap
    const rankColor = rank.color || "#9ca3af";
    const capColor = "#ef4444";
    let barColor = rankColor;
    if(isCapped){ barColor = capColor; }
    else if(isNearCap){
      barColor = "linear-gradient(90deg,"+rankColor+","+capColor+")";
    }
    // Halo selon état (priorité : cap > done > debt > neutre)
    const haloShadow = isCapped
      ? "0 0 12px "+capColor+",0 0 24px "+capColor+"66"
      : (d>=effectiveT&&effectiveT>0)
        ? "0 0 12px var(--rc),0 0 24px var(--rg)"
        : "";
    const barInnerStyle = (isCapped
      ? "width:100%;background:"+capColor
      : "width:"+Math.min(100,pct)+"%;background:"+barColor)
      + (haloShadow?";box-shadow:"+haloShadow:"");
    return h("div",{class:"qi "+(d>=effectiveT&&effectiveT>0?"done":""),style:(isDebt&&!done?"border-color:#ef444466;background:rgba(239,68,68,0.04)":"")+(isCapped?";border-color:"+capColor+"66;background:linear-gradient(135deg,rgba(255,255,255,0.02),rgba(239,68,68,0.06))":"")},
      h("div",{class:"qhdr",style:"display:flex;justify-content:space-between;align-items:flex-start;gap:8px"},
        h("div",{class:"qname",style:"flex:1;min-width:0;display:flex;align-items:flex-start;gap:6px;white-space:normal;overflow:visible;line-height:1.25"},
          QuestIcon(obj.id,obj.icon,22,isCapped?"filter:grayscale(60%);opacity:0.7;margin-top:-2px;line-height:1.25":"margin-top:-2px;line-height:1.25"),
          h("span",{style:"white-space:normal;overflow:visible;text-overflow:clip;line-height:1.25;word-break:normal"},obj.name),
          hasCap&&!isCapped&&h("span",{style:"font-size:9px;font-family:Orbitron,sans-serif;letter-spacing:0.5px;padding:2px 6px;border-radius:4px;color:"+capColor+";border:1px solid "+capColor+"44;flex-shrink:0"},(obj.capValue?("CAP "+obj.capValue+" "+obj.unit):("CAP \u00d7"+obj.cap))),
          isDebt&&!done&&h("span",{style:"font-size:9px;color:#ef4444;font-family:Orbitron,sans-serif;border:1px solid #ef444455;border-radius:4px;padding:1px 5px;flex-shrink:0"},"\u26A0 DETTE "+debtLabel)
        ),
        h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:0.5px;text-align:right;white-space:nowrap;flex-shrink:0;line-height:1.25;align-self:flex-start;padding-top:1px"},
          obj.tiers
            ?h(Fragment,null,
                ...obj.tiers.map((tier,i)=>{
                  const parts = [];
                  parts.push(tier.xp+" XP \u00b7 "+(STAT_LBL[tier.stat]||tier.stat));
                  if(tier.xp2 && tier.stat2) parts.push(tier.xp2+" XP \u00b7 "+(STAT_LBL[tier.stat2]||tier.stat2));
                  return h("div",{key:i,style:"opacity:"+(d>=tier.at?"1":"0.6")+";white-space:nowrap"},(d>=tier.at?"\u2713 ":"")+parts.join(" + "));
                })
              )
            :obj.binary
              ?(obj.binaryXp+" XP \u00b7 "+(STAT_LBL[obj.stat]||obj.stat))
              :obj.stat2
                ?h(Fragment,null,
                    h("div",null,obj.xpPer+" XP/"+obj.unit+" \u00b7 "+(STAT_LBL[obj.stat]||obj.stat)),
                    h("div",null,(obj.xpPer2||obj.xpPer)+" XP/"+obj.unit+" \u00b7 "+(STAT_LBL[obj.stat2]||obj.stat2))
                  )
                :(obj.xpPer+" XP/"+obj.unit+" \u00b7 "+(STAT_LBL[obj.stat]||obj.stat))
        )
      ),
      h("div",{class:"qrow"},
        h(Fragment,null,
            h("div",{class:"qbar"},h("div",{class:"qfill",style:barInnerStyle})),
            h("div",{class:"qxp",style:(isCapped?"color:"+capColor:isDebt&&!done?"color:#ef4444":"")+";white-space:nowrap;min-width:82px;text-align:right;flex-shrink:0"},fmtNum(d)+"/"+fmtNum(displayTarget)+" "+((d>1||displayTarget>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres",repas:"repas"}[obj.unit]||obj.unit))
          )
      ),
      isNearCap&&h("div",{style:"font-size:9px;color:"+capColor+";font-family:Orbitron,sans-serif;text-align:center;margin-top:6px;letter-spacing:0.5px;opacity:0.85"},"\u26A0 Cap dans "+fmtNum(remainingToCap)+" "+obj.unit+(remainingToCap>1?"s":"")+" \u00b7 r\u00e9cup\u00e9ration forc\u00e9e"),
      isCapped&&h("div",{style:"font-size:9px;color:"+capColor+";font-family:Orbitron,sans-serif;text-align:center;margin-top:6px;letter-spacing:0.5px;font-style:italic"},"\uD83D\uDCA4 R\u00e9cup\u00e9ration forc\u00e9e jusqu'\u00e0 "+(obj.weekly?"la semaine prochaine":"demain")),
      isCapped&&h("div",{style:"display:flex;justify-content:center;margin-top:6px"},
        h("span",{style:"font-size:9px;font-family:Orbitron,sans-serif;letter-spacing:1px;padding:3px 10px;border-radius:4px;background:"+capColor+"22;color:"+capColor+";border:1px solid "+capColor},(obj.capValue?("CAP "+obj.capValue+" "+obj.unit):("CAP \u00d7"+obj.cap))+" ATTEINT")
      ),
      (()=>{
        if(isCapped) return null;
        // Quête avec tiers (ex: protein x/2) : bouton unique +1 unité
        if(obj.tiers && obj.tiers.length>0){
          const isMax = d >= (obj.target||obj.tiers[obj.tiers.length-1].at);
          if(isMax) return null;
          return h("div",{style:"display:flex;gap:8px;margin-top:8px"},
            h("button",{
              onClick:e=>{inputs.current[obj.id]="1";validate(obj,e);},
              style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s"
            },"+1 "+obj.unit)
          );
        }
        const QUICK_IDS=["push","abs","squats","calves","reading","flex","balance","grips","med","water","mob"];
        const unitLabel={push:"rep",abs:"rep",squats:"rep",calves:"rep",reading:"min",flex:"min",balance:"min",grips:"min",med:"min",water:"verre",mob:"min"};
        const unitLabelPlural={push:"reps",abs:"reps",squats:"reps",calves:"reps",reading:"min",flex:"min",balance:"min",grips:"min",med:"min",water:"verres",mob:"min"};
        if(QUICK_IDS.includes(obj.id)){
          const lbl=unitLabel[obj.id]||obj.unit;
          const lblPl=unitLabelPlural[obj.id]||obj.unit;
          const isWater=obj.id==="water";
          return h("div",{style:"display:flex;gap:8px;margin-top:8px"},
            h("button",{
              onClick:e=>{inputs.current[obj.id]="1";validate(obj,e);},
              style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s"
            },"+1 "+lbl+(isWater?" \uD83D\uDCA7":"")),
            !isWater&&h("button",{
              onClick:e=>{inputs.current[obj.id]="10";validate(obj,e);},
              style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s"
            },"+10 "+lblPl)
          );
        }
        return h("div",{class:"qinrow"},
          h("input",{class:"qin",type:"text",inputMode:"decimal",placeholder:"+ "+obj.unit,id:"qi_"+obj.id,onInput:ev=>{inputs.current[obj.id]=ev.target.value;}}),
          h("button",{class:"qbtn",onClick:e=>{
            const el=document.getElementById("qi_"+obj.id);
            if(el)inputs.current[obj.id]=el.value;
            validate(obj,e);
            if(el)el.value="";
          }},"+XP")
        );
      })()
    );
  }

  function RR({obj,isW}){
    const t=obj.base&&!RANK_BASES[obj.id]?obj.base:getRankBase(obj.id,ri,prestige), d=(isW||obj.id==="walk")?(wLog[obj.id]||0):(tLog[obj.id]||0);
    const displayTarget = (obj.target && !obj.binary) ? obj.target : t;
    const pct=Math.min(100,(d/displayTarget)*100), done=d>=displayTarget, over=d>displayTarget;
    const validated=isW?(wLog[obj.id]!==undefined):(tLog[obj.id]!==undefined);
    if(obj.binary){
      return h("div",{style:"display:flex;align-items:center;gap:10px;margin-bottom:8px"},
        QuestIcon(obj.id,obj.icon,18),
        h("div",{style:"flex:1"},
          h("div",{style:"font-size:12px;color:var(--tx);display:flex;justify-content:space-between;align-items:center"},
            h("span",null,obj.name),
            h("div",{style:"display:flex;align-items:center;gap:6px"},
              validated
                ?h("span",{style:"font-family:Orbitron,sans-serif;font-size:11px;font-weight:700;color:"+(done?"#4ade80":"#ef4444")},done?"Succ\u00e8s":"\u00c9chec")
                :h("span",{style:"font-size:10px;color:var(--td)"},""),
              h("span",{style:"font-family:Orbitron,sans-serif;font-size:11px;font-weight:700;width:10px;text-align:center;color:"+(done?"#4ade80":"#ef4444")},validated?(done?"\u2713":"\u2718"):"")
            )
          )
        )
      );
    }
    // Système de cap dans RR
    const hasCap = obj.cap && obj.base && !obj.binary;
    const capThreshold = hasCap ? t * obj.cap : Infinity;
    const isCapped = hasCap && d >= capThreshold;
    const capProgress = hasCap ? Math.min(1, d/capThreshold) : 0;
    const isNearCap = hasCap && !isCapped && capProgress >= 0.75;
    const capColor = "#ef4444";
    const rankColor = rank.color || "#9ca3af";
    // Halo selon état (priorité : cap > done)
    const haloShadow = isCapped
      ? "0 0 10px "+capColor+",0 0 20px "+capColor+"66"
      : (d>=t&&t>0)
        ? "0 0 10px var(--rc),0 0 20px var(--rg)"
        : "";
    const barInnerStyle = "width:"+(isCapped?100:Math.min(100,pct))+"%;background:"+(isCapped?capColor:isNearCap?"linear-gradient(90deg,"+rankColor+","+capColor+")":rankColor)+(haloShadow?";box-shadow:"+haloShadow:"");
    return h("div",{style:"display:flex;align-items:center;gap:10px;margin-bottom:8px"},
      QuestIcon(obj.id,obj.icon,18,isCapped?"filter:grayscale(60%);opacity:0.7":""),
      h("div",{style:"flex:1"},
        h("div",{style:"font-size:12px;color:var(--tx);margin-bottom:3px;display:flex;justify-content:space-between;align-items:center"},
          h("div",{style:"display:flex;align-items:flex-start;gap:6px;min-width:0;flex:1;white-space:normal;line-height:1.25"},
            h("span",{style:"white-space:normal;line-height:1.25;word-break:normal"},obj.name),
            hasCap&&h("span",{style:"font-size:8px;font-family:Orbitron,sans-serif;letter-spacing:0.5px;padding:1px 5px;border-radius:3px;"+(isCapped?"background:"+capColor+"22;color:"+capColor+";border:1px solid "+capColor:"color:"+capColor+";border:1px solid "+capColor+"44")},isCapped?"CAP":(obj.capValue?("CAP "+obj.capValue+" "+obj.unit):("CAP \u00d7"+obj.cap)))
          ),
          h("div",{style:"display:flex;align-items:center;gap:6px"},
            h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:"+(isCapped?capColor:d>=displayTarget?"var(--rc)":d>0?"var(--tx)":"var(--td)")},fmtNum(d)+"/"+fmtNum(displayTarget)+" "+((d>1||displayTarget>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres",repas:"repas"}[obj.unit]||obj.unit)),
            h("span",{style:"font-family:Orbitron,sans-serif;font-size:11px;font-weight:700;color:#4ade80;width:10px;text-align:center"},done?"\u2713":"")
          )
        ),
        h("div",{class:"qbar"},h("div",{class:"qfill",style:barInnerStyle}))
      )
    );
  }

  function EpCard({ep, showInput=true}){
    const remaining = ep.expiresAt - now;
    const tier = ep.tier||"mineure";
    const tierColor = {mineure:"#fbbf24",majeure:"#f59e0b",legendaire:"#f97316"}[tier]||"#f59e0b";
    const tierLabel = {mineure:"MINEURE",majeure:"MAJEURE",legendaire:"L\u00c9GENDAIRE"}[tier]||tier.toUpperCase();
    const done = ep.completedAt;
    const failed = ep.failedAt;
    const vals = ep.dailyValidations||[];
    const todayValidated = vals.includes(today);
    const streakTarget = ep.streakDays || 7;
    const isStreakLike = ep.streak7 || ep.cumDays;
    const hasDailyMin = !!ep.dailyMin;
    const dailyMinutes = ep.dailyMinutes || {};
    const todayMin = dailyMinutes[today] || 0;
    const pct = isStreakLike ? Math.min(100,(vals.length/streakTarget)*100) : ep.binary ? (done?100:0) : Math.min(100,((ep.progress||0)/(ep.target||1))*100);
    const barInProgress = !done && !failed && pct > 0;
    const barStyle = done?"width:100%;background:"+tierColor:failed?"width:100%;background:#ef4444;opacity:0.4":barInProgress?"width:"+pct+"%;background:repeating-linear-gradient(45deg,"+tierColor+","+tierColor+" 4px,"+tierColor+"44 4px,"+tierColor+"44 8px)":"width:0%";

    if(ep.kind==="donjon"){
      const goals = ep.goals||[];
      const gp = ep.goalProgress||{};
      const totalGoals = goals.length || 1;
      const doneGoals = goals.filter(g=>(gp[g.id]||0)>=g.target).length;
      const donjonPct = Math.min(100,(doneGoals/totalGoals)*100);
      const donjonColor = "#a855f7";
      const donjonDone = !!ep.completedAt;
      const donjonFailed = !!ep.failedAt;
      const donjonActive = !donjonDone && !donjonFailed;

      function updateDonjonGoal(goal,delta){
        if(donjonDone||donjonFailed) return;
        const cur = gp[goal.id]||0;
        const next = Math.max(0,Math.min(goal.target,cur+delta));
        const newGp = {...gp,[goal.id]:next};
        const nowComplete = goals.every(g=>(newGp[g.id]||0)>=g.target);
        setState(s=>({...s, epreuves:s.epreuves.map(e=>e.epid===ep.epid?{...e,goalProgress:newGp,completedAt:nowComplete?Date.now():null}:e)}));
        if(nowComplete){ grantEpXp(ep); }
      }

      const totalXp=(ep.xp||0)+(ep.xp2||0)+(ep.xp3||0);
      return h("div",{class:"sqcard"+(donjonActive?" ep-pulse":""),style:"border-color:"+donjonColor+"55;background:"+donjonColor+"0A;--epc1:"+donjonColor+"44;--epc2:"+donjonColor+"00"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px"},
          h("div",{style:"display:flex;align-items:center;gap:8px;min-width:0"},
            QuestIcon(ep.id,ep.icon||"🏰",21),
            h("div",{style:"min-width:0"},
              h("div",{style:"font-size:13px;font-weight:800;color:var(--tx);letter-spacing:.3px"},ep.name),
              ep.desc&&h("div",{style:"font-size:10px;color:var(--td);margin-top:2px;line-height:1.25"},ep.desc)
            )
          ),
          showInput&&h("div",{style:"text-align:right;flex:0 0 auto"},
            donjonDone?h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:#4ade80"},"✓ DONJON VALIDÉ")
            :donjonFailed?h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:#ef4444"},"✘ DONJON ÉCHOUÉ")
            :h(Fragment,null,
              h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif"},totalXp+" XP total"),
              h("div",{style:"font-size:9px;color:"+donjonColor+";font-family:Orbitron,sans-serif;margin-top:2px"},"DONJON")
            )
          )
        ),
        h("div",{class:"sqbar",style:"background:"+donjonColor+"22"},
          h("div",{class:"sqbarfill",style:"width:"+donjonPct+"%;background:"+donjonColor+(donjonDone?";box-shadow:0 0 12px "+donjonColor:"")})
        ),
        h("div",{style:"display:flex;justify-content:space-between;font-size:10px;color:var(--td);margin-top:4px;margin-bottom:8px"},
          h("span",null,doneGoals+"/"+totalGoals+" objectifs complétés"),
          donjonActive&&h("span",{style:"color:"+donjonColor+";font-family:Orbitron,sans-serif"},"⏱ "+fmtCD(remaining)+" restants")
        ),
        h("div",{style:"display:flex;flex-direction:column;gap:7px;margin-top:8px"},
          goals.map(goal=>{
            const cur=gp[goal.id]||0;
            const gDone=cur>=goal.target;
            return h("div",{key:goal.id,style:"padding:8px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(255,255,255,0.025)"},
              h("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:8px"},
                h("div",{style:"font-size:12px;color:var(--tx);font-weight:600;line-height:1.15"},goal.label),
                h("div",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:"+(gDone?"#4ade80":"var(--td)")},cur+"/"+goal.target+" "+goal.unit)
              ),
              donjonActive&&showInput&&h("div",{style:"display:flex;gap:8px;margin-top:7px"},
                h("button",{onClick:()=>updateDonjonGoal(goal,1),disabled:gDone,style:"flex:1;padding:8px;border-radius:7px;border:1px solid "+(gDone?"#4ade8055":donjonColor+"55")+";background:"+(gDone?"#4ade8011":donjonColor+"11")+";color:"+(gDone?"#4ade80":donjonColor)+";font-family:Orbitron,sans-serif;font-size:10px;cursor:"+(gDone?"default":"pointer")},gDone?"Validé ✓":"+1"),
                cur>0&&h("button",{onClick:()=>updateDonjonGoal(goal,-1),style:"width:42px;padding:8px;border-radius:7px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px;cursor:pointer"},"-1")
              )
            );
          })
        ),
        showInput&&!donjonDone&&!donjonFailed&&h("div",{style:"font-size:10px;color:var(--td);margin-top:9px;line-height:1.3"},
          "XP accordée uniquement si tous les objectifs du donjon sont complétés."
        )
      );
    }

    function completeEp(val){
      if(done||failed) return;
      let newProgress = ep.progress;
      let nowComplete = false;
      if(ep.binary){ newProgress=1; nowComplete=true; }
      else if(hasDailyMin){
        // cumDays + dailyMin : on track les minutes par jour, un jour est validé à dailyMin atteint
        const addMin = val || 0;
        if(addMin<=0) return;
        const newDailyMin = todayMin + addMin;
        const newDailyMinutes = {...dailyMinutes, [today]: newDailyMin};
        let newVals = [...vals];
        // Si on franchit le seuil quotidien et que ce jour n'est pas encore validé
        if(todayMin < ep.dailyMin && newDailyMin >= ep.dailyMin && !todayValidated){
          newVals = [...vals, today];
        }
        nowComplete = newVals.length >= streakTarget;
        setState(s=>({...s, epreuves:s.epreuves.map(e=>e.epid===ep.epid?{...e,dailyMinutes:newDailyMinutes,dailyValidations:newVals,completedAt:nowComplete?Date.now():null}:e)}));
        if(nowComplete){ grantEpXp(ep); }
        return;
      }
      else if(isStreakLike){
        if(todayValidated) return;
        const newVals=[...vals,today];
        nowComplete = newVals.length>=streakTarget;
        setState(s=>({...s, epreuves:s.epreuves.map(e=>e.epid===ep.epid?{...e,dailyValidations:newVals,completedAt:nowComplete?Date.now():null}:e)}));
        if(nowComplete){ grantEpXp(ep); }
        return;
      } else {
        newProgress = Math.min(ep.target, ep.progress + val);
        nowComplete = newProgress >= ep.target;
      }
      // Si l'épreuve est progressive avec dailyTrack, on track aussi les minutes par jour
      if(ep.dailyTrack && !ep.binary && !isStreakLike){
        const newDailyMinutes = {...dailyMinutes, [today]: todayMin + val};
        setState(s=>({...s, epreuves:s.epreuves.map(e=>e.epid===ep.epid?{...e,progress:newProgress,dailyMinutes:newDailyMinutes,completedAt:nowComplete?Date.now():null}:e)}));
        if(nowComplete){ grantEpXp(ep); }
        return;
      }
      setState(s=>({...s, epreuves:s.epreuves.map(e=>e.epid===ep.epid?{...e,progress:newProgress,completedAt:nowComplete?Date.now():null}:e)}));
      if(nowComplete){ grantEpXp(ep); }
    }

    function grantEpXp(ep){
      addXp(ep.xp, ep.stat, null, true);
      if(ep.xp2&&ep.stat2) addXp(ep.xp2, ep.stat2, null, true);
      if(ep.xp3&&ep.stat3) addXp(ep.xp3, ep.stat3, null, true);
      setState(s=>({...s,
        epreuveCooldownUntil:nextMondayAt7(),
        completedEpreuveIds:[...(s.completedEpreuveIds||[]),ep.id]
      }));
      const totalXp=(ep.xp||0)+(ep.xp2||0)+(ep.xp3||0);
      setTimeout(()=>{
        const id1=Date.now()+Math.random(),id2=id1+0.1;
        setFloats(f=>[...f,{id:id1,y:"28%",txt:(ep.kind==="donjon"?"🏰 DONJON VALIDÉ !":"\uD83C\uDFC6 \u00c9PREUVE VALID\u00c9E !")},{id:id2,y:"34%",txt:"+"+totalXp+" XP total"}]);
        setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id1&&p.id!==id2)),2000);
      },200);
    }

    const isActive = !done && !failed;
    return h("div",{class:"sqcard"+(isActive?" ep-pulse":""),style:"border-color:"+tierColor+"44;background:"+tierColor+"08;--epc1:"+tierColor+"44;--epc2:"+tierColor+"00"},
      h("div",{style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"},
        h("div",{style:"display:flex;align-items:center;gap:8px"},
          QuestIcon(ep.iconId,ep.icon||"⚔️",20,"line-height:1.1"),
          h("div",null,
            h("div",{style:"font-size:13px;font-weight:700;color:var(--tx)"},ep.name)
          )
        ),
        showInput&&h("div",{style:"text-align:right"},
          done?h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:#4ade80"},"\u2713 VALID\u00c9E")
          :failed?h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:#ef4444"},"\u2718 \u00c9CHOU\u00c9E")
          :h(Fragment,null,
            ep.xp2
              ? h(Fragment,null,
                  h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif"},ep.xp+" XP \u00b7 "+(STAT_LBL[ep.stat]||ep.stat)),
                  h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif"},ep.xp2+" XP \u00b7 "+(STAT_LBL[ep.stat2]||ep.stat2)),
                  ep.xp3&&h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif"},ep.xp3+" XP \u00b7 "+(STAT_LBL[ep.stat3]||ep.stat3))
                )
              : h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif"},ep.xp+" XP \u00b7 "+(STAT_LBL[ep.stat]||ep.stat))
          )
        )
      ),
      // Barre progression
      h("div",{class:"sqbar",style:"background:"+tierColor+"22"},
        h("div",{class:"sqbarfill",style:barStyle})
      ),
      h("div",{style:"display:flex;justify-content:space-between;font-size:10px;color:var(--td);margin-top:4px"},
        hasDailyMin
          ? h("span",null,vals.length+"/"+streakTarget+" jours valid\u00e9s \u00b7 aujourd'hui : "+todayMin+"/"+ep.dailyMin+" min"+(todayValidated?" \u2713":""))
          : isStreakLike
            ? h("span",null,vals.length+"/"+streakTarget+" jours valid\u00e9s"+(todayValidated?" \u2713":""))
            : ep.dailyTrack
              ? (function(){
                  const dailyComplete = Object.values(dailyMinutes).filter(m=>m>=(ep.dailyTrackMin||5)).length;
                  const todayDone = todayMin >= (ep.dailyTrackMin||5);
                  return h("span",null,ep.progress+"/"+ep.target+" "+ep.unit+" \u00b7 "+dailyComplete+" jour"+(dailyComplete>1?"s":"")+" compl\u00e9t\u00e9"+(dailyComplete>1?"s":"")+" \u00b7 aujourd'hui : "+todayMin+"/"+(ep.dailyTrackMin||5)+" min"+(todayDone?" \u2713":""));
                })()
              : h("span",null,(ep.binary?"":ep.progress+"/"+ep.target+" "+ep.unit)),
        !done&&!failed&&h("span",{style:"color:"+tierColor+";font-family:Orbitron,sans-serif"},"\u23F1 "+fmtCD(remaining)+" restants")
      ),
      // Boutons action
      !done&&!failed&&showInput&&(
        ep.binary
          ? h("button",{onClick:()=>completeEp(1),style:"width:100%;margin-top:8px;padding:10px;border-radius:8px;border:1px solid "+tierColor+"55;background:"+tierColor+"11;color:"+tierColor+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px"},"\u2713 Succ\u00e8s")
          : hasDailyMin
            ? h("div",{style:"display:flex;gap:8px;margin-top:8px"},
                h("button",{onClick:()=>completeEp(1),style:"flex:1;padding:10px;border-radius:8px;border:1px solid "+tierColor+"55;background:"+tierColor+"11;color:"+tierColor+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer"},"+1 min"),
                h("button",{onClick:()=>completeEp(10),style:"flex:1;padding:10px;border-radius:8px;border:1px solid "+tierColor+"55;background:"+tierColor+"11;color:"+tierColor+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer"},"+10 min")
              )
            : isStreakLike
              ? h("button",{onClick:()=>completeEp(1),disabled:todayValidated,style:"width:100%;margin-top:8px;padding:10px;border-radius:8px;border:1px solid "+(todayValidated?"#4ade8055":tierColor+"55")+";background:"+(todayValidated?"#4ade8011":tierColor+"11")+";color:"+(todayValidated?"#4ade80":tierColor)+";font-family:Orbitron,sans-serif;font-size:11px;cursor:"+(todayValidated?"default":"pointer")+";letter-spacing:1px"},todayValidated?"Fait aujourd'hui \u2713":"Fait aujourd'hui \u2713")
              : ep.unit==="km"
                ? h("div",{class:"qinrow",style:"margin-top:8px"},
                    h("input",{id:"epi_"+ep.epid,class:"qin",type:"text",inputMode:"decimal",placeholder:"+ km",style:"border-color:"+tierColor+"55"}),
                    h("button",{class:"qbtn",style:"border-color:"+tierColor+"55;color:"+tierColor,onClick:()=>{
                      const el=document.getElementById("epi_"+ep.epid); if(!el)return;
                      const raw=el.value.toString().replace(",","."); el.value="";
                      const v=parseFloat(raw); if(!v||v<=0)return;
                      completeEp(v);
                    }},"+XP")
                  )
                : ep.id==="ep_project"
                  ? h("div",{style:"display:flex;gap:8px;margin-top:8px"},
                      h("button",{onClick:()=>completeEp(10),style:"flex:1;padding:10px;border-radius:8px;border:1px solid "+tierColor+"55;background:"+tierColor+"11;color:"+tierColor+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer"},"+10 min"),
                      h("button",{onClick:()=>completeEp(60),style:"flex:1;padding:10px;border-radius:8px;border:1px solid "+tierColor+"55;background:"+tierColor+"11;color:"+tierColor+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer"},"+1 h")
                    )
                  : ep.id==="ep_wallsit60"
                    ? h("div",{style:"display:flex;gap:8px;margin-top:8px"},
                        h("button",{onClick:()=>completeEp(1),style:"flex:1;padding:10px;border-radius:8px;border:1px solid "+tierColor+"55;background:"+tierColor+"11;color:"+tierColor+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer"},"+1 min"),
                        h("button",{onClick:()=>completeEp(5),style:"flex:1;padding:10px;border-radius:8px;border:1px solid "+tierColor+"55;background:"+tierColor+"11;color:"+tierColor+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer"},"+5 min")
                      )
                    : h("div",{style:"display:flex;gap:8px;margin-top:8px"},
                        h("button",{onClick:()=>completeEp(1),style:"flex:1;padding:10px;border-radius:8px;border:1px solid "+tierColor+"55;background:"+tierColor+"11;color:"+tierColor+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer"},"+1 "+ep.unit),
                        h("button",{onClick:()=>completeEp(10),style:"flex:1;padding:10px;border-radius:8px;border:1px solid "+tierColor+"55;background:"+tierColor+"11;color:"+tierColor+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer"},"+10 "+ep.unit)
                      )
      ),
      // Menu déroulant des exercices pour Mobilité matinale (épreuve)
      ep.id==="ep_mob"&&h(Fragment,null,
        h("div",{
          onClick:()=>setMobOpen(v=>!v),
          style:"display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:6px 8px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:6px;cursor:pointer;user-select:none;font-size:10px;font-family:Orbitron,sans-serif;letter-spacing:1px"
        },
          h("span",{style:"color:var(--td);text-transform:uppercase"},"Programme 5\u00d73min"),
          h("span",{style:"color:var(--td)"},mobOpen?"\u25B2":"\u25BC")
        ),
        mobOpen&&h("div",{style:"margin-top:8px;padding:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04);border-radius:6px;font-size:11px;color:var(--tx);line-height:1.5"},
          h("div",{style:"margin-bottom:10px"},
            h("div",{style:"font-weight:700;color:"+(STAT_COLOR.Agilite||"#4ade80")},"1. Hanches & jambes \u00b7 3min"),
            h("div",{style:"color:var(--td);font-size:10px;margin-top:3px"},
              h("div",null,"\u2022 Cercles de hanches : 10 par sens (1min)"),
              h("div",null,"\u2022 Leg swings avant/arri\u00e8re : 10 par jambe (1min)"),
              h("div",null,"\u2022 Leg swings lat\u00e9raux : 10 par jambe (1min)")
            )
          ),
          h("div",{style:"margin-bottom:10px"},
            h("div",{style:"font-weight:700;color:"+(STAT_COLOR.Agilite||"#4ade80")},"2. Colonne thoracique \u00b7 3min"),
            h("div",{style:"color:var(--td);font-size:10px;margin-top:3px"},
              h("div",null,"\u2022 Cat-cow : 15 cycles (1min30)"),
              h("div",null,"\u2022 Cobra-enfant altern\u00e9 : 15 cycles (1min30)")
            )
          ),
          h("div",{style:"margin-bottom:10px"},
            h("div",{style:"font-weight:700;color:"+(STAT_COLOR.Agilite||"#4ade80")},"3. \u00c9paules \u00b7 3min"),
            h("div",{style:"color:var(--td);font-size:10px;margin-top:3px"},
              h("div",null,"\u2022 Arm circles : 5 par sens par c\u00f4t\u00e9 (1min30)"),
              h("div",null,"\u2022 Wall slides W \u2192 Y : 10 r\u00e9p\u00e9titions (1min30)")
            )
          ),
          h("div",{style:"margin-bottom:10px"},
            h("div",{style:"font-weight:700;color:"+(STAT_COLOR.Agilite||"#4ade80")},"4. Rotation & lat\u00e9ral \u00b7 3min"),
            h("div",{style:"color:var(--td);font-size:10px;margin-top:3px"},
              h("div",null,"\u2022 T-spine rotations : 8 par c\u00f4t\u00e9 (1min)"),
              h("div",null,"\u2022 Side bends : 8 par c\u00f4t\u00e9 (1min)"),
              h("div",null,"\u2022 World's greatest stretch : 4 par c\u00f4t\u00e9 (1min)")
            )
          ),
          h("div",null,
            h("div",{style:"font-weight:700;color:"+(STAT_COLOR.Agilite||"#4ade80")},"5. \u00c9quilibre & finition \u00b7 3min"),
            h("div",{style:"color:var(--td);font-size:10px;margin-top:3px"},
              h("div",null,"\u2022 \u00c9quilibre un pied yeux ferm\u00e9s : 30s par pied (1min)"),
              h("div",null,"\u2022 Forward fold (flexion avant) respir\u00e9e : 6 respirations lentes (1min)"),
              h("div",null,"\u2022 Ancrage debout (pieds parall\u00e8les, respirations profondes) : 1min")
            )
          ),
          h("div",{style:"margin-top:12px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.05);font-size:10px;color:var(--td);font-style:italic"},
            "Respiration nasale uniquement \u00b7 amplitude max, vitesse min"
          )
        )
      )
    );
  }

  function SqCard({sq,showInput}){
    const remaining=sq.expiresAt-now;
    const urgent=remaining<86400000&&!sq.completedAt;
    const pct=Math.min(100,(sq.progress/sq.target)*100);
    const done=sq.progress>=sq.target;

    // Helper : liste les paires (xp, stat) actives sur cette quête (1, 2 ou 3)
    const xpPairs = [
      {xp:sq.xp, stat:sq.stat},
      sq.xp2&&sq.stat2 ? {xp:sq.xp2, stat:sq.stat2} : null,
      sq.xp3&&sq.stat3 ? {xp:sq.xp3, stat:sq.stat3} : null,
    ].filter(Boolean);

    function completeBinary(val,e){
      if(sq.progress>=sq.target)return;
      const nowComplete=val>=1;
      if(nowComplete){
        const id1=Date.now()+Math.random(), id2=id1+0.1;
        const xpText = xpPairs.map(p=>{
          const lbl = STAT_LBL2[p.stat] || STAT_LBL[p.stat] || p.stat || "";
          return "+"+p.xp+" XP"+(lbl?" "+lbl:"");
        }).join("\n");
        setFloats(f=>[...f,{id:id1,y:"35%",txt:"\uD83C\uDFC6 QU\u00c9TE VALID\u00c9E !"},{id:id2,y:"40%",txt:xpText}]);
        setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id1&&p.id!==id2)),1400);
        xpPairs.forEach(p=>addXp(p.xp,p.stat,null,true));
      }
      setState(s=>({...s,specialQuests:s.specialQuests.map(q=>q.sqid===sq.sqid
        ?{...q,progress:val,completedAt:nowComplete?Date.now():q.completedAt}:q),
        sqCooldownUntil:nowComplete?next7AM():(s.sqCooldownUntil||null)}));
    }

    const tier = sq.tier || "majeure";
    const tierColor = SQ_TIER_COLOR[tier] || "#f59e0b";

    return h("div",{class:"sqcard"+(urgent?" sq-urgent":"")},
      h("div",{style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"},
        h("div",{style:"display:flex;align-items:center;gap:8px"},
          QuestIcon(sq.iconId||sq.id,sq.icon,22),
          h("div",null,
            h("div",{style:"font-size:13px;font-weight:700;color:var(--tx)"},sq.name)
          )
        ),
        showInput&&h("div",{style:"text-align:right"},
          xpPairs.map((p,i)=>h("div",{key:i,style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif"},p.xp+" XP \u00b7 "+(STAT_LBL[p.stat]||p.stat)))
        )
      ),
      h("div",{class:"sqbar"},h("div",{class:"sqbarfill",style:"width:"+pct+"%"})),
      h("div",{style:"display:flex;justify-content:space-between;font-size:10px;color:var(--td);margin-top:4px"},
        h("span",null,sq.progress+"/"+sq.target+" "+sq.unit),
        !done&&h("span",{style:"color:"+(urgent?"#ef4444":"#ef4444bb")+";font-family:Orbitron,sans-serif"},"\u23F1 "+fmtCD(remaining)+" restants")
      ),
      showInput&&!done&&(
        sq.binary
          ?h("div",{style:"display:flex;gap:8px;margin-top:8px"},
              h("button",{onClick:e=>completeBinary(1,e),style:"flex:1;padding:10px;border-radius:8px;border:1px solid #4ade8044;background:rgba(255,255,255,0.03);color:#4ade80;font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px"},"Succ\u00e8s \u2713")
            )
          :sq.unit==="km"
            ?h("div",{class:"qinrow",style:"margin-top:8px"},
                h("input",{id:"sqi_"+sq.sqid,class:"qin",type:"text",inputMode:"decimal",placeholder:"+ km",style:"border-color:#ef444466"}),
                h("button",{class:"qbtn",style:"border-color:#ef444466;color:#ef4444",onClick:e=>progressSq(sq,e)},"+XP")
              )
          :h("div",{style:"display:flex;gap:8px;margin-top:8px"},
              h("button",{onClick:e=>progressSq(sq,e,1),style:"flex:1;padding:10px;border-radius:8px;border:1px solid #ef444466;background:rgba(255,255,255,0.03);color:#ef4444;font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px"},"+1 "+sq.unit),
              h("button",{onClick:e=>progressSq(sq,e,sq.step||10),style:"flex:1;padding:10px;border-radius:8px;border:1px solid #ef444466;background:rgba(255,255,255,0.03);color:#ef4444;font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px"},"+"+(sq.step||10)+" "+sq.unit)
            )
      ),
      done&&showInput&&h("div",{style:"text-align:center;padding:8px 0;font-size:12px;color:#4ade80;font-family:Orbitron,sans-serif"},"\u2705 Compl\u00e9t\u00e9e !")
    );
  }

  // ─── ONGLET ACCUEIL ───────────────────────────────────────────────────

  function Home(){
    const weeklyObjs = restMode && walkObj
      ? [...objs.filter(o=>o.weekly), walkObj]
      : objs.filter(o=>o.weekly);
    const obligObjs = [...sortStat(objs.filter(o=>o.daily&&!o.optional)), ...sortStat(weeklyObjs)];
    const secs=[
      {lb:"Qu\u00eates journalières",ob:obligObjs,iw:false,mixed:true},
      {lb:"Qu\u00eates bonus", ob:sortStat(objs.filter(o=>(o.daily&&o.optional||o.id==="walk")&&!(restMode&&o.id==="walk")&&!o.bonusHidden)), iw:false},
    ];

    const characterState = (()=>{
      const statWeek = {};
      STATS.forEach(s=>statWeek[s]=0);
      const days = [];
      for(let i=6;i>=0;i--){
        const d=new Date(today);
        d.setDate(d.getDate()-i);
        days.push(d.toISOString().slice(0,10));
      }
      days.forEach(day=>{
        const log = state.dailyLog[day]||{};
        Object.entries(log).forEach(([id,a])=>{
          const o=objs.find(x=>x.id===id);
          if(!o || a<=0) return;
          const base = o.base && !RANK_BASES[o.id] ? o.base : getRankBase(o.id,ri,prestige);
          const xp = calcXp(o,a,base);
          if(o.stat) statWeek[o.stat]=(statWeek[o.stat]||0)+xp;
          if(o.stat2 && o.xpPer2){
            statWeek[o.stat2]=(statWeek[o.stat2]||0)+(o.id==="reading"?Math.floor(a/(o.concBlock||10))*(o.concBlockXp||50):a*o.xpPer2);
          }
        });
      });
      (state.specialQuests||[]).forEach(q=>{
        if(!q.completedAt) return;
        const qDay = new Date(q.completedAt).toISOString().slice(0,10);
        if(!days.includes(qDay)) return;
        if(q.stat) statWeek[q.stat]=(statWeek[q.stat]||0)+(q.xp||0);
        if(q.stat2) statWeek[q.stat2]=(statWeek[q.stat2]||0)+(q.xp2||0);
        if(q.stat3) statWeek[q.stat3]=(statWeek[q.stat3]||0)+(q.xp3||0);
      });
      const total = Object.values(statWeek).reduce((a,b)=>a+b,0);
      const physical = (statWeek.Force||0)+(statWeek.Endurance||0)+(statWeek.Agilite||0);
      const mental = (statWeek.Intelligence||0)+(statWeek.Concentration||0);
      const discipline = statWeek.Discipline||0;
      const sante = statWeek.Sante||0;
      const maxEntry = Object.entries(statWeek).sort((a,b)=>b[1]-a[1])[0]||["",0];
      const maxShare = total>0 ? maxEntry[1]/total : 0;

      if(debtActive) return {iconId:"sanction", icon:"⚠️", name:"En dette", desc:"Dette active : priorité au remboursement avant d'ajouter du volume.", color:"#fb923c"};
      if(state.lastPenaltiesApplied && state.lastPenaltiesApplied.ids && state.lastPenaltiesApplied.ids.length>0) return {iconId:"sanction", icon:"🔴", name:"Sous sanction", desc:"Une pénalité récente est enregistrée. Reviens à l'exécution simple.", color:"#ef4444"};
      if(total<500) return {iconId:"latent", icon:"🌑", name:"Latent", desc:"Peu d'activité mesurée sur 7 jours. Le système manque de données.", color:"var(--td)"};
      if(maxShare>.55) return {iconId:"desequilibre", icon:"⚖️", name:"Déséquilibré", desc:STAT_LBL[maxEntry[0]]+" domine nettement ta semaine. Surveille les angles morts.", color:"#f59e0b"};
      if(physical/total>.55) return {iconId:"berserker", icon:"🔥", name:"Berserker", desc:"Semaine très physique. Utile, mais attention à ne pas fuir le mental.", color:"#fb923c"};
      if(mental/total>.55) return {iconId:"mental", icon:"🧠", name:"Érudit", desc:"Semaine orientée esprit : lecture, attention et apprentissage dominent.", color:"#22d3ee"};
      if(discipline/total>.28 && (statWeek.Concentration||0)>0) return {iconId:"discipline", icon:"🕯️", name:"Ascète actif", desc:"Discipline et concentration solides. Bonne maîtrise de l'impulsion.", color:"#c084fc"};
      if(sante/total>.30 && discipline>0) return {iconId:"sante", icon:"🌿", name:"Fondations solides", desc:"Santé et discipline soutiennent bien ta progression.", color:"#4ade80"};
      if(computedStreak>=7) return {iconId:"serenite", icon:"🛡️", name:"Stable", desc:"Rythme régulier sur la semaine. Continue sans chercher à surcharger.", color:"#4ade80"};
      return {iconId:"construction", icon:"🧬", name:"En construction", desc:"Progression réelle, mais le profil de semaine n'est pas encore net.", color:"var(--rc)"};
    })();

    return h("div",{class:"tab"},
      missedDays>=2&&h("div",{class:"warn"},"\u26A0\uFE0F P\u00e9nalit\u00e9 : -"+(missedDays*10)+" XP ("+missedDays+" jours manqu\u00e9s)"),

      h("div",{class:"card"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"},
          h("div",{style:"display:flex;align-items:center;gap:10px"},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:36px;font-weight:900;color:var(--rc);text-shadow:none;line-height:1"},rank.id),
            h("div",null,
              
              h("div",{style:"font-size:10px;color:var(--td);letter-spacing:1px;text-transform:uppercase;margin-top:2px"},"Rang actuel")
            )
          ),
          h("div",{style:"font-size:18px;color:var(--td)"},"\u2192"),
          nextRank
            ? h("div",{style:"display:flex;align-items:center;gap:10px"},
                h("div",{style:"text-align:right"},
                  
                  h("div",{style:"font-size:10px;color:var(--td);letter-spacing:1px;text-transform:uppercase;margin-top:2px"},"Rang suivant")
                ),
                h("div",{style:"font-family:Orbitron,sans-serif;font-size:36px;font-weight:900;color:var(--td);line-height:1"},nextRank.id)
              )
            : h("div",{style:"text-align:right"},
                h("div",{style:"font-family:Orbitron,sans-serif;font-size:13px;font-weight:700;color:#a855f755"},prestige<MAX_PRESTIGE?"Ascension "+(ROMAN[prestige]||""):"Maximum"),
                h("div",{style:"font-size:10px;color:var(--td);letter-spacing:1px;text-transform:uppercase;margin-top:2px"},"Prestige")
              )
        ),
        h("div",{class:"xpbar",style:"height:8px"},h("div",{class:"xpfill",style:"width:"+(nextRank?rankPct:Math.min(100,((effectiveXp-ASCENSION_XP_START)/(ASCENSION_XP_NEEDED-ASCENSION_XP_START))*100))+"%"})),
        h("div",{style:"display:flex;justify-content:space-between;font-size:10px;color:var(--td);margin-top:5px;font-family:Orbitron,sans-serif"},
          h("span",null,Math.round(state.totalXp).toLocaleString("fr-FR")+" XP"),
          nextRank
            ? (rankBlocked
                ? h("span",{style:"color:#fb923c"},"Stats requises non atteintes")
                : h("span",{style:"color:var(--rc)"},Math.round(nextRank.xpRequired-state.totalXp).toLocaleString("fr-FR")+" XP manquants"))
            : prestigeAvailable
              ? h("span",{style:"color:#a855f7"},"Ascension disponible !")
              : prestigeBlocked
                ? h("span",{style:"color:#fb923c"},"Stats requises non atteintes")
                : h("span",{style:"color:var(--rc)"},Math.round(ASCENSION_XP_NEEDED-effectiveXp).toLocaleString("fr-FR")+" XP avant Ascension "+(ROMAN[prestige]||"I"))
        ),
        prestigeAvailable&&h("button",{
          onClick:()=>{
            const newPrestige=(state.prestige||0)+1;
            setState(s=>({...s,streak:0,streakBonusDay:null,weeklyBonusWk:null,streakMilestones:[],penaltyDay:null,dailyLog:{},weeklyLog:{},specialQuests:[],sqStatCycle:[],epStatCycle:[],sqCooldownUntil:null,prestige:newPrestige}));
            setPrestigeUp(newPrestige);
          },
          style:"width:100%;margin-top:12px;padding:12px;background:rgba(168,85,247,0.1);border:1px solid #a855f7;border-radius:10px;color:#a855f7;font-family:Orbitron,sans-serif;font-size:12px;letter-spacing:3px;cursor:pointer;text-transform:uppercase;text-shadow:0 0 12px #a855f7"
        },"\u269B\uFE0F Mont\u00e9e en Ascension"),
        h("div",{style:"display:grid;grid-template-columns:minmax(0,1fr) 1px minmax(0,1fr);align-items:center;justify-items:stretch;margin-top:12px;padding-top:16px;padding-bottom:0px;border-top:1px solid rgba(255,255,255,0.06)"},
          h("div",{style:"width:100%;display:flex;align-items:center;justify-content:center;gap:4px;padding:0"},
            h("img",{
              src:"./assets/ui/streak.png",
              style:"width:42px;height:42px;object-fit:contain;display:block"
            }),
            h("div",{style:"display:flex;flex-direction:column;align-items:flex-start;justify-content:center"},
              h("div",{style:"font-family:Orbitron,sans-serif;font-size:16px;font-weight:900;color:var(--rc);line-height:0.9"},
                state.streak
              ),
              h("div",{style:"font-size:11px;color:var(--td);text-transform:uppercase;letter-spacing:1px;margin-top:3px"},
                "STREAK"
              ),
              bonusGiven&&h("div",{style:"font-size:10px;color:#c084fc;font-family:Orbitron,sans-serif;margin-top:3px"},
                "+250 XP ✓"
              )
            )
          ),

          h("div",{style:"width:1px;height:38px;background:rgba(255,255,255,0.06);justify-self:center"}),

          h("div",{style:"width:100%;display:flex;align-items:center;justify-content:center;gap:4px;padding:0"},
            h("img",{
              src:"./assets/ui/xpjour.png",
              style:"width:42px;height:42px;object-fit:contain;display:block"
            }),
            h("div",{style:"display:flex;flex-direction:column;align-items:flex-start;justify-content:center"},
              h("div",{style:"font-family:Orbitron,sans-serif;font-size:16px;font-weight:900;color:var(--rc);line-height:0.9"},
                todayXp.toFixed(0)
              ),
              h("div",{style:"font-size:11px;color:var(--td);text-transform:uppercase;letter-spacing:1px;margin-top:3px"},
                "XP DU JOUR"
              )
            )
          )
        )
      ),
      h("div",{class:"card"},
        h("div",{class:"ctitle"},"État du personnage"),
        h("div",{style:"display:flex;align-items:flex-start;gap:12px"},
          h("div",{style:"min-width:36px;width:36px;display:flex;align-items:center;justify-content:center;transform:translateY(-1px)"},
            CharacterStateIcon(characterState.iconId,characterState.icon,32)
          ),
          h("div",{style:"flex:1;min-width:0"},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:13px;font-weight:800;letter-spacing:1px;color:"+characterState.color+";text-transform:uppercase"},characterState.name),
            h("div",{style:"font-size:12px;color:var(--td);line-height:1.35;margin-top:4px"},characterState.desc)
          )
        )
      ),

      h("div",{class:"card",style:"border-color:#f59e0b44"},
        h("div",{class:"ctitle",style:"color:"+(activeEp?{mineure:"#fbbf24",majeure:"#f59e0b",legendaire:"#f97316"}[activeEp.tier]||"#f59e0b":"#f59e0b")+";margin-bottom:8px"},"\u00c9preuve"),
        activeEp
          ? h(EpCard,{ep:activeEp,showInput:false})
          : cooldownActive
            ? h("div",{style:"font-size:11px;color:var(--td);text-align:center;padding:4px 0;font-family:Orbitron,sans-serif"},"\u23F3 Prochain d\u00e9fi dans "+fmtCD(cooldownUntil-now))
            : h("div",{style:"font-size:12px;color:#f59e0b;text-align:center;padding:4px 0"},"\uD83D\uDD0D Nouvelle \u00e9preuve en cours de d\u00e9tection...")
      ),
      activeSq&&h("div",{class:"card",style:"border-color:#ef444444"},
        h("div",{class:"ctitle",style:"color:#ef4444;margin-bottom:8px"},"Qu\u00eate urgente"+(activeSq.tier?" \u00b7 "+(SQ_TIER_LABEL[activeSq.tier]||""):"")),
        h(SqCard,{sq:activeSq,showInput:false})
      ),
      !activeSq&&sqCooldownActive&&h("div",{class:"card",style:"border-color:#ef444433"},
        h("div",{class:"ctitle",style:"color:#ef4444;margin-bottom:8px"},"Qu\u00eate urgente"),
        h("div",{style:"font-size:11px;color:var(--td);text-align:center;padding:4px 0;font-family:Orbitron,sans-serif"},"\u23F3 Prochaine qu\u00eate dans "+fmtCD(sqCooldownUntil-now))
      ),
      secs.map(({lb,ob,iw,mixed})=>ob.length===0?null:
        h("div",{key:lb,class:"card"},h("div",{class:"ctitle"},lb),ob.map(o=>h(RR,{key:o.id,obj:o,isW:mixed?(o.weekly||o.id==="walk"):iw})))
      )
    );
  }

  // ─── ONGLET QUETES ────────────────────────────────────────────────────

  function Quests(){
    const reqBase=sortStat(objs.filter(o=>o.daily&&!o.optional));
    const bonBase=sortStat(objs.filter(o=>(o.daily&&o.optional||o.id==="walk")&&!(restMode&&o.id==="walk")&&!o.bonusHidden));
    const wkBase=restMode&&walkObj
      ? [...sortStat(objs.filter(o=>o.weekly)), walkObj]
      : sortStat(objs.filter(o=>o.weekly));

    const isQuestDone=(obj)=>{
      const isWeekly = obj.weekly || obj.id==="walk";
      const t = getEffectiveTarget(obj.id, isWeekly);
      const effectiveT = (sleepDebtMed > 0 && obj.id==="med") ? Math.max(t, sleepDebtMed) : t;
      const target = (obj.target && !obj.binary) ? obj.target : effectiveT;
      const d = isWeekly ? (wLog[obj.id]||0) : (tLog[obj.id]||0);
      return obj.binary ? d>=1 : d>=target;
    };
    const moveCompletedLast=(list)=>[
      ...list.filter(o=>!isQuestDone(o)),
      ...list.filter(o=>isQuestDone(o))
    ];

    const req=moveCompletedLast(reqBase);
    const bon=moveCompletedLast(bonBase);
    const wkq=moveCompletedLast(wkBase);

    const reqDone=reqBase.filter(isQuestDone).length + (sleepDebtMed>0 && (tLog["med"]||0)>=sleepDebtMed ? 1 : 0);
    const reqTotal=reqBase.length + (sleepDebtMed>0 ? 1 : 0);
    const bonDone=bonBase.filter(isQuestDone).length;
    const bonTotal=bonBase.length;
    const wkDone=wkBase.filter(isQuestDone).length;
    const wkTotal=wkBase.length;

    const SectionHeader = ({title,done,total}) => h("div",{class:"shdr",style:"margin-bottom:10px"},
      h("div",{class:"ctitle",style:"margin:0"},title),
      h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:1px;color:"+(done===total&&total>0?"#4ade80":"var(--td)")},done+"/"+total)
    );

    return h("div",{class:"tab"},
      // ── ÉPREUVE ────────────────────────────────────────────────────────
      h("div",{class:"card",style:"border-color:#f59e0b44"},
        h("div",{class:"ctitle",style:"color:#f59e0b;margin-bottom:8px"},"Épreuve"),
        activeEp
          ? h(EpCard,{ep:activeEp})
          : completedEp
            ? h("div",{class:"sqcard"},
                h("div",{style:"display:flex;align-items:center;gap:10px"},
                  h("span",{style:"font-size:20px"},completedEp.icon),
                  h("div",{style:"flex:1"},
                    h("div",{style:"font-size:13px;font-weight:700;color:#4ade80"},completedEp.name+" — COMPLÉTÉ ✅"),
                    h("div",{style:"font-size:11px;color:var(--td);margin-top:2px"},
                      ("+"+completedEp.xp+" XP · "+(STAT_LBL[completedEp.stat]||completedEp.stat))
                      +(completedEp.xp2&&completedEp.stat2?(" · +"+completedEp.xp2+" XP "+(STAT_LBL[completedEp.stat2]||completedEp.stat2)):"")
                      +(completedEp.xp3&&completedEp.stat3?(" · +"+completedEp.xp3+" XP "+(STAT_LBL[completedEp.stat3]||completedEp.stat3)):"")
                    )
                  )
                ),
                cooldownActive&&h("div",{style:"font-size:11px;color:var(--td);text-align:center;padding:8px 0 4px;font-family:Orbitron,sans-serif"},"⏳ Prochain défi dans "+fmtCD(cooldownUntil-now))
              )
            : cooldownActive
              ? h("div",{style:"font-size:11px;color:var(--td);text-align:center;padding:8px 0;font-family:Orbitron,sans-serif"},
                  "⏳ Prochain défi dans "+fmtCD(cooldownUntil-now))
              : h("div",{style:"font-size:12px;color:#f59e0b;text-align:center;padding:8px 0"},
                  "🔍 Le système détecte une nouvelle épreuve...")
      ),
      h("div",{class:"card",style:"border-color:#ef444444"},
        h("div",{class:"shdr"},
          h("div",null,
            h("div",{class:"ctitle",style:"margin:0;color:#ef4444"},"Quête urgente"+(activeSq&&activeSq.tier?" · "+(SQ_TIER_LABEL[activeSq.tier]||""):""))
          )
        ),
        activeSq
          ? h(SqCard,{sq:activeSq,showInput:true})
          : completedSq && h("div",{class:"sqcard"},
          h("div",{style:"display:flex;align-items:center;gap:10px"},
            h("span",{style:"font-size:20px"},completedSq.icon),
            h("div",{style:"flex:1"},
              h("div",{style:"font-size:13px;font-weight:700;color:#4ade80"},completedSq.name+" — COMPLÉTÉ ✅"),
              h("div",{style:"font-size:11px;color:var(--td);margin-top:2px"},"+"+completedSq.xp+" XP · "+(STAT_LBL[completedSq.stat]||completedSq.stat))
            )
          ),
          sqCooldownActive&&h("div",{style:"font-size:11px;color:var(--td);text-align:center;padding:8px 0 4px;font-family:Orbitron,sans-serif"},"⏳ Prochaine quête dans "+fmtCD(sqCooldownUntil-now))
        ),
        !activeSq&&!completedSq&&(sqCooldownActive
          ? h("div",{class:"card"},
              h("div",{class:"ctitle",style:"color:#ef4444;margin-bottom:8px"},"Quête urgente"),
              h("div",{style:"font-size:11px;color:var(--td);text-align:center;padding:4px 0;font-family:Orbitron,sans-serif"},"⏳ Prochaine quête dans "+fmtCD(sqCooldownUntil-now))
            )
          : h("div",{style:"font-size:12px;color:var(--td);text-align:center;padding:8px 0"},"Chargement du défi...")
        )
      ),
      h("div",{class:"card"},
        h(SectionHeader,{title:"Quêtes journalières",done:reqDone,total:reqTotal}),
        req.map(o=>h(QI,{key:o.id,obj:o})),
        sleepDebtMed>0&&(()=>{
          const medDone = tLog["med"]||0;
          const done = medDone >= sleepDebtMed;
          const pct = Math.min(100,(medDone/sleepDebtMed)*100);
          return h("div",{class:"qi"+(done?" done":""),style:done?"":"border-color:#ef444466;background:rgba(239,68,68,0.04)"},
            h("div",{class:"qhdr",style:"display:flex;justify-content:space-between;align-items:center"},
              h("div",{class:"qname"},
                h("span",null,"🧘🏻‍♂️")," Méditation",
                !done&&h("span",{style:"font-size:9px;color:#ef4444;font-family:Orbitron,sans-serif;border:1px solid #ef444455;border-radius:4px;padding:1px 5px;margin-left:6px"},"⚠ DETTE 🛏️")
              ),
              h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:0.5px"},"0 XP · obligatoire")
            ),
            h("div",{class:"qrow"},
              h("div",{class:"qbar"},h("div",{class:"qfill"+(done?" done":pct>0?" partial":""),style:"width:"+pct+"%"})),
              h("div",{class:"qxp",style:done?"":"color:#ef4444"},medDone+"/"+sleepDebtMed+" min")
            ),
            h("div",{style:"display:flex;gap:8px;margin-top:8px"},
              h("button",{
                onClick:e=>{
                  const cur=tLog["med"]||0;
                  setState(s=>{const dl={...s.dailyLog};dl[today]={...(dl[today]||{}),med:cur+1};return{...s,dailyLog:dl,lastActiveDay:today};});
                },
                style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px"
              },"+1 min"),
              h("button",{
                onClick:e=>{
                  const cur=tLog["med"]||0;
                  setState(s=>{const dl={...s.dailyLog};dl[today]={...(dl[today]||{}),med:cur+10};return{...s,dailyLog:dl,lastActiveDay:today};});
                },
                style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px"
              },"+10 min")
            )
          );
        })()
      ),
      wkq.length>0&&h("div",{class:"card"},
        h(SectionHeader,{title:"Quêtes hebdomadaires",done:wkDone,total:wkTotal}),
        wkq.map(o=>h(QI,{key:o.id,obj:o}))
      ),
      bon.length>0&&h("div",{class:"card"},
        h(SectionHeader,{title:"Quêtes bonus",done:bonDone,total:bonTotal}),
        bon.map(o=>h(QI,{key:o.id,obj:o}))
      )
    );
  }

  // ─── ONGLET STATS ─────────────────────────────────────────────────────

  function Stats(){
    const statBalance = (()=>{
      const rows = STATS.map(s=>({
        id:s,
        label:STAT_LBL[s]||s,
        color:STAT_COLOR[s]||"#fff",
        level:state.stats[s]||0,
        xp:state.statXp[s]||0
      })).sort((a,b)=>b.xp-a.xp);

      const strongest = rows[0];
      const weakest = [...rows].sort((a,b)=>a.xp-b.xp)[0];
      const avgXp = Math.round(rows.reduce((sum,r)=>sum+r.xp,0)/Math.max(1,rows.length));
      const gapXp = strongest.xp - weakest.xp;
      const gapLvl = strongest.level - weakest.level;
      const weakPct = avgXp>0 ? Math.round((weakest.xp/avgXp)*100) : 100;
      const strongestShare = avgXp>0 ? Math.round((strongest.xp/avgXp)*100) : 100;

      let status, statusColor, message;
      if(gapLvl>=10 || weakPct<55){
        status="Déséquilibre marqué";
        statusColor="#ef4444";
        message=(weakest.label||weakest.id)+" est nettement en retard. Si tu ignores ça, ton build va se spécialiser par défaut.";
      } else if(gapLvl>=6 || weakPct<70){
        status="Déséquilibre modéré";
        statusColor="#f59e0b";
        message=(strongest.label||strongest.id)+" domine, "+(weakest.label||weakest.id)+" traîne. Corrige sans dramatiser.";
      } else {
        status="Équilibre sain";
        statusColor="#4ade80";
        message="Tes stats restent relativement cohérentes. Continue à répartir l'effort.";
      }

      return {rows,strongest,weakest,avgXp,gapXp,gapLvl,weakPct,strongestShare,status,statusColor,message};
    })();

    return h("div",{class:"tab"},
      h("div",{class:"card"},
        h("div",{class:"ctitle"},"Chemin vers le rang S"),
        h("div",{class:"rpath"},RANKS.map((r,i)=>{
          const xpReached=effectiveXp>=r.xpRequired;
          // Rang réellement débloqué : XP + condition de stats
          const req = RANK_STAT_REQUIREMENTS[r.id];
          const statsOk = !req || countStatsAtLevel(state.stats, req.level) >= req.count;
          const reached = xpReached && statsOk;
          const blocked = xpReached && !statsOk;
          const cur = r.id===rank.id;
          // Couleur du cercle : vert si atteint, orange si bloqué (XP OK mais stats KO), gris sinon
          const borderColor = reached ? r.color : blocked ? "#fb923c" : "#333";
          const textColor = reached ? r.color : blocked ? "#fb923c" : "#444";
          return h(Fragment,{key:r.id},
            h("div",{class:"rnode"},
              h("div",{class:"rcirc",style:"border-color:"+borderColor+";color:"+textColor+";background:"+(cur?r.color+"22":"transparent")+";box-shadow:"+(cur?"0 0 15px "+r.glow:"none")},r.id),

            ),
            i<RANKS.length-1&&(()=>{
              const nextR = RANKS[i+1];
              const nextReq = RANK_STAT_REQUIREMENTS[nextR.id];
              const nextStatsOk = !nextReq || countStatsAtLevel(state.stats, nextReq.level) >= nextReq.count;
              const connReached = effectiveXp>=nextR.xpRequired && nextStatsOk;
              return h("div",{class:"rconn",style:"background:"+(connReached?r.color:"#222")});
            })()
          );
        })),
        nextRank&&h("div",{style:"margin-top:8px"},
          h("div",{style:"display:flex;justify-content:space-between;font-size:11px;color:var(--td);margin-bottom:4px;font-family:Orbitron,sans-serif"},
            h("span",null,"Rang "+rank.id+" \u2192 "+nextRank.id),
            h("span",null,effectiveXp.toFixed(0)+" / "+nextRank.xpRequired+" XP")
          ),
          h("div",{class:"xpbar"},h("div",{class:"xpfill",style:"width:"+rankPct+"%"}))
        ),
        (()=>{
          let label, count, threshold, ok;
          if(nextRank && nextRankReq){
            count = nextRankReq.count;
            threshold = nextRankReq.level;
            ok = nextRankStatsOk;
            label = "Rang "+nextRank.id;
          } else if(!nextRank && ascReq && prestige<MAX_PRESTIGE){
            count = ascReq.count;
            threshold = ascReq.level;
            ok = ascStatsOk;
            label = "Ascension "+nextAscension;
          } else {
            return null;
          }
          const reached = countStatsAtLevel(state.stats, threshold);
          const summaryColor = ok ? "#4ade80" : (rankBlocked || prestigeBlocked) ? "#fb923c" : "var(--td)";
          return h("div",{
            onClick:()=>setShowRankReqStats(v=>!v),
            style:"margin-top:10px;padding:9px 10px;background:rgba(255,255,255,0.02);border:1px solid "+(ok?"#4ade8033":(rankBlocked||prestigeBlocked)?"#fb923c44":"rgba(255,255,255,0.06)")+";border-radius:8px;cursor:pointer;user-select:none"
          },
            h("div",{style:"display:flex;justify-content:space-between;align-items:center;font-size:10px;font-family:Orbitron,sans-serif;letter-spacing:1px"},
              h("span",{style:"color:var(--td);text-transform:uppercase"},"Condition "+label),
              h("span",{style:"color:"+summaryColor},(ok?"✓ ":"")+reached+"/"+count+" stats niv. "+threshold+" "+(showRankReqStats?"▲":"▼"))
            ),
            showRankReqStats&&h("div",{style:"margin-top:8px;display:grid;grid-template-columns:repeat(2,1fr);gap:4px"},
              STATS.map(s=>{
                const lvl = state.stats[s]||0;
                const statOk = lvl>=threshold;
                return h("div",{key:s,style:"display:flex;justify-content:space-between;align-items:center;font-size:10px;padding:4px 6px;background:rgba(255,255,255,0.02);border-radius:4px;border:1px solid "+(statOk?"#4ade8033":"rgba(255,255,255,0.04)")},
                  h("span",{style:"color:"+(STAT_COLOR[s]||"#fff")},STAT_LBL[s]||s),
                  h("span",{style:"font-family:Orbitron,sans-serif;color:"+(statOk?"#4ade80":"var(--td)")},lvl+"/"+threshold)
                );
              })
            )
          );
        })()
      ),
      h("div",{class:"card"},
        h("div",{class:"ctitle"},"Équilibre des stats"),
        h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:10px"},
          h("div",{style:"flex:1;min-width:0"},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:12px;font-weight:800;letter-spacing:1px;color:"+statBalance.statusColor+";text-transform:uppercase"},statBalance.status),
            h("div",{style:"font-size:12px;color:var(--td);line-height:1.35;margin-top:4px"},statBalance.message)
          ),
          h("div",{style:"text-align:right;flex:0 0 auto"},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:13px;color:var(--rc)"},"+"+statBalance.gapLvl),
            h("div",{style:"font-size:9px;color:var(--td);text-transform:uppercase"},"écart niv.")
          )
        ),
        h("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px"},
          h("div",{style:"background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:8px"},
            h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;text-transform:uppercase;margin-bottom:4px"},"Stat dominante"),
            h("div",{style:"font-size:13px;font-weight:700;color:"+statBalance.strongest.color},statBalance.strongest.label+" niv. "+statBalance.strongest.level)
          ),
          h("div",{style:"background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:8px"},
            h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;text-transform:uppercase;margin-bottom:4px"},"Stat en retard"),
            h("div",{style:"font-size:13px;font-weight:700;color:"+statBalance.weakest.color},statBalance.weakest.label+" niv. "+statBalance.weakest.level)
          )
        ),
        h("div",{style:"display:flex;flex-direction:column;gap:5px"},
          statBalance.rows.map(r=>{
            const pct = statBalance.avgXp>0 ? Math.max(4,Math.min(100,(r.xp/statBalance.avgXp)*70)) : 4;
            const isWeak = r.id===statBalance.weakest.id;
            const isStrong = r.id===statBalance.strongest.id;
            return h("div",{key:r.id},
              h("div",{style:"display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px"},
                h("span",{style:"color:"+r.color},r.label+" · niv. "+r.level),
                h("span",{style:"font-family:Orbitron,sans-serif;color:"+(isWeak?statBalance.statusColor:"var(--td)")},(r.xp||0).toLocaleString("fr-FR")+" XP"+(isStrong?" ▲":isWeak?" ▼":""))
              ),
              h("div",{class:"qbar"},h("div",{class:"qfill"+(isStrong?" over":isWeak?" partial":""),style:"width:"+pct+"%;background:"+r.color}))
            );
          })
        )
      ),

      h("div",{class:"card"},
        h("div",{class:"ctitle"},"Caract\u00e9ristiques"),
        STATS.map(s=>{
          const sx=state.statXp[s]||0, lvl=getLvl(sx);
          const xpIn=sx-totForLvl(lvl), xpNeed=xpForLvl(lvl), pct=Math.max(0,Math.min(100,(xpIn/xpNeed)*100));
          return h("div",{key:s,class:"schr"},
            h("div",{class:"schn"},h("span",null,STAT_LBL[s]||s),h("span",{class:"schlvl"},"Niv. "+lvl)),
            h("div",{class:"schb"},h("div",{class:"schf",style:"width:"+pct+"%;background:linear-gradient(90deg,"+(STAT_COLOR[s]||"#fff")+"88,"+(STAT_COLOR[s]||"#fff")+")"})),
            h("div",{style:"font-size:9px;color:var(--td);margin-top:2px;font-family:Orbitron,sans-serif"},sx.toLocaleString("fr-FR")+" / "+totForLvl(lvl+1).toLocaleString("fr-FR")+" XP")
          );
        })
      )
    );
  }

  // ─── ONGLET HISTORIQUE ────────────────────────────────────────────────

  function History(){
    const open = historyOpen;
    const setOpen = setHistoryOpen;
    const toggle = k => setOpen(o=>({...o,[k]:!o[k]}));
    const ChevronBtn = ({k}) => h("span",{
      onClick:(e)=>{e.stopPropagation();toggle(k);},
      style:"cursor:pointer;color:var(--td);font-size:10px;font-family:Orbitron,sans-serif;font-weight:700;letter-spacing:1px;flex-shrink:0;user-select:none"
    },open[k]?"\u25B2":"\u25BC");
    function localDate(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return y+"-"+m+"-"+day;}
    function getWS(off){const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7)-off*7);d.setHours(0,0,0,0);return d;}
    const ws=getWS(wkOff);
    const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(ws);d.setDate(ws.getDate()+i);return localDate(d);});
    const wKey=wkStr(ws);
    const dt={};
    weekDays.forEach(dk=>Object.entries(state.dailyLog[dk]||{}).forEach(([id,v])=>{dt[id]=(dt[id]||0)+v;}));
    const wkLogEntry=state.weeklyLog[wKey]||{};
    const tots={...dt,...wkLogEntry};
    const we=new Date(ws); we.setDate(ws.getDate()+6);
    const fmt=d=>d.getDate().toString().padStart(2,"0")+"/"+(d.getMonth()+1).toString().padStart(2,"0");
    const lbl=wkOff===0?"Cette semaine":wkOff===1?"Semaine derni\u00e8re":fmt(ws)+" \u2013 "+fmt(we);
    const ordered=[...sortStat(objs.filter(o=>o.daily&&!o.optional)),...(restMode&&walkObj?[...sortStat(objs.filter(o=>o.weekly)),walkObj]:sortStat(objs.filter(o=>o.weekly))),...sortStat(objs.filter(o=>o.daily&&o.optional&&!o.bonusHidden))];

    // ── Labels jours de la semaine (lun → dim) ──
    const weekLbls=["L","M","M","J","V","S","D"];

    // ── Records personnels (max par quête sur tout le dailyLog) ──
    const records={};
    Object.entries(state.dailyLog).forEach(([date,log])=>{
      Object.entries(log).forEach(([id,val])=>{
        if(!records[id]||val>records[id].val)records[id]={val,date};
      });
    });
    // weekly records
    Object.entries(state.weeklyLog).forEach(([wk,log])=>{
      Object.entries(log).forEach(([id,val])=>{
        if(!records[id]||val>records[id].val)records[id]={val,date:wk};
      });
    });

    return h("div",{class:"tab"},
      // Navigation semaine
      h("div",{class:"card",style:"padding:12px 16px"},
        h("div",{style:"display:flex;align-items:center;justify-content:space-between;gap:8px"},
          h("button",{style:"background:var(--sf2);border:1px solid var(--rc);border-radius:8px;color:var(--rc);font-size:18px;width:40px;height:40px;cursor:pointer;opacity:"+(wkOff>=51?.3:.8),onClick:()=>setWkOff(o=>Math.min(o+1,51))},"\u2039"),
          h("div",{style:"text-align:center;flex:1"},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:12px;color:var(--rc);letter-spacing:1px"},lbl),
            h("div",{style:"font-size:10px;color:var(--td);margin-top:2px"},fmt(ws)+" \u2013 "+fmt(we))
          ),
          h("button",{style:"background:var(--sf2);border:1px solid var(--rc);border-radius:8px;color:var(--rc);font-size:18px;width:40px;height:40px;cursor:pointer;opacity:"+(wkOff===0?.3:.8),onClick:()=>setWkOff(o=>Math.max(o-1,0))},"\u203A")
        ),
        wkOff>0&&h("button",{style:"width:100%;margin-top:10px;background:rgba(255,255,255,0.03);border:1px solid var(--rc);border-radius:8px;color:var(--rc);font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:2px;padding:7px;cursor:pointer;text-transform:uppercase",onClick:()=>setWkOff(0)},"Aujourd'hui")
      ),
      // Activité de la semaine (toujours ouvert, avec L M M J V S D en haut)
      h("div",{class:"card"},
        h("div",{class:"ctitle"},"Activit\u00e9 de la semaine"),
        // Bandeau jours L M M J V S D
        h("div",{class:"wgrid",style:"margin-top:8px;margin-bottom:14px"},weekDays.map((d,i)=>{
          const log=state.dailyLog[d]||{};
          const xp=Object.entries(log).reduce((s,[id,a])=>{const o=objs.find(x=>x.id===id);return s+(o?calcXp(o,a):0);},0);
          const isFuture=d>today;
          const isToday=d===today;
          const allDone=isToday
            ?reqDailyObjs.every(o=>(log[o.id]||0)>=getTarget(o.base))
            :!isFuture&&activeOn(d).every(o=>(log[o.id]||0)>=getValidateThreshold(o,d));
          const isPast=d<today;
          const border=isFuture?"1px dashed #ffffff10":allDone?"2px solid #4ade80":isPast&&xp>0?"2px solid #ef4444":isToday?"1px solid "+rank.color:"1px solid #ffffff18";
          const shadow=allDone?"0 0 6px #4ade8066":isPast&&xp>0?"0 0 6px #ef444466":"";
          return h("div",{key:d,class:"wday"},
            h("div",{class:"wdlbl"},weekLbls[i]),
            h("div",{class:"wddot",style:"background:#000000;border:"+border+(shadow?";box-shadow:"+shadow:"")+(isFuture?";opacity:.3":"")})
          );
        })),
        h(Fragment,null,
          ordered.map(obj=>{
          if(obj.binary){
            const pastDays=weekDays.filter(d=>d<=today);
            const successes=pastDays.filter(d=>(state.dailyLog[d]?.[obj.id]||0)>=1).length;
            const pct=Math.min(100,(successes/7)*100), complete=successes>=7;
            return h("div",{key:obj.id,style:"display:flex;align-items:center;gap:10px;margin-bottom:10px"},
              QuestIcon(obj.id,obj.icon,18),
              h("div",{style:"flex:1"},
                h("div",{style:"font-size:12px;color:var(--tx);margin-bottom:3px;display:flex;justify-content:space-between"},
                  h("span",{style:"display:flex;align-items:center;gap:6px"},
                    obj.name,
                    obj.optional&&h("span",{style:"font-size:9px;color:#fbbf24;font-family:Orbitron,sans-serif;border:1px solid #fbbf2455;border-radius:4px;padding:1px 4px"},"BONUS")
                  ),
                  h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px"},successes+"/7 "+(obj.id==="sleep"?"nuits":"jours"))
                ),
                h("div",{class:"qbar"},h("div",{class:"qfill"+(complete?" done":successes>0?" partial":""),style:"width:"+pct+"%"}))
              ),
              complete&&h("span",{style:"font-family:Orbitron,sans-serif;font-size:14px;font-weight:700;color:#4ade80"},"\u2713")
            );
          }
          const val=tots[obj.id]||0, wt=obj.weekly?(obj.id==="walk"&&restMode&&walkObj?walkObj.base:getRankBase(obj.id,ri)):obj.id==="walk"?obj.base:(obj.target&&!obj.binary?obj.target:getRankBase(obj.id,ri,prestige))*7;
          const pct=Math.min(100,(val/wt)*100), complete=val>=wt, over=val>wt;
          return h("div",{key:obj.id,style:"display:flex;align-items:center;gap:10px;margin-bottom:10px"},
            QuestIcon(obj.id,obj.icon,18),
            h("div",{style:"flex:1"},
              h("div",{style:"font-size:12px;color:var(--tx);margin-bottom:3px;display:flex;justify-content:space-between"},
                h("span",{style:"display:flex;align-items:center;gap:6px"},
                  obj.name,
                  obj.weekly&&!obj.optional&&h("span",{style:"font-size:9px;color:#818cf8;font-family:Orbitron,sans-serif;border:1px solid #818cf855;border-radius:4px;padding:1px 4px"},"HEBDO"),
                  obj.optional&&obj.id!=="walk"&&h("span",{style:"font-size:9px;color:#fbbf24;font-family:Orbitron,sans-serif;border:1px solid #fbbf2455;border-radius:4px;padding:1px 4px"},"BONUS"),
                  obj.id==="walk"&&h("span",{style:"font-size:9px;color:#fbbf24;font-family:Orbitron,sans-serif;border:1px solid #fbbf2455;border-radius:4px;padding:1px 4px"},"BONUS"),
                  obj.id==="walk"&&h("span",{style:"font-size:9px;color:#818cf8;font-family:Orbitron,sans-serif;border:1px solid #818cf855;border-radius:4px;padding:1px 4px;margin-left:2px"},"HEBDO"),

                ),
                h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px"},
                  fmtNum(val)+"/"+fmtNum(wt)+" "+((val>1||wt>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres",repas:"repas"}[obj.unit]||obj.unit))
              ),
              h("div",{class:"qbar"},h("div",{class:"qfill"+(over?" over":complete?" done":pct>0?" partial":""),style:"width:"+pct+"%"}))
            ),
            complete&&h("span",{style:"font-family:Orbitron,sans-serif;font-size:14px;font-weight:700;color:#4ade80"},"\u2713")
          );
        }),
        ordered.every(o=>!(tots[o.id]>0))&&h("div",{style:"text-align:center;font-size:13px;color:var(--td);padding:16px 0"},"Aucune activit\u00e9 cette semaine")
        )// end Fragment
      ),
      // Records personnels
      h("div",{class:"card"},
        h("div",{style:"display:flex;align-items:center;justify-content:space-between;cursor:pointer",onClick:()=>toggle("records")},
          h("div",{class:"ctitle",style:"margin:0"},"Records personnels"),
          h(ChevronBtn,{k:"records"})
        ),
        open.records&&h(Fragment,null,
          h("div",{style:"margin-top:12px"}),
          [...sortStat(objs.filter(o=>o.daily&&!o.optional&&!o.binary)),...(restMode&&walkObj?[...sortStat(objs.filter(o=>o.weekly&&!o.binary)),walkObj]:sortStat(objs.filter(o=>o.weekly&&!o.binary))),...sortStat(objs.filter(o=>o.daily&&o.optional&&!o.binary&&!o.bonusHidden))].map(o=>{
          const rec=records[o.id];
          if(!rec)return h("div",{key:o.id,style:"display:flex;align-items:center;gap:10px;margin-bottom:8px;opacity:.35"},
            QuestIcon(o.id,o.icon,18),
            h("div",{style:"flex:1"},
              h("div",{style:"font-size:12px;color:var(--td);display:flex;align-items:center;gap:5px"},
                o.name,
                (o.weekly||o.id==="walk")&&h("span",{style:"font-size:9px;color:#818cf8;font-family:Orbitron,sans-serif;border:1px solid #818cf855;border-radius:4px;padding:1px 4px"},"HEBDO"),
                o.optional&&o.id!=="walk"&&h("span",{style:"font-size:9px;color:#fbbf24;font-family:Orbitron,sans-serif;border:1px solid #fbbf2455;border-radius:4px;padding:1px 4px"},"BONUS")
              )
            ),
            h("span",{style:"font-size:11px;color:var(--td)"},"—")
          );
          const fmt2=d=>{if(d.includes("-W"))return d.replace("-W","-S");const p=d.split("-");return p[2]+"/"+p[1];};
          return h("div",{key:o.id,style:"display:flex;align-items:center;gap:10px;margin-bottom:8px"},
            QuestIcon(o.id,o.icon,18),
            h("div",{style:"flex:1"},
              h("div",{style:"font-size:12px;color:var(--tx);display:flex;align-items:center;gap:5px"},
                o.name,
                (o.weekly||o.id==="walk")&&h("span",{style:"font-size:9px;color:#818cf8;font-family:Orbitron,sans-serif;border:1px solid #818cf855;border-radius:4px;padding:1px 4px"},"HEBDO"),
                o.optional&&o.id!=="walk"&&h("span",{style:"font-size:9px;color:#fbbf24;font-family:Orbitron,sans-serif;border:1px solid #fbbf2455;border-radius:4px;padding:1px 4px"},"BONUS"),
                o.id==="walk"&&h("span",{style:"font-size:9px;color:#fbbf24;font-family:Orbitron,sans-serif;border:1px solid #fbbf2455;border-radius:4px;padding:1px 4px;margin-left:2px"},"BONUS")
              ),
              h("div",{style:"font-size:10px;color:var(--td);margin-top:1px"},fmt2(rec.date))
            ),
            h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:var(--tx)"},
              fmtNum(rec.val)+" "+((rec.val>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres"}[o.unit]||o.unit))
          );
        })
        )// end Fragment
      ),
      // Totaux depuis le début
      (()=>{
        // Trouver la première date d'utilisation
        const allDays=Object.keys(state.dailyLog).sort();
        const allWks=Object.keys(state.weeklyLog).sort();
        const firstDay=allDays.length>0?allDays[0]:null;
        const fmtFirst=d=>{if(!d)return"";const p=d.split("-");return p[2]+"/"+p[1]+"/"+p[0];};
        // Calculer les totaux
        const totals={};
        Object.values(state.dailyLog).forEach(log=>{
          Object.entries(log).forEach(([id,val])=>{totals[id]=(totals[id]||0)+val;});
        });
        Object.values(state.weeklyLog).forEach(log=>{
          Object.entries(log).forEach(([id,val])=>{totals[id]=(totals[id]||0)+val;});
        });
        const displayObjs=[...sortStat(objs.filter(o=>o.daily&&!o.optional&&!o.binary)),...(restMode&&walkObj?[...sortStat(objs.filter(o=>o.weekly&&!o.binary)),walkObj]:sortStat(objs.filter(o=>o.weekly&&!o.binary))),...sortStat(objs.filter(o=>o.daily&&o.optional&&!o.binary&&!o.bonusHidden))];
        return h("div",{class:"card"},
          h("div",{style:"display:flex;align-items:center;justify-content:space-between;cursor:pointer",onClick:()=>toggle("totals")},
            h("div",{class:"ctitle",style:"margin:0"},"Totaux depuis le d\u00e9but"+(firstDay?" \u2014 "+fmtFirst(firstDay):"")),
            h(ChevronBtn,{k:"totals"})
          ),
          open.totals&&h(Fragment,null,
            h("div",{style:"margin-top:12px"}),
            displayObjs.map(o=>{
              const total=totals[o.id]||0;
              const unitLbl=total>1?({rep:"reps",page:"pages",verre:"verres",km:"km",min:"min"}[o.unit]||o.unit):o.unit;
              return h("div",{key:o.id,style:"display:flex;align-items:center;gap:10px;margin-bottom:8px"+(total===0?";opacity:.35":"")},
                QuestIcon(o.id,o.icon,18),
                h("div",{style:"flex:1"},
                  h("div",{style:"font-size:12px;color:var(--tx);display:flex;align-items:center;gap:5px"},
                    o.name,
                    (o.weekly||o.id==="walk")&&h("span",{style:"font-size:9px;color:#818cf8;font-family:Orbitron,sans-serif;border:1px solid #818cf855;border-radius:4px;padding:1px 4px"},"HEBDO"),
                    o.optional&&o.id!=="walk"&&h("span",{style:"font-size:9px;color:#fbbf24;font-family:Orbitron,sans-serif;border:1px solid #fbbf2455;border-radius:4px;padding:1px 4px"},"BONUS"),
                    o.id==="walk"&&h("span",{style:"font-size:9px;color:#fbbf24;font-family:Orbitron,sans-serif;border:1px solid #fbbf2455;border-radius:4px;padding:1px 4px;margin-left:2px"},"BONUS")
                  )
                ),
                h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:var(--tx)"},
                  total===0?"—":(total%1===0?total.toLocaleString("fr-FR"):total.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2}))+(total>0?" "+unitLbl:""))
              );
            })
          )// end Fragment
        );
      })()
    );
  }

  // ─── REGLAGES ─────────────────────────────────────────────────────────

  function Settings(){
    if(!showSet)return null;
    const ordered=[...sortStat(objs.filter(o=>o.daily&&!o.optional)),...(restMode&&walkObj?[...sortStat(objs.filter(o=>o.weekly)),walkObj]:sortStat(objs.filter(o=>o.weekly))),...sortStat(objs.filter(o=>o.daily&&o.optional&&!o.bonusHidden))];
    function applyEdit(){
      setState(s=>{
        let xpD=0;
        const ndl={...s.dailyLog}, nwl={...s.weeklyLog}, nsx={...s.statXp};
        ordered.forEach(obj=>{
          const el=document.getElementById("cd_"+obj.id); if(!el)return;
          const nv=parseFloat(el.value.replace(",",".")); if(isNaN(nv)||nv<0)return;
          const ov=obj.weekly?(s.weeklyLog[wk]?.[obj.id]||0):(s.dailyLog[today]?.[obj.id]||0);
          const oxp=calcXp(obj,ov), nxp=calcXp(obj,nv);
          xpD+=nxp-oxp; nsx[obj.stat]=Math.max(0,(nsx[obj.stat]||0)+(nxp-oxp));
          if(obj.weekly)nwl[wk]={...(nwl[wk]||{}),[obj.id]:nv};
          else ndl[today]={...(ndl[today]||{}),[obj.id]:nv};
        });
        const ns={...s.stats}; Object.keys(nsx).forEach(st=>{ns[st]=getLvl(nsx[st]);});
        return {...s,totalXp:Math.max(0,s.totalXp+xpD),dailyLog:ndl,weeklyLog:nwl,statXp:nsx,stats:ns};
      });
      setShowSet(false);
    }
    return h("div",{class:"modal-ov",onClick:e=>{if(e.target===e.currentTarget){setShowSet(false);setConfirmReset(false);}}},
      h("div",{class:"modal"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"},
          h("div",{class:"mtitle",style:"margin-bottom:0;display:flex;align-items:center;gap:10px"},h("img",{src:"assets/nav/reglages.png",alt:"Réglages",style:"width:22px;height:22px;object-fit:contain;filter:var(--icon-filter,saturate(1.18)) drop-shadow(0 0 7px var(--rc));flex:0 0 auto"}),"Réglages"),
          h("button",{style:"background:none;border:none;color:var(--td);font-size:44px;line-height:1;cursor:pointer",onClick:()=>{setShowSet(false);setConfirmReset(false);}},"\u2715")
        ),
        h("div",{class:"msec"},
          h("div",{class:"mlbl"},"Mode blessure — Course"),
          h("div",{style:"font-size:11px;color:var(--td);margin-bottom:10px;line-height:1.5"},
            restMode
              ? "Mode blessure actif \u2014 la marche remplace la course cette semaine."
              : "Active ce mode si tu es bless\u00e9. La marche remplace la course avec un objectif adapt\u00e9."
          ),
          !restMode
            ? h("button",{class:"mbtn",style:"width:100%;background:#ef444411;border:1px solid #ef444466;color:#ef4444",onClick:()=>{
                const currentWk=wkStr();
                const runDone=(state.weeklyLog[currentWk]||{})["run"]||0;
                const runBase=getRankBase("run",ri,prestige);
                const remaining=Math.max(0,runBase-runDone);
                const walkTarget=Math.max(1,Math.ceil(remaining*0.5));
                walkTargetRef.current=walkTarget;
                setState(s=>({...s,restMode:true,walkTarget}));
                setShowSet(false);
              }},"Blessure — activer la marche")
            : h("button",{class:"mbtn",style:"width:100%;background:#4ade8011;border:1px solid #4ade8066;color:#4ade80",onClick:()=>{
                walkTargetRef.current=0;
                setState(s=>({...s,restMode:false,walkTarget:0}));
                setShowSet(false);
              }},"Rétablissement — reprendre la course")
        ),
        h("div",{class:"divider"}),
        h("div",{class:"msec"},
          h("div",{class:"mlbl"},"Corriger les données du jour"),
          ordered.map(obj=>{
            const cur=(obj.weekly||obj.id==="walk")?(wLog[obj.id]||0):(tLog[obj.id]||0);
            return h("div",{key:obj.id,style:"display:flex;align-items:center;gap:10px;margin-bottom:8px"},
              QuestIcon(obj.id,obj.icon,20,"min-width:24px"),
              h("span",{style:"flex:1;font-size:13px"},obj.name),
              h("input",{id:"cd_"+obj.id,class:"min",type:"text",inputMode:"decimal",defaultValue:String(cur),style:"width:80px;margin:0;text-align:center"}),
              h("span",{style:"font-size:11px;color:var(--td);min-width:28px"},obj.unit)
            );
          }),
          h("button",{class:"mbtn mprim",style:"width:100%;margin-top:8px",onClick:applyEdit},"Appliquer")
        ),
        h("div",{class:"divider"}),
        h("div",{class:"msec"},
          h("div",{class:"mlbl"},"Sauvegarde / Restauration"),
          h("div",{class:"mrow",style:"margin-bottom:8px"},
            h("button",{class:"mbtn mprim",style:"flex:1",onClick:()=>{
              const json=JSON.stringify(state);
              navigator.clipboard.writeText(json).then(()=>alert("\u2705 Donn\u00e9es copi\u00e9es !")).catch(()=>window.prompt("Copie ce texte :",json));
            }},"Exporter"),
            h("button",{class:"mbtn mprim",style:"flex:1",onClick:()=>{
              const json=window.prompt("Colle tes donn\u00e9es ici :");
              if(!json)return;
              try{const imported=JSON.parse(json);setState(s=>({...s,...imported,objectives:DEFS}));alert("\u2705 Restaur\u00e9 !");setShowSet(false);}catch{alert("\u274C Donn\u00e9es invalides.");}
            }},"Importer")
          ),
          h("button",{class:"mbtn mprim",style:"width:100%",onClick:()=>{
            const json=JSON.stringify(state,null,2);
            const blob=new Blob([json],{type:"application/json"});
            const url=URL.createObjectURL(blob);
            const a=document.createElement("a");
            const d=new Date();
            const dateStr=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
            a.href=url; a.download="kaizen-backup-"+dateStr+".json";
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }},"Télécharger fichier"),
          h("div",{style:"font-size:10px;color:var(--td);margin-top:6px;line-height:1.4"},
            "L'app conserve automatiquement 4 sauvegardes internes (rotation \u00e0 chaque modification). En cas de probl\u00e8me, fais un t\u00e9l\u00e9chargement r\u00e9gulier."
          )
        ),
        h("div",{class:"divider"}),
        h("div",{class:"msec"},
          h("div",{class:"mlbl"},"Actualiser l'application"),
          h("div",{style:"font-size:11px;color:var(--td);margin-bottom:10px;line-height:1.5"},"Si l'app ne se charge pas correctement, actualise pour recharger tous les scripts."),
          h("button",{class:"mbtn",style:"width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.2);color:var(--tx)",onClick:()=>window.location.reload(true)},"Actualiser l'app")
        ),

      )
    );
  }

  // ─── ANIMATION RANK UP ────────────────────────────────────────────────

  function RankUp(){
    if(!rankUp)return null;
    const prevRankIdx=RANKS.findIndex(r=>r.id===rankUp.id)-1;
    const prevRank=prevRankIdx>=0?RANKS[prevRankIdx]:null;
    const particles=Array.from({length:40},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*3,
      dur:1.2+Math.random()*2,
      size:2+Math.random()*4,
      cyan:Math.random()>0.7
    }));
    return h("div",{class:"ruov",style:"--rc:"+rankUp.color+";--rg:"+rankUp.glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.cyan?"rgba(74,222,128,0.6)":rankUp.color)+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h("div",{class:"ruevol"},"\u00c9volution de rang"),
        h("div",{class:"rurank",style:"data-r:"+rankUp.id,"data-r":rankUp.id},rankUp.id),
        
        h("button",{class:"rudis",onClick:()=>setRankUp(null)},"Continuer")
      )
    );
  }

  // ─── ANIMATION PRESTIGE ───────────────────────────────────────────────

  function PrestigeUp(){
    if(!prestigeUp)return null;
    const particles=Array.from({length:40},(_,i)=>({id:i,left:Math.random()*100,delay:Math.random()*3,dur:1.2+Math.random()*2,size:2+Math.random()*4}));
    const stars=Array.from({length:30},(_,i)=>({id:i,left:Math.random()*100,top:Math.random()*100,delay:Math.random()*4,dur:2+Math.random()*3}));
    return h("div",{class:"puov"},
      h("div",{class:"pubg",style:"pointer-events:none"}),
      h("div",{class:"pustars",style:"pointer-events:none"},stars.map(s=>h("div",{key:s.id,class:"pustar",style:"left:"+s.left+"%;top:"+s.top+"%;animation-delay:"+s.delay+"s;animation-duration:"+s.dur+"s"}))),
      h("div",{class:"puparts",style:"pointer-events:none"},particles.map(p=>h("div",{key:p.id,class:"pupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(Math.random()>.6?"#c084fc":"#a855f7")+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"}))),
      h("div",{class:"pucont"},
        h("div",{class:"puatom"},"\u269B\uFE0F"),
        h("div",{class:"pubadge"},"Ascension "+ROMAN[prestigeUp-1]),
        h("button",{class:"pudis",onClick:()=>setPrestigeUp(null)},"Continuer")
      ),
      h("div",{class:"puline",style:"pointer-events:none"})
    );
  }

  // ─── ONGLET CODEX ─────────────────────────────────────────────────────

  function Codex(){
    const toggleC = k => setCodexOpen(o=>({obl:false,bonus:false,sq:false,ep:false,dj:false,[k]:!o[k]}));
    const statLabel = stat => STAT_LBL2[stat] || STAT_LBL[stat] || stat || "";
    const unitPlural = (unit, value) => {
      if(!unit) return "";
      if(value<=1) return unit;
      return ({rep:"reps",page:"pages",verre:"verres",km:"km",min:"min",jour:"jours",nuit:"nuits",repas:"repas"}[unit] || unit);
    };
    const ChevronC = ({k}) => h("span",{
      onClick:e=>{e.stopPropagation();toggleC(k);},
      style:"cursor:pointer;color:var(--td);font-size:10px;font-family:Orbitron,sans-serif;font-weight:700;letter-spacing:1px;flex-shrink:0;user-select:none"
    },codexOpen[k]?"▲":"▼");

    const cardStyle = "padding:10px;border:1px solid rgba(255,255,255,0.07);border-radius:10px;margin-bottom:7px;background:rgba(255,255,255,0.025)";
    const detailStyle = "font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;line-height:1.45";

    function StatPill({stat,xp}){
      const color=STAT_COLOR[stat]||"var(--rc)";
      return h("span",{style:"display:inline-block;border:1px solid "+color+"55;color:"+color+";border-radius:999px;padding:2px 7px;margin:2px 4px 2px 0;font-size:10px;font-family:Orbitron,sans-serif;background:"+color+"11"},
        "+"+xp+" XP "+statLabel(stat)
      );
    }

    function renderXpPills(item){
      const pairs=[];
      if(item.binary && item.binaryXp){ pairs.push({stat:item.stat,xp:item.binaryXp}); }
      else if(item.xp){ pairs.push({stat:item.stat,xp:item.xp}); }
      else if(item.xpPer){ pairs.push({stat:item.stat,xp:item.xpPer+"/"+item.unit}); }
      if(item.xp2&&item.stat2) pairs.push({stat:item.stat2,xp:item.xp2});
      if(item.xp3&&item.stat3) pairs.push({stat:item.stat3,xp:item.xp3});
      if(item.xpPer2&&item.stat2) pairs.push({stat:item.stat2,xp:item.xpPer2+"/"+item.unit});
      if(item.tiers){
        return h("div",null,item.tiers.map(t=>{
          const ps=[h(StatPill,{stat:t.stat,xp:t.xp})];
          if(t.xp2&&t.stat2) ps.push(h(StatPill,{stat:t.stat2,xp:t.xp2}));
          return h("div",{key:t.at,style:"margin-top:3px"},"Palier "+t.at+" : ",...ps);
        }));
      }
      return h("div",null,pairs.map((p,i)=>h(StatPill,{key:i,stat:p.stat,xp:p.xp})));
    }

    function targetForQuest(obj){
      const isWeekly = obj.weekly || obj.id==="walk";
      const period = isWeekly ? " / semaine" : " / jour";
      if(obj.binary) return "Validation simple";
      if(obj.tiers) return (obj.target||obj.base||1)+" "+unitPlural(obj.unit,obj.target||obj.base||1)+period;
      const base = getRankBase(obj.id, ri, prestige);
      return base+" "+unitPlural(obj.unit,base)+period;
    }

    function capForQuest(obj){
      if(obj.binary || obj.tiers) return "—";
      return obj.cap ? "×"+obj.cap : "Aucun";
    }

    function renderQuest(obj){
      const subtitle = obj.desc || obj.subtitle || "";
      return h("div",{key:obj.id,style:cardStyle},
        h("div",{style:"display:flex;align-items:flex-start;gap:9px"},
          QuestIcon(obj.id,obj.icon||"•",20,"line-height:1.1"),
          h("div",{style:"flex:1;min-width:0"},
            h("div",{style:"font-size:13px;color:var(--tx);font-weight:700;line-height:1.15"},obj.name),
            subtitle&&h("div",{style:"font-size:10px;color:var(--td);margin-top:3px;line-height:1.25"},subtitle),
            h("div",{style:"margin-top:7px"},renderXpPills(obj)),
            h("div",{style:"display:flex;flex-direction:column;gap:3px;margin-top:6px"},
              h("div",{style:detailStyle},"▸ Objectif : "+targetForQuest(obj)),
              h("div",{style:detailStyle},"▸ Cap : "+capForQuest(obj))
            )
          )
        )
      );
    }

    function targetForSpecial(q){
      if(q.binary) return "Validation simple";
      if(q.tiers) return (q.target||1)+" "+unitPlural(q.unit,q.target||1)+" total";
      return (q.target||1)+" "+unitPlural(q.unit,q.target||1);
    }

    function renderSpecial(q){
      return h("div",{key:q.id,style:cardStyle},
        h("div",{style:"display:flex;align-items:flex-start;gap:9px"},
          QuestIcon(q.id,q.icon||"🚨",20,"line-height:1.1"),
          h("div",{style:"flex:1;min-width:0"},
            h("div",{style:"font-size:13px;color:var(--tx);font-weight:700;line-height:1.15"},q.name),
            q.desc&&h("div",{style:"font-size:10px;color:var(--td);margin-top:3px;line-height:1.25"},q.desc),
            h("div",{style:"margin-top:7px"},renderXpPills(q)),
            h("div",{style:"display:flex;flex-direction:column;gap:3px;margin-top:6px"},
              h("div",{style:detailStyle},"▸ Objectif : "+targetForSpecial(q)),
              h("div",{style:detailStyle},"▸ Délai : "+(q.days||1)+" jour"+((q.days||1)>1?"s":"")),
              h("div",{style:detailStyle},"▸ Cap : —")
            )
          )
        )
      );
    }

    function targetForEpreuve(ep){
      if(ep.binary) return "Validation simple";
      if(ep.cumDays) return (ep.streakDays||ep.target||5)+" jours à valider"+(ep.dailyMin?" · "+ep.dailyMin+" min/jour":"");
      if(ep.streak7 || ep.streakDays) return "Streak "+(ep.streakDays||7)+" jours";
      return (ep.target||1)+" "+unitPlural(ep.unit,ep.target||1);
    }

    function renderEpreuve(ep){
      return h("div",{key:ep.id,style:cardStyle},
        h("div",{style:"display:flex;align-items:flex-start;gap:9px"},
          QuestIcon(ep.iconId,ep.icon||"⚔️",20,"line-height:1.1"),
          h("div",{style:"flex:1;min-width:0"},
            h("div",{style:"font-size:13px;color:var(--tx);font-weight:700;line-height:1.15"},ep.name),
            ep.desc&&h("div",{style:"font-size:10px;color:var(--td);margin-top:3px;line-height:1.25"},ep.desc),
            h("div",{style:"margin-top:7px"},renderXpPills(ep)),
            h("div",{style:"display:flex;flex-direction:column;gap:3px;margin-top:6px"},
              h("div",{style:detailStyle},"▸ Objectif : "+targetForEpreuve(ep)),
              h("div",{style:detailStyle},"▸ Délai : "+(ep.days||7)+" jours"),
              h("div",{style:detailStyle},"▸ Cap : —")
            )
          )
        )
      );
    }

    function renderDonjon(dj){
      return h("div",{key:dj.id,style:cardStyle},
        h("div",{style:"display:flex;align-items:flex-start;gap:9px"},
          QuestIcon(dj.id,dj.icon||"🏰",20,"line-height:1.1;min-width:22px;text-align:center"),
          h("div",{style:"flex:1;min-width:0"},
            h("div",{style:"font-size:13px;color:var(--tx);font-weight:700;line-height:1.15"},dj.name),
            dj.desc&&h("div",{style:"font-size:10px;color:var(--td);margin-top:3px;line-height:1.25"},dj.desc),
            h("div",{style:"margin-top:7px"},renderXpPills(dj)),
            h("div",{style:"display:flex;flex-direction:column;gap:3px;margin-top:6px"},
              h("div",{style:detailStyle},"▸ Objectif : compléter tous les objectifs du donjon"),
              h("div",{style:detailStyle},"▸ Délai : "+(dj.days||7)+" jours"),
              h("div",{style:detailStyle},"▸ Cap : —")
            ),
            dj.goals&&dj.goals.length>0&&h("div",{style:"margin-top:8px;border-top:1px solid rgba(255,255,255,0.05);padding-top:7px"},
              h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin-bottom:5px"},"OBJECTIFS"),
              dj.goals.map(g=>h("div",{key:g.id,style:"font-size:10px;color:var(--td);line-height:1.45"},
                "▸ "+g.label+" : "+g.target+" "+unitPlural(g.unit,g.target)
              ))
            )
          )
        )
      );
    }

    function Section({id,title,count,children}){
      const open=!!codexOpen[id];
      return h("div",{class:"card"},
        h("div",{onClick:()=>toggleC(id),style:"cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 "+(open?"12px":"0")+" 0"},
          h("div",null,
            h("div",{class:"ctitle",style:"margin:0"},title),
            h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;margin-top:3px"},count+" entrées")
          ),
          h(ChevronC,{k:id})
        ),
        open&&children
      );
    }

    const required = sortStat(objs.filter(o=>o.daily&&!o.optional).concat(objs.filter(o=>o.weekly&&!o.optional)));
    const bonus = sortStat(objs.filter(o=>o.optional&&!o.bonusHidden));
    const hiddenBonus = sortStat(objs.filter(o=>o.optional&&o.bonusHidden));
    const specialSections = STATS.map(stat=>({stat,list:(SP[stat]||[])})).filter(s=>s.list.length>0);

    return h("div",{class:"tab"},
      h("div",{class:"card"},
        h("div",{class:"ctitle"},"Codex"),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.45"},"Catalogue complet des quêtes existantes. Les objectifs des quêtes quotidiennes et hebdomadaires sont calculés au rang actuel.")
      ),
      h(Section,{id:"obl",title:"Quêtes journalières",count:required.length},required.map(renderQuest)),
      h(Section,{id:"bonus",title:"Quêtes bonus",count:bonus.length+hiddenBonus.length},
        h(Fragment,null,
          bonus.map(renderQuest),
          hiddenBonus.length>0&&h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin:10px 0 8px"},"BONUS MASQUÉS / CONTEXTUELS"),
          hiddenBonus.map(renderQuest)
        )
      ),
      h(Section,{id:"sq",title:"Quêtes urgentes",count:specialSections.reduce((n,s)=>n+s.list.length,0)},
        specialSections.map(section=>h("div",{key:section.stat,style:"margin-bottom:13px"},
          h("div",{style:"font-size:11px;color:"+(STAT_COLOR[section.stat]||"var(--rc)")+";font-family:Orbitron,sans-serif;letter-spacing:1px;text-transform:uppercase;margin:2px 0 7px"},statLabel(section.stat)),
          section.list.map(q=>renderSpecial({...q,stat:q.stat||section.stat}))
        ))
      ),
      h(Section,{id:"ep",title:"Épreuves",count:EPREUVES.length},EPREUVES.map(renderEpreuve)),
      h(Section,{id:"dj",title:"Donjons",count:DONJONS.length},DONJONS.map(renderDonjon))
    );
  }

  // ─── ANIMATION CAP ATTEINT (RÉCUPÉRATION FORCÉE) ─────────────────────

  function CapOverlay(){
    if(!capAnim)return null;
    const {obj,xMult}=capAnim;
    const capColor="#ef4444";
    const capGlow="#ef444466";
    const particles=Array.from({length:40},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*3,
      dur:1.2+Math.random()*2,
      size:2+Math.random()*4,
      violet:Math.random()>0.7
    }));
    return h("div",{class:"ruov",style:"--rc:"+capColor+";--rg:"+capGlow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.violet?"rgba(192,132,252,0.6)":capColor)+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h("div",{class:"ruevol"},"R\u00e9cup\u00e9ration forc\u00e9e"),
        h("div",{style:"font-size:64px;margin-bottom:8px;filter:drop-shadow(0 0 20px "+capColor+")"},"\u26A1"),
        h("div",{style:"font-family:Orbitron,sans-serif;color:"+capColor+";font-size:18px;font-weight:700;letter-spacing:3px;margin-bottom:6px;text-shadow:0 0 14px "+capColor},obj.name.toUpperCase()),
        h("div",{style:"font-family:Orbitron,sans-serif;color:"+capColor+";font-size:12px;letter-spacing:2px;opacity:0.7"},"CAP \u00d7"+xMult+" ATTEINT"),
        h("div",{style:"font-family:Orbitron,sans-serif;color:#c084fc;font-size:16px;font-weight:700;letter-spacing:2px;margin-top:24px;text-shadow:0 0 12px #c084fc"},"+ 200 XP DISCIPLINE"),
        h("button",{class:"rudis",onClick:()=>setCapAnim(null)},"Continuer")
      )
    );
  }

  // ─── RENDU PRINCIPAL ──────────────────────────────────────────────────

  const parts=Array.from({length:15},(_,i)=>({id:i,s:Math.random()*3+1,l:Math.random()*100,dur:Math.random()*10+8,del:Math.random()*10}));

  return h(Fragment,null,
    h("div",{id:"app"},
      h("div",{class:"particles"},parts.map(p=>h("div",{key:p.id,class:"particle",style:"width:"+p.s+"px;height:"+p.s+"px;left:"+p.l+"%;bottom:-10px;background:"+rank.color+";box-shadow:0 0 4px "+rank.glow+";animation-duration:"+p.dur+"s;animation-delay:"+p.del+"s"}))),
      h("div",{class:"hdr-wrap"},
        h("div",{class:"hdr"},
          h("div",{class:"hdr-top",style:"position:relative"},
            h("div",null,h("div",{class:"pname"},"VAL")),
            prestige>0&&h("div",{class:"prestige-badge"},"\u269B\uFE0F Ascension "+ROMAN[prestige-1]),
            h("button",{class:"gbtn",style:"display:flex;align-items:center;justify-content:center",onClick:()=>setShowSet(true)},h("img",{src:"assets/nav/reglages.png",alt:"Réglages",style:"width:40px;height:40px;object-fit:contain;display:block;filter:var(--icon-filter,saturate(1.18)) drop-shadow(0 0 7px var(--rc))"}))
          )
        )
      ),
      h("div",{class:"scroll-area",ref:scrollRef},
        tab==="home"    &&h(Home,null),
        tab==="quests"  &&h(Quests,null),
        tab==="stats"   &&h(Stats,null),
        tab==="history" && History(),
        tab==="codex"   && h(Codex,null),
        floats.map(f=>h("div",{key:f.id,class:"xpfloat",style:"top:"+(f.y||"40%")+(typeof f.y==="number"?"px":"")+";left:50%;transform:translateX(-50%);white-space:pre-line;text-align:center"},f.txt))
      ),
      h("nav",{class:"nav"},
        h("button",{class:"nbtn "+(tab==="home"?"on":""),onClick:()=>switchTab("home")},
          QuestIcon("nav_home","Accueil",28,"vertical-align:middle"),
          h("span",null,"Accueil")
        ),
        h("button",{class:"nbtn "+(tab==="quests"?"on":""),onClick:()=>switchTab("quests")},
          QuestIcon("nav_quests","Quêtes",28,"vertical-align:middle"),
          h("span",null,"Quêtes")
        ),
        h("button",{class:"nbtn "+(tab==="stats"?"on":""),onClick:()=>switchTab("stats")},
          QuestIcon("nav_stats","Stats",28,"vertical-align:middle"),
          h("span",null,"Stats")
        ),
        h("button",{class:"nbtn "+(tab==="history"?"on":""),onClick:()=>switchTab("history")},
          QuestIcon("nav_history","Historique",28,"vertical-align:middle"),
          h("span",null,"Historique")
        ),
        h("button",{class:"nbtn "+(tab==="codex"?"on":""),onClick:()=>switchTab("codex")},
          QuestIcon("nav_codex","Codex",28,"vertical-align:middle"),
          h("span",null,"Codex")
        )
      ),
      h(Settings,null),
      h(RankUp,null),
      h(PrestigeUp,null),
      h(CapOverlay,null),
    )
  );
}

render(h(App,null),document.getElementById("app"));
