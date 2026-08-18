// Catalogue indépendant des quêtes bonus sélectionnables chaque jour.
// Les identifiants historiques (grips, med, run, walk, march, balance) sont
// conservés afin que leurs anciens records restent exploitables.
export const BONUS_QUESTS = [
  {id:"bonus_sun",name:"Lumière naturelle",icon:"☀️",unit:"min",base:10,fixedBase:true,xpPer:15,stat:"Sante"},
  {id:"bonus_cold_shower",name:"Douche froide · 3min",icon:"🚿",unit:"succès",base:1,binary:true,binaryXp:150,stat:"Sante"},

  {id:"grips",name:"Grip",icon:"✊🏻",unit:"min",base:10,fixedBase:true,xpPer:15,stat:"Force"},
  {id:"bonus_wall_sit",name:"Wall-sit",icon:"🧱",unit:"min",base:5,fixedBase:true,xpPer:50,stat:"Force"},
  {id:"bonus_pullups",name:"Tractions",icon:"💪🏼",unit:"rep",base:10,fixedBase:true,xpPer:30,stat:"Force"},
  {id:"bonus_dead_hang",name:"Dead hang",icon:"🫳🏼",unit:"min",base:5,fixedBase:true,xpPer:30,stat:"Force"},

  {id:"med",name:"Méditation",icon:"🧘🏻‍♂️",unit:"min",base:10,fixedBase:true,xpPer:15,stat:"Esprit"},
  {id:"bonus_coherence",name:"Cohérence cardiaque",icon:"💓",unit:"min",base:10,fixedBase:true,xpPer:10,stat:"Sante",xpPer2:5,stat2:"Esprit",category:"Esprit"},
  {id:"bonus_memory",name:"Mémorisation",icon:"🧠",unit:"min",base:10,fixedBase:true,xpPer:30,stat:"Esprit"},

  {id:"run",name:"Running",icon:"🏃🏻",iconKey:"run",unit:"km",base:5,xpPer:200,stat:"Endurance",stat2:"Agilite",xpPer2:50,dynamicEndurance:true},
  {id:"walk",name:"Rando",icon:"🥾",unit:"km",base:5,xpPer:100,stat:"Endurance",stat2:"Agilite",xpPer2:25,dynamicEndurance:true},
  {id:"march",name:"Marche",icon:"🚶🏻",unit:"km",base:5,xpPer:50,stat:"Endurance",dynamicEndurance:true},
  {id:"bonus_stairs",name:"Escaliers",icon:"🪜",unit:"A/R",base:15,fixedBase:true,xpPer:10,stat:"Endurance",xpPer2:5,stat2:"Agilite"},
  {id:"bonus_shadow_boxing",name:"Shadow boxing",icon:"🥊",unit:"min",base:10,fixedBase:true,xpPer:30,stat:"Endurance"},
  {id:"bonus_jumping_jacks",name:"Jumping jacks",icon:"🤸🏻",unit:"rep",base:100,fixedBase:true,xpPer:1.5,stat:"Endurance"},

  {id:"balance",name:"Équilibre",icon:"🦶🏻",unit:"min",base:10,fixedBase:true,xpPer:10,stat:"Agilite",xpPer2:5,stat2:"Esprit"},
  {id:"bonus_animal_flow",name:"Animal flow",icon:"🐾",unit:"min",base:10,fixedBase:true,xpPer:10,stat:"Agilite",xpPer2:5,stat2:"Endurance"},
  {id:"bonus_martial_flow",name:"Flow martial",icon:"🥋",unit:"min",base:10,fixedBase:true,xpPer:10,stat:"Agilite",xpPer2:5,stat2:"Endurance"},
  {id:"bonus_silent",name:"Déplacements silencieux",icon:"🐈",unit:"min",base:10,fixedBase:true,xpPer:10,stat:"Agilite",xpPer2:5,stat2:"Endurance"},

  {id:"bonus_delayed_task",name:"Accomplir 1 tâche repoussée",icon:"🕗",unit:"succès",base:1,binary:true,binaryXp:150,stat:"Discipline"},
  {id:"bonus_vacuum",name:"Aspirer",icon:"🧹",unit:"succès",base:1,binary:true,binaryXp:150,stat:"Discipline"}
].map(q=>({...q,category:q.category||q.stat,target:q.dynamicEndurance?undefined:q.base,daily:true,weekly:false,optional:true,selectableBonus:true}));

export const BONUS_QUEST_BY_ID = Object.fromEntries(BONUS_QUESTS.map(q=>[q.id,q]));
export const BONUS_QUEST_GOAL = 5;
