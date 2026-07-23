
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
  {id:"sleep",  name:"Dormir 8h",   unit:"h",     xpPer:18.75,daily:true, weekly:false,optional:false,stat:"Sante",         icon:"\uD83D\uDECF\uFE0F",         base:8,  fixedBase:true},
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

function buildState(){
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
const DEBT_ELIGIBLE_IDS = new Set(["sleep","push","abs","squats","negative_pullups","calves","reading"]);
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

  // Échec automatique au reset de J+2 si la dette n’est pas entièrement remboursée.
  useEffect(()=>{
    const debt=state.questDebt;
    if(!debt || debt.status!=="active") return;
    const fallbackExpiry=new Date(addDaysStr(debt.sourceDay||today,2)+"T07:00:00").getTime();
    const expiresAt=Number(debt.expiresAt)||fallbackExpiry;
    if(now<expiresAt) return;
    setState(s=>s.questDebt&&s.questDebt.status==="active"
      ? {...s,questDebt:{...s.questDebt,status:"failed",failedAt:Date.now()}}
      : s
    );
  },[now,today,state.questDebt?.status,state.questDebt?.expiresAt,state.questDebt?.sourceDay]);

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
          sourceDay:today,dueDay:addDaysStr(today,2),
          createdAt:Date.now(),
          expiresAt:new Date(addDaysStr(today,2)+"T07:00:00").getTime(),
          status:"active",
          rewards:debtRewardPairs(obj,current,target)
        },
        debtUsesByWeek:uses
      };
    });
    setConfirmDebt(null);
  }

  function repayDebtPortion(obj,val){
    const debt=state.questDebt;
    if(!debt || debt.status!=="active" || debt.id!==obj.id) return {used:0,remaining:val};
    const fallbackExpiry=new Date(addDaysStr(debt.sourceDay||today,2)+"T07:00:00").getTime();
    const expiresAt=Number(debt.expiresAt)||fallbackExpiry;
    if(Date.now()>=expiresAt) return {used:0,remaining:val};
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
        const QUICK_IDS=["sleep","push","abs","squats","negative_pullups","calves","reading","flex","balance","grips","med","water","mob"];
        const unitLabel={sleep:"h",push:obj.unit,abs:obj.unit,squats:obj.unit,negative_pullups:"rep",calves:obj.unit,reading:"min",flex:"min",balance:"min",grips:"min",med:"min",water:"verre",mob:"min"};
        const unitLabelPlural={sleep:"h",push:obj.unit==="rep"?"reps":obj.unit,abs:obj.unit==="rep"?"reps":obj.unit,squats:obj.unit==="rep"?"reps":obj.unit,negative_pullups:"reps",calves:"reps",reading:"min",flex:"min",balance:"min",grips:"min",med:"min",water:"verres",mob:"min"};
        if(QUICK_IDS.includes(obj.id)){
          const lbl=unitLabel[obj.id]||obj.unit;
          const lblPl=unitLabelPlural[obj.id]||obj.unit;
          const isWater=obj.id==="water";
          const isSleep=obj.id==="sleep";
          const quickAmount=isSleep?8:10;
          return h("div",{style:"display:flex;gap:8px;margin-top:8px"},
            h("button",{
              onClick:e=>{inputs.current[obj.id]="1";validate(obj,e);},
              style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s"
            },"+1 "+lbl+(isWater?" \uD83D\uDCA7":"")),
            !isWater&&h("button",{
              onClick:e=>{inputs.current[obj.id]=String(quickAmount);validate(obj,e);},
              style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s"
            },"+"+quickAmount+" "+lblPl)
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
            h("div",{class:"ctitle",style:"margin:0;color:"+ruptureColor},"⚠️ RUPTURE — "+d.title)
          ),
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:"+ruptureColor+";border:1px solid "+ruptureColor+"66;border-radius:999px;padding:4px 7px;white-space:nowrap;text-transform:uppercase"},rb.rarityLabel||"Rupture")
        ),
        h("div",{style:"padding:12px;border-radius:11px;border:1px solid "+ruptureColor+"55;background:"+ruptureColor+"10"},
          h("div",{style:"font-size:9px;color:"+ruptureColor+";font-family:Orbitron,sans-serif;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:5px"},"☠️ Boss de Rupture · "+fmtCD(remaining)+" restants"),
          h("div",{style:"font-size:15px;color:var(--tx);font-weight:900;line-height:1.2"},rb.name),
          h("div",{style:"font-size:11px;color:var(--td);line-height:1.45;margin-top:6px"},rb.objective),
          h("div",{style:"font-size:9px;color:"+ruptureColor+";font-family:Orbitron,sans-serif;letter-spacing:.8px;text-transform:uppercase;margin-top:9px"},
            "+1350 XP "+(STAT_LBL[d.reward.stat]||d.reward.stat)+" · +270 XP "+(STAT_LBL[d.reward.stat2]||d.reward.stat2)
          )
        ),
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

    // Sur l'accueil, un donjon en rupture doit être présenté comme tel
    // et non comme un donjon normal fraîchement ouvert.
    if(d.ruptureBoss){
      const rb=d.ruptureBoss;
      const ruptureColor=rb.rarityColor||DUNGEON_RUPTURE_RARITIES[rb.rarity]?.color||color;
      return h("div",{class:"card",style:"border-color:"+ruptureColor+"88;background:linear-gradient(135deg,"+ruptureColor+"12,rgba(255,255,255,0.025))"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px"},
          h("div",{style:"min-width:0"},
            h("div",{class:"ctitle",style:"margin:0;color:"+ruptureColor},"⚠️ RUPTURE — "+d.title)
          ),
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:"+ruptureColor+";border:1px solid "+ruptureColor+"66;border-radius:999px;padding:4px 7px;white-space:nowrap;text-transform:uppercase"},rb.rarityLabel||"Rupture")
        ),
        h("div",{style:"padding:10px;border-radius:10px;border:1px solid "+ruptureColor+"55;background:"+ruptureColor+"10"},
          h("div",{style:"font-size:8.5px;color:"+ruptureColor+";font-family:Orbitron,sans-serif;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px"},"☠️ Boss de Rupture · "+fmtCD(remaining)+" restants"),
          h("div",{style:"font-size:14px;color:var(--tx);font-weight:900;line-height:1.2"},rb.name),
          h("div",{style:"font-size:10px;color:var(--td);line-height:1.4;margin-top:5px"},rb.objective),
          h("div",{style:"font-size:8.5px;color:"+ruptureColor+";font-family:Orbitron,sans-serif;letter-spacing:.8px;text-transform:uppercase;margin-top:8px"},
            "+1350 XP "+(STAT_LBL[d.reward.stat]||d.reward.stat)+" · +270 XP "+(STAT_LBL[d.reward.stat2]||d.reward.stat2)
          )
        )
      );
    }

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
    const dueDay=debt.dueDay||addDaysStr(debt.sourceDay||today,2);
    const isLastDay=dueDay===today;
    return h("div",{class:"card",style:"border-color:"+color+"66;background:linear-gradient(135deg,"+color+"12,rgba(255,255,255,.025))"},
      h("div",{class:"ctitle",style:"color:"+color+";margin-bottom:8px"},"Dette active"),
      h("div",{style:"display:flex;align-items:center;gap:9px"},
        QuestIcon(debt.id,debt.icon,16,"min-width:24px"),
        h("div",{style:"flex:1"},
          h("div",{style:"font-size:14px;font-weight:800;color:var(--tx)"},debt.name),
          h("div",{style:"font-size:10px;color:var(--td);margin-top:3px"},isLastDay?"Dernier jour pour rembourser":"Remboursable dès maintenant")
        ),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:"+color},fmtNum(debt.paid||0)+"/"+fmtNum(debt.amount)+" "+debt.unit)
      ),
      h("div",{class:"qbar",style:"margin-top:9px"},h("div",{class:"qfill"+(pct>=100?" done":pct>0?" partial":""),style:"width:"+pct+"%"})),
      h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;margin-top:8px;letter-spacing:.7px;text-transform:uppercase"},"Échéance : reset du "+dueDay+" à 7h · priorité avant la quête du jour")
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
    invisibilityCape:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKAAAACgCAYAAACLz2ctAABtg0lEQVR42u39edxm11UdCK+9z7n3Gd+xqt4aVJNKpVmyjAd5dtnYgDEEmqGAMDQhTRiSkKZJ5wvd+Zpy8Qt0QobuTjcEAnwd0nSSdhkzpKGxAw1lwmwBxrhkWUJSSSXV9M7PdIdzzv7+OMO9T9kQzy7Jdf17XarhHZ7n7rvP3muvtTZw67p13bpuXbeuW9et69Z167p13bo+3ovCx63rU7jUrbfgk7oYQA5Ah9/LrWC8FYCfkev06dOq1+vpPL8rv+22h3lp6aheXnYD5xaz5eWu3HPPPe7ylSuWiCAidOHCBXXh/vsZF04TcF5uvYO3rk/iaD3Dp06d0WfOnOEb/q4D4BiAk+HjBIAjrY+568wZ4VOnzmjgtLrh6L513XozPvpYPXbsVP7ww3+rPnfu62x4bzqdzuKpffvvu2vP4QeKupy9gcR9UdZfAMAiriZnKrK2gqlmpHT3VyjPf/fapQ/2t68+9vvGFI8AMADcwYMv71fV02pjY2MSjuxb2fHzPAApBAEfPPjy7uXLj8zC70+euPetx5TufffqwQcPkMpf3hvs7ep8AawyQARODJwzgLMQOIhYQAQigDMljJmhKnfXi/HGo5tXH/+T6e7zP7e9/sR19LG5OFgc7urB87h8eXor/D7PM+C+ffcNmTfk6tWr0uksPXzsvrd9+fLe279iceXI7Z3BXk2qA3FOINZaa+BcReJqdtZCxMCYCs5ZOGvhnAWIHXMmSnfAOtMEjaouMR1drWdbl35/47nffff6lQu/3gPW1cG7qvHlj2wCcLcC8PPtNS8uruzrdFavX79+Oc9x9K6Hvv77V2978CsX9pxcYtWHs86JVGKrgkxdkDEVOWsgYnznpghKKegsg1IKzgpqU8HWFs75k1WYxTnthBRY9QhEXIyvmN31x37/uSd/7Senm8/+Coiun/7ar1Xnzp2ztwLw8+a6L19bW1+5du3a/nte9rVfePjkK793ad+dx4Qy2HJmpuNdNZls0Xh3A9PxNspyCmMMxBoAAiaACFBKIe/0MFhYweLSGoYLS2ClYWqDqjaw1kGYYSxgrYW14pgzYtWh2fhZ7Kx/+H+5+IF3/s8AngZOaeC8uRWAL/bQu+90fuHCuWo43HPPfa/4up88dPLU6znvwVQTW0x2+PqVZ2jj+kXMZiOIWDApELEH+UQgcCA4iDh/cjqCgKHyHhYW92LtwFGs7j0AgDGblSirGk4AYy2sNTB1BWvFZlkPSiu1deWPnr72zG985+71Z9+LU2c0zp+1n2/NyedLANKZM0Jnz5I7fPyVb3zwtd/0/1vcc+cdVTE1dT1RV5/7c3ru4odRFNtgBpgURAxqY+Cs8TWeNSAYiAggDsQExQp5ZwCd90HcgdJ9rK4dxeHj96DTG2AynmA6HqOuKxhboTYlnHVwrgaETHewoMvi2vbOcx/4m5ce/41/BxECET6fglB/PgSfiICIcPDIgz/4BW/+9u/tLRxbKGfbdjra0k8+9gi21i9Ba0bGjKocY1ZNYW0NOIFAQCQhIhwQAhAiqMViNtuEVh30+ivoL65ha/0SjBEcP/kAFhYWINbAmNJ3ytbC2RqAQMTq8fYVl3UWl5cPverflmX5qutE3w/iAuL486U5edFPQk6dOqO/7dveTEePvexfPvy27/u+rLfWqSfbbnfrsvqzPzqP6XQTeaeDsphgOt1CVU4gzoKIQEwg9jWfH/z6AtD/HUOxBrOCE4eqnKCspuj2e7BGUNWC5dV9yPMMZVXCGgNjLZwzEOczKZEia2aOVVeW1u5+jRP7kunWxV8BUQE/7pNbAfiCDr5T+vz5nzEHb7v/7Kve/ve+T/X317bY5p2dq/yn7/81ABWYFSa7G6iqEQABMYOZQ8AJ4HzG83Uf0glJ6TcEsAaxgrMGs+kI/cEinGTQWR9Ly6uwzqIqS5i6grMGEAsRAQMglRFcBcW5WVm79z5jJ7dPty/90p49d/dns40XfU34Ig7AM/zMM//GLi/f/obXfMnf+Yne0nEU4009m2zTH//erwKoAbEYb1+GuBJMBBIBwR+7ED+s8I2HNNQXIhAIEmFs+PRIQiClAXEop9voDZYg0sHy6l5kmUZZzGBtBVP745hSXAlAGTlXKdbdennviYfqettuXPnQe/fv39+fTCb1izkA+cX6us6ceQdE5J57XvmV/35h/wOd3c0rLLamP3v/r8HZKWANRtuXfSCSbwwEFgILggWRS5kuxpkAEAn1oJCP0RBDQpKO7qoosLPxFMpiC9ubW+jkGbJc+cANwLU4549jY2BNBSeCcrKlBbldO/aG7x/sOfSWq9/1XTPgDN8KwBfYdfr0O+nsWXJ3vuTLvuPY3W8+tLv1vMlyxY9f+G1Mdq9AMzAbXQeL9VlNYpYTkDi0EmD4VRrCFaEJPPI50jcnDoCFuBpKE2ajq5hNrmM82oazNTqZgsACUsO5CtZWcOEDtoSrSzhX02znCnX7a92Vgw//CM6e5TNnXtxoxYvtCCYA+sKFc7af9V9238Pf9FP5YC9gS7W98Twef/R30MkVZuMtWFuBFINiHdfkOn8qUiu9ofVviPy/FDf3WTGQRXzWtGZaMef1cPmgHg6HgDiMxzsoZxPY2BWLwInz82RnfBArkKlL0x0evK0oRnjvL/9fv+Gz4IuT2vViy4DZq1/96gxA9+j9X/qOfUceUuVs7JTWePapD4LFoK6mMGYGVnQDGir+eI21XyjyKCQfgT9mU2okaY7jBE4LIFZEKifObVXT7XVTz1BWhQgcyBowHMRZfxQ7P2GxpoazNZwt4UwFU81YEcny/ru+FcB+vIiz4IssAE/b3/u935/1s6X7Dhx/xZeWzlmd53p3dxNbm5eRKYVqNgUxR1Al3dk5fj3FoKP5FlQoHLmxNhRAbEQbm2pRrCF2hbUlU8h0BPFHtvPBKs4HsJP4ewfnHMQ6QMD1bGIHC0eOLR188Ctw9qzDqVPqVgDe9LXfaQBCe46+9PsW957Q5WREKsuxee1ZiLWonYUTAUGlcPNJzWc8AoOhAt4sodaLx3LMjP6/xfm5cPo7J3AepLYAZyLcsa5mJgYRA8QQMIQSwINQbgZcW8KRDAgxrDjOsyUMhof/NoAuzv+mBZC92DLhiyoA3/nO0w6ArOw/ecqxgjh/vG1tXgUxYOsaTAoJXQaH28mhoSA4CIT85CTWd67VkXCoDYnQMF/EoTUrcSIyE3G7THqcdXIQMawJGS600xS/p/NZ0DmBc+LhHf8d2Nka3YV9D2aDwV2dzvLxwWCwAq9FoVsBePM0UVEc1HvHO95BQOeLuwsHVmxdCSuhshhhNtmBC7AHmEEgj9uRpKOYiJpjVOAbg/B7bjUkThqckHw3EjJcbFJYM6suxLlef2Wm8wGYldSm9nNlcRCvH/EB6WJdGY5ia2GdhRMHU5dW5Yvo9PZ+M/Nkb02dPfv379fhNd8KwM/1dezYsWxpCYNer7d///79C2fPnnV79t/1+sHi/oHY2hApqsspTD0DXAVnbbucgwgnhEVaJPk0ekt/SQ2JPn4QNb+2SkASIpBiEToyWF471ustgBlUhvmyNXXImC7UjxZwntAamxNY/2FNJUo0ab24dzYzHxxkMrl6dcH4T7oVgJ/rq7O9vd0DlpaUUtXVq1cHB0+87l13vOTL/yarrrO20kyAtZUffTkLiKfRx+6WbuyCYUEBSpFW9yEIUAnFaYifkATkpQEGfSqFOGuZezt7144vdro9OOdoNhnBmgrW+J8HkdJvazjxZFcJXTGc/721U7Yi6PT33z1Y2v+ara0tAE+UOHPmRUNUUC/QhyZfWlrqOaf37+5uzaqKv/D+V//1f3347i96naOsr7OcmBVpnaEsJ7j23OOwdQFjqoD7SUhgTdqLMIo/VduaIQk1W6shofhnYQxHgaUaSArG1Fjac5s6ee8bs05/QGUxxs7WNRSzEWxVBP2Ip3pJAMEjmEgggNnXgtZRXU+gOv0jw+Xbv3Vpz91fUdXWmPe8+w8CNviCD8AXIh3LAZB+f7++fPkj68Pl277jwVd+0w+vHH4ZLl963BKEBwvLRKQ8WVTn0LqDmriV8CO8IgE4Fk84JY/1UcABJfw5YlASEIEYrwNuw3O+iyYiiIU7cvwVg/5wD4QcxqNd1FXlyQgh0MV5XYlvfgPDRgAh/+eu8kczawZTR5Tq2s7Cwh2HFw/96JWnhg+Orp79bkA4pe9bR/BnDWxRRFxdvvyRybG7v+R7XvPFf++HD9zxGrt+5SnnrFGsMopInQhBZz3o7hBKd8Gs0ktOx69EQNlDK+2mgBL0ErKjhDQlgZxFCswMCZ01BUr+8t4T+uDtLwO0RlXOMBntoK5msLb2AexcS8wUmg9xoVFyMJUf0alMgXUGiCNrC11MNlzOuTl811u/a2H/y38UIIfTp1/QdfwL6QimU6dO6YsXf8UC8uCdL/2qn7nnFf/Ft/UGa27r6tOqKksC/Gw37/ShlAKCdmNr4zLK2Q6sqdOxSk0B5xkvInO5JI7UJMEuFGrAkK3Cr/4vVeqEnQMeeu3XYGHPQYgz2Lp2GZPddVTV1E8+xPpaz9UQF4PaNZCMEyit0el2PXYYMjCxAnFOzhnOOkv1YOm2V09HV4bmj377vfv27RtOp9P6hQjPvFCO4MhqNt3h3jfe9/Jv+NnDd77uSFFOTbVzWdsw4BfnYJxFXRdg5fmcSnfQG65gZyPzQSLWH7UujtliRvONRwzCYLUBarm+0NxgjlIrwyCQYhTTCe556Euw7/C9sKZGMd7FaLSOuq4CSB1BbJuyqiANTyBgdPsDdDq9JhPH7+/8+I9UBlPt6ry3xx6844v/m+ceffevX7t27T20d+8QGxvTF1qH/EIIQDp9+p1MRFg7+ODff+DV3/zfLR64czjevm7IWc1KhzrK43zWGlTlCEox4DRYMXqDRZDKwcwwVgIILC0+HwGOwbHhIAaDWk1JCJwYMoQGdiYCaUI1G2P/bffirpe+BXVdQqzF1sZVlMUMztkUui4c8z7Y/dFvjUCrDhaX90LpjietsoeBwnQldOIG1pQglVM13eDhymEcuPNtP0pEX3741a9++tLGxq0j+NP8sy2cOHGi+9u//a/ckROv/Zcvf9N3/Le91eN6vH1VmLQiBkAOcA7GFLC29jffGSitIzAHAjDaugJTTWHr2UeR3VkYihS0KCgwFNgP5UT58VyYXDR/R1DhixADdTWbdbtLeNWbv0WRyuGcwebGZexuXoX1NCsYG3h/1nomDHwTI1bQG6xi794j0HkXEAIr7VnZzGCiG/Qo3o2BiMhWpRssHdkjpN585YPve/epU2fGFy++sFgzN3MA8tra2tKlS5f45INv+5GXvvHb/4bqrprpaIt11mHiWIMxBA6mLmFM5dkuVQmlfahABJoZ0+kYxXQLtpqCxIHEZxgtPtCUxIDzQUficxY3h2yTkgNMzQyy9WxkST/3ylPfsLe/sp+sKbG7tY6NK8+irmeQoKqzgY4vYkGsAo7IWNl7FPsOHAVnHRApKKV8s0Rqjn8o0mLcwFP6wczkxCzsvWu/iODCB37mvYuLh5fLcrd4odSDN20Anjx5Mn/22Wd31g498Hcfev1f/3uqv6+eTrYznXUIIlBBMBSRGVtXqMqZ7zZNCWKCVtrfQ6VABIx31uHqMaS2UKSb4AOHWo+T+Mhrgn13y4QUhJGmxQBZW5pasPMFb/y6A8sHjmdVMZXZaJeuPvcETDnxkw9nYOoyqOw8fmydA6sODhw8idW1wyBWUJxBae05igjlALeO/zSliYQIAikFgSWd5ba/dOgVZbW9tbvxxG+vrq4OZ7NZe25zKwA/0ey3+Za3yMrl8r4HX/et/yxfPjosxlsq0xmJc2DF8zAKBM6ZEIAF6moG5xxYZ2BiEAR53sV0NkJVTSHlDBwDL/6PfBASGIoCUZVCjSgcAtBHPLOCMRUMkX3pqa9eWD1wZ1ZMx3BVSVcuPYGy2IVzvjEydQlnKz/hIIG1Dr2FFRw6cjeWVg744FMailXQJFNEeVqhQ+AAoLfEKEGdp8nZirLeCnV6C28fbT/14cnuW/8EmGhgx90KwE/iuu++09n18+f0bSdf/y+O3feW15hyKooyBok/ppgCoVTS0UTi4KxBUUxDFqyhOINWGQSAzjwrZTKdQKoCqOtw1PqSkMjffAJAHChUbcgl4n4qhy1LcN7BQ1/41Wrl4EmajnZBxuLq5acxGW/ASQVral8WVAXERTUcsLLvMA4duRv94RKYFbLMBx+xb3DohpOTKEiiYhMkzXNBFMFxRa6eYbB0kPPe8Oj2lXM/d+bM9uT8+bNy6wj+5AKQLl48v7Ry8BV/T6i315kaea8f7oyf5WpWYMW+LnI2sZPrqkZZTGHrCgAjyzpglYHAyLoD1GUFax1cMYXydVS6oUgZ0U9NfAiG7McKzBnKYore8h58wVu/Bt29t2G2MwI5h2tXLmK8cw1OKrjaZz5rfAPibAVWOfYdOIG1A8eRdbpQSkNrX+9xIBZS0pu4Bq2U2LBTAtD9QxGPYm8TInAkprS9hbXDxhRHf/WXvvPncOYM4fz5WxnwE70uXjyvsYB8Yen+bypKe3B355oYU1K32wMRwdka4jx4m+dZY53B3qulqgvUVQEnDqQyqKwDYgWdayilUVrnqfCzERSzNxsigYqsqsREUP4IZwUQYVZMsXr4BB5445eB+ouopgXE1Lh+5SKmk004V8EZ74Tg678K1lr0Byu47ei9WN57EFplyLIMihlKKVBwOxLAM2LE+VoTaLDDVJlSojE22d+mDlmcZSYl+cL+24ty9v76V971xM2uJ7kZcUDas+fuzkbxmBJrmGFQ1xNsXH0a09EG1g7ejl5/AFPXIKsgVsM5QKDABPT6C1haWYOpClRFgbIowNkUYAbXhE5/iOHCElBVIDOGnU3gnIIxgfunFDoayCiMx8CAEGbW4LZ7HsKxh16LEg5UVDBlhetXn0Ex3Q30eoEVB+usn7qQwvLeQ9i//zg6/UUQZVDalwLMOrksiPVQkjhJuKT/NwoS68KQE62rYOoa1npmjQRJAJGCznJYa6S3dHC4uHryn0+vf+iUyDs2ic7SzVoL3owBKMc3hsUGkBXT9WneWxFrCjBrjLavoZqNsP+2Exgu7gFZi8rWCbIgxdCUYzBcQVWW2Lr+PJytUc7Gvnt0DnmusbjQhyuXMd7di9l0Q5b7wJ5lRUoD46m47QlRabKy39Gmo6ph7TLc9uAbsP+OBzEqSmgGyukU69efQ12MErnUWEFdW1gDdLtLWF07jIXlfdCq43FFFQ4c8tR8AsE5F+zbbPKcSXVtqPNMVaKcjVFVntFjbR0sPoIclCxIGKYqwZlmIeUGS0fv7a/c9VVE9FPeo/rm9CC8KSchj+CEAx7ZtLOd/9PWs1c765yzBXSnh7Ka4bmLH8ae/UexsucglMo81y+dnASlcgwWVlBVM4y3r8OUBQoBxFow9TGeGlA5xjedGuItp15Fdxxh7FtgKMywcWmHPvTYFfrdD14b/8r79ezPN5eHt7/sbRiuHcbuaBvdLMPuzi62N6/6OlMcrDGoqxpVVQJQWFi9DXtWDyDrdH0HTQqsNEhpKJWB2cND3inL07JsXXtxvPiArOsZptMJiukYZTH1qjm0JyihSiQGkQbYZ0ljHGS8Lf2lBdVbOvT26dZHfgpn3ik4S7eO4I//OicAMNp87D/lw/3XdGdpX13sSjnboU5/GSKM61eehjU19qwdgVJ50G004h6tNBYXVmCqApPxNsTWIDHYur6O1z/Yxd/9/jvw8Gtug15bADAF3Biwgv1K0X3rV/EVH/hPe7/p/U/inb9b4r2b2xhNh+iixPrGDqajHX9kinc4MHWN2lTIO30MFlbRH6yAlMcQs04XeZZD6cxPOALBwDlPvbfWH6cSaseiGGM23sFkso2yLGCdCaaYHDDJiE8G6ChAQwIKkxME8LtAb7DPAMAZvANnb9WAn9DlgDNc12f/pJxef09n6cC3zMZX7GTriiqm21hcOYK8v4jtzWsw1mHP2mHorBuG/BKKeQGzwuLiKpypUE3HuPL8VXzDF63gX/zQQxge3gMzzXDpN/4AOx/5ANRkG1CAXjuIPfc/iMVXfjlOdt6Hb+/8IRbO/7/46acewlgNYEY7icQm1sIaCxChP1xEp7cInXdAIGjdQbffR553oLVO/EHrLJwFrPNG587UqKsZppMdTEabmE12PFYptechMAGiPAvbOVhyYPK6EmLtA5L9eFACXcxJaGheAGy7m3gUd54AiM561wH6Wmepm/eGICiqyjGYNfL+AOVsinI2QZZlYGYv/HFe6O2NxS26WYYr61O89t4SP/2P7sfiwf3YeuIy/uQnfgKjDz+ClQPLWD66D3luMXnqCTzzW+dRb1/GwVe+BI4Jh/QWdp67hj941iLLLFw1gzUG1hioXKHbX0Te6SNTOTqdPgbDBfQGC+jkOZhVgFfEj+ScTT9jVcwwHm1he/MKtreuYzbd9RMTuNAdSzieC9TVFHU5Ql1NUFczmGqGshjD1JOEALDK4JyAyIrSPbZm90Pj9cfedR5QuHjR3cqAn0AnDGCwunqSNjef+LBWi9eWDz24OJvuONaOxFWYjrdhrEF/uIpiNsLV5/4cSytr6Pb6QW1WwbkahAqzGlhbMvjhv7mKpX0WG48/gT/6qXfijje+Ase/5KvByw8BuAIUH8HBjYvY+dAf44Pv/S2Y6TbueetrMHruOr7h5c/iTy9P6z/YuQ1DxRlRD53eAJ3+IjLdQ9bpo99fQKc7gM46YKU8NukMnJEEJFtjUVVTTEc7GI22UE5HsLb02KZSXp5pDKpqBmsKzxsUD1BzICdEAJoFMNUEMCXqchedwR5k3SFg/RSnKtY1gAwfGWcBXLzpRnM3YwZkANnq6m17Njcv2qV9D/1Xxx/80q/uLawSA+zntf5mmGqGshxDZRnEGExGmzDVzMsoRSCuBsHgysYE3/S6Kb75awmF7eCP/vf/gDvf/Foc/5r/CqJfBSd7gdnTsKMrcMagv0LoZ4LH/+RprOztYWnPALvPPIf9mFS//vSSo8G+bGm4jP5wBZ3OEL3BAnq9BXQ6Xd/pioTmok5NRl3VmE52sL15DZvrl7G7fR1VNQXEgdkfmXU5RVVOUJWTIKZy/phVHr8klfmMyr4eVMpjmNaUYPjMqvI+mHMhZow3n/jFerrx6xi4DJPJTek1eFNmwIWFhYXl5c5oPF5+07G73vCP9+w/gcnuNaiVQ8i7u5iOdlDOdgAm1NUM483L6HSHyPMOxjvXMZtsoNsdoNvNUVpG7sZ426sq8KCPZ8//KQbLOY6++ZUwWxa0mIOrx0GzR0HmGmS2CzvZRrevobs9XL24gbsfPADTXcLh4dXe3SsFHucF9AZL0FkPeacDpXIQOdR1CdRlGmlYcbCmQlnMMJuMURRTGFOCPJ0KCg7W1KiqKUxdQJwLrqwKirQnWwTb6DZRNnoUggi604PAwZkZGBlMXYruDbgstieT6ca7ADhcvVrgJiWq3owBmHU6K/mTTz65cP8rv+3v3nbnGzCZrFud9RVzDa0yKM7BTCimOwAEtRgUk3XUZYZOdwCiDibjbZiSMK47uGttgvsPO5hti6sffhJ3vvROYPcaSHdB4xIo/hwYPwWUU0g1RT2ZYFbMwAxMdmYgN4PudkFQOLpg8Piu+LEdE5x1EFcGooAnjtraoqymKIopynIKa4znT7OCIoJ1BlVZwNSNToSIwVolcDpNP5hTUUIS9e+BKBayYXfQQTlZB5EGs3LMpOrZ1V/CdP0xnD6tcBPvIbnpAnB19WRnff2Jy4cOv/yHD5581RscKksiypM0CZR3AFZwcJ4+NfWmj3AOti4wrqbQWQd5Z4COzlGUwLHVAstDh/HGLuxsil6PIBsXgew6HAhkJ6CqgKsK1GWBcjJBsT1CPavhFvwUlplhDWM59wZDxhg4mfkpRYRTzAx1VaGuSxhbefoVU4JePEjtx3WeVOo1K5yID/7XNJ9ueVILAA7CZEGwEQ4e1WCNzkDDlDPR+RLqenej2H7sJwGa4Ny5m7oVvtkCMFtdRbk5yr7g8D1v+/Zef5+bjq8pIgYrgeaOhxpyB9cbAmLDcSaoIaiZAuu4xmy6C3E56ipHV02grIXUBGYAxRbKjQJCARB2DlLXcKZCMStRzErsXN/CZFJjT1fD1gaVEdSVgCEQU2E63vHB4Sysi5OJOtm2ERwcHGxV+8mFtT6ImMFagzkHiWc9g5VvLgILhzwbMCj1gnZEGg0yk/8cFbypwQoqWwTrvmNWamf9qZ8pJzu/6efAZ92tAPw4r1Onzsj582er21/yNd+zcvj+fbPZlvU3TbwjPWlYZ8FKQWmNPO+CxEIpQqUyqGqCuvbzUWuMP+qqEuNZBTOaoTMYoqIM61euYbkaevA2WOvWtcWscKgKh93tKcZbBTZ2BQ8tKxSjXcx2xqjLGhNDsGJhbemnYLA+UMTCiYUzHv6xYY8cIGBmKO1p9iAVMpeGVt0AUGeBFRPZz5L2zyXLDngDo8iS5ghEh68HYtftD9R04/Hfnm586EdWVlaWtrbOTnGTr3u4mQKQz5//QTNcPvKGfYcf/KtiamfKCTMzWHHQ9HpLNCZAKwXJOiAASmdQ3AHpHFQVMHUJsAGTQ1dqXNuusXllA3vvqdEdDHHp6ctgRShLLyoS68diZeUwGtWYTmZ4/jmDrD/E0rLG1voYG1cKTC3hmXEGW09Rk4I1QWYpzgvOAwBO8I1EpjLfVISjldlT7lXWQ94ZIM/7UNpT8cF+LoyAE1pT+UB23k/GOQtml2SaSGKlSNFiYa3gSK4BGOV5PtyzZ4/b2NhwuImVcjdNAIqIEBGtHX34+xZWj3eL6aZlIvZD+YAWBUUZM0MrDeQAE6OqCawN2HRAZKG0QGc9MAuQGzy7a/Ghpy7j4bVtHDm5ive/9xl0OtvIuhrWEawjmMqiKh2KwmBrp8bmCPjytx6CKUe4fEXw/PMGkyLDR7YUxI5RusCUTjtDfCYiVk2nGljWrBistKdi5T3oTh+dvI+s04N3cKAgSveLbJyp/YowKiHWa4UpzIe8ebr/jRMLdgZCDEKtBB3XXdj/V9Rg7TVZlv3OdDrthwx4qwv+S6/TpxUx23xh75fvO/LQFztXW7FGkc7S7JOSWWTLwkoExvqVWrWxsMZBZV0MestgxajKGbie4urWAL/2kSHuWN3Anpcu4c6HjuKxR55Cf0Gh11UQAqpaMJk47O7WmNaML3z7A9i3j7B9pcDvf7BGUVTyR+t9s15o3c/FCzdDZmal/TEIFYir4YMUWHn3hCzPkedd79SQdaDDbFgkkBLIwcKvihDlAOc/30GB2DO+wZ4f6BILhuEgIHb+e1eldPr79HDl9v/y0qXf/00cPEjHVkfu4kXc4gP+ZdeZ+94pZ4V6R06+5bsXV4/3p6MNq1mHYyvqIYIgSABnBcYYVFWBKnSu4hwGi8vo9YcgEpTFFHUxhasLEDm8+0NdvGENuIOex10Pn8DCksaj77+M6+sziHVwAAxp7Dm4B296xSGs7mFsXbmG3/qDAk8/PUM/Z/cbV5d3lFJ7GXFdF4FIQ6kcKuuCVQ7FOVSWezmAzny9qpT3qAnrXYkZSukQTOKzmmlqSXJNZmVWYGchrAAriXSRcJnYrIjAiWVy5AaLh94+6e15mbl85Q8vemDf3QrAv7j10GfPsumvnPjCvQdf8qXOWkciipRONwFh0O7ih3Nw1qGua1hroXUHw8UVdLp9iBiU0wnqskBdzlAXU3Rlio9sdPGvHhngO4sNXB89hYdedxBffHwRW5szzGYGzBr9YQ9Lqwp2uo2LT1zF7//OBE8/UWJlwPh3j6+o9XKwd9A1YO6AWcMa27gcEEPrDrJOD1nWQ573oJR3YyBmRBkpcxipgQDFELKAYxB7F4bUCUdrX46sF4IQp6ALqDSEnNctCwOkyThju4P9ewd7j3/rzrMb78fp04Rz526REf6i6+TJe7PNzSdw+71f8s8PnnjtncVkRzQrBkeBtkrAbDTyrm0dul2HLO9hsLCETsc7ClRVgbKYoJjtoix2YaoJbF2gm2X48PUcWs2wUm7gycd2MSssev0Mw4UeenkH5azGxcc38Mfv38GfPDLBbKtCvwu86+Je/PHGGgZdAnGGPO8jzwc+CK0N8Ehz5GrlJZaZzsBaJ6eFBkRufhWJjUVgYAe5gXd68OQFcc4ftS3fmujt6vUqgWvIOYiIsqwPAEfHu0/+Mj74p9eBszft3rnPcQY81n3iiYV6YeHQq1YPPvQG46wDQVFQifksEN3o/U0xYuGsn5H2+j1keQ4RC1NXqKsKZVGgKKYoiokHhB1BdRaRK4JwH//2IwobU8Kb9m1gsrONx/8089w9aJhKYKoKbC06RLhkO/i5P9+HD472Y6HnvaMVZ9DZAN3uIgDCdDZCXU7hrIGxFdhoMJehFmRkRIEbGAJQHFwwglZEwQMmBKEk0Tuij380PWJiOO/fFjJisPoNGhaR5G1NztZ2uHh4bWHl3r86uko/gNOn+WbNgp/LDEiLi3KsLP+4c/yeL/uv993+mtdW0x1RzEF+Scl2GQEXM9bAWgtmhW63h7zT9ZnROtTG05vKYoqymMBWBayx6HaHGC7tgUCBXAVQjkfX9+JD1xgbRQ3nTAFTm6KsdVk5bFUKH9nt4z2X9uGXnjmMy+Ua+pkOw/8OtO4i7yyi21tE1ht4L5fQnVPQExMa4yNK4HEj8YzQjW/smxUN3vQ8lhjW440t+zbvqp8g6ngQ+3ANR7VSGiKCLF9ggTswXv/wz+NDH9rF2ZuTEv25zIC0u3vnM3n+2B3DtXu/RkwtMBWLzpDe5vh/ThL+lSkNnemwyTwY/oh3w69Mjbqu4ayDhUJ3sAdLS6t+JiHKd492FxYzPD8aysUNofeimA0zK90cXct9VHoJM3RgqYOuUhh0CcY4sDgwNFh3fMOR95BlHaisD5AKRuger6tNFdYyeLjEC+cBpaPe2JdyLrwunwXD8RpWNziPOiGaaTrMadKjcWuoBR3IBWGTtSCl2NQz21287e7FA1/wV3aJfvxm1YV8zuaEp06dYeCR+sDJt339cOXwnnKy6QSOxHkLC7/gxS9u8a7xFswEnXkBkrNei2HqAlXpFXB1VcE6AwtCt7+ClX1HkPUXoXUPeaeHTneIqqrg6ilyN6IBlegQlqual7ZGXE/KvoNeQTfrYJgRMkbA71S0f/bjM/iJhlIZ8k7f07J6iwFW8dm6DqL0uvLNkDEFTO2d8n2NJ6HmcxAhOBcbrdjtJzOQ4FNDaZ9dNNRMBIg4ChQTmiKL2sxI8wCD1WPfCmAR8k6Hm9Av5nMVgHT+N99he709h1b2n/hGghNnZwQEZRg1RbiEIjzWQ84JrLEwtkJdzVAWE5TlFFU1DeMxQb+/iNW1w+j0FsAqB+kO8nyAqrQoygqKNGAEcAokDBamjASZK0STBNgH0DpHp9vz4iLmsO0oOjH4ANDE6HZ6GAwXkef94EHowqb0CqYqUVclTPCo9p27gXHRMd+v7AJMcnhIMAsab2qf/FxrfWwzCZHomuUMHOpgfunImcJ1B4deurj/nrd7FuvNt23pcxOAZ84QiGRx3z1fNVg+cFc12/E4RlD5w/qNRhK3D4HSZkrnfMNRVQWKYhxqvjFqU8CaGnmni5U9+5F3e1DM0KSRB+ep8WgDihVQ1VBC0KRA0ESkmZBlYq0COai8j7yzgLw7RKfTR7c7BGkV6jDrPV+sn/Va8Sta87yHvDdElnf9Mhz4pUnG1jDWa3lN7SWVPhP6B0vadZ9YOHihOcVddNLgfExt0xgJ7q0uNNTh862NKkGqzVR01u8OVk5+C4BlnHnTTZcFPzcB+I53CIDB0tqJ72buiHNFSBySIAcEi9zUjDiBGAtbG9R1hSo0G2XoQk05g2LC0vIqsjwDifUvjgVaEXa2r6A2E2gxYGOgKAOJ9nUd/LTFM08IvYUV9AfL6PSGyHJPvc+ybqLYm7qAqaYw1QzOlHDOQGuFfqDoq7wLZh0PTJ+xjbfrMHUF4yyMaUqLuLBGXFzQLoF44I9a38RE5Vt7h13j7hoXlcStTU4MnKuVqQvJB/u+KF8+9EacPeuAM5/XAUjAfTmIZWX/Q1+2tPeee2xZOGqzLtsWFIQk6BFxMNbLH21dNTVW8AVkIiwsrSLLc28E5LyjqFaEcjbC5uYlMBxoVkCl+orDEhoFRgYWAltCt7OETtcfqUp1kGVd9LoDf/NdDWtLmHrmCaXBnUAEyPMeel1Pz1e6C1YaEOW1INY7Y1nrKfrO1qmrt9bAJouN6MjgAtsmTH8kYqEts6SQCb2Fh/93HJqypJWuS9fp7cmW9t79bQCysHnz8xaGYRzuZNjd5cN3f9E/W9l/z8mqGEMr7U8Rv2QocOOCT5RIoCK50GH6o6w2JWxdw4Y3emF5Fb3BAuaNnv2x9dwzj2I2W4cuSvCsDHy7lsUZAsdOBCofYLh2DCrvBss0nRxLy3ICJya4mDKYMz/tYAUKoHkkJYCoMRiPRpPh8OQEQlOzEDG45Ee/lwS9tBqOSO9qnuYGjgb5aUt071fEwTGCiDgX1r2j5fj6b5n/+B8u3kx+MfxZD/hLl8ql1ZN/ZWXt7rfWxViIhNN0UySZOEKazBd3alhr/Gah0EmCCYoZw8VlDIaL80c2gExl2N66gq3tZ6GchUwmqZhPqxZCJhQwCBlgDJgV8o5Xt2VZDqVydDpD5N1F/28AOOP8g1CXnpZlfbCw1sg7XXS7Q3Q6QyidA+Tn2hHfM9bAWOuNya1JK7p8TegCLWu+25X0YLWqOGK0KRoRRxQJHmIicACZaibdwYHBYP+93wlAbqYs+FkNwIMvf3kGILvtxOu/uTfci6qYWIDDkw64UPP4k8ilm2LF3zixBtbG6odAwuj0FjFYWPWZinTIZH7eWhuDy5ceA8FApgVgQ33Z8o5OHoDkR1q2NhBrkekMihRYZVBKI8u76PUWvYspIRiiV7CmCB1uDRLr1z2wgs4y5AEr9ONEDo2FS5Yc1taw4cGyzvpONsJP0tod5/wKMQp8SISs2QQommV3zu+go+AQ4Xt3q1BVdmH5xFf3F277MvzgDzqPC34eBeAZgC9/+SPFcOXEK/urR95ezMZOXKkhPgs4sZ47xwSHWJxbr70wFsZaGOt8cS0CJkan08fC4iryLPdzWFbJdDJTGa5deRKz2Tqy2gHTIh2zKYmkBZn+CCQQXFXBlDPvwhpJAeFY7fSG0DoPvs0+gIypYesSYmYwwYScAmdRZQpZ3g1ZkBOtTMR7wRhbB+Jp7VfLWptwPAmdcHtfcfAuSrPxpk5uMEGXxpY2eScCjNoW6C3s7yweftl3Q2QJpz/fMuCZM8BZuLVDL/kHvcHB3Ey3hBAERa1Zr7Vufn0pvObCWq/1kLAmlThDf7iALMvgeXj+mBNi5FmG6WSEq1eeQkYaMi2ghVt7gpukIbGRDLCGuBr1bOTrq8hgCTqNvNNDlvfBEtZqOQNnqkSOqE2FWmoIvJ+LYgWttPeGYZ3crjyGGIItuOZ793yTPAIj+Tb9r7VFh+Kuu9bsmKhZwOggcGITchhmxcpUM9dbOvG2xQNf8BqvlDvDnycBeFqdPfuDbjg88MaltXvebKrCQhy3lf5xZhqXBfrJkoMz1n8ELhyHOq/b6yLL87Sv16vEfNOgdIbnrzwNZy1UBVAlnjES7L8pbYWOy2DCQSaej1dOd+EA6MTE8cHJKkfeWwBx5mli4q0zxJqwhsFAjIENdRwzQWsFpTNkeQjCZMLrg9ilI9nvCEaAYeaY9+HI5QAWOJEm+GIdKBRqZgE5/+GP8LCVSSzqcoI8X1ILe+/4/wLo31BRvmgDkE6fPg1A8tVjr/i7/aVDnaoeCykdJ/Vo9hG01hG4iI+5tL0yBqzOMuSdbrpRTbdJyLMcO7tb2N66ho7KQLPai7yhGv9l+gveefZ4W1WMILYCB5eDKI1UAHq9IVh3mvVcAXCW4IRgjW8q0hyDGUorZDoPlh05EDiOLad1hMjyfEdvuJt63FgvRFgmkh48OJjEws2mz4inumj5ZsN0xLIpxqYzPPjaxUMv+QqvmPvc7pr7LHzzM3Tu3NfZXm//S1fW7vkK58SRczpaTFDahdVyvRMXsK1whERogb3DaKfTb3ZHczMp8PWa4PnnnwKRgypqoHYh+JqeN1GjwrKY5ov572WnI9TVFKwZwk2QCBHyTg/d3tDreYMFm3OSTCZd0CjH4GF4aEbpzFPxO52wtUmF7EXp5/BkW0nMbwlz4TQL5kjTiDBOODkkUPkhIHGwMCGbhvfQ2bSnztYjZtWnwcqJ7wUwAD63M+LPeADed98FDYD2HHn5P1zce7eYeiKsVMuJXrUK6WZvbzoWQ5eqtYbSjKzT8Z1o6/yIvUWWaWxvXcXu7lXkEGA8CaHnWlvZQv0WUA1OSbhxJbXlBOV0NzQiDZHUTyUUuv0hQJk3hgysFwkNhDM+EP2UI1CxghpOa+1Z07rjj/HIeg54YCMTdYHe5dI0ZN5bqMWwj3BVnBen6sKzYxA6aWdtaHYsm2LkuoP9r1o68tBpgORzuXGTP9O134ULsGqw/017j77sDSKwcE6B4trUyPrguRkn0m5ehDpKpxuY6Szt86DYxToBM0Fgcen5J6DIgiYzT1Gi1lB/7si/4RiUBloTU6Gc7HrBOPNH2WV0ugvIO/2WYaQnhvqg83pkj+8Zj+klfNLb9HqNiArm56p5mKShnUX+X9xX7G7QYzW++U1flehrcCCyQEAT/HZ2//NYsXD1DIr7Mli44weAxVWcu08+V1nwMxqAZ87cJ8A5e+C2l33/YOlot5hskIcTXGsDkEvFsyTwtUlvURNMpAIEEvh0cVUX+Y5PaYX19ecx2r3uoeJpEauipvENR1KcrRK1j99AdhACnEU1HSWTy2SPFj4nyzro9Re81a7SXjYqHrt01gQnhOCMJc1mzLRYnZtAZCZImPpEV3wJZD93A1Patbvej1XIxtWy6TkOtbRYOPI4o9cuO65nY9dfPH77ypF7z/pa8HMzI/5MgpHq/Pnzrtvd+8aj93zxP1RZ39XFSDXsjXBD4s5IaXN85wFigIJFWQvHiwxj8nNdMPDEEx+Aq8ZQ4xKYFR9jmXiDn4lQ+jnQ6oMiNMSdPhYPHvf1mbFpPOj/vc+KVVn4BygGVjrkm58/Bkh6jRFiagHJFAgEsSAV55rNnPHnm+MAIliAuHT0RtuO+N6kX4lTndi4ajFAoEz3nO4snyimuz9vy5dsR1PQF0UGPHXqDAHoHjjxmr+/sHrcVeXI+aPEJqzLBTepQAHxR1BkP7cWRTMzFHNzDKWuj+EckGU5rq1fxWS0jo4l2MksVEoWgpCBws1Nu9biopdwQ+L/vIBIoZ6OUBVTaKWTbwtaHWinM0DeHTQhl0aHvuC3pvKO9rUHmRG0vGlRYpg/R6o+4vybkNxRE9gs0gptavnPMDiuEaP5uXKCl5LzvoT3OT4ERHU5kf5gbW1l7a4fAs46nD5NL5IMeFpdvPijbrj806+77Y4v/CGV9ZwpJtq/d9JkNmogFA8ix2PRayg4LJHxbgOSCvVY+BAIigAHhyef/AConiGblkBZhGzlmwy0aiVK0jJqlYCcSAn+v303Otx3GIOlPbCmTjQoCg+AYk9oKMtpepYbR6t2FpKmUWk1CpHQGjl/MRuLhGanNQOW9D5J6t7TNvfWkR2dU+PSRUnTEvaE2gC8ewRCgYhZAJv1V++v69Hl6g/Pvx+nTytcuCAv6Ax45sw7BSDZc9urfmC4ejvqakpeCwuPgUUY38kNp2OEG5rtQbFWtBatLBLmxeKQZRmurz+H6WQLmSO4adHiiTRZL6rrRNrBCG9rQW3PBQGgIMZgOh1BmKFZp4cCsXtnRqczQJb3mmM9zh5C1+nCeM2aOu2Ki4C377+C+Fy1jIaoWQ8msWQQapUqSJvU/bEqaIvUERoXCUEYa1NYG06bSFi1QdpQUpYPaeXAQ/89hsN9n21wWn0mst/73vf1bmXljrcdvvdL/xulO8rW09BKhqdU2jWcD0puzzYjPQqtxYExiCSQMUOlbV2FJ5/+EMSW0JMSrizS9ILmji1qMl8MzFa9xEkOyf57O4FaWMby2hEwGE4kLZCmQJgg5U3Ry3KWSPPtq5nbSrJci9MeJ009l47O1M1Ss7hQWpvDqKHoS+tVUKuTpzC2oybJt3BP/0q5JXwnKBJbu85w36rUs6Oz33nPOZw6pT9bpub86a/97iMR6e65/bV/Z7B8cFiXUwIpis2ExHeR4nwzNBHp2OIm+0VzxnB2pPsQO18mXLvms1/uBJjNEk1zfshATa9B7T8OR2pr2uCPbX+TzHSCOiy/Rjt+g2MBE6PbGyDL87mU4Zz4cVzoiK3zozrnPERjQpMRGxVFDSZKUKmhSfSy9ibN1s8515TEgI6vKdSaaImXvOQhZMIIUouBc0ZJbe3y2ku+YnjgnlM4f958tsa0n+ZvcobPv+8HzcrKPW9Z2X/Pl5pqJs4aprAB0jdvlDSGFDvFWNmFLebxPWPiOX1tfOvFCVgIxta4uv6szy2TGcSY0PG1pitx3Wkb6wsLqSN5IeKR7a6bQLDFBOVsFlyvmjqRWjWeznLkeS/9WSIPiPVyUGdgjQ1kCgNrow4EQVjeNFS+Ogka4lATS8j8HL52e3khEzWlRZzsBAJCKicEILTB/Uj8MHBSB3zQwlZT1vlqd7B81y8B2JeWjryAApBOn76fIDLYc/QV7+gOD7pisuO8UMaLcCAGcd1qghzQxgTbQLQPCJeqOUrsFQhBaY3t3XVMx5vIRYDpDG32UpRJMBr6fZw6JHgC/khtFYRhKhE67NLv4vCrW4PcPAHSsSH3LBm/vTweii4RFZx1kFADmkg+vZH1QnH7O7VgIU5oX/zZ50gU4Yyn+HrQlC+JSZ6SY/P33PBpwvRGwujQka1mbmnvg4t7Trz1+0FEOHVGvYBqwFP6woV/apf3P/Bdh+/54r/mTA1bjVXipbUeKOIWpy1OANr1E5HfJhnAZpKmdkLo/ogJzzx9AXWxjbyyoGnl96VRGxOjue8Tgy6NwEItyQGGQeowfdA6CLKVvVhY3geSSIm/IS8EyKiuSlhbpdeSutZI65KIwUXBEc2N0toVQ3og2++KSGto0+5+/SPKqbP3th4Sg3EOr5bQQKlkmoSwBozEf5amzOp88Lqq3nh//egvfNgTVz9zXTF/+rLf3xIAd+0/+vD35t0FVc12PJ8jsllIkA7DgPVRmIpYsQH19yQEj/0BFI5qCfoKIX+0MWmMxlt+6sEaMiubGykyN7Lyxxc3i6cphJcEHE5Uu1pvBOjkbdHMdARjbVOHEZLWpCEEKOR5zx/rsR2OvgjiiQpOonVvGIkFEqqIaX7uoPltJoXtI7+piTmyYeC78fSztAD91JWHQPYUrki+8OzyOCv28lID5xxV1a7KesuycuDV/xTI78aZ++QzWQ9+mr7wKXXu3NfJ/sOv+q49hx44UU53rUDYI/rNuegXSkuoyyKvTVoYSHCkV6o5Q9FsQxcK3SMDG+vPgcRAGQGV1tdoDd+lhc3FQX/4e6GmjhekGgyJJxid6v1XqadjmLrprFP2aWUkANB57pnPgtREIeJy8KC7hYdmXLDRsEFH4kkH4W0gSZvamwzeEGeFIrG2qRdxA/4YMyeJNO+GtI/u0ASmhiTKAQwAkC3Gdrhy/O69d7zxh3D2rMOpUzd1ADLkN22O/J61Iy/7ZqhcbF34cGgpzjixScKRGgDWZtDvaxVPq49NW6Rl+cLdGQelGEU1xc7GFeScgWbGwyYpK3jqFiGuP4jQSXzjQ+cds6REmionRysmFSSbDFvOUJYz/4lOEjlAgga3eWi8bkRawQGhMJTwckpvMIlGhCT+9y5l76beY2IoapjOESLyzUmokcPsWiLEE7v95CcY5sEh4PwDF+n6cUrS/hBveWJrbauZWTrwwNuX97/ke3D+vMHpz4yG5FMOwFOnzjCI5NDdb/3bC/vu3lfPxkIUQoEUSAXWR9Dg+qBy6QhOxXIwZ4TyO0AEbXWcS3YXihU21i/D2gKZMFCa5MVMQlB+NbSXJYZjFy2ohVqDWw51kIpTEIcEy/gpi4IrSxTFFA7OV4ViAyAurabDW63lWQda5yGIVIt9E9ut4HrlvEbYBSIrbJCdRnFWaz4tLcZOPP4pLWlt6r6mRm6obMnwEuJNLCnoRoLSkFxjsOl1KBYCA4HA1FNFyHtLB+79x/lw9T68612fEQr/p/oF+fz5HzTd7t43Lh966K8SaSeupjiEp9SV3dBkhKM30tBjJvHZJ045WjUdPF9PMaOqZ9jevIycNGhagl18GVEH28Aq6YNUajRSBo4HXftbhKwXj2ImAuoK9Wzs3VDhBeZxnk0tsJvg939keTetUWXKwFCpsYhZx6vgTOhCvaWGhK8niIq2sFckfu2w7IakGQf6LN98/zbgTtJwGOOvsRmM+GBknEN8Xer1KfF+ELlibHtLd/TWjn7hj0JkL07fT59uaOZTCsAzZwSAdA/e+bofHCwfWa7LkeeYhICKYycbB+Kh7ZfgiSfRUkwETJ6eJNERHtICWz32p7XG1tY6yukISghS1OB24wC07G19FuQWrsYtBk0ccUUgnISgWna4KWtag3oyQl1794Xo68dxnNjg3GDO0On0oHUnjOwoicUbobkLDlc+8KxtGhJvPo7W1LhpYSXQuMBhNhxJCSErOjTQFW6AZaTFM0zrHcL3F2ntIgmS0IijikDVxdQu7LvnTcuHX/OjOPd19uTJk/lNAsOc0ufPf5vdc+CBbz9679v/BgRwplTRXsI/ha45PlOdYZOAOuUdImSdztwbF9+8Bn32jcGlZx+DrWbISgPMqnT8xtqv6RwpsVdUzCDtJkUi6MxzOCERzfHrxBpQd4D+6l5kSvkN5jckASdoWC1BgG6tQXoQZX5Lasyc0matpAelaXQIN34ezXkEChohQ0NuCP9NmJsIUSs4I9kh6UvmZApo9C7EgDOkOHf95dvuLqrJ41efffQDwCkNfHpGdZ9sBlT3YY0BHD5w4nXf0ekt5XU5poZihfRkWWeDSiyOpeIGoCYjsPaYn7QmGNGDj4ghjpBnGUajTUzGm9BEcLOiAbNJWrHbuB1EahWlDwZBARJWP4DC/jVKdCZpsa0B9kd0MUVdFf4nc9L62f13VNHNPjCes6wDrTIfZi1HAwlHrAvvR7Sgc/HX8F6lU0LcXPDFGpY5NipBKxPGlwhNi7RMMH23LgkyknbdHe6TD3ibXBm8Y0NqlKgqdjjX/Wzt0EM/qTqdLwa9z3y6MORPKgCPLR1buIBzdu/hh//B8to9XzCbjaw4y4Br6peg6ZVWfeGcP3LanEBi8isLWi6hSBmtsb2FYmxsPA84C1UaoKxbY7wm68Wj1ode+P+4a4RUc0QHTh5FkLiVOSUEX7QKtmWBelaEJExzb93cZkvygaizDDrYtEkbXY4330nTdJAknqANJkcN5tlALPEob1cH8fUj+MBQa9ZO1FrjIG1FcRtJb9myuoYcG1nrBAOIgYXQdLLlBkvHFw4cf9P/BJGF8HTw5yIA1cM7D4+UGpw6dPvrv1GrnrPVTDXpO47XGo+TRt3W8jkJT6HWeeLugVpYVuiU/Yoqxmw2xu72NWjFoLIKXd3HGEN5hkeL7dHKiHNIIc0xwUSQ1idwaE4oHtNV5Y3InUsU/HhESWujZZwuKKWQ6wxaq5aoKXFXfGC3HBkiJkqx4w+0quaFNdzGWDa0adyxWUmM56CuSw9yC6wmacGTgjmfLR94IWnAhK8h3q/R1aqY7dql/Q/dt//EG/8ZiOi0J7DSZzUAz5wROYdz+W0nv/B79hy8a3E22WiwXPgX7gLM4A0mXcuI2wddDAWlMqisM8c0pjatKehbFRO2Nq7A1FNo4yBF1TjPgxJpgT4q3FTSk8RmJDJdOHTGsf5hooYmFqcxIDBpKCdwZQHjHIi5cadvj/uI0vSCKazmyvxeY4r4J5ojMZJM43GLFl3fRVlqZD6Hh9FKQwjnsDSP46bNELFx2sPcOpID3ohAbhBqRkXNQKBdDtT+GPZMGYhUfnpTF8pUtVs68AV/o7/n/v/l3Llzn/K8+BP85NPq/Pmvd4uLd37t0fu/+B+Q1lIVI0XUlOUSFskg0dMb4dE8D1Ch1xsGsx+6QdoVbTMkzGQdnnv2MYgtoAsLLup0Qxutr78RCjGw4oqvprFIdrYePY8KodQ9M9QcO1oCjw8QUH+Azuoq8rwTOvU4UZE0tEnO92nLZdgrbE1rGBFWLaTv39IqN4TAhqKGeUY32vPg+Hqi3QfRHK+QWiOfyAtMPMsbE1cUarW1ODd8HSKGE4csW7T9xYOvnk7WL9rHfuGRT4U/+IlkQPZMZzl+4OTrfqC/tJ+mo80wNQgEZ9dgS/4mSFphIK4B3ASA0jk4yxJO1VZM+jc3zCsVYXe8gdl0G5qyBDyjdRTFyQGBw2gtTBLAHoqJYLSgBQwn9A5MGpoafz9f1isoyrwYHgq2mMGUZaoxE7FCGkEpEQdAXYUN6Jm37FVZg+gFHz9p43XxhIi+2CLNqSGNmCmNLeNIMXbfYV7eqkbDMJjn5A5owzEt0JrQZFmX4Blfu8fmhAI8Q2Cqy13uDva5I/e9/X8Yrh67F+ffZz5Zt62POwBPn34nnT1L7uCRN33jvttecm8x3nIcNZKIqn6b9l0kbz+03rikk2Dk3S6C9jC80c0GoARAez4VtjYue6i5FO90wKqp1UiFdqNlNtmq8mIN5p9uATkXBOmcNhjFTpmFoaD8/jdqBSI0pChhisofdGFWOMd9oIYBTQjruFj56UjeAVQL2piT4TXz4oiNpodVmoXVzekgNyxbokSeiA5c0Q4OLA32KXMHTJrNID7siCB1nDpZ73nopOG8Bp4jQFxNt9Dt7T++79ipXwTyE0Tvsp9MEH68n8CPPvpzDvngntvv/8qf7A73dqvZDrFSDe6cntbG3T4ew/FRj11bnneRd3rBLbS5e6kwJp9NlWaU1RRXn3sSWgQ0raCMS6wTThvGQyaAr+1UOoLbYG57GtNkyaYWDLVi+rwmuwLeu1AtLqI7WPDuCZGa1RrHJXOg6KQgrUlE8IKmVqvfCKRuYPOTtOa68ZhtEWGTsGveW4cawl9zyAoariE1ffD88TrXAzZdN3Had9yQMSLAqMjWMztYOrA37w/fvHvtsfeCPrwJiMInIO38eDIgnT79ThJxC8dOftmPrO6/e08x2RRWGcVi3NN9XDLpSXYQzqTjOAYmAX5oHy3GWlw3ieBrcoPS2NnehKtLaEee9RI75TRuiy8j7GojBULm7XWDYSXFTZux1oqySIluWRoKymc9Ym9Mmb5WaESMoJ5NYUw9T6ANv9o5cN1nP78lXUGp3C+1SW5baCECN0oo3fxsVlziTDbGqCH4Ih7I7Jsdphbn0TOA4oOAOUlE+4EPx7DcoM2O+uWIDba2t3v3hwriajUdb5uFfQ++ZO3EqXdD3G0gZT+Rk/Xj+Ien+dy5r7PLqw9864Fjr/grZTm2AlGJa2aDM5QzYeGy8a5MYpMpTgI5rYXOc3AQmCeHz+QG39xCxQrWWYx2NqCJffDZAD21HALQKuD9kZqFDKjDKE7NH3mBLcKhAYF4zbEPOA2QBkWn1fak1zlIUaA2dcOsSR7OmGNIx9mgYvZOq8ovtUngNG6A4dL0QxJ7pan7XJqkz9VvCfahcJDxXBakRNef90PkFs6aMjbaR6ybY6bHh8GlBYomWb75wDS6mo7tniOve2jv8Te9G2L34Ix83OXdf+4IVkQftoC88vgDX/3Tg9WjeTFZZyImCktlJAaea9tRuOB66prdUyJgpb2lhWr5odygB/bYmiDLNCaTHaxfeQYdADypQFbm4JqE84WspUhDUeY9AhPruSGzQlrDOI71nYJi3birJjYoWhMMr6GwuYZeWvY76qybV6pRm7VCc9MLl2jvgabfOr6lRaCN9fFHg2uEeWk6BzZPo2FJstaPgco1W5Za3XPLpF3QEEdANLcip1HUNHWpz7RIOAERWBzMwt47jzDznskv/LX/G2fOAOfPf0oBSLjvPo3r1/ThO7/0Jw/e8boHpqN1YYARhtbOBr2H8x2rcyYYiJuUtuPT5ITQ6w/9mvoAjrbFPRQmH7Ee0qxw7eozmIw3kTsCJiVYvJdKEhaFjlSBodgHn+YsdK+h4A80pLnpc1CiqWgYRFnomueLo7gAxhNoHRwDankJve6gGbS27HLnbp20slpiKvvpkHEmBWRr/tfUeYl5zXMwUZKRMrWA5Rj43DCQkptHS4gENCp9agKtkW1Swwgiak1ZmuwYZ/xzKrwGkGKCMsOVI68QyMr0F/+PX/Ft+NlP8gg+fZpx4UK1tPLA3z5w+6u/qConhlylIMbfDPF7OJx4C10X7GYR1qnG7o0CLV9rjazT8eO1FjI/dz6EY00rQlWX2N6+5gOpMGDb6vrQnnKEzg8aCtpnwdDVqjiGE52o7cytgj34P0cXBqhQSzVlUhruKzDIGLiqhKPI2m69i0TteJybjnj31sDQCUdxwkO5ZfsRUQFp09EiSdGP7VxL9NTGDzk1HZxEV8k1Njh4tR3C4gJhmYPAqKHxx312/piNpkZNHRhrQrHJgMnWU22NM3uOvvp7Vo+99h95UcUZ9ZdNS/6iDMj06KMO6B6746Vf/RP9xYNLxWSDQEQiNtGJvCGjA6wJHseR6eLmbW9B6A0WkXV6CZ5ozBXnGeMinna1vXUV6xvPoUsaauKXyyTJZEshFs3JNWVQKoeiHCo2H+GddeJa6w4icy40HUr7IzhyCpsU1hyT6bgRyKCPztKKr+eiKWbSHdNHiYWaA7QhMRD8QsOk7HUuMJ8DRtjKwJT2jUhLH0jzUxjG3EgyrJa6AXBuJj0NGE8t/H+e0NogB205a7QWafE9W/Z3TARxFRNp2106+HpR+ZVi+9/8YQCq5ePOgKdPnyYRoWP3vu1/Xdl/55Fisu583SchQzTFqTgLK9Lil7k51rN1DlneRScevaTmx+Et67RkxSgOGzvXvPjHOJBp5t6UwN+Y40LmYw2NzAPKgazZyDDj26fSLJUioRNqfkQHbqYnbVoYMVgIrixh6tqv9mrIUPO8u7mHTxJ/0Ae78k5fOmskAZHGlbYeNd21pKmSS/SuRGhoy1rjSi+OdnY6YYMxq6M1bpwDEdq4YKJySXuo0iQIoNWpBz2J87FgTQHnatTFiGEJew698n9ePvG2b/VC9zMfc26sP9a47dy5c3bP4dd944FjL397WexYOKcSpSdgdhJ1Gk48pTzqDKKOI/DdmDk0HropmFs3qC0ZFOf9+Mpi6r1eiECzCmwba7TGyYASVOKBaH9zVZyIwM9O/QbOKLNsM22agEPLGUuIvXgoHW+trZQQUOWX06Dvj7joRi/kUl0Yj89IOEim4kSeLa0cVOb8atm6Tt5/TefZCmriqJ5KZk4OzpszpGU7XvrJ4JSVwYGnGOpvEgbIopEphZ9d5o8haWlnXHy/49Jw5jAnb7Z1OmeT3odZwVoHYkWmmkqWD/J9Bx7437sqlyuPn/03wRNvzsPkhgx4sE/0LqvU4C2Hjr38JzhfYFMVTNFQKNwUl8y00dpHgfklyiG+8s4AOvebzTk4St3o2BcdolzYr7Gzs4G6mnrsr7JhjBFNeLjRFbfYz5o1FLJUC8bM1poCg0mSkoyloWop0b5zRqTuN6A0x9kyKShhcFWjLgs4eBf8VIy3buTcVvN4MjKDFQds0GdspbJUd7VZOkTtr+sa485A4fclTjs7t+AoxUmKmqY9FAkZjWERXNIMtlg50bzJNfS4YCKVjI4CtCNtiAYOBNuInXx5QbaekhLI0tpdP7P36Gv/KYhyEM/JPNs1YH7y5IF8c3Nzz4kHv+pn1449fGQ22XDMmtPkNKRwKxZiGjGLS2tMXao9Ir2pv7CCTOdBmNTKwYR5DM25yA3Atef/HFU5QW4ZamaTaLxtjeZVY77zzThHzl1k7CGY5rRxXu8aRk3JHCgGLGX+6GYdcEMd3htJSSG4J/mHLEgZ7aCPzmABWhGss6H2cy3DSZnTKXObNhZOBhcnRVGaANfqLJsmpu2Hw5i3Co4u/AlsSWO3Npngo6EZQQNJCUkSP8WqQ+Zqx5aJE0UmeUsL05qQJLFUkxjIOQfWXTfcc+x1QnLvbPuZXwJRHd/oFIAnT57UTzzxRLH/yMM/evsDX/FFRTGxgFNtzzvPMzNpJ63YOO3wzOdY/3lGiEOnu4DeYNiIwVPydXPZMqZzUgplNcO1q0+BAejCQVUyV+jGMRkzhWM3R6Zy5KoDzXlj1gjAxgBs2+SCAtCskJHPmBnn0Jy3ph9znkYJLPdNqoHtZsiGi8i1hjGmgTzm+bTzHf4NlhofvYQwzpbdDSOy1uTnBnpMG1biFh7pu995xkssXaSdXUMT4UTmXwPdALtQElHPYZ40d4whlQLRQZa8cJ5IHJNoM1g59gDIPTDdfvY9IJ4BQjEA1ebmZj0c3vbVJ17ylf9QdRdMXU11UJ6mIHGuLaAxCRWPsIsXtfgOj1hjYWmvr/1ALdpCizFE88IZzjLsbF/F7vY1ZKyhxgba0kcNLBUhHS2KM2TcQcYdP3pjBjmKJrhhCbRpdokI/AFNfhdcpnzwKWrA6PZ8It2M6FgvFibT4OECup2OX6CYLDpujLV5elRbMhmxwXhqNBuiWm9Qy8GjFQMt88mWu2qLBdT++0izAhFcC2v1DmPSmuq07D5wg7tYq9tNfovSmlknJKo9N+YG1CaGOMMMZQYrt9/nwK+fbT/9CwDN2NOszgiAY0fufus/6S/fJrPdDeV/IAOSxuY/Zr5m522z+9a6uqHdi0Wvt4Qs6zTvnrSyXZpHAuQoFM4EOIfx7iY0BLoWKNtC3ZMtBQU2DCfzIRWF3EwgF32jufkc4aa2Y+ULewl0q8h8IYYSBR2xRPZ/TlDB0cuP7Vg8I9tUZXLA95syEXiCTffYOH1Rwz1M89tQfyoNpZoSBXFufcNCQr/Iu7UDrpWhKO6Ra4Z6DUYYO2L2HttEcb9JeC8iMhHq/LYjGWT+QUmzaicBAXGNwjFOddLotU4fznhCa10X2tRlve/o616/fPi1/wqQTJ0+fZp/7Md+zB2/523/aP/RV39RMdu2gKi4oVHCClW/r60OgVilNaM2BBwC8CzOgbMOFpf3NwVwNMFBY9AjbThABEopFNUM61eehIaACwdduwZnixA0txgvpJBxB7nOoVUODd1yKhU4hLUEaMZmLH70ppX2mZMyaMpCN9048LsEttu0KtUjeAaWDGTYR2cw9N31DaO1eXPItqPaPBIhwb1Ukk7ENg3GvBxpziua0RrBibfr4CDbFGmkAW3FW5PWWlRbaZxkpWU9Mm92Lg0jBy2tTsv+U6KarwXg++QbDNxdoHl5GxDFwqbTX33A1puPqgsXLsjS6t1//ehdX/IOBxJnCu0xIu9PECM8Bl/a7BjUU5H97Os+wDqHhcU19PqLYfLAzajyBpV/I1X1Abi1cw3jravIhcEzG6Yf1KpzVMpuAPk9vqqHXPlA4sCKlqDDda0aMBadTBQajxwZhdpPaWhWfjFNMGITadWPYe4dBfIiFrbbgx70fR1oTeuobOqjmMiaJTwyh6t5/VYY9KPBVedZ0JIUeNSe0FLjfsOJ2R3wTG7IFj4oW0456aFHmtsJ2k+M3ODYJa0RXWu2TJEX0jCpk5ilVRxSKjMkQGICsZWQysia0bMaAK8dffnfyvr7VDG5Ypl1egopajxCuo0mNjaAzi7R7l3QrjjkWQ+D4Yp/wdxaQNPo1dM2cfJ2K/5XWEx2N/xJUDuQCbtxSRLd3v82OInGLph9BlPJz4XAZOEo+vz5mxJao+QZ449jTp4rilWqsRCmJFGk5BwDqRZWYGuAskRVV+h1OilD3PhQxTGZiMwFYXQnIAYo02BXg0RBuQzWGIBsSx/cXlgdI9oFw/EwY3E2wDn+wzkALA0ZPxiTiwssakQM01Pe/E9mQU6Fk8OmolOEW9KnlsAq3VZ/QjpCsDjh1GiKa1ZaSCgTCBYgJXY6g7XFhgawPx+sLlpbIfGG0+qoMI6JuJ84v8hFJLBlHaLwLZ4zw6V9XmgULGKlZVPWeGkHiCFkT6UUimKC6WwETQSuJbTzas7+giWwfoWa7pU0OIzfKOzsMq7FLYwi9PCVOCy6ZvZfx3vDBJs25jCLdWELEjcyyVB8u2gOXpYwVQHrBgEbdSEzS6uLbW08d+0O2P8zX78SnFJQjiGsobIMpjIpGbkbmoDGZ0jA4psjBwWG9epK8tiac0HlR5zGbxQIF44JWjEsRb1KYKSzBZGCs545Ho/bxl0sbizlFkNHIMwtB9c4vw4LusOTFh9AUoxqNiVjplTPRpc1gHVTVuti3UkRJ+IoYWaxo3VivMt62sIoLVuz4GRqHfLOAP2FlRbNp0H2E9Ml1gutrpGZMZ3swpnSD/2tCST7lmww1jbwx4pWKmg5Mujgw6KIEihKQOOHF7CxCCin6UkQdXMY38H5J9xGMVPUGHNj6h8tz1Rl4OoK1lkopcIpIC144kZX+4AoRHUcE8gpELlGuccOWmVwVMO5qhmbpedIgsF5ANHi8UYB22UCiQEpv7VdhH0Gi7tHXOPAED1zKGpCYMOKXJ8trTSzc2qth5hbexEyLLe3W8GFMaXEZA0h6zXVSqEqRs7Uhq2ZXhyNL/1HBlCPtp40VbkrQJDkOdd0tCbgfmj22iKq99FsdAQIi8t7/YxTmjrASZwxorUFslUTkdeijsfbocRiz/tr63gleDpTpFL5DlZT5qcekQEjCiyqEZrPbcKMO0BCVghf0y+SptaiQH88srSB1lgbtuCfWoDam05yqLPadWB7Cye1KV6C1kjQs3PiMkPWvkPVeR6MltCiRM1RS1ubl9wcS6X572A6FAww2bPoAxzGic9HKtaNDVub2J8QHqx2N+CWcxTauVD8KE1PALojydVWBarZSEBCs+Lqj6IonmUAKCaX/uPu7vNknfUvNbT6LgShGB+IAht2j4VV8C7Stg06vQH6wyVP3UEy+EuwRDiI0wxZ4pJBMMq6xHS6C00KqgaUbVB8hF0a1HK8YlFQyDx+F5oJxb4OjBy6WKVTi7URR3CRwtV2RIhKt0gVY6ZETGjcgVqZ0QIoKtTWJOpTQ0poGg9qifGiAHxOVB9gEaWDIi+M6FjnEMyzsj17/0abjXbvMB+YftoSnPEDdueRBECFLlkx+yBkSn+GKNLnFiba0i67NN9uiBFRSCW22f0Xbexi8VBPR451V5Xlzoem1x/7ccQ5zmzn+k+NN5/aLaZjiDixtg4M5wriat8NWuN/L95mwwYWdHQwHSzsBUiF0VTUNtgEZDfe7dIsc4EnK0ymO6hNiYwUuLatPRZxpHQD7Z40NGfQ5CcgGWeBgqVDBuS0T0RaLgOx5krmmdFVNfnCUGu3R+MnzdHR30UcUvu/LWu4uk5UfBcF4NLGdgXtVNwU8dQyEOKGvcLeU1GpzDcOkczVBu3nsp8kulky9YwLCueaRTfnqkocvge1GOHMUIqhNAe0gFtQjLRMLaUxQ4JAyKZRJFryT4kODcQwZQEhLdbUdbVz8X8AMPL35MwZns02nq+K9Z+YjDe4KkrLAFztg9AaE+j1cSN42MIdJiGmLpHnA/QGQxhTJQgjzUZdK1lLc1NSJoTDeLLtSZ+GwKbBvmK3ymjYy0QMrXSYgMQO2Ge/+G/bIPQ8DtYAGUxzKoqkoYg6isZBIVLI4mzWf31NGbLSwVYVjDUtwXewonSNW1WzD1gaE8po0pkwwujQqvxcOgDUzVrbNk2+jSXapGCVePSGjERzVnhokImQaYk1WHegdAZWypMkVNDDBNETq7ZAXT5aTDVnKdcyFo01ICnYqoapa0OZUuXo0j+cjS//fJBwOoXz5xmAknr7cZWvfK2lwVKmNUQs+QbEJpp99JCLY7cIwaysHoLKuxBr/RZ5tJ2dbrDDkcaSIk4/1jeeBVmHrARUGbrJFkePwpSCoKA4R8499HQPOXfR4S40Z0nlJuJgwv8sTJN5CUl4pNgL0TVnYRmhbrxVwijL164hiyBOIVzraPWdpR12oAYDaNZwxjVLFqNVGsm8n3Sa99LcmtiGs+PmFGnSYFdztXVb38HzQuHGEaH10FJsUlgnfTKH1WDJ0iORRKjVzTdrH+ZkrjfYzbVloFF0r4ggUsOWE6O6PV1Mnv218fqjfxM4I8CPJeWSXlhYWKrK8snZ6Kn/tiqu0s54HPF5n/mkHXhNhjOmRt7pozdY8D56c87smB9mSsufKaRvpQhlNUFdTb15Wm1ba0WbYbEHD7zoSCMP8Iv/YFHpWBFqzMWbEWz0x2/Zt7RMyJGUZSHgY9MTrNyYVYId2l7NAIGNgKYlrKkb35XWioXU7bdrNjS2HtImgYZulOMPKQTFClop0A2bkRrpqp8uuOi2n0gNrqWuQyAGWzjra7S4BIiZQuYLbvs6cCq1P56T0afKk+sDbgDJPYTT2koK8f1BWKNmyrHVnb42xeYjoysf/CaAKuBsqo4YQDUajYqV1dXFydbFf19sP/mvTbmjRju7xonDPKMOje9yuAnD5TWQysOTyMn8MQ23o4PAnPrZ11iKFSbT3TDKA8i0wdq2s0HoFMlTp/zoLNCoFM35NdtA2JS4qhU2EGSDaXicK4fXEWHWZH+G1tpUavsMctqWlIgADsCsgimL0HChxauTeVsNam/HdI0rQXshkTQb5ElxcB0OP0+7Aw34X2JKx6CDnWsInMhcwojToTnWpiAdvcQKpHw9yMpvp1ccj+ZszsBTUlPUAt6Tc4JX/9lyZlQ2UFW9/cz42ge/CaBrwS9EbuQD1rPZzABnqJz93K9mWedVrPt3mrqulVJKiJPdl3+/GFYc8nyI1X3Hk8MBtXZnNEY5lJahNBz8xiRnY+s5mHqGrGZkhQsjJKR5pp9GeIJpRjly1UOXe+jobsAAs9REeCJEhdpVMKhgpPYYZnSnIoChoLmDjHNkLTJC2qeUeHgOVjxr2cHOaXTbhvuOBdVCjk6357mSzrb29raynjSnQ9vISdAWubvWv2nR42/QC8/pQ1q8ykZG0FLQJdnljSIpumH3nLTygwoE4oYdREqlExAtsgNTc0xLi+ZkTWk562pb7z67u/7o19flzgdCvLm/SJQkYWN2XUyu/qrO8pdwZ3CXMcbBOSEicsntk2GdYHnvEfT6y3Cmbl5QS+eR9LuJd8UpMIk1jKmxsX4J5Bx0AejKpq9Dc0tZ/Ngt4xwd1UWHO57/p3JkpMOc0pcLRmpU4oPPSOWza+z+oKBJI6O8CUD2kkwIpzWx8eeV4Gs4Vwe2j00ILAH1QEN1u9Cs0lz4RsHOnKA8OH/N8/oE0mKIpwO3ZW7OyT4iHNk0ryeOovtIk2rvFp6zwIvqwGZBX8ICQeTFZraGsRWMrYLDrWeASzhe5526XHi4OQwvKqvyrrJ2/PRs49Gvq2abvx9izf7nNCFR/XN959oHv2poqx/v9m/7LylfAjljKdwl6xyyThcLiyseiqF5HCoNvF3jdhCXRUdZALPCtJjAmtKP34xt3nxq/ShxukDNaMnfRIaSDFHN6xsfaqSMqcuUZt6bBOzeiCg94RKqOombOu2c8VE0O4c0th4IS2OUdaCqRm0rZCpvGtbW4h3BDRYkNzQmQs0CHQnCLysqOMQ6KKUAyWDDJMIa/+fJCCSAvb5OcyDrSw3XWu/KobnwTTLBugDqK4+ZVvUMs+kYVTmFqfyDS3N8HD9dIWaIca3Zt4SxqgCo4Jw1Kh9oV+9eGG19+Ovq2daHvKf0efOxBHAfQ5SE0KLRbLzx2LeiLH4+G+7/x/lg312+a7XGGqsWVg4SK0ZVlqELaz2VgjnVPW5gDHtTb8G02AXIQVvlbyS1MF8iCDcLrxD8lYUshIMIRxEp4rTmQGASiC7SWg2WaOgcBOvB2JE59CLSmBnJvDkpx9fjorCpWU7tLTsEVBlPTMiDn2GQF8xPg1uz8WRWiWQwnrJfsFVTFGasosKw3/mgEz+ycy7o6MRTLKi9AqO9tTE23M7/7BCCDa+LmVBMx5iMtqSY7jorznvssFJhrD5H6BZnvY5l3t0m0PQtIGJ0NtB1tf1Hs80n/ou62HrWZ76PHXz/eWcEnOGq+sVHi/Fz72RyCyS4jZRe0iqj1b2HGyZGu02RG13hZY5LFoFeB4ftzUuQqoCqCWpqgoNCgISZHItyHgNl8mU3Ue0slc5Q6UoqXY3KVVbIOWEBwZFxJSpXtrQgknA9HbrneAQrZAGK4KaOiW4IyfMw6kokFfBt5RgEsAow/Q7ybhcMwFrTWuvb1HLU+iSZY0jLnPW93Hgcyzyvtz1nb8/j20TfRMJo6YcpakuYYU2Fne0rbmfritR1wcTMEMMQy85WqOupGDMlV8/gbOEnXAQorf3DzS1uoTjHlAmrTBXTq7+8c/WPTxtTXA6LDu2n4A1zXkKWHFWzrV921XPvhqk+0l9Ye2hp7/FFU82kmZa3vEfko/zGmjrHObAiVPUU2+uXgum4daoSIZAQgZXKiaEYynFNBdWYmRLTaio75Vi2zRhbZiQbsiubauR2edds86SaUo3KshIIOapdPbf+KgLXGXWRqY6fJassdLfRXb6pzYJzc5rYONi0wckTHpBMIR0L6n4G3e0iY4ZzJuF/Nxi/3OAHMz9jTf8lbk4nHcFdkoZNQy0D/uTykKimzaJraulJYlNSznYx2rlmjS2Vt/kpR64a/1g1vfzP63L8YefsGwFHcFYauxnnhf86D09JAKwITumuEjuj2fjS/zje+PB3hSkHAxf+s66p+uPwjgmP2ct1Wf3RU2V56d2rR177/QL25MkES2DOaQnttfORpBhThwPK6S6MmXmwEpZJ++K+pqJ2kGdF6sdLN3vcuvEfOJQXi6LcBuopcigIMoju5tw72FFLr8vV4rGc+2/syZ5Dg3oZQwysIqUEApdYHOzJCqH+U0o1I7lwlKVxU2LWiecESFR6NTddWr4quhao0sLWNdDJW0efa29pmB/St9jT1E5mMm8e1JYjRHDes2oUOOo66AYjopbO1xGCShqAtSinO2JtRaRZuWr0TFlt/m/F1qWfBXA5fIl3dbv7npBs6V+y0j0/TgUplYN0BmeMr5aZLbPWIKfK2fVny9HT319MNv5tcpi6odv9ZAOwZc/5iIWA1dJt9+b91TVnaxEKfW6Liena6mxqP72S5JdCgnI2AokVJi2z8sq7KjN9jyO6YmX38rSeXgVw9WN1TajifxhUGKHC6D+EP7h9cfH4K8du6YdndOyOJVq1moiFhDjMj1WgXTFTGsdya2JBoch3oa5hZrBTrZGcnx44MY07FAlIbBKsu45OGByhNY5Ds/E8CYPaGwMC+Reh06bkutCYUQp7cgTDQyJgTloQihhnstkIFbAjiCKQLVGbyrLSypGVarL+rycbj78DwDPBfp6Bs56cUlz/PzIGgZd/hgiGAVLMIOcYYGKdE8Hpqtq4Xs2uv3O69eSP+K9zhpORzaffpPwMAefdcPGOQ/2Fg9/YzQY5SKhtD5Y8TZBEUY1oJhxpHOqi7c3LYmtLJGZnd+vPvrJ0k/dVdvx47eorPoWfZmDSAXYEmHMso/k9BacU8DABFzbLcvtDk+rqvxHtFiHdV3VoSJrYKmLSKiOtIpCtA4dQJdAZMi8biLWTwDXLdRB2eSRIxrN9rBiYzML0GVmWe35cy/uFWtJK79QVFlfHo3xuj9781CQ2Fb5ZCcd/1JKERiI5r7a00wkGUwxxtThTO6U6qiw3ni22nvg7s93n/vnKyomq03H9siwpNApR2K1dPf1jlS0MVdZ/vcp6rFSXxTlytq5tuflkObv8L0bXP/S9dbH1swB2QrPxCRuV64//n3qbrXp0RU+3r2fdfFk6/Q45a0PhTO29UHOiZn92OTjn97FZW8KUM2idoZrt7ACogVf3gN8jAMZ/nLMfMwPeOIhsXjQDL1fAcLw1Pf+3rC6et/no76/mRxd63AeErDjDTikIaxJ2gSjZgLaJSpVMMF3gEEZPGQHIwooVgXUQBwsDJxVRoUBFza5XQXMWsDFu7eBIYEaCLiha+LZfGLUf2IBLOv/EuXAEO5ag1PP/SoFhA+CeBEIRgKkKD7gwqenomfcWuxf++7rGn3c6iweq6uruZDIZAShvKNotAFWOL/59xqE/Fzd4q8FWIVX5iKmm/7Guty4D2IhWLsA595fcq09XAHp6bEH0p8Xk8m+NdpbfCqya7mBBG2MCRadRubX1EXHmCvYO8tVsF47gMmYFFO8BsA78rjQmJZ/U5YBHHAB9DMe6F83FH9o16+8psPHfLeeHvnBZHV7WWICTWoyFI6+KZkIWHQb98RYMJT35gEFiwxzZj0F8chS2sAoi4VhXEHGoa4u6rpF1g+WGoOUAFhZ1SwNyy5xjlScykPO9NidvFkmkTkq+0r62pVhqKRXGcdbT9AML2trSMinl7NQVu5f+yWz32X+8sLBAnY7o8Xj3UlmCQ/C5j/GAWwCYjZ//cQA//lEACd6o/cN/zn4K9+wT3BNyFgycn0k9ugrunbbQGQiu0x1wtJzADWdlOyFSaOPH4y2U010hBpezjX9tiu3fB37z07UAz+1gx3jw84lLk/r6O3fts79cSjEt7eQwyAzArFlyVshJU9fllEvGHadVLkyZMGnRnIuClrD0WgTENUqeyBZtmyvTnfrSf5i4rX9byu5G5UZ7pnZjYnpZT3UXuNPNYUN2Sou0w7QlLRUh+mjHBDcPX30Um6gNYLddxSTgjpEETAJra0ucKVPvjsrdi99RjJ//Z3v23K17veerzc1q7E8d1B+HobjyZc5xBi62SqGL7hMxI/9LsL5PKmht1j30DcO9d/xUp7826PUHdri0l7XqUlrJisadPaHlkOB8+jQm4y2nMOOd9Q/+tXq6+TMhGxt8ei8GTlPrKT2+0j14uMcL37KQHT3e5f6rFtT+paFexkAtoauHUJSDANSuQmlHmJhdjKoNjOXaUzvmyqM75spvju3W/1PXk4+ElogA3A7ALd/28P+zeuCl9wyGCw4QNpWb377Z5rS0arwoMndts3LyIpQoaXStdap+JusdKWrj97mJ9cQLa0oQrAPlbKrtj5S7F/9GUWy/D3h5BjxS4ya79CfxORY4pevi/L+fXp9t0erJ/03k4MlyVthBf5G6C4vMrAKK236Og3hJHGpTiNYZSzneravdCx9d133aLgecC4F4ignve3qruPz0Fi7/J+AjAPDqAdZODLK91FHZcQjfq8G3+2RkHnWOPjhz0ytjd4UK7L4fwBMtNh4Bb9KC37QM9aTAgVz5TnH2B5zAaaWZuG7ZwYRR2Ufpg2V+EpJQBUojNOt3cwRpZcAqA21NaYYzBOGEUjs4YlNv/NbO7p99Cwpc9Pf55gu+TzYA4TumU7osz7+nvPyHb17a/+AP6e7+bzZVxZPJtukNF7nXH7LWHf8gO0mERluXcKYSIk0G5nkY80Ta/PKZuxxw3sVG9zROEwCcw7nfm+Da703qa/4w8tm9Fx6G6Q0oMk7ja9U5AMC5WK8a30OvLgKb09q6PzJ1AWsBHTYBzHkgtvcoo/FlcW3vxQABSWtsx2A/lozjRXKeuh/1JeyiaZQwZ6jK2VO71//sGwA8/xk6WT5t16ewaO6iHxyCdsrJ1V8AykchchcxHaqKgsrZyBpX+3mt9owVrRXGk21MR1uilKZ6tvFkObnyv+LMGcb58/JZes1yARfkAi5EnzoGTvNp3M/7sI8exj+p78dp08OTagUr+jqOMnCZAeACLjj4z2v/rL1er7eysjIz053Z8U5/7a9mvVXRmlmsmeP9UfJ3brGg5tZo0xyDpvHrCw2xkzR9acAFh7ouYaoZnDVG6Z62Zvcj5eTqj+P0acGFCxY38UWfhq/BwBkAZx2AvcPl278z7699G+fLdwA5FLPL8o7ovENKa55MtlHPxi7LFEZbf/7Lk83HvyK08jf1G/WXXIN+v7/AvGTG48vDfUff8H8v7nvw/l6v60QMO2OadbTSrPNKjD6RRIFv+0F7qxPbqM3STDko3myFuixQVVNYUwjAllWm62LjUjF+9q+Vk2u/gY/ewfRiyoBzPMIwM6ZxVWz91mz03C8weF1g9wFYc86oupzRbLZrYSqnFDuxpS4mz/+Pphp/ALjAN/sb9Zc8wNzv1xAZqqoaP593Ft/SGey5V+vcKiaODloEumEe3IzOhD32GEX0DUdaErjPQU4pzqKuCpTFBKaeCmCt0pmCGC4n1351d+fJb7TF1h/OsUxf5AF4A43rlAZd3KqKzd8qx8/9PKj6PWcLC7gMcGvMisUaNZ1efdds++l/9HFCATdzANqyRF1VYwvAaJ25rLf21Trvs9aaonMW3eAs2VDV2m4DNwqZIkPbwUmNsphiNt1FVYwcnHOsMgbAdbH99Gz03NnJ9uP/H9jqSqj77AvlDfwMfd1TN/LADnUXD7457+5ZMOW0mO48+X8BmOHFccXxoF3prhztHHj5R4Z7b+90uz1YE7G5lsVPa3l03AuSOuIWcOqsQVVNURUT1NXMOWvEk0g7SlwNU+9crMv1nx1tPPHTAJ5qEQHsC+mN+yzcmDMSasSP9ffy4glCEkDW9h58+HcW9993R6839Gb5EjxhwpbPRLmK1KkopBILV9eo6gplOYWpCnGmdmASVlozAOdKmGr0p2Wx9X9OZ0/8OxR4tnWauRfa+6k/w18/jHTOtoLxdPirc+5FFHzhtf4AA2evCeMXram+z4lYneXaWRvoUxw90MM+vQrWVDCVbybqcibWFM46JyAoRZpYa+Wkgq0mT5TV7qOVGf27YuvirwG47t/Sr1UeFsILsonTn90bBBuA4RfpdYEAoNi98sf5cA3a9MTLJSzECYkTWFeLNTWMKcWaCs5UYm3l7dCYFDEpzQrOlpWtRptVXZ131favTkfP/jqQsh0CciAvYPTgs3IEfx5eZxg421k+9LJ394cn3gYoCIyI814LEMsQ8usyIh/R1XC2RFVNRnDuN009vmpn2784nV59BJ4X6VpBRyHbvShOj1sB+Jl5TwXAwaV99/1Pnf6BV4i4IwDygPOVAF+2YrYhE7LleMcJfs45+2g1urhe1/WfzAfX6YBUnPuEiJ63AvBWEMYgOpD3F75ASTYUEV0rdz2f7FyYAevh76v5Tz2tgCcZeEReTJnu1vXZv7jJXn9paUzh38W15593T+qt6zMeiKCP0ZDJDb+/dd26bl23rlvXrevWdev6bF3/f2rqW/7VlVvaAAAAAElFTkSuQmCC"
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
    return h("img",{src:GRIMOIRE_ICON_DATA,width:s,height:s,alt:"",draggable:false,"aria-hidden":"true",style:"display:block;width:"+s+"px;height:"+s+"px;object-fit:contain;user-select:none;-webkit-user-drag:none"});
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
    supremeElixir:{name:"ÉLIXIR D’EXPÉRIENCE SUPRÊME",short:"ÉLIXIR SUPRÊME",emoji:"🧪",action:"CONSOMMER",pct:.30,desc:"Cet élixir vous permet de gagner 30 % d’XP en plus pendant 24 h. Utilisez-le à bon escient !",obtain:["En fusionnant 3 Élixirs mineurs via le Grimoire de transmutation."]},
    transmutationGrimoire:{name:"GRIMOIRE DE TRANSMUTATION",short:"GRIMOIRE",emoji:"📔",action:"TRANSMUTER",desc:"Permet de fusionner trois Élixirs mineurs pour créer un Élixir suprême.",obtain:["Après avoir terminé un Donjon de l’Alchimiste (Taux : 25 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]},
    masterContract:{name:"CONTRAT DU MAÎTRE",short:"CONTRAT DU MAÎTRE",emoji:"📜",action:"UTILISER",desc:"Au lancement du prochain donjon, choisissez une contrainte supplémentaire parmi trois. Si le donjon est terminé, la récompense finale augmente de 20 %. Contraintes : délai réduit à 12 heures, objectifs multipliés par 1,5, ou boss remplacé par un Boss de Rupture.",obtain:["Après avoir terminé un donjon (Taux : 10 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]},
    overachievementMark:{name:"MARQUE DE DÉPASSEMENT",short:"MARQUE DE DÉPASSEMENT",emoji:"🔸",action:"APPLIQUER",desc:"S’applique à une quête choisie et permet de prolonger son objectif au-delà de 100 %. À la clôture : 110 % → +5 %, 120 % → +10 %, 130 % → +15 %, 140 % → +20 %, 150 % ou plus → +25 %. Le bonus s’applique uniquement aux unités au-delà de l’objectif.",obtain:["Après avoir accompli une quête à 150 % de son objectif (Taux : 50 %).","Après avoir complété un donjon (Taux : 10 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]},
    recordHammer:{name:"MARTEAU DU RECORD",short:"MARTEAU DU RECORD",emoji:"🔨",action:"UTILISER",desc:"Permet de marquer un record comme objectif officiel de la semaine. Le battre avant la fin de semaine rapporte +500 XP. L’objet est perdu en cas d’échec.",obtain:["Après avoir complété un donjon (Taux : 10 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 25 %)."]},
    teleportCrystal:{name:"CRISTAL DE TÉLÉPORTATION",short:"CRISTAL DE TÉLÉPORTATION",emoji:"💠",action:"UTILISER",desc:"Permet de quitter un donjon en cours de route. L’XP acquise jusque-là est conservée et le donjon se referme sans rupture.",obtain:["Après avoir complété un donjon (Taux : 10 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]},
    invisibilityCape:{name:"CAPE D’INVISIBILITÉ",short:"CAPE D’INVISIBILITÉ",emoji:"👣",action:"UTILISER",desc:"Permet de passer une salle de donjon sans être vu. La salle est considérée comme terminée, sans gain d’XP.",obtain:["Après avoir complété un donjon (Taux : 10 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %)."]}
  };
  function itemQty(id){ return id==="dungeonKey"?dungeonKeys:Math.max(0,Math.floor(Number(state.inventory&&state.inventory[id])||0)); }
  function Inventory(){
    const ids=["dungeonKey","majorElixir","minorElixir","supremeElixir","transmutationGrimoire","masterContract","overachievementMark","recordHammer","teleportCrystal","invisibilityCape"]
      .sort((a,b)=>{
        const quantityDiff=itemQty(b)-itemQty(a);
        if(quantityDiff!==0)return quantityDiff;
        return INVENTORY_ITEMS[a].short.localeCompare(INVENTORY_ITEMS[b].short,"fr",{sensitivity:"base"});
      });
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
            h("div",{style:detailStyle},"▸ Remboursement : dès son activation et jusqu’au reset de J+2 ; chaque progression rembourse la dette avant d’alimenter la quête du jour"),
            h("div",{style:detailStyle},"▸ Streak : gelé jusqu’au remboursement, puis préservé si la dette est soldée"),
            h("div",{style:detailStyle},"▸ XP et records : XP conservés, sans bonus de dépassement et sans record"),
            h("div",{style:detailStyle},"▸ Quêtes compensables : Sommeil, Pecs, Abdos, Jambes, Tractions négatives, Mollets et Lecture")
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
