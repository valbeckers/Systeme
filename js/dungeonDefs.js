// ─── DÉFINITIONS DES DONJONS ───────────────────────────────────────────────
// Ce fichier contient uniquement les données statiques des donjons et de leurs
// Boss de Rupture. Il ne dépend ni de Preact, ni de l’état de l’application,
// ni du stockage local.

// Donjons volontaires : 1 actif à la fois, 1/jour, 3/semaine, accès par clé. À l’expiration, fermeture simple.
// Ordre aligné sur les stats : Santé, Force, Esprit, Endurance, Agilité, Discipline.
const DUNGEONS = [
  {id:"alchemist", title:"Donjon de l’Alchimiste", short:"Alchimiste", stat:"Sante", icon:"🧪", color:"#ef4444", reward:{xp:2250,stat:"Sante",xp2:450,stat2:"Esprit"}, rooms:[
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
    {name:"Mémoire", desc:"10 min de rappel actif"},
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
    {name:"Animal flow", desc:"30 min"},
  ]},
  {id:"guardian", title:"Donjon du Gardien", short:"Gardien", stat:"Discipline", icon:"🛡️", color:"#c084fc", reward:{xp:2250,stat:"Discipline",xp2:450,stat2:"Esprit"}, rooms:[
    {name:"Capture mentale", desc:"Traiter, planifier ou supprimer 5 éléments de ta charge mentale"},
    {name:"Tâches repoussées", desc:"Terminer totalement 2 tâches repoussées"},
    {name:"Aucun contenu passif", desc:"2h"},
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
