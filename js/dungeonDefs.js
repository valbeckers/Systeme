// ─── DÉFINITIONS DES DONJONS ───────────────────────────────────────────────
// Ce fichier contient uniquement les données statiques des donjons et de leurs
// Boss de Rupture. Il ne dépend ni de Preact, ni de l’état de l’application,
// ni du stockage local.

// Donjons volontaires : 1 actif à la fois, 1/jour, 3/semaine, accès par clé. À l’expiration, fermeture simple.
// Ordre aligné sur les stats : Santé, Force, Esprit, Endurance, Agilité, Discipline.
const DUNGEONS = [
  {id:"alchemist", title:"Donjon de l’Alchimiste", short:"Alchimiste", stat:"Sante", icon:"🧪", color:"#ef4444", reward:{xp:2250,stat:"Sante",xp2:450,stat2:"Esprit"}, rooms:[
    {name:"Hydratation", desc:"2 verres d’eau"},
    {name:"Lumière naturelle", desc:"10min"},
    {name:"Nutrition", desc:"2 repas propres"},
    {name:"Cohérence cardiaque", desc:"10min"},
    {name:"Le Golem de Lave", desc:"Douche froide · 3min"},
  ]},
  {id:"warrior", title:"Donjon du Guerrier", short:"Guerrier", stat:"Force", icon:"⚔️", color:"#fb923c", reward:{xp:2250,stat:"Force",xp2:450,stat2:"Discipline"}, rooms:[
    {name:"Pompes", desc:"100reps"},
    {name:"Abdos", desc:"150reps"},
    {name:"Squats", desc:"50reps"},
    {name:"Gainage", desc:"5min"},
    {name:"Le Piège Mécanique", desc:"Wall sit · 10min"},
  ]},
  {id:"monk", title:"Donjon du Moine", short:"Moine", stat:"Esprit", icon:"🧘🏻‍♂️", color:"#ec4899", reward:{xp:2250,stat:"Esprit",xp2:450,stat2:"Discipline"}, rooms:[
    {name:"Lecture", desc:"20min"},
    {name:"Apprentissage actif", desc:"10min"},
    {name:"Mémorisation", desc:"10min"},
    {name:"Méditation", desc:"15min"},
    {name:"Le Doute", desc:"Écrire 3 choses pour lesquelles je suis reconnaissant"},
  ]},
  {id:"pilgrim", title:"Donjon du Pèlerin", short:"Pèlerin", stat:"Endurance", icon:"🥾", color:"#22d3ee", reward:{xp:2250,stat:"Endurance",xp2:450,stat2:"Agilite"}, rooms:[
    {name:"Stepper", desc:"15min"},
    {name:"Escaliers", desc:"15 montées/descentes"},
    {name:"Jumping jacks", desc:"100reps"},
    {name:"Fentes", desc:"50reps"},
    {name:"L'Effondrement", desc:"Running · 30min"},
  ]},
  {id:"hunter", title:"Donjon du Chasseur", short:"Chasseur", stat:"Agilite", icon:"🏹", color:"#4ade80", reward:{xp:2250,stat:"Agilite",xp2:450,stat2:"Endurance"}, rooms:[
    {name:"Éveil corporel", desc:"5min"},
    {name:"Footwork", desc:"10min"},
    {name:"Équilibre", desc:"10min"},
    {name:"Déplacements silencieux", desc:"10min"},
    {name:"Le Changeforme", desc:"Animal flow · 30min"},
  ]},
  {id:"guardian", title:"Donjon du Gardien", short:"Gardien", stat:"Discipline", icon:"🛡️", color:"#c084fc", reward:{xp:2250,stat:"Discipline",xp2:450,stat2:"Esprit"}, rooms:[
    {name:"Charge mentale", desc:"Traiter, planifier ou supprimer 5 éléments"},
    {name:"Tâches repoussées", desc:"Terminer 2 tâches repoussées"},
    {name:"Aucun contenu passif", desc:"2h"},
    {name:"Rangement", desc:"10 objets"},
    {name:"L'Interruption Continue", desc:"Bloc profond · 45min"},
  ]},
  {id:"steward", title:"Donjon de l’Intendant", short:"Intendant", stat:"Discipline", icon:"🧹", color:"#c084fc", reward:{xp:2250,stat:"Discipline",xp2:450,stat2:"Sante"}, rooms:[
    {name:"Linge", desc:"15min"},
    {name:"Rangement", desc:"15min"},
    {name:"Poussière", desc:"15min"},
    {name:"Aspirer", desc:"20min"},
    {name:"Le Mutagène", desc:"Récurer · 30min"},
  ]},
];

// Boss alternatifs utilisés uniquement par la contrainte « Boss de Rupture » du Contrat du Maître.
const DUNGEON_RUPTURE_BOSSES = {
  alchemist:[
    {id:"alchemist_putride",name:"L’Alchimiste Putride",objective:"2 repas équilibrés consécutifs, sans sucre transformé, junk-food ni écran"},
    {id:"alchemist_noir",name:"L’Alchimiste Noir",objective:"Journée de purification : 2 L d’eau répartis avant 18 h et 2 repas propres"},
    {id:"alchemist_dechu",name:"L’Alchimiste Déchu",objective:"30 min de lumière naturelle"},
    {id:"alchemist_corrompu",name:"L’Alchimiste Corrompu",objective:"30 min de marche en extérieur"},
  ],
  warrior:[
    {id:"warrior_berserker",name:"Le Berserker",objective:"200 pompes réparties dans la journée"},
    {id:"warrior_colosse",name:"Le Colosse",objective:"100 squats + 100 fentes"},
    {id:"warrior_gladiateur",name:"Le Gladiateur",objective:"30 min de shadow boxing"},
    {id:"warrior_titan",name:"Le Titan",objective:"15 min de Wall Sit cumulées"},
  ],
  pilgrim:[
    {id:"pilgrim_nomade",name:"Le Nomade",objective:"30 min de marche cumulées"},
    {id:"pilgrim_voyageur_perdu",name:"Le Voyageur Perdu",objective:"Atteindre 10 000 pas"},
    {id:"pilgrim_predateur",name:"Le Prédateur",objective:"20 min de corde à sauter"},
    {id:"pilgrim_messager",name:"Le Messager",objective:"Courir 7 km"},
  ],
  hunter:[
    {id:"hunter_rodeur",name:"Le Rôdeur",objective:"10 min de déplacements latéraux rapides"},
    {id:"hunter_fauve",name:"Le Fauve",objective:"20 min de footwork"},
    {id:"hunter_traqueur",name:"Le Traqueur",objective:"30 allers-retours d’escaliers"},
    {id:"hunter_acrobate",name:"L’Acrobate",objective:"30 min d’Animal Flow ou de mobilité active continue"},
  ],
  monk:[
    {id:"monk_sage_dechu",name:"Le Sage Déchu",objective:"30 min de lecture profonde sans interruption"},
    {id:"monk_veilleur",name:"Le Veilleur",objective:"30 min de méditation guidée"},
    {id:"monk_ombre_interieure",name:"L’Ombre Intérieure",objective:"45 min de silence total, sans téléphone, musique, vidéo, podcast ni conversation"},
    {id:"monk_scribe",name:"Le Scribe",objective:"Rédiger un résumé de 300 mots d’une lecture ou d’un podcast, sans consulter la source pendant la rédaction"},
  ],
  guardian:[
    {id:"guardian_commandant",name:"Le Commandant",objective:"Terminer entièrement 3 tâches repoussées"},
    {id:"guardian_sentinelle",name:"La Sentinelle",objective:"Ranger entièrement une pièce"},
    {id:"guardian_stratege",name:"Le Stratège",objective:"Planifier précisément la journée suivante puis commencer immédiatement la première tâche"},
    {id:"guardian_dechu",name:"Le Gardien Déchu",objective:"60 min de Deep Work sans interruption volontaire"},
  ],
  steward:[
    {id:"steward_negligent",name:"Le Négligent",objective:"Ranger 20 objets"},
    {id:"steward_poussiere",name:"Le Seigneur de la Poussière",objective:"Faire la poussière pendant 30 min"},
    {id:"steward_encombreur",name:"L’Encombreur",objective:"Ranger entièrement une pièce"},
    {id:"steward_crasse",name:"Le Maître de la Crasse",objective:"60 min de nettoyage domestique continu"},
  ],
};

export {
  DUNGEONS,
  DUNGEON_RUPTURE_BOSSES
};
