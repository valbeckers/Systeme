
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
      transmutationGrimoire:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.transmutationGrimoire)||0)),
      masterContract:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.masterContract)||0)),
      overachievementMark:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.overachievementMark)||0)),
      recordHammer:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.recordHammer)||0)),
      teleportCrystal:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.teleportCrystal)||0)),
      invisibilityCape:Math.max(0,Math.floor(Number(data.inventory&&data.inventory.invisibilityCape)||0))
    },
    masterContractArmed:data.masterContractArmed===true,
    activeOverachievementMark:data.activeOverachievementMark||null,
    overachievementRolls:data.overachievementRolls||{},
    recordChallenge:data.recordChallenge||null,
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
  masterContractArmed:false,
  activeOverachievementMark:null,
  overachievementRolls:{},
  recordChallenge:null,
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
    inventory:saved.inventory||{majorElixir:0,minorElixir:0,supremeElixir:0,transmutationGrimoire:0,masterContract:0,overachievementMark:0,recordHammer:0,teleportCrystal:0,invisibilityCape:0},
    masterContractArmed:saved.masterContractArmed===true,
    activeOverachievementMark:saved.activeOverachievementMark||null,
    overachievementRolls:saved.overachievementRolls||{},
    recordChallenge:saved.recordChallenge||null,
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
  const [specialItemChoice,setSpecialItemChoice] = useState(null);
  const [contractDungeonChoice,setContractDungeonChoice] = useState(null);
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

  function tryRareDungeonKeyDrop(source="standard"){
    const drops=[
      ["key",0.01],
      ["minorElixir",0.01],
      ["transmutationGrimoire",0.01],
      ["masterContract",0.01],
      ["overachievementMark",0.01],
      ["recordHammer",source==="record"?0.25:0.01],
      ["teleportCrystal",0.01],
      ["invisibilityCape",0.01]
    ];
    let won=false;
    drops.forEach(([id,p])=>{if(Math.random()<p){won=true;if(id==="key")awardDungeonKey("rare");else awardInventoryItem(id,"rare");}});
    return won;
  }
  function tryDungeonItemDrops(){
    [["masterContract",.10],["overachievementMark",.10],["recordHammer",.10],["teleportCrystal",.10],["invisibilityCape",.10]].forEach(([id,p])=>{if(Math.random()<p)awardInventoryItem(id,"rare");});
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
      tryRareDungeonKeyDrop("record");
      const challenge=state.recordChallenge;
      if(challenge&&challenge.week===wkStr()&&challenge.questId===obj.id&&nextNumber>Number(challenge.target||0)){
        addXp(500,obj.stat,null,true);
        setState(s=>({...s,recordChallenge:null}));
        setTimeout(()=>setItemUseUp({id:"recordHammer",recordWon:true}),250);
      }
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
    if(!obj.binary&&!obj.weekly&&b>0&&prev<b*1.5&&next>=b*1.5){
      const rollKey=today+"_"+obj.id;
      if(!(state.overachievementRolls||{})[rollKey]){
        setState(s=>({...s,overachievementRolls:{...(s.overachievementRolls||{}),[rollKey]:true}}));
        if(Math.random()<0.50) awardInventoryItem("overachievementMark","rare");
      }
    }
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

  function startDungeon(id,constraint=null){
    if(state.masterContractArmed && !constraint){setContractDungeonChoice(id);return;}
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
      const expiresAt=constraint==="12h"?t+12*3600000:next7AM(t);
      const contractBoss=constraint==="rupture"?pickDungeonRuptureBoss(id):null;
      return {...s,activeDungeon:{id,runId:"dg_"+t,startedAt:t,expiresAt,completedRooms:[],completedAt:null,contractConstraint:constraint||null,contractBoss},masterContractArmed:constraint?false:s.masterContractArmed,dungeonRunDay:day,dungeonAccessOpen:false,dungeonKeyDay:null,dungeonKeyRollWon:false,lastActiveDay:day};
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
      const contractBonusPairs=ad.contractConstraint?rewards.map(r=>({stat:r.stat,xp:Math.round(r.xp*.20)})):[];
      contractBonusPairs.forEach(r=>{totalXp+=r.xp;statXp[r.stat]=(statXp[r.stat]||0)+r.xp;stats[r.stat]=getLvl(statXp[r.stat]);});
      const rewardText=rewards.map(r=>"+"+r.xp+" XP "+(STAT_LBL[r.stat]||r.stat)).join(" · ")+(ad.contractConstraint?" · CONTRAT +20 %":"");
      setTimeout(()=>{
        setDungeonUp({title:dungeon.title,short:dungeon.short,icon:dungeon.icon,color:dungeon.color,reward:rewardText});
        awardElixir("majorElixir","guaranteed");
        if(Math.random()<0.10) awardElixir("minorElixir","rare");
        if(dungeon.id==="alchemist" && Math.random()<0.25) awardInventoryItem("transmutationGrimoire","rare");
        tryDungeonItemDrops();
      },200);
      return {...s,totalXp,statXp,stats,dailyExtraXp:daily,activeDungeon:null,dungeonLog:[...(s.dungeonLog||[]),{id:dungeon.id,title:dungeon.title,stat:dungeon.stat,xp:rewards.reduce((a,r)=>a+(r.xp||0),0)+contractBonusPairs.reduce((a,r)=>a+(r.xp||0),0),completedAt,expiresAt:ad.expiresAt||completedAt+86400000}],lastActiveDay:todayStr()};
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
    const marked=state.activeOverachievementMark&&state.activeOverachievementMark.questId===obj.id&&state.activeOverachievementMark.day===today;
    return h("div",{class:"qi "+(d>=effectiveT&&effectiveT>0?"done":""),style:marked?"border-color:#a78bfa;background:rgba(124,58,237,.14);box-shadow:0 0 16px rgba(139,92,246,.42);animation:pulse 1.8s ease-in-out infinite":""},
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
      marked&&h("div",{style:"margin-top:9px;padding:9px;border-radius:9px;border:1px solid #a78bfa66;background:rgba(124,58,237,.12)"},
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:#c4b5fd;letter-spacing:.8px"},"🔸 MARQUE ACTIVE · "+Math.round((d/effectiveT)*100)+" % · bonus actuel "+((d/effectiveT)>=1.5?25:(d/effectiveT)>=1.4?20:(d/effectiveT)>=1.3?15:(d/effectiveT)>=1.2?10:(d/effectiveT)>=1.1?5:0)+" %"),
        h("button",{onClick:closeOverachievementMark,style:"width:100%;margin-top:7px;padding:8px;border-radius:7px;border:1px solid #a78bfa88;background:rgba(124,58,237,.18);color:#ddd6fe;font-family:Orbitron,sans-serif;font-size:8px;letter-spacing:1px"},"EFFACER LA MARQUE")
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
            h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin-top:4px"},"Progression "+completedRooms.length+"/"+d.rooms.length+" salles · "+fmtCD(remaining)+" restants"),
            d.contractConstraint&&h("div",{style:"font-size:9px;color:#f59e0b;font-family:Orbitron,sans-serif;letter-spacing:.8px;margin-top:5px"},"📜 CONTRAT DU MAÎTRE · "+(d.contractConstraint==="12h"?"Délai de 12 h":d.contractConstraint==="x1.5"?"Objectifs ×1,5":"Boss de rupture")+" · récompense finale +20 %")
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
              h("div",{style:"font-size:10px;color:var(--td);line-height:1.35;margin-top:2px"},d.contractConstraint==="rupture"&&boss?((d.contractBoss&&d.contractBoss.objective)||room.desc):d.contractConstraint==="x1.5"?String(room.desc).replace(/\d+(?:[.,]\d+)?/g,m=>String(Math.round(parseFloat(m.replace(",","."))*1.5*10)/10).replace(".",",")):room.desc),
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
        },"Valider la salle"),
        h("div",{style:"display:flex;gap:8px;margin-top:8px"},
          itemQty("invisibilityCape")>0&&h("button",{onClick:()=>setSpecialItemChoice({type:"cape"}),style:"flex:1;padding:9px;border-radius:8px;border:1px solid #94a3b866;background:#94a3b80d;color:#cbd5e1;font-family:Orbitron,sans-serif;font-size:8px;letter-spacing:.8px"},"👣 PASSER UNE SALLE"),
          itemQty("teleportCrystal")>0&&h("button",{onClick:()=>setSpecialItemChoice({type:"teleport"}),style:"flex:1;padding:9px;border-radius:8px;border:1px solid #60a5fa66;background:#60a5fa0d;color:#60a5fa;font-family:Orbitron,sans-serif;font-size:8px;letter-spacing:.8px"},"💠 QUITTER LE DONJON")
        )
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
  const NEW_ITEM_ICON_DATA={
    masterContract:"data:image/png;base64,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",
    overachievementMark:"data:image/png;base64,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",
    recordHammer:"data:image/png;base64,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",
    teleportCrystal:"data:image/png;base64,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",
    invisibilityCape:"data:image/png;base64,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"
  };
  function EmojiStyleItemImage(src,size){
    const s=size||40;
    return h("img",{src,width:s,height:s,alt:"",draggable:false,"aria-hidden":"true",style:"display:block;width:"+s+"px;height:"+s+"px;object-fit:contain;user-select:none;-webkit-user-drag:none"});
  }
  function FantasyItemImage(src,size,glow){
    const s=size||40;
    return h("img",{src,width:s,height:s,alt:"",draggable:false,"aria-hidden":"true",style:"display:block;width:"+s+"px;height:"+s+"px;object-fit:contain;filter:drop-shadow(0 0 5px "+(glow||"rgba(255,255,255,.18)")+");user-select:none;-webkit-user-drag:none"});
  }
  function ElixirIcon(kind,size=34){
    if(kind==="majorElixir")return EmojiStyleItemImage(MAJOR_ELIXIR_ICON_DATA,size);
    if(kind==="supremeElixir")return EmojiStyleItemImage(SUPREME_ELIXIR_ICON_DATA,size);
    return EmojiStyleItemImage(MINOR_ELIXIR_ICON_DATA,size);
  }
  const GRIMOIRE_ICON_DATA="data:image/png;base64,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";
  function GrimoireIcon(size){
    const s=size||40;
    return h("img",{src:GRIMOIRE_ICON_DATA,width:s,height:s,alt:"",draggable:false,"aria-hidden":"true",style:"display:block;width:"+s+"px;height:"+s+"px;object-fit:contain;filter:drop-shadow(0 0 5px rgba(255,174,51,.25));user-select:none;-webkit-user-drag:none"});
  }
  function InventoryItemIcon(id,size){
    if(id==="dungeonKey")return EmojiStyleItemImage(DUNGEON_KEY_ICON_DATA,size);
    if(id==="majorElixir"||id==="minorElixir"||id==="supremeElixir")return ElixirIcon(id,size);
    if(id==="transmutationGrimoire")return GrimoireIcon(size);
    if(NEW_ITEM_ICON_DATA[id])return EmojiStyleItemImage(NEW_ITEM_ICON_DATA[id],size);
    return h("span",{style:"font-size:"+size+"px;line-height:1"},INVENTORY_ITEMS[id].emoji);
  }
  const INVENTORY_ITEMS={
    dungeonKey:{name:"CLÉ DE DONJON",short:"CLÉ DE DONJON",emoji:"🗝️",action:"UTILISER",desc:"Cette clé vous permet d’entrer dans n’importe quel donjon.",obtain:["Après avoir complété la quête urgente, toutes les quêtes journalières et toutes les quêtes bonus dans la même journée (Taux : 100 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]},
    majorElixir:{name:"ÉLIXIR D’EXPÉRIENCE MAJEUR",short:"ÉLIXIR MAJEUR",emoji:"🧪",action:"CONSOMMER",pct:.20,desc:"Cet élixir vous permet de gagner 20 % d’XP en plus dans la statistique de votre choix pendant 24 h. Utilisez-le à bon escient !",obtain:["Après avoir complété un donjon avant sa rupture (Taux : 100 %)."]},
    minorElixir:{name:"ÉLIXIR D’EXPÉRIENCE MINEUR",short:"ÉLIXIR MINEUR",emoji:"🧪",action:"CONSOMMER",pct:.10,desc:"Cet élixir vous permet de gagner 10 % d’XP en plus dans la statistique de votre choix pendant 24 h. Utilisez-le à bon escient !",obtain:["Après avoir complété un donjon (Taux : 10 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]},
    supremeElixir:{name:"ÉLIXIR D’EXPÉRIENCE SUPRÊME",short:"ÉLIXIR SUPRÊME",emoji:"🧪",action:"CONSOMMER",pct:.30,desc:"Cet élixir vous permet de gagner 30 % d’XP en plus pendant 24 h. Utilisez-le à bon escient !",obtain:["En fusionnant 3 Élixirs mineurs via le [[GRIMOIRE]] Grimoire de transmutation."]},
    transmutationGrimoire:{name:"GRIMOIRE DE TRANSMUTATION",short:"GRIMOIRE",emoji:"📔",action:"TRANSMUTER",desc:"Permet de fusionner trois Élixirs mineurs pour créer un Élixir suprême.",obtain:["Après avoir terminé un Donjon de l’Alchimiste (Taux : 25 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]},
    masterContract:{name:"CONTRAT DU MAÎTRE",short:"CONTRAT DU MAÎTRE",emoji:"📜",action:"UTILISER",desc:"Au lancement du prochain donjon, choisissez une contrainte supplémentaire parmi trois. Si le donjon est terminé, la récompense finale augmente de 20 %. Contraintes : délai réduit à 12 heures, objectifs multipliés par 1,5, ou boss remplacé par un Boss de Rupture.",obtain:["Après avoir terminé un donjon (Taux : 10 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]},
    overachievementMark:{name:"MARQUE DE DÉPASSEMENT",short:"MARQUE DE DÉPASSEMENT",emoji:"🔸",action:"APPLIQUER",desc:"S’applique à une quête choisie et permet de prolonger son objectif au-delà de 100 %. À la clôture : 110 % → +5 %, 120 % → +10 %, 130 % → +15 %, 140 % → +20 %, 150 % ou plus → +25 %. Le bonus s’applique uniquement aux unités au-delà de l’objectif.",obtain:["Après avoir accompli une quête à 150 % de son objectif (Taux : 50 %).","Après avoir complété un donjon (Taux : 10 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]},
    recordHammer:{name:"MARTEAU DU RECORD",short:"MARTEAU DU RECORD",emoji:"🔨",action:"UTILISER",desc:"Permet de marquer un record comme objectif officiel de la semaine. Le battre avant la fin de semaine rapporte +500 XP. L’objet est perdu en cas d’échec.",obtain:["Après avoir complété un donjon (Taux : 10 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 25 %)."]},
    teleportCrystal:{name:"CRISTAL DE TÉLÉPORTATION",short:"CRISTAL DE TÉLÉPORTATION",emoji:"💠",action:"UTILISER",desc:"Permet de quitter un donjon en cours de route. L’XP acquise jusque-là est conservée et le donjon se referme sans rupture.",obtain:["Après avoir complété un donjon (Taux : 10 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]},
    invisibilityCape:{name:"CAPE D’INVISIBILITÉ",short:"CAPE D’INVISIBILITÉ",emoji:"👣",action:"UTILISER",desc:"Permet de passer une salle de donjon sans être vu. La salle est considérée comme terminée, sans gain d’XP.",obtain:["Après avoir complété un donjon (Taux : 10 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]}
  };
  function itemQty(id){ return id==="dungeonKey"?dungeonKeys:Math.max(0,Math.floor(Number(state.inventory&&state.inventory[id])||0)); }
  function Inventory(){
    const ids=["dungeonKey","majorElixir","minorElixir","supremeElixir","transmutationGrimoire","masterContract","overachievementMark","recordHammer","teleportCrystal","invisibilityCape"];
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
    }else if(id==="masterContract"){
      if(state.masterContractArmed){disabled=true;reason="Un Contrat du Maître est déjà préparé pour le prochain donjon.";}
      else if(activeDungeon){disabled=true;reason="Le contrat doit être utilisé avant le lancement d’un donjon.";}
    }else if(id==="overachievementMark"){
      if(state.activeOverachievementMark){disabled=true;reason="Une Marque de dépassement est déjà active.";}
    }else if(id==="recordHammer"){
      if(state.recordChallenge&&state.recordChallenge.week===wk){disabled=true;reason="Un record officiel est déjà actif cette semaine.";}
    }else if(id==="teleportCrystal"||id==="invisibilityCape"){
      if(!activeDungeon){disabled=true;reason="Aucun donjon n’est actuellement actif.";}
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
          }else if(id==="masterContract"){
            setState(s=>({...s,inventory:{...(s.inventory||{}),masterContract:Math.max(0,(Number(s.inventory&&s.inventory.masterContract)||0)-1)},masterContractArmed:true}));setItemUseUp({id});
          }else if(id==="overachievementMark"||id==="recordHammer"||id==="invisibilityCape"){
            setSpecialItemChoice({type:id});
          }else if(id==="teleportCrystal"){
            setSpecialItemChoice({type:"teleport"});
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

  function eligibleMarkQuests(){return DEFS.filter(o=>!o.binary&&!o.weekly&&o.xpPer&&((tLog[o.id]||0)>=getEffectiveTarget(o.id)));}
  function recordOptions(){return DEFS.filter(o=>!o.binary&&!o.weekly).map(o=>{let best=0;Object.values(state.dailyLog||{}).forEach(log=>{const v=Number(log&&log[o.id])||0;if(v>best)best=v;});return best>0?{obj:o,best}:null;}).filter(Boolean);}
  function closeOverachievementMark(){
    const m=state.activeOverachievementMark;if(!m)return;const obj=DEFS.find(o=>o.id===m.questId);if(!obj)return;
    const current=Number((state.dailyLog[today]||{})[obj.id])||0,target=Number(m.target)||1,ratio=current/target;
    const pct=ratio>=1.5?.25:ratio>=1.4?.20:ratio>=1.3?.15:ratio>=1.2?.10:ratio>=1.1?.05:0;
    const extra=Math.max(0,current-target);const bonus=Math.round(extra*(Number(obj.xpPer)||0)*pct);
    if(bonus>0){addXp(bonus,obj.stat,null,true);if(obj.stat2)addXp(obj.xpPer2?Math.round(extra*obj.xpPer2*pct):bonus,obj.stat2,null,true);}
    setState(s=>({...s,activeOverachievementMark:null}));setItemUseUp({id:"overachievementMark",markBonus:bonus,pct});
  }
  function SpecialItemChoiceModal(){
    if(!specialItemChoice)return null;const type=specialItemChoice.type;
    if(type==="teleport")return h("div",{class:"modal-ov"},h("div",{class:"modal",style:"max-width:390px;width:calc(100% - 28px)"},h("div",{class:"mtitle"},"QUITTER LE DONJON ?"),h("div",{style:"font-size:11px;color:var(--td);line-height:1.5"},"L’XP déjà acquise sera conservée. Le donjon se refermera sans rupture."),h("div",{style:"display:flex;gap:8px;margin-top:14px"},h("button",{onClick:()=>setSpecialItemChoice(null),style:"flex:1;padding:10px"},"Annuler"),h("button",{onClick:()=>{setState(s=>({...s,inventory:{...(s.inventory||{}),teleportCrystal:Math.max(0,(Number(s.inventory&&s.inventory.teleportCrystal)||0)-1)},activeDungeon:null}));setSpecialItemChoice(null);setItemUseUp({id:"teleportCrystal"});},style:"flex:1;padding:10px"},"Téléporter"))));
    let options=[];
    if(type==="overachievementMark")options=eligibleMarkQuests().map(obj=>({id:obj.id,label:obj.icon+" "+obj.name,obj}));
    if(type==="recordHammer")options=recordOptions().map(x=>({id:x.obj.id,label:x.obj.icon+" "+x.obj.name+" — "+fmtNum(x.best)+" "+x.obj.unit,obj:x.obj,best:x.best}));
    if(type==="invisibilityCape"||type==="cape"){const d=activeDungeon;options=d?d.rooms.slice(0,-1).map((r,i)=>!(d.completedRooms||[]).includes(i)?{id:i,label:(i+1)+". "+r.name}:null).filter(Boolean):[];}
    return h("div",{class:"modal-ov"},h("div",{class:"modal",style:"max-width:410px;width:calc(100% - 28px)"},h("div",{class:"mtitle"},type==="overachievementMark"?"CHOISIR UNE QUÊTE":type==="recordHammer"?"CHOISIR UN RECORD":"PASSER UNE SALLE"),h("div",{style:"display:flex;flex-direction:column;gap:8px;margin-top:12px"},options.map(x=>h("button",{key:x.id,onClick:()=>{
      if(type==="overachievementMark"){const target=getEffectiveTarget(x.obj.id);setState(s=>({...s,inventory:{...(s.inventory||{}),overachievementMark:Math.max(0,(Number(s.inventory&&s.inventory.overachievementMark)||0)-1)},activeOverachievementMark:{questId:x.obj.id,target,startedAt:Date.now(),day:today}}));}
      else if(type==="recordHammer"){setState(s=>({...s,inventory:{...(s.inventory||{}),recordHammer:Math.max(0,(Number(s.inventory&&s.inventory.recordHammer)||0)-1)},recordChallenge:{questId:x.obj.id,target:x.best,week:wk,startedAt:Date.now()}}));}
      else {setState(s=>{const ad=s.activeDungeon;if(!ad)return s;return {...s,inventory:{...(s.inventory||{}),invisibilityCape:Math.max(0,(Number(s.inventory&&s.inventory.invisibilityCape)||0)-1)},activeDungeon:{...ad,completedRooms:[...(ad.completedRooms||[]),Number(x.id)].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b)}};});}
      setSpecialItemChoice(null);setItemUseUp({id:type==="cape"?"invisibilityCape":type});
    },style:"padding:11px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:var(--tx);font-family:Orbitron,sans-serif;font-size:9px"},x.label))),!options.length&&h("div",{style:"font-size:11px;color:var(--td);text-align:center;padding:10px"},"Aucun choix disponible."),h("button",{onClick:()=>setSpecialItemChoice(null),style:"width:100%;margin-top:12px;padding:10px"},"Annuler")));
  }
  function ContractChoiceModal(){if(!contractDungeonChoice)return null;const choices=[["12h","Délai réduit à 12 heures"],["x1.5","Tous les objectifs ×1,5"],["rupture","Boss remplacé par un Boss de Rupture"]];return h("div",{class:"modal-ov"},h("div",{class:"modal",style:"max-width:410px;width:calc(100% - 28px)"},h("div",{class:"mtitle"},"CONTRAT DU MAÎTRE"),h("div",{style:"font-size:11px;color:var(--td);line-height:1.5;margin-bottom:12px"},"Choisissez une contrainte. La récompense finale du donjon augmentera de 20 %."),choices.map(([id,label])=>h("button",{key:id,onClick:()=>{const dg=contractDungeonChoice;setContractDungeonChoice(null);startDungeon(dg,id);},style:"width:100%;margin-top:8px;padding:11px;border-radius:9px;border:1px solid #f59e0b66;background:#f59e0b0d;color:#f59e0b;font-family:Orbitron,sans-serif;font-size:9px"},label)),h("button",{onClick:()=>setContractDungeonChoice(null),style:"width:100%;margin-top:12px;padding:10px"},"Annuler")));}

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
      itemUseUp.markBonus!=null&&h("div",{class:"rulabel",style:"margin-top:12px"},"Bonus de dépassement obtenu : +"+itemUseUp.markBonus+" XP."),
      itemUseUp.recordWon&&h("div",{class:"rulabel",style:"margin-top:12px"},"Record officiel battu : +500 XP."),
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
      h(SpecialItemChoiceModal,null),
      h(ContractChoiceModal,null),
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
