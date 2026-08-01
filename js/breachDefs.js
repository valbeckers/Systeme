// ─── DÉFINITIONS DES BRÈCHES ───────────────────────────────────────────────
// Ce fichier contient uniquement les données statiques des Brèches et de leurs
// Boss de Rupture. Il ne dépend ni de Preact, ni de l’état de l’application,
// ni du stockage local.

// Brèches : événement rare tiré une seule fois au reset quotidien.
const BREACH_COLOR="#163a70";
const BREACH_LOOT_TEXT="Après avoir refermé une Brèche (Taux : 100 %, puis tirage aléatoire parmi les objets de l’inventaire).";
const BREACH_POOL=[
  {id:"breach_cold5",name:"Douche froide · 5min",icon:"🚿",unit:"épreuve",target:1,binary:true,xp:1500,stat:"Sante",xp2:500,stat2:"Discipline",desc:""},
  {id:"breach_wallsit15",name:"Wall sit · 15min",icon:"🪑",unit:"min",target:15,step:5,xp:1500,stat:"Force",xp2:500,stat2:"Endurance",desc:""},
  {id:"breach_push300",name:"Pompes · 300reps",icon:"🦾",unit:"rep",target:300,step:25,xp:1500,stat:"Force",xp2:500,stat2:"Endurance",desc:""},
  {id:"breach_squats150",name:"Squats · 150reps",icon:"🦿",unit:"rep",target:150,step:10,xp:1500,stat:"Force",xp2:500,stat2:"Endurance",desc:""},
  {id:"breach_pullups50",name:"Tractions · 50reps",icon:"🦾",unit:"rep",target:50,step:5,xp:1500,stat:"Force",xp2:500,stat2:"Endurance",desc:""},
  {id:"breach_plank15",name:"Gainage · 15min",icon:"🫳🏼",unit:"min",target:15,step:5,xp:1500,stat:"Force",xp2:500,stat2:"Endurance",desc:""},
  {id:"breach_learning2h",name:"Apprentissage actif · 2h",icon:"🎓",unit:"épreuve",target:1,binary:true,xp:1500,stat:"Esprit",xp2:500,stat2:"Discipline",desc:""},
  {id:"breach_reading1h",name:"Lecture · 1h",icon:"📚",unit:"épreuve",target:1,binary:true,xp:1500,stat:"Esprit",xp2:500,stat2:"Discipline",desc:""},
  {id:"breach_run10",name:"Running · 10km",icon:"🏃🏻",unit:"épreuve",target:1,binary:true,xp:2000,stat:"Endurance",desc:""},
  {id:"breach_sprint10",name:"Running fractionné · 10 × 100 mètres",icon:"⚡",unit:"sér.",target:10,step:1,xp:1500,stat:"Endurance",xp2:500,stat2:"Agilite",desc:""},
  {id:"breach_rope30",name:"Corde à sauter · 30min",icon:"💦",unit:"min",target:30,step:5,xp:1500,stat:"Endurance",xp2:500,stat2:"Agilite",desc:""},
  {id:"breach_flex60",name:"Animal flow · 1h",icon:"🤸🏻",unit:"min",target:60,step:10,xp:1500,stat:"Agilite",xp2:500,stat2:"Endurance",desc:""},
  {id:"breach_martialflow60",name:"Flow martial · 1h",icon:"🌊",unit:"min",target:60,step:10,xp:1500,stat:"Agilite",xp2:500,stat2:"Endurance",desc:""}
];

// Chaque Brèche possède un Boss de Rupture attitré. En Rupture, le Boss reprend
// l’objectif initial et invoque une garde rapprochée de trois sous-quêtes.
const BREACH_RUPTURE_BOSSES = {
  breach_cold5:{
    id:"breach_boss_cryomancien",name:"Le Cryomancien",guards:[
      {id:"hydromancien",name:"L’Hydromancien",objective:"Boire 2 litres d’eau pendant la période de Rupture",unit:"L",target:2,step:0.5},
      {id:"purificateur",name:"Le Purificateur",objective:"Prendre 2 repas propres consécutifs",unit:"repas",target:2,step:1},
      {id:"porte_lumiere",name:"Le Porte-Lumière",objective:"Passer 30 minutes à la lumière naturelle",unit:"min",target:30,step:10},
    ]
  },
  breach_wallsit15:{
    id:"breach_boss_titan",name:"Le Titan",guards:[
      {id:"delieur_jambes",name:"Le Délieur des Jambes",objective:"Faire 10 minutes de mobilité du bas du corps",unit:"min",target:10,step:5},
      {id:"lancier",name:"Le Lancier",objective:"Effectuer 50 fentes",unit:"rep",target:50,step:10},
      {id:"porte_colonne",name:"Le Porte-Colonne",objective:"Effectuer 100 élévations de mollets",unit:"rep",target:100,step:25},
    ]
  },
  breach_push300:{
    id:"breach_boss_berserker",name:"Le Berserker",guards:[
      {id:"armurier",name:"L’Armurier",objective:"Faire 10 minutes de mobilité des épaules et des poignets",unit:"min",target:10,step:5},
      {id:"brise_appuis",name:"Le Brise-Appuis",objective:"Effectuer 100 dips",unit:"rep",target:100,step:25},
      {id:"grimpeur_rouge",name:"Le Grimpeur Rouge",objective:"Effectuer 20 tractions",unit:"rep",target:20,step:5},
    ]
  },
  breach_squats150:{
    id:"breach_boss_colosse",name:"Le Colosse",guards:[
      {id:"tailleur_pierre",name:"Le Tailleur de Pierre",objective:"Faire 10 minutes de mobilité du bas du corps",unit:"min",target:10,step:5},
      {id:"pilier",name:"Le Pilier",objective:"Effectuer 100 élévations de mollets",unit:"rep",target:100,step:25},
      {id:"gardien_mur",name:"Le Gardien du Mur",objective:"Réaliser 5 minutes de Wall Sit",unit:"min",target:5,step:1},
    ]
  },
  breach_pullups50:{
    id:"breach_boss_brise_chaines",name:"Le Brise-Chaînes",guards:[
      {id:"deliant",name:"Le Déliant",objective:"Effectuer 10 minutes de mobilité des épaules et du dos",unit:"min",target:10,step:5},
      {id:"descendeur",name:"Le Descendeur",objective:"Faire 25 tractions négatives",unit:"rep",target:25,step:5},
      {id:"suspendu",name:"Le Suspendu",objective:"Réaliser 2 minutes de dead hang",unit:"min",target:2,step:0.5},
    ]
  },
  breach_plank15:{
    id:"breach_boss_bastion",name:"Le Bastion",guards:[
      {id:"maitre_articulations",name:"Le Maître des Articulations",objective:"Faire 10 minutes de mobilité complète",unit:"min",target:10,step:5},
      {id:"broyeur",name:"Le Broyeur",objective:"Effectuer 100 crunches",unit:"rep",target:100,step:25},
      {id:"flanc_garde",name:"Le Flanc-Garde",objective:"Effectuer 50 répétitions de gainage oblique",unit:"rep",target:50,step:10},
    ]
  },
  breach_learning2h:{
    id:"breach_boss_archiviste",name:"L’Archiviste",guards:[
      {id:"scribe",name:"Le Scribe",objective:"Rédiger un résumé de 300 mots de ce que tu viens d’apprendre",unit:"mot",target:300,step:50},
      {id:"mnemarque",name:"Le Mnémarque",objective:"Réaliser 20 minutes de mémorisation",unit:"min",target:20,step:5},
      {id:"veilleur_muet",name:"Le Veilleur Muet",objective:"Garder le téléphone hors de portée et couper les notifications pendant 3 heures",unit:"h",target:3,step:1},
    ]
  },
  breach_reading1h:{
    id:"breach_boss_sage_dechu",name:"Le Sage Déchu",guards:[
      {id:"contemplateur",name:"Le Contemplateur",objective:"Méditer pendant 10 minutes",unit:"min",target:10,step:5},
      {id:"recitant",name:"Le Récitant",objective:"Restituer 10 idées de mémoire sans rouvrir le texte",unit:"idée",target:10,step:1},
      {id:"gardien_silence",name:"Le Gardien du Silence",objective:"Passer 30 minutes sans téléphone, musique, vidéo ni podcast",unit:"min",target:30,step:10},
    ]
  },
  breach_run10:{
    id:"breach_boss_arpenteur",name:"L’Arpenteur",guards:[
      {id:"eclaireur",name:"L’Éclaireur",objective:"Effectuer 5 minutes d’échauffement dynamique",unit:"min",target:5,step:1},
      {id:"cadenceur",name:"Le Cadenceur",objective:"Effectuer 100 jumping jacks",unit:"rep",target:100,step:25},
      {id:"recuperateur",name:"Le Récupérateur",objective:"Faire 10 minutes de marche ou de mobilité après la course",unit:"min",target:10,step:5},
    ]
  },
  breach_sprint10:{
    id:"breach_boss_predateur",name:"Le Prédateur",guards:[
      {id:"pisteur",name:"Le Pisteur",objective:"Effectuer 5 minutes d’échauffement dynamique",unit:"min",target:5,step:1},
      {id:"rabatteur",name:"Le Rabatteur",objective:"Effectuer 100 jumping jacks",unit:"rep",target:100,step:25},
      {id:"retour_chasse",name:"Le Retour de Chasse",objective:"Faire 10 minutes de marche ou de mobilité après la course",unit:"min",target:10,step:5},
    ]
  },
  breach_rope30:{
    id:"breach_boss_tisseur_orage",name:"Le Tisseur d’Orage",guards:[
      {id:"delieur_foudre",name:"Le Délieur de Foudre",objective:"Faire 5 minutes de mobilité des chevilles et des mollets",unit:"min",target:5,step:1},
      {id:"porte_tonnerre",name:"Le Porte-Tonnerre",objective:"Effectuer 100 élévations de mollets",unit:"rep",target:100,step:25},
      {id:"eclair",name:"L’Éclair",objective:"Effectuer 100 jumping jacks",unit:"rep",target:100,step:25},
    ]
  },
  breach_flex60:{
    id:"breach_boss_acrobate",name:"Le Métamorphe",guards:[
      {id:"delieur",name:"Le Délieur",objective:"Faire 5 minutes de mobilité corporelle",unit:"min",target:5,step:1},
      {id:"ombre",name:"L’Ombre",objective:"Réaliser 10 minutes de déplacement silencieux",unit:"min",target:10,step:5},
      {id:"funambule",name:"Le Funambule",objective:"Réaliser 10 minutes d’exercices d’équilibre et de coordination",unit:"min",target:10,step:5},
    ]
  },
  breach_martialflow60:{
    id:"breach_boss_acrobate_martial",name:"Le Shinobi",guards:[
      {id:"delieur_martial",name:"Le Délieur",objective:"Faire 5 minutes de mobilité corporelle",unit:"min",target:5,step:1},
      {id:"ombre_martiale",name:"L’Ombre",objective:"Réaliser 10 minutes de déplacement silencieux",unit:"min",target:10,step:5},
      {id:"funambule_martial",name:"Le Funambule",objective:"Réaliser 10 minutes d’exercices d’équilibre et de coordination",unit:"min",target:10,step:5},
    ]
  },
};

export {
  BREACH_COLOR,
  BREACH_LOOT_TEXT,
  BREACH_POOL,
  BREACH_RUPTURE_BOSSES
};
