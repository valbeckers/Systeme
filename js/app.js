
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
  const MINOR_ELIXIR_ICON_DATA="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAYAAACLz2ctAACOJklEQVR42uz9d5hk13XeC//23idVruocZronz2ASciBAEoyiSDGKIhVpypZkBStcXdkKtmQSVpZNSVagLYlUIk2JlMQcAIIgGEASOU7E5J6Zzt2V68S99/3j9BAj+d77fdeGSADEmaeffqarq7rqnPes8K613gXPH88fzx/PH88fzx/PH9+EQzx/Cv6/HxYEduPs2f+9My++/pLPA/D5458C7NJJEv+8ALH2n1wHAeJbBJTPA/AyELzznYh3vhP7/wtwv/HyqeHqUKHRiWJGaz7bZsdtteJskzLbI4QjjE7RmWGQZNYaIROju/12+Kgd6JaRroSY88sxg16W/srdi0tA9P8IzOc4GJ8H4P+NI/2l1+0f3z4djDqZsNPj/mTJN1f7Eq9aD2ylEQhPyX2ZFDuVV7aOK0gHAzCM+eXSZJamQmKQQiOMBmGwRkSDvj6nEz0w1gidRPiBKzNje+1++uB6M1wRQh07fS461Y8z88ix6OKfPnS6863gmp8H4MZ5+MPv3rPz2j31eqnq7agMFd5UL3p7hHKttGnV99WUkZ6js9gKa3BcT9rM0JlfIOoNqE5PIgsl2sttStUKmBSdDfBLVbQxuJ7CxiFCa6xQOMWAzoXzWGMoNOp4pcBoI5aMkevRIEvCKHusH6Unzp9qPfyB29ef+OsTFxYB/TwAn4PHW6oM/djPvvjb9++o/GtX6hnXlxXHZiMm0wRlnzRTrC22SAZr1KY345crWJQ1xlidpSjXR+gULMIqD4RFeAFojQ5jpO8jbQI6RghhrbBkcYyVDm6xJNLmsmgvrFMeHkJai/JdhBVkmc2EYKnVjB99+Fz0ma/ev3bvf/npa54Qb/275HkAPmeOTYVH/uCqH5upRL+QxYPxQq2CUy4CxmZRhycPLXLiSIs910wxu38K3ykgsUjlCGMh7rQQ1uAEBbAW0AgJRlukX0anhrjTxikECAxepY5JIoROEIUKRhgunG0S2NDWSh46tazNL6L8gGKpJGyWUSgXMEFx8QsPzH/iSw+33//731P9mvjRh9LnyhVwvlWhd/c7bnUef+DM1dKELw17rXG8snWlg3Iclufmxfnj84SZ5KVvu4HxLWPEC6vYNEG6HqCRFryCQoeaLAxxCx4IjRAK3V8H6eIUyziFEXSaEbeb0G2jreLUI8eYnvbBJDTPdhkdr4he6BFHKY7rgE6I+9Zm1hLGMb5emdjs9d9S9sL0o0emHgdaFsRzITmR36oAfAkvMY9eWL+idfyJK1fmW7ZSlWAGItNGnLrvBMMVw4teMkVdDOgfO4bNIpQzwDJAJwOsTNCZBlehigE4HqpQBaFwijXcegNVHUaW6ggp8cs+ytUozzBxxTZiypx+YJ7dO4pUAglJhsSjWCpTrAYU60VRLPtCCi16qTBzZ5r1uNWaOpaUxXPJdX0rWsA8633nPnHuvXr7kePtmelGD5v0aGwagtQyOhEwu80h6fXxipZgcor1C+vEvTWm989gBj2insSpbkL6CtNdxgzaJL0YJSVCeWRLZ1BBERGUcByJxQdhEGnC9NY6UTZKM6zxtx+7l5e/bJr+Ssj4phIIy6AXMjTmE3Z7tDsZDzw0L/qhta0Buj/Xfk5djG9ZFwzgOngZmruPZPYlWDG/knHHQxc5uNuw/7oxmm1NaXgYugv4po8zVWfl7EUWj5xn5sA0Ao2So6SpQrkejqdwyhV0moEQqOoowilg2quYNAPhoBzDYGkdisNMj8SMDVsefnCeG68aIyj7eJUKtbEqJx89yV1fmuPskqZadlGuFJFVYuQ5dg2+pQHYirFbJ13mViIeO6fZMzXg9HLMNbt9Vk91KF57BWp2F4iM5qe/TP/wE0zsn0ZvvorFcwvUtlSYmBihNFmC3hoCidEWx2yc2SyGOEYWPKwnEcJBGxev5iB9TTpY4QUvnGByxxid8wmpkRx94BxHjs/zwOE2/UyQIZGewQMi41Or5e/dPkfc8LcwAN9CyXk7p5cExcDF8yz4ll3TDvcfjrlpmyA9eQLW5ggmSpQ2j9O+cI7S1iu4evOVZIAUHczKGdKVOZyJWVS5gcosRhXRWYJNI2xvHXwPmYRop4E7vgs5OA3NcxTH6gjd4fDXFpg7G3Lk2AqrzYReDLEFR4EUlm4mmRmt4hoHeN4FP3dcsKuENRmBC0MVKASCQFnOrsPnHk15bW2ZTsvj8F19HnhwwF1nJO9qfJap6QdprhqWz7aoTlbZ+uqDkFwkOXOKpNWmOFxFRi3MyhpeLSCNwaQuSa9DqCxhJ2b1bMzSfIvF1ZS5NQg1lMqCclUSdcAaS6YtjhK0Io11PFxXyJnaDPDE8wB8Dhy27BWiM0vrZqwmZD80zC1YDALjSP7hoYzxxoD9Wy3CupSHC5TnYwbNBHYYWu0Ba6t9HNfw2T/6GrsOltiyb4okXufcg/Pc97U1ji4ZOhKm/Yz+eooVlpkhsLHFaliPoRkJTq3BVEMiU0trYNEajLFYQFvIjBAWZVJt5r7vpcXo+//bcycL/lakYSwghBBmuFF8ME7FyqCv6YfYakGilEUIg7WCs+uwshzSGfTZPK5564t8dGT44F+c5T/90TJHl13SWkCqUz763rMcuXeObiwQzRb3P9Rl7kzI8Uf6/NXnY1qRZOeExHMEkRB0hWSQgtFQ9S1Wa8LUkGSWMLVkViDyrghbLwis1oPF0Dwk3vp3If97jWDPA/AZQsUI6bmL3ZSwHCiiTOBsmBWTGRoFSziwdFPBILOcWkooVlMyaRguwbXXShqlkL/5+BrFScGLX+TQOrvA7e87zufvH3DMOBxrwQKKniOYHoUXHlAIDAJL4FnGhwS1smWoDEUfoiQvqGibF36lIzBAw5d0M2w/cVJrrXgO0YDfkgAU9h3vALCv2LdroZk4J1cHGmssqTEELgRKkGTQDQ0m02Qatowr4oGm308JioKX77a84CqP735JwGP3D+jFkrExxctfHtDxJWPSsqUCr92l+M1X+mypwYVFTeAKXCHQBjJtsRYaRaj40AzBdaBWhGoBCq5AISiVXbphZoYCNxNCWGutvfxGeh6Azx6rB2DFbbcZwJ2ZzEzBURfXQ4HWgAElwCDRNgchAuaWDELlT3ekwPWgPYDWuqHsCb7728pMTrqkkaXdSnjNnoytVUvgWnSY8eGHYgyGVtdgLfg+RKklMWAAKWClB2kG9UAgRA5Eg8m/W0GrHfeu2DqmAF8IIa39kNpww89qRkZ8iwDv6/HSLY1g5sd+7TcObDtw4y399treL/zZb+8/cf9Xto+WBXunJMvRBuAklIqCF+8RNDsWbfNMGWCxBZsmBENlh+5AsXNXCRMN0EmCyWDQN4RaksWCrx3L2DImGK0akgTiBLqJpRdDZiCMQRtYaOegK/mCfgZSCbQR+MUSySCkO3Fj9B0//G8eO3H40CNSmYt3ffzDK3bl1NHPf/4vHhW73tZ5Pgt+ZicdvPTqK2bf8oM/9srdO3e+uVCpX7W6vDQaZUZ5U7tw3a/iupJODBMVSbuliTIYKubl/npZ0Olquj0oBZLZEYgjy+HFjK1TivOn+hhrMIlmdFgigIsLml4E/Viw3IWChH6c3wedHggFxoIxEKWgJKQaBplFSIWxkkEqkSKg3e2w4ztuCBIjb6zUGzdOz0wnO/dfu3LX7Z9o3vBtP/ml3/rhW979i+/5yuFnY3KinsvIu/d976jGzdWX/OAP/vBrXvYd3/V/jIyN/VCSmf1z586X+52WbK2v2SOPPy6WL5xi27hipABxajHkYBitSzaNKlwFjiMoFyRrHcvZRUtmwHfBERaJpT/QJKmh04PBAJIMCj4IBMZaCgqwuatPDKQ2t4BW5wBsxTkYlRIYI4gSS2okBc9jYATe1BUMD9esFNDpdJ3pTdPVl73sFWMjm3dc96k7vjz87furjz1wqrn+bLtGz1kAWmvVD37nG14yc/VL/+MVB294+9Li4p6VlaWg1e5ZozPW19fF/PyiWFhc5Py5Oc6uaiZLCm0FBccQeALlSAJPMEgsqcmTk14IS528GaocOEiZ251iIPEUJLGl27VUa4rVvmCpacDmyUacCsI4D/qUBGFzk9WPIUxzi9iLwVpLZgTKcXCU5UxaYWb/dYS9pmiMjAtthY3SjMAv2GuuuVLu3Ltv6Pa77s1ef+2mta8du7N1223v1s8D8Jvnb8VtwOzyo5uWdOGXb3rFG2+eX1otFEtFKtU61mjRabfEerufnwC/RKVaJpyf48hCxtk1KAmBJxVlT1IvOkyUXdzUklpNKYDZcUktgNGSZLhoKbsSYQ1GC4q+JHAFSWrJUkPVtdQ9KAiBMiCNAGMZRBBH0OpCN4Z2BOsDCDOBtgqMJAbuOxsyc/1L2bV3L631DlI5lMpFUfQCYXQq1ldXmN681Tt4wy37P/zpOzZv8eQDf/mRu1vWIm677fkY8JuWVf2n93+s+JP/5qe2XXXwivJjh0+Y6ckx6fouK0srBEFAqhdZXVnDdTw27b6GYRlhOwucOL/O+093AUNFZJQKGTNDioZrGWTgYKgGElfCdM0SSIMxmkQLMi3JMk2S5YmEtmCMINMQZYJuYglN/jqJhiiDQQZaCDwJEkHVsZQjjQHaXoWb3/r9XHvtAU4cO4HjFVhZXkKbjPJsEaUUhWKBQRh711x77XihNnnDv/2VX58AzohnSXr5nE1Crthz0H787/8h88tj9spbXiSiQZ8sjVBKEfg+1165H893aa6vsriwytmLBcaV4bV7NpH0OiysdjmxknFsLWalm7EUWwIliTJBmlk8V3ChBp7r4CmJUBBay1oPuhFMFQXDJYHFEktQHlR8QQkQxmLTjKonqHnQjS2dxOIoKAUOY1Pj2PoUanI7Izt2ce7sebxSDZFleJ7LYNDHcyRxHJHEITUJ//0Pft+uLK8EpaGxIufmeLYkJM9ZAFarPq3FVHzmM58RHaS94eoDCGPwXIfRkQZpmvHkseNUK2WuPLiLPSMZ7sU6TrxIBZdt0y4v8TRJZjEY0m5C2uuijMGTljQzFEsuJcdiHUGvFyMygwogjvOslgwGLYgiSIA4g34CRkG9DF45wCC4EEFxqEyjWqE8VKUthzl+IQTVwS4cpnlynurYDI2JKaZnNzM0Mozvupw5fZbFhYust9Y5cuSQKBUDbP/ZlQU/5wB4iZW9cusIzdU+M5tnmTsxh+n32bJtM5VaFZPFfPWrD7Gwss7I8BDH7v08M0Mldk7V8JPjhChMZQjH91A6RqYh42PgFcYJqkUcZYiiPtZKED6mMQQti21m+D7IkgtpF4VLHEmyKKGVhAihsQqqUyU8p0S4vIRKBoy1LK2uIsxcHnnwAs2Vx7BSYZVL4EqGmzHdhSrO8BtJ0pE885aCQqlIp91ERwM2jU+yvrZM+DwP+Mw5NJY0s1SqPoVSAdd1kFLgBgFHTs1jspDt26aYO9rkc3f8A49WFaQaoTWVgsAWi4zWPKZHHOpFGBouUiqETG7ykYlGV2pMvPm1EK6DOwZ+neirf0/vyQ6J9nEcS1DK0IWEiuvTX+7R7Q9oP7aGiPpkJiXKBKsrll4XuplmqaPpJ4rWwLASxXRiuHHCQa2u8dgDD7O/OsXe3bsZHhlhdXUNEFhjGIQJYHEc53kAPjOOBGMNSiosFkeCyTIsAt+VSCnJtGFtdYX1Xo9YOGht6WuJTiTLgxTRDHn8eI/NFai5ecmMDPZvBc8Ktu7zmXj9y0jDMVSmIEnwbvh2ShNdWu9/N/2FFaIeNPuQ2NwVawlrKXQTyeF1wXLP4EhJlAhaA02YQGY0RQk7xxVFV6I8yYiFxeYKYZKhtcboDKMN2AyjM1wF1nOxOngegM8IfslxhNBGKAVB4FLwPYQQ+J6HclyKBZdOKwThUBie5FRkGS4KkiSj7AtOdaDkQ6QkkSPZMgwrYR7DHWo6BFnG5vo0FKqIQRlr2ggZYhMHVbZ8+EsDLi4pCoEg05apsqDVMSyFkoeXDQNt8GTOgxmhUSIH+GhZkGpwENy0zeexJQOuw1rsk/oNlApACOIkIQr7JJkGoSgWA9qdFi7Zs+o6PWebEaZLKiqWgnaxVrEIbY3VWDSuo1COx+ZN48RxTMErMDI2juPk9dfAl1RLDomFsgdF19LLYKChOTCk1lKpQCfO6FWmoDAJ4Sp2/RymfRbRPcziV7+IN+hTqQlcT7N1AjaNCqZH4JrNmuGiYXMFJsoCJEQW+hZaG+U/sUFsbxvzsIBSijXrERWGKfpVBAKLoN1ukiQaJyhRbQzZlbV1G7Wj5wH4TeYBLcD3/5ffWbA6fKDVaguLFWEUWykVSZqik4hKOcAikMriOBJj846XxEgagaQWCCINnpIsdDVCWDJrmWsaWl3N+Q7E7TWsbZFEaxiZkGkXpM/Cco04gemaYM+0YtukQ7koKAQWjWCg8y6YWNt89mMjQy67giiDtRCGS4LzTc35pYQ9W+toBOViCdf3yIym224TRjF+EIC1rCwti267eXLn7PDcZfnY8wD8ZuFQiP3JwS2NO04ceewxpdy86qU11mqbZqn1lCVKQpKwy/jYCMatYDJDUPRxHYFSktQKyj7YzFItCnaOOlhj0dbS1nDosfPwyCfonnoEk3YJKinST+gsnGRgoVISNMoCrGW9qwnTvOwmyQHuStAICg4UHPCVZbEHroDNQy6Lawn7tkwwPl4jw6dYLiCMQTmKXr+H47okcWJ67aY4/uTxpYLM/vKPP/7w6WcTAJ+rMaAF+I2/v/+Lb7/14C+dOf74y0Zf8pprI+vdQifyKkMBm2a2UhaasNlh2/4tNGrDnDm/zpUzhmrRY2tD8eRignEFJVfQjwwNT3LVqMDNNAdGBPFazBMfegjPEaw8eARVdpECOqfWaaaCpZWUNBRIAYstg0lhbt2iU2hF0A7zlnytyPsRMxguwExD4duMduJw/U3bONa0SM+nWCgyPFSmWgx48ugRjhw7iUwi6TnG9LorH/70f3nLR4QQhmdRV8xzvh/QWiv+bp9w3z/xwh0v+rbXvM1X/gs379i1o1Ryhz/30Y+6XneBm3d4ON3zHDk/oN0LSZurlMlY6iRcXMswxoLKGwbKnkUYiy+h7CuE1hQLAp1afCBOAUfS14ZGAap+bvW6oaATwmoMQyVBowZSSYbLguGSpDcwYASOFCwPNKsdy8SQR3WoRn3XPk6cXEBsfxEvetW3M3/uGI89cRyNp5tri+2zZ4/f8Yp99V/9tffdd5RnWUvWt5o6VvC267fOFGcO/suZPXt+bGZqtM7aWdt84i6xt9GmMjFNIgMGSwtgDSU3gSwiHGQMjGVxPaWfWsJUEKWWqoKSskQZFD0JcYYUBs8RDA8rAs8QxQYEpIkiSixWgrIgMWgrWO9rWn3oJZLVvsWgGGk4DBUllWqDLVddS3l6E2tzZzi0KFijyFq3C0ZmneVzt5+9cP7P3/jiHQ/d9r6H5p6lMfu3xCE24l39nn/14qs/fMcDv7cU8aJd+3bJSTfill1VkvYCcWzyeQ0sxhgCGVEtw/Swh+NYBoOEaJCSZhbHUVjpUPDAFwZrDO2uIYo0WEtfQy+yJBrKPkw0JK4UCCTtGNZCgbQSDKz0MnqJZLQRMDZcRMkMo1z82gT9UBA2lwizjKhxBcebxl44c16k7aVzu2dLP/S7n5u/67LPaJ8H4DP3c9p3/9jBsS9+ce7XlHR+ZGakzp2HLthMBGK0APs215hpCGqyRaPqI4UgTGC1q5HK4EnDSCWlVrQUAkkYGXoDy5YpD88VGCPJtMYRGTo1dLoWawzGGAQiZ+dy4UmsEITWJcsEwoCRCi0ViVGkqUTrhDizxKkgKNeYX414bK5NvVFl17YZu7hwWjTq/pHJTZu/56f+9N4n3gHytjyxft4CPlOPj/30jeN/fvvhn7tivPpjM+O1SrOPPbnQFEGlzJOLPU7Ot/GVA1LiK81IRVH1JJtKitGyQFiDkDEphkFsCBNLd2Cp1x0mhzx0lGHCiEoBRsqSsp8bpCyDTEOSQmoMmQGtBVEqMAYC16FY8fCDvEd/ras53oRmrGhHknPNlFa7x/aGpFbwqQbWTkwGQim7qp3yL82OTHxofcf9vdtue3YC0PlWsHz2yZ/yv/NNH/yhnVX54zfurJYrtYpdXm4KEwlUEHPljcOcnlcsdzQZLp1uytzygGY24IHIYATUPMuQa2kEgooDw2XJjlGf8bpLpix+4OLXoB1q5jsZzVBgjUBiiY2ATJBtjGIOMgiNoZ9AZDJindHNLK3Q0I3yWeDcmVq0Mdw4U+S7rhvi0Nk+hy72hPIFL9hVGa5WvB/92JHzxb29K/8aHms9G93wt4Q0xy/+7O17Lq7037Jve6XcXB+YpNeW1x2YolqA992zyGwnZXNDMOaCIwTTu3xIIcsKeKWAzxzqcGo5xPeg2cs4va5ZOp8hRYpvoSQswoUOEmUMNgMrwPUECmjHede0LyE1+eBR21p8IQiEoeBJlJD40mGo5lBA04o0qbEIoSgjWOpqIiN4ci1jou5waq7D1FB87TBKHlnsfQV46HkL+Aw9Fpp23Egxeb6n7ZPLTTFWEpxYmeOWK+q8+mCDP7x9nk0lCHyFtHkjqe9JBolmqNxnRwHe9soqtaG8XrvUtrT7BuVIlMxd6Xo/IqhIRsqKSiB49HjEmfmUxbbBwRBa8ITEUxasIbYunsw7qKMU5rqGXmqJ+ykr2tDRkFmouIr7LvR4eDFkrOZz85aAnTXLvh01hsqOaEX9XWfXOvufB+A3OF61/zT1s/BPF828A8Q7gT+eLF188qSZW+70xreUHXtyOSZODEtLPXaOl/meqys8Ph/y6HzG+X5G2ZEMlRVDEgo2RbiCz5wImW0opuoOm+oOgSNQylLwBIEn2dRwKVYkvqtoDCl2NjVxM6EsBUsDybi0SGvppJa1GJqxoRVr+qmlncJaanGEQAkoOIqtRclso0BJCWoNybbRAGMsrtBM1eHiYp9PnItIlHJcJ/CfrcbhGQ3ASyuzNgBl/5/QeJlosr00iPOOd7xD3nbbbeY24DdPnPUajtDzbcNUAAfHPVZ6lunJIkutPlfOlHjrdeMsdARH24oHn2xx75key4OUXmJobcRyF9Y0CSmRFBQUjBcEBVeSZJa2sXgO1F2LRNCLLQMjsUaSZfnQkcWgyVWvEjQulgAY9+HaYSh5lmrRYbxWYPN4icnRgCQ1iECx2gpZbccsdDRnFxJ6oeF82zA2HLB5tGah+TwA/1mAJ/4Rj5c//qEPwVve8vX/HvudN5TOzy9tarWUjxwk548+eubnbrstvBWCD91207W/8qGT/9akybVXj3gsd1LhCoeRoiRMLd92wxjTox4D67BlS4NN3Q4v2QpxNMRAwNEn1zh5pk9lKODMhR7tVU0nsqQaCgkQaYISSB/CEJIIrITJEoy7Bm8AoQTRANdAtQhexSHODIHr4CnF9OwYfqnC6N4ZRooh3fkllNRIY+n0YubbA9a7EUfORTgSLJrVgWA9spTTjD0TTp63bEjnPw/A/0UXe6mdXpAD7+2zoxPf/oYt+7bPjt1QH5kcqjYcEwBPPvqfWf43P8f6eipSI02lXhuqVryr9+yrVXvxSLOb3vRnf3dj7dT0UOnb77947nUFz9mTGSuTWGMMHF1KqLowW09YXnEp2YihyQbxYEDS7lAZLVHyXGbLLnsPFsnSDFktEQ5ionA7g0KB7sWjFNzN1KsKOnPYQcSgHeEXBMHoKNZYbHkYf2Ynjp8iKOILjYku0lmao1i2ZKGmNOyw0hml17V48RJhp0sxSFhZD1lpRcyvZiytxySJoFYUrPcNjy0ZDvUN1zQc/uUtNXWq2R4FlBDPvm1K4hn0PvJQzlrxgR88sLtcL9x05YHJ141MuNejKhOthchtra2QxSnrSy0uXmhzYbFDGGsO7BwhKHsoqRipFhiZrC+lqpjc9/DS5JG5defR02v0BzG+MARWM0gs28cDvvvGGh+9b5mRssu+KY9iCVqhZtN4wKAzYHqqTGO4SKHqErU6+JM1Rt5+G2bpSWy0jKptx1Q3kfVOooqjSMdHn74baTz6oYdI01zuoGAoXvECmD9CcuzLOCJl9USPdNDl8IkOomf4yqEBu2ck5XKR9YHh9GJIcyCYWzdUig7dVDLfNXRSy2QVXr23wP5Nrj21akUn4R8Gif2R37qn3eT5WvD/2vEW9npTt7rFHTVZvPWWxi9PTBbfFvb65cHCMicOL/DwoXW7HiKCQNhuFjBIJF5QElYJW1AZzU6XwEkYHaryshdtF2NVD29shkpg7X33Hxd//dkLrLQGvGDGY1vD4+DOCi4J9xzp8plDfawDN814OMJyatWQJJZ2aih48MO3lqBSImuG7DpYZ3I8wN3zIjqH7mZk3zZUocog9nC3v4jAW4blh+je8yDuhA/KIYl9ZH0K16/TPXyYzArSxQt86r6UdlMzMeKSas1oXXBx3XDsQkqqYbFnacaQ2jwGna4qrtzic+0Wh+NLGY+dS+xAI67bVX/wxGL6L//7g81DzwPwf+H4k7fsPnDDq699y45auPfeTzzstiP/msma3LRwpmkfOLHGojfJ5itvFC/+tluZueIKXM/HqAC/VMV1HYj7XFjtcObzd3D403/FiQtLdvdmnxfeuFOM1nzue3SJd3/2HJuHinzftR5plo9tBp7giZNtFtdTlkOIUkNfW2q+ZbKgcHzLyaalk0DVGsYCS7kkGB4vUfRThgqKcx1Y62S8fldCoWyQlQDpKbpxmQiX1nIfaxVrK13SLN+/6gnNxZZlbsFQLAhSbdg5oegn+fzIQt/SSnKd6DCFPcMOxUBRqyg0hk4vplbyKPnC+sVAtDJn9fYT5oceOb/28ecB+P8l2bBW/cZr9948MlZ7xxtvrbzkkS8dVUeORbleSrtjTyfTYv/rvpfX//iPs33Hpv+/XrO7Ms/X3vMu7rnz88wUu7jlAu+5/TQX2iH7pgq8eX+RzdMV2v2Ei0sxg0FGojXHL4aERrCaCdZDjefClSOK4aLk5GpK2ZV0tCHSFqsNW+qSHSMOZ1Y0oRa8Yr9HnGWcW0xpDSQKy3h5Q3BQCHqpoBdqBmne+6eEQMhcLSEz0ChZPAlPLkEzgXpVMTWmmB1xcYxCC0k7zJAYttc1kRYcv5igfG9wqB38zY1Xbf3Vd334kXPPNgA630Tg2z/+oZdtKlfNj7/xR7795Q/8+Yf45GdX7XDDY6EjxYHX/mvxq//2F5naMg2ATjOEEBu5sMDqvANFOh5SQa8fs3j4UR793B0c+fhnGPRa/MXpZVINCZZMQkMJrHIAS6PsEvcTvjgX0w01WyYCFtuadjNlTFnmeoYHYoPvClqxpeRa/IKgm8BSD452DNOLCTuHJY2C4NNHYxolhdCS0bpiPbTcv5KnViVf4FjJXNNggXpB0HANg9jST2C0JGgUJJ0EDuxQXL3VQeuMaiBphppTq4ZWaAkzGCsLFruGC+vG9mIpkP6Dr3vx5r/6hb985NyztVb6zcl4reUD/3LvjkrF/z1lxGvOHjpPlGqx6m/nu371D7jmlhcAkCUZSqlcodTaPLu0Gum4+eP9Dg997G848b4/5cTRIxxajmgBZ2OB57lkRpNoiwe8aHOJW3b4zMwUGW4USFLLr//tWX7urduo2IiqY+imgsU+PHG0yQMXIuZaGQMD2yuC06FhJYapkqDqwtapgLGq5OT5kNkpRSAhSwWn5jO6GWwbk4yVBcbCUiel5koa1VxFqzvImGtLpmtQ9CxBwaVeUigLS92U9b6mO7BkmWBsyCOKLWFi6KeWc+ua1Z4lqLh20+aRhYVO9pCbDf7gy0/27hZC6Muuq30egP8vxx+8eeIH7vxi813XTntjwyVlH1wril/60F3sPriHNE1wlIOQAmsAY7HWIh0FAlpLFzn+vj/iydv/lqg3R3Ng+Nqqy6m2oJ0YDBZlLUUlGSp4LIYZkcn4iRsqHNxcZvuOGucudrnza2vcuLPEtddOUxgqMrzJxSYDPCW545Nn+a8fWeLhrqTiw2uuDNg9KQlcRdRNqLiChVbGct9S9qFaEPQiSFJDo5I/Z/Oow2hDsbgQIX2FcGGQaEIEM8MOFVez1AXhegxCQ7OdohyJIyXnVzNCLZhfNZxZ16xEhrUImhmMbapy8/VXM7vtAPWxGY4devz+e79wx3+7dlf9Sx/41InT/5RdeB6A/+i41Vl4V3zNX3zkxK8du5C8cqZiQPq84df+hP0vfQ3CCrxyYaPDzaC1xnFzi9dZvMDJj/01x//23Zw6fZF1qZjPPA6tpKSZoeQIBhbCzBJjEVaQWstQIPGUQKeat+6vsH/a4/33t5lvpfzEzRVuvXkKUatQpAueR2ksQEjBySOL/PK7F1jqW/7da3xuuiqgXlP0MsOpU12KFUW1HpDg0ulFhGGGj6DZ1WRpfoaFtkwPeUzNFpm/2CWONe1BRrsviDNIEHn9UAq6Hc2pNcPpdctaz9IKLYMY5IZIpqgVcDc3qA/NsGPTHq7fv89WGiMkxmbdZuvCvZ+/68jZQ1/4s0eOv/tzQvyL/jMdhN9QAFqbr77425975f7rgjN/8Ocfn3/h2bbjxEkortg5yw//l/+KqO9ifHwYt1RCCIVQuYRha3GBz/7ub7H6hQ8yZJfoe0Xm+5LlTsrxVU2kDa3E0jaQCvDJO1vqRYfdww5CWCqO4vRazHzPcNW4w53nY2ZLkjdsddhUhR07a0zOVok7XWbfdDPWdymIFS5+7Sw//pvnuX9dM12RVIsgHdg9pKgVJFFsKRWgVjR0IstiNx9iz6xFKYGnJCVPstJK6XQNGYJIQDfJ1zG4MgdponPaMDaQOeB44BUEnnBJHQdRDlDlEsWRSSZGp7GZz3jB59oDexgem7UIRKNW5dH7H5n7xIff/1cvvnHT+3/3j+968plsDb+hScg735mfhIJeG/vEly/ujTLhLncGds9Vm7huOuPUZ/+Gl/3y+9BWI0UOvIVDD7J8/2f50n/7Y/pr8/g1xV29Ir1I0xkknOwaEp3XYmcDwcGipBw4uFJSKipKvmS+lZBZaA0SRsqKCwPLkbWUqpurn55pZkw2ChybS7jrkQu87KYq2zqr2LFNrJ6YZ2jE5dXXV7n79janlYUE3FgQBxndVYsUgkEPVtqgpCVwoFYGLXLle9/TuFLSGeQq+UblLfuXl82MAjyFX1DYQKIKLm5J4fgSHXoI6eA5HqlxcByPwHVwgiLWU9zzyH3MbpoXN179AhsnLa590VUzU7PTP/+Xf/rua25+8eyvf+WLZx8QQmTPRBB+U7JgU6qYfTfuTB7+8CmkULz2+k1cuTnizvsOc+rLH8O0W5QKsPLQHZz92meYGuuzdRI+Ou9w8klNoCIG2nIxzrVWKkXJt48pilgSIZFeLuQSGViKYPNMjQM7aihp8axmcM8Sd57sM+EItBA8tCpIspDphkOYCR4+ETJz30nEZJehiVGShSa7p3w2F2GhaqkMgSxYzpYl0gi0tbBsGRmADKBQgKymKJYUrpCgLVHbULYO2kKYQJBItCtAgVAKJRXCUVgkUgmk66OkQipB5oG1ghiHNHIgyvBExiBcodsvMDw0znKnyyfv/rh4+QtfjOMIOzJV9X/y3/7cqz97+6enb3n5gT+x1v61EGLwTAPhN8UF/9r333TNzdvTv/rq3XP7HzzWs//i9VvF7u1VHrj/AjZOKRd8xqvLKM/FrzW495E2J8+GWGsYGEFNCLpRhlGSiiOZqoFSkj4SLR10EFAqBQwNFxmpOdRKAulIrLWYzKC7Xf7+K0t89GiE0VCWgiEfKg5UAsGoD6+8qsjrvn8fQhpMpFk6tsT7P73In5/UrM8KhjcLGqM+SWIIM0M2MNi+xi9JvEBCQWIw6NSiE9DSR+tcsNL1XAJXoZEILDoGE+Ugw0B6qSIuJEpJJAJjXJQMMDFMVquMDNVJtSU1JQahYtNEg3rVp929wHX7D3LV3utslmiKhYL47GfuXvzMx//+Nx975CvvFWLyGRUXfkM1ot95W67f/Jbrphof+tSTL+n2062VouLiyoBNhZbwlWB8pEhqND0d0OlZnjiTcGExYrKomR9AKxJUPclQQdIIFKWSg1d0iYTCeAGN8Qa7dw4zM1VitO5TLAikyJtAlePg+h618SGu31VhhxsyiuVCmO/usAh6oWE9EyQDQ7udcuC6Bmk8wDqGgkmYShLmYkm7IanWFJk2efuOB25VUB328UsOEolJIUkMqQYZS2QG0kgkiiyGLDZkiSGNNEmosdpiTE5cSyEQSuavY0EIhZSKLEkZHy5RCAJSY0mSDIRPsxURxTGTUw3OXTzH8sqi2Ll1u2i32ubglfsr4xNbrvqpn/jJof/0Wz9w4RMfvW/lmVIF+4YCcKNVT3zyZ17RXY76/dGSvfYFeysNDyusNtaRRpxfHJBGIUkUcXYxJIoMndDy0MWUvZvKvOaaKlOjuRh4KhShAOs6jIxV2bFrmNmZGr5IyMI+ysboOEI5Ek9CIXApegLHVYRWMjUZMBrkQuIPLKQ4AhqeQEpBM1NcPNlmZDhXS+13E2b2jXPiaAcVZTzREciSJkwM2giwBikEju8gXIU2Es8L8IsFiuUiwlX4BQ+37IHKs16UxFqBcATKUwhXYh0BSoGjEBvjoUKCkgIdx0irmZ4ZR3k+XtEl1QOkCFG+pdvvsriwzvat02Q24eix0+zeuVW0e227bff2ysyWbTe9+w8/uOlXbvtXhz79ia8s8wxY9fVNUcm/7WOPZT/+5pnT7bX07JZxhgM3nXn4ZKQWmynrPc35tYxzKylza5LltqWbGl51XY2rtvmsdA0nF2PONC3adZmernJw/xCzs2XKBUjDHp31DlYnQEZ9pILnOTRXuziBh/IU0nVJ+n0MgjDVeNLiC1juGmxmKQhB4Ghq1QJmdcBNL97KoJNSLjqcnwt5/GSE9GFZWYTM935gLUhLHBuEL1DSwxgPIV0ECrfogpQYNEYYpOsgHYkTKKSwWJOvZ7AiAy2wWQ4+u/HP6IxoEKKUZtfezUxNjVFtGCo1xfTMCI0xQaGqiZOYo4fXGBsexgk0FxfOsHfnfrHeWrNbts3KXTuv2P3uP3r/9L/+mbcc+tLnHlj+lrKAlx9/88WF9PZjrSMvv3LkwUC6/cdPdHastNPySkfb8y0jRAqjZbhmu8utV1YRjsPRuYheZIi0ZHK0wDX7G2zbWsP3BIP+AEdCqeQyMlqmVi1QLBewWYrJDCMzUwiVK6QaY5HKIYkzXDIqBcXx8xG+tmypCLaOurxxr0O/r3niYsLVuxoEroOI1qkVM+55IqKgLUlVsppaZJTP+kogGRhaSxloSCNN1ImIOiFxmJElKdpYhAAdZiSDlKSb0G9GDDoJcT/Lv8IkF9MUJo9ZU41JU6wxeEVJddxy6w17mRyr4XpQq9apVWtUhhwqDUu56vHEIyukqUaUmqyvLrJ320ExGPTtzh1b5NbtW3Z+4C8/PPvm733Fyn1feXz+tttuy75ZlvCbBkALYh+o73toffl3f+YlT5xZaO3qD9KDriPEgWmXG3b4XLUnYPe2ApEW9AeG6ckyM1uH2buzzvYtRUbH6wjlYqIB1YpPrVGiWi9QLHukmcZxJcPTYwzNzCCUwmZZvvzFd4nDhGgQEoUxnjLcd7zHaluzb0xx9Q6HnQdK9AeSR84mqH6Lkok5sxCytBKz1tKcXLX0JTQ9iaMFVudCQ8YKhBb01zVhK2VlMaG9nuE4gqSXkPQ08UCTJppeJ6bbiUkig87yBMlqi441SZSRxhnSEVhL3shvwS9KelnIqfPzHNy1mc1joyAkKQblgPUtQQXGp8rMnW/T7sYUKxlr6/Ns37RD9AY9tmyblXuu2LXr05+86+ZHDt/Zve+eQ4c3QPit04ywoeOn7X1vHP6Pv/jVf1WMe9e/YJuyw42iKPmWUs3Bc/OOkbKA4QmfUrGA53s4gUQqhVcOSPshWalAdWIUsoTlswu0WzH91OHg9ZsxxiPq9bFJQjEQhGFKv9Wl1+zSG6RY6aJjSLTgSMfw8pLk4JaULTt9mpnC3iNYTR1mrxvl7r8/TpgaXrjb58Ig5cSqQY7mc7xxbFEOOG6e6fplgUwEN960mS1bajzROkF3rcT5x/pIZZBC4RadPB40Gw0WIl8WrLREp5Y0Ngx6MV4t38hkpKUTZ9hBwNl4md9979/z3d91MzNTO3GBbitFGUW9WqPgC669yef8xZDHH2vCVV0eOnEfuzbvotn0mNk6y8/++5/c8b6//pv/+PYffw3W2vcLIWL71AzOc88CbmwxyofFH/2B0h6hdvzu7z3wI1Ec/dwrripP79xUpFT3hSx4BEWH0ekhysNVxiarDI/X8EsFXBewBi9wKNTLBJUaleEa1YkAnYSE3YjacIGZbQ1sEpPG6UY3TUQcRcS9PlEvRGuNkBsLAzPLpw/36A4MP3KDYHYCVEEjqwU+9rWEpJWwaXOVF79pH6cfW6GfJMxUJKfa0NvuUW/4uCWJ0RrhQ7HigLC89Q0zvONnX87rbn4rB3a/lFV7PysXAUcjHEGp5FAsu0hH4Pi5brV0JG4gUb78evwnPYHryTx8AKzQ+CVFhuShR48xNKIYHR0hzRKkBGklhUqRTGeMb6mg3AJnjq1QrkC338SajOHqlAgKvtmxZ2v9wa89seeJE1949Mt3PXL2ttu+sa74GwVAQQ4+C/BHP3z9VX/3gcd+du7c4v+5b5v3mje/uF4dGavb4Z07RCcq4ArN9JYqOrNUhqs5jxZF+KUCjqfwq3WC8S1IvwZOAVf0+dLdpzl3qoWb9SgX8g7ifLZJYrQFrUnjlEE/ypsahCCKM5LU0O1pPvZoj31Dgu+/ReL6UD/QoH1e84Ev9CmVJKceX+PaGyeY2VPmiUfXKBUkZ9cNzU0BY5MlxqcCGiOCOMlwPcnWWZ/vePkk106/E0fewLb6Ae4++x7OHB2QxuD6gjTSmESQZjofgjEb5sdasBblCryiwgsUUuXglEpgtUYpSakUoByPhx89wdiQZWSkgiHDD3zQgmLVI0n6zOwYJU6htdpjaLTIerOFThO2b9ktoqRvd12xc+ijH7xj6Cf+z+88dOen7lvGIrjtOQJAexnwHvz9184UB93v9pPmz185Zd/6qhsbU1dsr/gJFTt2441i4UKfIw+eYGpckIYDdBLhKIs0GrcY4JXKCClQ5TqqUEViEFaDiajUHFbPLlGreIzNTpClBqMNTrGEMBlJGNPvDkiSFJ0Zmq0YpXKdv/ueHPClczFv3KN40RUOatihMlRksVvik3c1sViuv2aYcw9d4Io9Hp2m5sTZhFbXsLTZRTiGdjOh085wfXBcyd7dZU6vXqSfXmS80ePxxTu4/Z57OX8yQSiLFZClBm0MXqAAgVIgJAibT6FKBVpblJLk+Mw9o+OAEHl3tTYW5QueODzH7GSJiU0FMg2u4+F6CrfkEvdDNs9OsTTfIsx6VCtl5i5cZHi0zOTINAgrpjZv2vX3H/rU0EMnPvm1/yz+tPuN2jX3zw1AcRtYa/+rXzty+tZ77z36H27axk/cvFPt2nv1FjE8M2Vdv0SjpkS6dA4vXOTglSM0hgOkCQl8yWB1FakU5aE6wvFRQRGhLOg+wpHYLAKrKbmGTZsrFBt1lFdCOG5O8sYZSZSxvtqi0wlRwGPH2wRFj0bVI9Ax77lvgNfX/MuXVdi0S5FGCTLw+fsPNzl3PkVauH6zR7VWZnEpJMAyUVIcmUs5OSzxHUWaZGQyQwiJkJJ+aDChy0pnjsQ5w7vecxdnT4UgBMKVZMagLbiBpFTxcBQYY/B8gRMYpJKkqSGzFqs2AmYsKjD4RYujBElqSG0GFqRyOPTAInv2lhkZLZDJEJwMzyvi+QEIxdhkg3PnVpGuQPmK+dUz7NqyRWCLTE4MS6W8zb/1q39w8tyJ+Ue/UYsO/9k0om0+0Wtv/w/XbX7XG3/7pzyz/u43v2z0zbe+aFulvnmLlV6RLIyEk/aFjvo4SlOfqCOVwhjwigVKjSr18QaFRoVepElNigo8hF9AVcfAzWXUpE7QViH8Mo6wZHFCNhggVA6M9nqbTntAt5+wtNKn4CuKvoQ44SvHQ04vJuytSnbt8fFqHuUSXJxLuPexmEZZMBI4bB+FV/7Ay9nyHW/HdQ1zK5oAiEOLERbhCLxAgDAYa+h2De2O4uKCx1///TmWVzKMUUilkEiEECgnJ71dV1AqO1RrHr4r8YuKQtFitEFnT617dTyF1YrWEniOol5RFDb4RSsFWVHwgQ8cxpoBnopRoo+U6cZr+9SHA3bumSA1CqsMSaq5/9D9FEu+6A8iXnLrLbWdO7e/9qd+6fV7rbXfEJL6nw2AQmBve/XMLXOnVt515fbKO9/8HXt37zs4K1rNng3bLZGsXkT0FoEEoxOwhrDTJwtDpIDi2DgqCNBGkGmH88cvkKQ51yEdgVAC5XkIR4IwkIboXit/PoKgPoT1CrTXu7TW2sRhRppY4kwwMVLAl5ZuJ+Xjj0eMOjCztcSmPWMYY3Emt7C27rO6pqkGAt+DUtnnwlcfYN9Vw5R27eLUcka15OIHBXxXUSg5BGU3V8nyHTzHJYoFOnPRaQFhJFYLBAIhBK7j4HtOng17kk2bCoyPBbi+g8r7F5BKopRAKonVYJOUgwcD3vYDQ3jGoeAVGR728QoO1kCp5rDeh7/94GGG6y6uivH8iIIrGaqUGKo2mN00xvh4GcctAIqzFy+wtHKGoUYNFXj2Ld/71ltPP9n6d32+NAHYDSA+a1ywANgB/h2//eJXbWvod0yN+K9JtfKOHlqyxx8+LRbnW0KWSkhX0h2kBLWA4lCRoBhQG6+B62D9Mqo2StrpoJTGLZcY27+P4vAIKAckCJli+k3S9iq628ZmljTROLVhSrO7WbuwyNyhkwxafWINUWJIU/ACB1dalNH8xRc7nG9pKghefCBgd12jg00Mv/67mbvzGBcudFiIc6WDb7+5Qa/VJDv7IKWtu3nsoTOcbWnamz2CKUgGKeWyolBwcAMHx3VIE01iM7TJiOIMKRRW5MpZXiDRWqCEQ6MhOXexy6bxgJFRxfiEg5SGpQsa4YBbFIRdwytfL/ne7/UYG8mYmYUMj8QW6XQ00gqskNSGXE6faVEqKG64Zjs2K1ENKvhOAV/5OI4gMwkSnziTtFodorTF1buup9PtMzYyVIrCZNtv/ec/Wjt1ZOHhjTauZw0PaAHnsx/70W8/++jxXzvyyPr+c8uhbfYso4VM9PsDFtctpXtP0AqhG+ar7beOC67eU2Zy6wi3vHCKej2lvziHpzKCqQnE+G6k56E7TWy/SyocGCxjWivI4jBObQLruAidYS1cfPQxLhw6Tqpt3vyZ5D2DRkmU0PQ6KZ9+eMCXzqfMlPL+wZs3h3TPtinWxmje/rdcfOw8meey3I0ZiTTNdsL0rgmWlgd8+rc+RWQVPc9SLqdcdfMIcqXGcm+N1HRQYYPamMPhE4u02ilKCrzAQaeAsCgnXxNmHcXIsMP2HQ5JElKphsQ65ZZbhrj7DsMgiyn4YFSuUVhpaNqtkNW5KpOTlm2zii8/NMLigsIJQtIkRZMwvaXAZ+45zg03TLBvy8tpt0G5FqETVKGA47mkWZdNW0fpdhMeO3WCnVse4mUHXy0OH7/fvvJVL6l++atfe9t/+J0f+ALwsLVWCCHsM9kCXjLT/uK9v/Fd5x954qc/+Nf3HJhbSRylXCZGK8L1oFKSvOLmca7aU+F1r72Cl798loN7KhRNRtbucfShdR768nnKMmR87wS1F74ZM3oVShhsEmKNxZ3agRtfIOn38Ua2Az7CVcTtNs3z86ycOk9rYQmNg7GQJJBpg7H5JiSbZnzigT5fPZ+ROYKClezbZPneN25B7LsRtWkLheEtrEQOn/z8WWoVh+mKoNmF73jLPr7wuXOkVjHSUHz6WMI1b5nmh7/zal53/Zv4zhf/IG+44Ue46YYRisPr3P7508R9iesGlAoujiPxfIXvO4ShRipB0beMDHsc3FnmxTc4rPYFDz/S54t39imObLheCdE67L/GcuV+SdGWSY1CigEHd05z6FhKtx+jRL72y3EltXqJY6cucMWuLXheFW0yfFVEkWLI6SfluIyNTTN3ZpW5hSPs3jTLSGOafrTG1OS0+LM/+cCZlYvtx/7JoNMzD4DWWnHbbbfxtT//0Zc1KvK3P/TfP3VNsy9EqezLhbYRYaIZKsKB3Q02bxlmZu9OJnZtZ8uVe9l1y3Xc8MZb2XTttczu34GbZjx5/xxnH7/Ilut2UhqeJG2ew2QJ7tQW1s4t8rd//ji7X3YjorNC1OkQrTVZPbtIp5XQHWi0FWTakGpLkmq0zjtVpLXcd2zAfWdTziUQePmW8+/cL7liW4VuJ8Of3IM/ewMrd3+SLxwboJTlwKTLI6cHeGtrDFVdVvqKk2cHPNSD7/vp72DPpjH6/YTZ+o1I5fP5+T/DFxEv2/MiIrFGJhOkdTZoPoGxFq3J1VMjwVo75vHHO9SqgnMXBZ/5xACvnC/I0VpgNnoGlW+5+UbD1pEyYRaA20Zllk99cYCj8hYuBERRRrHoE2mHpZVVrt56FSPuLhreOJgYiLAiZL2VUS4XEfhcvLDEmYsPcM3eK0QaSzE6MSyarU70397760+cOLy4+s8FQOdpyTeEsHvB23v97pc+/KFP7lpZ7tlC4KuTKzEmy9hc89i1pc722QpBTVGvJdjBKlqOo7QmbnXZvH+WqW0Vbvi+V3D8Y3fzgXe+j/e+7Q/4vt//UaauuwL8YVaOH+fR3/sbvnjXGje9ZITZKiSdNp2VLr1+SjhIieIMbXIRoiyzRJllkFnqvsNiO+Ku0yknEoGsWroaFJbOkiIsj1IuevjVUQpjlrA14Mx6xt7NgpUoYXzc4/HDLb7nh/dy80s93vdhTVEn7N8yw2iwDc/dzSBbxmc3Lxj5FzjBSfwdIfVNV3L348dZvKg4caKFzgzaGuo1hVKCNLVEScxACH7vvR2UJygNC9RGh4xUFuGAU7KcPuPw7r9SbB9bp1gtcOGix/n5dQaJIksFSWQBxcz0GG960XVMj45xdPleGl6Nq6auJky6UNuMsRnn6+foxl+j21lhx9ZR+r0dnDr7IB+7/yN8x3U/QKvdL11/wzXXf/Wr97zMWntaCBH/czSyqqch6BO3Af/x371+vAQ//tBn79+RAp0wFmfXUqarEi0kV8wUmZjySMpF7vjqIqfuO0GnlyGKHkN+hyxOidYuYuM+4y94Efte/QJOHe/ymV//COOzU6Tnj3H3b/wxquCweZNHrDxmRhSD9Tb9bkKWZiSpJk5Nbv0yQ5QaupFlrOJwfj3hD7884GjP4tcFOII4tVxTcthsNGltjOruLSRPPsjCnXdw6nyLO84mXLXJZWLY5dya4XteM81grccHbl/mC2ciuqUG3/FdQxQDy1h1H1qsomSBycJNLAwe4VzzSVZafbr9jIvzMUli0Vagtcl31mmLFZZOO2XQ1/hFgePlzbNJlFtKayENLcWS4gWvrLGy4PC52zMefQJOnrZU6iW2by+xdbbA0KjDq184xm0/9G3cfMXLmKhBpdFnLVxly9B+YtPClR6gaBQn2DO1F+uEBEFMo1zliSPHkVXLcLlKNZi2vufXL1xcGv3cwx+4/6EvPrnwz2EFnacl7RCwfeceKVUSdAcRSaatVErsHpOgMxbXY6YnSujM8nPveADbS9k35XH61JdI/vZrDM0M8fa3bqV21QtQlUniw5+lFK3wo7//o3zx5it43394D4kDYcmhvBoyUndY/OpJtg/NUPAESgmEkGidi4Cn2hDHlii1bB1zeXgu5rfv6NMXUGwIUmNJQ/ALglYv4+ZX1xksHuFvfuFh/AAcA2ciqNc8vJJk86TLfSdTNu2Z5KMfOsr8uR7LHUt1X5GgUmWh+yBG1Nk8dDWpXcMwQ5ZGSAXWuERxipLgeYIkEkR9wyDMSGKN70tqVRgakSQxOK4i7koKjkOqE1I0lYmARkMwPKJor8HomMf2HQW2bi2gjeKGaybJbJduBDfvLOE6XcrOGKd7j+IKj5HhkCxzcFSAtgZPlkl0RNkp8/Idr2O5e47VsVPceWfA3Pk256bPUpWzeIGUVx688uq/+8jfvMFae/ifwwo+bVlw89AXCzN7N3mVqs9Csy+izBB4kjC0aCmouIbPf3GBmSps3lLk0PmEiwPFNdt9jh1a4SMy4l9tHkbXJnFnb0Sdf4CF23+XPeMNhn56B//wkXmOnwrxS5KmhtlRl5XlkMkJh0wbBoO81y7NDGFqCVxB0Rf83QMR/+OxkFJJ4AO90OYFfaBekqQDSyosNjNMTBU41zRUCpq5VQNC4FjAwK27CnzyY0c5c3HAS68d5u5Pr0T/4i1vsiPDpcKTC0cpZysU2YulRsppgiAgXLcoJ6VYlBRKLs1miJCaal1SqvhgLVJGjE0qimXFrlmHqQmP1a6hVErod4o8fiwhpEDYzzh+PGJiJOCmt1coBIqC73HsZISnfKaGfU5dGPDEmT4zBzfRTi6Q0KYfOxTUKj39AFVxLVZmOARkxIRmAWSDWjBKvVTkx37we/n53/td5ptrjNh5USp7dvf+ne74l6de/Qu//aa/BY5eMjjPGABeGi08Nbd4YKqitjdbAwaJoV6QxBl4juHaLUUcx+PCUsZ4xcdX8N0vGaI7MPyP21c5sKXAVx7vcdUXj7IzCVBegJt2KY9sonfxLI2q5Ee+bwI+usQ/PBiirWa1E3PrtZCGgna7T5Rk9Poa5TlsHhWsrCT8+ZdTbp/TlCuCLpZ+DKSABhXAesdydUFQMga3WiLppZSDlEImWExBVeHaKxqcO7ZOLRCcWTBMTLp84WSL4sHhwXd/74sz332yMD5SZ9LfBFSwDBC2gmOrbK69kE21HkIcZm3wKJVGgSiOscYwN5+gsUyXRnnlDbBmIyourA0iZksVrp/eTXH7Gp8rLPGpQxH1UcXwrgI7p4s02w6tlkO3k7elWbNOOigwUalScAPOrZ6kEx0GmZFYlxBY8O9lpHE10CDTXTxVQApLmC3jiBpFVeT0+ZOcvW+F0fI84wea7CiNUy56XHnN7h23f+6z11lrj4mnWYJVPV0UzNVTxVtuunbbG+cXus5KM0JJI3qhBpMLAe2cKbC01KNRVnS7GWPDLrdcXcdmlsNnBhSFRteHqfVXKJYMjnARSpJGKUkvJI5iJuuWpdWMVihY62ScW0649UCRldUuymqGqw4oePDJkD+8M+G+NYtwBb0wl9R1nZzHDgJBY8IjsQ4vdQxjVUFl3Odz93eZHlb0Msu9bYEt+RSzlCtnfNoDw3xfc2xF288vZeYHf+VHgxffOFta7hwWO2vfyYjzUgxqo69vnVSsEpsYbV12jF2HDRaxah3lWlzHMlQrk5mEm6+Z4k033MJKZ5XHz6+zbaLA1uEao5Uiw+4iiRAcXcmIM01mM155YBylC6x2UopFly2TIwyVG/TClDhJ6Q7gzMpFMsBRDtqGuJ4HMmJn9YVY66BFH1dWSejgCEsg6/zBx9/Df3nf/yBqejiOx+joMKOVojAaWywXCw8//KhV8eNf+MQnHuk9nTbwaQPgNVPlAwd3Db+66Cvv/MUuDkYk2jAIDY2yYmY8wBjD+fkeQkoKviAIHPbvrJImsLjQZznWXL2vRnyxiVuQnD2+yOGHzqAU9DoxRmfEseHwhYxMwpmllLGa4vrdRVJtufdYyN98LeITRzVLGowDbgFKFUm5LChWBNURl9qYx9hsDS8SfFs5Y3LcYXRI4UvLE+dT5tqWC4HLaNESLPZZaKZ0UsWKtjw6n5ptL9i++O/+3Xe7Z9fPezuGXkVd7UcKH4QDSBK7QEcfJbUZmi5PrjzG6aWjrLTa6A1O0pculXJArRKwfeiFBN4whxcex5NDPHpmnbPNs5xaT3l8MaBeLrLcSkhiQRjGrHc0g8hSKCh2Tde4dtuVDCLL+ZVF1jpQKtQYqlQBQeAbJupjpKaLpkvZ24JgiH62QsEzrLczful9v8ztj32F2ekdZJlm6XSb6ZlxysUCJrO4flE0V1ajO7/05S/Pn+nNP6MAeCkLvnnrcLEio5dN1MXIwkpMP8yEttAaGCpFl+2THpWKw8PHu4wNexhjCKOUom8x1tDqpiy1MyaLmiNPdhnxQxYXOlghCfsRJjMImU+brbVTBsZSDgQPnE2ZGhd87OEedxzVRAWJqSnKEz5j0x7lEQe35lCouhQrDtWGh6ugPlpGL0V820iGW3VZWEhoxXBoSXOmY+iUFcZq3NSipKQpJccHkpaTie/7yX1KDTf9HY3NcqS4g1ifJbHzCBWgKJGYFq3oMZbC85zvzLPcXsD1UuJU02pnOErh+y6NmouxlrXBInPtk9QLBVzHQQmHpfWUrq6weWKEi0t91tq5TrTj+AwiSxharHUwNmO0pin4Ac2upR8PGB8uUwq8fJN6e4Fu2CUMY3y3zmTxFkpeg1Re4K5H7+Pn/vSXWVzvsm3LNqI4IUk1a+fXcXyP0eExHOWJJMmswNozZ+fW50997qHbbvvT9OkC4dOWhNzy0t3HP/OpBx76hbcf3Lp5rOVeWNC0Y0Eng/n1lFrZYWxU4iqwBnwHur2MNE6RJqZYdChFlmOnYx493efgTh/ftQiriWJDOzKUlEvgwXAVimVBhuXYWsrvfaVL6MNgXDDScLhiqohb8skS6GUJkdFkJqc3hNYo6SB8zXA44AVXlyhOV/n1v1iiEViW24bTKWjrsn3Wpz/foyhhJZIc6fR5x39+vfie79xd6keWSrHFavI3+HIrSlQpcgUIKDm7mS19FwXnERbanwKb4DkxZd+SVByKvkc/ieiGeXe30REzQw0KBYkjB2zacgVHFtY5uniGbrxOsVDApBFrawnCDpgc8cDxSTJNoBRziz1OXjxHL2tRH1c06g1cm6BVTL3i0WwvUKlLxod8qn6Zo2t38Acf+zPuefI09VIdHUkc3wPZR1RTvKpm8cIcy1t2MFyaZNAZ0BganyqVGq/+rb/81f8BnH26FPn/ty3gpbaxD33hZPx3v/Mf04Mvu/nKq7YOjd9331kudPIqxFIrY89Mkev3FbGZ5Z5HO1RKgrFhlyQxdPopK+uGgifohJaFdsIte8t4HrQ6SZ7zS4vnK3Rm6YYpF7qaI+swryWrwtJTYIoS40j6YUS7m2FELlQUZhmp0SQmHxxSnuLc6ZhX+JKrpywLCyHbtgesNQ03H6jxyaMhpS1VhooOg9WQpra0A49///M/wy/9q1+nJrYyVXkDRfdV1NwrKTu7KaqrsCJGIRFUQAhcxzJT28LZ3v0stzq4DtTLhXzeF513akuJsA6lQonEaAqewuDTTyzLzR5xqtE6rx1fSvoC31AIJFONKsPlAmG0yPRQkZfu283O+gG6vT5aBHheRj+J8Kuw0urz1YfPcrT/AH/2pY9w9EybkeoIfsHH4pCmAtcRtFs9Bp2YtKcpFouMNCYwBqwwotVay06eOPWlU0+sPW2t+0+XBRRCCHMrfPXcvPn0vhsnt9ywO6gEi46dW2qLlrB89r5VbtnjcvXeMmvrMccvRkwLwWo3B183skTaEhtD0ZcEvqHZSeiHGZ4n8uRlkHDP8YgH51POhZa1TBArg3RA9Cx2YIkq0HME/f4AY/vUqx6lAghlcQNJueJhgvyCjhQMQ+NVgkzyyOPr7NsUMLypildqIYuG+bWEyCQcfP1+vv97v583Hfw+Ov0OTiBRGFJ7Eg8PaxVCSLAluuYJlCwjrYOwKb4SFIodZMsShQLXSXEcgXIh1RaTWbSbomSX7iCj10sYqjhoJwaRkCQKKQSeJwl8RWYyanXNFRNFrhwvsbm4lQuJolisINIVRks30/cP20xdEP24y+H717nnI5ZmWmZZz7P9QMzOHduYmQ0x1rKyGJLFll57jeGhEsqA8hWRTuiEXeaXFxgfmiCNLcVKZXphOdkHfOGZ2I4lzsFAPfrE8Ze+/VVbxhty79FHTomiC56yYr6Z4Fs4uKdGoSBIo5QozOh0Nb6SnFoxlANLN4ZyCfZMSjpRRpIZtAA3gP96V4+7T2fMp4J2Jog35MxMAlkIugfpwJDPpEtMJkgiQ9TXRANDv23oNTMG7ZTO6Yy37FQUiw5ffaDD1JiiUJC895PLrLmCZBBx4WLEm37sal7w6j3csHMXHhlde4hULiFIEQKUKCPsMFZ0EGh69n4MTaxoEZpDxKZJbNdYH7ToDlKSRNFLY7qJxliHzAqk0MRpRLM/YKE14OTCCnGWIqzEZJZq0cVxUxKtmR3PhS83VQw7hq8GN2OiUaFruqz5T7LSu2Nwzx0X1+/82Erxr/+6Jz71gYiF1Qg5YRjf7CONpD40QhRZfNfDak233WfQjkAKjDF0WyFRmFKseRT9ArVaWXS6fQJPqgvnTp57+OQvf/Fdt92ZPB1x4NPZjmU32nbOX/N7f/LuH/nXbzx41a7hvQ8cXbHSUQSu4F2faTKQitfcOszVVxiePNWhG1oOX8goB4Z6IDjWtrxkTDHfjBGOILMWCXzwUMxXFgx6Yzlg3iaZE/I2e4qbtwnEaa7XgoJUQnRpz5K0yBQcoZkUgm07S6ytDNg0pFHAIMloIhkRBq8xyU++8yW85rXbYFBmolBAehqrPRLRJBInGOYlCDsOMiJvGUgoqhKSMpYBWimElRwYegVDap2PN99D5hWZHR2jVF5jpSk5vdKnPTCYBMbqoNyQRCZcaAsmqg6OIxmka1iRUSikrPYNB0Z8KuOStN7F8dZoN5c4e7bH+z/U4YE7lHP+TFIkMDAMzjQ4vmTQDVEyoTIkaLUSfMfBCMFwo8CJI2fIQgcrNMVGmcwBLSxh0qc9aBLpLrHObK3gCM8J9v3nd905BPSfjjjwae0HFPlElxBC3H/9zed+9wVvvPlXOq3bZ3un+3aiHohOOOD3P77CR+/JZXG9LOViK8URgkAKPnXScOWUQ73kgGNJU4NIDZ88lvGJM4ZkA0RCbdSDVN79IbJ8yOcS6DbouBx0G5WMrz/sg4MgiC1Pnjdct7tGEA546EjISi+jXBY8cA5+/k+/jVtfuYtzSycoew2iXpvAX6FYGCeQUyTGZS17hKKzjiemEcLFWh/BLAN7CE/OULSvRVIm0wvsrA74kWv301afoeaXKKsDPOSfwql9nLWldUp4vGrbNXxt4XbGKhUuNDMmqpaZ4SJdlTLfNrRCQ7iaMjbksLyUce8XP8uT9yq+9tWMpTOg0xRG8OQMntyYIzExxLFBeYJICSBiyV9l8/QomTG4QhL4HmutPqIvcIs+XiDpppYszmh3uzRbPcp+GSstfqk6c/TRCzuB809HEvK0N6RuMOXxy37uzvef+fRPeG/+8e94B++5Y+zYudBevaUkhooR823NZx7vUQ4EnoK10DCI4IpRxZWTDuWipODkbenveTDmc/O57p6wG5ZPCKzZsH7mnzCSkqckdy6vWG78nvKByLKnqpiYrTI+bDh9RBNqSzeCs2uasKr4zF13sRxeYKp+kF1btjI7foCiX8TDUmCE3LwArJPrsZYBjcvmjcfHgAx4DBcXEDiVkBoFMuYQnOGmse1M4JHMFljqdgnVY2yeVng+bM0srU6bVickWrQ8frfhkUcMgxjujWNWzkaEkc4lVqsgxvLPZmwekhgJuCC0wErIEsugZ1COYf7seSZrHrfecBX3nzxCpeYzP9fE8X2SMMPxFEZokjQjTmJanQ7F4RKx0ZQq5amLpy5uAz7/TOyI/jo3KCD+99/97s+94Wdf+r1v+qGXjn/oD283h850mR4KRLWsefRCxNF1iydgrKR41V7Ji/e6jI96eMqy3Ep57yMRd85Z3PKGSOPGBIs1eYsSBkrbJdEFg+7b/NOo/MRvjJF9HZAbE42YECoWGsqwc8Sw1klZH2iKgcNCGnNGQM9q7vy789z5kYv4tc9T2Vxk19hWSrVppOtQ8gVDxQbDlRLFUola1adQLOOJOr4uUgrqOMUMzzd4jkOaKDI5jxFd1joJ3aTDKAlPLnyeJ+a6XDy1hEw13bjJeheCcowBBlqwMDcgPb9RQrwUtfsGaqCGASMwOt/AqeONKyqf+vxWSKRjMcZiMs2gk4dup0/MM7NznJWVJqlNUI4gTVKyJMFzfGwKkdb0dES/m5HWNFal1Mcba4/c11t8prbkXzJEFhAfePwd59/27b/9J62To5Nv+clX77jyxBKPfukRCoHP9GiXNM2Ybkj2bguYnDRU/Xz24e7DEX92f8JD85YggNS32MKGFZO5YbG5sAfehKAy6rH4lTgH3uXjVmLjORvWTypIunDNZo99UwJveowzXzrF0mrCsRXJoVVL0wi0svlm6sDAiKAve3xt4Qn04hNPvZ4CVQRpwGTgVCFJwTaBEChddiNkwMrGdwHEQO8ysIh/Yr0Tu/F/Cy6o6Y2bJ9l4DZNbfp1s3O6Xltleer4CkvzzylST9UCOgUnzuRms4NzJVT7y4S8zPFGm3x2Q6QxrFEmc4AdF0JI01cQyoxulxHGGci3FSunM/IXuoWc0AL/ujrfeFllrP/jD1zTEI7/65Z/+zrcc9F58c32m5sjGK290MHEPhSAVcL6l+eJRwz/cG/HQoqZvLMKHrCRQ5Xwo++vuVpELMAvLYNVQ2yZxyiInmy9vE5MbVvDSj3VOgM9WHVIjaV2I2T5TZaENDz3YxalCOMhb943OgZT2LcWaoBJI4hT0BgCFC4WiQmzsli1NehAo1i/EZH2D8nJLrVOLzASmTm6phM3l2JINRVQsQlvIclxbnYtdYnOLb2PQfRAqT7D+pyKo2ADlJdezkZQpX/CSH7yaN738AB96/1f40u0nkaV8wQ9SIBT0FyOiVoxyczVW6+QScMVKCSEtOtVYmRGlA9q9CN93cZQamt4+PXHx4Ytnn+kAvJSYZNb+1797642/+fD3/OwnGy/e7f7ivi3ua50wtm6iRT+Dua5kVQpO96CVWmwpV7jPAFWBLAO74XKFl1uQSxcj7cLSuRTr2a9bh/9pTYvl6zowBV+SLQ64/u1bqMouRifcdyahXoSTUa7ZjMyVB2yS15IbWywiNfQiSDMLSiAdNtAIylW4nmVo3CNeSliNMowR2NRukM25qr7J8i+d5i5VBrmFsxuhgtkAks021JsSGJpS7Lq+wL1/0UMO5bTT/7Qu/rKY99JDXk2yfVeNieoefuZnpnji4d+huabzhT9yA9B2Q4VBgLEGYSxhN8aMaIKSR2ZTlG8Iuz26YUg5BCdwZoeGy3suwr1PR2vWN0QdS4ifSYAjAJ9fC464N7/8te10XXz588eoBYZ+1sMQ45ScfIItswgvP5vG5uAT5byFCgFmALaz8XhoSIcEYpNAdUAvWihcdmFkDj4U1BLB64fAaMGF4x227zB84VCPVivDq8OpVcCxeazp5iApDAkaV4CMoGah2wLhCHQM3RWDRRB1Nd2lkKXTUQ641KIHuQ7gpSxcZ/n4sghBxgJdsJiN/EUUckt3KVT4euiQQdI1rF1IoLABrn8KusvZ3A1XLAuScE1z7tEV+jvP01zpEV/aX6FAFRXSk2T9jBSL5ylMaMFqdEcTpiHFmQJJX1MquYS9iF62SmSGCEQg/Il8nvzpaA38hsmz5Z7qT5yZmV8Rw5s3sX3nLs42BzTn57HGYxAmCKtzibIgz3bFBp0nfFA1GJlVtC8awgHg2q9fsGwp11ERtf/5wgjycE5r2D5iqfuCcwP48y80qQ8k9583EMA8MMAivI0LrXJwRHP5ro4otngeVIYE3Wbugp2CREko1iDpW9oXDFbk29N1CCZ9yvULwKYgXZi9VXL6Ls2Vry+ztphw4Ykk/7uXLPglS+ZCr2U58ZUEKhuW8vIM/1KYIS+z/BZMln+mL376CCceW6V7IWbQtlDNddeseiqRMxtbOYUS2I0QIdExjiMpBIpizSFez+j0mujRCkr6FOvuP26H/9845DcKgALsL//E70wUS8H+zMLRx07ZK6/cgSX9Om1Hmnc0CRcEMtdRvszjtJfzPb5c2rEhnqJYTJy7y39kFTZ+R6cwUhOUNiv+qml4VMJcAf7osOFiAqseHEoFVDd4RScXChclwWDe0pyD+mZJ3BOkcR7z9VuWQlFQKOXKCUFZMLkHhjdDUM+BdinxkT7ggQjyz3f+XgMedJdTwpZBFkGVN8yBv/F1KUFxn7qxZCD/Zwv4f5fEbFjdKLScPrHIStiEej6TjASrN5RXuwY72AgTVB5TC0leMBcW14fysINfVMRJSqYzkIJ6rfKMHUz/fz0eP7PWsN7Illrd5/RyD20kqujR7/Vzbk/mVIpwLwuuL1EpUiDd/CQhNohnednjCRTGwIYQL+du12YbPKGAnmt5uGUxUtCVllJN8rUeTChD5ED7kkXVG9mnyC0CEs79nUWVBa5rSfuWQnVDWFwKPN+SxIJK2VCvCuo1wbHDlrN9ixPk11J6kMW5RZcO6NgiDZx+PM7fuwemD0EDkv6GYXc2zkG6kfFnYJoG6huckrwMiJfI93/qwl2LCHJOIpd8yzlQxwXhWWa2l1i+GDPoaJzihnSxEPhlB2EgizKkypUZMp2S2AyjNH7JfdowIb+RAFwZpNYddm11uECqLCtLS/i+n8vPKrFxO+SStLgblkDmF8MpSAwiH2sVT4ESd+N3PYglBHsEVMF6T1kQShBp6KeGUFniqmAwYokbhrM+LMQb7jLbyDwtcOmCFSFpWU5+RrO6YHFKUG7AzG7wyxq/ZCjVDU4BIscSWcueK2HrTYLCDKQOlDeBX4MszZUgjJv/HWdSwBBM7vbZv62AVRJnCPzxjc9eAooCMqj6JV544415HHf5Z7t0jtRT5+rr30Xu9m1qn6KwdJ7g7XiZz/f93CyvfNsoNs6VpExmyJSlsMknKLmE/ZQ0VMgiaJERI1EBBLXo2WkB0z54Uy6q4OC5Likat+Dl2a0kd7nG5CfLsRs/y4FmtEEicg8jRW6lLlHeWW45w6OQjVukvzF/7T4VK10irm0Bwh754ukNXSNrL7Mg9p9M/FkgANOFpcdzIrt2Y/42h8YEq4uWLIH6sGDbtIujNVZo3JrkigM+hWsTTp+zdJctpQmoDgl6/dyCdY/Cvm8T/MxPFDggBPc+UOB9H9U8eryDdPPhKSHBRtAYr3PjKw7wlUfvB1diE7PhlsEiUBuWLuuap9gANm4kQ36D6/zDSQt1T3D8yHlOPpwijIAg9yLKEZQrlihNES5YaXCcfF2uzjTWaIKAZycAk8QjcF08R1IMPLQE3/FQQmFk3tpiLhV1lUBg8ztcgMkEQtqnbLbkH1fCvTxITxcui//cDdJ3I6O04ilrKS5xbpfc+OUlO3kZp6Hzs2Ta+XOWHga3aBnfYykpxfiooNuxVMqCesUwLqvM1Gpsra8QlA1PnIO5eUFlSKCUpbEJnEiwsmC59Q0+v/ATO9kZXUFRXsvgxo/w8wee5Df/wOGxz6TIkZw7FA3BuYsXedfvvwcxIbBZHkPiCGRRYGJLMCIxVqLjLH+cyxITld9NQuaMwu4rfV79imF+9RcvEp+yqBEQwmAHgtm9Hq96qc8dnwyxUuI4AuNLrMp9vhQZacKz0wWTgOsJYttDiAzXVbiFArKksN6GO3UuUSF5nCeKAlSuwZcZi3UBlfNnXOqI8Z5yy3aj4/oSNSHKIKri69SKMGBalmxVYLzcWFjNxgW9zJXJjZDAeepCWpPzZxe/BPGqIMwMTsGyeZtgy2ZYbmlaaUS1tM737DjA7uoMDz9gaF6wuAWLX4EozMnwW/Y4vPenK2zNRpjyXoXrdLjKnWLYqfCWH4bRvRIbbYR6qUVUBWqTgsB+PdFSZYFVksJEAb9eBOXkll5d5pZd8fWrbC2IChw7HvLhjy+jtETUwHoCk1pwLc0ooRmuU68nWCRuEOCqAo4TIBS4BZ9ooJ6dFhDA8y2ykOF4ErfgoBwHVVOYnsmz240M1Dr5ibYijwmFl6sEWOeydy0vi202rBxODvRLF0mU8yw0a2644RZUFPzM71SZ3lTkg19d5QvvTRHORq3ZbGSL5jIXfCmo1xtJgYZTX7Ls/i6IrKW9nFu38Ybkc/eF/P0HQiY3HSJyNfPHIO5aghHwbT6VF/cEP/u6jIpOOGYfZNx9A8vJKfrJV/CzUXaPF7nhJQM+9RcGtw7U8uTLqxuSniBpWVRJMr5/CK0MJnAoNqo4612iCxvx2aWEzdqnEjUnJ7e1FRx7PGUwuESE26+HGu2e5Sv395FdhauqCOUg8PH9PCHRQrA+/yyNAb2yi04QQgqCoIDrSpRSFEo+g3CANgbhGFDkK6vMBi2jBcp7Kp4x8jIOjI0TfSkxSy8DpHqK52IjbNQG3va7Bb7/NS6Lqy4/uN/n7ANw9vEUWcljvK8zyPYyNyY2ivsb/GASwpm7Yd8roVyzdHvgYkhb0NOCkws9wh7ErfzvJn2BKy19ITgwDlfuEnxhNWBTZZw+J3HNLuajz2Jln4VWzEpT59bJQnEiX3joBPkekkRZnFGP2YOTTM3OUi1M8JUH7iGqKfxGQDgYPJWoxJdlyU5+kwrfElQk0brF9C8hIbf4UsGgaREROJ5AZwYlXHzPQ27sbo4G0bPTBRdqgU6jJPb9gLGJBkHRBweK1RKO5yIv57REfsKEYxEueBVwijxFv1xyMSoHl1Ab9I26LJEwuTW8VGUwGuSQ4K7HY+49r1H1Jt5ij+aCzqsRYgPw0j4VXtrLskp72WtaaJ+Cxz8J7SasrcLDj8H8HPi+pVAQyI3mAysvkb3gBZbYCAY4zNY6dO0CK/qrxPLz6GySec4SRZbV0OIOCaSbb9LECuKWJe1aZFGAVNy0f5oX7pzhxj3XsXP2CnSkEJ7KCfjL4mWxUQ26xJ1KN7fy4lKYoja+/I271Eh0pvADhRISJXJqQHlgrRJJnIqn+J5nkQV8+eu2zn/sU3OPEomrhoZ9Nm1qML/apuqXWL7okBIiHZvnBHEOCGtFnhF74BZBR5BcUji41GxaBukLTGLzTpTL3af7VDXCiryqMliBd3+wzWQiufduQXvN5JWINAexNZfdmvYf3xCXfm7iHKy9BTh8OxTqMGjnHSqeyvsVBxc3slgN1od+E6JVeHLMcPdZeP02l9aa5Fza4prKa3jBxD3csSr4889YtBAIYzA+DDogjM03MUUgMolVio989gQHrjGUKz2W44ismzJY6ebhRPLUTWq9jRq6yGPdLMu7cS59zkt76oQAvwzlhqCXWQJP4kqfWGsQMa71ca2ThC2ipwd+3+iN6f/HFzof+uD0UrffwikpUal6lAYenlOlXquxrHsgDHrjjsfktdZLhY2gkgsHrXcFwuQ0ihPk/JoOLbK+4Tmzp+I2p5JzfJcAY41l/h7LeQOsGqjnFQqrnwrUn8oc/3FDw1NZ8gals/Ga6VpuXdMof25n0eYdLJeXdXt5A4/REGv4tfcZTr56wA2zMcrpM5f+Dx6ZP897P205dT6h7Aji9kb9O8k3qluZD1fZVJPM9zmfWVrrKU75NFkY0j+/lr+vyytkGzeMKuXvNRs8FetKNsIZ+fWZ+jzUERadWEojPkp7CEcgJbhC4SJOnzux+sTTZAC/4UmIjcJBd3V5Md155R43KKxSCBRKBoxNjTDQKzgqZvlJg6zYvJJhLaTg+rBzn6C1Cs3zOUDVRsY3uU0xNak5fsrSawlEmD+XCDJ5Ke7ZAOZGLiEkiE0bfHP2j12/sJcV/jdykksX7ZJFQ25Y3Qyy2EL0VBlMb4xtC0BuuD6zoXSqgtzSLh6FPzwFQ8OaG17YY6nZ44F7QSlBZUTQnoNyPQdeYULRXjJYkzeeWgdINHquS2u5nzclAqK0kbnrf9wTKV1w/I3auLxUkbGoQl6hkQqEzLNlv2gpFh3aUlKqlpFW4fkOQhoC36XXjdutQ631Z1sMaNkQsrSZeaDZGix7vmK4WrHFIkhtGJqoUvZqbLlG4tcEqiCxCKQn8mYEVxAUJWNTDsoTCAHCCLKW5Rd+epRPv/PbeOdPztAILgU6UB5X/OQ7y8xsBRHlfX6QJxHWBSMuazy4ZAkuEdfqKUtoL6M27P/V3nsHSXZdZ56/+/xLn1lZleWrq72BIdAGniBAEgS5JEXKQCEz0o7c7GpnZmdjhpK41IhqxYxWIndWM5Ko2dVS4nCkFUmRIgUaEDSwhG80uhvtbXVVdZev9Oblc3f/uK8BUCZiZwMEuiXciI6sqI7Mynzvy3PP+c53vhuq7UwYSuCJrXSLcaRwIKKkW2glN95Rj1KJTYg8RWIbKeVVszYDD/654IXHlXuXYUq8jiS2JXf8pE2urNFYjYj7agu+0lpUHaCkfysEwtZUzqy/5vMkaYNZACejBBl2FqwUmGnVFrxSoGimev3ykCCT0cgXHPJFF1MYpFImtqNjuBaLl6pj2+8sbLo2eUBgdCRfXZxZ6/pxl3TeYGwig+0I3LRJZqjAei1m6N6Ywk5Jeiu4YypqRIbGwppNP5WiOKUR9yQipaRMX/tWk5pX4IdvzbFxm6IVtJQg6Md0Fir83E/8FKIIziBoLuAIhJsk3sZrwJeIAaQLWh60rKImhAsiBXZOUKqYait0YevIAAN5F90ViFAQv1ZMYUPgQ6+qbnC2Ak4abBfsNAQ96LYgtsHJSPRA0m+CX4P+Emwtj3HhUJbI1XFyIEx1NIXUXsNXGkqvpvq8McJXXSAS8QMaaCmwCgJhgWFBX0IvElglgVlMqJlk/iaOJRumLSYKYwwPpMi5EbodY4QmKVsnzoY0Fpfl9i1udM0C8KY7Jha8eu9Ur9XFtB1yWYdszsA2HKY2VqhfTGGkJdlBiZNT24SeguZyRKsesr4WkJ/SFMViSuxJjUe+0uWej3yB9/z6CY6dEois2rp9W/KZP5rl9/7jN5AdgdeRr5DX0kiKg/A1yXrS+hOvrbKvbMU+DGw02fvBDNmSQEvDnT9WZuptGUIpKYzo3LDPIfLBzajnb9yo8cBP6TgCiAVeQ1CoCLIlcHJgpcHNgZtOOpASDFsQNeGn33s7RkOjejkg7CihgAzkq/npa4ojkRQS38ciJFHayoPjgi4EYQzv2mfwv/yMSbmo7E1MC3RXEe+5Idi1w+WWiXvZUqkwUZzCNlM4honjOmihlPXF6qEP/+TOk9+XF19LRPQf/ubTK9vvnDg7f3aBLTdtRtd0CgUb0bLJlIfJF/N0a01GNsDiSbBLkjgWhJ4k7IYYhoYvlERJJkcvOBsli3MCO4jR8wJRVWBKDULkhDQW66pn2lasP1JiChjdC53LgrU5+UprS418JqXPazhAkYbF8z6Lp3xGbxH4x+FP/8/TOCOqagxExNxiRKqkciw9Bf/iFywe2KHhOV0unhFM32Lw5GEfNw250hXRA7hZCA1V4fpdiVUU/Ppnv4isq2jq+/L7ZPdXCiGRnDmCBYamVDfJOYev0CtuVqAneWBlUuMDdwh+fluWsUqbT34hAEPpHPuhZHIXbB0dZbjjUi/FpHOjtDI+jU5XFvMpQTuI9Dh46Wfe9d3qz6okV15LEfBKHhjqInqxs+otGFISBEKmUy5uKsZNCzZtmyKoCwxTpzyd9IAtlbP4gcQioteI1DYTQ1BVZ2jYRan4OUvlhjJUTgmZikAUVM4ndMBS/JgtBB/9DYub36dBqDoUwpQIU/WfRTJdpyXbKQYYGfU6lw9IhANuScM0BIYliKWy2jCS/DLjwl886fHRB3u4KY3ytGC1H2DY0O5Ap6NyUK8H9XrS+Uurro2MQfQE0lR3WDPU77Ukql1pD8qe+jk3BrkpMLPq/92cYgywk8rZhFReYGcFl1shfWkwIApqUi5W0TfyoTIEEwWbi82nsYxJCqlpioUivt9gaKRAt9WrZvPGueTMkKvLHeu/ZdlheMCres9m0+4P1RqOIeMIJ9dHc3x27tzO+TPHsM0OqTx0ehJdS1TNUrK6GqiokQevrqJZ6Cn6IPJAa0oiC95xb4b25ZAXD3gYhaTg8JMiIQ19Dz77qZAPPmDw4nck1bkYLZlk03RVSNhZJaWPlQ6TsAm33pgCN+alMx5mSh04qIPqU6O2u1IJbBuW5pUl8HtustH7Nl853mB6kzIfX19R7zmXhXZVARGhOjWakGhJdJOAUUym4DzQkjxTi+GWu6HRUuR3aUy911RKPWd9DcJIBSkzreRgmi55+DDsmVrn6XnBypz6m35b0TR7b9LAOENbK1Oyfo28buJqTWK9KbLpwaaD9l8HyvWnXk8svCkA/LMHf3npx3/00817f2y3kck4sr3eEpiQsdOUp4aZGNvBwtyzpHMamSz0Wko+3q9Jwg4YRjKYrqlJdYFMWm5Jw92CSMTc9k6dF19UtISmKUrjikwrSEleeF5SLkYEPYmWSbjrWOWGoabEoaamKAzDFPhNiZNT8xRoyq/GTqv+tqhBuwZuWeWAuYxq6+VMwXdf7BNIj6kpjfFJQbkc8/T3JE4GnFQyRakO/VTC5KQCj3rqixD1E4GQrhiWVFpQHEn6y2Vo+2A5kHIhXVBALA4I1ldVi7A8pHK9bkvSWIff/HzI5dOg+cmgFLDpRrhhm0a31aUQ38FofhexOEPP68liLi9MONVZbP3pw5/pLPM6GpW/4TwgwK6h3+yFfObk6YMXuzfdtytVb7UQho+QPvgB773/Xn7vD48z+p4WCI3lOZBhjIbqJGjWq7J8YaiuSJwM/cQ6aKHgqa93OXNc4AwJAk8iPV4ZNNJzMLgdujPwtU9HUFaEtWGpszbGr4N9b9Mp9Az+8hGfSEp1StMAPH6ghW5CaULliyS5V6ogKBRAZGK6bRB9QSoDfgQDA1AYFly/Keapw3B6DlIZFS1tG+IsBEPgmmostLYoCLqKy4ylinaaDlFDvc7WuyUTOZhbAtOEyog6EWrDhCBXUJRVFMDREHIDCtROWrK6APVLsCIhaCbXT6rPfsdtAlcXeG2TnP5uBnIhC40+QdgWxUwZK0q/cOThwxdfb0C84VUwEiGEiLZuKz506uXZ4+1ul37YlQagGSG9/jqVScHuHbdy4Sm44zaN6/fB8JSGL5PqzkzGE0P1z0wlPdeEBzPTEisD6zU1XScNRaOIJGEHlbQ7ZajcKTBzipdzyhJSgtvvgN/+Efj9nxa8906BJ5L8K1YDSE4eeg1IDcA7boF7bpHcszvmix+Fn7xPpzgKuiWxU2quotuDXgCuX+aT734/t06kiA31+1YbPF/RM7EGvR6vjCbggFFQCmzLAWcE/o9/leEX7hilq8PIpCCTgcGSiqSVElw3DrWGZHFVks0JxoZVJ2htRR107QcqokZh8q8HuRRs22wQV03m6+NsLOzD0mL6cUvGMmIgn6vG/fCZxUW6UsrX9ZiGNx6ASer61f/7YxdWF9cPLM8uS2lEQsSSjOMQGy3mV47wvh+9ke7cEHYgePvdgt/9FY0ffpcg9MFKq8HxWEIcylfmXDVTXeybduu8+8MGYTehIlIKbEYy+BOuQGMGJqcFRgHSYyph77XV8VhHjmoYMbjo3LjdIEpabcJR7bRuC4anJNu3w01bJP/znWU+8d7tbNFKvHtTxNQUZPKquAgipWyeOy/58nd7nKvXQYsRUuWAfgRBpPqzsQQ7+TKlyzAwCRNbYPuNkB+Am++AOydtfnxsC7vGlIHC4BCsratsZLUpOXJeUq9Luj2JY8YUcpJNW2BwRNEwoae2+/DK9F0XNu0B19Xo1ns4/Q8xnBsnjCUXV2ZxnBTDQ5mZb33x2aPq9olrPAK+Ug0/0Iu70TfmTy1fSmVdwkCXYV9giwBd6mwYGuS+d97Kkad9No5anK9FfPAdOq6p9IKmm5C+FgRdVRXqpopkR1+IeOa7EUPT6oaaaUilIVeB8ma15QTrsHmTsnrz/eT5Otg5OPOy5MO/EvOnxwIePRijJ0S0mwY3BeVRNRaQL4Kbstmlf5ZBHiYjPkdKbiWrCUoFg4EyeF0Frn4fLq52+MjnnuKh5/t0Wok41VJTdcArxZZlQ68JxZxgz/U6ngfXXSfIpuBUq4dgDq+usbYsWVlSr60ng/eBhEpJUMgI8nmBJjQOHpEYQuLV1Rc4jhP+M1Rk+9ZdgoolmF8dYYP90/Qin5XWMsurq2ydGuP84RX/2PMvB69X//e1S+fNWQLgP33px1e+9vmXN2+9afQmy7bQRCT6YQ/Digm9FO/fey8PPn+YoakmlbTFZFHwvadDVmvgZAVxIBRpLJMKV09ypQj8GCobITJg85SGIzQW5qTqzbrQW4VTJyVmNnGTClUFaphqOm2xI/jKQxGzl2PsoqoiXVdtY7mSAqNuC7aPaGxONWlGz+Lrj4N+jL9+PmB1PVbyMAPaDdWjzbmC5XMauYJksGBScGIWzkGnq0ZKW1VIZSFfhrEJwR1vE+hmTDqjquVGB+bqAQdX6xyaV+obGUOxqFKK8ZFXCW0N6HmCZw5Jbt4GN+2Ax55RlbxQZ/AQdWBos+Bd92ukQ8na8s+xIXMfTX+RI2cOYqX6DObK9a//+YPf/un/fuvDj351rvt6Q/DNAiCA+OIfH/TGpnNBqBtvH95YKGj4Mm3bwtUNOuEcw0WX3RN7+NKxRxgY0AktWOlEnDmSyLGSilFGSbM/VASwjFXvMw5Ay8Cde012XSc5fVnSqaqLr+fAykBpBAZGID+YdEFM6K6BoattzS2rnq1rQ7YI2ayKgumM8hlsBjHfvnCKPztwhG+ePcPTlwKMNKRdWFlSeV4qAzIWysmKmK1bHW6+fhP3bNrKB/Zu5KmFWSxLUCjDxJSqdAeLgp+/V/F4l2pQb6gv1rlLgnPLgqgvWV8HywLbVNu5ELBnQufHJkcoZ/J8+1yTgYzOR98jqC1KvvqlZDDuSsUd69x4d8x7t22ntpin3bgLYoe1xjIXFg/K67fsEy89duLioece/A9f+E9zx/kBHFao8Sav33nonzx7/DsXvtteieJuJ5SOpWNjk7FMOv46H9zxLm4u3MHTJ3qcWRJUdukUxgR+H2IhX9E7iWRmI+ypCBAGKqGvz8GpixEjw4JKSajWXsL1BTGEPuTyYJmwYRtM74RMSRG5ZkH1bHe8TbDrRoFpqP5u4KtqdWRA48jL0I80sDQu1TS6uqTXl2iGZLgi+Nn3GYxWlAdLuyWxUnD8hMfnv32Sh08e5/nWcYppKKQljg2ry+p9W4bEiiW6VJWybYFpwfSkZGRAMliE7TsgnYVqDXo9HcOC3YMfZHfhQW4eKVLKwgf3CTakY46eTTSRfvLYhsxAzOiwjYyX6HQ3EvcKzC3OcOLScYZGBmO/bjef+MbXn/vYJ9//8g/q/utvMv7EZ/c/4W3emWvV6/HE1puGhvte00pnDHlj5R1iX3kfutzFroHNPHj+80ReTDqnkc5GzF0Ur/B+MhGniitgNBOKQVcyrsvzkueejYliQSxUIi4SSVanBqObYKiSELeGojIMPel4aZDOg46g30vI4UhFtTCC4TLUlmFyCgp5iaGr348VoJyH1VrM1Lig1dYYGhVUlyVeHxxbMDDoYetdzl+Avp/8zVBto3u3wK4JOLEEoYDrRiBnQzOAiRFYWoVt05BLw9IKFPOqY3JjpU/Weo4/PX2Aehv2TkMn0PjkH0s6vhrxlKHq/+a3CW7YGYHnMDf7y7RqAk+2qHUusHX6DvnIV77+aGf9kU/8/kfOnP9BRL+rIQJKgKe/cfF7J5479eWFM/VYN9LU2+sM2BO4ciNhuM5k4d38y70/x0InZP2iweCQztvuTq5Iovy9IiAQmiomDBcsFxqXoV9VurfqssRLlMBxqBL3IIR2S+V079xnMJLW6Pchk3ixXImmfizRTchn1ZbX60CrKymVJNt3KiVrFKqCaMuEer1yEVo9qLclG6Ykq4sx9WWVGphC8vJBePghBeBMSpHXKVeNZ7S7sNCBrAPFlMZwQTA1KBjIQ9CH4QH4oV0wUoJCAUxDkjLhaGOGT7zwJOcbMDEKixH8yUOSpRnQ+smX1YNURbBpO9ihw6HDv8jZMx7NfpXl9Tk5VNggZ89cCJ759l8/9dzX5eG/Icl9XZfxZm/BCS8Y/sJv7X3i8Ddnnrp++323H710Pvfc4OepTP4qGia9+BjvLv8qnw0eZb63QnxBsu9egQkc+JqiOqwBCFvqMtkpgTAkmREYzAiqFyE/LWk1YOWUAqlmJ3xiDfKh4PatEPcjrtssWe/DxJCKnmurkCuqSvb2u6CYBluAg2B1SXCpEZMakNywARp1qHYEkS/ptiGyFRE8koP6ikTzBZYjybiwd48CWd+DTgMmJgWXFtTkn6YL+pZkua0xVpBkmjH1GpTzOrdugK8fiJgagVOrgl5fMp5X9hmaDoeOwte/Jti0NWYmLziM5IVvS4xYTQYqyxON0ohgcyri9FO/RDO6C117jHrbww1DcuUJ8Z1P/8mxPXtTDwkhIiTi9RAeXI1b8JWTbsTBRy+vfeL3f2M9Z+Vu2bF7svLs+cNyakwXY+5u2vEh0lZMpj/OI5e/ibxc4vJch9veJ0kPKXWxVwdrWLXarrSX7KLgcx9LoWUDnjgIbgnalxRIjWTgPaxBOiW46141GzuQF2wYgmwKsjkYKKtcMZ1W252VWF7oJkwNSwo5qLYg58DN04JtQzrz9Zh9GwSVrODYJRgvwc4tcPfNAj+tqunhITB1yCZRr9OBXAHKg1CvCd67R7CzJNmYyXB78V62ZIcR1gK1CLx+rPxdDFirwuIivHxccO4CHDsmaS9JVhagE8DxxxOnrj5omkA2BOlNkh1vt1k5+MN0wweI40NEcRPRbsmJLTeIw8+dWlh96ev/4ZlvrH13//79kv0/GPBdHQBMouB+sV+uzn1k5Rf+x8+P77xuy15nIKMfuvw8pco6OTNP1T/C28Z3MDN/Dt9qcel5SXo8YMs22LwLFs9BYxbMkpLERx6Ut8BP7bOYylg8ueQzMQrrl5VFiG4ooaswYXlBdSP2vs0go0l2lWBjIRElCKg1VdO/mAMrGXwPQlhvJKdvJuoZ11BOrpW0iy4iVrqSWhs2V6ATwdHLkLIExXxShWrqvWq6ep04Vq+5c1zj53eb2BQZFb9MSv+nGLpPxByB1qCcFqx50A1gtaqxsgpry5IwFMlsi8DKgbeuFEEKfBB3BXZOsueHdc4dvptu50fJOvO0egt43ZZM5cfpe1Zw+mt/8qmZQ7/9R0Ls6fMDOCX96gNgEgX373+i/+F/ff3lb//FoZ3vun9r5cLFjrben9cCsUzd79GM6gxXBEfOzGKmdJ572GPbrVDM6YzeDFokuHRYcYOaAc1VuJSJGBpxeOaxgBv3aEihs3A0fqUaJlS0yoWzAqMIN26GUmRTNlKMOTqhETJQEoQR5DOJdCnpIgiZkMfJo0R1GK4rFnCMgEYYMVQQjOaUuiCKNa4bjZkuCeyMYKSoigefhPZJ/AzfuVlnx4DEiYfJiQ/R52WiOMDR5rjYXONcNWK5qvO9FwEpKJSUgVCnr+iezqqkV1eDUHEn4UpbIITB3p/QacxMsrb8IwwOgddpEkcr0DcY2rhZnPzGF1++dXf9d378A5+b/0EVHlcfAF9TFR/+zuW13/29f3vB78jpm+/csOni6a4w8yEXVlepeiGZtMvU2AjzwTJh1eGZB9tsu9vED2DyZsnYNjj3nOp3xh7MnpS8uNhn8YTk5CFYOK5mH4he4z1UhPwIVFuSm3ZrZKTGqLWDTfr/ypPzT/DiQkApLwiiV028TENVub0utK8MJBkJ8L0uXRmRM2A6D1lTJ2tEbCtIMo5OGENXSkaL4IeCEwswlINe4ujgoDE9LHFDk5Q5SUa/BTPoEVjPcsFv8ejxiAOHJV4o2Dgu2bs1xixIer5GswqtFTUDEzXVHRYeyFWNHT8k6LaLLB+7leLIHgwChF7Dbzbl6OZbxNrLj1zUm49/4sm/qj2yf/9++Ubc8KsOgPv375eN5WDhV37t35Qqo+VbB7em3NnTl2WxaIjlapt2s8+W0b3kDJcg1+Dy6ZC5lwL2vVPn/KmI9IBk+zvg8kno19R22Til+MFgPRny1hLbssTqI+ipbbm2qhQx7uaIQK5S1OHZS+s8d7aFrgscBzo9aDZV3zmMASGwLUEvUsqUlA0TGZ0hx6Roa1SMDINWj3HzPgpiO1kjZNQcwtQ1UqaHo2mcW5foBnQ8tds9dyLmdFUiym3ONQ4w03kUPfU9DtcX+Nh/CTh5GAxH0PPh3Ten+Jld+7i7soMmlzh6NqI9C8FS0qrsCuSyxvX/xMB1BPPPXk96+n3oWoDrLLF28SU5tPk2sXLqaL16+HP/bvbgoc8KUQneqBt+tQHwCgjjL5z+0Jnf/ZffEzv3lW/uBpG1utClMKCJmfkmcyvzTA1PkNIMKHSYOdrnzCHJ7R8yWLwoCX3JDfdBuw21RbU9itdY2F7ZVEQyrK4llhWaDudOQbUDXi7mr2fO0Nbb5LOCVE6Sy8DomCKu2w1Bt6nR81V+2A2U5m4kL8iZggGzQFkXVOR+HO7ARJAWP0FG3EisPU1sr+PLmNONEFMIKnmB7Sjhgu0Kllbg5KwgNRCyFrS40PH51BciZmeVMSZApyb5mXtL7E7djmGd5aFjCzz2TUG4kiiAPKXOvuFnXfKjac68tI/i+D76LUGu2GX+6GNUdt5AZ3Y1bD///3zxY392++/fNvGR5g8677vaAQgg/vx3TvR+/c/uOvMn//albWM3FHf2jIh+PxD5osVytcXhl2fYsrWClTLoBm3OvOhz7lDArR8AVwhOvizZeovAcjXWLiqOTiTSdqPAK/7IVxxZNV1VxqYLcydh5rxgccnEW4a7NurkIkkQ6jz9JBx4DI4dhRPHJQefV9Fo4wboB9AOoOmBb8SEIsalSkm+l4DTaPpR1sUf0WKFehTzxMWQhRpcPw6NNTh4QlXcw2VBpyc4eUoyd0nQrGk89ULM4qIkk4XWuqDXgPHtsG1jxK7KRR6en+UP/jKmfhboJOKKnGDfA+OURkY4/NgNDIxuorN4jnwuw+KJ0wxtqsg0hpz75l/81X/3r8b3f+KBF96QvO/vEEddnSAE5P0f3n7riaX1377vV7bc0243kWHA0ECG2QshSws17rx3Clu3efSpUxz+zgqCkPv+hUZxSnLwe5LMkDIuWnkZFk5JvK6SZRk5te0qR65X+8p6Mp4Z+qrbEQu11QqpRAheG7IDUNkAmycF6USUOj0msUxY7yqqZrwItqYz4UTkZYq+qbPSC2nFPQwhqHqC1WpMhCDvwoWLkjPzkM5BpSI4fwmqNYnfVRRPtwn1KkxshrFxwWPfkhgFuGOnzj+9V/C/fzrksW8olbMwBca0y45bh6hYAxw5vgVTbITWIXQvptsCt7IlLg+mtJnPf+H49Dvi/+HgZ+afeqPBd7UD8BUQ3nz/2K09Tfv3d//SyD3Vap3GUiSmNhepVgXnz65w620Vsqk0Tx6Y4eC3lghWQ7b/iMbYjRGzZyIqWwTFUUHtouTsEcnarIp4dgLCqJ9ciCu+1AkIzZwSiuqGmpkYHFF0RmMNBoZhagx274CpAcFqQ7K9kCKn+zy7FpJxNdZbkigW2EZMJAQ6kkwa+iH0uzCeEjRa8OJJWFiDyIJuW9Lsqwq93wXXURzk+rJ63Hi9wHLhu19VeaO/rpTdvYuCzHWAqeFrsHlXhqH8AOeOXU9Igdg/jxWA3xJkBiZl2kyLma88eHZ8u//x33r0//qrB8QDwRsNvmsBgK+AcNNtg7e7xdR/3Pfz5b1zpztxezUQW64viFC3WV9eYGyoSHYgy4FnVjj40Bx+x6d0gyC/BXp+TLYSMzytY7sSX8asz8H8SWWvG/fB7yq3BUNXvhxRTxBqSiVt20qn55Zh4y4lqu50lNHkLTfAYA4cE95RMRk0TF5uxby46uN1YeaypFYX7Nwak3Xg7LxgZh6qVTXfsnZZoKWUAto0lYEnhiQM1evrUvWCpzcrZc3ieWisQNSC7nnQBpXYtjSufF86nsXuXSNMTu7m+AmbSzMeQX8Ogi6ib1IY2iAz1qg4/9d/eXZii/yNP3yk+qV7hAjfzJt7LQAQKSXTuwu/aGftf3fnP980uLro01jpUBg0CUSE7yk/3aGhAc6c6HH06bP05zs4gzqFrRqZzRoxMd16yNA43PB2neW1iJV1ifQFA0Vltev3wMpIhsqC6hwsXYKegLAOmJLRCcFEGVY6km4AQxWBqWmU8jF3vU3itzWKtmCxH3NyCYgF+Yzk7Alo1aArIeVKul1lWN7pQsqEnC3YNK1hOoILKxGFvFTDUX0YGBS0e5LFKvRbkNUFzQAaPdgwBZ0FmDkpyBRT3LbnFm7Zdj+HXrI5ce4IC7MvoWkeAoNQurKYGxJLjx4+O1Rpfvzko40vCgU+8WZEv2sFgK9EwYfkT+V+aftXf3H81vLbd75/Ynzlsndzs9qmF/aRRESRhqVb5Es51lY8zh+ZpXGiAT2wBzUGdwl6mZiWp4QK+RJM75YMbhKYsSRlCGp15ct840YDKxvTbEmcSNl8tAOweoIggGwe+oGOJ2OqHUnW0RiqRDgmLNRhz7COY0UcW1FEtdeAhSZcXIJ0CraPq6m65TakNI3rJgW6phFHOkfO+azUY6Y3qA8+V4V8UdAJJCt16M5pVC9IqodAkwIjKyjfHPOee9/FtvQ/49zFDs8ef5qltRl0f4l+B2LTinOpQW31kXNny8X1jx9/vPqmg+9aAuAr65Py3emPDH8nfdO7Jq/fdNfwb7U7/u2Xl5oy6EbCdgSG5WI6BoQ6MVCda7J0apn2WkedUIlAy0u0EQhdoAbTt8D4beCUIFcQaruNdNIZSKckW9wcQ5rBjFjFdgUZDYYsjXHTphMLwkhia9DwIgq2QVv2KEVpSnoZaUr8wMIIbqAuD7IWelzq1xiwbXwZMNvusdZR78vrgRZpZIrq/OLIFFSbamutzUuOPAqtyxC0BN2LYG2CibsN7NGAXSN7+OD2f8MTR47x3JGD9IOQ2uWL6KEgVXRlqVgU5//y1NnB4e7HTz7+4BeFuOdNB9+1CMDvu2BTd1feseX+oU8srQd7+y1PxlIK3dAwbA07m6LblohQ4NqSTrfF5QuLdFdCZCcxsrSl8pGpqfaGu1lQnBKURyXFUZ1CMcIpxQxkHe4ad1n26lQDyWhBZ3vGZkzkSBkVctpmYhnjimnM+Do8KTCkgUGFSCyyHn6ZjHYLHfkdWvIStXiVyEtxyWsTOj41LWDJi+h7gmzKxG+ENJZizh4XnHhBsHQGurVY+WcbQE6S3qEG5/N5g7GJIT585//EkecX+dbjD5FJF2iv1+jUehTzZTk8mRJnv3L6TC4XfvziM+0vXQ2R75qNgK/NCYUQcuv7R3/ZmBz+RK/VTkdhILVMLPyoha67IFNoMkYXEbEe49Ggvd6lVwuJJcrTL5CJcSXIKHHq1ySapQZ23DKUpmDTJEzvhbFBwaitU3FMjFgjFQ+T9baSMzVKKZc4cogIMcwi1eA0QXSZvt5B07L42iqeVqUWSdZ60IgEnT5UFyTzhyRzRwQL5zXqjZjeemKUnlM+OIabfHgjUX/3wUwbTO4p4lhp9CDN+WcX0QwDYdnEnkNhrCidtiXOfvXkbHFD82PLL3z7C1dL5LuWAfh90TBfsacrH975B6Efvi/u9tGzsUgP91maaUJUwskW0K0uIgpBi5Cux+p8i+5yn7gdQurVHq4MQDaVru6KwxSuRHMUt1YoSrbtEBR2gp2TFEyBm5dkMmBGYPowUYZCBqZ0HSs2qAcx6z4s1wIW5mBmHi6tK1n/+qpgYV5SmwXWUKd82gI9p7xnIDFZ15Uc3ymaauiqHpOdstGzGoV8nl4DFk+1cV0X23QJWzoYFlY2kOEZPfZrlz71nw9c92sPiOd6VxP4rnUAckUoOf7OqfvzOyv/ud9qbpBWP7bH+lpjqUk+s5vB4XFmTx0gCGPQJJlRQaPXobPWI5XWCP0mfj8m6MeIUIANgScRUglcZQt1vogLpJWc3ZaaikhlQTYrGMzruGUI8hGpUEOEGroFYRyBiGl6sHwS6gsxgQeWKwljJcXS4yteNOpUAKlD3FEVsKYp0jw9YpLOmUSxgdQD7EJMFGlk0jmypkO/ruG1DLxmRKceATp2MYpN29NaB+JqOtP+xdmv9b58tYEPrgZF9Ovw9bn0yOyTZj79h+XtpV+Ngv5gr7YmtaAo0q5FYTDHuaMmjeo6k7s30lpZo7HaxcwaGAM6IrTQYkmxLNmycYh+zWTmwiqZQYPI6xI1A7yapOupWQ4fSV/G9CXQgo4PS9UQziUkdhI9haVae5auQNbtAFkwhpJuRTU5Q8ZQ26pug5PWsHMaYVd5rGmWArqTUf7AntcnkzZZuRCgmTpDN6ZJOSYWNpoWYac0NNGhVetI205p3br0Q6/33eEh66VZelflLby2AfiqTWN35ssn/jjzr2+MB8ub/lm+P7pVL3aZO70ova4Ug5PbWZ3/Hju272RGzLF8eQ0j1lk51UZzwUmZCF1j6bLAQaM0VELaMZlSyMAuQTZnoJsGg5k0JSOH6Q0R+mm0Dvi+j8Sj6YX0PA3D0NHikG7fIww9EAG9UCD6El2AzHhcai+TLulIV50r16pptDsaEjXvEXsCGekIERMEkrgfY1mCdFoj6MV012PMtCTuaxQrJUTWYc3oEPgefleTUZAWTtrp1s6tfqa76P/B/c98dO75L+znaot+1/4W/LeXs/Of33N7ZaLyUccW9+RSef35bz0rDcMiMzwpLCtktTPH5dlzpEbTRMIjVZSJC3yMQMeyssgoAkPiZrsMFCLclIbtakyMO1w3MsSgPcZEfgsTXEeFjRjkAQNJgHjlhJiBJBxGxPRpcIFVjjPPMY4tHWS9U+Pyap3VWo9aA1bWoNeJkIFO7Ce+bLFGFEki3ycOJX4giKOIyNMxLINN28bljp1TNNsdEXlShl6XdjMStpvpLs8tffrMp2b/N7osXY1b75Wl/wMCnwDC1RcuzqzWZg47lZxvpt2N5Y2Tmd5aRwStrqyu1gn1GBGDbQiCIBCNaoOwHyGNGEMz0EMT34uIAommRxhGjG3raJpAtySu5RDGHt1+GwMDX0b46HTiHqEUBNIklCa+jOgT0o8D+lETTzTxI4+lziUW6qvMLVZptQL6PY1uV9JpSeJARxMGsa8T9CRBVxJ5MYEfEnWEtKRFOu2QK2fI5V2RzqSEFIhSKU3YC8TyQl1GUVRdv1T7L+f+6/zv0mCJV08WfmsLfiO244SeOfrSwcf3b//ZLS/kpso/OrRn+O0i7g/2ml3WazZGdphcyWB614B0A59jB8+wcHaJZa+JkfGEM2SSKkEUa3QaBr4viGQfXTpEgz62Y6IbLRaCGQK9w0ZdUmALthxGJyTSZGKPYSNFn66I0TQHTaRptvusNutEMqTVhUYrZmkxoFWN0TSNOI7xazFu2pGZnI1uGvj9ACl1Ybs2dspAauDaLq6Trtspy11tNK2FxepZXUTfXDmz/sTK6fYzrHHFxy++BtL4f3DrtVtOJfeB3L0jm0bfWZrM7Daz6aE4MmW/F+Vj4WemJ7MMTTiEfodOtc38wjLNZiC7fo9+EKvZYEL8fo/hIZsNUymmJm1KBUNoMsOm0jg3ZO8kpRXIapOktTE0BIEWJs/t0orXmY+OcXDhWY7MnmCtUacfSxoNSbvny74nkKFAszR0HSwzjSlSQqlKwdQ1kEZDRlrVMOwTtqOvCo2mgfbCxYXLk0vLnaK37n/D+0z7AND9u0j7twD4Znw2KUH5GQNkuMPclK5opeEtZVkeHt6hW/r29ebqoPTjG/LldGagog/Zac+1hYHp6HjdPn4/RDcsHENguzGR3yXCByPGcn3pOMhiFkqOI4Yzg+SMESwtAzjEYUwQ9aj3+yy1G6y1G7Le6tFod6l1enR7UnhBLOLAwBAmaAIdiyjIEkdaaFisaLpcyrj6S1rM0wHirNdqXHzuzKUqX0Yyi8erRxH6r6GmuBbA9w8dgK8BIn+fo7uZ/RC54RvzE3hmLsrHN6cHqKQdO2voYrejyVzKIk6lHVIZiulUejiV0oXpBBigpR2TYtqmlEpRkEUGtHEyWgmNPK24TRB7yDimG7dYjzvU/CoLjWUWa1U67R49T9LrEkdSF6E0OroQi4EXXfR69tFu0692W/WXlhZqc7VHmOM0rb+Vc0gpxJUv2DUGvH9MAPx+IP5m8pn3/725kQY43MJYehKnMpKWWQepD5jTZkrsyhZ0Y2TcjBxLVKIw3pOyNWekZMisawyJKBrJuq4oWEX0aBCBgdB7SM33DFGarbZr3YXWJbHa9fHCWPhhfMEL5MuNJsyc7K4vnG0cWj4YLnKQxYRVlK+C7TXnw4u/RUNdc8D7xwjAv//zy++D6P/X5bKNCsMYFJH2Vja6JtttF2GkVUvZlshIQ4skrZkFDtOmzhoa88AqcJ5G8tPf3+n52+/yH+ANeGv93ddE/o0SW/zgQPBKhPs7//o/hov91vr/t6X/DR7ov+lCi388QHtrvbXeWm+tt9Zb6611Va3/F0pCkjD529mRAAAAAElFTkSuQmCC";
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
