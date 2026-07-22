
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

const STATS      = ["Sante","Force","Esprit","Endurance","Agilite","Discipline"];
const STAT_COLOR = {Sante:"#ef4444",Force:"#fb923c",Esprit:"#ec4899",Endurance:"#22d3ee",Agilite:"#4ade80",Discipline:"#c084fc"};
const STAT_LBL   = {Sante:"Sant\u00e9",Force:"Force",Esprit:"Esprit",Endurance:"Endurance",Agilite:"Agilit\u00e9",Discipline:"Discipline"};
function QuestIcon(id, fallback, size=14, extraStyle=""){
  return h("span",{
    style:"font-size:"+size+"px;line-height:1;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;flex-shrink:0;"+extraStyle
  },fallback);
}

const REGRESSION_DEF = {
  id:"reg_red",
  icon:"🔴",
  statPenalty:2000,
  globalPenalty:12000
};


const DEFS = [
  // ─── SANTÉ ────────────────────────────────────────────────────────────
  {id:"water",  name:"Hydratation",     unit:"verre", xpPer:10,  daily:true, weekly:false,optional:false,stat:"Sante",         icon:"\uD83D\uDCA7",               base:10, baseHistory:[{until:"2026-04-29",base:8}]},
  {id:"sleep",  name:"Dormir 8h",   unit:"nuit",  xpPer:0,   daily:true, weekly:false,optional:false,stat:"Sante",         icon:"\uD83D\uDECF\uFE0F",         base:1,  binary:true, binaryXp:150},
    // ─── FORCE ────────────────────────────────────────────────────────────
  {id:"push",   name:"Pecs", unit:"rep", xpPer:3, daily:true, weekly:false,optional:false,stat:"Force", icon:"🦾", base:30},
  {id:"abs",    name:"Abdos", unit:"rep", xpPer:1.5, daily:true, weekly:false,optional:false,stat:"Force", icon:"🧱", base:60},
  {id:"squats", name:"Jambes", unit:"rep", xpPer:3, daily:true, weekly:false,optional:false,stat:"Force", icon:"🦿", base:15, stat2:"Agilite", xpPer2:3},
  {id:"negative_pullups", name:"Tractions négatives", unit:"rep", xpPer:12, daily:true, weekly:false,optional:false,stat:"Force", icon:"🦾", base:8, startDate:"2026-07-14"},
  {id:"calves", name:"Mollets",unit:"rep", xpPer:1.5, daily:false, weekly:false,optional:false,legacyRotation:true,stat:"Force", icon:"🦵🏻", base:30, stat2:"Agilite", xpPer2:1},
  {id:"grips",  name:"Grip",      unit:"min",   xpPer:10,  daily:true, weekly:false,optional:true, stat:"Force",         icon:"\u270A\uD83C\uDFFB",         base:10, fixedBase:true},
  // ─── ESPRIT ───────────────────────────────────────────────────────────
  {id:"reading",name:"Lecture",unit:"min",xpPer:15,daily:true,weekly:false,optional:false,stat:"Esprit",icon:"📚",base:20,startDate:"2026-05-21"},
  // ─── ESPRIT ───────────────────────────────────────────────────────────
  
  {id:"med",    name:"M\u00e9ditation", unit:"min",   xpPer:10,  daily:true, weekly:false,optional:true, stat:"Esprit",  icon:"\uD83E\uDDD8\uD83C\uDFFB\u200D\u2642\uFE0F", base:15, fixedBase:true},
  // ─── ENDURANCE ────────────────────────────────────────────────────────
  {id:"run",    name:"Running",         iconKey:"run",          unit:"km",    xpPer:200, daily:true, weekly:false,optional:true, stat:"Endurance",      icon:"\uD83C\uDFC3\uD83C\uDFFB",   base:5,  stat2:"Agilite", xpPer2:50},
  {id:"walk",   name:"Rando",       unit:"km",    xpPer:100, daily:true, weekly:false,optional:true, stat:"Endurance",      icon:"\uD83E\uDD7E",               base:5, stat2:"Agilite", xpPer2:25},
  // ─── AGILITÉ ──────────────────────────────────────────────────────────
    {id:"balance",name:"Équilibre",unit:"min",xpPer:10,daily:true,weekly:false,optional:true,stat:"Agilite", icon:"\uD83E\uDDB6\uD83C\uDFFB", base:10, fixedBase:true, startDate:"2026-05-15", stat2:"Esprit", xpPer2:10},
  // ─── DISCIPLINE ───────────────────────────────────────────────────────
];

// Quetes speciales — par stat (23 au total)
const SP = {
  Sante:[
    {id:"sp_sun",     name:"Séance de lumière naturelle", icon:"\u2600\uFE0F",                              unit:"min",  target:10,  xp:500, xp2:250, stat2:"Esprit", days:1, binary:true, desc:"10 min de lumière naturelle"},
    {id:"sp_fruits",  name:"Manger 5 fruits & légumes",  icon:"\uD83C\uDF4F",                              unit:"portion", target:5, xp:500, days:1, binary:true, desc:"Manger 5 fruits et légumes"},
    {id:"sp_breath",  name:"Séance de cohérence cardiaque",icon:"\uD83D\uDC93",                             unit:"min", target:10, xp:500, days:1, binary:true, desc:"10 min de cohérence cardiaque"},
    {id:"sp_nojunk",  name:"Pas de junk-food",                icon:"\uD83C\uDF55",                              unit:"jour", target:1, xp:500, days:1, binary:true, desc:"Zéro junk-food"},
    {id:"sp_balanced_meals", name:"Repas équilibrés", icon:"\uD83C\uDF4C", unit:"repas", target:2, xp:750, days:1, tiers:[{at:1,xp:250,stat:"Sante"},{at:2,xp:500,stat:"Sante"}], desc:"2 repas équilibrés (palier à 1 repas)"},
    {id:"sp_no_sugar", name:"Aucun sucre transformé", icon:"\uD83C\uDF6C", unit:"jour", target:1, xp:500, days:1, binary:true, desc:"Aucun sucre transformé"},
    {id:"sp_mealnostim", name:"Repas sans stimulation", icon:"🧠", unit:"repas", target:2, xp:1000, days:1, tiers:[{at:1,xp:250,stat:"Sante"},{at:2,xp:500,stat:"Sante",xp2:250,stat2:"Discipline"}], desc:"2 repas sans stimulation (palier à 1 repas)"},  ],
  Force:[
    {id:"sp_wallsit", name:"Wall sit",     icon:"\uD83E\uDE91",                                         unit:"min",  target:10,  xp:1000, xp2:500, stat2:"Endurance", days:1, desc:"10 min de wall sit"},
  ],
  Esprit:[
    {id:"sp_learning", name:"Apprentissage actif",  icon:"\uD83C\uDF93",                                  unit:"jour", target:1, xp:1000, xp2:500, stat2:"Discipline", days:1, binary:true, desc:"1h d'apprentissage actif"},
    {id:"sp_memo30",   name:"Mémorisation",icon:"\uD83E\uDDE0",                                  unit:"jour", target:1, xp:1000, days:1, binary:true, desc:"30 min de mémorisation active"},
    {id:"sp_silence30",name:"Silence",          icon:"\uD83E\uDD2B",                                  unit:"jour", target:1, xp:500, days:1, binary:true, desc:"30 min sans parler ni consommer"},
    {id:"sp_nophone3h", name:"Téléphone hors de portée 3h", icon:"\uD83D\uDCF5",                unit:"jour", target:1, xp:500, xp2:250, stat2:"Discipline", days:1, binary:true, desc:"Téléphone hors de portée 3h"},
  ],
  Endurance:[
    {id:"sp_run10k", name:"Sortie course 10km", icon:"\uD83C\uDFC3\uD83C\uDFFB", unit:"km", target:10, xp:2500, days:1, desc:"Sortie course 10 km"},
    {id:"sp_sprint",  name:"Running fractionné 10x100m",icon:"\u26A1",                                 unit:"sér.",target:10, xp:1000, days:1, desc:"10 x 100m sprint/récup"},
    {id:"sp_stairs",  name:"Montées d'escaliers", icon:"\uD83E\uDE9C",                                 unit:"A/R",  target:30, xp:500, xp2:250, stat2:"Agilite", days:1, desc:"30 montées/descentes"},
    {id:"sp_jump",    name:"Corde à sauter",icon:"\uD83D\uDCA6",                                 unit:"min",  target:20, xp:500, xp2:250, stat2:"Agilite", days:1, desc:"20 min de corde à sauter"},
    {id:"sp_walk30",  name:"Sortie marche",     icon:"\uD83D\uDEB6\uD83C\uDFFB\u200D\u2642\uFE0F",           unit:"min",  target:30, xp:500, days:1, desc:"30 min de marche"},
  ],
  Agilite:[
    {id:"sp_flow20",  name:"Animal flow", icon:"\uD83D\uDC0A",                                         unit:"min",  target:30, xp:1500, days:1, tiers:[{at:15,xp:500,stat:"Agilite",xp2:250,stat2:"Endurance"},{at:30,xp:500,stat:"Agilite",xp2:250,stat2:"Endurance"}], desc:"30 min d'animal flow (palier à 15 min)"},
    {id:"sp_fluide",  name:"Flow martial", icon:"\uD83C\uDF0A",                              unit:"min",  target:30, xp:1500, days:1, tiers:[{at:15,xp:500,stat:"Agilite",xp2:250,stat2:"Endurance"},{at:30,xp:500,stat:"Agilite",xp2:250,stat2:"Endurance"}], desc:"30 min de flow martial / mouvement continu sans rupture"},

    {id:"sp_flex30",  name:"Souplesse", icon:"\uD83E\uDD38\uD83C\uDFFB",                              unit:"min",  target:30, xp:1500, days:1, tiers:[{at:15,xp:500,stat:"Agilite",xp2:250,stat2:"Endurance"},{at:30,xp:500,stat:"Agilite",xp2:250,stat2:"Endurance"}], desc:"30 min de souplesse (palier à 15 min)"},    {id:"sp_silent",  name:"Déplacements silencieux", icon:"\uD83D\uDC08",                          unit:"min",  target:10, xp:500, days:1, desc:"Marcher sans bruit (escaliers, pièces)"},
        {id:"sp_footwork", name:"Footwork rapide", icon:"\u26A1",                                            unit:"min",  target:10, xp:500, step:5, days:1, desc:"Footwork rapide (carrelage, devant/derrière/côtés)"},
  ],
  Discipline:[
    {id:"sp_no_passive", name:"Aucun contenu passif", icon:"\uD83D\uDEAB", unit:"jour", target:1, xp:500, days:1, binary:true, desc:"Aucun contenu passif"},
    {id:"sp_cold",      name:"Douche froide 3min",              icon:"\uD83D\uDEBF",                          unit:"min",  target:3, xp:500, stat:"Sante", xp2:250, stat2:"Discipline", days:1, binary:true, compactUnit:true, desc:"Douche froide 3 min"},
    {id:"sp_task",      name:"Accomplir une tâche repoussée", icon:"\uD83D\uDD57",                   unit:"jour", target:1, xp:500, days:1, binary:true, desc:"Accomplir une tâche repoussée"},
    {id:"sp_declutter", name:"Désencombrement",            icon:"\uD83D\uDCE6",                          unit:"objet",target:10,xp:500, days:1, desc:"Jeter/ranger 10 objets"},
  ],
};


// Donjons volontaires : 1 actif à la fois, 1/jour, 3/semaine, accès par clé, 24h puis Boss de Rupture.
// Ordre aligné sur les stats : Santé, Force, Esprit, Endurance, Agilité, Discipline.
const DUNGEONS = [
  {id:"alchemist", title:"Donjon de l’Alchimiste", short:"Alchimiste", stat:"Sante", icon:"⚗️", color:"#ef4444", reward:{xp:2250,stat:"Sante",xp2:450,stat2:"Esprit"}, rooms:[
    {name:"Hydratation", desc:"2 verres d’eau d’une traite"},
    {name:"Lumière naturelle", desc:"10 min au soleil"},
    {name:"Repas propre", desc:"1 repas équilibré, sans sucre transformé ni junk-food ni écran"},
    {name:"Respiration calme", desc:"5 min de cohérence cardiaque ou respiration lente"},
    {name:"Relaxation", desc:"Douche froide 3 min sans interruption"},
  ]},
  {id:"warrior", title:"Donjon du Guerrier", short:"Guerrier", stat:"Force", icon:"⚔️", color:"#fb923c", reward:{xp:2250,stat:"Force",xp2:450,stat2:"Discipline"}, rooms:[
    {name:"Pompes", desc:"100 reps"},
    {name:"Abdos", desc:"150 reps"},
    {name:"Squats", desc:"50 reps"},
    {name:"Gainage", desc:"5 min"},
    {name:"Wall sit", desc:"10 min"},
  ]},
  {id:"monk", title:"Donjon du Moine", short:"Moine", stat:"Esprit", icon:"🧘🏻‍♂️", color:"#ec4899", reward:{xp:2250,stat:"Esprit",xp2:450,stat2:"Discipline"}, rooms:[
    {name:"Lecture profonde", desc:"Lire 10 min sans interruption"},
    {name:"Apprentissage actif", desc:"10 min d’apprentissage volontaire avec prise de notes minimale"},
    {name:"Mémoire", desc:"10 min de rappel actif", helpTitle:"Rappel actif", help:"Le rappel actif consiste à récupérer une information de mémoire, sans relire directement la réponse.\n\nIdées concrètes :\n• Rappel actif simple : ferme la source et restitue ce que tu as retenu.\n• Compression mentale : résume une idée en une phrase, puis en 3 mots-clés.\n• Transmission : explique une notion comme à quelqu’un de 12 ans.\n• Carte mentale : idée centrale + 3 à 5 branches, de mémoire.\n• Flash mental : liste 5 éléments liés à un sujet avant de vérifier.\n• Question-réponse : crée 3 questions et réponds sans relire.\n• Mémoire différée : apprends, attends 5 min, puis restitue."},
    {name:"Méditation", desc:"15 min"},
    {name:"Gratitude", desc:"Écrire 3 choses pour lesquelles je suis reconnaissant"},
  ]},
  {id:"pilgrim", title:"Donjon du Pèlerin", short:"Pèlerin", stat:"Endurance", icon:"🥾", color:"#22d3ee", reward:{xp:2250,stat:"Endurance",xp2:450,stat2:"Agilite"}, rooms:[
    {name:"Stepper", desc:"15 min"},
    {name:"Escaliers", desc:"15 allers-retours"},
    {name:"Jumping jacks", desc:"100 reps"},
    {name:"Fentes marchées", desc:"50 reps"},
    {name:"Running", desc:"30 min sans s’arrêter"},
  ]},
  {id:"hunter", title:"Donjon du Chasseur", short:"Chasseur", stat:"Agilite", icon:"🏹", color:"#4ade80", reward:{xp:2250,stat:"Agilite",xp2:450,stat2:"Endurance"}, rooms:[
    {name:"Éveil corporel", desc:"5 min de mobilité douce"},
    {name:"Footwork rapide", desc:"10 min"},
    {name:"Équilibre sur un pied", desc:"10 min"},
    {name:"Déplacements silencieux", desc:"10 min"},
    {name:"Souplesse active / Animal flow", desc:"30 min"},
  ]},
  {id:"guardian", title:"Donjon du Gardien", short:"Gardien", stat:"Discipline", icon:"🛡️", color:"#c084fc", reward:{xp:2250,stat:"Discipline",xp2:450,stat2:"Esprit"}, rooms:[
    {name:"Capture mentale", desc:"Traiter, planifier ou supprimer 5 éléments de ta charge mentale", helpTitle:"Capture mentale", help:"Note tout ce qui te prend de l’espace mental : petites tâches, démarches, messages, idées, choses à ranger ou décisions à prendre. Pour valider : 5 éléments doivent être traités, planifiés à une date précise, ou supprimés si inutiles."},
    {name:"Tâches repoussées", desc:"Terminer totalement 2 tâches repoussées"},
    {name:"Aucun contenu passif", desc:"2h", helpTitle:"Contenu passif", help:"À inclure : doomscrolling, vidéos courtes, réseaux sociaux sans intention, YouTube en consommation passive, fils d’actualité, jeux vidéo lancés par réflexe, film ou série regardés pour combler le vide. Film/série/jeu vidéo peuvent rester autorisés s’ils sont choisis volontairement comme vraie activité de détente ; ils comptent comme passifs s’ils servent juste à fuir l’ennui, repousser une tâche ou remplir automatiquement le temps."},
    {name:"Rangement", desc:"10 objets"},
    {name:"Bloc profond", desc:"45 min sur une tâche choisie, sans interruption volontaire"},
  ]},
  {id:"steward", title:"Donjon de l’Intendant", short:"Intendant", stat:"Discipline", icon:"🧹", color:"#c084fc", reward:{xp:2250,stat:"Discipline",xp2:450,stat2:"Sante"}, rooms:[
    {name:"Linge", desc:"15 min"},
    {name:"Rangement", desc:"15 min"},
    {name:"Poussière", desc:"15 min"},
    {name:"Aspirer", desc:"20 min"},
    {name:"Salle immaculée", desc:"Récurer 30 min"},
  ]},

];

// Boss de Rupture — tirage à l’expiration d’un donjon normal.
// Probabilités : Mineur 50 %, Majeur 30 %, Élite 15 %, Légendaire 5 %.
const DUNGEON_RUPTURE_RARITIES = {
  mineur:{label:"Mineur",color:"#4ade80",chance:0.50},
  majeur:{label:"Majeur",color:"#60a5fa",chance:0.30},
  elite:{label:"Élite",color:"#c084fc",chance:0.15},
  legendaire:{label:"Légendaire",color:"#f97316",chance:0.05},
};

const DUNGEON_RUPTURE_BOSSES = {
  alchemist:[
    {id:"alchemist_putride",rarity:"mineur",name:"L’Alchimiste Putride",objective:"2 repas équilibrés consécutifs, sans sucre transformé, junk-food ni écran"},
    {id:"alchemist_noir",rarity:"majeur",name:"L’Alchimiste Noir",objective:"Journée de purification : 2 L d’eau répartis avant 18 h et 2 repas propres"},
    {id:"alchemist_dechu",rarity:"elite",name:"L’Alchimiste Déchu",objective:"30 min de lumière naturelle"},
    {id:"alchemist_corrompu",rarity:"legendaire",name:"L’Alchimiste Corrompu",objective:"30 min de marche en extérieur"},
  ],
  warrior:[
    {id:"warrior_berserker",rarity:"mineur",name:"Le Berserker",objective:"200 pompes réparties dans la journée"},
    {id:"warrior_colosse",rarity:"majeur",name:"Le Colosse",objective:"100 squats + 100 fentes"},
    {id:"warrior_gladiateur",rarity:"elite",name:"Le Gladiateur",objective:"30 min de shadow boxing"},
    {id:"warrior_titan",rarity:"legendaire",name:"Le Titan",objective:"15 min de Wall Sit cumulées"},
  ],
  pilgrim:[
    {id:"pilgrim_nomade",rarity:"mineur",name:"Le Nomade",objective:"30 min de marche cumulées"},
    {id:"pilgrim_voyageur_perdu",rarity:"majeur",name:"Le Voyageur Perdu",objective:"Atteindre 10 000 pas"},
    {id:"pilgrim_predateur",rarity:"elite",name:"Le Prédateur",objective:"20 min de corde à sauter"},
    {id:"pilgrim_messager",rarity:"legendaire",name:"Le Messager",objective:"Courir 7 km"},
  ],
  hunter:[
    {id:"hunter_rodeur",rarity:"mineur",name:"Le Rôdeur",objective:"10 min de déplacements latéraux rapides"},
    {id:"hunter_fauve",rarity:"majeur",name:"Le Fauve",objective:"20 min de footwork"},
    {id:"hunter_traqueur",rarity:"elite",name:"Le Traqueur",objective:"30 allers-retours d’escaliers"},
    {id:"hunter_acrobate",rarity:"legendaire",name:"L’Acrobate",objective:"30 min d’Animal Flow ou de mobilité active continue"},
  ],
  monk:[
    {id:"monk_sage_dechu",rarity:"mineur",name:"Le Sage Déchu",objective:"30 min de lecture profonde sans interruption"},
    {id:"monk_veilleur",rarity:"majeur",name:"Le Veilleur",objective:"30 min de méditation guidée"},
    {id:"monk_ombre_interieure",rarity:"elite",name:"L’Ombre Intérieure",objective:"45 min de silence total, sans téléphone, musique, vidéo, podcast ni conversation"},
    {id:"monk_scribe",rarity:"legendaire",name:"Le Scribe",objective:"Rédiger un résumé de 300 mots d’une lecture ou d’un podcast, sans consulter la source pendant la rédaction"},
  ],
  guardian:[
    {id:"guardian_commandant",rarity:"mineur",name:"Le Commandant",objective:"Terminer entièrement 3 tâches repoussées"},
    {id:"guardian_sentinelle",rarity:"majeur",name:"La Sentinelle",objective:"Ranger entièrement une pièce"},
    {id:"guardian_stratege",rarity:"elite",name:"Le Stratège",objective:"Planifier précisément la journée suivante puis commencer immédiatement la première tâche"},
    {id:"guardian_dechu",rarity:"legendaire",name:"Le Gardien Déchu",objective:"60 min de Deep Work sans interruption volontaire"},
  ],
  steward:[
    {id:"steward_negligent",rarity:"mineur",name:"Le Négligent",objective:"Ranger 20 objets"},
    {id:"steward_poussiere",rarity:"majeur",name:"Le Seigneur de la Poussière",objective:"Faire la poussière pendant 30 min"},
    {id:"steward_encombreur",rarity:"elite",name:"L’Encombreur",objective:"Ranger entièrement une pièce"},
    {id:"steward_crasse",rarity:"legendaire",name:"Le Maître de la Crasse",objective:"60 min de nettoyage domestique continu"},
  ],
};

function pickDungeonRuptureBoss(dungeonId){
  const pool=DUNGEON_RUPTURE_BOSSES[dungeonId]||[];
  if(!pool.length) return null;
  const roll=Math.random();
  const rarity=roll<0.50?"mineur":roll<0.80?"majeur":roll<0.95?"elite":"legendaire";
  const boss=pool.find(b=>b.rarity===rarity)||pool[0];
  const meta=DUNGEON_RUPTURE_RARITIES[boss.rarity]||DUNGEON_RUPTURE_RARITIES.mineur;
  return {...boss,rarityLabel:meta.label,rarityColor:meta.color};
}

// Couleurs et libellés des tiers des quêtes urgentes
const SQ_TIER_COLOR = {mineure:"#fbbf24", majeure:"#f59e0b", legendaire:"#f97316"};
const SQ_TIER_LABEL = {mineure:"Mineure", majeure:"Majeure", legendaire:"Légendaire"};

// Élans — V2 : récompense différée après complétion d’un donjon normal.
const EVENT_BONUSES = [
  {id:"ev_force",title:"Élan de Force",desc:"Les gains Force sont augmentés de 15% aujourd’hui.",stat:"Force",bonusPct:0.15},
  {id:"ev_sante",title:"Élan de Vitalité",desc:"Les gains Santé sont augmentés de 15% aujourd’hui.",stat:"Sante",bonusPct:0.15},
  {id:"ev_esprit",title:"Élan d’Esprit",desc:"Les gains Esprit sont augmentés de 15% aujourd’hui.",stat:"Esprit",bonusPct:0.15},
  {id:"ev_endurance",title:"Élan d’Endurance",desc:"Les gains Endurance sont augmentés de 15% aujourd’hui.",stat:"Endurance",bonusPct:0.15},
  {id:"ev_agilite",title:"Élan d’Agilité",desc:"Les gains Agilité sont augmentés de 15% aujourd’hui.",stat:"Agilite",bonusPct:0.15},
  {id:"ev_discipline",title:"Élan de Discipline",desc:"Les gains Discipline sont augmentés de 15% aujourd’hui.",stat:"Discipline",bonusPct:0.15,disabled:true},
];

function eventDayStr(from=Date.now()){
  const d=new Date(from);
  if(d.getHours()<7) d.setDate(d.getDate()-1);
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+day;
}
function addDaysStr(day,delta){
  const d=new Date(day+"T12:00:00");
  d.setDate(d.getDate()+delta);
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),dd=String(d.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+dd;
}
function pickFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function twoWeakestStatsFromState(s){
  const stats=s?.stats||{};
  return [...STATS].sort((a,b)=>(stats[a]||0)-(stats[b]||0)).slice(0,2);
}
function strongestStatFromState(s){
  const stats=s?.stats||{};
  return [...STATS].sort((a,b)=>(stats[b]||0)-(stats[a]||0))[0];
}
function lastBonusStatFromHistory(s){
  const h=[...((s&&s.eventHistory)||[])].reverse();
  const last=h.find(e=>e&&e.type==="bonus");
  if(!last) return null;
  const ev=EVENT_BONUSES.find(e=>e.id===last.id);
  return ev ? ev.stat : null;
}
function addElanXpPair(out,stat,xp){
  if(!stat || !xp || xp<=0) return;
  out[stat]=(out[stat]||0)+xp;
}
function estimateQuestXpForElan(s,obj,val,day){
  const out={};
  const n=Number(val)||0;
  if(n<=0 || !obj) return out;
  const b=eventQuestTarget(s,obj,day);
  if(obj.tiers && obj.tiers.length>0){
    obj.tiers.filter(t=>n>=t.at).forEach(t=>{
      addElanXpPair(out,t.stat,t.xp||0);
      if(t.xp2&&t.stat2) addElanXpPair(out,t.stat2,t.xp2);
    });
    if(obj.overGoalXpPer){
      const overTarget=obj.target || obj.tiers[obj.tiers.length-1].at || obj.base || 0;
      const overUnits=Math.max(0,n-overTarget);
      addElanXpPair(out,obj.overGoalStat||obj.stat,overUnits*obj.overGoalXpPer);
    }
    return out;
  }
  let xp=0;
  if(obj.id==="reading"){
    xp=n*(obj.xpPer||0);
  } else if(obj.binary){
    xp=n>=1 ? (obj.binaryXp||0) : 0;
  } else if(obj.base && obj.id!=="water" && obj.id!=="run"){
    if(obj.optional){
      xp=n*(obj.xpPer||0);
      const mult=Math.floor(n/Math.max(1,b));
      for(let m=2;m<=mult;m++) xp+=b*(obj.xpPer||0);
    } else {
      if(n<b) xp=0;
      else {
        xp=n*(obj.xpPer||0);
        const mult=Math.floor(n/Math.max(1,b));
        for(let m=2;m<=mult;m++) xp+=b*(obj.xpPer||0);
      }
    }
  } else if(obj.id==="run"){
    xp=n*(obj.xpPer||0);
    if(n>=b*2) xp+=Math.round(n*(obj.xpPer||0)*0.5);
  } else if(obj.xpPer){
    xp=n*obj.xpPer;
  } else if(obj.xp){
    xp=obj.xp;
  }
  if(xp>0){
    addElanXpPair(out,obj.stat,xp);
    if(obj.stat2&&obj.xpPer2&&obj.xpPer){
      addElanXpPair(out,obj.stat2,Math.round(xp*(obj.xpPer2/obj.xpPer)));
    } else if(obj.stat2){
      addElanXpPair(out,obj.stat2,xp);
    }
    if(obj.stat3&&obj.xp3) addElanXpPair(out,obj.stat3,obj.xp3);
  }
  return out;
}
function yesterdayStatXpForElan(s,day){
  const out={};
  STATS.forEach(stat=>{out[stat]=0;});
  const log=(s.dailyLog&&s.dailyLog[day])||{};
  DEFS.forEach(obj=>{
    if(log[obj.id]==null) return;
    const pairs=estimateQuestXpForElan(s,obj,log[obj.id],day);
    Object.entries(pairs).forEach(([stat,xp])=>addElanXpPair(out,stat,xp));
  });
  return out;
}
function elanBaseScoreFromXp(xp){
  if(xp<=0) return 90;
  if(xp<250) return 70;
  if(xp<600) return 50;
  if(xp<1000) return 30;
  return 15;
}
function weightedPickElan(scored){
  const total=scored.reduce((sum,r)=>sum+Math.max(1,r.score||1),0);
  let roll=Math.random()*total;
  for(const row of scored){
    roll-=Math.max(1,row.score||1);
    if(roll<=0) return row.event;
  }
  return scored[scored.length-1]?.event || pickFrom(EVENT_BONUSES);
}
function requiredDailyForEvent(s,day){
  return DEFS.filter(o=>o.daily&&!o.optional&&(!o.startDate||o.startDate<=day));
}
function eventQuestTarget(s,o,day){
  const prestige=s.prestige||0;
  const rank=getRankWithStats(s.totalXp||0,s.stats||{});
  const ri=RANKS.findIndex(r=>r.id===rank.id);
  return o.validateAt != null ? o.validateAt : getRankBase(o.id,ri,prestige,s.stats);
}
function missedRequiredQuestsForEvent(s,day){
  const log=(s.dailyLog&&s.dailyLog[day])||{};
  return requiredDailyForEvent(s,day).filter(o=>(log[o.id]||0)<eventQuestTarget(s,o,day));
}
function wasDayCompleteForEvent(s,day){
  const required=requiredDailyForEvent(s,day);
  if(required.length===0) return false;
  return missedRequiredQuestsForEvent(s,day).length===0;
}
function completedNormalDungeonForEvent(s,day){
  return [...(s.dungeonLog||[])].some(entry=>{
    if(!entry || entry.rupture || !entry.completedAt) return false;
    return eventDayStr(entry.completedAt)===day;
  });
}
function buildBonusEvent(s,now=Date.now()){
  const day=eventDayStr(now);
  const prev=addDaysStr(day,-1);
  const xpByStat=yesterdayStatXpForElan(s,prev);
  const weakest=twoWeakestStatsFromState(s);
  const strongest=strongestStatFromState(s);
  const lastBonus=lastBonusStatFromHistory(s);
  const scored=EVENT_BONUSES.filter(e=>!e.disabled).map(e=>{
    let score=elanBaseScoreFromXp(xpByStat[e.stat]||0);
    if(weakest.includes(e.stat)) score+=15;
    if(strongest===e.stat) score-=10;
    if(lastBonus===e.stat) score-=10;
    return {event:e,score:Math.max(1,score),xp:xpByStat[e.stat]||0};
  });
  const e=weightedPickElan(scored);
  return {...e,type:"bonus",day,startedAt:now,expiresAt:next7AM(now),source:"dungeon_completion_reward"};
}
function buildDailyEvent(s,now=Date.now()){
  const day=eventDayStr(now);
  const prev=addDaysStr(day,-1);
  if(completedNormalDungeonForEvent(s,prev)) return buildBonusEvent(s,now);
  return null;
}
function applyDailyEventReset(s,now=Date.now()){
  const day=eventDayStr(now);
  if(s.eventDay===day) return s;
  const ev=buildDailyEvent(s,now);
  const oldHistory=s.eventHistory||[];
  const eventHistory=ev ? [...oldHistory,{day,id:ev.id,type:ev.type,source:ev.source}].slice(-12) : oldHistory.slice(-12);
  return {...s,eventDay:day,dailyEvent:ev,eventHistory};
}

// Quêtes urgentes : fonctions de délai
// Prochain 7h00 (aujourd'hui si on est avant 7h, sinon demain)
function next7AM(from){
  const d = new Date(from||Date.now());
  const result = new Date(d.getFullYear(),d.getMonth(),d.getDate(),7,0,0,0);
  if(d.getHours()<7) return result.getTime();
  result.setDate(result.getDate()+1);
  return result.getTime();
}
function current7AMStart(from){
  const d=new Date(from||Date.now());
  const result=new Date(d.getFullYear(),d.getMonth(),d.getDate(),7,0,0,0);
  if(d.getHours()<7) result.setDate(result.getDate()-1);
  return result.getTime();
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
  reading: [5, 10, 15, 20, 25, 30],
  run:     [4,  5,  6,   7,   8,   10],
  med:     [15, 18, 21,  24,  27,  30],
  flex:    [15, 18, 21,  24,  27,  30],
  walk:    [4,  5,  6,   7,   8,   10],
  balance: [5,  10, 15,  20,  25,  30],
  grips:   [10, 12, 14,  16,  18,  20],
};


// Progression des objectifs par niveau de stat
// Les habitudes fixes restent inchangées : Hydratation, Sommeil, Grip, Méditation, Équilibre.
const STAT_LEVEL_BASES = {
  push:   {stat:"Force",     base:30, step:6,  cap:100},
  abs:    {stat:"Force",     base:60, step:12, cap:200},
  squats: {stat:"Force",     base:15, step:3,  cap:50},
  calves: {stat:"Force",     base:30, step:6,  cap:100},
  reading:{stat:"Esprit",    base:10, step:2,  cap:30},
};
const STAT_LEVEL_TABLES = {
  run:  {stat:"Endurance", values:[3,4,5,6,6,7,7,8,9,10], cap:10},
  walk: {stat:"Endurance", values:[3,4,5,6,6,7,7,8,9,10], cap:10},
};
function statLevelTier(level){
  const lvl=Number(level)||1;
  if(lvl<10) return 0;
  return Math.floor((lvl-10)/5)+1;
}
function legRaiseTargetForForceLevel(level){
  const lvl=Math.max(1,Number(level)||1);
  const target=lvl<10 ? 30 : 30+(Math.floor((lvl-10)/5)+1)*6;
  return Math.min(100,target);
}
function getStatLevelTarget(objId, stats){
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

function getRankBase(objId, rankIdx, prestige, stats){
  const def = DEFS.find(o=>o.id===objId);
  // Si la quête a un objectif fixe, on ne scale jamais
  if(def?.fixedBase) return def.base;

  const statTarget = getStatLevelTarget(objId, stats);
  if(statTarget != null) return statTarget;

  // Fallback historique : utilisé uniquement si aucune règle par niveau de stat n'existe.
  const base = RANK_BASES[objId]?.[rankIdx] ?? (def?.base ?? 0);
  if(!prestige||prestige===0)return base;
  const sBase = RANK_BASES[objId]?.[5] ?? base;
  if(objId==="reading" || objId==="run" || objId==="walk") return sBase;
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
const prevWkStr  = (d=new Date()) => { const x=new Date(d); x.setDate(x.getDate()-7); return wkStr(x); };
const sortStat   = arr => [...arr].sort((a,b)=>STATS.indexOf(a.stat)-STATS.indexOf(b.stat));
// XP pour passer du niveau N au niveau N+1 : 1000 * 1.1^N
const xpForLvl   = l => Math.round(1000*Math.pow(1.1,l));
const totForLvl  = l => { let t=0; for(let i=0;i<l;i++)t+=xpForLvl(i); return t; };
const getLvl     = xp => { let l=0; while(xp>=totForLvl(l+1))l++; return l; };

// Niveau global du personnage : progression courte/moyenne, indépendante des rangs.
// Niveau 1 -> 2 = 3 000 XP, puis +250 XP requis à chaque niveau.
const GLOBAL_MAX_LEVEL = 100;
const globalXpForNextLevel = lvl => 3000 + (Math.max(1,lvl)-1)*250;
const globalTotForLevel = lvl => {
  let t=0;
  for(let i=1;i<Math.max(1,lvl);i++)t+=globalXpForNextLevel(i);
  return t;
};
function getGlobalLevelInfo(xp){
  const total = Math.max(0,Number(xp)||0);
  let level = 1;
  while(level < GLOBAL_MAX_LEVEL && total >= globalTotForLevel(level+1)) level++;
  const nextLevel = Math.min(GLOBAL_MAX_LEVEL, level+1);
  const start = globalTotForLevel(level);
  const next = level >= GLOBAL_MAX_LEVEL ? start : globalTotForLevel(nextLevel);
  const need = Math.max(1,next-start);
  const inLevel = Math.max(0,total-start);
  const pct = level >= GLOBAL_MAX_LEVEL ? 100 : Math.max(0,Math.min(100,(inLevel/need)*100));
  return {level,nextLevel,start,next,need,inLevel,pct,maxed:level>=GLOBAL_MAX_LEVEL};
}


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
  if(obj.tiers && obj.tiers.length>0){
    const tierXp = obj.tiers.reduce((sum,tier)=>{
      if(total < tier.at) return sum;
      return sum + (tier.xp||0) + (tier.xp2||0) + (tier.xp3||0);
    },0);
    const overTarget = obj.target || obj.tiers[obj.tiers.length-1].at || obj.base || 0;
    const overXp = obj.overGoalXpPer ? Math.max(0,total-overTarget) * obj.overGoalXpPer : 0;
    return tierXp + overXp;
  }
  const xpPer=obj.xpPer;
  const effectiveTotal = total;
  // Cas spécial reading : Esprit linéaire
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

// XP global réellement produit par une quête, toutes stats confondues.
// calcXp() calcule la ligne principale (ou tous les paliers pour les quêtes à paliers).
function calcQuestTotalXp(obj,total,baseOverride){
  const primary=calcXp(obj,total,baseOverride);
  if(!obj || primary<=0) return 0;
  // Les quêtes à paliers sont déjà entièrement additionnées dans calcXp().
  if(obj.tiers && obj.tiers.length>0) return primary;
  let sum=primary;
  if(obj.stat2){
    if(obj.xpPer2 && obj.xpPer) sum+=Math.round(primary*(obj.xpPer2/obj.xpPer));
    else if(obj.xp2) sum+=Number(obj.xp2)||0;
    else sum+=primary;
  }
  if(obj.stat3){
    if(obj.xpPer3 && obj.xpPer) sum+=Math.round(primary*(obj.xpPer3/obj.xpPer));
    else if(obj.xp3) sum+=Number(obj.xp3)||0;
    else sum+=primary;
  }
  return sum;
}

function pickRandomSq(usedIds,statCycle,completedLog){
  const stats=["Sante","Force","Esprit","Endurance","Agilite","Discipline"];
  const cycle = [...new Set((statCycle||[]).filter(s=>stats.includes(s)))];
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
          return {tpl:{stat:s,...chosen}, pickedStat:s, cycleReset};
        }
      }
    }
    return null;
  }

  const stat = usable[Math.floor(Math.random()*usable.length)];
  const avail = availableForStat(stat,respectCooldown);
  const chosen = avail[Math.floor(Math.random()*avail.length)];
  return {tpl:{...chosen,stat:chosen.stat||stat}, pickedStat:stat, cycleReset};
}

const IMPORTED_VERSION = "2026-05-11-v4";
const BACKUP_KEYS = ["sl_v3","sl_v3_backup1","sl_v3_backup2","sl_v3_backup3"];

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
          completedAt:q.completedAt
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
function currentEventMap(){
  const map={};
  (EVENT_BONUSES||[]).forEach(e=>{ map[e.id]=e; });
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
    completedAt:q.completedAt || null
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
function cleanDailyEvent(ev){
  if(!ev || !ev.id) return null;
  const map=currentEventMap();
  const tpl=map[ev.id];
  if(!tpl || tpl.disabled) return null;
  return {
    ...tpl,
    type:"bonus",
    day:ev.day || eventDayStr(),
    startedAt:ev.startedAt || Date.now(),
    expiresAt:ev.expiresAt || next7AM(),
    source:ev.source || null
  };
}
function cleanEventHistory(history){
  const map=currentEventMap();
  return (history||[])
    .filter(e=>e && e.id && map[e.id])
    .map(e=>({day:e.day,id:e.id,type:"bonus",source:e.source}))
    .slice(-12);
}
function cleanDailyExtraXp(extra){
  const allowed=new Set(["eventBonus","sq","dungeon","streak","debt"]);
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
      rarity:e.ruptureBoss.rarity||"mineur",
      rarityLabel:e.ruptureBoss.rarityLabel||null,
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
    if((id==="run"||id==="walk") && /^\d{4}-\d{2}-\d{2}$/.test(day)) out[day]=id;
  });
  return out;
}
function cleanRegressionLog(obj){
  const out={};
  Object.entries(obj||{}).forEach(([day,activated])=>{
    if(/^\d{4}-\d{2}-\d{2}$/.test(day) && (activated===true || Number(activated)>0)) out[day]=true;
  });
  return out;
}
function cleanSystemState(raw){
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
      transmutationGrimoire:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.transmutationGrimoire)||0))
    },
    dungeonAccessOpen:data.dungeonAccessOpen===true,
    activeElixir:(data.activeElixir&&Number(data.activeElixir.expiresAt)>Date.now()&&(data.activeElixir.kind==="supremeElixir"||["Force","Sante","Esprit","Endurance","Agilite"].includes(data.activeElixir.stat)))?data.activeElixir:null,
    dungeonKeyDay:data.dungeonKeyDay||null,
    dungeonKeyRollWon:data.dungeonKeyRollWon===true,
    dungeonLog:cleanDungeonLog(data.dungeonLog),
    dailyExtraXp:cleanDailyExtraXp(data.dailyExtraXp),
    dailyEvent:cleanDailyEvent(data.dailyEvent),
    eventDay:data.eventDay||null,
    eventHistory:cleanEventHistory(data.eventHistory),
    sqRerollDay:data.sqRerollDay||null,
    questDebt:data.questDebt||null,
    debtUsesByWeek:data.debtUsesByWeek||{},
    debtResolvedDays:data.debtResolvedDays||{},
    regressionLog:cleanRegressionLog(data.regressionLog),
    enduranceChoiceByDay:cleanEnduranceChoiceByDay(data.enduranceChoiceByDay),
    exerciseRotationByDay:cleanExerciseRotationByDay(data.exerciseRotationByDay),
    dailyCompletionAnimDay:data.dailyCompletionAnimDay||null,
    bonusCompletionAnimDay:data.bonusCompletionAnimDay||null,
    completedSqLog,
    sqStatCycle
  };
}
function exportSystemState(s){
  return cleanSystemState(s);
}



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
        return cleanSystemState(parsed);
      }
    }catch{}
  }
  return null;
};

// \u00c9criture : rotation des backups + sauvegarde principale
const saveState  = s  => {
  try{
    // On n\'enregistre que les éléments encore en vigueur dans l\'app
    const toSave = exportSystemState(s);
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
  activeDungeon:null,
  dungeonRunDay:null,
  dungeonSkipDay:null,
  dungeonRunsByWeek:{},
  dungeonLog:[],
  dailyExtraXp:{},
  dailyEvent:null,
  eventDay:null,
  eventHistory:[],
  sqRerollDay:null,
  completedSqLog:[],
  sqStatCycle:[],
  regressionLog:{},
  enduranceChoiceByDay:{},
  exerciseRotationByDay:{},
  dailyCompletionAnimDay:null,
  bonusCompletionAnimDay:null,
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

function buildState(){
  const saved=loadState();
  if(!saved)return {...IMPORTED,dailyLog:resetInvalidRunningRecord(IMPORTED.dailyLog)};
  const migratedLog=resetInvalidRunningRecord(migrateGripsToMin(saved.dailyLog||IMPORTED.dailyLog));
  const out={
    ...IMPORTED,
    ...saved,
    objectives:DEFS,
    specialQuests:saved.specialQuests||[],
    sqCooldownUntil:saved.sqCooldownUntil||null,
    sqRerollDay:saved.sqRerollDay||null,
    activeDungeon:saved.activeDungeon||null,
    dungeonRunDay:saved.dungeonRunDay||null,
    dungeonSkipDay:saved.dungeonSkipDay||null,
    dungeonRunsByWeek:saved.dungeonRunsByWeek||{},
    dungeonLog:saved.dungeonLog||[],
    inventory:saved.inventory||{majorElixir:0,minorElixir:0,supremeElixir:0,transmutationGrimoire:0},
    dungeonAccessOpen:saved.dungeonAccessOpen===true,
    activeElixir:saved.activeElixir||null,
    dailyExtraXp:saved.dailyExtraXp||IMPORTED.dailyExtraXp||{},
    dailyEvent:saved.dailyEvent||IMPORTED.dailyEvent||null,
    eventDay:saved.eventDay||IMPORTED.eventDay||null,
    eventHistory:saved.eventHistory||IMPORTED.eventHistory||[],
    regressionLog:saved.regressionLog||{},
    enduranceChoiceByDay:saved.enduranceChoiceByDay||{},
    exerciseRotationByDay:saved.exerciseRotationByDay||{},
    completedSqLog:saved.completedSqLog||[],
    sqStatCycle:saved.sqStatCycle||[],
    stats:saved.stats||IMPORTED.stats,
    statXp:saved.statXp||IMPORTED.statXp,
    dailyLog:migratedLog,
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
  if(hadRemovedActive) {
    out.sqCooldownUntil=null;
    out.sqRerollDay=null;
  }
  if(out.activeDungeon && !out.activeDungeon.completedAt){
    const ad=out.activeDungeon;
    const start=(ad.ruptureBoss&&ad.ruptureBoss.startedAt)||ad.rupturedAt||ad.startedAt||Date.now();
    const expiresAt=next7AM(start);
    let ruptureBoss=ad.ruptureBoss;
    if(ruptureBoss){
      const updated=(DUNGEON_RUPTURE_BOSSES[ad.id]||[]).find(b=>b.rarity===ruptureBoss.rarity);
      ruptureBoss=updated
        ? {...ruptureBoss,...updated,startedAt:ruptureBoss.startedAt||start,expiresAt}
        : {...ruptureBoss,expiresAt};
    }
    out.activeDungeon={
      ...ad,
      expiresAt,
      ruptureBoss
    };
  }
  return out;
}


// ─── SYSTÈME DE DETTE DE QUÊTE ───────────────────────────────────────────
const DEBT_ELIGIBLE_IDS = new Set(["push","abs","squats","negative_pullups","calves","reading"]);
const MAX_DEBTS_PER_WEEK = 3;
const RUN_RECORD_RESET_DAY = "2026-07-13";

const EXERCISE_ROTATIONS = {
  push:[
    {id:"pushups",label:"Pompes",icon:"💪🏼"},
    {id:"dips",label:"Dips",icon:"💪🏼"},
  ],
  abs:[
    {id:"crunches",label:"Crunches",icon:"🧎🏻"},
    {id:"leg_raises",label:"Levées de jambes",icon:"🦵🏻"},
    {id:"plank",label:"Gainage",icon:"🫳🏼"},
    {id:"side_plank",label:"Gainage obliques",icon:"🧎🏻‍♂️‍➡️"},
  ],
  legs:[
    {id:"squats",label:"Squats",icon:"🦵🏻"},
    {id:"calves",label:"Mollets",icon:"🦵🏻"},
    {id:"lunges",label:"Fentes",icon:"🦵🏻"},
  ],
};
const EXERCISE_FAMILY_LABELS={push:"Pecs",abs:"Abdos",squats:"Jambes"};
const EXERCISE_FAMILY_ICONS={push:"🦾",abs:"🧱",squats:"🦿"};
const LEGACY_EXERCISE_DEFAULTS={push:"pushups",abs:"crunches",legs:"squats"};
function isExerciseFamilyQuestId(id){ return id==="push"||id==="abs"||id==="squats"; }
function exerciseFamilyLabel(id,fallback){ return EXERCISE_FAMILY_LABELS[id]||fallback||id; }
function exerciseFamilyIcon(id,fallback){ return EXERCISE_FAMILY_ICONS[id]||fallback||"•"; }

function weightedExercisePick(options,lastId){
  if(!Array.isArray(options)||!options.length) return null;
  if(!lastId || !options.some(o=>o.id===lastId)) return options[Math.floor(Math.random()*options.length)];
  const n=options.length;
  const repeatWeight=n===2?.30:n===3?.20:.10;
  const otherWeight=(1-repeatWeight)/(n-1);
  let roll=Math.random();
  for(const option of options){
    roll-=option.id===lastId?repeatWeight:otherWeight;
    if(roll<=0) return option;
  }
  return options[options.length-1];
}
function previousRotationChoice(history,day,family){
  const days=Object.keys(history||{}).filter(d=>d<day).sort().reverse();
  for(const d of days){
    const id=history[d]&&history[d][family];
    if(id) return id;
  }
  return null;
}
function ensureExerciseRotationForDay(state,day){
  const history={...(state.exerciseRotationByDay||{})};
  if(history[day]) return state;
  history[day]={};
  for(const [family,options] of Object.entries(EXERCISE_ROTATIONS)){
    const last=previousRotationChoice(history,day,family);
    const picked=weightedExercisePick(options,last);
    history[day][family]=picked&&picked.id;
  }
  return {...state,exerciseRotationByDay:history};
}
function cleanExerciseRotationByDay(raw){
  const out={};
  Object.entries(raw||{}).forEach(([day,row])=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!row||typeof row!=="object") return;
    const clean={};
    Object.entries(EXERCISE_ROTATIONS).forEach(([family,options])=>{
      if(options.some(o=>o.id===row[family])) clean[family]=row[family];
    });
    // Migration d'une ancienne variante supprimée.
    if(row.abs==="reverse_plank" && !clean.abs) clean.abs="plank";
    if(Object.keys(clean).length) out[day]=clean;
  });
  return out;
}
function rotatedQuestObjects(baseObjs,rotation,stats,totalXp){
  const force=Math.max(1,Number((stats||{}).Force)||1);
  const tier=statLevelTier(force);
  const byId=(family,id)=>EXERCISE_ROTATIONS[family].find(o=>o.id===id)||EXERCISE_ROTATIONS[family][0];
  const chest=byId("push",rotation&&rotation.push);
  const abs=byId("abs",rotation&&rotation.abs);
  const legs=byId("legs",rotation&&rotation.legs);
  return (baseObjs||[]).map(obj=>{
    if(obj.id==="push") return {...obj,name:"Pecs - "+chest.label,icon:"🦾",exerciseIcon:chest.icon,rotationExercise:chest.label,target:getStatLevelTarget("push",stats),unit:"rep",xpPer:3,stat2:null,xpPer2:null};
    if(obj.id==="abs"){
      if(abs.id==="crunches") return {...obj,name:"Abdos - Crunches",icon:"🧱",exerciseIcon:abs.icon,rotationExercise:abs.label,target:getStatLevelTarget("abs",stats),unit:"rep",xpPer:1.5};
      if(abs.id==="leg_raises") return {...obj,name:"Abdos - Levées de jambes",icon:"🧱",exerciseIcon:abs.icon,rotationExercise:abs.label,target:legRaiseTargetForForceLevel(force),unit:"rep",xpPer:3};
      if(abs.id==="side_plank") return {...obj,name:"Abdos - Gainage obliques",icon:"🧱",exerciseIcon:abs.icon,rotationExercise:abs.label,target:Math.min(60,24+tier*2),unit:"rep",xpPer:6};
      return {...obj,name:"Abdos - Gainage",icon:"🧱",exerciseIcon:abs.icon,rotationExercise:abs.label,target:Math.max(1,Math.ceil(force/10)),unit:"min",xpPer:50};
    }
    if(obj.id==="squats"){
      if(legs.id==="calves") return {...obj,name:"Jambes - Mollets",icon:"🦿",exerciseIcon:legs.icon,rotationExercise:legs.label,target:getStatLevelTarget("calves",stats),unit:"rep",xpPer:1.5,stat2:"Agilite",xpPer2:1};
      if(legs.id==="lunges") return {...obj,name:"Jambes - Fentes",icon:"🦿",exerciseIcon:legs.icon,rotationExercise:legs.label,target:getStatLevelTarget("push",stats),unit:"rep",xpPer:3,stat2:null,xpPer2:null};
      return {...obj,name:"Jambes - Squats",icon:"🦿",exerciseIcon:legs.icon,rotationExercise:legs.label,target:getStatLevelTarget("squats",stats),unit:"rep",xpPer:3,stat2:"Agilite",xpPer2:3};
    }
    return obj;
  });
}

function isDebtEligibleQuest(obj){
  return !!(obj && obj.daily && !obj.optional && !obj.binary && DEBT_ELIGIBLE_IDS.has(obj.id));
}
function debtRewardPairs(obj,current,target){
  const missing=Math.max(0,(Number(target)||0)-(Number(current)||0));
  if(missing<=0) return [];
  let mainXp=0;
  if(obj.id==="reading"){
    mainXp=missing*(obj.xpPer||0);
  }else{
    const beforeXp=calcXp(obj,current,target);
    const afterXp=calcXp(obj,target,target);
    mainXp=Math.max(0,afterXp-beforeXp);
  }
  const pairs=[];
  if(mainXp>0) pairs.push({stat:obj.stat,xp:Math.round(mainXp)});
  if(obj.stat2){
    const ratio=(obj.xpPer2||obj.xpPer||0)/(obj.xpPer||1);
    const xp2=Math.round(mainXp*ratio);
    if(xp2>0) pairs.push({stat:obj.stat2,xp:xp2});
  }
  return pairs;
}

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────

function App(){
  const [state,setState]   = useState(()=>{
    const now=Date.now();
    let base=applyDailyEventReset(buildState(),now);
    base=ensureExerciseRotationForDay(base,todayStr());
    // Auto-init quete speciale si aucune active
    const sqs=base.specialQuests||[];
    const hasActive=sqs.find(q=>!q.completedAt&&now<(q.expiresAt||0));
    const resetStart=current7AMStart(now);
    const resetEnd=next7AM(resetStart);
    const hasCompletedThisWindow=sqs.some(q=>q.completedAt&&q.completedAt>=resetStart&&q.completedAt<resetEnd);
    const sqCdUntil=base.sqCooldownUntil||0;
    const cooldownOk=now>=sqCdUntil;
    const staleCooldownWithoutQuest=!hasActive&&!hasCompletedThisWindow&&sqCdUntil>now;
    if(!hasActive&&!hasCompletedThisWindow&&(cooldownOk||staleCooldownWithoutQuest)){
      const result=pickRandomSq(sqs.filter(q=>!q.completedAt).map(q=>q.id),base.sqStatCycle,base.completedSqLog);
      if(result){
        const {tpl,pickedStat,cycleReset}=result;
        const sq={...tpl,sqid:"sq_"+now,progress:0,startedAt:now,expiresAt:next7AM(now),completedAt:null};
        const newCycle = cycleReset ? [pickedStat] : [...(base.sqStatCycle||[]),pickedStat];
        return {...base,specialQuests:[...sqs.filter(q=>q.completedAt),sq],sqStatCycle:newCycle,sqCooldownUntil:next7AM(now),sqRerollDay:null};
      }
    }
    return base;
  });
  const [tab,setTab]       = useState("home");
  const scrollRef = useRef(null);
  function switchTab(id){ setTab(id); if(scrollRef.current) scrollRef.current.scrollTop=0; }
  const [rankUp,setRankUp] = useState(null);
  const [levelUp,setLevelUp] = useState(null);
  const [statDecadeUp,setStatDecadeUp] = useState(null);
  const [statLevelQueue,setStatLevelQueue] = useState([]);
  const [debtUp,setDebtUp] = useState(null);
  const [confirmDebt,setConfirmDebt] = useState(null);
  const [streakUp,setStreakUp] = useState(null);
  const [completionUp,setCompletionUp] = useState(null);
  const [completionQueue,setCompletionQueue] = useState([]);
  const [recordUp,setRecordUp] = useState(null);
  const [keyLootUp,setKeyLootUp] = useState(null);
  const [keyLootQueue,setKeyLootQueue] = useState([]);
  const [itemLootUp,setItemLootUp] = useState(null);
  const [itemLootQueue,setItemLootQueue] = useState([]);
  const [itemUseUp,setItemUseUp] = useState(null);
  const [inventoryItem,setInventoryItem] = useState(null);
  const [confirmItemUse,setConfirmItemUse] = useState(null);
  const [elixirStatChoice,setElixirStatChoice] = useState(null);
  const [confirmElixirUse,setConfirmElixirUse] = useState(null);
  const [dungeonUp,setDungeonUp] = useState(null);
  const [ruptureUp,setRuptureUp] = useState(null);
  const [urgentUp,setUrgentUp] = useState(null);
  const [confirmRerollSq,setConfirmRerollSq] = useState(null);
  const [confirmRegression,setConfirmRegression] = useState(false);
  const [regressionUp,setRegressionUp] = useState(false);
  const [confirmDungeonChoice,setConfirmDungeonChoice] = useState(null);
  const [dungeonChoiceOpen,setDungeonChoiceOpen] = useState(false);
  const [importModal,setImportModal] = useState(false);
  const [importValue,setImportValue] = useState("");
  const [exportCopiedModal,setExportCopiedModal] = useState(false);
  const [exportManualModal,setExportManualModal] = useState(false);
  const [exportValue,setExportValue] = useState("");
  const [dungeonHelpOpen,setDungeonHelpOpen] = useState({});
  const [selectedDungeonRoom,setSelectedDungeonRoom] = useState(null);
  const [historyOpen,setHistoryOpen] = useState({week:false,records:false,totals:false});
  const [codexOpen,setCodexOpen] = useState({obl:false,bonus:false,reg:false,sq:false,elan:false,debt:false,dj:false,cs:false});
  const [prestigeUp,setPrestigeUp] = useState(null);
  const [showStatReqDetail,setShowStatReqDetail] = useState(false);
  const [showRankReqStats,setShowRankReqStats] = useState(false);
  const [mobOpen,setMobOpen] = useState(false);
  const [floats,setFloats] = useState([]);
  const [showSet,setShowSet]       = useState(false);
  const [confirmReset,setConfirmReset] = useState(false);
  const [wkOff,setWkOff]  = useState(0);
  const inputs = useRef({});

  function enqueueDungeonKeyLoot(kind){
    setKeyLootQueue(q=>[...q,{kind:kind==="rare"?"rare":"guaranteed",id:Date.now()+Math.random()}]);
  }

  function awardDungeonKey(kind){
    setState(s=>({...s,dungeonKeys:Math.max(0,Math.floor(Number(s.dungeonKeys)||0))+1}));
    enqueueDungeonKeyLoot(kind);
  }

  function enqueueItemLoot(item,kind="rare"){
    setItemLootQueue(q=>[...q,{item,kind,id:Date.now()+Math.random()}]);
  }

  function awardInventoryItem(kind,source="rare"){
    setState(s=>({...s,inventory:{...(s.inventory||{}),[kind]:Math.max(0,Math.floor(Number(s.inventory&&s.inventory[kind])||0))+1}}));
    enqueueItemLoot(kind,source);
  }

  function awardElixir(kind,source="rare"){
    awardInventoryItem(kind,source);
  }

  function applyRegression(){
    const day=todayStr();
    setState(s=>{
      if((s.regressionLog||{})[day]) return s;
      const statXp={...(s.statXp||{})};
      const stats={...(s.stats||{})};
      STATS.forEach(stat=>{
        statXp[stat]=Math.max(0,(Number(statXp[stat])||0)-REGRESSION_DEF.statPenalty);
        stats[stat]=getLvl(statXp[stat]);
      });
      return {
        ...s,
        totalXp:Math.max(0,(Number(s.totalXp)||0)-REGRESSION_DEF.globalPenalty),
        statXp,
        stats,
        regressionLog:{...(s.regressionLog||{}),[day]:true},
        lastActiveDay:day
      };
    });
    setConfirmRegression(false);
    setRegressionUp(true);
  }

  function tryRareDungeonKeyDrop(){
    const keyWon=Math.random()<0.01;
    const elixirWon=Math.random()<0.01;
    const grimoireWon=Math.random()<0.01;
    if(keyWon) awardDungeonKey("rare");
    if(elixirWon) awardElixir("minorElixir","rare");
    if(grimoireWon) awardInventoryItem("transmutationGrimoire","rare");
    return keyWon||elixirWon||grimoireWon;
  }

  // Migration grips sec→min sur le state en mémoire (au cas où localStorage non migré)
  useEffect(()=>{
    const needsMigration=Object.values(state.dailyLog).some(log=>log.grips!=null&&log.grips>60);
    if(needsMigration){
      setState(s=>({...s,dailyLog:migrateGripsToMin(s.dailyLog)}));
    }
  },[]);

  // Persistance
  useEffect(()=>{ saveState(state); },[state]);


  // File d’attente des animations de montée de niveau de stat
  useEffect(()=>{
    if(statDecadeUp || !statLevelQueue.length) return;
    const [next,...rest]=statLevelQueue;
    setStatLevelQueue(rest);
    setStatDecadeUp(next);
  },[statDecadeUp,statLevelQueue]);

  useEffect(()=>{
    if(completionUp || !completionQueue.length) return;
    const [next,...rest]=completionQueue;
    setCompletionQueue(rest);
    setCompletionUp(next);
  },[completionUp,completionQueue]);



  // Penalite jours manques (une seule fois au montage)
  useEffect(()=>{
    const t=todayStr();
    if(state.lastActiveDay&&state.lastActiveDay!==t){
      const diff=Math.round((new Date(t)-new Date(state.lastActiveDay))/86400000);
      if(diff>=2)setState(s=>({...s,totalXp:Math.max(0,s.totalXp-diff*10),streak:0}));
    }
  },[]);






  // ─── CALCULS DERIVES (dans l'ordre, sans circularite) ──────────────────


  const today = todayStr();
  const wk    = wkStr();

  useEffect(()=>{
    if((state.exerciseRotationByDay||{})[today]) return;
    setState(s=>ensureExerciseRotationForDay(s,today));
  },[today,state.exerciseRotationByDay]);

  const baseObjs = state.objectives||DEFS;
  const todayExerciseRotation=(state.exerciseRotationByDay||{})[today]||{};
  const objs = rotatedQuestObjects(baseObjs,todayExerciseRotation,state.stats,state.totalXp);
  const tLog  = state.dailyLog[today]||{};
  const wLog  = state.weeklyLog[wk]||{};
  const prestige = state.prestige||0;

  // Une seule sortie bonus par jour : Running ou Rando.
  const runQuestObj = objs.find(o=>o.id==="run") || DEFS.find(o=>o.id==="run");
  const hikeQuestObj = objs.find(o=>o.id==="walk") || DEFS.find(o=>o.id==="walk");
  const savedEnduranceChoice = (state.enduranceChoiceByDay||{})[today];
  const inferredEnduranceChoice = (Number(tLog.run)||0)>0 && (Number(tLog.walk)||0)>0
    ? ((Number(tLog.run)||0)>=(Number(tLog.walk)||0) ? "run" : "walk")
    : ((Number(tLog.run)||0)>0 ? "run" : ((Number(tLog.walk)||0)>0 ? "walk" : null));
  const enduranceChoiceId = savedEnduranceChoice==="run"||savedEnduranceChoice==="walk"
    ? savedEnduranceChoice
    : inferredEnduranceChoice;
  const selectedEnduranceQuest = enduranceChoiceId==="run" ? runQuestObj : enduranceChoiceId==="walk" ? hikeQuestObj : null;
  const enduranceChoicePlaceholder = {
    id:"endurance_choice",name:"Running ou Rando",icon:"🏃🏻 / 🥾",unit:"choix",
    daily:true,weekly:false,optional:true,stat:"Endurance",base:1,isEnduranceChoice:true
  };

  function chooseEnduranceQuest(id){
    if(id!=="run"&&id!=="walk") return;
    setState(s=>{
      const choices={...(s.enduranceChoiceByDay||{})};
      if(choices[today]==="run"||choices[today]==="walk") return s;
      const row=((s.dailyLog||{})[today])||{};
      const inferred=(Number(row.run)||0)>0 ? "run" : ((Number(row.walk)||0)>0 ? "walk" : null);
      choices[today]=inferred||id;
      return {...s,enduranceChoiceByDay:choices,lastActiveDay:todayStr()};
    });
  }

  function dailyBonusQuestObjects(){
    const others=objs.filter(o=>o.daily&&o.optional&&!o.bonusHidden&&o.id!=="run"&&o.id!=="walk");
    return sortStat([...others,selectedEnduranceQuest||enduranceChoicePlaceholder]);
  }

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
  const globalLevel = getGlobalLevelInfo(effectiveXp);

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

  // 6. XP du jour : journalières + XP ponctuelle gagnée aujourd'hui
  // Inclut maintenant les quêtes urgentes et les salles de donjon.
  const sameDayTs = ts => ts && new Date(ts).toDateString()===new Date().toDateString();
  const sumXpPairs = pairs => (pairs||[]).reduce((s,p)=>s+(Number(p?.xp)||0),0);
  const sqEarnedXp = q => {
    if(!q) return 0;
    if(q.tiers && q.tiers.length>0){
      const prog = Number(q.progress||0);
      return q.tiers.reduce((sum,tier)=>{
        if(prog < tier.at) return sum;
        return sum + (tier.xp||0) + (tier.xp2||0) + (tier.xp3||0);
      },0);
    }
    if(q.completedAt || (q.progress||0)>=(q.target||1)){
      return (q.xp||0) + (q.xp2||0) + (q.xp3||0);
    }
    return 0;
  };
  const extraToday = (state.dailyExtraXp&&state.dailyExtraXp[today]) || {};
  const extraTodayXp = Object.values(extraToday).reduce((s,v)=>s+(Number(v)||0),0);
  const legacyStreakTodayXp = extraToday.streak ? 0 : (
    state.streakBonusDay===today
      ? 250 + (((state.streak||0)>0 && (state.streak||0)%7===0 && (state.streakMilestones||[]).includes(state.streak)) ? 500 : 0)
      : 0
  );
  const legacySqTodayXp = extraToday.sq ? 0 : (state.specialQuests||[])
    .filter(q=>sameDayTs(q.completedAt))
    .reduce((s,q)=>s+sqEarnedXp(q),0);
  const legacyActiveDungeonTodayXp = extraToday.dungeon ? 0 : (()=>{
    const ad=state.activeDungeon;
    if(!ad || !sameDayTs(ad.startedAt)) return 0;
    const dg=DUNGEONS.find(d=>d.id===ad.id);
    if(!dg) return 0;
    return (ad.completedRooms||[]).reduce((sum,idx)=>sum+sumXpPairs(dungeonRoomRewardPairs(dg,idx)),0);
  })();
  const legacyCompletedDungeonTodayXp = extraToday.dungeon ? 0 : (state.dungeonLog||[])
    .filter(e=>sameDayTs(e.completedAt))
    .reduce((s,e)=>s+(Number(e.xp)||0),0);

  const todayXp = Object.entries(tLog).reduce((s,[id,a])=>{
    const o=objs.find(x=>x.id===id); if(!o) return s;
    const b = o.validateAt != null
      ? Number(o.validateAt)
      : (Number.isFinite(Number(o.target)) ? Number(o.target) : (o.base && !RANK_BASES[o.id] ? o.base : getRankBase(o.id, ri, prestige, state.stats)));
    return s + calcQuestTotalXp(o, a, b);
  },0) + extraTodayXp + legacyStreakTodayXp + legacySqTodayXp + legacyActiveDungeonTodayXp + legacyCompletedDungeonTodayXp;

  // 7. Quetes journalieres obligatoires toutes faites ?
  const reqDailyObjs  = objs.filter(o=>!o.optional&&o.daily);
  // Quêtes actives pour un jour donné (exclut les quêtes ajoutées après ce jour)
  const activeOn = (day) => reqDailyObjs.filter(o=>!o.startDate||o.startDate<=day);
  // Variante et objectif réellement applicables pour un jour donné.
  const questForDay = (obj,day) => {
    if(!obj || !isExerciseFamilyQuestId(obj.id)) return obj;
    const saved=(state.exerciseRotationByDay||{})[day]||{};
    const rotation={
      push:saved.push||LEGACY_EXERCISE_DEFAULTS.push,
      abs:saved.abs||LEGACY_EXERCISE_DEFAULTS.abs,
      legs:saved.legs||LEGACY_EXERCISE_DEFAULTS.legs
    };
    return rotatedQuestObjects(baseObjs,rotation,state.stats,state.totalXp).find(q=>q.id===obj.id)||obj;
  };
  // Base applicable pour un jour donné (gère les rotations et baseHistory).
  const getBaseForDay = (obj,day) => {
    if(!obj) return 0;
    const dayObj=questForDay(obj,day);
    if(dayObj.validateAt != null) return Number(dayObj.validateAt);
    if(Number.isFinite(Number(dayObj.target))) return Number(dayObj.target);
    if(dayObj.baseHistory&&day){
      for(const h of dayObj.baseHistory){
        if(day<=h.until) return h.base;
      }
    }
    return getRankBase(dayObj.id, ri, prestige, state.stats);
  };
  // Seuil pour considérer une quête comme "faite" (streak/historique)
  // Si validateAt est défini, on l'utilise ; sinon getBaseForDay (= la base)
  const getValidateThreshold = (obj, day) => {
    if(obj.validateAt != null) return obj.validateAt;
    return getBaseForDay(obj, day);
  };

  function getEffectiveTarget(objId, isWeekly=false){
    const obj = objs.find(o=>o.id===objId);
    if(obj && obj.validateAt != null) return obj.validateAt;
    if(obj && Number.isFinite(Number(obj.target))) return Number(obj.target);
    return getRankBase(objId, ri, prestige, state.stats);
  }

  // Une journée ayant déjà accordé le bonus de streak est définitivement validée.
  // Cela empêche une hausse ultérieure des objectifs (notamment les rotations
  // d'exercices dépendantes du niveau de Force) d'invalider rétroactivement
  // l'Historique ou la série.
  const hadValidatedDailyCompletion = day => !!(
    state.streakBonusDay===day ||
    (Number(((state.dailyExtraXp||{})[day]||{}).streak)||0)>0
  );

  const allDailyDone = (()=>{
    if(state.questDebt&&state.questDebt.status==="active") return false;
    return reqDailyObjs.every(o=>(tLog[o.id]||0)>=getEffectiveTarget(o.id));
  })();

  const bonusQuestObjsForCompletion = dailyBonusQuestObjects();
  const allBonusDone = bonusQuestObjsForCompletion.length>0 && bonusQuestObjsForCompletion.every(o=>{
    if(o.isEnduranceChoice) return false;
    const target=(o.target&&!o.binary)?o.target:getEffectiveTarget(o.id);
    const value=tLog[o.id]||0;
    return o.binary ? value>=1 : value>=target;
  });

  // 8. Streak : on remonte à partir d'hier (aujourd'hui peut être incomplet sans casser le streak)
  const computedStreak = (()=>{
    let streak=0;
    const debt=state.questDebt;
    const resolved=state.debtResolvedDays||{};
    const isProtectedDebtDay=day=>!!(
      resolved[day] ||
      (debt && debt.sourceDay===day && debt.status==="active")
    );
    const d=new Date(today);
    d.setDate(d.getDate()-1);
    for(let i=0;i<365;i++){
      const dk=d.toISOString().slice(0,10);
      const log=state.dailyLog[dk]||{};
      const naturallyDone = hadValidatedDailyCompletion(dk) ||
        activeOn(dk).every(o=>(log[o.id]||0)>=getValidateThreshold(o,dk));
      if(naturallyDone){
        streak++;
      }else if(isProtectedDebtDay(dk)){
        // Dette active : journée gelée, non comptée mais elle ne casse pas le streak.
        // Dette remboursée : journée restaurée rétroactivement.
        if(resolved[dk]) streak++;
      }else{
        break;
      }
      d.setDate(d.getDate()-1);
    }
    const todayLog=state.dailyLog[today]||{};
    const todayDone=activeOn(today).every(o=>(todayLog[o.id]||0)>=getEffectiveTarget(o.id));
    if(todayDone && !(debt&&debt.status==="active")) streak++;
    return streak;
  })();

  // 9. Bonus hebdo supprimé : Running et Rando sont désormais des quêtes bonus.
  const weeklyDone = false;

  // 10. Quete speciale
  const [now,setNow] = useState(Date.now());
  useEffect(()=>{
    const id=setInterval(()=>setNow(Date.now()),30000); // tick toutes les 30s
    return ()=>clearInterval(id);
  },[]);
  useEffect(()=>{
    const day=eventDayStr(now);
    if(state.eventDay!==day){
      setState(s=>applyDailyEventReset(s,now));
    }
  },[now,state.eventDay]);
  const sqs         = state.specialQuests||[];
  const activeSq    = sqs.find(q=>!q.completedAt&&now<q.expiresAt)||null;
  const completedSq = activeSq ? null : (sqs.find(q=>q.completedAt&&(now-q.completedAt)<86400000)||null);
  const sqCooldownUntil = state.sqCooldownUntil||null;
  const sqCooldownActive = sqCooldownUntil && now < sqCooldownUntil;
  const sqReady = !activeSq && !sqCooldownActive;
  const sqRerollUsed = state.sqRerollDay===today;

  // Réparation immédiate d'une carte urgente vide :
  // aucune quête active ni complétée depuis le dernier reset de 7 h.
  useEffect(()=>{
    const resetStart=current7AMStart(now);
    const resetEnd=next7AM(resetStart);
    const list=state.specialQuests||[];
    const hasValidActive=list.some(q=>!q.completedAt&&now<(q.expiresAt||0));
    const hasCompletedCurrentWindow=list.some(q=>q.completedAt&&q.completedAt>=resetStart&&q.completedAt<resetEnd);
    if(hasValidActive||hasCompletedCurrentWindow) return;
    setState(s=>{
      const t=Date.now();
      const start=current7AMStart(t);
      const end=next7AM(start);
      const current=s.specialQuests||[];
      const stillActive=current.some(q=>!q.completedAt&&t<(q.expiresAt||0));
      const alreadyCompleted=current.some(q=>q.completedAt&&q.completedAt>=start&&q.completedAt<end);
      if(stillActive||alreadyCompleted) return s;
      const result=pickRandomSq(
        current.filter(q=>!q.completedAt).map(q=>q.id).filter(Boolean),
        s.sqStatCycle,
        s.completedSqLog
      );
      if(!result) return s;
      const {tpl,pickedStat,cycleReset}=result;
      const sq={...tpl,sqid:"sq_"+t,progress:0,startedAt:t,expiresAt:next7AM(t),completedAt:null};
      const newCycle=cycleReset?[pickedStat]:[...(s.sqStatCycle||[]),pickedStat];
      return {
        ...s,
        specialQuests:[...current.filter(q=>q.completedAt),sq],
        sqStatCycle:newCycle,
        sqCooldownUntil:next7AM(t),
        sqRerollDay:null,
        lastActiveDay:todayStr()
      };
    });
  },[now,state.specialQuests,state.sqCooldownUntil]);

  const activeDungeonTpl = state.activeDungeon ? DUNGEONS.find(d=>d.id===state.activeDungeon.id) : null;
  const activeDungeon = state.activeDungeon && activeDungeonTpl && !state.activeDungeon.completedAt && now < state.activeDungeon.expiresAt
    ? {...activeDungeonTpl,...state.activeDungeon,tpl:activeDungeonTpl}
    : null;
  const dungeonRunDay = state.dungeonRunDay||null;
  const dungeonWeekCount = (()=>{
    const launched = new Set();
    (state.dungeonLog||[]).forEach(entry=>{
      const ts=entry && (entry.startedAt||entry.completedAt);
      if(ts && wkStr(new Date(ts))===wk) launched.add(entry.runId||("log_"+ts+"_"+(entry.id||"")));
    });
    const ad=state.activeDungeon;
    if(ad && ad.startedAt && wkStr(new Date(ad.startedAt))===wk) launched.add(ad.runId||("active_"+ad.startedAt));
    return launched.size;
  })();
  const dungeonDailyUsed = dungeonRunDay===today;
  const dungeonSkipDay = state.dungeonSkipDay||null;
  const dungeonSkippedToday = dungeonSkipDay===today;
  const dungeonKeyRollDone = state.dungeonKeyRollDay===today;
  const dungeonKeys = Math.max(0,Math.floor(Number(state.dungeonKeys)||0));
  const dungeonKeyAvailable = dungeonKeys>0;
  const dungeonAccessOpen = state.dungeonAccessOpen===true;
  const activeElixir = state.activeElixir && now<(state.activeElixir.expiresAt||0) ? state.activeElixir : null;
  const urgentDoneToday = (state.specialQuests||[]).some(q=>{
    if(!q || !q.completedAt) return false;
    const d=new Date(q.completedAt);
    const day=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    return day===today;
  });
  const dungeonLootConditionsMet = allDailyDone && allBonusDone && urgentDoneToday;
  const dungeonCanStart = !state.activeDungeon && !dungeonDailyUsed && dungeonWeekCount<3 && dungeonAccessOpen;

  const dailyEvent = state.dailyEvent && state.dailyEvent.type!=="none" && now < (state.dailyEvent.expiresAt||0)
    ? state.dailyEvent
    : null;

  // Flags bonus
  const bonusGiven       = state.streakBonusDay===today;
  const weeklyBonusGiven = state.weeklyBonusWk===wk;
  const missedDays       = (()=>{
    if(!state.lastActiveDay)return 0;
    const d=Math.round((new Date(today)-new Date(state.lastActiveDay))/86400000);
    return d>1?d:0;
  })();


  function triggerStatDecadeOverlay(beforeStats,afterStats,delay=650){
    const hits=[];
    STATS.forEach(stat=>{
      const before=Number((beforeStats||{})[stat])||0;
      const after=Number((afterStats||{})[stat])||0;
      if(after<=before) return;
      for(let level=before+1;level<=after;level++){
        const color=STAT_COLOR[stat] || rank.color || "#fbbf24";
        hits.push({
          stat,
          label:STAT_LBL[stat] || stat,
          level,
          color,
          glow:color+"66"
        });
      }
    });
    if(!hits.length) return;
    setTimeout(()=>setStatLevelQueue(q=>[...q,...hits]),delay);
  }

  function triggerProgressOverlay(beforeXp,beforeStats,afterXp,afterStats,delay=300){
    const beforeRank = getRankWithStats(beforeXp,beforeStats);
    const afterRank = getRankWithStats(afterXp,afterStats);
    const beforeLevel = getGlobalLevelInfo(beforeXp).level;
    const afterLevel = getGlobalLevelInfo(afterXp).level;
    const rankChanged = afterRank.id !== beforeRank.id;
    const levelChanged = afterLevel !== beforeLevel;

    triggerStatDecadeOverlay(beforeStats,afterStats,rankChanged||levelChanged ? delay+1200 : delay);

    if(!rankChanged && !levelChanged) return;

    setTimeout(()=>{
      if(rankChanged){
        setRankUp(levelChanged ? {...afterRank, level:afterLevel} : afterRank);
        return;
      }
      setLevelUp({
        level:afterLevel,
        color:afterRank.color,
        glow:afterRank.glow
      });
    },delay);
  }

  function questRecordUnit(unit,value){
    const n=Number(value)||0;
    const plurals={rep:"reps",page:"pages",min:"min",verre:"verres",repas:"repas",km:"km",contact:"contacts",action:"actions",objet:"objets","sér.":"sér."};
    if(n>1 && plurals[unit]) return plurals[unit];
    return unit || "";
  }

  function maybeTriggerQuestRecord(obj,prevVal,nextVal,delay=850){
    if(!obj || obj.binary || obj.weekly) return;
    const nextNumber=Number(nextVal)||0;
    if(nextNumber<=0) return;

    let best=0;
    Object.entries(state.dailyLog||{}).forEach(([day,log])=>{
      if(obj.id==="run" && day<RUN_RECORD_RESET_DAY) return;
      const v=Number(log&&log[obj.id]);
      if(Number.isFinite(v) && v>best) best=v;
    });

    // Pas d'animation sur la toute première valeur enregistrée : on célèbre seulement un vrai record battu.
    if(best<=0 || nextNumber<=best) return;

    const color=STAT_COLOR[obj.stat] || rank.color || "#fbbf24";
    const label=fmtNum(nextNumber)+" "+questRecordUnit(obj.unit,nextNumber);
    setTimeout(()=>{
      setRecordUp({
        title:"NOUVEAU RECORD",
        name:obj.name,
        icon:obj.icon,
        value:label,
        color,
        glow:color+"55",
        rankColor:rank.color,
        rankGlow:rank.glow
      });
      tryRareDungeonKeyDrop();
    },delay);
  }




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

  // Expiration : le donjon normal se rompt après 24 h ; le Boss de Rupture disparaît après son propre délai.
  useEffect(()=>{
    const ad=state.activeDungeon;
    if(!ad || ad.completedAt || now < (ad.expiresAt||0)) return;

    // Une rupture ne peut pas se reproduire : à la seconde expiration, le donjon se referme.
    if(ad.ruptureBoss){
      setState(s=>{
        const cur=s.activeDungeon;
        return cur&&cur.ruptureBoss&&Date.now()>=(cur.expiresAt||0) ? {...s,activeDungeon:null} : s;
      });
      return;
    }

    const dungeon=DUNGEONS.find(d=>d.id===ad.id);
    const boss=dungeon ? pickDungeonRuptureBoss(dungeon.id) : null;
    if(!dungeon || !boss){
      setState(s=>s.activeDungeon&&Date.now()>=(s.activeDungeon.expiresAt||0)?{...s,activeDungeon:null}:s);
      return;
    }

    // Le Boss de Rupture se referme au prochain passage de 7 h, comme les quêtes urgentes et les donjons.
    const t=Date.now();
    const ruptureBoss={...boss,startedAt:t,expiresAt:next7AM(t)};
    setState(s=>{
      const cur=s.activeDungeon;
      if(!cur || cur.ruptureBoss || Date.now()<(cur.expiresAt||0)) return s;
      return {...s,activeDungeon:{...cur,rupturedAt:t,ruptureBoss,expiresAt:ruptureBoss.expiresAt}};
    });
    setRuptureUp({
      dungeonTitle:dungeon.title,icon:dungeon.icon,
      name:boss.name,objective:boss.objective,
      rarityLabel:boss.rarityLabel,rarityColor:boss.rarityColor
    });
  },[now,state.activeDungeon?.expiresAt,state.activeDungeon?.ruptureBoss?.id]);

  // Échec automatique d’une dette non remboursée après son jour d’échéance
  useEffect(()=>{
    const debt=state.questDebt;
    if(!debt || debt.status!=="active") return;
    if(today<=debt.dueDay) return;
    setState(s=>s.questDebt&&s.questDebt.status==="active"
      ? {...s,questDebt:{...s.questDebt,status:"failed",failedAt:Date.now()}}
      : s
    );
  },[today,state.questDebt?.status,state.questDebt?.dueDay]);

  // Animations de complétion des groupes de quêtes — une seule fois par jour.
  // Clé de donjon : une clé garantie par journée totalement complétée
  // (toutes les journalières, la quête urgente et toutes les quêtes bonus).
  useEffect(()=>{
    if(!dungeonLootConditionsMet || dungeonKeyRollDone) return;
    setState(s=>{
      if(s.dungeonKeyRollDay===today) return s;
      return {
        ...s,
        dungeonKeyRollDay:today,
        dungeonKeyRollWon:true,
        dungeonKeyDay:today,
        dungeonKeys:Math.max(0,Math.floor(Number(s.dungeonKeys)||0))+1
      };
    });
    enqueueDungeonKeyLoot("guaranteed");
  },[dungeonLootConditionsMet,dungeonKeyRollDone,today]);

  useEffect(()=>{
    if(keyLootUp || !keyLootQueue.length) return;
    if(rankUp || levelUp || statDecadeUp || completionUp || streakUp || recordUp || dungeonUp || ruptureUp || urgentUp || debtUp || prestigeUp) return;
    const [next,...rest]=keyLootQueue;
    setKeyLootQueue(rest);
    setKeyLootUp(next);
  },[keyLootQueue,keyLootUp,rankUp,levelUp,statDecadeUp,completionUp,streakUp,recordUp,dungeonUp,ruptureUp,urgentUp,debtUp,prestigeUp]);

  useEffect(()=>{
    if(itemLootUp || !itemLootQueue.length) return;
    if(rankUp || levelUp || statDecadeUp || completionUp || streakUp || recordUp || keyLootUp || dungeonUp || ruptureUp || urgentUp || debtUp || prestigeUp || itemUseUp) return;
    const [next,...rest]=itemLootQueue;
    setItemLootQueue(rest);
    setItemLootUp(next);
  },[itemLootQueue,itemLootUp,rankUp,levelUp,statDecadeUp,completionUp,streakUp,recordUp,keyLootUp,dungeonUp,ruptureUp,urgentUp,debtUp,prestigeUp,itemUseUp]);

  useEffect(()=>{
    if(!allDailyDone || state.dailyCompletionAnimDay===today) return;
    setState(s=>s.dailyCompletionAnimDay===today?s:{...s,dailyCompletionAnimDay:today});
    setCompletionQueue(q=>[...q,{
      type:"daily",
      text:"Toutes les quêtes journalières ont été complétées"
    }]);
    tryRareDungeonKeyDrop();
  },[allDailyDone,today,state.dailyCompletionAnimDay]);

  useEffect(()=>{
    if(!allBonusDone || state.bonusCompletionAnimDay===today) return;
    setState(s=>s.bonusCompletionAnimDay===today?s:{...s,bonusCompletionAnimDay:today});
    setCompletionQueue(q=>[...q,{
      type:"bonus",
      text:"Toutes les quêtes bonus ont été complétées"
    }]);
    tryRareDungeonKeyDrop();
  },[allBonusDone,today,state.bonusCompletionAnimDay]);

  // Bonus streak + increment streak au moment ou toutes les quetes sont faites
  useEffect(()=>{
    if(!allDailyDone)return;
    setState(s=>{
      const t=todayStr();
      let next={...s};

      if(s.lastStreakDay!==t)next={...next,lastStreakDay:t};

      if(s.streakBonusDay!==t){
        const beforeXp = next.totalXp;
        const beforeStats = {...next.stats};

        let streakXpToday = 250;
        const sx={...next.statXp,Discipline:(next.statXp.Discipline||0)+250};
        next={...next,totalXp:next.totalXp+250,statXp:sx,stats:{...next.stats,Discipline:getLvl(sx.Discipline)},streakBonusDay:t};

        // Milestone tous les 7 jours de streak
        const newStreak=next.streak;
        const milestones=next.streakMilestones||[];
        let streakAnim = {
          title:"STREAK BONUS !",
          streak:newStreak,
          xp:250,
          subtitle:"+250 XP Discipline",
          color:STAT_COLOR.Discipline,
          glow:STAT_COLOR.Discipline+"66"
        };

        if(newStreak>0 && newStreak%7===0 && !milestones.includes(newStreak)){
          const milestoneXp=500;
          streakXpToday += milestoneXp;
          const sx2={...sx,Discipline:(sx.Discipline||0)+milestoneXp};
          next={...next,totalXp:next.totalXp+milestoneXp,statXp:sx2,stats:{...next.stats,Discipline:getLvl(sx2.Discipline)},streakMilestones:[...milestones,newStreak]};
          streakAnim = {
            title:"MILESTONE !",
            streak:newStreak,
            xp:streakXpToday,
            subtitle:"+750 XP Discipline",
            detail:newStreak+" jours de streak",
            color:STAT_COLOR.Discipline,
            glow:STAT_COLOR.Discipline+"66"
          };
        }

        setTimeout(()=>setStreakUp(streakAnim),300);

        const daily={...(next.dailyExtraXp||{})};
        const dayLog={...(daily[t]||{})};
        dayLog.streak=(dayLog.streak||0)+streakXpToday;
        daily[t]=dayLog;
        next={...next,dailyExtraXp:daily};

        triggerProgressOverlay(beforeXp,beforeStats,next.totalXp,next.stats,1800);
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
      const result=pickRandomSq(sqsNow.map(q=>q.id),s.sqStatCycle,s.completedSqLog);
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

  // Épreuves supprimées : pas de détection d'échec.



  function spawnFloat(txt,e){
    const id=Date.now()+Math.random();
    setFloats(f=>[...f,{id,txt}]);
    setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),2300);
  }

  const STAT_LBL2={"Force":"Force","Sante":"Sant\u00e9","Esprit":"Esprit","Endurance":"Endurance","Agilite":"Agilit\u00e9","Discipline":"Discipline"};
  function addXp(amount,stat,e,silent,showStat,skipEventBonus=false){
    setState(s=>{
      const el=s.activeElixir;
      const eventBonus = !skipEventBonus && el && Date.now()<(el.expiresAt||0) && (el.kind==="supremeElixir"||el.stat===stat)
        ? Math.round((Number(amount)||0)*(Number(el.pct)||0))
        : 0;
      const gain=(Number(amount)||0)+eventBonus;
      const nt=s.totalXp+gain;
      const sx={...s.statXp,[stat]:(s.statXp[stat]||0)+gain};
      const newStats={...s.stats,[stat]:getLvl(sx[stat])};
      const daily={...(s.dailyExtraXp||{})};
      if(eventBonus>0){
        const day=todayStr();
        const dayLog={...(daily[day]||{})};
        dayLog.eventBonus=(dayLog.eventBonus||0)+eventBonus;
        daily[day]=dayLog;
      }
      triggerProgressOverlay(s.totalXp,s.stats,nt,newStats,100);
      return {...s,totalXp:nt,statXp:sx,stats:newStats,dailyExtraXp:eventBonus>0?daily:(s.dailyExtraXp||{}),lastActiveDay:todayStr()};
    });
    if(e&&!silent){
      const lbl=showStat?("+"+Math.round(amount)+" XP "+( STAT_LBL2[showStat]||showStat)):("+"+Math.round(amount)+" XP");
      spawnFloat(lbl,e);
    }
  }



  function createQuestDebt(obj){
    if(!obj || !isDebtEligibleQuest(obj)) return;
    setState(s=>{
      if(s.questDebt && s.questDebt.status==="active") return s;
      const uses={...(s.debtUsesByWeek||{})};
      const week=wkStr();
      if((uses[week]||0)>=MAX_DEBTS_PER_WEEK) return s;
      const target=obj.validateAt != null
        ? Number(obj.validateAt)
        : (Number.isFinite(Number(obj.target)) ? Number(obj.target) : getRankBase(obj.id,ri,prestige,s.stats));
      const current=(s.dailyLog[today]&&s.dailyLog[today][obj.id])||0;
      const amount=Math.max(0,target-current);
      if(amount<=0) return s;
      uses[week]=(uses[week]||0)+1;
      return {
        ...s,
        questDebt:{
          id:obj.id,name:obj.name,icon:obj.icon,unit:obj.unit,
          stat:obj.stat,stat2:obj.stat2||null,
          amount,paid:0,target,current,
          sourceDay:today,dueDay:addDaysStr(today,1),
          createdAt:Date.now(),status:"active",
          rewards:debtRewardPairs(obj,current,target)
        },
        debtUsesByWeek:uses
      };
    });
    setConfirmDebt(null);
  }

  function repayDebtPortion(obj,val){
    const debt=state.questDebt;
    if(!debt || debt.status!=="active" || debt.id!==obj.id || debt.dueDay!==today) return {used:0,remaining:val};
    const left=Math.max(0,debt.amount-(debt.paid||0));
    const used=Math.min(left,val);
    const remaining=Math.max(0,val-used);
    if(used<=0) return {used:0,remaining:val};
    const willComplete=(debt.paid||0)+used>=debt.amount;
    setState(s=>{
      const current=s.questDebt;
      if(!current || current.status!=="active") return s;
      const paid=Math.min(current.amount,(current.paid||0)+used);
      if(paid<current.amount) return {...s,questDebt:{...current,paid}};
      const resolved={...(s.debtResolvedDays||{}),[current.sourceDay]:true};
      const daily={...(s.dailyExtraXp||{})};
      const dayLog={...(daily[today]||{})};
      const totalDebtXp=(current.rewards||[]).reduce((sum,r)=>sum+(r.xp||0),0);
      if(totalDebtXp>0) dayLog.debt=(dayLog.debt||0)+totalDebtXp;
      daily[today]=dayLog;
      return {
        ...s,
        questDebt:{...current,paid,status:"paid",completedAt:Date.now()},
        debtResolvedDays:resolved,
        dailyExtraXp:daily
      };
    });
    if(willComplete){
      (debt.rewards||[]).forEach(r=>addXp(r.xp,r.stat,null,true,null,true));
      setTimeout(()=>setDebtUp({
        name:debt.name,
        rewards:debt.rewards||[],
        color:STAT_COLOR[debt.stat]||rank.color,
        glow:(STAT_COLOR[debt.stat]||rank.color)+"66"
      }),500);
    }
    return {used,remaining};
  }

  function validate(obj,e,forceVal){
    if(e){e.preventDefault();e.stopPropagation();}
    const el=document.getElementById("qi_"+obj.id);
    const raw=(inputs.current[obj.id]||"").toString().replace(",",".");
    let val=parseFloat(raw); if(!val||val<=0)return;
    const debtSplit=repayDebtPortion(obj,val);
    val=debtSplit.remaining;
    inputs.current[obj.id]="";
    if(val<=0)return;
    if(el){el.value="";setTimeout(()=>{try{el.focus();}catch(_){}},50);}
    const cur=(obj.weekly)?(wLog[obj.id]||0):(tLog[obj.id]||0);
    let xp=0;
    let capJustReached_DISABLED=false;
    const b=obj.validateAt != null
      ? Number(obj.validateAt)
      : (Number.isFinite(Number(obj.target)) ? Number(obj.target) : getRankBase(obj.id,ri,prestige,state.stats));
    const prev=cur, next=cur+val;
    maybeTriggerQuestRecord(obj,prev,next);
    const alreadyCapped_DISABLED = false;
    const effectiveNext = next;
    const effectiveVal = val;
    // Tout objectif avec un base, non-binary, hors cas spéciaux (water/run) entre dans le système palier
    const isPalier = obj.base && !obj.binary && obj.id!=="water" && obj.id!=="run";

    // Cas spécial : quête avec tiers (repas équilibré x/2, etc.)
    if(obj.tiers && obj.tiers.length>0){
      // Sauvegarder le log d'abord
      setState(s=>{
        const d={...s.dailyLog};d[today]={...(d[today]||{}),[obj.id]:(d[today]?.[obj.id]||0)+val};
        if(obj.weekly){
          const w={...s.weeklyLog};w[wk]={...(w[wk]||{}),[obj.id]:(w[wk]?.[obj.id]||0)+val};
          return{...s,weeklyLog:w,dailyLog:d,lastActiveDay:todayStr()};
        }
        return{...s,dailyLog:d,lastActiveDay:todayStr()};
      });
      // Calculer les tiers franchis
      const crossedTiers = obj.tiers.filter(t => prev < t.at && next >= t.at);
      const xpByStat = {};
      if(crossedTiers.length>0){
        crossedTiers.forEach(t=>{
          addXp(t.xp, t.stat, null, true);
          xpByStat[t.stat] = (xpByStat[t.stat]||0) + t.xp;
          if(t.xp2 && t.stat2){
            addXp(t.xp2, t.stat2, null, true);
            xpByStat[t.stat2] = (xpByStat[t.stat2]||0) + t.xp2;
          }
        });
      }
      if(obj.overGoalXpPer){
        const overTarget = obj.target || obj.tiers[obj.tiers.length-1].at || obj.base || 0;
        const prevOver = Math.max(0, prev - overTarget);
        const nextOver = Math.max(0, next - overTarget);
        const overUnits = Math.max(0, nextOver - prevOver);
        const overXp = overUnits * obj.overGoalXpPer;
        if(overXp>0){
          const overStat = obj.overGoalStat || obj.stat;
          addXp(overXp, overStat, null, true);
          xpByStat[overStat] = (xpByStat[overStat]||0) + overXp;
        }
      }
      if(Object.keys(xpByStat).length>0){
        const lines = Object.entries(xpByStat).map(([stat,xp])=>"+"+Math.round(xp)+" XP "+(STAT_LBL2[stat]||stat));
        lines.forEach((txt,i)=>{
          const id=Date.now()+Math.random()+i*0.01;
          setFloats(f=>[...f,{id, y:(38+i*3)+"%", txt}]);
          setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),2300);
        });
      }
      return;
    }
    if(obj.id==="reading"){
      const espritXp=Math.max(0,effectiveVal)*obj.xpPer;
      setState(s=>{
        const d={...s.dailyLog};d[today]={...(d[today]||{}),[obj.id]:(d[today]?.[obj.id]||0)+val};
        let next2={...s,dailyLog:d,lastActiveDay:todayStr()};
        return next2;
      });
      if(espritXp>0){
        addXp(espritXp,obj.stat,null,true);
        const id=Date.now()+Math.random();
        setFloats(f=>[...f,{id,y:"38%",txt:"+"+Math.round(espritXp)+" XP "+(STAT_LBL2[obj.stat]||obj.stat)}]);
        setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),2300);
      } else if(!capJustReached_DISABLED && !alreadyCapped_DISABLED) spawnFloat("0 XP",e);
      return;
    }
    if(obj.binary){const was=cur>=b,now2=(cur+val)>=b; xp=(!was&&now2)?(obj.binaryXp||50):0;}
    else if(alreadyCapped_DISABLED){
      // Aucun cap : on log toujours la valeur
      xp=0;
    }
    else if(isPalier){
      // Utilise effectiveVal
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
      
      xp=effectiveVal*obj.xpPer;
      const totalAfter=effectiveNext;
      if(totalAfter>=b*2) xp+=Math.round(effectiveVal*obj.xpPer*0.5);
    }
    else{const nt=cur+val; if(cur>=b)xp=val*obj.xpPer; else if(nt<=b)xp=val*obj.xpPer; else xp=val*obj.xpPer;}
    setState(s=>{
      let next2 = s;
      if(obj.weekly){
        const w={...s.weeklyLog};w[wk]={...(w[wk]||{}),[obj.id]:(w[wk]?.[obj.id]||0)+val};
        // Stocker aussi dans dailyLog pour l'XP du jour
        const d2={...s.dailyLog};d2[today]={...(d2[today]||{}),[obj.id]:(d2[today]?.[obj.id]||0)+val};
        next2={...s,weeklyLog:w,dailyLog:d2,lastActiveDay:todayStr()};
      } else {
        const d={...s.dailyLog};d[today]={...(d[today]||{}),[obj.id]:(d[today]?.[obj.id]||0)+val};
        next2={...s,dailyLog:d,lastActiveDay:todayStr()};
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
    } else if(!capJustReached_DISABLED && !alreadyCapped_DISABLED) spawnFloat("0 XP",e);
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
        const rewardPairs = Object.entries(xpByStat).map(([stat,xp])=>({stat,xp}));
        if(nowComplete){
          triggerUrgentUp(sq,rewardPairs);
          tryRareDungeonKeyDrop();
        }else{
          const id1=Date.now()+Math.random();
          const id2=id1+0.1;
          const xpText = rewardPairs.map(p=>{
            const lbl = STAT_LBL2[p.stat] || STAT_LBL[p.stat] || p.stat || "";
            return "+"+p.xp+" XP"+(lbl?" "+lbl:"");
          }).join("\n");
          setFloats(f=>[...f,
            {id:id1,y:"35%",txt:"\u2728 PALIER FRANCHI !"},
            {id:id2,y:"40%",txt:xpText}
          ]);
          setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id1&&p.id!==id2)),1400);
        }
      }
      const awardedXp = crossedTiers.reduce((sum,t)=>
        sum + (t.xp||0) + (t.xp2||0) + (t.xp3||0),0);
      setState(s=>{
        const day=todayStr();
        const daily={...(s.dailyExtraXp||{})};
        const dayLog={...(daily[day]||{})};
        if(awardedXp>0) dayLog.sq=(dayLog.sq||0)+awardedXp;
        if(awardedXp>0) daily[day]=dayLog;
        return {...s,specialQuests:s.specialQuests.map(q=>q.sqid===sq.sqid?{...q,progress:newProg,completedAt:(nowComplete&&!wasComplete)?Date.now():q.completedAt}:q),
          sqCooldownUntil:(nowComplete&&!wasComplete)?next7AM():(s.sqCooldownUntil||null),
          dailyExtraXp:awardedXp>0?daily:(s.dailyExtraXp||{})};
      });
      return;
    }

    // Comportement standard : XP uniquement à la complétion totale
    if(!wasComplete&&nowComplete){
      const xpPairs = [
        {xp:sq.xp, stat:sq.stat||sqMainStat(sq)},
        sq.xp2&&sq.stat2 ? {xp:sq.xp2, stat:sq.stat2} : null,
        sq.xp3&&sq.stat3 ? {xp:sq.xp3, stat:sq.stat3} : null,
      ].filter(Boolean);
      xpPairs.forEach(p=>addXp(p.xp,p.stat,null,true));
      triggerUrgentUp(sq,xpPairs);
      tryRareDungeonKeyDrop();
    }
    const awardedXp = (!wasComplete&&nowComplete) ? [
      {xp:sq.xp, stat:sq.stat},
      sq.xp2&&sq.stat2 ? {xp:sq.xp2, stat:sq.stat2} : null,
      sq.xp3&&sq.stat3 ? {xp:sq.xp3, stat:sq.stat3} : null,
    ].filter(Boolean).reduce((sum,p)=>sum+(p.xp||0),0) : 0;
    setState(s=>{
      const day=todayStr();
      const daily={...(s.dailyExtraXp||{})};
      const dayLog={...(daily[day]||{})};
      if(awardedXp>0) dayLog.sq=(dayLog.sq||0)+awardedXp;
      if(awardedXp>0) daily[day]=dayLog;
      return {...s,specialQuests:s.specialQuests.map(q=>q.sqid===sq.sqid?{...q,progress:newProg,completedAt:(nowComplete&&!wasComplete)?Date.now():q.completedAt}:q),
        sqCooldownUntil:(nowComplete&&!wasComplete)?next7AM():(s.sqCooldownUntil||null),
        dailyExtraXp:awardedXp>0?daily:(s.dailyExtraXp||{})};
    });
  }

  function launchNewSq(){
    setState(s=>{
      const result=pickRandomSq((s.specialQuests||[]).filter(q=>!q.completedAt).map(q=>q.id),s.sqStatCycle,s.completedSqLog);
      if(!result)return s;
      const {tpl,pickedStat,cycleReset}=result;
      const sq={...tpl,sqid:"sq_"+Date.now(),progress:0,startedAt:Date.now(),expiresAt:next7AM(Date.now()),completedAt:null};
      const newCycle = cycleReset ? [pickedStat] : [...(s.sqStatCycle||[]),pickedStat];
      return {...s,specialQuests:[...s.specialQuests.filter(q=>q.completedAt),sq],sqStatCycle:newCycle,sqCooldownUntil:next7AM(Date.now())};
    });
  }

  function rerollSq(sq){
    if(!sq || sq.completedAt) return;
    const tDay=todayStr();
    if(state.sqRerollDay===tDay || (sq.progress||0)>0) return;

    setState(s=>{
      const active=(s.specialQuests||[]).find(q=>q.sqid===sq.sqid&&!q.completedAt);
      if(!active || (active.progress||0)>0 || s.sqRerollDay===tDay) return s;

      const cycleBase=[...(s.sqStatCycle||[])];
      if(cycleBase.length && cycleBase[cycleBase.length-1]===active.stat){
        cycleBase.pop();
      }

      const usedIds=(s.specialQuests||[]).filter(q=>!q.completedAt).map(q=>q.id).filter(Boolean);
      const result=pickRandomSq(usedIds,cycleBase,s.completedSqLog);
      if(!result) return s;

      const {tpl,pickedStat,cycleReset}=result;
      const t=Date.now();
      const newSq={...tpl,sqid:"sq_"+t,progress:0,startedAt:t,expiresAt:next7AM(t),completedAt:null};
      const newCycle=cycleReset ? [pickedStat] : [...cycleBase,pickedStat];

      const id=Date.now()+Math.random();
      setFloats(f=>[...f,{id,y:"35%",txt:"↻ QUÊTE RELANCÉE"}]);
      setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),1400);

      return {
        ...s,
        specialQuests:[...(s.specialQuests||[]).filter(q=>q.completedAt),newSq],
        sqStatCycle:newCycle,
        sqCooldownUntil:next7AM(t),
        sqRerollDay:tDay,
        lastActiveDay:tDay
      };
    });
  }

  function dungeonRoomRewardPairs(dungeon,roomIdx){
    if(!dungeon || !dungeon.reward) return [];
    const isBoss = roomIdx >= (dungeon.rooms||[]).length-1;
    const mainXp = isBoss ? 1350 : 225;
    const secondXp = isBoss ? 270 : 45;
    return [
      {xp:mainXp,stat:dungeon.reward.stat},
      dungeon.reward.stat2 ? {xp:secondXp,stat:dungeon.reward.stat2} : null,
      dungeon.reward.stat3 ? {xp:secondXp,stat:dungeon.reward.stat3} : null,
    ].filter(Boolean);
  }

  function dungeonRewardPairs(dungeon){
    if(!dungeon || !dungeon.reward) return [];
    const totals={};
    (dungeon.rooms||[]).forEach((_,idx)=>{
      dungeonRoomRewardPairs(dungeon,idx).forEach(r=>{ totals[r.stat]=(totals[r.stat]||0)+(r.xp||0); });
    });
    return Object.entries(totals).map(([stat,xp])=>({stat,xp}));
  }

  function startDungeon(id){
    setSelectedDungeonRoom(null);
    setState(s=>{
      const t=Date.now();
      const day=todayStr();
      const week=wkStr();
      const current=s.activeDungeon;
      if(current && !current.completedAt) return s;
      const launched = new Set();
      (s.dungeonLog||[]).forEach(entry=>{
        const ts=entry && (entry.startedAt||entry.completedAt);
        if(ts && wkStr(new Date(ts))===week) launched.add(entry.runId||("log_"+ts+"_"+(entry.id||"")));
      });
      if(current && current.startedAt && wkStr(new Date(current.startedAt))===week) launched.add(current.runId||("active_"+current.startedAt));
      if(s.dungeonRunDay===day || launched.size>=3) return s;
      if(s.dungeonAccessOpen!==true) return s;
      const dungeon=DUNGEONS.find(d=>d.id===id);
      if(!dungeon) return s;
      return {...s,activeDungeon:{id,runId:"dg_"+t,startedAt:t,expiresAt:next7AM(t),completedRooms:[],completedAt:null},dungeonRunDay:day,dungeonAccessOpen:false,dungeonKeyDay:null,dungeonKeyRollWon:false,lastActiveDay:day};
    });
  }

  function skipDungeonToday(){
    setState(s=>({...s,dungeonSkipDay:todayStr()}));
  }

  function validateDungeonRoom(roomIdxOverride=null){
    const selectedIdx = Number.isInteger(roomIdxOverride) ? roomIdxOverride : selectedDungeonRoom;
    setState(s=>{
      const ad=s.activeDungeon;
      if(!ad || ad.completedAt) return s;
      const dungeon=DUNGEONS.find(d=>d.id===ad.id);
      if(!dungeon) return {...s,activeDungeon:null};
      const t=Date.now();
      if(t>=ad.expiresAt) return s;

      if(ad.ruptureBoss){
        const rb=ad.ruptureBoss;
        const beforeXp=s.totalXp;
        const beforeStats=s.stats;
        let totalXp=s.totalXp;
        const statXp={...s.statXp};
        const stats={...s.stats};
        const ruptureRewards=[
          {xp:1350,stat:dungeon.reward.stat||dungeon.stat},
          dungeon.reward.stat2?{xp:270,stat:dungeon.reward.stat2}:null
        ].filter(Boolean);
        ruptureRewards.forEach(r=>{
          const el=s.activeElixir;
          const bonus=el&&Date.now()<(el.expiresAt||0)&&(el.kind==="supremeElixir"||el.stat===r.stat)?Math.round((r.xp||0)*(Number(el.pct)||0)):0;
          const gain=(r.xp||0)+bonus;
          totalXp+=gain;
          statXp[r.stat]=(statXp[r.stat]||0)+gain;
          stats[r.stat]=getLvl(statXp[r.stat]);
        });
        const awardedXp=ruptureRewards.reduce((sum,r)=>sum+(r.xp||0),0);
        const day=todayStr();
        const daily={...(s.dailyExtraXp||{})};
        const dayLog={...(daily[day]||{})};
        dayLog.dungeon=(dayLog.dungeon||0)+awardedXp;
        daily[day]=dayLog;
        const priorRoomXp=(ad.completedRooms||[]).reduce((sum,idx)=>sum+sumXpPairs(dungeonRoomRewardPairs(dungeon,idx)),0);
        const completedAt=t;
        const rewardText=ruptureRewards.map(r=>"+"+r.xp+" XP "+(STAT_LBL[r.stat]||r.stat)).join(" · ");
        triggerProgressOverlay(beforeXp,beforeStats,totalXp,stats,300);
        setTimeout(()=>setDungeonUp({
          label:"BOSS DE RUPTURE VAINCU",short:rb.name,icon:"☠️",
          color:rb.rarityColor||dungeon.color,reward:rewardText,
          subtitle:(rb.rarityLabel||"Boss")+" · "+dungeon.short,rupture:true
        }),200);
        return {
          ...s,totalXp,statXp,stats,dailyExtraXp:daily,activeDungeon:null,
          dungeonLog:[...(s.dungeonLog||[]),{
            id:dungeon.id,runId:ad.runId,startedAt:ad.startedAt,title:dungeon.title,stat:dungeon.stat,
            xp:priorRoomXp+awardedXp,completedAt,expiresAt:ad.expiresAt,
            rupture:true,ruptureBoss:{
              id:rb.id,name:rb.name,rarity:rb.rarity,rarityLabel:rb.rarityLabel,objective:rb.objective
            }
          }],
          lastActiveDay:day
        };
      }

      const completed=Array.isArray(ad.completedRooms)?ad.completedRooms:[];
      const nextIdx=selectedIdx;
      if(!Number.isInteger(nextIdx) || nextIdx<0 || nextIdx>=dungeon.rooms.length) return s;
      if(completed.includes(nextIdx)) return s;
      const bossIdx=dungeon.rooms.length-1;
      const allPreviousRoomsDone=Array.from({length:bossIdx},(_,i)=>i).every(i=>completed.includes(i));
      if(nextIdx===bossIdx && !allPreviousRoomsDone) return s;

      const beforeXp=s.totalXp;
      const beforeStats=s.stats;
      let totalXp=s.totalXp;
      const statXp={...s.statXp};
      const stats={...s.stats};
      const roomRewards=dungeonRoomRewardPairs(dungeon,nextIdx);
      roomRewards.forEach(r=>{
        const el=s.activeElixir;
        const bonus=el&&Date.now()<(el.expiresAt||0)&&(el.kind==="supremeElixir"||el.stat===r.stat)?Math.round((r.xp||0)*(Number(el.pct)||0)):0;
        const gain=(r.xp||0)+bonus;
        totalXp+=gain;
        statXp[r.stat]=(statXp[r.stat]||0)+gain;
        stats[r.stat]=getLvl(statXp[r.stat]);
      });
      const awardedXp = roomRewards.reduce((sum,r)=>sum+(r.xp||0),0);
      const day=todayStr();
      const daily={...(s.dailyExtraXp||{})};
      const dayLog={...(daily[day]||{})};
      if(awardedXp>0) dayLog.dungeon=(dayLog.dungeon||0)+awardedXp;
      if(awardedXp>0) daily[day]=dayLog;

      const nextCompleted=[...completed,nextIdx].sort((a,b)=>a-b);
      const isComplete=nextCompleted.length>=dungeon.rooms.length;
      setSelectedDungeonRoom(null);
      triggerProgressOverlay(beforeXp,beforeStats,totalXp,stats,300);

      if(!isComplete){
        return {...s,totalXp,statXp,stats,dailyExtraXp:daily,activeDungeon:{...ad,completedRooms:nextCompleted},lastActiveDay:todayStr()};
      }

      const completedAt=t;
      const rewards=dungeonRewardPairs(dungeon);
      const rewardText=rewards.map(r=>"+"+r.xp+" XP "+(STAT_LBL[r.stat]||r.stat)).join(" · ");
      setTimeout(()=>{
        setDungeonUp({title:dungeon.title,short:dungeon.short,icon:dungeon.icon,color:dungeon.color,reward:rewardText});
        awardElixir("majorElixir","guaranteed");
        if(Math.random()<0.10) awardElixir("minorElixir","rare");
        if(dungeon.id==="alchemist" && Math.random()<0.25) awardInventoryItem("transmutationGrimoire","rare");
      },200);
      return {...s,totalXp,statXp,stats,dailyExtraXp:daily,activeDungeon:null,dungeonLog:[...(s.dungeonLog||[]),{id:dungeon.id,title:dungeon.title,stat:dungeon.stat,xp:rewards.reduce((a,r)=>a+(r.xp||0),0),completedAt,expiresAt:ad.expiresAt||completedAt+86400000}],lastActiveDay:todayStr()};
    });
  }

  function fmtCD(ms){
    const d=Math.floor(ms/86400000),hh=Math.floor((ms%86400000)/3600000),mm=Math.floor((ms%3600000)/60000);
    if(d>0)return d+"j "+hh+"h"; if(hh>0)return hh+"h "+mm+"min"; return mm+"min";
  }


function questBadgeStyle(color, filled=false, extra=""){
  return "display:inline-flex;align-items:center;justify-content:center;height:13px;min-width:34px;padding:0 4px;border-radius:3px;font-family:Orbitron,sans-serif;font-size:7.5px;font-weight:700;letter-spacing:0.65px;line-height:1;border:1px solid "+color+"55;color:"+color+";background:"+(filled?color+"22":"transparent")+";flex-shrink:0;white-space:nowrap;"+extra;
}
function QuestBadge({label,color,filled=false,extra=""}){
  return h("span",{style:questBadgeStyle(color,filled,extra)},label);
}
const WEEKLY_BADGE_COLOR = "#818cf8";
const BONUS_BADGE_COLOR = "#fbbf24";

  // ─── SOUS-COMPOSANTS ──────────────────────────────────────────────────

  function QI({obj}){
    const isWeekly = obj.weekly;
    const t = getEffectiveTarget(obj.id, isWeekly);
    // Si obj.target est défini sans binary, on l'utilise pour l'affichage (ex: protein 1/2 → 2/2)
    const displayTarget = (obj.target && !obj.binary) ? obj.target : t;
    const d = isWeekly ? (wLog[obj.id]||0) : (tLog[obj.id]||0);

    const effectiveT = t;
    const done=obj.binary?(d>=1):(d>=effectiveT);


    // Quêtes binaires : boutons Échec / Succès
    if(obj.binary){
      function setBinary(val,e){
        const curRaw=(obj.weekly)?wLog[obj.id]:tLog[obj.id];
        const cur=curRaw||0;
        const wasD=cur>=1;
        const xp=(!wasD&&val>=1)?obj.binaryXp:0;
        const cx=e?e.clientX:200, cy=e?e.clientY:300;
        setState(s=>{
          const d2={...s.dailyLog};
          d2[today]={...(d2[today]||{}),[obj.id]:val};
          let next={...s,dailyLog:d2,lastActiveDay:todayStr()};

          return next;
        });

        if(xp>0){
          const id=Date.now()+Math.random();
          setFloats(f=>[...f,{id,x:cx,y:cy,txt:"+"+xp+" XP "+(STAT_LBL[obj.stat]||obj.stat)}]);
          setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),1300);
          setState(s=>{
            const sx={...s.statXp,[obj.stat]:(s.statXp[obj.stat]||0)+xp};
            const st={...s.stats,[obj.stat]:getLvl(sx[obj.stat])};
            const nt=s.totalXp+xp;
            triggerProgressOverlay(s.totalXp,s.stats,nt,st,100);
            return {...s,totalXp:nt,statXp:sx,stats:st,lastActiveDay:todayStr()};
          });
        }
      }
      const validated = tLog[obj.id] !== undefined;
      const failFlex = validated && !done ? 3 : 1;
      const succFlex = validated && done ? 3 : 1;
      return h("div",{class:"qi "+(done?"done":"")},
        h("div",{class:"qhdr",style:"align-items:center",style:"display:flex;justify-content:space-between;align-items:flex-start;gap:5px"},
          h("div",{class:"qname",style:"align-items:center;gap:8px",style:"flex:1;min-width:0;display:flex;align-items:center;gap:7px;line-height:1.25;white-space:normal;overflow:visible;min-height:18px"},QuestIcon(obj.id,obj.icon,14,"width:18px;height:18px;margin-top:0"),h("span",{style:"line-height:1.25;white-space:normal;overflow:visible;text-overflow:clip;display:inline-flex;align-items:center;min-height:18px"},obj.name)),
          h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:0.5px;text-align:right;white-space:nowrap;flex-shrink:0;line-height:1.25;padding-top:0"},
            (obj.binaryXp+" XP "+(STAT_LBL[obj.stat]||obj.stat))
          )
        ),
        h("div",{style:"display:flex;gap:8px;margin-top:8px"},
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
    const rankColor = rank.color || "#9ca3af";
    const isCapped = false;
    let barColor = rankColor;
    // Barre alignée sur Historique :
    // en cours = hachurée, complétée = pleine, dépassée = pleine + glow
    const fillStateClass = isCapped || over
      ? " over"
      : (d>=effectiveT&&effectiveT>0)
        ? " done"
        : (pct>0 ? " partial" : "");
    const barInnerStyle = "width:"+(isCapped?100:Math.min(100,pct))+"%";
    return h("div",{class:"qi "+(d>=effectiveT&&effectiveT>0?"done":""),style:""},
      h("div",{class:"qhdr",style:"align-items:center",style:"display:flex;justify-content:space-between;align-items:flex-start;gap:8px"},
        h("div",{class:"qname",style:"align-items:center;gap:8px",style:"flex:1;min-width:0;display:flex;align-items:center;gap:8px;white-space:normal;overflow:visible;line-height:1.25;min-height:18px;flex-wrap:wrap"},
          QuestIcon(obj.id,obj.icon,14,"width:18px;height:18px;margin-top:0;line-height:1"),
          h("span",{style:"white-space:normal;overflow:visible;text-overflow:clip;line-height:1.25;word-break:normal;display:inline-flex;align-items:center;min-height:18px"},obj.name),
          isWeekly&&h(QuestBadge,{label:"HEBDO",color:WEEKLY_BADGE_COLOR}),
        ),
        h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:0.5px;text-align:right;white-space:nowrap;flex-shrink:0;line-height:1.25;align-self:flex-start;padding-top:0"},
          obj.tiers
            ?h(Fragment,null,
                ...obj.tiers.map((tier,i)=>{
                  const primaryStat = STAT_LBL[tier.stat]||tier.stat;
                  const secondaryStat = tier.stat2 ? (STAT_LBL[tier.stat2]||tier.stat2) : null;
                  const thirdStat = tier.stat3 ? (STAT_LBL[tier.stat3]||tier.stat3) : null;
                  let rewardText = tier.xp+" XP "+primaryStat;
                  if(tier.xp2 && tier.stat2){
                    rewardText += tier.xp2===tier.xp ? " + "+secondaryStat : " + "+tier.xp2+" XP "+secondaryStat;
                  }
                  if(tier.xp3 && tier.stat3){
                    rewardText += tier.xp3===tier.xp ? " + "+thirdStat : " + "+tier.xp3+" XP "+thirdStat;
                  }
                  return h("div",{key:i,style:"opacity:"+(d>=tier.at?"1":"0.6")+";white-space:nowrap"},(d>=tier.at?"\u2713 ":"")+rewardText);
                }),
                obj.overGoalXpPer&&h("div",{style:"opacity:"+(d>(obj.target||obj.base||0)?"1":"0.6")+";white-space:nowrap"},"+"+obj.overGoalXpPer+" XP/"+obj.unit+" au-delà")
              )
            :obj.binary
              ?(obj.binaryXp+" XP "+(STAT_LBL[obj.stat]||obj.stat))
              :obj.stat2
                ?h(Fragment,null,
                    h("div",null,obj.xpPer+" XP/"+obj.unit+" "+(STAT_LBL[obj.stat]||obj.stat)),
                    h("div",null,(obj.xpPer2||obj.xpPer)+" XP/"+obj.unit+" "+(STAT_LBL[obj.stat2]||obj.stat2))
                  )
                :(obj.xpPer+" XP/"+obj.unit+" "+(STAT_LBL[obj.stat]||obj.stat))
        )
      ),
      h("div",{class:"qrow"},
        h(Fragment,null,
            h("div",{class:"qbar"},h("div",{class:"qfill"+fillStateClass,style:barInnerStyle})),
            h("div",{class:"qxp",style:"white-space:nowrap;min-width:82px;text-align:right;flex-shrink:0"},fmtNum(d)+"/"+fmtNum(displayTarget)+" "+((d>1||displayTarget>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres",repas:"repas",contact:"contacts",action:"actions"}[obj.unit]||obj.unit))
          )
      ),
      (!obj.optional&&!obj.weekly&&isDebtEligibleQuest(obj)&&d<effectiveT)&&h("div",{style:"margin-top:8px"},
        state.questDebt&&state.questDebt.status==="active"&&state.questDebt.id===obj.id
          ? h("div",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:#f59e0b;letter-spacing:.8px;text-transform:uppercase"},"Dette active : "+fmtNum(state.questDebt.paid||0)+"/"+fmtNum(state.questDebt.amount)+" "+state.questDebt.unit)
          : (!state.questDebt||state.questDebt.status!=="active")&&((state.debtUsesByWeek||{})[wk]||0)<MAX_DEBTS_PER_WEEK
            ? h("button",{
                onClick:()=>setConfirmDebt({obj,missing:Math.max(0,effectiveT-d)}),
                style:"width:100%;padding:8px;border-radius:8px;border:1px solid rgba(245,158,11,.45);background:rgba(245,158,11,.06);color:#f59e0b;font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:1px;text-transform:uppercase;cursor:pointer"
              },"Reporter les "+fmtNum(Math.max(0,effectiveT-d))+" "+obj.unit+" manquants")
            : null
      ),
      (()=>{
        // Quête avec tiers (ex: protein x/2) : bouton unique +1 unité
        if(obj.tiers && obj.tiers.length>0){
          const isMax = !obj.overGoalXpPer && d >= (obj.target||obj.tiers[obj.tiers.length-1].at);
          if(isMax) return null;
          const isLhh = obj.id==="lhh_contacts" || obj.id==="lhh_actions";
          const unitSing = obj.unit;
          const unitPlur = ({contact:"contacts",action:"actions"}[obj.unit]||obj.unit);
          return h("div",{style:"display:flex;gap:8px;margin-top:8px"},
            h("button",{
              onClick:e=>{inputs.current[obj.id]="1";validate(obj,e);},
              style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s"
            },"+1 "+unitSing),
            isLhh&&h("button",{
              onClick:e=>{inputs.current[obj.id]="10";validate(obj,e);},
              style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s"
            },"+10 "+unitPlur)
          );
        }
        const QUICK_IDS=["push","abs","squats","negative_pullups","calves","reading","flex","balance","grips","med","water","mob"];
        const unitLabel={push:obj.unit,abs:obj.unit,squats:obj.unit,negative_pullups:"rep",calves:obj.unit,reading:"min",flex:"min",balance:"min",grips:"min",med:"min",water:"verre",mob:"min"};
        const unitLabelPlural={push:obj.unit==="rep"?"reps":obj.unit,abs:obj.unit==="rep"?"reps":obj.unit,squats:obj.unit==="rep"?"reps":obj.unit,negative_pullups:"reps",calves:"reps",reading:"min",flex:"min",balance:"min",grips:"min",med:"min",water:"verres",mob:"min"};
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
    const isWeeklyRow = isW || obj.weekly;
    const t=getEffectiveTarget(obj.id), d=isWeeklyRow?(wLog[obj.id]||0):(tLog[obj.id]||0);
    const displayTarget = (obj.target && !obj.binary) ? obj.target : t;
    const pct=Math.min(100,(d/displayTarget)*100), done=d>=displayTarget, over=d>displayTarget;
    const validated=isWeeklyRow?(wLog[obj.id]!==undefined):(tLog[obj.id]!==undefined);
    if(obj.binary){
      return h("div",{style:"display:flex;align-items:center;gap:8px;margin-bottom:8px"},
        QuestIcon(obj.id,obj.icon,14),
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
    const isCapped = false;
    const rankColor = rank.color || "#9ca3af";
    // Barre alignée sur Historique :
    // en cours = hachurée, complétée = pleine, dépassée = pleine + glow
    const fillStateClass = isCapped || over
      ? " over"
      : (done ? " done" : (pct>0 ? " partial" : ""));
    const barInnerStyle = "width:"+(isCapped?100:Math.min(100,pct))+"%";
    return h("div",{style:"display:flex;align-items:center;gap:8px;margin-bottom:8px"},
      QuestIcon(obj.id,obj.icon,14),
      h("div",{style:"flex:1"},
        h("div",{style:"font-size:12px;color:var(--tx);margin-bottom:3px;display:flex;justify-content:space-between;align-items:center"},
          h("div",{style:"display:flex;align-items:flex-start;gap:6px;min-width:0;flex:1;white-space:normal;line-height:1.25"},
            h("span",{style:"white-space:normal;line-height:1.25;word-break:normal"},obj.name),
            (obj.weekly)&&h(QuestBadge,{label:"HEBDO",color:WEEKLY_BADGE_COLOR}),
          ),
          h("div",{style:"display:flex;align-items:center;gap:6px"},
            h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:"+(d>=displayTarget?"var(--rc)":d>0?"var(--tx)":"var(--td)")},fmtNum(d)+"/"+fmtNum(displayTarget)+" "+((d>1||displayTarget>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres",repas:"repas",contact:"contacts",action:"actions"}[obj.unit]||obj.unit)),
            h("span",{style:"font-family:Orbitron,sans-serif;font-size:11px;font-weight:700;color:#4ade80;width:10px;text-align:center"},done?"\u2713":"")
          )
        ),
        h("div",{class:"qbar"},h("div",{class:"qfill"+fillStateClass,style:barInnerStyle}))
      )
    );
  }

  function EnduranceChoiceItem({mode="quest"}={}){
    if(selectedEnduranceQuest){
      return mode==="home"
        ? h(RR,{obj:selectedEnduranceQuest,isW:false})
        : h(QI,{obj:selectedEnduranceQuest});
    }
    const color=STAT_COLOR.Endurance||"#22d3ee";
    const buttonStyle="flex:1;min-width:0;min-height:38px;padding:0 8px;border-radius:9px;border:1px solid "+color+"55;background:"+color+"0d;color:"+color+";font-family:Orbitron,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;line-height:1.2";
    return h("div",{class:"qi",style:"padding-bottom:10px"},
      h("div",{class:"qhdr",style:"display:flex;justify-content:space-between;align-items:flex-start;gap:8px"},
        h("div",{class:"qname",style:"flex:1;min-width:0;display:flex;align-items:center;gap:8px;line-height:1.25"},
          QuestIcon("endurance_choice","🏃🏻",14,"width:18px;height:18px"),
          h("span",null,"Running ou Rando")
        ),
        h(QuestBadge,{label:"CHOIX",color})
      ),
      h("div",{style:"display:flex;gap:8px;margin-top:10px"},
        h("button",{onClick:()=>chooseEnduranceQuest("run"),style:buttonStyle},
          h("span",{style:"font-size:15px"},"🏃🏻"),
          h("span",{style:"font-size:10px;font-weight:800;letter-spacing:.7px"},"Running")
        ),
        h("button",{onClick:()=>chooseEnduranceQuest("walk"),style:buttonStyle},
          h("span",{style:"font-size:15px"},"🥾"),
          h("span",{style:"font-size:10px;font-weight:800;letter-spacing:.7px"},"Rando")
        )
      )
    );
  }

  function sqMainStat(sq){
    if(sq&&sq.stat) return sq.stat;
    const map=activeSpecialQuestMap();
    return (sq&&sq.id&&map[sq.id]&&map[sq.id].stat) || null;
  }

  function rewardLineText(item){
    const safeStat = item.stat || (item.id ? sqMainStat(item) : null);
    const primaryStat = STAT_LBL[safeStat] || safeStat || "";
    const secondaryStat = item.stat2 ? (STAT_LBL[item.stat2] || item.stat2) : null;
    const thirdStat = item.stat3 ? (STAT_LBL[item.stat3] || item.stat3) : null;
    let rewardText = (item.xp||0)+" XP"+(primaryStat?" "+primaryStat:"");
    if(item.xp2 && item.stat2){
      rewardText += item.xp2===(item.xp||0) ? " + "+secondaryStat : " + "+item.xp2+" XP "+secondaryStat;
    }
    if(item.xp3 && item.stat3){
      rewardText += item.xp3===(item.xp||0) ? " + "+thirdStat : " + "+item.xp3+" XP "+thirdStat;
    }
    return rewardText;
  }

  function sqRewardLines(sq){
    if(sq?.tiers && sq.tiers.length>0){
      return sq.tiers.map((tier,i)=>({
        key:"tier_"+i,
        at:tier.at,
        text:rewardLineText(tier)
      }));
    }
    return [
      sq?.xp ? {key:"xp1", text:rewardLineText({id:sq.id,xp:sq.xp, stat:sq.stat||sqMainStat(sq)})} : null,
      sq?.xp2&&sq?.stat2 ? {key:"xp2", text:rewardLineText({xp:sq.xp2, stat:sq.stat2})} : null,
      sq?.xp3&&sq?.stat3 ? {key:"xp3", text:rewardLineText({xp:sq.xp3, stat:sq.stat3})} : null,
    ].filter(Boolean);
  }

  function sqRewardSummary(sq){
    return sqRewardLines(sq).map(l=>l.text).join(" ");
  }

  function SqCard({sq,showInput}){
    const remaining=sq.expiresAt-now;
    const urgent=remaining<86400000&&!sq.completedAt;
    const pct=Math.min(100,(sq.progress/sq.target)*100);
    const done=sq.progress>=sq.target;

    // Helper : liste les paires (xp, stat) actives sur cette quête (1, 2 ou 3)
    const xpPairs = [
      {xp:sq.xp, stat:sqMainStat(sq)},
      sq.xp2&&sq.stat2 ? {xp:sq.xp2, stat:sq.stat2} : null,
      sq.xp3&&sq.stat3 ? {xp:sq.xp3, stat:sq.stat3} : null,
    ].filter(Boolean);

    function completeBinary(val,e){
      if(sq.progress>=sq.target)return;
      const nowComplete=val>=1;
      const awardedXp = nowComplete ? xpPairs.reduce((sum,p)=>sum+(p.xp||0),0) : 0;
      if(nowComplete){
        triggerUrgentUp(sq,xpPairs);
        xpPairs.forEach(p=>addXp(p.xp,p.stat,null,true));
        tryRareDungeonKeyDrop();
      }
      setState(s=>{
        const day=todayStr();
        const daily={...(s.dailyExtraXp||{})};
        const dayLog={...(daily[day]||{})};
        if(awardedXp>0) dayLog.sq=(dayLog.sq||0)+awardedXp;
        if(awardedXp>0) daily[day]=dayLog;
        return {...s,specialQuests:s.specialQuests.map(q=>q.sqid===sq.sqid
          ?{...q,progress:nowComplete?(sq.target||1):val,completedAt:nowComplete?Date.now():q.completedAt}:q),
          sqCooldownUntil:nowComplete?next7AM():(s.sqCooldownUntil||null),
          dailyExtraXp:awardedXp>0?daily:(s.dailyExtraXp||{})};
      });
    }

    const tier = sq.tier || "majeure";
    const tierColor = SQ_TIER_COLOR[tier] || "#f59e0b";

    const progressText = sq.progress+"/"+sq.target+(sq.compactUnit?"":" ")+sq.unit;
    const sqFillStyle = done
      ? "width:"+pct+"%;background:linear-gradient(90deg,#991b1b,#ef4444)"
      : (pct>0
        ? "width:"+pct+"%;background-image:repeating-linear-gradient(-45deg,transparent,transparent 4px,#ef4444 4px,#ef4444 8px);background-size:11.31px 11.31px;opacity:0.8"
        : "width:"+pct+"%;background:linear-gradient(90deg,#991b1b,#ef4444)");

    return h("div",{class:"sqcard"+(urgent?" sq-urgent":"")},
      h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;gap:8px"},
        h("div",{style:"display:flex;align-items:center;gap:8px;min-width:0"},
          QuestIcon(sq.id,sq.icon,14,"line-height:1.1;min-width:24px;text-align:center"),
          h("div",{style:"min-width:0;flex:1"},
            h("div",{style:"font-size:13px;font-weight:700;color:var(--tx);line-height:1.25"},sq.name),
            showInput&&sq.desc&&h("div",{style:"font-size:10px;color:var(--td);line-height:1.35;margin-top:3px;white-space:normal"},sq.desc)
          )
        ),
        showInput
          ? h("div",{style:"text-align:right;flex-shrink:0"},
              sqRewardLines(sq).map(line=>h("div",{
                key:line.key,
                style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;line-height:1.25;white-space:nowrap;opacity:"+((line.at&&sq.progress>=line.at)?"1":"0.65")
              },(line.at&&sq.progress>=line.at?"\u2713 ":"")+line.text))
            )
          : h("div",{class:"qxp",style:"font-size:11px;color:"+(done?"#4ade80":"var(--td)")+";font-family:Orbitron,sans-serif;letter-spacing:0.5px;text-align:right;white-space:nowrap;flex-shrink:0;line-height:1.25;padding-top:0;min-width:82px"},progressText)
      ),
      showInput
        ? h("div",{class:"qrow",style:"align-items:center;margin-top:6px"},
            h("div",{class:"qbar"},h("div",{class:"qfill"+(done?" done":pct>0?" partial":""),style:sqFillStyle})),
            h("div",{class:"qxp",style:"color:"+(done?"#4ade80":"#ef4444")+";white-space:nowrap;min-width:82px;text-align:right;flex-shrink:0"},progressText)
          )
        : h("div",{class:"qrow",style:"align-items:center;margin-top:6px"},
            h("div",{class:"qbar"},h("div",{class:"qfill"+(done?" done":pct>0?" partial":""),style:sqFillStyle}))
          ),
      !done&&h("div",{style:"font-size:10px;color:"+(urgent?"#ef4444":"#ef4444bb")+";font-family:Orbitron,sans-serif;margin-top:4px;text-align:"+(showInput?"left":"right")},"\u23F1 "+fmtCD(remaining)+" restants"),
      showInput&&!done&&h("div",{style:"margin-top:8px"},
        h("button",{
          disabled:sqRerollUsed || (sq.progress||0)>0,
          onClick:()=>setConfirmRerollSq(sq),
          style:"width:100%;padding:9px;border-radius:8px;border:1px solid "+(sqRerollUsed || (sq.progress||0)>0 ? "rgba(255,255,255,0.08)" : "#f59e0b66")+";background:"+(sqRerollUsed || (sq.progress||0)>0 ? "rgba(255,255,255,0.02)" : "rgba(245,158,11,0.06)")+";color:"+(sqRerollUsed || (sq.progress||0)>0 ? "var(--td)" : "#f59e0b")+";font-family:Orbitron,sans-serif;font-size:10px;cursor:"+(sqRerollUsed || (sq.progress||0)>0 ? "default" : "pointer")+";letter-spacing:1px;text-transform:uppercase;opacity:"+(sqRerollUsed || (sq.progress||0)>0 ? ".65" : "1")
        },
          sqRerollUsed ? "Relance utilisée aujourd'hui" : ((sq.progress||0)>0 ? "Relance indisponible après progression" : "↻ Relancer la quête (1/jour)")
        )
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

  function DungeonCard({compact=false}={}){
    const d=activeDungeon;
    const remaining=d ? d.expiresAt-now : 0;
    const completedRooms=d ? (d.completedRooms||[]) : [];
    const selectedRoom=d&&Number.isInteger(selectedDungeonRoom)?d.rooms[selectedDungeonRoom]:null;
    const color=d ? d.color : rank.color;
    if(compact && !d) return null;
    if(d&&d.ruptureBoss){
      const rb=d.ruptureBoss;
      const ruptureColor=rb.rarityColor||DUNGEON_RUPTURE_RARITIES[rb.rarity]?.color||color;
      const secured=(d.completedRooms||[]).length;
      return h("div",{class:"card",style:"border-color:"+ruptureColor+"88;background:linear-gradient(135deg,"+ruptureColor+"12,rgba(255,255,255,0.025))"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px"},
          h("div",{style:"min-width:0"},
            h("div",{class:"ctitle",style:"margin:0;color:"+ruptureColor},"⚠️ RUPTURE — "+d.title),
            h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin-top:4px"},"Boss de Rupture · "+fmtCD(remaining)+" restants")
          ),
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:"+ruptureColor+";border:1px solid "+ruptureColor+"66;border-radius:999px;padding:4px 7px;white-space:nowrap;text-transform:uppercase"},rb.rarityLabel||"Rupture")
        ),
        h("div",{style:"padding:12px;border-radius:11px;border:1px solid "+ruptureColor+"55;background:"+ruptureColor+"10"},
          h("div",{style:"font-size:9px;color:"+ruptureColor+";font-family:Orbitron,sans-serif;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:5px"},"☠️ Boss de Rupture"),
          h("div",{style:"font-size:15px;color:var(--tx);font-weight:900;line-height:1.2"},rb.name),
          h("div",{style:"font-size:11px;color:var(--td);line-height:1.45;margin-top:6px"},rb.objective),
          h("div",{style:"font-size:9px;color:"+ruptureColor+";font-family:Orbitron,sans-serif;letter-spacing:.8px;text-transform:uppercase;margin-top:9px"},
            "+1350 XP "+(STAT_LBL[d.reward.stat]||d.reward.stat)+" · +270 XP "+(STAT_LBL[d.reward.stat2]||d.reward.stat2)
          )
        ),
        h("div",{style:"font-size:10px;color:var(--td);margin-top:8px;line-height:1.4"},secured+" salle"+(secured>1?"s":"")+" sécurisée"+(secured>1?"s":"")+" · XP conservés"),
        h("button",{onClick:validateDungeonRoom,style:"width:100%;margin-top:10px;padding:11px;border-radius:9px;border:1px solid "+ruptureColor+"77;background:"+ruptureColor+"18;color:"+ruptureColor+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"},"Vaincre le Boss de Rupture")
      );
    }
    if(d){
      return h("div",{class:"card",style:"border-color:"+color+"66"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px"},
          h("div",{style:"min-width:0"},
            h("div",{class:"ctitle",style:"margin:0;color:"+color},d.icon+" "+d.title),
            h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin-top:4px"},"Progression "+completedRooms.length+"/"+d.rooms.length+" salles · "+fmtCD(remaining)+" restants")
          ),
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:"+color+";border:1px solid "+color+"55;border-radius:999px;padding:4px 7px;white-space:nowrap"},STAT_LBL[d.stat]||d.stat)
        ),
        h("div",{style:"display:flex;flex-direction:column;gap:6px;margin-top:10px"},d.rooms.map((room,i)=>{
          const done=completedRooms.includes(i);
          const boss=i===d.rooms.length-1;
          const allPreviousRoomsDone=d.rooms.slice(0,-1).every((_,idx)=>completedRooms.includes(idx));
          const locked=!done&&boss&&!allPreviousRoomsDone;
          const selected=!done&&!locked&&selectedDungeonRoom===i;
          return h("div",{key:i,onClick:()=>{if(!done&&!locked)setSelectedDungeonRoom(i);},style:"display:flex;gap:8px;align-items:flex-start;padding:8px;border-radius:10px;background:"+(selected?color+"18":"rgba(255,255,255,0.025)")+";border:1px solid "+(selected?color+"88":"rgba(255,255,255,0.05)")+";opacity:"+(done?"0.72":locked?"0.42":"1")+";cursor:"+(!done&&!locked?"pointer":"default")+";box-shadow:"+(selected?"0 0 14px "+color+"22":"none")},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:"+(done?"#4ade80":selected?color:"var(--td)")+";width:18px;text-align:center;flex-shrink:0"},done?"✓":locked?"🔒":(i+1)),
            h("div",{style:"min-width:0;flex:1"},
              h("div",{style:"font-size:12px;color:var(--tx);font-weight:700;line-height:1.25"},(i===d.rooms.length-1?"Boss — ":"")+room.name),
              h("div",{style:"font-size:10px;color:var(--td);line-height:1.35;margin-top:2px"},room.desc),
              locked&&h("div",{style:"font-size:8.5px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:.7px;text-transform:uppercase;margin-top:4px"},"Termine toutes les salles pour accéder au boss"),
              h("div",{style:"font-size:8.5px;color:"+color+";font-family:Orbitron,sans-serif;letter-spacing:.8px;text-transform:uppercase;margin-top:4px"},dungeonRoomRewardPairs(d,i).map(r=>"+"+r.xp+" XP "+(STAT_LBL[r.stat]||r.stat)).join(" · ")),
              room.help&&h("button",{onClick:()=>setDungeonHelpOpen(o=>({...o,[d.id+"_"+i]:!o[d.id+"_"+i]})),style:"margin-top:6px;padding:5px 7px;border-radius:7px;border:1px solid "+color+"55;background:rgba(255,255,255,0.025);color:"+color+";font-family:Orbitron,sans-serif;font-size:8px;letter-spacing:1px;text-transform:uppercase;cursor:pointer"},dungeonHelpOpen[d.id+"_"+i]?"Masquer l’aide":"Aide"),
              room.help&&dungeonHelpOpen[d.id+"_"+i]&&h("div",{style:"margin-top:6px;padding:8px;border-radius:8px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.07);font-size:10px;color:var(--td);line-height:1.45"},
                h("div",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:"+color+";letter-spacing:1px;text-transform:uppercase;margin-bottom:4px"},room.helpTitle||"Aide"),
                String(room.help||"").split("\n").map((line,idx)=>h(Fragment,{key:idx},line,idx<String(room.help||"").split("\n").length-1&&h("br",null)))
              )
            )
          );
        })),
        completedRooms.length<d.rooms.length&&h("button",{
          onClick:()=>validateDungeonRoom(selectedDungeonRoom),
          disabled:!selectedRoom,
          style:"width:100%;margin-top:10px;padding:11px;border-radius:9px;border:1px solid "+color+(selectedRoom?"66":"33")+";background:"+color+(selectedRoom?"12":"08")+";color:"+(selectedRoom?color:"var(--td)")+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:"+(selectedRoom?"pointer":"not-allowed")+";opacity:"+(selectedRoom?"1":"0.55")
        },"Valider la salle")
      );
    }
    return h("div",{class:"card",style:"border-color:var(--rc)44"},
      h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px"},
        h("div",null,h("div",{class:"ctitle",style:"margin:0;color:var(--rc)"},"Donjons"),h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin-top:4px"},"1/jour · "+dungeonWeekCount+"/3 cette semaine · Accès par clé")),
        h("div",{style:"font-size:10px;color:"+(dungeonCanStart?"#4ade80":"var(--td)")+";font-family:Orbitron,sans-serif;text-transform:uppercase;white-space:nowrap"},dungeonCanStart?"Disponible":(dungeonDailyUsed?"Déjà lancé":dungeonWeekCount>=3?"Limite hebdo":"Verrouillé"))
      ),
      dungeonCanStart
        ? h("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:8px"},DUNGEONS.map(dg=>h("button",{key:dg.id,onClick:()=>startDungeon(dg.id),style:"padding:10px 8px;border-radius:10px;border:1px solid "+dg.color+"55;background:"+dg.color+"0f;color:"+dg.color+";font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:.7px;text-transform:uppercase;cursor:pointer;text-align:center;line-height:1.25"},h("div",{style:"font-size:16px;margin-bottom:4px"},dg.icon),h("div",null,dg.short),h("div",{style:"font-size:8px;color:var(--td);margin-top:3px"},STAT_LBL[dg.stat]||dg.stat))))
        : h("div",{style:"text-align:center;padding:10px 0;color:var(--td);font-size:11px;line-height:1.45"},dungeonDailyUsed?"Tu as déjà lancé un donjon aujourd'hui. Prochain lancement disponible demain.":dungeonWeekCount>=3?"Limite hebdomadaire atteinte.":"Aucune clé disponible.")
    );
  }



  function DungeonConsultCard(){
    const d=activeDungeon;
    if(!d) return null;
    const remaining=d.expiresAt-now;
    const completedRooms=d.completedRooms||[];
    const color=d.color||rank.color;
    return h("div",{class:"card",style:"border-color:"+color+"66"},
      h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px"},
        h("div",{style:"min-width:0"},
          h("div",{class:"ctitle",style:"margin:0;color:"+color},d.icon+" "+d.title),
          h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin-top:4px"},"Progression "+completedRooms.length+"/"+d.rooms.length+" salles · "+fmtCD(remaining)+" restants")
        ),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:"+color+";border:1px solid "+color+"55;border-radius:999px;padding:4px 7px;white-space:nowrap"},STAT_LBL[d.stat]||d.stat)
      ),
      h("div",{style:"display:flex;flex-direction:column;gap:5px;margin-top:10px"},d.rooms.map((room,i)=>{
        const done=completedRooms.includes(i);
        const current=i===completedRooms.length;
        return h("div",{key:i,style:"display:flex;gap:8px;align-items:center;padding:7px 8px;border-radius:9px;background:"+(current?color+"12":"rgba(255,255,255,0.02)")+";border:1px solid "+(current?color+"44":"rgba(255,255,255,0.045)")+";opacity:"+(done?"0.7":"1")},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:"+(done?"#4ade80":current?color:"var(--td)")+";width:18px;text-align:center;flex-shrink:0"},done?"✓":(i+1)),
          h("div",{style:"font-size:12px;color:var(--tx);font-weight:700;line-height:1.25;min-width:0"},(i===d.rooms.length-1?"Boss — ":"")+room.name)
        );
      }))
    );
  }

  function DungeonChoiceCard(){
    if(activeDungeon) return null;
    const dungeonGold="#f59e0b";
    const subtitle="1 par jour · "+dungeonWeekCount+"/3 cette semaine";

    if(dungeonChoiceOpen && dungeonCanStart){
      return h("div",{class:"card",style:"border:1px solid rgba(245,158,11,0.55);background:rgba(245,158,11,0.025)"},
        h("div",{class:"ctitle",style:"margin:0 0 10px;color:"+dungeonGold},"CHOIX DU DONJON"),
        h("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:8px"},DUNGEONS.map(dg=>h("button",{key:dg.id,onClick:()=>setConfirmDungeonChoice({type:"start",id:dg.id,title:dg.title,short:dg.short,icon:dg.icon,color:dg.color,stat:dg.stat}),style:"padding:10px 8px;border-radius:10px;border:1px solid "+dg.color+"55;background:"+dg.color+"0f;color:"+dg.color+";font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:.7px;text-transform:uppercase;cursor:pointer;text-align:center;line-height:1.25"},
          h("div",{style:"font-size:16px;margin-bottom:4px"},dg.icon),
          h("div",null,dg.short),
          h("div",{style:"font-size:8px;color:var(--td);margin-top:3px"},STAT_LBL[dg.stat]||dg.stat)
        )))
      );
    }

    return h("div",{class:"card",style:"border:1px solid rgba(245,158,11,0.55);background:rgba(245,158,11,0.025)"},
      h("div",{class:"ctitle",style:"margin:0;color:"+dungeonGold},"DONJON"),
      h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin-top:4px"},subtitle+" · 🗝️ "+dungeonKeys),
      dungeonAccessOpen&&h("div",{style:"margin-top:8px;color:#4ade80;font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:1px"},"ACCÈS AU DONJON OUVERT"),
      dungeonCanStart
        ? h("button",{onClick:()=>setConfirmDungeonChoice({type:"enter",color:dungeonGold}),style:"width:100%;margin-top:12px;padding:11px;border-radius:9px;border:1px solid "+dungeonGold+"88;background:"+dungeonGold+"12;color:"+dungeonGold+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.35px;text-transform:uppercase;cursor:pointer"},"ENTRER DANS UN DONJON")
        : h("div",{style:"text-align:center;padding:10px 0 2px;color:var(--td);font-size:11px;line-height:1.45"},
            dungeonDailyUsed
              ? "Tu as déjà lancé un donjon aujourd’hui. Prochain lancement disponible demain."
              : dungeonWeekCount>=3
                ? "Limite atteinte : 3 donjons ont déjà été lancés cette semaine."
                : !dungeonAccessOpen
                  ? "Utilise une Clé de Donjon depuis ton inventaire pour ouvrir l’accès."
                  : "L’accès est ouvert, mais le donjon ne peut pas être lancé actuellement."
          )
    );
  }


  function DebtCard(){
    const debt=state.questDebt;
    if(!debt || debt.status!=="active") return null;
    const color=STAT_COLOR[debt.stat]||"#f59e0b";
    const pct=Math.min(100,((debt.paid||0)/Math.max(1,debt.amount))*100);
    const isDue=debt.dueDay===today;
    return h("div",{class:"card",style:"border-color:"+color+"66;background:linear-gradient(135deg,"+color+"12,rgba(255,255,255,.025))"},
      h("div",{class:"ctitle",style:"color:"+color+";margin-bottom:8px"},"Dette active"),
      h("div",{style:"display:flex;align-items:center;gap:9px"},
        QuestIcon(debt.id,debt.icon,16,"min-width:24px"),
        h("div",{style:"flex:1"},
          h("div",{style:"font-size:14px;font-weight:800;color:var(--tx)"},debt.name),
          h("div",{style:"font-size:10px;color:var(--td);margin-top:3px"},isDue?"À rembourser aujourd’hui":"Remboursement demain")
        ),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:"+color},fmtNum(debt.paid||0)+"/"+fmtNum(debt.amount)+" "+debt.unit)
      ),
      h("div",{class:"qbar",style:"margin-top:9px"},h("div",{class:"qfill"+(pct>=100?" done":pct>0?" partial":""),style:"width:"+pct+"%"})),
      h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;margin-top:8px;letter-spacing:.7px;text-transform:uppercase"},"Échéance : "+debt.dueDay+" · priorité avant la quête du jour")
    );
  }

  function DailyEventCard(){
    const ev=dailyEvent;
    if(!ev || ev.type!=="bonus") return null;
    const color=STAT_COLOR[ev.stat]||rank.color;
    return h("div",{class:"card",style:"border-color:"+color+"66;background:linear-gradient(135deg,"+color+"14,rgba(255,255,255,0.025))"},
      h("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:10px"},
        h("div",{class:"ctitle",style:"margin:0;color:"+color},"ÉLAN DU JOUR"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:"+color+";border:1px solid "+color+"55;border-radius:999px;padding:4px 7px;white-space:nowrap;text-transform:uppercase"},"+15% XP "+(STAT_LBL[ev.stat]||ev.stat))
      )
    );
  }

  // ─── ONGLET ACCUEIL ───────────────────────────────────────────────────



  function CompactCompletedCard({text,prefix,accent,suffix,accentColor,detail}){
    const color="#4ade80";
    return h("div",{
      class:"card",
      style:"padding:10px 12px;margin-bottom:8px;border-color:"+color+"55;background:linear-gradient(135deg,"+color+"12,rgba(255,255,255,.018))"
    },
      h("div",{style:"display:flex;align-items:flex-start;gap:8px"},
        h("div",{style:"width:18px;min-width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:14px;color:"+color+";font-weight:900;line-height:1;text-shadow:0 0 8px "+color+"88;margin-top:0"},"✓"),
        h("div",{style:"flex:1;min-width:0;padding-top:1px"},
          h("div",{style:"font-size:10px;color:var(--tx);font-family:Orbitron,sans-serif;letter-spacing:.55px;line-height:1.35;text-transform:uppercase"},
            text || h(Fragment,null,
              prefix||"",
              h("span",{style:"color:"+(accentColor||color)+";font-weight:900;text-shadow:0 0 8px "+(accentColor||color)+"66"},accent||""),
              suffix||""
            )
          ),
          detail&&h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:.45px;line-height:1.35;margin-top:4px;text-transform:uppercase"},detail)
        )
      )
    );
  }

  function Home(){
    const dailyObjs = sortStat(objs.filter(o=>o.daily&&!o.optional));
    const weeklyObjs = sortStat(objs.filter(o=>o.weekly));
    const bonusObjs = dailyBonusQuestObjects();

    const isDone=(obj,isWeeklyRow)=>{
      if(obj.isEnduranceChoice) return false;
      const isW = isWeeklyRow || obj.weekly;
      const target = obj.target && !obj.binary ? obj.target : getEffectiveTarget(obj.id,isW);
      const doneVal = isW ? (wLog[obj.id]||0) : (tLog[obj.id]||0);
      return obj.binary ? doneVal>=1 : doneVal>=target;
    };

    const remainingDaily = dailyObjs.filter(o=>!isDone(o,false));
    const remainingWeekly = weeklyObjs.filter(o=>!isDone(o,true));
    const remainingBonus = bonusObjs.filter(o=>!isDone(o,false));
    const reqRemaining = remainingDaily.length;

    const completedDungeonToday = [...(state.dungeonLog||[])]
      .reverse()
      .find(entry=>entry&&entry.completedAt&&new Date(entry.completedAt).toDateString()===new Date().toDateString()) || null;

    const dungeonParts = title => {
      const raw=String(title||"Donjon");
      const match=raw.match(/^Donjon\s+(du|de la|de l[’']|des|de)\s+(.+)$/i);
      if(match) return {prefix:"Le Donjon "+match[1]+" ",name:match[2]};
      return {prefix:"Le ",name:raw};
    };
    const completedDungeonParts = completedDungeonToday ? dungeonParts(completedDungeonToday.title) : null;

    const completedHomeCards = [
      dailyObjs.length>0 && remainingDaily.length===0
        ? {key:"daily",text:"Toutes les quêtes journalières ont été complétées.",color:"#4ade80"}
        : null,
      bonusObjs.length>0 && remainingBonus.length===0
        ? {key:"bonus",text:"Toutes les quêtes bonus ont été complétées.",color:BONUS_BADGE_COLOR}
        : null,
      completedSq
        ? {
            key:"sq",
            prefix:"La Quête urgente ",
            accent:completedSq.name||"Quête urgente",
            suffix:" a été complétée.",
            accentColor:STAT_COLOR[sqMainStat(completedSq)]||"#ef4444",
            detail:sqCooldownActive ? "Prochaine quête urgente disponible dans "+fmtCD(sqCooldownUntil-now) : null
          }
        : null,
      completedDungeonToday
        ? {
            key:"dungeon",
            prefix:completedDungeonParts.prefix,
            accent:completedDungeonParts.name,
            suffix:" a été complété.",
            accentColor:STAT_COLOR[completedDungeonToday.stat]||"#c084fc",
            detail:"Fermeture du donjon dans "+fmtCD(Math.max(0,(completedDungeonToday.expiresAt||((completedDungeonToday.completedAt||now)+86400000))-now))
          }
        : null,

    ].filter(Boolean);

    const secs=[
      {lb:"Quêtes journalières restantes",ob:remainingDaily,iw:false,empty:null},
      {lb:"Quêtes hebdomadaires restantes",ob:remainingWeekly,iw:true,empty:null},
      {lb:"Quêtes bonus restantes",ob:remainingBonus,iw:false,empty:null},
    ];

    return h("div",{class:"tab"},
      missedDays>=2&&h("div",{class:"warn"},"⚠️ Pénalité : -"+(missedDays*10)+" XP ("+missedDays+" jours manqués)"),

      h("div",{class:"card"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"},
          h("div",{style:"display:flex;align-items:center;gap:8px"},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:36px;font-weight:900;color:var(--rc);text-shadow:0 0 12px var(--rg),0 0 30px var(--rg);line-height:1"},rank.id),
            h("div",null,
              h("div",{style:"font-size:10px;color:var(--td);letter-spacing:1px;text-transform:uppercase;margin-top:2px"},"Rang actuel")
            )
          ),
          h("div",{style:"font-size:18px;color:var(--td)"},"→"),
          nextRank
            ? h("div",{style:"display:flex;align-items:center;gap:8px"},
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
        h("div",{style:"margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06)"},
          h("div",{style:"display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--td);margin-bottom:5px;font-family:Orbitron,sans-serif;text-transform:uppercase;letter-spacing:1px"},
            h("span",null,"Niveau "+globalLevel.level),
            h("span",{style:"color:var(--td);opacity:.75"},"→"),
            h("span",null,globalLevel.maxed?"Niveau max":"Niveau "+globalLevel.nextLevel)
          ),
          h("div",{class:"xpbar",style:"height:4px"},h("div",{class:"xpfill",style:"width:"+globalLevel.pct+"%"})),
          h("div",{style:"display:flex;justify-content:space-between;font-size:10px;color:var(--td);margin-top:5px;font-family:Orbitron,sans-serif"},
            h("span",null,Math.round(globalLevel.inLevel).toLocaleString("fr-FR")+" XP"),
            h("span",{style:"color:var(--rc)"},globalLevel.maxed?"MAX":Math.max(0,Math.round(globalLevel.need-globalLevel.inLevel)).toLocaleString("fr-FR")+" XP manquants")
          )
        ),
        prestigeAvailable&&h("button",{
          onClick:()=>{
            const newPrestige=(state.prestige||0)+1;
            setState(s=>({...s,streak:0,streakBonusDay:null,weeklyBonusWk:null,streakMilestones:[],dailyLog:{},weeklyLog:{},regressionLog:{},specialQuests:[],sqStatCycle:[],sqCooldownUntil:null,sqRerollDay:null,activeDungeon:null,dungeonRunDay:null,dungeonRunsByWeek:{},dungeonKeyRollDay:null,dungeonKeys:0,dungeonKeyDay:null,dungeonKeyRollWon:false,dungeonLog:[],enduranceChoiceByDay:{},prestige:newPrestige}));
            setPrestigeUp(newPrestige);
          },
          style:"width:100%;margin-top:12px;padding:12px;background:rgba(168,85,247,0.1);border:1px solid #a855f7;border-radius:10px;color:#a855f7;font-family:Orbitron,sans-serif;font-size:12px;letter-spacing:3px;cursor:pointer;text-transform:uppercase;text-shadow:0 0 12px #a855f7"
        },"⚛️ Montée en Ascension"),
        h("div",{style:"display:grid;grid-template-columns:minmax(0,1fr) 1px minmax(0,1fr) 1px minmax(0,1fr);align-items:center;justify-items:stretch;margin-top:12px;padding-top:16px;padding-bottom:0px;border-top:1px solid rgba(255,255,255,0.06)"},
          h("div",{style:"width:100%;display:flex;align-items:center;justify-content:center;gap:5px;padding:0"},
            h("div",{style:"display:flex;flex-direction:column;align-items:center;justify-content:center"},
              h("div",{style:"font-family:Orbitron,sans-serif;font-size:16px;font-weight:900;color:#fff;line-height:0.9"},state.streak),
              h("div",{style:"font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:1px;margin-top:3px"},"STREAK"),
              bonusGiven&&h("div",{style:"font-size:10px;color:#c084fc;font-family:Orbitron,sans-serif;margin-top:3px"},"+250 XP ✓")
            )
          ),
          h("div",{style:"width:1px;height:38px;background:rgba(255,255,255,0.06);justify-self:center"}),
          h("div",{style:"width:100%;display:flex;align-items:center;justify-content:center;gap:5px;padding:0"},
            h("div",{style:"display:flex;flex-direction:column;align-items:center;justify-content:center"},
              h("div",{style:"font-family:Orbitron,sans-serif;font-size:16px;font-weight:900;color:#fff;line-height:0.9"},todayXp.toFixed(0)),
              h("div",{style:"font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:1px;margin-top:3px"},"XP DU JOUR")
            )
          ),
          h("div",{style:"width:1px;height:38px;background:rgba(255,255,255,0.06);justify-self:center"}),
          h("div",{style:"width:100%;display:flex;align-items:center;justify-content:center;gap:5px;padding:0"},
            h("div",{style:"display:flex;flex-direction:column;align-items:center;justify-content:center"},
              h("div",{style:"font-family:Orbitron,sans-serif;font-size:16px;font-weight:900;color:#fff;line-height:0.9"},reqRemaining),
              h("div",{style:"font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:1px;margin-top:3px"},"RESTANTES")
            )
          )
        )
      ),

      h(DebtCard,null),
      activeElixir&&h("div",{style:"margin:-2px 0 12px;padding:9px 11px;border-left:2px solid "+(activeElixir.kind==="supremeElixir"?"#9333ea":(STAT_COLOR[activeElixir.stat]||rank.color))+";background:rgba(255,255,255,.025);font-family:Orbitron,sans-serif"},
        h("div",{style:"font-size:9px;color:var(--td);letter-spacing:1.2px;text-transform:uppercase"},activeElixir.kind==="majorElixir"?"Élixir d’expérience majeur":activeElixir.kind==="supremeElixir"?"Élixir d’expérience suprême":"Élixir d’expérience mineur"),
        h("div",{style:"margin-top:4px;font-size:11px;color:"+(activeElixir.kind==="supremeElixir"?"#9333ea":(STAT_COLOR[activeElixir.stat]||rank.color))+";font-weight:800"},"+"+Math.round((activeElixir.pct||0)*100)+" % XP"+(activeElixir.kind==="supremeElixir"?" — TOUTES LES STATISTIQUES":" — "+(STAT_LBL[activeElixir.stat]||activeElixir.stat))+" · "+fmtCD((activeElixir.expiresAt||0)-now))
      ),

      activeSq&&h("div",{class:"card",style:"border-color:#ef444444"},
        h("div",{class:"ctitle",style:"color:#ef4444;margin-bottom:8px"},"Quête urgente"+(activeSq.tier?" · "+(SQ_TIER_LABEL[activeSq.tier]||""):"")),
        h(SqCard,{sq:activeSq,showInput:false})
      ),
      activeDungeon&&h(DungeonConsultCard,null),

      secs.map(({lb,ob,iw,empty})=>
        ob.length>0
          ? h("div",{key:lb,class:"card"},h("div",{class:"ctitle"},lb),ob.map(o=>o.isEnduranceChoice?h(EnduranceChoiceItem,{key:o.id,mode:"home"}):h(RR,{key:o.id,obj:o,isW:iw})))
          : empty
            ? h("div",{key:lb,class:"card",style:"border-color:#4ade8044"},
                h("div",{class:"ctitle",style:"color:#4ade80"},lb),
                h("div",{style:"text-align:center;padding:14px 0;color:#4ade80;font-family:Orbitron,sans-serif;font-size:12px;letter-spacing:1px"},empty)
              )
            : null
      ),
      completedHomeCards.length>0&&h("div",{style:"margin-top:2px"},
        completedHomeCards.map(item=>h(CompactCompletedCard,{key:item.key,text:item.text,prefix:item.prefix,accent:item.accent,suffix:item.suffix,accentColor:item.accentColor,detail:item.detail}))
      )
    );
  }

  // ─── ONGLET QUETES ────────────────────────────────────────────────────

  function Quests(){
    const reqBase=sortStat(objs.filter(o=>o.daily&&!o.optional));
    const bonBase=dailyBonusQuestObjects();
    const wkBase=sortStat(objs.filter(o=>o.weekly));

    const isQuestDone=(obj)=>{
      if(obj.isEnduranceChoice) return false;
      const isWeekly = obj.weekly;
      const t = getEffectiveTarget(obj.id, isWeekly);
      const effectiveT = t;
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

    const reqDone=reqBase.filter(isQuestDone).length;
    const reqTotal=reqBase.length;
    const bonDone=bonBase.filter(isQuestDone).length;
    const bonTotal=bonBase.length;
    const wkDone=wkBase.filter(isQuestDone).length;
    const wkTotal=wkBase.length;
    const regressionDoneToday=!!((state.regressionLog||{})[today]);

    const SectionHeader = ({title,done,total}) => h("div",{class:"shdr",style:"margin-bottom:10px"},
      h("div",{class:"ctitle",style:"margin:0"+(title==="Régressions"?";color:#ef4444":"")},title),
      h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:1px;color:"+(done===total&&total>0?"#4ade80":"var(--td)")},done+"/"+total)
    );

    return h("div",{class:"tab"},
      (!completedSq||activeSq)&&h("div",{class:"card",style:"border-color:#ef444444"},
        h("div",{class:"shdr"},
          h("div",null,
            h("div",{class:"ctitle",style:"margin:0;color:#ef4444"},"Quête urgente"+(activeSq&&activeSq.tier?" · "+(SQ_TIER_LABEL[activeSq.tier]||""):""))
          )
        ),
        activeSq
          ? h(SqCard,{sq:activeSq,showInput:true})
          : (!completedSq&&!sqCooldownActive
              ? h("div",{style:"font-size:12px;color:var(--td);text-align:center;padding:8px 0"},"Chargement du défi...")
              : null
            )
      ),
      activeDungeon&&h(DungeonCard,null),
      h(DebtCard,null),
      h("div",{class:"card"},
        h(SectionHeader,{title:"Quêtes journalières",done:reqDone,total:reqTotal}),
        req.map(o=>h(QI,{key:o.id,obj:o})),
      ),
      wkq.length>0&&h("div",{class:"card"},
        h(SectionHeader,{title:"Quêtes hebdomadaires",done:wkDone,total:wkTotal}),
        wkq.map(o=>h(QI,{key:o.id,obj:o}))
      ),
      bon.length>0&&h("div",{class:"card"},
        h(SectionHeader,{title:"Quêtes bonus",done:bonDone,total:bonTotal}),
        bon.map(o=>o.isEnduranceChoice?h(EnduranceChoiceItem,{key:o.id,mode:"quest"}):h(QI,{key:o.id,obj:o}))
      ),
      h(DungeonChoiceCard,null),
      h("div",{class:"card",style:"border-color:#ef444444"},
        h("div",{class:"shdr",style:"margin-bottom:10px"},
          h("div",{class:"ctitle",style:"margin:0;color:#ef4444"},"Régressions")
        ),
        h("div",{class:"qi",style:"padding:10px;border-color:#ef444444;background:rgba(239,68,68,0.025)"},
          h("div",{style:"display:flex;align-items:center;gap:8px;min-width:0"},
            QuestIcon(REGRESSION_DEF.id,REGRESSION_DEF.icon,14,"width:18px;height:18px;line-height:1;flex-shrink:0"),
            h("div",{style:"flex:1;min-width:0;font-family:Orbitron,sans-serif;font-size:9px;color:var(--td);line-height:1.4;letter-spacing:.35px"},
              "-2000 XP sur chaque statistique · -12000 XP global"
            )
          ),
          regressionDoneToday
            ? h("div",{style:"width:100%;margin-top:9px;padding:9px;border-radius:8px;border:1px solid #ef444466;background:rgba(239,68,68,0.07);color:#ef4444;font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:1px;text-transform:uppercase;text-align:center"},"Régression déclarée aujourd’hui ✘")
            : h("button",{
                onClick:()=>setConfirmRegression(true),
                style:"width:100%;margin-top:9px;padding:9px;border-radius:8px;border:1px solid #ef444466;background:rgba(239,68,68,0.06);color:#ef4444;font-family:Orbitron,sans-serif;font-size:9px;cursor:pointer;letter-spacing:1px;text-transform:uppercase"
              },"Déclarer la régression")
        )
      )
    );
  }

  // ─── ONGLET STATS ─────────────────────────────────────────────────────


  const DUNGEON_KEY_ICON_DATA="data:image/png;base64,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";
  const MINOR_ELIXIR_ICON_DATA="data:image/png;base64,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";
  const MAJOR_ELIXIR_ICON_DATA="data:image/png;base64,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";
  const SUPREME_ELIXIR_ICON_DATA="data:image/png;base64,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";
  function FantasyItemImage(src,size,glow){
    const s=size||40;
    return h("img",{src,width:s,height:s,alt:"",draggable:false,"aria-hidden":"true",style:"display:block;width:"+s+"px;height:"+s+"px;object-fit:contain;filter:drop-shadow(0 0 5px "+(glow||"rgba(255,255,255,.18)")+");user-select:none;-webkit-user-drag:none"});
  }
  function ElixirIcon(kind,size=34){
    if(kind==="majorElixir")return FantasyItemImage(MAJOR_ELIXIR_ICON_DATA,size,"rgba(245,184,46,.35)");
    if(kind==="supremeElixir")return FantasyItemImage(SUPREME_ELIXIR_ICON_DATA,size,"rgba(147,51,234,.4)");
    return FantasyItemImage(MINOR_ELIXIR_ICON_DATA,size,"rgba(34,197,94,.35)");
  }
  const GRIMOIRE_ICON_DATA="data:image/png;base64,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";
  function GrimoireIcon(size){
    const s=size||40;
    return h("img",{src:GRIMOIRE_ICON_DATA,width:s,height:s,alt:"",draggable:false,"aria-hidden":"true",style:"display:block;width:"+s+"px;height:"+s+"px;object-fit:contain;filter:drop-shadow(0 0 5px rgba(255,174,51,.25));user-select:none;-webkit-user-drag:none"});
  }
  function InventoryItemIcon(id,size){
    if(id==="dungeonKey")return FantasyItemImage(DUNGEON_KEY_ICON_DATA,size,"rgba(239,68,68,.35)");
    if(id==="majorElixir"||id==="minorElixir"||id==="supremeElixir")return ElixirIcon(id,size);
    if(id==="transmutationGrimoire")return GrimoireIcon(size);
    return h("span",{style:"font-size:"+size+"px;line-height:1"},INVENTORY_ITEMS[id].emoji);
  }
  const INVENTORY_ITEMS={
    dungeonKey:{name:"CLÉ DE DONJON",short:"CLÉ DE DONJON",emoji:"🗝️",action:"UTILISER",desc:"Cette clé vous permet d’entrer dans n’importe quel donjon.",obtain:["Après avoir complété la quête urgente, toutes les quêtes journalières et toutes les quêtes bonus dans la même journée (Taux : 100 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]},
    majorElixir:{name:"ÉLIXIR D’EXPÉRIENCE MAJEUR",short:"ÉLIXIR MAJEUR",emoji:"🧪",action:"CONSOMMER",pct:.20,desc:"Cet élixir vous permet de gagner 20 % d’XP en plus dans la statistique de votre choix pendant 24 h. Utilisez-le à bon escient !",obtain:["Après avoir complété un donjon avant sa rupture (Taux : 100 %)."]},
    minorElixir:{name:"ÉLIXIR D’EXPÉRIENCE MINEUR",short:"ÉLIXIR MINEUR",emoji:"🧪",action:"CONSOMMER",pct:.10,desc:"Cet élixir vous permet de gagner 10 % d’XP en plus dans la statistique de votre choix pendant 24 h. Utilisez-le à bon escient !",obtain:["Après avoir complété un donjon (Taux : 10 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]},
    supremeElixir:{name:"ÉLIXIR D’EXPÉRIENCE SUPRÊME",short:"ÉLIXIR SUPRÊME",emoji:"🧪",action:"CONSOMMER",pct:.30,desc:"Cet élixir vous permet de gagner 30 % d’XP en plus pendant 24 h. Utilisez-le à bon escient !",obtain:["En fusionnant 3 Élixirs mineurs via le [[GRIMOIRE]] Grimoire de transmutation."]},
    transmutationGrimoire:{name:"GRIMOIRE DE TRANSMUTATION",short:"GRIMOIRE",emoji:"📔",action:"TRANSMUTER",desc:"Permet de fusionner trois Élixirs mineurs pour créer un Élixir suprême.",obtain:["Après avoir terminé un Donjon de l’Alchimiste (Taux : 25 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]}
  };
  function itemQty(id){ return id==="dungeonKey"?dungeonKeys:Math.max(0,Math.floor(Number(state.inventory&&state.inventory[id])||0)); }
  function Inventory(){
    const ids=["dungeonKey","majorElixir","minorElixir","supremeElixir","transmutationGrimoire"];
    return h("div",{class:"tab"},
      h("div",{style:"display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px"},ids.map(id=>{
        const it=INVENTORY_ITEMS[id], qty=itemQty(id), grey=["majorElixir","minorElixir","supremeElixir"].includes(id)&&!!activeElixir;
        return h("button",{key:id,onClick:()=>setInventoryItem(id),style:"position:relative;aspect-ratio:1/1;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.025);padding:8px;color:var(--tx);cursor:pointer;opacity:"+(grey?".48":"1")+";display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px"},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:8px;line-height:1.25;letter-spacing:.5px;text-transform:uppercase;text-align:center;min-height:20px"},it.short),
          h("div",{style:"line-height:1"},InventoryItemIcon(id,38)),
          h("div",{style:"position:absolute;right:6px;bottom:5px;border-radius:999px;min-width:20px;padding:2px 5px;background:rgba(0,0,0,.55);font-family:Orbitron,sans-serif;font-size:9px;color:#fff"},"×"+qty)
        );
      }))
    );
  }
  function ObtainLine(text){
    const marker="[[GRIMOIRE]]";
    const parts=String(text||"").split(marker);
    if(parts.length===1)return "• "+text;
    return h(Fragment,null,"• "+parts[0],h("span",{style:"display:inline-flex;vertical-align:middle;margin:0 3px;transform:translateY(2px)"},GrimoireIcon(14)),parts.slice(1).join(marker));
  }
  function InventoryItemModal(){
    if(!inventoryItem)return null;
    const id=inventoryItem,it=INVENTORY_ITEMS[id],qty=itemQty(id);
    const isElixir=["majorElixir","minorElixir","supremeElixir"].includes(id);
    let disabled=qty<1;
    let reason=qty<1?"Aucun exemplaire disponible.":"";
    if(id==="dungeonKey"){
      if(dungeonAccessOpen){disabled=true;reason="Un accès au donjon est déjà ouvert.";}
      else if(activeDungeon){disabled=true;reason="Un donjon est déjà actif.";}
      else if(dungeonDailyUsed){disabled=true;reason="Un donjon a déjà été lancé aujourd’hui.";}
      else if(dungeonWeekCount>=3){disabled=true;reason="La limite de trois donjons cette semaine est atteinte.";}
    }else if(id==="transmutationGrimoire"){
      const minors=Math.max(0,Math.floor(Number(state.inventory&&state.inventory.minorElixir)||0));
      if(minors<3){disabled=true;reason="Trois Élixirs mineurs sont nécessaires ("+minors+"/3).";}
    }else if(activeElixir){disabled=true;reason="Un élixir est déjà actif pendant encore "+fmtCD((activeElixir.expiresAt||0)-now)+".";}
    return h("div",{class:"modal-ov",onClick:e=>{if(e.target===e.currentTarget)setInventoryItem(null)}},
      h("div",{class:"modal",style:"position:relative;max-width:390px;width:calc(100% - 28px)"},
        h("button",{onClick:()=>setInventoryItem(null),style:"position:absolute;right:12px;top:10px;border:0;background:transparent;color:#fff;font-size:22px;cursor:pointer"},"×"),
        h("div",{class:"mtitle",style:"padding-right:28px"},it.name),
        h("div",{style:"display:flex;justify-content:center;align-items:center;margin:14px 0 8px"},InventoryItemIcon(id,64)),
        h("div",{style:"text-align:center;font-family:Orbitron,sans-serif;font-size:10px;color:var(--td);margin-bottom:16px"},"QUANTITÉ : "+qty),
        h("div",{style:"font-size:12px;line-height:1.6;color:var(--tx);margin-bottom:14px"},it.desc),
        h("div",{style:"margin-bottom:16px;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08);padding:10px 0"},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1px"},"OBTENTION"),
          h("div",{style:"margin-top:9px;display:flex;flex-direction:column;gap:7px"},it.obtain.map((x,i)=>h("div",{key:i,style:"font-size:10px;color:var(--td);line-height:1.5"},ObtainLine(x))))
        ),
        reason&&h("div",{style:"font-size:10px;color:var(--td);text-align:center;margin-bottom:8px"},reason),
        h("button",{disabled,onClick:()=>{setInventoryItem(null);setConfirmItemUse({id})},style:"width:100%;padding:12px;border-radius:9px;border:1px solid "+(disabled?"rgba(255,255,255,.08)":rank.color)+";background:"+(disabled?"rgba(255,255,255,.03)":rank.color+"18")+";color:"+(disabled?"var(--td)":rank.color)+";font-family:Orbitron,sans-serif;letter-spacing:1.3px;cursor:"+(disabled?"default":"pointer")},it.action)
      )
    );
  }
  function ConfirmItemUseModal(){
    if(!confirmItemUse)return null;
    const id=confirmItemUse.id,it=INVENTORY_ITEMS[id];
    return h("div",{class:"ruov",style:"--rc:"+rank.color+";--rg:"+rank.glow},h("div",{class:"rucont",style:"width:min(500px,calc(100vw - 34px));background:rgba(15,15,18,.97);border:1px solid "+rank.color+"88;border-radius:18px;padding:22px;box-shadow:0 0 30px "+rank.color+"22"},
      h("div",{class:"ruevol",style:"color:"+rank.color},"CONFIRMATION"),
      h("div",{style:"font-family:Orbitron,sans-serif;font-size:18px;font-weight:900;color:#fff;text-align:center;line-height:1.4;max-width:340px"},"Êtes-vous certain de vouloir "+(id==="dungeonKey"?"utiliser une ":id==="transmutationGrimoire"?"utiliser le ":"consommer un ")+it.name+" ?"),
      h("div",{style:"display:flex;gap:10px;margin-top:22px"},
        h("button",{class:"rudis",style:"min-width:110px;--rc:#64748b;--rg:rgba(100,116,139,.5)",onClick:()=>setConfirmItemUse(null)},"Non"),
        h("button",{class:"rudis",style:"min-width:110px",onClick:()=>{
          setConfirmItemUse(null);
          if(id==="dungeonKey"){
            setState(s=>({...s,dungeonKeys:Math.max(0,(Number(s.dungeonKeys)||0)-1),dungeonAccessOpen:true}));
            setItemUseUp({id});
          }else if(id==="transmutationGrimoire"){
            setState(s=>{const inv={...(s.inventory||{})};if((Number(inv.minorElixir)||0)<3||(Number(inv.transmutationGrimoire)||0)<1)return s;inv.minorElixir=Math.max(0,(Number(inv.minorElixir)||0)-3);inv.transmutationGrimoire=Math.max(0,(Number(inv.transmutationGrimoire)||0)-1);inv.supremeElixir=Math.max(0,(Number(inv.supremeElixir)||0)+1);return {...s,inventory:inv};});
            enqueueItemLoot("supremeElixir","guaranteed");
            setItemUseUp({id,transmuted:true});
          }else if(id==="supremeElixir"){
            const expiresAt=Date.now()+86400000;
            setState(s=>({...s,inventory:{...(s.inventory||{}),supremeElixir:Math.max(0,(Number(s.inventory&&s.inventory.supremeElixir)||0)-1)},activeElixir:{kind:id,pct:it.pct,startedAt:Date.now(),expiresAt}}));
            setItemUseUp({id,pct:it.pct,global:true});
          }else setElixirStatChoice({id});
        }},id==="dungeonKey"||id==="transmutationGrimoire"||id==="supremeElixir"?"Oui":"Continuer")
      )
    ));
  }
  function ElixirStatModal(){
    if(!elixirStatChoice)return null;
    const id=elixirStatChoice.id,it=INVENTORY_ITEMS[id];
    const choices=["Force","Sante","Esprit","Endurance","Agilite"];
    return h("div",{class:"modal-ov"},h("div",{class:"modal",style:"max-width:390px;width:calc(100% - 28px)"},
      h("div",{class:"mtitle"},"CHOISIR UNE STATISTIQUE"),
      h("div",{style:"font-size:11px;color:var(--td);line-height:1.5;margin-bottom:12px"},"Appliquer "+Math.round(it.pct*100)+" % d’XP supplémentaires pendant 24 h."),
      h("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:8px"},choices.map(stat=>h("button",{key:stat,onClick:()=>{setElixirStatChoice(null);setConfirmElixirUse({id,stat})},style:"padding:11px;border-radius:9px;border:1px solid "+STAT_COLOR[stat]+"88;background:"+STAT_COLOR[stat]+"12;color:"+STAT_COLOR[stat]+";font-family:Orbitron,sans-serif;font-size:10px;cursor:pointer"},STAT_LBL[stat]||stat))),
      h("button",{onClick:()=>setElixirStatChoice(null),style:"width:100%;margin-top:12px;padding:10px;border-radius:9px;border:1px solid rgba(255,255,255,.08);background:transparent;color:var(--td);font-family:Orbitron,sans-serif;cursor:pointer"},"Annuler")
    ));
  }
  function ConfirmElixirModal(){
    if(!confirmElixirUse)return null;
    const {id,stat}=confirmElixirUse,it=INVENTORY_ITEMS[id],c=STAT_COLOR[stat]||rank.color;
    return h("div",{class:"ruov",style:"--rc:"+c+";--rg:"+c+"66"},h("div",{class:"rucont",style:"width:min(500px,calc(100vw - 34px));background:rgba(15,15,18,.97);border:1px solid "+c+"88;border-radius:18px;padding:22px;box-shadow:0 0 30px "+c+"22"},
      h("div",{class:"ruevol",style:"color:"+c},"CONFIRMATION"),
      h("div",{style:"font-family:Orbitron,sans-serif;font-size:18px;font-weight:900;color:#fff;text-align:center;line-height:1.45;max-width:350px"},"Appliquer +"+Math.round(it.pct*100)+" % d’XP à "+(STAT_LBL[stat]||stat)+" pendant 24 h ?"),
      h("div",{style:"display:flex;gap:10px;margin-top:22px"},
        h("button",{class:"rudis",style:"min-width:110px;--rc:#64748b;--rg:rgba(100,116,139,.5)",onClick:()=>setConfirmElixirUse(null)},"Annuler"),
        h("button",{class:"rudis",style:"min-width:110px;--rc:"+c+";--rg:"+c+"66",onClick:()=>{
          const expiresAt=Date.now()+86400000;
          setState(s=>({...s,inventory:{...(s.inventory||{}),[id]:Math.max(0,(Number(s.inventory&&s.inventory[id])||0)-1)},activeElixir:{kind:id,stat,pct:it.pct,startedAt:Date.now(),expiresAt}}));
          setConfirmElixirUse(null);setItemUseUp({id,stat,pct:it.pct});
        }},"Consommer")
      )
    ));
  }

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
        h("div",{class:"ctitle"},"Niveau global"),
        h("div",{style:"display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:6px"},
          h("div",null,
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:12px;font-weight:800;letter-spacing:1px;color:#fff;line-height:1;text-shadow:none"},"Niveau "+globalLevel.level),
            h("div",{style:"font-size:10px;color:#fff;text-transform:uppercase;letter-spacing:1px;margin-top:4px"},globalLevel.maxed?"Progression maximale":"Vers niveau "+globalLevel.nextLevel)
          ),
          h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;text-align:right"},
            globalLevel.maxed?"MAX":Math.round(globalLevel.inLevel).toLocaleString("fr-FR")+" / "+Math.round(globalLevel.need).toLocaleString("fr-FR")+" XP"
          )
        ),
        h("div",{class:"xpbar",style:"height:7px"},h("div",{class:"xpfill",style:"width:"+globalLevel.pct+"%"}))
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
    const ordered=[...sortStat(objs.filter(o=>o.daily&&!o.optional)),...sortStat(objs.filter(o=>o.weekly)),...sortStat(objs.filter(o=>o.daily&&o.optional&&!o.bonusHidden))];

    const exerciseHistoryDefs=[
      {id:"ex_pushups",name:"Pompes",icon:"💪🏼",unit:"rep",stat:"Force",sourceId:"push",family:"push",rotationId:"pushups"},
      {id:"ex_dips",name:"Dips",icon:"💪🏼",unit:"rep",stat:"Force",sourceId:"push",family:"push",rotationId:"dips"},
      {id:"ex_crunches",name:"Crunches",icon:"🧎🏻",unit:"rep",stat:"Force",sourceId:"abs",family:"abs",rotationId:"crunches"},
      {id:"ex_leg_raises",name:"Levées de jambes",icon:"🦵🏻",unit:"rep",stat:"Force",sourceId:"abs",family:"abs",rotationId:"leg_raises"},
      {id:"ex_plank",name:"Gainage",icon:"🫳🏼",unit:"min",stat:"Force",sourceId:"abs",family:"abs",rotationId:"plank"},
      {id:"ex_side_plank",name:"Gainage obliques",icon:"🧎🏻‍♂️‍➡️",unit:"rep",stat:"Force",sourceId:"abs",family:"abs",rotationId:"side_plank"},
      {id:"ex_squats",name:"Squats",icon:"🦵🏻",unit:"rep",stat:"Force",sourceId:"squats",family:"legs",rotationId:"squats"},
      {id:"ex_calves",name:"Mollets",icon:"🦵🏻",unit:"rep",stat:"Force",sourceId:"squats",family:"legs",rotationId:"calves",legacySourceId:"calves"},
      {id:"ex_lunges",name:"Fentes",icon:"🦵🏻",unit:"rep",stat:"Force",sourceId:"squats",family:"legs",rotationId:"lunges"},
    ];
    const rotatingSourceIds=new Set(["push","abs","squats","calves"]);
    function exerciseRotationIdForDay(day,family){
      return ((state.exerciseRotationByDay||{})[day]||{})[family] || LEGACY_EXERCISE_DEFAULTS[family];
    }
    function exerciseValueForDay(def,day,log){
      const row=log||{};
      let value=0;
      if(exerciseRotationIdForDay(day,def.family)===def.rotationId){
        value+=Number(row[def.sourceId])||0;
      }
      if(def.legacySourceId) value+=Number(row[def.legacySourceId])||0;
      return value;
    }
    function dailyQuestForHistoryDay(obj,day){
      if(!isExerciseFamilyQuestId(obj.id)) return obj;
      const rotation=(state.exerciseRotationByDay||{})[day]||{
        push:LEGACY_EXERCISE_DEFAULTS.push,
        abs:LEGACY_EXERCISE_DEFAULTS.abs,
        legs:LEGACY_EXERCISE_DEFAULTS.legs
      };
      return rotatedQuestObjects(baseObjs,rotation,state.stats,state.totalXp).find(q=>q.id===obj.id)||obj;
    }
    const standardDailyRecordObjs=[
      ...sortStat(objs.filter(o=>o.daily&&!o.optional&&!o.binary&&!rotatingSourceIds.has(o.id))),
      ...sortStat(objs.filter(o=>o.weekly&&!o.binary&&!rotatingSourceIds.has(o.id))),
      ...sortStat(objs.filter(o=>o.daily&&o.optional&&!o.binary&&!o.bonusHidden&&!rotatingSourceIds.has(o.id)))
    ];
    const recordDisplayObjs=[...exerciseHistoryDefs,...standardDailyRecordObjs];

    // ── Labels jours de la semaine (lun → dim) ──
    const weekLbls=["L","M","M","J","V","S","D"];

    function weeklyTargetFor(obj){
      if(obj.binary) return 7;
      const target = obj.weekly ? getRankBase(obj.id,ri,prestige,state.stats) : ((obj.target&&!obj.binary?obj.target:getRankBase(obj.id,ri,prestige,state.stats))*7);
      return target;
    }
    function dayTargetFor(obj,day){
      if(obj.binary) return 1;
      if(obj.weekly) return getRankBase(obj.id,ri,prestige,state.stats);
      return obj.target&&!obj.binary ? obj.target : getValidateThreshold(obj,day);
    }
    function dayMarkFor(obj,day){
  const log=state.dailyLog[day]||{};
  const dayObj=dailyQuestForHistoryDay(obj,day);
  const value=log[obj.id]||0;

  const target=dayTargetFor(dayObj,day);

  const validationTarget =
    obj.optional
      ? Math.ceil(target * 0.5)
      : target;

  // Pour une quête journalière obligatoire d'une journée passée, le bonus
  // de streak déjà attribué constitue la preuve que la quête avait atteint
  // son objectif ce jour-là. On évite ainsi les croix rétroactives lorsque
  // le niveau actuel augmente le seuil d'une rotation (ex. gainage 2 -> 3 min).
  const previouslyValidated = day<today && !!obj.daily && !obj.optional && hadValidatedDailyCompletion(day);
  const ok = previouslyValidated || value >= validationTarget;

  if(ok){
    return {txt:"✓",color:"#4ade80",opacity:1};
  }

  if(day>today){
    return {txt:"·",color:"var(--td)",opacity:.45};
  }

  if(day===today){
    return {txt:"·",color:"var(--td)",opacity:.75};
  }

  return {txt:"✘",color:"#ef4444",opacity:1};
}
    function totalLabelFor(obj,val,wt){
      const unit=((val>1||wt>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres",repas:"repas",contact:"contacts",action:"actions"}[obj.unit]||obj.unit);
      if(obj.binary) return fmtNum(val)+"/7 "+(obj.id==="sleep"?"nuits":"jours");
      return fmtNum(val)+"/"+fmtNum(wt)+" "+unit;
    }

    // ── Records personnels (max par quête sur tout le dailyLog) ──
    const records={};
    Object.entries(state.dailyLog).forEach(([date,log])=>{
      Object.entries(log).forEach(([id,val])=>{
        if(id==="run" && date<RUN_RECORD_RESET_DAY) return;
        if(!records[id]||val>records[id].val)records[id]={val,date};
      });
    });
    exerciseHistoryDefs.forEach(def=>{
      Object.entries(state.dailyLog||{}).forEach(([date,log])=>{
        const val=exerciseValueForDay(def,date,log);
        if(val>0 && (!records[def.id]||val>records[def.id].val)) records[def.id]={val,date};
      });
    });
    // Running et Rando sont désormais quotidiens : ne plus utiliser weeklyLog pour les records




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
      // Activité de la semaine : tableau quotidien L M M J V S D
      h("div",{class:"card"},
        h("div",{class:"ctitle"},"Activité de la semaine"),
        h("div",{style:"display:grid;grid-template-columns:minmax(0,1fr) repeat(7,22px);gap:5px;align-items:center;margin-top:10px;margin-bottom:8px;font-family:Orbitron,sans-serif;font-size:9px;color:#fff;letter-spacing:1px;text-transform:uppercase"},
          h("div",null,"Quête"),
          weekLbls.map((lbl,i)=>h("div",{key:"h"+i,style:"text-align:center;color:#fff"},lbl))
        ),
        h("div",{style:"display:flex;flex-direction:column;gap:7px"},
          ordered.map(obj=>{
            const marks=weekDays.map(d=>dayMarkFor(obj,d));
            const isFamily=isExerciseFamilyQuestId(obj.id);
            const val=isFamily
              ? marks.filter((m,i)=>weekDays[i]<=today&&m.txt==="✓").length
              : (obj.binary
                  ? weekDays.filter(d=>d<=today && (state.dailyLog[d]?.[obj.id]||0)>=1).length
                  : (tots[obj.id]||0));
            const wt=isFamily?7:weeklyTargetFor(obj);
            const displayName=exerciseFamilyLabel(obj.id,obj.name);
            const displayIcon=exerciseFamilyIcon(obj.id,obj.icon);
            return h("div",{key:obj.id,style:"display:grid;grid-template-columns:minmax(0,1fr) repeat(7,22px);gap:5px;align-items:center;padding:6px 0;border-top:1px solid rgba(255,255,255,0.04)"},
              h("div",{style:"display:flex;align-items:center;gap:6px;min-width:0;color:var(--tx);font-size:12px"},
                QuestIcon(obj.id,displayIcon,14),
                h("span",{style:"overflow:hidden;text-overflow:ellipsis;white-space:nowrap"},displayName)
              ),
              marks.map((m,i)=>h("div",{key:obj.id+"_d"+i,style:"text-align:center;font-family:Orbitron,sans-serif;font-size:12px;font-weight:700;color:"+m.color+";opacity:"+m.opacity},m.txt))
            );
          }),
          h("div",{key:REGRESSION_DEF.id,style:"display:grid;grid-template-columns:minmax(0,1fr) repeat(7,22px);gap:5px;align-items:center;padding:6px 0;border-top:1px solid rgba(255,255,255,0.04)"},
            h("div",{style:"display:flex;align-items:center;min-width:0;color:var(--tx);font-size:12px"},
              QuestIcon(REGRESSION_DEF.id,REGRESSION_DEF.icon,14)
            ),
            weekDays.map((day,i)=>{
              const future=day>today;
              const activated=!!((state.regressionLog||{})[day]);
              const mark=future
                ? {txt:"·",color:"var(--td)",opacity:.45}
                : activated
                  ? {txt:"✘",color:"#ef4444",opacity:1}
                  : {txt:"✓",color:"#4ade80",opacity:1};
              return h("div",{key:REGRESSION_DEF.id+"_d"+i,style:"text-align:center;font-family:Orbitron,sans-serif;font-size:12px;font-weight:700;color:"+mark.color+";opacity:"+mark.opacity},mark.txt);
            })
          ),
          ordered.every(o=>!(tots[o.id]>0))&&h("div",{style:"text-align:center;font-size:13px;color:var(--td);padding:16px 0"},"Aucune activité cette semaine")
        )
      ),
      // Records personnels
      h("div",{class:"card"},
        h("div",{style:"display:flex;align-items:center;justify-content:space-between;cursor:pointer",onClick:()=>toggle("records")},
          h("div",{class:"ctitle",style:"margin:0"},"Records personnels"),
          h(ChevronBtn,{k:"records"})
        ),
        open.records&&h(Fragment,null,
          h("div",{style:"margin-top:12px"}),
          recordDisplayObjs.map(o=>{
          const rec=records[o.id];
          if(!rec)return h("div",{key:o.id,style:"display:flex;align-items:center;gap:8px;margin-bottom:8px;opacity:.35"},
            QuestIcon(o.id,o.icon,14),
            h("div",{style:"flex:1"},
              h("div",{style:"font-size:12px;color:var(--td);display:flex;align-items:center;gap:5px"},
                o.name,
                (o.weekly)&&h(QuestBadge,{label:"HEBDO",color:WEEKLY_BADGE_COLOR}),
                o.optional&&!o.weekly&&h(QuestBadge,{label:"BONUS",color:BONUS_BADGE_COLOR})
              )
            ),
            h("span",{style:"font-size:11px;color:var(--td)"},"—")
          );
          const fmt2=d=>{if(d.includes("-W"))return d.replace("-W","-S");const p=d.split("-");return p[2]+"/"+p[1];};
          return h("div",{key:o.id,style:"display:flex;align-items:center;gap:8px;margin-bottom:8px"},
            QuestIcon(o.id,o.icon,14),
            h("div",{style:"flex:1"},
              h("div",{style:"font-size:12px;color:var(--tx);display:flex;align-items:center;gap:5px"},
                o.name,
                (o.weekly)&&h(QuestBadge,{label:"HEBDO",color:WEEKLY_BADGE_COLOR}),
                o.optional&&!o.weekly&&h(QuestBadge,{label:"BONUS",color:BONUS_BADGE_COLOR}),
              ),
              h("div",{style:"font-size:10px;color:var(--td);margin-top:1px"},fmt2(rec.date))
            ),
            h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:var(--tx)"},
              fmtNum(rec.val)+" "+((rec.val>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres",contact:"contacts",action:"actions"}[o.unit]||o.unit))
          );
        }),

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
        exerciseHistoryDefs.forEach(def=>{
          totals[def.id]=Object.entries(state.dailyLog||{}).reduce((sum,[day,log])=>sum+exerciseValueForDay(def,day,log),0);
        });
        const displayObjs=recordDisplayObjs;
        return h("div",{class:"card"},
          h("div",{style:"display:flex;align-items:center;justify-content:space-between;cursor:pointer",onClick:()=>toggle("totals")},
            h("div",{class:"ctitle",style:"margin:0"},"Totaux depuis le d\u00e9but"+(firstDay?" \u2014 "+fmtFirst(firstDay):"")),
            h(ChevronBtn,{k:"totals"})
          ),
          open.totals&&h(Fragment,null,
            h("div",{style:"margin-top:12px"}),
            displayObjs.map(o=>{
              const total=totals[o.id]||0;
              const unitLbl=total>1?({rep:"reps",page:"pages",verre:"verres",km:"km",min:"min",contact:"contacts",action:"actions"}[o.unit]||o.unit):o.unit;
              return h("div",{key:o.id,style:"display:flex;align-items:center;gap:8px;margin-bottom:8px"+(total===0?";opacity:.35":"")},
                QuestIcon(o.id,o.icon,14),
                h("div",{style:"flex:1"},
                  h("div",{style:"font-size:12px;color:var(--tx);display:flex;align-items:center;gap:5px"},
                    o.name,
                    (o.weekly)&&h(QuestBadge,{label:"HEBDO",color:WEEKLY_BADGE_COLOR}),
                    o.optional&&!o.weekly&&h(QuestBadge,{label:"BONUS",color:BONUS_BADGE_COLOR}),
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
    const ordered=[...sortStat(objs.filter(o=>o.daily&&!o.optional)),...sortStat(objs.filter(o=>o.weekly)),...sortStat(objs.filter(o=>o.daily&&o.optional&&!o.bonusHidden))];
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
        const nt=Math.max(0,s.totalXp+xpD);
        triggerProgressOverlay(s.totalXp,s.stats,nt,ns,100);
        return {...s,totalXp:nt,dailyLog:ndl,weeklyLog:nwl,statXp:nsx,stats:ns};
      });
      setShowSet(false);
    }
    return h("div",{class:"modal-ov",onClick:e=>{if(e.target===e.currentTarget){setShowSet(false);setConfirmReset(false);}}},
      h("div",{class:"modal"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"},
          h("div",{class:"mtitle",style:"margin-bottom:0;display:flex;align-items:center;gap:8px"},"⚙️","Réglages"),
          h("button",{style:"background:none;border:none;color:var(--td);font-size:44px;line-height:1;cursor:pointer",onClick:()=>{setShowSet(false);setConfirmReset(false);}},"\u2715")
        ),
        h("div",{class:"msec"},
          h("div",{class:"mlbl"},"Corriger les données du jour"),
          ordered.map(obj=>{
            const cur=(obj.weekly)?(wLog[obj.id]||0):(tLog[obj.id]||0);
            return h("div",{key:obj.id,style:"display:flex;align-items:center;gap:8px;margin-bottom:8px"},
              QuestIcon(obj.id,obj.icon,14,"min-width:24px"),
              h("span",{style:"flex:1;font-size:13px"},exerciseFamilyLabel(obj.id,obj.name)),
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
              const json=JSON.stringify(exportSystemState(state));
              navigator.clipboard.writeText(json).then(()=>{
                setExportValue(json);
                setExportCopiedModal(true);
              }).catch(()=>{
                setExportValue(json);
                setExportManualModal(true);
              });
            }},"Exporter"),
            h("button",{class:"mbtn mprim",style:"flex:1",onClick:()=>{
              setImportValue("");
              setImportModal(true);
            }},"Importer")
          ),
          h("button",{class:"mbtn mprim",style:"width:100%",onClick:()=>{
            const json=JSON.stringify(exportSystemState(state),null,2);
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

  function triggerUrgentUp(sq,pairs){
    if(!sq || !pairs || !pairs.length) return;
    setTimeout(()=>setUrgentUp({
      title:"QUÊTE URGENTE COMPLÉTÉE",
      name:sq.name,
      color:rank.color||"#fbbf24",
      glow:rank.glow||"#fbbf2455",
      nameColor:STAT_COLOR[sq.stat]||rank.color||"#ef4444",
      rewards:pairs.map(p=>({
        xp:p.xp||0,
        stat:p.stat,
        label:STAT_LBL2[p.stat] || STAT_LBL[p.stat] || p.stat || ""
      }))
    }),300);
  }

  const GOLD = "#fbbf24";
  const congratsStyle = "font-family:Orbitron,sans-serif;font-size:clamp(20px,5.4vw,27px);font-weight:900;letter-spacing:3px;text-transform:uppercase;color:#ffffff;text-shadow:none";
  function NotificationHeader(){
    return h("div",{style:"display:grid;grid-template-columns:34px auto 34px;align-items:center;justify-content:center;margin-bottom:14px;width:100%"},
      h("span",{style:"font-family:Orbitron,sans-serif;font-size:clamp(21px,5.6vw,28px);font-weight:900;color:#ffffff;text-align:center;line-height:1"},"❕"),
      h("span",{style:congratsStyle},"NOTIFICATION"),
      h("span",{style:"width:34px"})
    );
  }

  function RankUp(){
    if(!rankUp)return null;
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
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:"+rankUp.color+";text-shadow:0 0 14px "+rankUp.glow},"ÉVOLUTION DE RANG"),
        h("div",{class:"rurank",style:"color:"+rankUp.color+";text-shadow:0 0 18px "+rankUp.glow,"data-r":"RANG "+rankUp.id},"RANG "+rankUp.id),
        h("button",{class:"rudis",onClick:()=>setRankUp(null)},"Continuer")
      )
    );
  }

  // ─── ANIMATION COMPLÉTION DES QUÊTES ──────────────────────────────────

  function CompletionUp(){
    if(!completionUp)return null;
    const color=rank.color||"#fbbf24";
    const glow=rank.glow||color+"55";
    const green="#4ade80";
    const particles=Array.from({length:40},(_,i)=>({
      id:i,left:Math.random()*100,delay:Math.random()*2.5,
      dur:1.1+Math.random()*1.8,size:2+Math.random()*4,
      accent:Math.random()>0.55
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"rgba(255,255,255,.75)":green)+";box-shadow:0 0 9px rgba(74,222,128,.55);animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"rulabel",style:"font-size:clamp(20px,5.5vw,32px);line-height:1.35;letter-spacing:2px;max-width:350px;color:"+green+";text-shadow:0 0 14px rgba(74,222,128,.55)"},completionUp.text),
        h("button",{class:"rudis",onClick:()=>setCompletionUp(null)},"Continuer")
      )
    );
  }

  // ─── ANIMATION STREAK BONUS ───────────────────────────────────────────

  function StreakUp(){
    if(!streakUp)return null;
    const color = streakUp.color || STAT_COLOR.Discipline || "#c084fc";
    const glow = streakUp.glow || color+"66";
    const particles=Array.from({length:38},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.5,
      dur:1.1+Math.random()*1.8,
      size:2+Math.random()*4,
      accent:Math.random()>0.58
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"rgba(255,255,255,0.7)":color)+";box-shadow:0 0 8px "+glow+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol"},streakUp.title || "STREAK BONUS !"),
        h("div",{class:"rurank","data-r":String(streakUp.streak||0)},String(streakUp.streak||0)),
        h("div",{class:"rulabel",style:"margin-top:10px;letter-spacing:3px"},"JOURS DE STREAK"),
        h("div",{class:"rulabel",style:"margin-top:10px;letter-spacing:2px;color:"+color},streakUp.subtitle || ("+"+(streakUp.xp||250)+" XP Discipline")),
        streakUp.detail&&h("div",{style:"margin-top:8px;font-size:11px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;text-transform:uppercase"},streakUp.detail),
        h("button",{class:"rudis",onClick:()=>setStreakUp(null)},"Continuer")
      )
    );
  }

  // ─── ANIMATION LEVEL UP ───────────────────────────────────────────────

  function DungeonUp(){
    if(!dungeonUp)return null;
    const color=dungeonUp.color||"#c084fc";
    const glow=color+"66";
    const particles=Array.from({length:46},(_,i)=>({id:i,left:Math.random()*100,delay:Math.random()*2.8,dur:1.2+Math.random()*2,size:2+Math.random()*4,accent:Math.random()>0.45}));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"#ffffff":color)+";box-shadow:0 0 8px "+glow+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"}))),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol"},dungeonUp.label||"DONJON TERMINÉ"),
        h("div",{class:"rurank",style:"font-size:"+(dungeonUp.rupture?"clamp(34px,10vw,60px)":"clamp(48px,16vw,82px)")+";letter-spacing:-1px;white-space:"+(dungeonUp.rupture?"normal":"nowrap")+";max-width:350px;line-height:1.05","data-r":dungeonUp.short},dungeonUp.short),
        dungeonUp.subtitle&&h("div",{class:"rulabel",style:"margin-top:9px;letter-spacing:2px;color:"+color},dungeonUp.subtitle),
        h("div",{class:"rulabel",style:"margin-top:10px;letter-spacing:3px;max-width:300px;line-height:1.35"},dungeonUp.reward),
        h("button",{class:"rudis",onClick:()=>setDungeonUp(null)},"Continuer")
      )
    );
  }

  function DungeonRuptureUp(){
    if(!ruptureUp)return null;
    const rarityColor=ruptureUp.rarityColor||"#f97316";
    const rankColor=rank.color||"#fbbf24";
    const rankGlow=rank.glow||rankColor+"55";
    const red="#ef4444";
    const particles=Array.from({length:52},(_,i)=>({id:i,left:Math.random()*100,delay:Math.random()*2.5,dur:1+Math.random()*1.8,size:2+Math.random()*5,accent:Math.random()>0.48}));
    return h("div",{class:"ruov",style:"--rc:"+rankColor+";--rg:"+rankGlow},
      h("div",{class:"ruparts"},particles.map(p=>h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"#ffffff":rarityColor)+";box-shadow:0 0 10px "+rarityColor+"88;animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"}))),
      h("div",{class:"rucont"},
        h("div",{class:"ruevol",style:"color:"+red+";text-shadow:0 0 18px rgba(239,68,68,.65)"},"⚠️ RUPTURE DE DONJON"),
        h("div",{class:"rurank",style:"--rc:"+red+";--rg:rgba(239,68,68,.75);color:"+red+";text-shadow:0 0 20px rgba(239,68,68,.75);font-size:clamp(34px,10vw,60px);letter-spacing:-1px;white-space:normal;max-width:350px;line-height:1.05;margin-top:10px","data-r":"☠️ "+ruptureUp.name},"☠️ "+ruptureUp.name),
        h("div",{class:"rulabel",style:"margin-top:12px;letter-spacing:3px;color:"+rarityColor},"BOSS "+String(ruptureUp.rarityLabel||"DE RUPTURE").toUpperCase()),
        h("button",{class:"rudis",style:"--rc:#ef4444;--rg:rgba(239,68,68,.65)",onClick:()=>setRuptureUp(null)},"Continuer")
      )
    );
  }

  function UrgentUp(){
    if(!urgentUp)return null;
    const color=urgentUp.color||"#fbbf24";
    const glow=urgentUp.glow||"#fbbf2455";
    const urgentTitle=String(urgentUp.name||"");
    const longestUrgentWord=urgentTitle.split(/\s+/).reduce((max,word)=>Math.max(max,word.length),0);
    const urgentTitleSize=longestUrgentWord>=15
      ? "clamp(23px,6.2vw,38px)"
      : urgentTitle.length>=24
        ? "clamp(25px,7vw,42px)"
        : urgentTitle.length>=17
          ? "clamp(28px,8vw,49px)"
          : "clamp(34px,10vw,62px)";
    const particles=Array.from({length:42},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.8,
      dur:1.1+Math.random()*1.8,
      size:2+Math.random()*4,
      accent:Math.random()>0.65
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?(urgentUp.nameColor||color):color)+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:#ef4444;text-shadow:0 0 16px rgba(239,68,68,.7)"},"QUÊTE URGENTE COMPLÉTÉE !"),
        h("div",{class:"rurank",style:"--rc:"+(urgentUp.nameColor||color)+";--rg:"+(urgentUp.nameColor||color)+"66;color:"+(urgentUp.nameColor||color)+";text-shadow:0 0 18px "+(urgentUp.nameColor||color)+"66;font-size:"+urgentTitleSize+";letter-spacing:-1px;white-space:normal;width:calc(100vw - 32px);max-width:360px;line-height:1.08;overflow-wrap:anywhere;word-break:normal;hyphens:auto","data-r":urgentTitle},urgentTitle),
        h("div",{style:"margin-top:14px;display:flex;flex-direction:column;gap:6px;align-items:center"},
          (urgentUp.rewards||[]).map((r,i)=>{
            const rewardColor=STAT_COLOR[r.stat]||color;
            return h("div",{key:i,style:"font-family:Orbitron,sans-serif;font-size:clamp(14px,3.8vw,20px);letter-spacing:1.5px;line-height:1.3;color:"+rewardColor+";text-transform:uppercase;text-align:center"},("+"+r.xp+" XP "+r.label).trim());
          })
        ),
        h("button",{class:"rudis",style:"--rc:#ef4444;--rg:rgba(239,68,68,.65)",onClick:()=>setUrgentUp(null)},"Continuer")
      )
    );
  }

  function DungeonKeyLootUp(){
    if(!keyLootUp)return null;
    const rare=keyLootUp.kind==="rare";
    const color=rank.color||"#fbbf24";
    const glow=rank.glow||color+"66";
    const gold="#fbbf24";
    const headingColor=rare?gold:color;
    const particles=Array.from({length:48},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.5,
      dur:1.05+Math.random()*1.9,
      size:2+Math.random()*5,
      gold:Math.random()>0.38
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.gold?gold:"#ffffff")+";box-shadow:0 0 10px "+(p.gold?gold+"99":glow)+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:"+headingColor+";text-shadow:0 0 16px "+(rare?gold+"99":glow)},rare?"DROP RARE OBTENU !":"OBJET OBTENU !"),
        h("div",{class:"rurank",style:"--rc:"+gold+";--rg:"+gold+"88;color:"+gold+";text-shadow:0 0 20px "+gold+"99;font-size:clamp(38px,11vw,64px);letter-spacing:-1px;white-space:normal;max-width:350px;line-height:1.05","data-r":"CLÉ DE DONJON"},"CLÉ DE DONJON"),
        h("button",{class:"rudis",style:"--rc:"+color+";--rg:"+glow,onClick:()=>setKeyLootUp(null)},"Continuer")
      )
    );
  }

  function RecordUp(){
    if(!recordUp)return null;
    const statColor=recordUp.color||"#fbbf24";
    const statGlow=recordUp.glow||statColor+"55";
    const color=recordUp.rankColor||rank.color||"#fbbf24";
    const glow=recordUp.rankGlow||rank.glow||color+"55";
    const particles=Array.from({length:42},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.5,
      dur:1.1+Math.random()*1.8,
      size:2+Math.random()*4,
      gold:Math.random()>0.35
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.gold?"#fbbf24":color)+";box-shadow:0 0 8px "+glow+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:"+color+";text-shadow:0 0 14px "+glow},(recordUp.title||"NOUVEAU RECORD")+" !"),
        h("div",{class:"rurank",style:"--rc:"+statColor+";--rg:"+statGlow+";color:"+statColor+";text-shadow:0 0 18px "+statGlow+";font-size:clamp(38px,11vw,64px);letter-spacing:-1px;white-space:normal;max-width:340px;line-height:1.05","data-r":recordUp.name},recordUp.name),
        h("div",{class:"rulabel",style:"margin-top:10px;letter-spacing:3px;color:"+color+";font-size:clamp(18px,5vw,28px)"},recordUp.value),
        h("button",{class:"rudis",onClick:()=>setRecordUp(null)},"Continuer")
      )
    );
  }

  function ConfirmDungeonChoice(){
    if(!confirmDungeonChoice)return null;
    const isEnter=confirmDungeonChoice.type==="enter";
    const color=isEnter ? "#f59e0b" : (confirmDungeonChoice.color||"var(--rc)");
    const title=isEnter ? "ENTRER DANS UN DONJON ?" : "ACTIVER CE DONJON ?";
    const main=isEnter ? null : ((confirmDungeonChoice.icon||"")+" "+(confirmDungeonChoice.title||"Donjon"));
    const desc=isEnter
      ? "Vous vous retrouverez devant la porte d’un donjon, êtes-vous certain de vouloir y entrer ?"
      : "Ce choix consommera ton lancement de donjon du jour et comptera dans la limite hebdomadaire.";
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+color+"55;background:rgba(0,0,0,0.92)"},
      h("div",{class:"rucont",style:"width:min(330px,calc(100vw - 38px));background:rgba(15,15,18,0.96);border:1px solid "+color+"66;border-radius:18px;padding:20px;box-shadow:0 0 30px "+color+"22"},
        h("div",{class:"ruevol",style:"margin-bottom:10px;color:"+color},"CONFIRMATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:17px;font-weight:900;color:"+color+";letter-spacing:1px;text-transform:uppercase;text-align:center;line-height:1.25"},title),
        main&&h("div",{style:"font-size:14px;color:var(--tx);font-weight:800;text-align:center;margin-top:10px;line-height:1.35"},main),
        !isEnter&&h("div",{style:"font-size:10px;color:"+color+";font-family:Orbitron,sans-serif;text-align:center;margin-top:6px;letter-spacing:1px;text-transform:uppercase"},STAT_LBL[confirmDungeonChoice.stat]||confirmDungeonChoice.stat),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.5;text-align:center;margin-top:12px"},desc),
        h("div",{style:"display:flex;gap:10px;width:100%;margin-top:18px"},
          h("button",{
            onClick:()=>setConfirmDungeonChoice(null),
            style:"flex:1;padding:11px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },isEnter?"Non":"Annuler"),
          h("button",{
            onClick:()=>{
              const choice=confirmDungeonChoice;
              setConfirmDungeonChoice(null);
              if(choice.type==="enter") setDungeonChoiceOpen(true);
              else { setDungeonChoiceOpen(false); startDungeon(choice.id); }
            },
            style:"flex:1;padding:11px;border-radius:9px;border:1px solid "+color+";background:"+color+"1a;color:"+color+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },isEnter?"Oui":"Activer")
        )
      )
    );
  }


  function ConfirmReroll(){
    if(!confirmRerollSq)return null;
    return h("div",{class:"ruov",style:"--rc:#f59e0b;--rg:#f59e0b55;background:rgba(0,0,0,0.92)"},
      h("div",{class:"rucont",style:"width:min(330px,calc(100vw - 38px));background:rgba(15,15,18,0.96);border:1px solid #f59e0b66;border-radius:18px;padding:20px;box-shadow:0 0 30px #f59e0b22"},
        h("div",{class:"ruevol",style:"margin-bottom:10px;color:#f59e0b"},"CONFIRMATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:18px;font-weight:900;color:#f59e0b;letter-spacing:1px;text-transform:uppercase;text-align:center;line-height:1.25"},"Relancer la quête urgente ?"),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.5;text-align:center;margin-top:12px"},
          "Cette action remplacera la quête actuelle par une nouvelle. Tu ne peux relancer qu'une seule quête urgente par jour."
        ),
        h("div",{style:"display:flex;gap:10px;width:100%;margin-top:18px"},
          h("button",{
            onClick:()=>setConfirmRerollSq(null),
            style:"flex:1;padding:11px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Annuler"),
          h("button",{
            onClick:()=>{const sq=confirmRerollSq;setConfirmRerollSq(null);rerollSq(sq);},
            style:"flex:1;padding:11px;border-radius:9px;border:1px solid #f59e0b;background:rgba(245,158,11,0.1);color:#f59e0b;font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Relancer")
        )
      )
    );
  }


  function ConfirmRegressionModal(){
    if(!confirmRegression)return null;
    const color="#ef4444";
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+color+"55;background:rgba(0,0,0,.92)",onClick:e=>{if(e.target===e.currentTarget)setConfirmRegression(false);}},
      h("div",{class:"rucont",style:"width:min(500px,calc(100vw - 34px));background:rgba(15,15,18,.97);border:1px solid "+color+"88;border-radius:18px;padding:22px"},
        h("div",{class:"ruevol",style:"color:"+color},"CONFIRMATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:18px;font-weight:900;color:"+color+";letter-spacing:1px;text-transform:uppercase;text-align:center;line-height:1.25;margin-top:8px"},"Confirmer la régression ?"),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.55;text-align:center;margin-top:12px"},
          "Le même malus sera répercuté sur les deux compteurs : −"+REGRESSION_DEF.statPenalty.toLocaleString("fr-FR")+" XP sur chacune des six statistiques et −"+REGRESSION_DEF.globalPenalty.toLocaleString("fr-FR")+" XP sur l’XP globale."
        ),
        h("div",{style:"font-size:11px;color:#ef4444;line-height:1.45;text-align:center;margin-top:9px;font-family:Orbitron,sans-serif"},"Cette action est irréversible."),
        h("div",{style:"display:flex;gap:10px;width:100%;margin-top:18px"},
          h("button",{onClick:()=>setConfirmRegression(false),style:"flex:1;padding:12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1px;text-transform:uppercase;cursor:pointer"},"Annuler"),
          h("button",{onClick:applyRegression,style:"flex:1;padding:12px;border-radius:9px;border:1px solid "+color+";background:"+color+"18;color:"+color+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1px;text-transform:uppercase;cursor:pointer"},"Appliquer le malus")
        )
      )
    );
  }

  function RegressionUp(){
    if(!regressionUp)return null;
    const color="#ef4444";
    const glow="rgba(239,68,68,.72)";
    const particles=Array.from({length:46},(_,i)=>({
      id:i,left:Math.random()*100,delay:Math.random()*2.6,
      dur:1.05+Math.random()*1.8,size:2+Math.random()*5,accent:Math.random()>0.58
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow+";background:rgba(0,0,0,.94)"},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"#7f1d1d":color)+";box-shadow:0 0 10px "+glow+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont",style:"color:"+color},
        h("div",{class:"ruevol",style:"color:"+color+";text-shadow:0 0 18px "+glow+";font-size:clamp(21px,6vw,31px);letter-spacing:2px"},"☠️ REGRESSION"),
        h("div",{style:"max-width:340px;margin-top:16px;font-size:13px;line-height:1.55;text-align:center;color:"+color+";font-family:Orbitron,sans-serif"},
          "Vous avez succombé à la tentation, une pénalité vous est imposée :"
        ),
        h("div",{style:"margin-top:17px;font-family:Orbitron,sans-serif;font-size:clamp(20px,6vw,31px);font-weight:900;line-height:1.45;letter-spacing:1px;text-align:center;color:"+color+";text-shadow:0 0 14px "+glow},
          h("div",null,"-2000XP / STAT"),
          h("div",null,"-12000XP GLOBAL")
        ),
        h("button",{class:"rudis",style:"--rc:"+color+";--rg:"+glow+";color:"+color,onClick:()=>setRegressionUp(false)},"Continuer")
      )
    );
  }

  function ConfirmDebtModal(){
    if(!confirmDebt)return null;
    const obj=confirmDebt.obj;
    const color=STAT_COLOR[obj.stat]||"#f59e0b";
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+color+"55;background:rgba(0,0,0,.92)",onClick:e=>{if(e.target===e.currentTarget)setConfirmDebt(null);}},
      h("div",{class:"rucont",style:"width:min(500px,calc(100vw - 34px));background:rgba(15,15,18,.97);border:1px solid "+color+"88;border-radius:18px;padding:22px"},
        h("div",{class:"ruevol",style:"color:"+color},"CRÉER UNE DETTE ?"),
        h("div",{style:"font-size:15px;color:var(--tx);font-weight:800;margin-top:10px;text-align:center"},obj.name+" · "+fmtNum(confirmDebt.missing)+" "+obj.unit),
        h("div",{style:"font-size:11px;color:var(--td);line-height:1.5;text-align:center;margin-top:10px"},"La quantité manquante sera ajoutée à demain et devra être remboursée avant le reset suivant. Cette dette ne pourra pas être reportée."),
        h("div",{style:"display:flex;gap:10px;width:100%;margin-top:18px"},
          h("button",{onClick:()=>setConfirmDebt(null),style:"flex:1;padding:12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px"},"Annuler"),
          h("button",{onClick:()=>createQuestDebt(obj),style:"flex:1;padding:12px;border-radius:9px;border:1px solid "+color+";background:"+color+"22;color:"+color+";font-family:Orbitron,sans-serif;font-size:10px"},"Confirmer")
        )
      )
    );
  }

  function DebtUp(){
    if(!debtUp)return null;
    const color=debtUp.color||"#f59e0b";
    const glow=debtUp.glow||color+"66";
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol"},"DETTE REMBOURSÉE"),
        h("div",{class:"rulabel",style:"margin-top:10px;font-size:clamp(18px,5vw,28px);color:"+color},debtUp.name),
        h("div",{style:"margin-top:12px;display:flex;flex-direction:column;gap:5px"},
          (debtUp.rewards||[]).map((r,i)=>h("div",{key:i,class:"rulabel",style:"color:"+color},"+"+r.xp+" XP "+(STAT_LBL2[r.stat]||r.stat)))
        ),
        h("div",{class:"rulabel",style:"margin-top:10px;color:#4ade80"},"STREAK PRÉSERVÉ"),
        h("button",{class:"rudis",onClick:()=>setDebtUp(null)},"Continuer")
      )
    );
  }

  function ImportModal(){
    if(!importModal)return null;
    const color = rank.color;
    const soft = color + "33";
    const border = color + "99";
    function close(){
      setImportModal(false);
      setImportValue("");
    }
    function doImport(){
      const json=(importValue||"").trim();
      if(!json)return;
      try{
        const imported=JSON.parse(json);
        const cleaned=cleanSystemState(imported);
        setState(s=>({...s,...cleaned,objectives:DEFS}));
        close();
        setShowSet(false);
        spawnFloat("✅ Restauré !");
      }catch(_){
        const id=Date.now()+Math.random();
        setFloats(f=>[...f,{id,y:"38%",txt:"❌ Données invalides"}]);
        setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),1800);
      }
    }
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+rank.glow+";background:rgba(0,0,0,0.92)",onClick:e=>{if(e.target===e.currentTarget)close();}},
      h("div",{class:"rucont",style:"width:min(560px,calc(100vw - 34px));background:rgba(15,15,18,0.96);border:1px solid "+border+";border-radius:18px;padding:22px;box-shadow:none"},
        h("div",{class:"ruevol",style:"margin-bottom:10px;color:"+color},"IMPORTATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:clamp(22px,6vw,36px);font-weight:900;color:"+color+";letter-spacing:1px;text-transform:uppercase;text-align:center;line-height:1.15"},"Importer des données"),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.5;text-align:center;margin-top:12px"},
          "Colle ici les données exportées de ton Système."
        ),
        h("textarea",{
          value:importValue,
          onInput:e=>setImportValue(e.currentTarget.value),
          placeholder:"Données de sauvegarde...",
          spellCheck:false,
          style:"width:100%;height:170px;margin-top:18px;resize:vertical;border-radius:10px;border:1px solid "+border+";background:rgba(255,255,255,0.05);color:var(--tx);padding:12px;font-size:12px;line-height:1.45;outline:none;box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace"
        }),
        h("div",{style:"display:flex;gap:10px;width:100%;margin-top:18px"},
          h("button",{
            onClick:close,
            style:"flex:1;padding:12px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Annuler"),
          h("button",{
            onClick:doImport,
            style:"flex:1;padding:12px;border-radius:9px;border:1px solid "+color+";background:"+soft+";color:"+color+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Importer")
        )
      )
    );
  }

  function ExportCopiedModal(){
    if(!exportCopiedModal)return null;
    const color = rank.color;
    const soft = color + "33";
    const border = color + "99";
    function close(){ setExportCopiedModal(false); }
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+rank.glow+";background:rgba(0,0,0,0.92)",onClick:e=>{if(e.target===e.currentTarget)close();}},
      h("div",{class:"rucont",style:"width:min(470px,calc(100vw - 34px));background:rgba(15,15,18,0.96);border:1px solid "+border+";border-radius:18px;padding:22px;box-shadow:none"},
        h("div",{class:"ruevol",style:"margin-bottom:10px;color:"+color},"EXPORTATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:clamp(22px,6vw,34px);font-weight:900;color:"+color+";letter-spacing:1px;text-transform:uppercase;text-align:center;line-height:1.15"},"Données copiées"),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.5;text-align:center;margin-top:12px"},
          "Tes données ont bien été copiées dans le presse-papiers."
        ),
        h("div",{style:"display:flex;justify-content:flex-end;gap:10px;width:100%;margin-top:18px"},
          h("button",{
            onClick:close,
            style:"min-width:170px;padding:12px 18px;border-radius:9px;border:1px solid "+color+";background:"+soft+";color:"+color+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Fermer")
        )
      )
    );
  }

  function ExportManualModal(){
    if(!exportManualModal)return null;
    const color = rank.color;
    const soft = color + "33";
    const border = color + "99";
    function close(){
      setExportManualModal(false);
      setExportValue("");
    }
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+rank.glow+";background:rgba(0,0,0,0.92)",onClick:e=>{if(e.target===e.currentTarget)close();}},
      h("div",{class:"rucont",style:"width:min(560px,calc(100vw - 34px));background:rgba(15,15,18,0.96);border:1px solid "+border+";border-radius:18px;padding:22px;box-shadow:none"},
        h("div",{class:"ruevol",style:"margin-bottom:10px;color:"+color},"EXPORTATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:clamp(22px,6vw,36px);font-weight:900;color:"+color+";letter-spacing:1px;text-transform:uppercase;text-align:center;line-height:1.15"},"Copie manuelle"),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.5;text-align:center;margin-top:12px"},
          "Ton navigateur n'a pas pu copier automatiquement. Copie le texte ci-dessous."
        ),
        h("textarea",{
          value:exportValue,
          readOnly:true,
          spellCheck:false,
          style:"width:100%;height:170px;margin-top:18px;resize:vertical;border-radius:10px;border:1px solid "+border+";background:rgba(255,255,255,0.05);color:var(--tx);padding:12px;font-size:12px;line-height:1.45;outline:none;box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace"
        }),
        h("div",{style:"display:flex;gap:10px;width:100%;margin-top:18px"},
          h("button",{
            onClick:close,
            style:"flex:1;padding:12px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Fermer"),
          h("button",{
            onClick:e=>{ e.currentTarget.parentNode.parentNode.querySelector('textarea').select(); },
            style:"flex:1;padding:12px;border-radius:9px;border:1px solid "+color+";background:"+soft+";color:"+color+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Tout sélectionner")
        )
      )
    );
  }


  function StatDecadeUp(){
    if(!statDecadeUp)return null;
    const color = statDecadeUp.color || "#fbbf24";
    const glow = statDecadeUp.glow || color+"66";
    const label = String(statDecadeUp.label||statDecadeUp.stat||"STAT").toUpperCase();
    const particles=Array.from({length:34},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.4,
      dur:1.1+Math.random()*1.7,
      size:2+Math.random()*4,
      accent:Math.random()>0.6
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"rgba(255,255,255,0.65)":color)+";box-shadow:0 0 8px "+glow+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:"+rank.color+";text-shadow:0 0 14px "+rank.glow},"STAT LEVEL UP !"),
        h("div",{
          class:"rurank",
          style:"--rc:"+color+";--rg:"+glow+";color:"+color+";text-shadow:0 0 18px "+glow+";font-size:clamp(38px,12vw,68px);letter-spacing:-1px;white-space:normal;max-width:350px;line-height:1.05",
          "data-r":label
        },label),
        h("div",{class:"rulabel",style:"margin-top:10px;letter-spacing:3px;color:"+rank.color},"NIVEAU "+statDecadeUp.level),
        h("button",{class:"rudis",style:"--rc:"+rank.color+";--rg:"+rank.glow,onClick:()=>setStatDecadeUp(null)},"Continuer")
      )
    );
  }

  function LevelUp(){
    if(!levelUp)return null;
    const color = levelUp.color || rank.color;
    const glow = levelUp.glow || rank.glow;
    const particles=Array.from({length:34},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.4,
      dur:1.1+Math.random()*1.7,
      size:2+Math.random()*4,
      accent:Math.random()>0.65
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"rgba(255,255,255,0.65)":color)+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:"+color+";text-shadow:0 0 14px "+glow},"LEVEL UP !"),
        h("div",{class:"rurank",style:"color:"+color+";text-shadow:0 0 18px "+glow+";font-size:clamp(34px,10vw,58px);letter-spacing:-1px;white-space:nowrap;max-width:calc(100vw - 52px);line-height:1.05","data-r":"NIVEAU "+levelUp.level},"NIVEAU "+levelUp.level),
        h("button",{class:"rudis",onClick:()=>setLevelUp(null)},"Continuer")
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
        h(NotificationHeader,null),
        h("div",{class:"puatom"},"\u269B\uFE0F"),
        h("div",{class:"pubadge"},"Ascension "+ROMAN[prestigeUp-1]),
        h("button",{class:"pudis",onClick:()=>setPrestigeUp(null)},"Continuer")
      ),
      h("div",{class:"puline",style:"pointer-events:none"})
    );
  }

  // ─── ONGLET CODEX ─────────────────────────────────────────────────────


  function ItemLootUp(){
    if(!itemLootUp)return null;
    const it=INVENTORY_ITEMS[itemLootUp.item]||INVENTORY_ITEMS.minorElixir;
    const gold="#f59e0b", c=itemLootUp.kind==="rare"?gold:rank.color;
    return h("div",{class:"ruov",style:"--rc:"+rank.color+";--rg:"+rank.glow},h("div",{class:"rucont"},
      h(NotificationHeader,null),
      h("div",{class:"ruevol",style:"color:"+c},itemLootUp.kind==="rare"?"DROP RARE OBTENU !":"OBJET OBTENU !"),
      h("div",{class:"rurank",style:"font-size:clamp(34px,10vw,58px);white-space:normal;line-height:1.1;max-width:360px","data-r":it.name},it.name),
      h("button",{class:"rudis",onClick:()=>setItemLootUp(null)},"Continuer")
    ));
  }
  function ItemUseUp(){
    if(!itemUseUp)return null;
    const it=INVENTORY_ITEMS[itemUseUp.id];
    return h("div",{class:"ruov",style:"--rc:"+rank.color+";--rg:"+rank.glow},h("div",{class:"rucont"},
      h(NotificationHeader,null),
      h("div",{class:"ruevol",style:"color:"+rank.color},itemUseUp.id==="dungeonKey"?"Vous avez utilisé une":itemUseUp.id==="transmutationGrimoire"?"Transmutation accomplie":"Vous avez consommé un"),
      h("div",{class:"rurank",style:"font-size:clamp(32px,9vw,56px);white-space:normal;line-height:1.1;max-width:360px","data-r":it.name},it.name),
      itemUseUp.stat&&h("div",{class:"rulabel",style:"margin-top:12px;max-width:330px;line-height:1.5"},"Vous bénéficiez de +"+Math.round(itemUseUp.pct*100)+" % d’XP dans ",h("span",{style:"color:"+(STAT_COLOR[itemUseUp.stat]||rank.color)},STAT_LBL[itemUseUp.stat]||itemUseUp.stat)," pendant 24 h."),
      itemUseUp.global&&h("div",{class:"rulabel",style:"margin-top:12px;max-width:330px;line-height:1.5;color:#c084fc"},"Vous bénéficiez de +"+Math.round(itemUseUp.pct*100)+" % d’XP sur toutes les statistiques pendant 24 h."),
      itemUseUp.transmuted&&h("div",{class:"rulabel",style:"margin-top:12px;max-width:330px;line-height:1.5;color:#c084fc"},"3 Élixirs mineurs ont été fusionnés en 1 Élixir suprême."),
      h("button",{class:"rudis",onClick:()=>setItemUseUp(null)},"Continuer")
    ));
  }

  function Codex(){
    const toggleC = k => setCodexOpen(o=>({obl:false,bonus:false,reg:false,sq:false,ev:false,mm:false,debt:false,ep:false,dj:false,cs:false,[k]:!o[k]}));
    const statLabel = stat => STAT_LBL2[stat] || STAT_LBL[stat] || stat || "";
    const unitPlural = (unit, value) => {
      if(!unit) return "";
      if(value<=1) return unit;
      return ({rep:"reps",page:"pages",verre:"verres",km:"km",min:"min",jour:"jours",nuit:"nuits",repas:"repas",contact:"contacts",action:"actions"}[unit] || unit);
    };
    const ChevronC = ({k}) => h("span",{
      onClick:e=>{e.stopPropagation();toggleC(k);},
      style:"cursor:pointer;color:var(--td);font-size:10px;font-family:Orbitron,sans-serif;font-weight:700;letter-spacing:1px;flex-shrink:0;user-select:none"
    },codexOpen[k]?"▲":"▼");

    const cardStyle = "padding:10px;border:1px solid rgba(255,255,255,0.07);border-radius:10px;margin-bottom:7px;background:rgba(255,255,255,0.025)";
    const detailStyle = "font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;line-height:1.45";

    function StatPill({stat,xp}){
      const color=STAT_COLOR[stat]||"var(--rc)";
      const raw=String(xp);
      const slashIndex=raw.indexOf("/");
      const value=slashIndex>=0 ? raw.slice(0,slashIndex) : raw;
      const perUnit=slashIndex>=0 ? raw.slice(slashIndex+1) : "";
      const label="+"+value+" XP "+statLabel(stat)+(perUnit?"/"+perUnit:"");
      return h("span",{style:"display:inline-block;border:1px solid "+color+"55;color:"+color+";border-radius:999px;padding:2px 7px;margin:2px 4px 2px 0;font-size:10px;font-family:Orbitron,sans-serif;background:"+color+"11"},
        label
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
      const isWeekly = obj.weekly;
      const period = isWeekly ? " / semaine" : " / jour";
      if(obj.binary) return "Validation simple";
      if(obj.tiers) return (obj.target||obj.base||1)+" "+unitPlural(obj.unit,obj.target||obj.base||1)+period;
      const base = getRankBase(obj.id, ri, prestige, state.stats);
      return base+" "+unitPlural(obj.unit,base)+period;
    }

    function renderExerciseFamiliesCodex(){
      const force=Math.max(1,Number((state.stats||{}).Force)||1);
      const tier=statLevelTier(force);
      const familyStyle="padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:rgba(255,255,255,.025);margin-bottom:9px";
      const subStyle="padding:9px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:rgba(255,255,255,.025);margin-top:7px";
      const objective=(value,unit)=>fmtNum(value)+" "+unit+" / jour";
      function Reward({stat,xp}){
        return h("span",{style:"display:inline-block;border:1px solid "+(STAT_COLOR[stat]||"var(--rc)")+"55;color:"+(STAT_COLOR[stat]||"var(--rc)")+";border-radius:999px;padding:2px 7px;margin:2px 4px 2px 0;font-size:10px;font-family:Orbitron,sans-serif;background:"+(STAT_COLOR[stat]||"var(--rc)")+"11"},"+"+xp+" XP "+statLabel(stat));
      }
      function Exercise({icon,name,target,unit,rewards}){
        return h("div",{style:subStyle},
          h("div",{style:"display:flex;align-items:center;gap:7px;font-size:12px;color:var(--tx);font-weight:800"},h("span",{style:"font-size:15px"},icon),name),
          h("div",{style:"margin-top:5px"},(rewards||[]).map((r,i)=>h(Reward,{key:i,stat:r.stat,xp:r.xp}))),
          h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;line-height:1.45;margin-top:4px"},"▸ Objectif : "+objective(target,unit))
        );
      }
      const pushTarget=getStatLevelTarget("push",state.stats);
      const absTarget=getStatLevelTarget("abs",state.stats);
      const legRaiseTarget=legRaiseTargetForForceLevel(force);
      const plankTarget=Math.max(1,Math.ceil(force/10));
      const sideTarget=Math.min(60,24+tier*2);
      const squatTarget=getStatLevelTarget("squats",state.stats);
      const calvesTarget=getStatLevelTarget("calves",state.stats);
      return h(Fragment,null,
        h("div",{style:familyStyle},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:12px;color:"+STAT_COLOR.Force+";letter-spacing:1px"},"🦾 PECS & TRICEPS"),
          h(Exercise,{icon:"💪🏼",name:"Pompes",target:pushTarget,unit:"reps",rewards:[{stat:"Force",xp:"3/rep"}]}),
          h(Exercise,{icon:"💪🏼",name:"Dips",target:pushTarget,unit:"reps",rewards:[{stat:"Force",xp:"3/rep"}]})
        ),
        h("div",{style:familyStyle},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:12px;color:"+STAT_COLOR.Force+";letter-spacing:1px"},"🧱 ABDOS"),
          h(Exercise,{icon:"🧎🏻",name:"Crunches",target:absTarget,unit:"reps",rewards:[{stat:"Force",xp:"1,5/rep"}]}),
          h(Exercise,{icon:"🦵🏻",name:"Levées de jambes",target:legRaiseTarget,unit:"reps",rewards:[{stat:"Force",xp:"3/rep"}]}),
          h(Exercise,{icon:"🫳🏼",name:"Gainage",target:plankTarget,unit:"min",rewards:[{stat:"Force",xp:"50/min"}]}),
          h(Exercise,{icon:"🧎🏻‍♂️‍➡️",name:"Gainage obliques",target:sideTarget,unit:"reps",rewards:[{stat:"Force",xp:"6/rep"}]}),
        ),
        h("div",{style:familyStyle},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:12px;color:"+STAT_COLOR.Force+";letter-spacing:1px"},"🦿 JAMBES"),
          h(Exercise,{icon:"🦵🏻",name:"Squats",target:squatTarget,unit:"reps",rewards:[{stat:"Force",xp:"3/rep"},{stat:"Agilite",xp:"3/rep"}]}),
          h(Exercise,{icon:"🦵🏻",name:"Mollets",target:calvesTarget,unit:"reps",rewards:[{stat:"Force",xp:"1,5/rep"},{stat:"Agilite",xp:"1/rep"}]}),
          h(Exercise,{icon:"🦵🏻",name:"Fentes",target:pushTarget,unit:"reps",rewards:[{stat:"Force",xp:"3/rep"}]})
        )
      );
    }

    function renderQuest(obj){

      const subtitle = obj.desc || obj.subtitle || "";
      return h("div",{key:obj.id,style:cardStyle},
        h("div",{style:"display:flex;align-items:center;gap:8px"},
          QuestIcon(obj.id,obj.icon||"•",14,"line-height:1.1;min-width:24px;text-align:center"),
          h("div",{style:"flex:1;min-width:0"},
            h("div",{style:"font-size:13px;color:var(--tx);font-weight:700;line-height:1.15;display:flex;align-items:center;gap:6px;flex-wrap:wrap"},
              obj.name,
              (obj.weekly)&&h(QuestBadge,{label:"HEBDO",color:WEEKLY_BADGE_COLOR})
            ),
            subtitle&&h("div",{style:"font-size:10px;color:var(--td);margin-top:3px;line-height:1.25"},subtitle),
            h("div",{style:"margin-top:7px"},renderXpPills(obj)),
            h("div",{style:"display:flex;flex-direction:column;gap:3px;margin-top:6px"},
              h("div",{style:detailStyle},"▸ Objectif : "+targetForQuest(obj))
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
        h("div",{style:"display:flex;align-items:center;gap:8px"},
          QuestIcon(q.id,q.icon||"🚨",14,"line-height:1.1;min-width:24px;text-align:center"),
          h("div",{style:"flex:1;min-width:0"},
            h("div",{style:"font-size:13px;color:var(--tx);font-weight:700;line-height:1.15"},q.name),
            q.desc&&h("div",{style:"font-size:10px;color:var(--td);margin-top:3px;line-height:1.25"},q.desc),
            h("div",{style:"margin-top:7px"},renderXpPills(q)),
            h("div",{style:"display:flex;flex-direction:column;gap:3px;margin-top:6px"},
              h("div",{style:detailStyle},"▸ Objectif : "+targetForSpecial(q)),
              h("div",{style:detailStyle},"▸ Délai : "+(q.days||1)+" jour"+((q.days||1)>1?"s":""))
            )
          )
        )
      );
    }

    function renderElanCodex(ev){
      const color=STAT_COLOR[ev.stat]||"var(--rc)";
      return h("div",{key:ev.id,style:cardStyle},
        h("div",{style:"display:flex;align-items:flex-start;gap:8px"},
          h("div",{style:"font-size:16px;line-height:1;min-width:24px;text-align:center"},"✦"),
          h("div",{style:"flex:1;min-width:0"},
            h("div",{style:"font-size:13px;color:var(--tx);font-weight:700;line-height:1.15"},ev.title),
            h("div",{style:"font-size:9px;color:"+color+";margin-top:3px;font-family:Orbitron,sans-serif;letter-spacing:1px;text-transform:uppercase"},"Bonus de stat"),
            h("div",{style:"font-size:10px;color:var(--td);margin-top:5px;line-height:1.35"},ev.desc),
            h("div",{style:"margin-top:7px"},
              h("span",{style:"display:inline-block;border:1px solid "+color+"55;color:"+color+";border-radius:999px;padding:2px 7px;margin:2px 4px 2px 0;font-size:10px;font-family:Orbitron,sans-serif;background:"+color+"11"},"+15% XP "+statLabel(ev.stat))
            )
          )
        )
      );
    }

    function renderDungeonCodex(dg){
      const rewards=dungeonRewardPairs(dg);
      return h("div",{key:dg.id,style:cardStyle},
        h("div",{style:"display:flex;align-items:flex-start;gap:8px"},
          h("div",{style:"font-size:18px;line-height:1;min-width:24px;text-align:center"},dg.icon),
          h("div",{style:"flex:1;min-width:0"},
            h("div",{style:"font-size:13px;color:var(--tx);font-weight:700;line-height:1.15"},dg.title),
            h("div",{style:"font-size:10px;color:"+(STAT_COLOR[dg.stat]||dg.color)+";margin-top:3px;font-family:Orbitron,sans-serif;letter-spacing:1px;text-transform:uppercase"},statLabel(dg.stat)),
            h("div",{style:"margin-top:7px"},rewards.map((r,i)=>h(StatPill,{key:i,stat:r.stat,xp:r.xp}))),
            h("div",{style:"display:flex;flex-direction:column;gap:5px;margin-top:8px"},
              dg.rooms.map((room,i)=>h("div",{key:i,style:detailStyle},
                "▸ "+(i===dg.rooms.length-1?"Boss":"Salle "+(i+1))+" — "+room.name+" : "+room.desc+" · "+dungeonRoomRewardPairs(dg,i).map(r=>"+"+r.xp+" XP "+(STAT_LBL[r.stat]||r.stat)).join(" / "),
                room.help&&h("div",{style:"margin-top:4px;padding:7px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);line-height:1.45"},
                  h("div",{style:"color:"+(STAT_COLOR[dg.stat]||dg.color)+";font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px"},room.helpTitle||"Aide"),
                  room.help
                )
              ))
            ),
            h("div",{style:"margin-top:11px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.07)"},
              h("div",{style:"font-size:9px;color:"+(STAT_COLOR[dg.stat]||dg.color)+";font-family:Orbitron,sans-serif;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:7px"},"Boss de Rupture — +1350 / +270 XP"),
              (DUNGEON_RUPTURE_BOSSES[dg.id]||[]).map(rb=>{
                const meta=DUNGEON_RUPTURE_RARITIES[rb.rarity]||DUNGEON_RUPTURE_RARITIES.mineur;
                return h("div",{key:rb.id,style:"margin-bottom:7px;padding:7px 8px;border-radius:8px;border:1px solid "+meta.color+"33;background:"+meta.color+"08"},
                  h("div",{style:"font-size:10px;color:"+meta.color+";font-family:Orbitron,sans-serif;letter-spacing:.8px;text-transform:uppercase"},meta.label+" — "+rb.name),
                  h("div",{style:"font-size:10px;color:var(--td);line-height:1.4;margin-top:3px"},rb.objective)
                );
              })
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
            h("div",{class:"ctitle",style:"margin:0"+(id==="reg"?";color:#ef4444":"")},title),
            h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;margin-top:3px"},count+" entrée"+(count>1?"s":""))
          ),
          h(ChevronC,{k:id})
        ),
        open&&children
      );
    }

    function xpTotalsByStat(item){
      const totals={};
      const add=(stat,xp)=>{
        if(!stat || xp==null) return;
        const n=parseFloat(String(xp).split("/")[0]);
        if(!Number.isFinite(n)) return;
        totals[stat]=(totals[stat]||0)+n;
      };
      if(item.tiers){
        item.tiers.forEach(t=>{
          add(t.stat,t.xp);
          add(t.stat2,t.xp2);
          add(t.stat3,t.xp3);
        });
      }else{
        if(item.binary && item.binaryXp) add(item.stat,item.binaryXp);
        else if(item.xp) add(item.stat,item.xp);
        else if(item.xpPer) add(item.stat,item.xpPer);
        if(item.xp2&&item.stat2) add(item.stat2,item.xp2);
        if(item.xp3&&item.stat3) add(item.stat3,item.xp3);
        if(item.xpPer2&&item.stat2) add(item.stat2,item.xpPer2);
      }
      if(item.overGoalXpPer&&item.overGoalStat) add(item.overGoalStat,item.overGoalXpPer);
      return totals;
    }

    function dominantStat(item,fallback){
      const tieOverride = {
        calves:"Force",
        sp_cold:"Sante",
        ep_coldweek:"Sante",
        dj_cold:"Sante",
        dj_douche_froide:"Sante",
        dj_froid:"Sante"
      }[item.id];
      if(tieOverride) return tieOverride;
      const totals=xpTotalsByStat(item);
      const entries=Object.entries(totals).filter(([stat,xp])=>STATS.includes(stat)&&xp>0);
      if(entries.length===0) return fallback || item.stat || "Discipline";
      entries.sort((a,b)=>b[1]-a[1]);
      if(entries.length>1 && entries[0][1]===entries[1][1]) return fallback || item.stat || entries[0][0];
      return entries[0][0];
    }

    function groupByDominantStat(list,render,fallbackStatGetter){
      const groups=STATS.map(stat=>({stat,list:[]}));
      list.forEach(item=>{
        const fallback = fallbackStatGetter ? fallbackStatGetter(item) : item.stat;
        const stat = dominantStat(item,fallback);
        const group = groups.find(g=>g.stat===stat) || groups[groups.length-1];
        group.list.push(item);
      });
      return groups.filter(g=>g.list.length>0).map(group=>h("div",{key:group.stat,style:"margin-bottom:13px"},
        h("div",{style:"font-size:11px;color:"+(STAT_COLOR[group.stat]||"var(--rc)")+";font-family:Orbitron,sans-serif;letter-spacing:1px;text-transform:uppercase;margin:2px 0 7px"},statLabel(group.stat)),
        group.list.map(render)
      ));
    }

    function renderRequiredCodex(){
      const rotatingIds=new Set(["push","abs","squats","calves"]);
      const staticRequired=objs.filter(o=>o.daily&&!o.optional&&!rotatingIds.has(o.id));
      const groups=STATS.map(stat=>({stat,list:[]}));
      staticRequired.forEach(item=>{
        const stat=dominantStat(item,item.stat);
        (groups.find(g=>g.stat===stat)||groups[groups.length-1]).list.push(item);
      });
      return groups.map(group=>{
        const hasExerciseFamilies=group.stat==="Force";
        if(!hasExerciseFamilies&&group.list.length===0) return null;
        return h("div",{key:group.stat,style:"margin-bottom:13px"},
          h("div",{style:"font-size:11px;color:"+(STAT_COLOR[group.stat]||"var(--rc)")+";font-family:Orbitron,sans-serif;letter-spacing:1px;text-transform:uppercase;margin:2px 0 7px"},statLabel(group.stat)),
          hasExerciseFamilies&&renderExerciseFamiliesCodex(),
          group.list.map(renderQuest)
        );
      }).filter(Boolean);
    }

    const required = objs.filter(o=>o.daily&&!o.optional);
    const weeklyCodex = objs.filter(o=>o.weekly);
    const bonus = objs.filter(o=>o.optional&&!o.weekly&&!o.bonusHidden);
    const hiddenBonus = objs.filter(o=>o.optional&&!o.weekly&&o.bonusHidden);
    const specialList = STATS.flatMap(stat=>(SP[stat]||[]).map(q=>({...q,stat:q.stat||stat})));
    const elanList=EVENT_BONUSES.filter(e=>!e.disabled).map(e=>({...e,type:"bonus"}));

    return h("div",{class:"tab"},
      h("div",{class:"card"},
        h("div",{class:"ctitle"},"Codex"),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.45"},"Catalogue complet des quêtes existantes. Les objectifs des quêtes quotidiennes et hebdomadaires sont calculés au rang actuel.")
      ),
      h(Section,{id:"obl",title:"Quêtes journalières",count:required.length},renderRequiredCodex()),
      h(Section,{id:"bonus",title:"Quêtes bonus",count:bonus.length+hiddenBonus.length},
        h(Fragment,null,
          groupByDominantStat(bonus,renderQuest),
          hiddenBonus.length>0&&h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin:10px 0 8px"},"BONUS MASQUÉS / CONTEXTUELS"),
          hiddenBonus.length>0&&groupByDominantStat(hiddenBonus,renderQuest)
        )
      ),
      h(Section,{id:"sq",title:"Quêtes urgentes",count:specialList.length},groupByDominantStat(specialList,renderSpecial)),
      h(Section,{id:"dj",title:"Donjons",count:DUNGEONS.length},
        h(Fragment,null,
          h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;line-height:1.5;margin-bottom:10px"},"Après 24 h, un donjon inachevé subit une Rupture : les salles déjà validées et leurs XP sont conservés, toutes les étapes restantes sont remplacées par un Boss de Rupture tiré selon sa rareté. Ce boss dispose de 24 h et ne peut pas provoquer une seconde rupture."),
          groupByDominantStat(DUNGEONS,renderDungeonCodex,dg=>dg.stat)
        )
      ),
      false&&h(Section,{id:"elan",title:"Élans",count:elanList.length},
        h(Fragment,null,
          h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;line-height:1.45;margin-bottom:7px"},"Bonus automatiques de +15 % XP accordés le lendemain d’un donjon complété et appliqués aux gains de la stat concernée."),
          h("div",{style:"display:flex;flex-direction:column;gap:3px;margin-bottom:10px"},
            h("div",{style:detailStyle},"▸ Déclenchement : le lendemain d’un donjon normal complété"),
            h("div",{style:detailStyle},"▸ Sélection : une stat aléatoire parmi Santé / Force / Esprit / Endurance / Agilité, pondérée selon les XP gagnés la veille"),
            h("div",{style:detailStyle},"▸ Exclusion : la Discipline ne peut pas être tirée"),
            h("div",{style:detailStyle},"▸ Durée : jusqu’au reset de 7h"),
            h("div",{style:detailStyle},"▸ Effet : bonus automatique sur les gains de la stat concernée")
          ),
          elanList.map(renderElanCodex)
        )
      ),
      h(Section,{id:"debt",title:"Système de dette",count:1},
        h(Fragment,null,
          h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;line-height:1.45;margin-bottom:7px"},"Le système de dette permet de reporter uniquement la quantité manquante d’une quête obligatoire compensable, afin de préserver le streak sous condition de remboursement."),
          h("div",{style:"display:flex;flex-direction:column;gap:3px;margin-bottom:2px"},
            h("div",{style:detailStyle},"▸ Déclenchement : lorsqu’une quête obligatoire compensable n’est pas terminée"),
            h("div",{style:detailStyle},"▸ Report : seule la quantité manquante devient une dette"),
            h("div",{style:detailStyle},"▸ Limites : une seule dette active et maximum trois dettes par semaine"),
            h("div",{style:detailStyle},"▸ Remboursement : le lendemain, avant l’objectif du jour ; une dette ne peut jamais être reportée"),
            h("div",{style:detailStyle},"▸ Streak : gelé jusqu’au remboursement, puis préservé si la dette est soldée"),
            h("div",{style:detailStyle},"▸ XP et records : XP conservés, sans bonus de dépassement et sans record"),
            h("div",{style:detailStyle},"▸ Quêtes compensables : Pecs, Abdos, Jambes, Tractions négatives et Lecture")
          )
        )
      ),
      h(Section,{id:"reg",title:"Régressions",count:1},
        h("div",{style:cardStyle},
          h("div",{style:"display:flex;align-items:flex-start;gap:10px"},
            QuestIcon(REGRESSION_DEF.id,REGRESSION_DEF.icon,14,"width:18px;height:18px;line-height:1;flex-shrink:0"),
            h("div",{style:"flex:1;min-width:0"},
              h("div",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:#ef4444;line-height:1.4;margin-bottom:7px"},"-2000 XP sur chaque statistique · -12000 XP global"),
              h("div",{style:detailStyle},"▸ Activation : manuelle, depuis l’onglet Quêtes"),
              h("div",{style:detailStyle},"▸ Fréquence : une seule déclaration par jour"),
              h("div",{style:detailStyle},"▸ Effet : le niveau global et les niveaux de statistiques peuvent diminuer")
            )
          )
        )
      )
    );
  }
  // ─── RENDU PRINCIPAL ──────────────────────────────────────────────────

  const parts=Array.from({length:15},(_,i)=>({id:i,s:Math.random()*3+1,l:Math.random()*100,dur:Math.random()*10+8,del:Math.random()*10}));

  const DAILY_MANTRAS = [
    "Accepte ce que tu ne peux contrôler.",
    "Mets de l'ordre dans ce que tu maîtrises.",
    "Fais toujours de ton mieux.",
    "N'en fais jamais une histoire personnelle.",
    "Observe, vérifie, puis agis.",
    "Agis pour toi-même, pas pour la reconnaissance d'autrui.",
    "Concentre-toi sur l'essentiel.",
    "Aie toujours une parole impeccable.",
    "Tiens-toi droit.",
    "Assume tes responsabilités.",
    "Apprécie les choses simples de la vie."
  ];
  const mantraDayIndex = Math.floor(new Date(today).getTime()/86400000);
  const dailyMantra = DAILY_MANTRAS[Math.abs(mantraDayIndex)%DAILY_MANTRAS.length];
  const mantraColor = STAT_COLOR.Force || "#fb923c";

  return h(Fragment,null,
    h("div",{id:"app"},
      h("div",{class:"particles"},parts.map(p=>h("div",{key:p.id,class:"particle",style:"width:"+p.s+"px;height:"+p.s+"px;left:"+p.l+"%;bottom:-10px;background:"+rank.color+";box-shadow:0 0 4px "+rank.glow+";animation-duration:"+p.dur+"s;animation-delay:"+p.del+"s"}))),
      h("div",{class:"hdr-wrap"},
        h("div",{class:"hdr"},
          h("div",{class:"hdr-top",style:"position:relative;display:flex;align-items:center;gap:8px"},
            h("div",{style:"flex:1;min-width:0;padding-right:4px"},
              h("div",{class:"pname"},"VAL,"),
              h("div",{style:"margin-top:6px;width:100%;min-height:26px;font-size:9.5px;line-height:1.3;color:"+mantraColor+";font-family:Orbitron,sans-serif;letter-spacing:0.5px;text-transform:uppercase;display:block;opacity:.96;white-space:normal;overflow:hidden"},dailyMantra)
            ),
            prestige>0&&h("div",{class:"prestige-badge"},"\u269B\uFE0F Ascension "+ROMAN[prestige-1]),
            h("div",{style:"display:flex;align-items:center;gap:2px;flex:0 0 auto;transform:translateY(-2px)"},
              h("button",{class:"gbtn",title:"Codex","aria-label":"Ouvrir le Codex",style:"display:flex;align-items:center;justify-content:center;width:40px;height:40px;padding:0;font-size:23px;line-height:1",onClick:()=>switchTab("codex")},"📜"),
              h("button",{class:"gbtn",title:"Réglages","aria-label":"Ouvrir les réglages",style:"display:flex;align-items:center;justify-content:center;width:40px;height:40px;padding:0;font-size:24px;line-height:1",onClick:()=>setShowSet(true)},"⚙️")
            )
          )
        )
      ),
      h("div",{class:"scroll-area",ref:scrollRef},
        h("div",{style:"height:26px;flex:0 0 auto"}),
        tab==="home"    &&h(Home,null),
        tab==="quests"  &&h(Quests,null),
        tab==="inventory"&&h(Inventory,null),
        tab==="stats"   &&h(Stats,null),
        tab==="history" && History(),
        tab==="codex"   && h(Codex,null),
        floats.map(f=>h("div",{key:f.id,class:"xpfloat",style:"top:"+(f.y||"40%")+(typeof f.y==="number"?"px":"")+";left:50%;transform:translateX(-50%);white-space:pre-line;text-align:center"},f.txt))
      ),
      h("nav",{class:"nav"},
        h("button",{class:"nbtn "+(tab==="home"?"on":""),onClick:()=>switchTab("home")},
          h("span",null,"Accueil")
        ),
        h("button",{class:"nbtn "+(tab==="quests"?"on":""),onClick:()=>switchTab("quests")},
          h("span",null,"Quêtes")
        ),
        h("button",{class:"nbtn "+(tab==="inventory"?"on":""),onClick:()=>switchTab("inventory")},
          h("span",null,"Inventaire")
        ),
        h("button",{class:"nbtn "+(tab==="stats"?"on":""),onClick:()=>switchTab("stats")},
          h("span",null,"Stats")
        ),
        h("button",{class:"nbtn "+(tab==="history"?"on":""),onClick:()=>switchTab("history")},
          h("span",null,"Historique")
        ),

      ),
      h(Settings,null),
      h(RankUp,null),
      h(LevelUp,null),
      h(StatDecadeUp,null),
      h(CompletionUp,null),
      h(StreakUp,null),
      h(RecordUp,null),
      h(DungeonKeyLootUp,null),
      h(ItemLootUp,null),
      h(ItemUseUp,null),
      h(InventoryItemModal,null),
      h(ConfirmItemUseModal,null),
      h(ElixirStatModal,null),
      h(ConfirmElixirModal,null),
      h(DungeonUp,null),
      h(DungeonRuptureUp,null),
      h(UrgentUp,null),
      h(DebtUp,null),
      h(ConfirmRegressionModal,null),
      h(RegressionUp,null),
      h(ConfirmDebtModal,null),
      h(ConfirmDungeonChoice,null),
      h(ConfirmReroll,null),
      h(ImportModal,null),
      h(ExportCopiedModal,null),
      h(ExportManualModal,null),
      h(PrestigeUp,null),
    )
  );
}

render(h(App,null),document.getElementById("app"));
