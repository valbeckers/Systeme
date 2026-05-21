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

const DEFS = [
  // ─── SANTÉ ────────────────────────────────────────────────────────────
  {id:"water",  name:"Hydratation",     unit:"verre", xpPer:10,  daily:true, weekly:false,optional:false,stat:"Sante",         icon:"\uD83D\uDCA7",               base:10, baseHistory:[{until:"2026-04-29",base:8}]},
  {id:"sleep",  name:"8h de sommeil",   unit:"nuit",  xpPer:0,   daily:true, weekly:false,optional:false,stat:"Sante",         icon:"\uD83D\uDECF\uFE0F",         base:1,  binary:true, binaryXp:200},
  {id:"adult",name:"",unit:"jour",xpPer:0,daily:true,weekly:false,optional:false,stat:"Discipline",icon:"🔞",base:1,binary:true,binaryXp:200,penaltyAll:true,startDate:"2026-05-21"},
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
  {id:"run",    name:"Course",          unit:"km",    xpPer:100, daily:false,weekly:true, optional:false,stat:"Endurance",      icon:"\uD83C\uDFC3\uD83C\uDFFB",   base:7,  stat2:"Agilite", xpPer2:20, cap:3},
  {id:"walk",   name:"Marche",          unit:"km",    xpPer:50,  daily:false,weekly:false,optional:true, stat:"Endurance",      icon:"\uD83D\uDEB6\uD83C\uDFFB\u200D\u2642\uFE0F", base:5, fixedBase:true, bonusHidden:true},
  // ─── AGILITÉ ──────────────────────────────────────────────────────────
  {id:"flex",   name:"Souplesse",       unit:"min",   xpPer:50,  daily:true, weekly:false,optional:true, stat:"Agilite",        icon:"\uD83E\uDD38\uD83C\uDFFB",   base:15, fixedBase:true, cap:2},
  {id:"balance",name:"\u00c9quilibre sur un pied",unit:"min",xpPer:10,daily:true,weekly:false,optional:false,stat:"Agilite",    icon:"\uD83E\uDDB6\uD83C\uDFFB",   base:5, startDate:"2026-05-15", cap:3},
  // ─── DISCIPLINE ───────────────────────────────────────────────────────
  {id:"mindmeal",name:"Manger sans stimulation",unit:"jour",xpPer:0,daily:true,weekly:false,optional:true,stat:"Sante",icon:"📵",base:1,binary:true,binaryXp:250,startDate:"2026-05-21"},
];

// Quetes speciales — par stat (25 au total)
const SP = {
  Sante:[
    {id:"sp_sun",     name:"10min de lumi\u00e8re naturelle", icon:"\u2600\uFE0F",                              unit:"min",  target:10,  xp:250, days:1, binary:true, desc:"10 min de lumi\u00e8re naturelle"},
    {id:"sp_fruits",  name:"Manger 5 fruits & l\u00e9gumes",  icon:"\uD83C\uDF4F",                              unit:"f/l",  target:5,   xp:250, days:1, binary:true, desc:"Manger 5 fruits et l\u00e9gumes"},
    {id:"sp_breath",  name:"10min de coh\u00e9rence cardiaque",icon:"\uD83D\uDC93",                             unit:"jour", target:1,   xp:250, days:1, binary:true, desc:"10 min de respiration contr\u00f4l\u00e9e"},
    {id:"sp_nojunk",  name:"Pas de junk-food",                icon:"\uD83C\uDF55",                              unit:"jour", target:1,   xp:250, days:1, binary:true, desc:"Z\u00e9ro junk-food"},
    {id:"sp_fasting", name:"Je\u00fbne 24h",                  icon:"\u23F3",                                    unit:"jour", target:1,   xp:500, days:1, binary:true, desc:"Je\u00fbne 24h complet"},
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
    {id:"sp_learning", name:"1h d\'apprentissage actif",  icon:"\uD83C\uDF93",                                  unit:"jour",     target:1,  xp:300, xp2:100, stat2:"Concentration", xp3:100, stat3:"Discipline", days:1, binary:true, desc:"1h d\'apprentissage actif"},
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
    {id:"sp_flow20",  name:"20min d\'animal flow", icon:"\uD83D\uDC0A",                                         unit:"min",  target:20, xp:750, days:1, tiers:[{at:10,xp:250,stat:"Agilite"},{at:20,xp:500,stat:"Agilite"}], desc:"20 min d\'animal flow (palier \u00e0 10min)"},
    {id:"sp_flex30",  name:"30min de souplesse",  icon:"\uD83E\uDD38\uD83C\uDFFB",                             unit:"jour", target:1,  xp:1000, days:1, binary:true, desc:"30 min de souplesse"},
    {id:"sp_fluide",  name:"15min de flow martial", icon:"\uD83C\uDF0A",                              unit:"min",  target:15, xp:375, days:1, desc:"Capoeira flow / mouvement continu sans rupture"},
    {id:"sp_silent",  name:"10min de d\u00e9placements silencieux", icon:"\uD83D\uDC08",                          unit:"min",  target:10, xp:300, days:1, desc:"Marcher sans bruit (escaliers, pi\u00e8ces)"},
    {id:"sp_balance_eyes", name:"10min d'\u00e9quilibre yeux ferm\u00e9s", icon:"\uD83E\uDDB6\uD83C\uDFFB",          unit:"min",  target:10, xp:200, xp2:50, stat2:"Concentration", days:1, desc:"\u00c9quilibre sur un pied yeux ferm\u00e9s"},
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
  {id:"ep_150pull",  name:"150 tractions",                      icon:"\u270A\uD83C\uDFFB",                       stat:"Force",        xp:3000, days:7, unit:"rep", target:150,
    desc:"Atteindre 150 tractions en 7 jours"},
  {id:"ep_wallsit60",name:"35min de chaise",                    icon:"\uD83E\uDE91",                             stat:"Force",        xp:1500, xp2:500, stat2:"Endurance", days:7, unit:"min", target:35, dailyTrack:true, dailyTrackMin:5,
    desc:"35 minutes cumul\u00e9es de chaise sur la semaine"},
  {id:"ep_book",     name:"Lire un livre complet (300+ pages)", icon:"\uD83D\uDCDA",                             stat:"Intelligence", xp:2000, xp2:1000, stat2:"Concentration", days:7, binary:true,
    desc:"Terminer un livre de 300 pages ou plus"},
  {id:"ep_project",  name:"4h de travail sur un projet personnel",icon:"\uD83E\uDDE0",                           stat:"Intelligence", xp:1000,  xp2:1000, stat2:"Concentration", xp3:1000, stat3:"Discipline", days:7, unit:"min", target:240,
    desc:"4 heures de travail sur un projet personnel"},
  {id:"ep_medweek",  name:"M\u00e9ditation quotidienne",        icon:"\uD83E\uDDD8\uD83C\uDFFB\u200D\u2642\uFE0F",stat:"Concentration",xp:2500, days:7, streak7:true, streakDays:7, unit:"jour", target:7,
    desc:"M\u00e9diter chaque jour pendant 7 jours"},
  {id:"ep_deepwork5",name:"Deep Work 60min",                    icon:"\u26AB",                                   stat:"Concentration",xp:2000, xp2:1000, stat2:"Discipline", days:7, cumDays:true, streakDays:5, unit:"jour", target:5,
    desc:"60 min de deep work 5 jours de suite"},
  {id:"ep_hike",     name:"Randonn\u00e9e longue (5h+)",        icon:"\u26F0\uFE0F",                             stat:"Endurance",    xp:2000, days:7, binary:true,
    desc:"Randonn\u00e9e de 5 heures minimum"},
  {id:"ep_10km",     name:"Courir un 10km non-stop",            icon:"\uD83C\uDFC3\uD83C\uDFFB\u200D\u27A1\uFE0F",stat:"Endurance",   xp:2500, xp2:500, stat2:"Agilite", days:7, binary:true,
    desc:"Courir 10km non-stop"},
  {id:"ep_burpees",  name:"100 burpees",                        icon:"\uD83D\uDD25",                             stat:"Endurance",    xp:2000, xp2:1000, stat2:"Agilite", days:7, unit:"rep", target:100,
    desc:"100 burpees cumul\u00e9s"},
  {id:"ep_wakeup",   name:"R\u00e9veil \u00e0 la m\u00eame heure",icon:"\uD83C\uDF05",                           stat:"Discipline",   xp:2000, xp2:1000, stat2:"Sante", days:7, streak7:true, streakDays:7, unit:"jour", target:7,
    desc:"Se lever \u00e0 la m\u00eame heure 7 jours de suite"},
  {id:"ep_coldweek", name:"Douche froide 10min quotidienne",    icon:"\u2744\uFE0F",                             stat:"Discipline",   xp:2000, xp2:1000, stat2:"Sante", days:7, streak7:true, streakDays:7, unit:"jour", target:7,
    desc:"10 min de douche froide chaque jour pendant 7 jours"},
  {id:"ep_noscroll", name:"Pas de doomscrolling",               icon:"\uD83D\uDCF5",                             stat:"Intelligence", xp:2500, days:7, streak7:true, streakDays:7, unit:"jour", target:7,
    desc:"Z\u00e9ro scroll passif pendant 7 jours"},
  {id:"ep_nojunkwk", name:"Pas de junk-food",                   icon:"\uD83C\uDF55",                             stat:"Sante",        xp:2000, xp2:1000, stat2:"Discipline", days:7, streak7:true, streakDays:7, unit:"jour", target:7,
    desc:"Z\u00e9ro junk-food pendant 7 jours"},
  {id:"ep_clean",    name:"Nettoyage total d'une pi\u00e8ce",   icon:"\uD83E\uDDF9",                             stat:"Discipline",   xp:1500, days:7, binary:true,
    desc:"Nettoyer compl\u00e8tement une pi\u00e8ce"},
  {id:"ep_mob",      name:"Mobilit\u00e9 matinale",             icon:"\uD83E\uDD38\uD83C\uDFFB\u200D\u2642\uFE0F",stat:"Agilite",     xp:2500, days:7, cumDays:true, streakDays:5, unit:"jour", target:5,
    desc:"Faire 15 min de mobilit\u00e9 5 jours sur 7"},
  {id:"ep_taichi",   name:"Tai Chi quotidien",                  icon:"\u262F\uFE0F",                             stat:"Agilite",      xp:2000, xp2:1000, stat2:"Concentration", days:7, cumDays:true, streakDays:5, dailyMin:20, unit:"jour", target:5,
    desc:"Faire 20 min de Tai Chi 5 jours sur 7"},
];

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

function pickRandomSq(usedIds,restMode,statCycle){
  const stats=["Sante","Force","Intelligence","Concentration","Endurance","Agilite","Discipline"];
  // Stats encore disponibles dans le cycle actuel
  const cycle = statCycle||[];
  const remaining = stats.filter(s=>!cycle.includes(s));
  // Si toutes passées, on redémarre le cycle
  const pool = remaining.length===0 ? stats : remaining;
  // Filtrer pour ne garder que les stats qui ont au moins une quête disponible
  const usable = pool.filter(s=>(SP[s]||[]).some(t=>!usedIds.includes(t.id)&&!(t.noRestMode&&restMode)));
  if(usable.length===0){
    // Fallback : aucune quête dispo dans les stats restantes du cycle → on essaie toutes les stats
    for(const s of stats){
      const a=(SP[s]||[]).filter(t=>!usedIds.includes(t.id)&&!(t.noRestMode&&restMode));
      if(a.length>0)return {tpl:{...a[Math.floor(Math.random()*a.length)],stat:s}, pickedStat:s, cycleReset:remaining.length===0};
    }
    return null;
  }
  const stat = usable[Math.floor(Math.random()*usable.length)];
  const avail=(SP[stat]||[]).filter(t=>!usedIds.includes(t.id)&&!(t.noRestMode&&restMode));
  return {tpl:{...avail[Math.floor(Math.random()*avail.length)],stat}, pickedStat:stat, cycleReset:remaining.length===0};
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
      const result=pickRandomSq(sqs.map(q=>q.id),base.restMode,base.sqStatCycle);
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
  const [codexOpen,setCodexOpen] = useState({obl:false,bonus:false,sq:false,ep:false});
  const [prestigeUp,setPrestigeUp] = useState(null);
  const [showStatReqDetail,setShowStatReqDetail] = useState(false);
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
        const p=obj.penaltyXp;
        const baseStat=obj.stat;
        const rangeMult=1; // pas de mult sur p\u00e9nalit\u00e9
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
      const result = pickRandomEpreuve(completedIds, cd, s.epStatCycle);
      if(!result) return s;
      const {tpl,pickedStat,cycleReset}=result;
      const t = Date.now();
      const ep={...tpl,epid:"ep_"+t,progress:0,startedAt:t,startedAtDay:today,expiresAt:nextMondayAt7(t),completedAt:null,failedAt:null,dailyValidations:[]};
      const newCycle = cycleReset ? [pickedStat] : [...(s.epStatCycle||[]),pickedStat];
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
        // Quêtes obligatoires : 0 XP si objectif non atteint
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
        h("div",{class:"qhdr",style:"display:flex;justify-content:space-between;align-items:center"},
          h("div",{class:"qname"},h("span",null,obj.icon),obj.name?" ":"",obj.name),
          h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:0.5px"},
            obj.binaryXp+" XP · "+(STAT_LBL[obj.stat]||obj.stat)
          )
        ),
        obj.penaltyAll
          ? h("div",{style:"display:flex;gap:8px;margin-top:8px"},
              h("button",{
                onClick:e=>setBinary(1,e),
                style:"flex:1;padding:10px;border-radius:8px;border:1px solid "+(validated&&done?"var(--rc)":"rgba(255,255,255,0.08)")+";background:"+(validated&&done?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.02)")+";color:"+(validated&&done?"#4ade80":"rgba(255,255,255,0.7)")+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s;white-space:nowrap;overflow:hidden"
              }, validated&&done ? "Succès ✓" : "Succès")
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
      h("div",{class:"qhdr",style:"display:flex;justify-content:space-between;align-items:center;gap:8px"},
        h("div",{class:"qname",style:"flex:1;min-width:0;display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"},
          h("span",{style:isCapped?"filter:grayscale(60%);opacity:0.7;flex-shrink:0":"flex-shrink:0"},obj.icon),
          h("span",{style:"overflow:hidden;text-overflow:ellipsis"},obj.name),
          hasCap&&!isCapped&&h("span",{style:"font-size:9px;font-family:Orbitron,sans-serif;letter-spacing:0.5px;padding:2px 6px;border-radius:4px;color:"+capColor+";border:1px solid "+capColor+"44;flex-shrink:0"},(obj.capValue?("CAP "+obj.capValue+" "+obj.unit):("CAP \u00d7"+obj.cap))),
          isDebt&&!done&&h("span",{style:"font-size:9px;color:#ef4444;font-family:Orbitron,sans-serif;border:1px solid #ef444455;border-radius:4px;padding:1px 5px;flex-shrink:0"},"\u26A0 DETTE "+debtLabel)
        ),
        h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:0.5px;text-align:right;white-space:nowrap;flex-shrink:0;line-height:1.5"},
          obj.tiers
            ?h(Fragment,null,
                ...obj.tiers.map((tier,i)=>{
                  const parts = [];
                  parts.push(tier.xp+" XP \u00b7 "+(STAT_LBL[tier.stat]||tier.stat));
                  if(tier.xp2 && tier.stat2) parts.push(tier.xp2+" XP \u00b7 "+(STAT_LBL[tier.stat2]||tier.stat2));
                  return h("div",{key:i,style:"opacity:"+(d>=tier.at?"1":"0.6")},(d>=tier.at?"\u2713 ":"")+parts.join(" + "));
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
            h("div",{class:"qxp",style:isCapped?"color:"+capColor:isDebt&&!done?"color:#ef4444":""},(d%1===0?d:d.toFixed(2))+"/"+displayTarget+" "+((d>1||displayTarget>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres"}[obj.unit]||obj.unit))
          )
      ),
      isNearCap&&h("div",{style:"font-size:9px;color:"+capColor+";font-family:Orbitron,sans-serif;text-align:center;margin-top:6px;letter-spacing:0.5px;opacity:0.85"},"\u26A0 Cap dans "+remainingToCap+" "+obj.unit+(remainingToCap>1?"s":"")+" \u00b7 r\u00e9cup\u00e9ration forc\u00e9e"),
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
    const pct=Math.min(100,(d/t)*100), done=d>=t, over=d>t;
    const validated=isW?(wLog[obj.id]!==undefined):(tLog[obj.id]!==undefined);
    if(obj.binary){
      return h("div",{style:"display:flex;align-items:center;gap:10px;margin-bottom:8px"},
        h("span",{style:"font-size:16px"},obj.icon),
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
      h("span",{style:"font-size:16px"+(isCapped?";filter:grayscale(60%);opacity:0.7":"")},obj.icon),
      h("div",{style:"flex:1"},
        h("div",{style:"font-size:12px;color:var(--tx);margin-bottom:3px;display:flex;justify-content:space-between;align-items:center"},
          h("div",{style:"display:flex;align-items:center;gap:6px"},
            h("span",null,obj.name),
            hasCap&&h("span",{style:"font-size:8px;font-family:Orbitron,sans-serif;letter-spacing:0.5px;padding:1px 5px;border-radius:3px;"+(isCapped?"background:"+capColor+"22;color:"+capColor+";border:1px solid "+capColor:"color:"+capColor+";border:1px solid "+capColor+"44")},isCapped?"CAP":(obj.capValue?("CAP "+obj.capValue+" "+obj.unit):("CAP \u00d7"+obj.cap)))
          ),
          h("div",{style:"display:flex;align-items:center;gap:6px"},
            h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:"+(isCapped?capColor:d>=t?"var(--rc)":d>0?"var(--tx)":"var(--td)")},(d%1===0?d:d.toFixed(2))+"/"+t+" "+((d>1||t>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres"}[obj.unit]||obj.unit)),
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
        setFloats(f=>[...f,{id:id1,y:"28%",txt:"\uD83C\uDFC6 \u00c9PREUVE VALID\u00c9E !"},{id:id2,y:"34%",txt:"+"+totalXp+" XP total"}]);
        setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id1&&p.id!==id2)),2000);
      },200);
    }

    const isActive = !done && !failed;
    return h("div",{class:"sqcard"+(isActive?" ep-pulse":""),style:"border-color:"+tierColor+"44;background:"+tierColor+"08;--epc1:"+tierColor+"44;--epc2:"+tierColor+"00"},
      h("div",{style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"},
        h("div",{style:"display:flex;align-items:center;gap:8px"},
          h("span",{style:"font-size:20px"},ep.icon),
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
          h("span",{style:"font-size:18px"},sq.icon),
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
      {lb:"Qu\u00eates obligatoires",ob:obligObjs,iw:false,mixed:true},
      {lb:"Qu\u00eates bonus", ob:sortStat(objs.filter(o=>(o.daily&&o.optional||o.id==="walk")&&!(restMode&&o.id==="walk")&&!o.bonusHidden)), iw:false},
    ];
    return h("div",{class:"tab"},
      missedDays>=2&&h("div",{class:"warn"},"\u26A0\uFE0F P\u00e9nalit\u00e9 : -"+(missedDays*10)+" XP ("+missedDays+" jours manqu\u00e9s)"),

      h("div",{class:"card"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"},
          h("div",{style:"display:flex;align-items:center;gap:10px"},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:36px;font-weight:900;color:var(--rc);text-shadow:0 0 12px var(--rg),0 0 30px var(--rg);line-height:1"},rank.id),
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
        // Condition de stats pour le prochain palier (rang ou ascension)
        (()=>{
          let label, count, threshold, target, ok;
          if(nextRank && nextRankReq){
            target = nextRank.id;
            count = nextRankReq.count;
            threshold = nextRankReq.level;
            ok = nextRankStatsOk;
            label = "Rang "+target;
          } else if(!nextRank && ascReq && prestige<MAX_PRESTIGE){
            target = "Ascension "+nextAscension;
            count = ascReq.count;
            threshold = ascReq.level;
            ok = ascStatsOk;
            label = target;
          } else {
            return null;
          }
          const reached = countStatsAtLevel(state.stats, threshold);
          const summaryColor = ok ? "#4ade80" : (rankBlocked || prestigeBlocked) ? "#fb923c" : "var(--td)";
          return h("div",{
            onClick:()=>setShowStatReqDetail(v=>!v),
            style:"margin-top:10px;padding:8px 10px;background:rgba(255,255,255,0.02);border:1px solid "+(ok?"#4ade8033":(rankBlocked||prestigeBlocked)?"#fb923c44":"rgba(255,255,255,0.06)")+";border-radius:8px;cursor:pointer;user-select:none"
          },
            h("div",{style:"display:flex;justify-content:space-between;align-items:center;font-size:10px;font-family:Orbitron,sans-serif;letter-spacing:1px"},
              h("span",{style:"color:var(--td);text-transform:uppercase"},"Condition "+label),
              h("span",{style:"color:"+summaryColor},(ok?"\u2713 ":"")+reached+"/"+count+" stats niv. "+threshold+" "+(showStatReqDetail?"\u25B2":"\u25BC"))
            ),
            showStatReqDetail && h("div",{style:"margin-top:8px;display:grid;grid-template-columns:repeat(2,1fr);gap:4px"},
              STATS.map(s=>{
                const lvl = state.stats[s]||0;
                const reached = lvl>=threshold;
                return h("div",{key:s,style:"display:flex;justify-content:space-between;align-items:center;font-size:10px;padding:3px 6px;background:rgba(255,255,255,0.02);border-radius:4px;border:1px solid "+(reached?"#4ade8033":"rgba(255,255,255,0.04)")},
                  h("span",{style:"color:"+(STAT_COLOR[s]||"#fff")},STAT_LBL[s]||s),
                  h("span",{style:"font-family:Orbitron,sans-serif;color:"+(reached?"#4ade80":"var(--td)")},(reached?"\u2713 ":"")+"niv. "+lvl)
                );
              })
            )
          );
        })(),
        prestigeAvailable&&h("button",{
          onClick:()=>{
            const newPrestige=(state.prestige||0)+1;
            setState(s=>({...s,streak:0,streakBonusDay:null,weeklyBonusWk:null,streakMilestones:[],penaltyDay:null,dailyLog:{},weeklyLog:{},specialQuests:[],sqStatCycle:[],epStatCycle:[],sqCooldownUntil:null,prestige:newPrestige}));
            setPrestigeUp(newPrestige);
          },
          style:"width:100%;margin-top:12px;padding:12px;background:rgba(168,85,247,0.1);border:1px solid #a855f7;border-radius:10px;color:#a855f7;font-family:Orbitron,sans-serif;font-size:12px;letter-spacing:3px;cursor:pointer;text-transform:uppercase;text-shadow:0 0 12px #a855f7"
        },"\u269B\uFE0F Mont\u00e9e en Ascension"),
        h("div",{style:"display:grid;grid-template-columns:1fr 1px 1fr;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)"},
          h("div",{style:"text-align:center"},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:16px;font-weight:700;color:var(--rc)"},"\uD83D\uDD25 "+state.streak),
            h("div",{style:"font-size:10px;color:var(--td);text-transform:uppercase;letter-spacing:1px;margin-top:2px"},"Streak"),
            bonusGiven&&h("div",{style:"font-size:10px;color:#c084fc;font-family:Orbitron,sans-serif;margin-top:3px"},"+250 XP quotidien \u2713")
          ),
          h("div",{style:"width:1px;height:32px;background:rgba(255,255,255,0.06)"}),
          h("div",{style:"text-align:center"},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:16px;font-weight:700;color:var(--rc)"},todayXp.toFixed(0)),
            h("div",{style:"font-size:10px;color:var(--td);text-transform:uppercase;letter-spacing:1px;margin-top:2px"},"XP du jour")
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
    const req=sortStat(objs.filter(o=>o.daily&&!o.optional));
    const bon=sortStat(objs.filter(o=>(o.daily&&o.optional||o.id==="walk")&&!(restMode&&o.id==="walk")&&!o.bonusHidden));
    const wkq=restMode&&walkObj
      ? [...sortStat(objs.filter(o=>o.weekly)), walkObj]
      : sortStat(objs.filter(o=>o.weekly));
    return h("div",{class:"tab"},
      // ── ÉPREUVE ────────────────────────────────────────────────────────
      h("div",{class:"card",style:"border-color:#f59e0b44"},
        h("div",{class:"ctitle",style:"color:#f59e0b;margin-bottom:8px"},"\u00c9preuve"),
        activeEp
          ? h(EpCard,{ep:activeEp})
          : completedEp
            ? h("div",{class:"sqcard"},
                h("div",{style:"display:flex;align-items:center;gap:10px"},
                  h("span",{style:"font-size:20px"},completedEp.icon),
                  h("div",{style:"flex:1"},
                    h("div",{style:"font-size:13px;font-weight:700;color:#4ade80"},completedEp.name+" \u2014 COMPL\u00c9T\u00c9 \u2705"),
                    h("div",{style:"font-size:11px;color:var(--td);margin-top:2px"},
                      ("+"+completedEp.xp+" XP \u00b7 "+(STAT_LBL[completedEp.stat]||completedEp.stat))
                      +(completedEp.xp2&&completedEp.stat2?(" \u00b7 +"+completedEp.xp2+" XP "+(STAT_LBL[completedEp.stat2]||completedEp.stat2)):"")
                      +(completedEp.xp3&&completedEp.stat3?(" \u00b7 +"+completedEp.xp3+" XP "+(STAT_LBL[completedEp.stat3]||completedEp.stat3)):"")
                    )
                  )
                ),
                cooldownActive&&h("div",{style:"font-size:11px;color:var(--td);text-align:center;padding:8px 0 4px;font-family:Orbitron,sans-serif"},"\u23F3 Prochain d\u00e9fi dans "+fmtCD(cooldownUntil-now))
              )
            : cooldownActive
              ? h("div",{style:"font-size:11px;color:var(--td);text-align:center;padding:8px 0;font-family:Orbitron,sans-serif"},
                  "\u23F3 Prochain d\u00e9fi dans "+fmtCD(cooldownUntil-now))
              : h("div",{style:"font-size:12px;color:#f59e0b;text-align:center;padding:8px 0"},
                  "\uD83D\uDD0D Le syst\u00e8me d\u00e9tecte une nouvelle \u00e9preuve...")
      ),
      h("div",{class:"card",style:"border-color:#ef444444"},
        h("div",{class:"shdr"},
          h("div",null,
            h("div",{class:"ctitle",style:"margin:0;color:#ef4444"},"Qu\u00eate urgente"+(activeSq&&activeSq.tier?" \u00b7 "+(SQ_TIER_LABEL[activeSq.tier]||""):"")),
            
          )
        ),
        activeSq
          ? h(SqCard,{sq:activeSq,showInput:true})
          : completedSq && h("div",{class:"sqcard"},
          h("div",{style:"display:flex;align-items:center;gap:10px"},
            h("span",{style:"font-size:20px"},completedSq.icon),
            h("div",{style:"flex:1"},
              h("div",{style:"font-size:13px;font-weight:700;color:#4ade80"},completedSq.name+" \u2014 COMPL\u00c9T\u00c9 \u2705"),
              h("div",{style:"font-size:11px;color:var(--td);margin-top:2px"},"+"+completedSq.xp+" XP \u00b7 "+(STAT_LBL[completedSq.stat]||completedSq.stat))
            )
          ),
          sqCooldownActive&&h("div",{style:"font-size:11px;color:var(--td);text-align:center;padding:8px 0 4px;font-family:Orbitron,sans-serif"},"\u23F3 Prochaine qu\u00eate dans "+fmtCD(sqCooldownUntil-now))
        ),
        !activeSq&&!completedSq&&(sqCooldownActive
          ? h("div",{class:"card"},
              h("div",{class:"ctitle",style:"color:#ef4444;margin-bottom:8px"},"Qu\u00eate urgente"),
              h("div",{style:"font-size:11px;color:var(--td);text-align:center;padding:4px 0;font-family:Orbitron,sans-serif"},"\u23F3 Prochaine qu\u00eate dans "+fmtCD(sqCooldownUntil-now))
            )
          : h("div",{style:"font-size:12px;color:var(--td);text-align:center;padding:8px 0"},"Chargement du d\u00e9fi...")
        )
      ),
      h("div",{class:"card"},
        h("div",{class:"shdr"},h("div",{class:"ctitle",style:"margin:0"},"Qu\u00eates obligatoires")),
        req.map(o=>h(QI,{key:o.id,obj:o})),
        // Carte dette sommeil : méditation 30min obligatoire, sans XP
        sleepDebtMed>0&&(()=>{
          const medDone = tLog["med"]||0;
          const done = medDone >= sleepDebtMed;
          const pct = Math.min(100,(medDone/sleepDebtMed)*100);
          return h("div",{class:"qi"+(done?" done":""),style:done?"":"border-color:#ef444466;background:rgba(239,68,68,0.04)"},
            h("div",{class:"qhdr",style:"display:flex;justify-content:space-between;align-items:center"},
              h("div",{class:"qname"},
                h("span",null,"\uD83E\uDDD8\uD83C\uDFFB\u200D\u2642\uFE0F")," M\u00e9ditation",
                !done&&h("span",{style:"font-size:9px;color:#ef4444;font-family:Orbitron,sans-serif;border:1px solid #ef444455;border-radius:4px;padding:1px 5px;margin-left:6px"},"\u26A0 DETTE \uD83D\uDECF\uFE0F")
              ),
              h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:0.5px"},"0 XP \u00b7 obligatoire")
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
        })(),
        wkq.length>0&&h(Fragment,null,
          h("div",{style:"height:1px;background:rgba(255,255,255,0.06);margin:12px 0"}),
          wkq.map(o=>h(QI,{key:o.id,obj:o}))
        )
      ),
      bon.length>0&&h("div",{class:"card"},h("div",{class:"ctitle"},"Qu\u00eates bonus"),bon.map(o=>h(QI,{key:o.id,obj:o})))
    );
  }

  // ─── ONGLET STATS ─────────────────────────────────────────────────────

  function Stats(){
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
        h("div",{class:"ctitle"},"\uD83D\uDCCA Activit\u00e9 de la semaine"),
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
              h("span",{style:"font-size:18px"},obj.icon),
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
          const val=tots[obj.id]||0, wt=obj.weekly?(obj.id==="walk"&&restMode&&walkObj?walkObj.base:getRankBase(obj.id,ri)):obj.id==="walk"?obj.base:getRankBase(obj.id,ri,prestige)*7;
          const pct=Math.min(100,(val/wt)*100), complete=val>=wt, over=val>wt;
          return h("div",{key:obj.id,style:"display:flex;align-items:center;gap:10px;margin-bottom:10px"},
            h("span",{style:"font-size:18px"},obj.icon),
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
                  (val%1===0?val:val.toFixed(2))+"/"+wt+" "+((val>1||wt>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres"}[obj.unit]||obj.unit))
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
          h("div",{class:"ctitle",style:"margin:0"},"\uD83C\uDFC6 Records personnels"),
          h(ChevronBtn,{k:"records"})
        ),
        open.records&&h(Fragment,null,
          h("div",{style:"margin-top:12px"}),
          [...sortStat(objs.filter(o=>o.daily&&!o.optional&&!o.binary)),...(restMode&&walkObj?[...sortStat(objs.filter(o=>o.weekly&&!o.binary)),walkObj]:sortStat(objs.filter(o=>o.weekly&&!o.binary))),...sortStat(objs.filter(o=>o.daily&&o.optional&&!o.binary&&!o.bonusHidden))].map(o=>{
          const rec=records[o.id];
          if(!rec)return h("div",{key:o.id,style:"display:flex;align-items:center;gap:10px;margin-bottom:8px;opacity:.35"},
            h("span",{style:"font-size:16px"},o.icon),
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
            h("span",{style:"font-size:16px"},o.icon),
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
              (rec.val%1===0?rec.val:rec.val.toFixed(2))+" "+((rec.val>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres"}[o.unit]||o.unit))
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
            h("div",{class:"ctitle",style:"margin:0"},"\uD83E\uDDEE Totaux depuis le d\u00e9but"+(firstDay?" \u2014 "+fmtFirst(firstDay):"")),
            h(ChevronBtn,{k:"totals"})
          ),
          open.totals&&h(Fragment,null,
            h("div",{style:"margin-top:12px"}),
            displayObjs.map(o=>{
              const total=totals[o.id]||0;
              const unitLbl=total>1?({rep:"reps",page:"pages",verre:"verres",km:"km",min:"min"}[o.unit]||o.unit):o.unit;
              return h("div",{key:o.id,style:"display:flex;align-items:center;gap:10px;margin-bottom:8px"+(total===0?";opacity:.35":"")},
                h("span",{style:"font-size:16px"},o.icon),
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
          h("div",{class:"mtitle",style:"margin-bottom:0"},"\u2699 R\u00e9glages"),
          h("button",{style:"background:none;border:none;color:var(--td);font-size:44px;line-height:1;cursor:pointer",onClick:()=>{setShowSet(false);setConfirmReset(false);}},"\u2715")
        ),
        h("div",{class:"msec"},
          h("div",{class:"mlbl"},"\uD83E\uDE79 Mode blessure \u2014 Course"),
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
              }},"\uD83E\uDE79 Blessure \u2014 activer la marche")
            : h("button",{class:"mbtn",style:"width:100%;background:#4ade8011;border:1px solid #4ade8066;color:#4ade80",onClick:()=>{
                walkTargetRef.current=0;
                setState(s=>({...s,restMode:false,walkTarget:0}));
                setShowSet(false);
              }},"\u2705 R\u00e9tablissement \u2014 reprendre la course")
        ),
        h("div",{class:"divider"}),
        h("div",{class:"msec"},
          h("div",{class:"mlbl"},"\uD83D\uDCDD Corriger les donn\u00e9es du jour"),
          ordered.map(obj=>{
            const cur=(obj.weekly||obj.id==="walk")?(wLog[obj.id]||0):(tLog[obj.id]||0);
            return h("div",{key:obj.id,style:"display:flex;align-items:center;gap:10px;margin-bottom:8px"},
              h("span",{style:"font-size:16px;min-width:24px"},obj.icon),
              h("span",{style:"flex:1;font-size:13px"},obj.name),
              h("input",{id:"cd_"+obj.id,class:"min",type:"text",inputMode:"decimal",defaultValue:String(cur),style:"width:80px;margin:0;text-align:center"}),
              h("span",{style:"font-size:11px;color:var(--td);min-width:28px"},obj.unit)
            );
          }),
          h("button",{class:"mbtn mprim",style:"width:100%;margin-top:8px",onClick:applyEdit},"\u2705 Appliquer")
        ),
        h("div",{class:"divider"}),
        h("div",{class:"msec"},
          h("div",{class:"mlbl"},"\uD83D\uDCBE Sauvegarde / Restauration"),
          h("div",{class:"mrow",style:"margin-bottom:8px"},
            h("button",{class:"mbtn mprim",style:"flex:1",onClick:()=>{
              const json=JSON.stringify(state);
              navigator.clipboard.writeText(json).then(()=>alert("\u2705 Donn\u00e9es copi\u00e9es !")).catch(()=>window.prompt("Copie ce texte :",json));
            }},"\uD83D\uDCCB Exporter"),
            h("button",{class:"mbtn mprim",style:"flex:1",onClick:()=>{
              const json=window.prompt("Colle tes donn\u00e9es ici :");
              if(!json)return;
              try{const imported=JSON.parse(json);setState(s=>({...s,...imported,objectives:DEFS}));alert("\u2705 Restaur\u00e9 !");setShowSet(false);}catch{alert("\u274C Donn\u00e9es invalides.");}
            }},"\uD83D\uDCE5 Importer")
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
          }},"\uD83D\uDCBE T\u00e9l\u00e9charger fichier"),
          h("div",{style:"font-size:10px;color:var(--td);margin-top:6px;line-height:1.4"},
            "L'app conserve automatiquement 4 sauvegardes internes (rotation \u00e0 chaque modification). En cas de probl\u00e8me, fais un t\u00e9l\u00e9chargement r\u00e9gulier."
          )
        ),
        h("div",{class:"divider"}),
        h("div",{class:"msec"},
          h("div",{class:"mlbl"},"\uD83D\uDD01 Actualiser l'application"),
          h("div",{style:"font-size:11px;color:var(--td);margin-bottom:10px;line-height:1.5"},"Si l'app ne se charge pas correctement, actualise pour recharger tous les scripts."),
          h("button",{class:"mbtn",style:"width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.2);color:var(--tx)",onClick:()=>window.location.reload(true)},"\uD83D\uDD01 Actualiser l'app")
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
    const toggleC = k => setCodexOpen(o=>({obl:false,bonus:false,sq:false,ep:false,[k]:!o[k]}));
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
          h("span",{style:"font-size:18px;line-height:1.1"},obj.icon||"•"),
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
          h("span",{style:"font-size:18px;line-height:1.1"},q.icon||"🚨"),
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
          h("span",{style:"font-size:18px;line-height:1.1"},ep.icon||"⚔️"),
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
      h(Section,{id:"obl",title:"⚔️ Quêtes obligatoires",count:required.length},required.map(renderQuest)),
      h(Section,{id:"bonus",title:"🎁 Quêtes bonus",count:bonus.length+hiddenBonus.length},
        h(Fragment,null,
          bonus.map(renderQuest),
          hiddenBonus.length>0&&h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin:10px 0 8px"},"BONUS MASQUÉS / CONTEXTUELS"),
          hiddenBonus.map(renderQuest)
        )
      ),
      h(Section,{id:"sq",title:"🚨 Quêtes urgentes",count:specialSections.reduce((n,s)=>n+s.list.length,0)},
        specialSections.map(section=>h("div",{key:section.stat,style:"margin-bottom:13px"},
          h("div",{style:"font-size:11px;color:"+(STAT_COLOR[section.stat]||"var(--rc)")+";font-family:Orbitron,sans-serif;letter-spacing:1px;text-transform:uppercase;margin:2px 0 7px"},statLabel(section.stat)),
          section.list.map(q=>renderSpecial({...q,stat:q.stat||section.stat}))
        ))
      ),
      h(Section,{id:"ep",title:"🏆 Épreuves",count:EPREUVES.length},EPREUVES.map(renderEpreuve))
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
            h("button",{class:"gbtn",onClick:()=>setShowSet(true)},"\u2699")
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
            h("img",{src:"data:image/png;base64,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",style:"height:24px;width:auto;object-fit:contain;mix-blend-mode:screen;filter:"+(tab==="home"?"":"grayscale(1) brightness(0.4)")}),
            h("span",null,"Accueil")),
          h("button",{class:"nbtn "+(tab==="quests"?"on":""),onClick:()=>switchTab("quests")},
            h("img",{src:"data:image/png;base64,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",style:"height:24px;width:auto;object-fit:contain;mix-blend-mode:screen;filter:"+(tab==="quests"?"":"grayscale(1) brightness(0.4)")}),
            h("span",null,"Qu\u00eates")),
          h("button",{class:"nbtn "+(tab==="stats"?"on":""),onClick:()=>switchTab("stats")},
            h("img",{src:"data:image/png;base64,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",style:"height:28px;width:auto;object-fit:contain;mix-blend-mode:screen;filter:"+(tab==="stats"?"":"grayscale(1) brightness(0.4)")}),
            h("span",null,"Stats")),
          h("button",{class:"nbtn "+(tab==="history"?"on":""),onClick:()=>switchTab("history")},
            h("img",{src:"data:image/png;base64,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",style:"height:28px;width:auto;object-fit:contain;mix-blend-mode:screen;filter:"+(tab==="history"?"":"grayscale(1) brightness(0.4)")}),
            h("span",null,"Historique")),
          h("button",{class:"nbtn "+(tab==="codex"?"on":""),onClick:()=>switchTab("codex")},
            h("img",{src:"assets/codex-icon.png", className:"codex-icon",style:"height:38px;width:auto;object-fit:contain;mix-blend-mode:screen;filter:"+(tab==="codex"?"drop-shadow(0 0 8px var(--rc))":"grayscale(1) brightness(0.45)")}),
            h("span",null,"Codex"))
      ),
      h(Settings,null),
      h(RankUp,null),
      h(PrestigeUp,null),
      h(CapOverlay,null),
    )
  );
}

render(h(App,null),document.getElementById("app"));
