// ─── DÉFINITIONS DES QUÊTES ────────────────────────────────────────────────
// Ce fichier contient uniquement les données statiques des quêtes journalières,
// bonus et urgentes, ainsi que les libellés de leurs niveaux de rareté.
// Il ne dépend ni de Preact, ni de l’état de l’application, ni du stockage local.

const DEFS = [
  // ─── SANTÉ ────────────────────────────────────────────────────────────
  {id:"water",  name:"Hydratation",     unit:"verre", xpPer:10,  daily:true, weekly:false,optional:false,stat:"Sante",         icon:"\uD83D\uDCA7",               base:10, baseHistory:[{until:"2026-04-29",base:8}]},
  {id:"sleep",  name:"Dormir 8h",   unit:"h",     xpPer:18.75,daily:true, weekly:false,optional:false,stat:"Sante",         icon:"\uD83D\uDECF\uFE0F",         base:8,  fixedBase:true},
    // ─── FORCE ────────────────────────────────────────────────────────────
  {id:"push",   name:"Pecs & Triceps", unit:"rep", xpPer:3, daily:true, weekly:false,optional:false,stat:"Force", icon:"🦾", base:30},
  {id:"abs",    name:"Abdos", unit:"rep", xpPer:1.5, daily:true, weekly:false,optional:false,stat:"Force", icon:"🧱", base:60},
  {id:"squats", name:"Jambes", unit:"rep", xpPer:3, daily:true, weekly:false,optional:false,stat:"Force", icon:"🦿", base:15, stat2:"Agilite", xpPer2:3},
  {id:"negative_pullups", name:"Dos & Biceps", unit:"rep", xpPer:12, daily:true, weekly:false,optional:false,stat:"Force", icon:"🦾", base:8, startDate:"2026-07-14"},
  {id:"calves", name:"Mollets",unit:"rep", xpPer:2, daily:false, weekly:false,optional:false,legacyRotation:true,stat:"Force", icon:"🦵🏻", base:30, stat2:"Agilite", xpPer2:1},
  {id:"grips",  name:"Grip",      unit:"min",   xpPer:10,  daily:true, weekly:false,optional:true, stat:"Force",         icon:"\u270A\uD83C\uDFFB",         base:10, fixedBase:true},
  // ─── ESPRIT ───────────────────────────────────────────────────────────
  {id:"reading",name:"Lecture",unit:"min",xpPer:10,daily:true,weekly:false,optional:false,stat:"Esprit",icon:"📚",base:20,startDate:"2026-05-21"},
  // ─── ESPRIT ───────────────────────────────────────────────────────────
  
  {id:"med",    name:"M\u00e9ditation", unit:"min",   xpPer:15,  daily:true, weekly:false,optional:true, stat:"Esprit",  icon:"\uD83E\uDDD8\uD83C\uDFFB\u200D\u2642\uFE0F", base:15, fixedBase:true},
  // ─── ENDURANCE ────────────────────────────────────────────────────────
  {id:"run",    name:"Running",         iconKey:"run",          unit:"km",    xpPer:200, daily:true, weekly:false,optional:true, stat:"Endurance",      icon:"\uD83C\uDFC3\uD83C\uDFFB",   base:5,  stat2:"Agilite", xpPer2:50},
  {id:"walk",   name:"Rando",       unit:"km",    xpPer:100, daily:true, weekly:false,optional:true, stat:"Endurance",      icon:"\uD83E\uDD7E",               base:5, stat2:"Agilite", xpPer2:25},
  {id:"march",  name:"Marche",      unit:"km",    xpPer:50,  daily:true, weekly:false,optional:true, stat:"Endurance",      icon:"🚶🏻",                         base:5},
  // ─── AGILITÉ ──────────────────────────────────────────────────────────
    {id:"balance",name:"Équilibre",unit:"min",xpPer:10,daily:true,weekly:false,optional:true,stat:"Agilite", icon:"\uD83E\uDDB6\uD83C\uDFFB", base:10, fixedBase:true, startDate:"2026-05-15", stat2:"Esprit", xpPer2:5},
  // ─── DISCIPLINE ───────────────────────────────────────────────────────
];

// Quetes speciales — par stat (23 au total)
const SP = {
  Sante:[
    {id:"sp_sun",     name:"Lumière naturelle · 30min", icon:"\u2600\uFE0F",                              unit:"min",  target:30,  xp:500, xp2:250, stat2:"Esprit", days:1, binary:true},
    {id:"sp_fruits",  name:"Manger 5 fruits et légumes",  icon:"\uD83C\uDF4F",                              unit:"portion", target:5, xp:500, days:1, binary:true},
    {id:"sp_nojunk",  name:"Pas de junk-food",                icon:"\uD83C\uDF55",                              unit:"jour", target:1, xp:500, days:1, binary:true},
    {id:"sp_balanced_meals", name:"Manger 2 repas équilibrés", icon:"\uD83C\uDF4C", unit:"repas", target:2, xp:750, days:1, tiers:[{at:1,xp:250,stat:"Sante"},{at:2,xp:500,stat:"Sante"}]},
    {id:"sp_no_sugar", name:"Aucun sucre transformé", icon:"\uD83C\uDF6C", unit:"jour", target:1, xp:500, days:1, binary:true},
    {id:"sp_mealnostim", name:"Manger 2 repas sans stimulation", icon:"🧠", unit:"repas", target:2, xp:750, days:1, tiers:[{at:1,xp:250,stat:"Sante"},{at:2,xp:250,stat:"Sante",xp2:250,stat2:"Esprit"}]},  ],
  Force:[
  ],
  Esprit:[
    {id:"sp_breath",  name:"Cohérence cardiaque · 30min",icon:"\uD83D\uDC93",                             unit:"min", target:30, xp:500, xp2:250, stat2:"Sante", days:1, binary:true},
    {id:"sp_memo30",   name:"Mémorisation · 30min",icon:"\uD83E\uDDE0",                                  unit:"jour", target:1, xp:1000, days:1, binary:true},
    {id:"sp_silence30",name:"Silence · 30min",          icon:"\uD83E\uDD2B",                                  unit:"jour", target:1, xp:500, xp2:250, stat2:"Discipline", days:1, binary:true},
    {id:"sp_nophone3h", name:"Pas d'écran · 3h", icon:"\uD83D\uDCF5",                unit:"jour", target:1, xp:500, xp2:250, stat2:"Discipline", days:1, binary:true},
  ],
  Endurance:[
    {id:"sp_stairs",  name:"Escaliers · 30 montées/descentes", icon:"\uD83E\uDE9C",                                 unit:"A/R",  target:30, xp:500, xp2:250, stat2:"Agilite", days:1},
    {id:"sp_walk30",  name:"Marche · 30min",     icon:"\uD83D\uDEB6\uD83C\uDFFB\u200D\u2642\uFE0F",           unit:"min",  target:30, xp:500, days:1},
    {id:"sp_shadow_boxing", name:"Shadow boxing · 30min", icon:"🥊", unit:"min", target:30, xp:1250, days:1, tiers:[{at:15,xp:500,stat:"Endurance"},{at:30,xp:500,stat:"Endurance",xp2:250,stat2:"Force"}]},
  ],
  Agilite:[
    {id:"sp_flow20",  name:"Animal flow · 30min", icon:"\uD83D\uDC0A",                                         unit:"min",  target:30, xp:1250, days:1, tiers:[{at:15,xp:500,stat:"Agilite"},{at:30,xp:500,stat:"Agilite",xp2:250,stat2:"Endurance"}]},
    {id:"sp_fluide",  name:"Flow martial · 30min", icon:"\uD83C\uDF0A",                              unit:"min",  target:30, xp:1250, days:1, tiers:[{at:15,xp:500,stat:"Agilite"},{at:30,xp:500,stat:"Agilite",xp2:250,stat2:"Endurance"}]},
    {id:"sp_silent",  name:"Déplacements silencieux · 30min", icon:"\uD83D\uDC08",                          unit:"min",  target:30, xp:1250, days:1, tiers:[{at:15,xp:500,stat:"Agilite"},{at:30,xp:500,stat:"Agilite",xp2:250,stat2:"Endurance"}]},
        {id:"sp_footwork", name:"Footwork · 15min", icon:"\u26A1",                                            unit:"min",  target:15, xp:500, xp2:250, stat2:"Endurance", step:5, days:1},
  ],
  Discipline:[
    {id:"sp_no_passive", name:"Aucun contenu passif", icon:"\uD83D\uDEAB", unit:"jour", target:1, xp:500, days:1, binary:true},
    {id:"sp_task",      name:"Accomplir 3 tâches repoussées", icon:"\uD83D\uDD57",                   unit:"tâche", target:3, xp:500, days:1},
    {id:"sp_declutter", name:"Ranger ou jeter 10 objets",            icon:"\uD83D\uDCE6",                          unit:"objet",target:10,xp:500, days:1},
  ],
};

// Couleurs et libellés des tiers des quêtes urgentes
const SQ_TIER_COLOR = {mineure:"#fbbf24", majeure:"#f59e0b", legendaire:"#f97316"};
const SQ_TIER_LABEL = {mineure:"Mineure", majeure:"Majeure", legendaire:"Légendaire"};

export { DEFS, SP, SQ_TIER_COLOR, SQ_TIER_LABEL };
