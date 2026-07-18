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


// Donjons volontaires : 1 actif à la fois, 1/jour, 3/semaine, 24h puis Boss de Rupture.
// Ordre aligné sur les stats : Santé, Force, Esprit, Endurance, Agilité, Discipline.
const DUNGEONS = [
  {id:"alchemist", title:"Donjon de l’Alchimiste", short:"Alchimiste", stat:"Sante", icon:"⚗️", color:"#ef4444", reward:{xp:1500,stat:"Sante",xp2:300,stat2:"Esprit"}, rooms:[
    {name:"Hydratation", desc:"2 verres d’eau d’une traite"},
    {name:"Lumière naturelle", desc:"10 min au soleil"},
    {name:"Repas propre", desc:"1 repas équilibré, sans sucre transformé ni junk-food ni écran"},
    {name:"Respiration calme", desc:"5 min de cohérence cardiaque ou respiration lente"},
    {name:"Relaxation", desc:"Douche froide 3 min sans interruption"},
  ]},
  {id:"warrior", title:"Donjon du Guerrier", short:"Guerrier", stat:"Force", icon:"⚔️", color:"#fb923c", reward:{xp:1500,stat:"Force",xp2:300,stat2:"Discipline"}, rooms:[
    {name:"Pompes", desc:"100 reps"},
    {name:"Abdos", desc:"150 reps"},
    {name:"Squats", desc:"50 reps"},
    {name:"Gainage", desc:"5 min"},
    {name:"Wall sit", desc:"10 min"},
  ]},
  {id:"monk", title:"Donjon du Moine", short:"Moine", stat:"Esprit", icon:"🧘🏻‍♂️", color:"#ec4899", reward:{xp:1500,stat:"Esprit",xp2:300,stat2:"Discipline"}, rooms:[
    {name:"Lecture profonde", desc:"Lire 10 min sans interruption"},
    {name:"Apprentissage actif", desc:"10 min d’apprentissage volontaire avec prise de notes minimale"},
    {name:"Mémoire", desc:"10 min de rappel actif", helpTitle:"Rappel actif", help:"Le rappel actif consiste à récupérer une information de mémoire, sans relire directement la réponse.\n\nIdées concrètes :\n• Rappel actif simple : ferme la source et restitue ce que tu as retenu.\n• Compression mentale : résume une idée en une phrase, puis en 3 mots-clés.\n• Transmission : explique une notion comme à quelqu’un de 12 ans.\n• Carte mentale : idée centrale + 3 à 5 branches, de mémoire.\n• Flash mental : liste 5 éléments liés à un sujet avant de vérifier.\n• Question-réponse : crée 3 questions et réponds sans relire.\n• Mémoire différée : apprends, attends 5 min, puis restitue."},
    {name:"Méditation", desc:"15 min"},
    {name:"Gratitude", desc:"Écrire 3 choses pour lesquelles je suis reconnaissant"},
  ]},
  {id:"pilgrim", title:"Donjon du Pèlerin", short:"Pèlerin", stat:"Endurance", icon:"🥾", color:"#22d3ee", reward:{xp:1500,stat:"Endurance",xp2:300,stat2:"Agilite"}, rooms:[
    {name:"Stepper", desc:"15 min"},
    {name:"Escaliers", desc:"15 allers-retours"},
    {name:"Jumping jacks", desc:"100 reps"},
    {name:"Fentes marchées", desc:"50 reps"},
    {name:"Running", desc:"30 min sans s’arrêter"},
  ]},
  {id:"hunter", title:"Donjon du Chasseur", short:"Chasseur", stat:"Agilite", icon:"🏹", color:"#4ade80", reward:{xp:1500,stat:"Agilite",xp2:300,stat2:"Endurance"}, rooms:[
    {name:"Éveil corporel", desc:"5 min de mobilité douce"},
    {name:"Footwork rapide", desc:"10 min"},
    {name:"Équilibre sur un pied", desc:"10 min"},
    {name:"Déplacements silencieux", desc:"10 min"},
    {name:"Souplesse active / Animal flow", desc:"30 min"},
  ]},
  {id:"guardian", title:"Donjon du Gardien", short:"Gardien", stat:"Discipline", icon:"🛡️", color:"#c084fc", reward:{xp:1500,stat:"Discipline",xp2:300,stat2:"Esprit"}, rooms:[
    {name:"Capture mentale", desc:"Traiter, planifier ou supprimer 5 éléments de ta charge mentale", helpTitle:"Capture mentale", help:"Note tout ce qui te prend de l’espace mental : petites tâches, démarches, messages, idées, choses à ranger ou décisions à prendre. Pour valider : 5 éléments doivent être traités, planifiés à une date précise, ou supprimés si inutiles."},
    {name:"Tâches repoussées", desc:"Terminer totalement 2 tâches repoussées"},
    {name:"Aucun contenu passif", desc:"2h", helpTitle:"Contenu passif", help:"À inclure : doomscrolling, vidéos courtes, réseaux sociaux sans intention, YouTube en consommation passive, fils d’actualité, jeux vidéo lancés par réflexe, film ou série regardés pour combler le vide. Film/série/jeu vidéo peuvent rester autorisés s’ils sont choisis volontairement comme vraie activité de détente ; ils comptent comme passifs s’ils servent juste à fuir l’ennui, repousser une tâche ou remplir automatiquement le temps."},
    {name:"Rangement", desc:"10 objets"},
    {name:"Bloc profond", desc:"45 min sur une tâche choisie, sans interruption volontaire"},
  ]},
  {id:"steward", title:"Donjon de l’Intendant", short:"Intendant", stat:"Discipline", icon:"🧹", color:"#f59e0b", reward:{xp:1350,stat:"Discipline",xp2:270,stat2:"Sante"}, rooms:[
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
    dailyExtraXp:saved.dailyExtraXp||IMPORTED.dailyExtraXp||{},
    dailyEvent:saved.dailyEvent||IMPORTED.dailyEvent||null,
    eventDay:saved.eventDay||IMPORTED.eventDay||null,
    eventHistory:saved.eventHistory||IMPORTED.eventHistory||[],
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
  const [dungeonUp,setDungeonUp] = useState(null);
  const [ruptureUp,setRuptureUp] = useState(null);
  const [urgentUp,setUrgentUp] = useState(null);
  const [confirmRerollSq,setConfirmRerollSq] = useState(null);
  const [confirmDungeonChoice,setConfirmDungeonChoice] = useState(null);
  const [dungeonChoiceOpen,setDungeonChoiceOpen] = useState(false);
  const [importModal,setImportModal] = useState(false);
  const [importValue,setImportValue] = useState("");
  const [exportCopiedModal,setExportCopiedModal] = useState(false);
  const [exportManualModal,setExportManualModal] = useState(false);
  const [exportValue,setExportValue] = useState("");
  const [dungeonHelpOpen,setDungeonHelpOpen] = useState({});
  const [historyOpen,setHistoryOpen] = useState({week:false,records:false,totals:false});
  const [codexOpen,setCodexOpen] = useState({obl:false,bonus:false,sq:false,elan:false,debt:false,dj:false,cs:false});
  const [prestigeUp,setPrestigeUp] = useState(null);
  const [showStatReqDetail,setShowStatReqDetail] = useState(false);
  const [showRankReqStats,setShowRankReqStats] = useState(false);
  const [mobOpen,setMobOpen] = useState(false);
  const [floats,setFloats] = useState([]);
  const [showSet,setShowSet]       = useState(false);
  const [confirmReset,setConfirmReset] = useState(false);
  const [wkOff,setWkOff]  = useState(0);
  const inputs = useRef({});

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
      const naturallyDone=activeOn(dk).every(o=>(log[o.id]||0)>=getValidateThreshold(o,dk));
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
  const dungeonRunsByWeek = state.dungeonRunsByWeek||{};
  const dungeonWeekCount = dungeonRunsByWeek[wk]||0;
  const dungeonDailyUsed = dungeonRunDay===today;
  const dungeonSkipDay = state.dungeonSkipDay||null;
  const dungeonSkippedToday = dungeonSkipDay===today;
  const dungeonKeyRollDone = state.dungeonKeyRollDay===today;
  const dungeonKeys = Math.max(0,Math.floor(Number(state.dungeonKeys)||0));
  const dungeonKeyAvailable = dungeonKeys>0;
  const urgentDoneToday = (state.specialQuests||[]).some(q=>{
    if(!q || !q.completedAt) return false;
    const d=new Date(q.completedAt);
    const day=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
    return day===today;
  });
  const dungeonLootConditionsMet = allDailyDone && urgentDoneToday;
  const dungeonCanStart = !state.activeDungeon && !dungeonDailyUsed && dungeonWeekCount<3 && dungeonKeyAvailable;

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
    setTimeout(()=>setRecordUp({
      title:"NOUVEAU RECORD",
      name:obj.name,
      icon:obj.icon,
      value:label,
      color,
      glow:color+"55",
      rankColor:rank.color,
      rankGlow:rank.glow
    }),delay);
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
  // Clé de donjon : un seul tirage quotidien, à 1 chance sur 3,
  // lorsque toutes les journalières et la quête urgente sont terminées.
  useEffect(()=>{
    if(!dungeonLootConditionsMet || dungeonKeyRollDone) return;
    setState(s=>{
      if(s.dungeonKeyRollDay===today) return s;
      const won=Math.floor(Math.random()*3)===0;
      return {
        ...s,
        dungeonKeyRollDay:today,
        dungeonKeyRollWon:won,
        dungeonKeyDay:won?today:null,
        dungeonKeys:Math.max(0,Math.floor(Number(s.dungeonKeys)||0))+(won?1:0)
      };
    });
  },[dungeonLootConditionsMet,dungeonKeyRollDone,today]);

  useEffect(()=>{
    if(!allDailyDone || state.dailyCompletionAnimDay===today) return;
    setState(s=>s.dailyCompletionAnimDay===today?s:{...s,dailyCompletionAnimDay:today});
    setCompletionQueue(q=>[...q,{
      type:"daily",
      text:"Toutes les quêtes journalières ont été complétées"
    }]);
  },[allDailyDone,today,state.dailyCompletionAnimDay]);

  useEffect(()=>{
    if(!allBonusDone || state.bonusCompletionAnimDay===today) return;
    setState(s=>s.bonusCompletionAnimDay===today?s:{...s,bonusCompletionAnimDay:today});
    setCompletionQueue(q=>[...q,{
      type:"bonus",
      text:"Toutes les quêtes bonus ont été complétées"
    }]);
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
      const ev=s.dailyEvent;
      const eventBonus = !skipEventBonus && ev && ev.type==="bonus" && !ev.completedAt && Date.now()<(ev.expiresAt||0) && ev.stat===stat
        ? Math.round((Number(amount)||0)*(ev.bonusPct||0))
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
    const mainXp = isBoss ? 900 : 150;
    const secondXp = isBoss ? 180 : 30;
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
    setState(s=>{
      const t=Date.now();
      const day=todayStr();
      const week=wkStr();
      const runs={...(s.dungeonRunsByWeek||{})};
      const current=s.activeDungeon;
      if(current && !current.completedAt) return s;
      if(s.dungeonRunDay===day || (runs[week]||0)>=3) return s;
      const keys=Math.max(0,Math.floor(Number(s.dungeonKeys)||0));
      if(keys<1) return s;
      const dungeon=DUNGEONS.find(d=>d.id===id);
      if(!dungeon) return s;
      runs[week]=(runs[week]||0)+1;
      return {...s,activeDungeon:{id,runId:"dg_"+t,startedAt:t,expiresAt:next7AM(t),completedRooms:[],completedAt:null},dungeonRunDay:day,dungeonRunsByWeek:runs,dungeonKeys:keys-1,dungeonKeyDay:null,dungeonKeyRollWon:false,lastActiveDay:day};
    });
  }

  function skipDungeonToday(){
    setState(s=>({...s,dungeonSkipDay:todayStr()}));
  }

  function validateDungeonRoom(){
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
          {xp:900,stat:dungeon.reward.stat||dungeon.stat},
          dungeon.reward.stat2?{xp:180,stat:dungeon.reward.stat2}:null
        ].filter(Boolean);
        ruptureRewards.forEach(r=>{
          totalXp+=(r.xp||0);
          statXp[r.stat]=(statXp[r.stat]||0)+(r.xp||0);
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
            id:dungeon.id,title:dungeon.title,stat:dungeon.stat,
            xp:priorRoomXp+awardedXp,completedAt,expiresAt:ad.expiresAt,
            rupture:true,ruptureBoss:{
              id:rb.id,name:rb.name,rarity:rb.rarity,rarityLabel:rb.rarityLabel,objective:rb.objective
            }
          }],
          lastActiveDay:day
        };
      }

      const completed=Array.isArray(ad.completedRooms)?ad.completedRooms:[];
      const nextIdx=completed.length;
      if(nextIdx>=dungeon.rooms.length) return s;

      const beforeXp=s.totalXp;
      const beforeStats=s.stats;
      let totalXp=s.totalXp;
      const statXp={...s.statXp};
      const stats={...s.stats};
      const roomRewards=dungeonRoomRewardPairs(dungeon,nextIdx);
      roomRewards.forEach(r=>{
        totalXp+=(r.xp||0);
        statXp[r.stat]=(statXp[r.stat]||0)+(r.xp||0);
        stats[r.stat]=getLvl(statXp[r.stat]);
      });
      const awardedXp = roomRewards.reduce((sum,r)=>sum+(r.xp||0),0);
      const day=todayStr();
      const daily={...(s.dailyExtraXp||{})};
      const dayLog={...(daily[day]||{})};
      if(awardedXp>0) dayLog.dungeon=(dayLog.dungeon||0)+awardedXp;
      if(awardedXp>0) daily[day]=dayLog;

      const nextCompleted=[...completed,nextIdx];
      const isComplete=nextCompleted.length>=dungeon.rooms.length;
      triggerProgressOverlay(beforeXp,beforeStats,totalXp,stats,300);

      if(!isComplete){
        return {...s,totalXp,statXp,stats,dailyExtraXp:daily,activeDungeon:{...ad,completedRooms:nextCompleted},lastActiveDay:todayStr()};
      }

      const completedAt=t;
      const rewards=dungeonRewardPairs(dungeon);
      const rewardText=rewards.map(r=>"+"+r.xp+" XP "+(STAT_LBL[r.stat]||r.stat)).join(" · ");
      setTimeout(()=>setDungeonUp({title:dungeon.title,short:dungeon.short,icon:dungeon.icon,color:dungeon.color,reward:rewardText}),200);
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
    const nextRoom=d ? d.rooms[completedRooms.length] : null;
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
            "+900 XP "+(STAT_LBL[d.reward.stat]||d.reward.stat)+" · +180 XP "+(STAT_LBL[d.reward.stat2]||d.reward.stat2)
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
          const current=i===completedRooms.length;
          return h("div",{key:i,style:"display:flex;gap:8px;align-items:flex-start;padding:8px;border-radius:10px;background:"+(current?color+"12":"rgba(255,255,255,0.025)")+";border:1px solid "+(current?color+"44":"rgba(255,255,255,0.05)")+";opacity:"+(done?"0.75":"1")},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:"+(done?"#4ade80":current?color:"var(--td)")+";width:18px;text-align:center;flex-shrink:0"},done?"✓":(i+1)),
            h("div",{style:"min-width:0;flex:1"},
              h("div",{style:"font-size:12px;color:var(--tx);font-weight:700;line-height:1.25"},(i===d.rooms.length-1?"Boss — ":"")+room.name),
              h("div",{style:"font-size:10px;color:var(--td);line-height:1.35;margin-top:2px"},room.desc),
              h("div",{style:"font-size:8.5px;color:"+color+";font-family:Orbitron,sans-serif;letter-spacing:.8px;text-transform:uppercase;margin-top:4px"},dungeonRoomRewardPairs(d,i).map(r=>"+"+r.xp+" XP "+(STAT_LBL[r.stat]||r.stat)).join(" · ")),
              room.help&&h("button",{onClick:()=>setDungeonHelpOpen(o=>({...o,[d.id+"_"+i]:!o[d.id+"_"+i]})),style:"margin-top:6px;padding:5px 7px;border-radius:7px;border:1px solid "+color+"55;background:rgba(255,255,255,0.025);color:"+color+";font-family:Orbitron,sans-serif;font-size:8px;letter-spacing:1px;text-transform:uppercase;cursor:pointer"},dungeonHelpOpen[d.id+"_"+i]?"Masquer l’aide":"Aide"),
              room.help&&dungeonHelpOpen[d.id+"_"+i]&&h("div",{style:"margin-top:6px;padding:8px;border-radius:8px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.07);font-size:10px;color:var(--td);line-height:1.45"},
                h("div",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:"+color+";letter-spacing:1px;text-transform:uppercase;margin-bottom:4px"},room.helpTitle||"Aide"),
                String(room.help||"").split("\n").map((line,idx)=>h(Fragment,{key:idx},line,idx<String(room.help||"").split("\n").length-1&&h("br",null)))
              )
            )
          );
        })),
        nextRoom&&h("button",{onClick:validateDungeonRoom,style:"width:100%;margin-top:10px;padding:11px;border-radius:9px;border:1px solid "+color+"66;background:"+color+"12;color:"+color+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"},completedRooms.length===d.rooms.length-1?"Valider le boss":"Valider la salle suivante")
      );
    }
    return h("div",{class:"card",style:"border-color:var(--rc)44"},
      h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px"},
        h("div",null,h("div",{class:"ctitle",style:"margin:0;color:var(--rc)"},"Donjons"),h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin-top:4px"},"1/jour · "+dungeonWeekCount+"/3 cette semaine")),
        h("div",{style:"font-size:10px;color:"+(dungeonCanStart?"#4ade80":"var(--td)")+";font-family:Orbitron,sans-serif;text-transform:uppercase;white-space:nowrap"},dungeonCanStart?"Disponible":(dungeonDailyUsed?"Déjà lancé":"Limite hebdo"))
      ),
      dungeonCanStart
        ? h("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:8px"},DUNGEONS.map(dg=>h("button",{key:dg.id,onClick:()=>startDungeon(dg.id),style:"padding:10px 8px;border-radius:10px;border:1px solid "+dg.color+"55;background:"+dg.color+"0f;color:"+dg.color+";font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:.7px;text-transform:uppercase;cursor:pointer;text-align:center;line-height:1.25"},h("div",{style:"font-size:16px;margin-bottom:4px"},dg.icon),h("div",null,dg.short),h("div",{style:"font-size:8px;color:var(--td);margin-top:3px"},STAT_LBL[dg.stat]||dg.stat))))
        : h("div",{style:"text-align:center;padding:10px 0;color:var(--td);font-size:11px;line-height:1.45"},dungeonDailyUsed?"Tu as déjà lancé un donjon aujourd'hui. Prochain lancement disponible demain.":"Limite hebdomadaire atteinte. Prochain lancement disponible la semaine prochaine.")
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
      dungeonCanStart
        ? h("button",{onClick:()=>setConfirmDungeonChoice({type:"enter",color:dungeonGold}),style:"width:100%;margin-top:12px;padding:11px;border-radius:9px;border:1px solid "+dungeonGold+"88;background:"+dungeonGold+"12;color:"+dungeonGold+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.35px;text-transform:uppercase;cursor:pointer"},"ENTRER DANS UN DONJON")
        : h("div",{style:"text-align:center;padding:10px 0 2px;color:var(--td);font-size:11px;line-height:1.45"},
            dungeonDailyUsed
              ? "Tu as déjà lancé un donjon aujourd’hui. Prochain lancement disponible demain."
              : dungeonWeekCount>=3
                ? "Limite hebdomadaire atteinte. Prochain lancement disponible la semaine prochaine."
                : !dungeonKeyAvailable && !dungeonLootConditionsMet
                  ? "Aucune clé disponible. Complète toutes les quêtes journalières et la quête urgente pour tenter d’en obtenir une."
                  : !dungeonKeyAvailable && dungeonKeyRollDone
                    ? "Aucune clé trouvée aujourd’hui. Une nouvelle tentative sera disponible demain."
                    : !dungeonKeyAvailable
                      ? "Le tirage de la clé est en cours…"
                      : "Une clé est disponible, mais le donjon ne peut pas être lancé actuellement."
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
            setState(s=>({...s,streak:0,streakBonusDay:null,weeklyBonusWk:null,streakMilestones:[],dailyLog:{},weeklyLog:{},specialQuests:[],sqStatCycle:[],sqCooldownUntil:null,sqRerollDay:null,activeDungeon:null,dungeonRunDay:null,dungeonRunsByWeek:{},dungeonKeyRollDay:null,dungeonKeys:0,dungeonKeyDay:null,dungeonKeyRollWon:false,dungeonLog:[],enduranceChoiceByDay:{},prestige:newPrestige}));
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
      dailyEvent&&h(DailyEventCard,null),

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
      h(DungeonChoiceCard,null)
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

  const ok = value >= validationTarget;

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
        h("div",{class:"rurank",style:"--rc:"+(urgentUp.nameColor||color)+";--rg:"+(urgentUp.nameColor||color)+"66;color:"+(urgentUp.nameColor||color)+";text-shadow:0 0 18px "+(urgentUp.nameColor||color)+"66;font-size:clamp(36px,10vw,62px);letter-spacing:-1px;white-space:normal;max-width:340px;line-height:1.05","data-r":urgentUp.name},urgentUp.name),
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
              h("div",{style:"font-size:9px;color:"+(STAT_COLOR[dg.stat]||dg.color)+";font-family:Orbitron,sans-serif;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:7px"},"Boss de Rupture — +900 / +180 XP"),
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
      h(Section,{id:"elan",title:"Élans",count:elanList.length},
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
          h("div",{class:"hdr-top",style:"position:relative"},
            h("div",null,
              h("div",{class:"pname"},"VAL,"),
              h("div",{style:"margin-top:6px;width:min(340px,calc(100vw - 112px));min-height:26px;font-size:9.5px;line-height:1.3;color:"+mantraColor+";font-family:Orbitron,sans-serif;letter-spacing:0.5px;text-transform:uppercase;display:block;opacity:.96;white-space:normal;overflow:hidden"},dailyMantra)
            ),
            prestige>0&&h("div",{class:"prestige-badge"},"\u269B\uFE0F Ascension "+ROMAN[prestige-1]),
            h("button",{class:"gbtn",style:"display:flex;align-items:center;justify-content:center",onClick:()=>setShowSet(true)},"⚙️")
          )
        )
      ),
      h("div",{class:"scroll-area",ref:scrollRef},
        h("div",{style:"height:26px;flex:0 0 auto"}),
        tab==="home"    &&h(Home,null),
        tab==="quests"  &&h(Quests,null),
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
        h("button",{class:"nbtn "+(tab==="stats"?"on":""),onClick:()=>switchTab("stats")},
          h("span",null,"Stats")
        ),
        h("button",{class:"nbtn "+(tab==="history"?"on":""),onClick:()=>switchTab("history")},
          h("span",null,"Historique")
        ),
        h("button",{class:"nbtn "+(tab==="codex"?"on":""),onClick:()=>switchTab("codex")},
          h("span",null,"Codex")
        )
      ),
      h(Settings,null),
      h(RankUp,null),
      h(LevelUp,null),
      h(StatDecadeUp,null),
      h(CompletionUp,null),
      h(StreakUp,null),
      h(RecordUp,null),
      h(DungeonUp,null),
      h(DungeonRuptureUp,null),
      h(UrgentUp,null),
      h(DebtUp,null),
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
