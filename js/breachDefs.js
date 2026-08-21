// ─── DÉFINITIONS DES BRÈCHES ───────────────────────────────────────────────
// Ce fichier contient uniquement les données statiques des Brèches et de leurs
// Boss de Rupture. Il ne dépend ni de Preact, ni de l’état de l’application,
// ni du stockage local.

// Brèches : événement rare tiré une seule fois au reset quotidien.
const BREACH_COLOR="#163a70";
const BREACH_LOOT_TEXT="Après avoir refermé une brèche : 1 objet aléatoire garanti.";
const BREACH_POOL=[
  {id:"breach_cold5",name:"Douche froide · 10min",bossObjective:"Prendre une douche froide pendant 10 minutes",icon:"🚿",unit:"min",target:10,step:10,binary:true,xp:1500,stat:"Sante",xp2:500,stat2:"Discipline",desc:""},
  {id:"breach_wallsit15",name:"Wall sit · 20min",bossObjective:"Faire 20 minutes de wall sit",icon:"🪑",unit:"min",target:20,step:5,xp:1500,stat:"Force",xp2:500,stat2:"Endurance",desc:""},
  {id:"breach_push300",name:"Pompes · 500reps",bossObjective:"Faire 500 pompes",icon:"🦾",unit:"rep",target:500,step:25,xp:1500,stat:"Force",xp2:500,stat2:"Endurance",desc:""},
  {id:"breach_squats150",name:"Squats · 250reps",bossObjective:"Faire 250 squats",icon:"🦿",unit:"rep",target:250,step:10,xp:1500,stat:"Force",xp2:500,stat2:"Endurance",desc:""},
  {id:"breach_pullups50",name:"Tractions · 50reps",bossObjective:"Faire 50 tractions",icon:"🦾",unit:"rep",target:50,step:5,xp:1500,stat:"Force",xp2:500,stat2:"Endurance",desc:""},
  {id:"breach_plank15",name:"Gainage · 20min",bossObjective:"Faire 20 minutes de gainage",icon:"🫳🏼",unit:"min",target:20,step:5,xp:1500,stat:"Force",xp2:500,stat2:"Endurance",desc:""},
  {id:"breach_learning2h",name:"Apprentissage actif · 2h",bossObjective:"Faire 2 heures d’apprentissage actif",icon:"🎓",unit:"min",target:120,step:10,binary:true,xp:1500,stat:"Esprit",xp2:500,stat2:"Discipline",desc:""},
  {id:"breach_reading1h",name:"Lecture · 2h",bossObjective:"Lire pendant 2 heures",icon:"📚",unit:"min",target:120,step:10,binary:true,xp:1500,stat:"Esprit",xp2:500,stat2:"Discipline",desc:""},
  {id:"breach_run10",name:"Running · 10km",bossObjective:"Courir 10 kilomètres",icon:"🏃🏻",unit:"km",target:10,step:5,binary:true,xp:2000,stat:"Endurance",desc:""},
  {id:"breach_sprint10",name:"Running fractionné · 10 × 200 mètres",bossObjective:"Faire 10 séries de 200 mètres",icon:"⚡",unit:"sér.",target:10,step:1,xp:1500,stat:"Endurance",xp2:500,stat2:"Agilite",desc:""},
  {id:"breach_rope30",name:"Corde à sauter · 30min",bossObjective:"Faire 30 minutes de corde à sauter",icon:"💦",unit:"min",target:30,step:5,xp:1500,stat:"Endurance",xp2:500,stat2:"Agilite",desc:""},
  {id:"breach_flex60",name:"Animal flow · 1h",bossObjective:"Faire 1 heure d’animal flow",icon:"🤸🏻",unit:"min",target:60,step:10,xp:1500,stat:"Agilite",xp2:500,stat2:"Endurance",desc:""},
  {id:"breach_martialflow60",name:"Flow martial · 1h",bossObjective:"Faire 1 heure de flow martial",icon:"🌊",unit:"min",target:60,step:10,xp:1500,stat:"Agilite",xp2:500,stat2:"Endurance",desc:""}
];

// Chaque Brèche possède un Boss de Rupture attitré. En Rupture, le Boss reprend
// l’objectif initial et invoque une garde rapprochée de trois sous-quêtes.
const BREACH_RUPTURE_BOSSES = {
  breach_cold5:{
    id:"breach_boss_cryomancien",name:"Sauron",guards:[
      {id:"hydromancien",name:"Le Roi-Sorcier d’Angmar",objective:"Boire 2 litres d’eau pendant la période de Rupture",unit:"L",target:2,step:0.5},
      {id:"purificateur",name:"Khamûl, l’Ombre de l’Orient",objective:"Prendre 2 repas propres consécutifs",unit:"repas",target:2,step:1},
      {id:"porte_lumiere",name:"Suladàn, l’Immortel",objective:"Passer 30 minutes à la lumière naturelle",unit:"min",target:30,step:10},
    ]
  },
  breach_wallsit15:{
    id:"breach_boss_titan",name:"Antares, Monarque des Dragons",guards:[
      {id:"delieur_jambes",name:"Baran, Monarque des Démons",objective:"Faire 10 minutes de mobilité du bas du corps",unit:"min",target:10,step:5},
      {id:"lancier",name:"Sillad, Monarque des Glaces",objective:"Effectuer 50 fentes",unit:"rep",target:50,step:10},
      {id:"porte_colonne",name:"Rakan, Monarque des Bêtes",objective:"Effectuer 100 élévations de mollets",unit:"rep",target:100,step:25},
    ]
  },
  breach_push300:{
    id:"breach_boss_berserker",name:"Le Berserker",guards:[
      {id:"armurier",name:"La Gorgone",objective:"Faire 10 minutes de mobilité des épaules et des poignets",unit:"min",target:10,step:5},
      {id:"brise_appuis",name:"La Gargouille",objective:"Effectuer 100 dips",unit:"rep",target:100,step:25},
      {id:"grimpeur_rouge",name:"La Coulée de Lave",objective:"Effectuer 20 tractions",unit:"rep",target:20,step:5},
    ]
  },
  breach_squats150:{
    id:"breach_boss_colosse",name:"Le Colosse",guards:[
      {id:"tailleur_pierre",name:"La Gorgone",objective:"Faire 10 minutes de mobilité du bas du corps",unit:"min",target:10,step:5},
      {id:"pilier",name:"Le Golem du Soléaire",objective:"Effectuer 100 élévations de mollets",unit:"rep",target:100,step:25},
      {id:"gardien_mur",name:"Le Piège Mécanique",objective:"Réaliser 5 minutes de Wall Sit",unit:"min",target:5,step:1},
    ]
  },
  breach_pullups50:{
    id:"breach_boss_brise_chaines",name:"Le Minotaure",guards:[
      {id:"deliant",name:"La Gorgone",objective:"Effectuer 10 minutes de mobilité des épaules et du dos",unit:"min",target:10,step:5},
      {id:"descendeur",name:"La Harpie",objective:"Faire 25 tractions négatives",unit:"rep",target:25,step:5},
      {id:"suspendu",name:"Le Piège de Roches",objective:"Réaliser 2 minutes de dead hang",unit:"min",target:2,step:0.5},
    ]
  },
  breach_plank15:{
    id:"breach_boss_bastion",name:"Le Cyclope",guards:[
      {id:"maitre_articulations",name:"La Gorgone",objective:"Faire 10 minutes de mobilité complète",unit:"min",target:10,step:5},
      {id:"broyeur",name:"Le Ver Pourpre",objective:"Effectuer 100 crunches",unit:"rep",target:100,step:25},
      {id:"flanc_garde",name:"Le Naga",objective:"Effectuer 50 répétitions de gainage oblique",unit:"rep",target:50,step:10},
    ]
  },
  breach_learning2h:{
    id:"breach_boss_archiviste",name:"L’Archiviste Noir",guards:[
      {id:"scribe",name:"Le Scribe Déchu",objective:"Rédiger un résumé de 300 mots de ce que tu viens d’apprendre",unit:"mot",target:300,step:50},
      {id:"mnemarque",name:"Le Détraqueur",objective:"Réaliser 20 minutes de mémorisation",unit:"min",target:20,step:5},
      {id:"veilleur_muet",name:"Le Palantír",objective:"Garder le téléphone hors de portée et couper les notifications pendant 3 heures",unit:"h",target:3,step:1},
    ]
  },
  breach_reading1h:{
    id:"breach_boss_sage_dechu",name:"Le Sage Déchu",guards:[
      {id:"contemplateur",name:"Māra",objective:"Méditer pendant 10 minutes",unit:"min",target:10,step:5},
      {id:"recitant",name:"Le Détraqueur",objective:"Restituer 10 idées de mémoire sans rouvrir le texte",unit:"idée",target:10,step:1},
      {id:"gardien_silence",name:"Le Palantír",objective:"Passer 30 minutes sans téléphone, musique, vidéo ni podcast",unit:"min",target:30,step:10},
    ]
  },
  breach_run10:{
    id:"breach_boss_arpenteur",name:"La Chimère",guards:[
      {id:"eclaireur",name:"La Gargouille",objective:"Effectuer 5 minutes d’échauffement dynamique",unit:"min",target:5,step:1},
      {id:"cadenceur",name:"Le Satyre",objective:"Effectuer 100 jumping jacks",unit:"rep",target:100,step:25},
      {id:"recuperateur",name:"Le Draugr",objective:"Faire 10 minutes de marche ou de mobilité après la course",unit:"min",target:10,step:5},
    ]
  },
  breach_sprint10:{
    id:"breach_boss_predateur",name:"Le Warg Alpha",guards:[
      {id:"pisteur",name:"La Gorgone",objective:"Effectuer 5 minutes d’échauffement dynamique",unit:"min",target:5,step:1},
      {id:"rabatteur",name:"Le Satyre",objective:"Effectuer 100 jumping jacks",unit:"rep",target:100,step:25},
      {id:"retour_chasse",name:"Le Draugr",objective:"Faire 10 minutes de marche ou de mobilité après la course",unit:"min",target:10,step:5},
    ]
  },
  breach_rope30:{
    id:"breach_boss_tisseur_orage",name:"Le Léviathan",guards:[
      {id:"delieur_foudre",name:"La Gorgone",objective:"Faire 5 minutes de mobilité des chevilles et des mollets",unit:"min",target:5,step:1},
      {id:"porte_tonnerre",name:"Le Golem du Soléaire",objective:"Effectuer 100 élévations de mollets",unit:"rep",target:100,step:25},
      {id:"eclair",name:"Le Satyre",objective:"Effectuer 100 jumping jacks",unit:"rep",target:100,step:25},
    ]
  },
  breach_flex60:{
    id:"breach_boss_acrobate",name:"Le Métamorphe",guards:[
      {id:"delieur",name:"La Gorgone",objective:"Faire 5 minutes de mobilité corporelle",unit:"min",target:5,step:1},
      {id:"ombre",name:"Le Doyen des Invisibles",objective:"Réaliser 10 minutes de déplacement silencieux",unit:"min",target:10,step:5},
      {id:"funambule",name:"Le Djinn des Vents",objective:"Réaliser 10 minutes d’exercices d’équilibre et de coordination",unit:"min",target:10,step:5},
    ]
  },
  breach_martialflow60:{
    id:"breach_boss_acrobate_martial",name:"Le Shinobi",guards:[
      {id:"delieur_martial",name:"La Gorgone",objective:"Faire 5 minutes de mobilité corporelle",unit:"min",target:5,step:1},
      {id:"ombre_martiale",name:"Le Doyen des Invisibles",objective:"Réaliser 10 minutes de déplacement silencieux",unit:"min",target:10,step:5},
      {id:"funambule_martial",name:"Le Djinn des Vents",objective:"Réaliser 10 minutes d’exercices d’équilibre et de coordination",unit:"min",target:10,step:5},
    ]
  },
};

export {
  BREACH_COLOR,
  BREACH_LOOT_TEXT,
  BREACH_POOL,
  BREACH_RUPTURE_BOSSES
};
