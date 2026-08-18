// ─── DÉFINITIONS DES DONJONS ───────────────────────────────────────────────
// Ce fichier contient uniquement les données statiques des donjons.
// Il ne dépend ni de Preact, ni de l’état de l’application, ni du stockage local.

// Donjons volontaires : 1 actif à la fois, 1/jour, 3/semaine, accès par clé. À l’expiration, fermeture simple.
// Ordre aligné sur les stats : Santé, Force, Esprit, Endurance, Agilité, Discipline.
const DUNGEONS = [
  {id:"alchemist", title:"Donjon de l’Alchimiste", short:"Alchimiste", stat:"Sante", icon:"🧪", color:"#ef4444", reward:{xp:2250,stat:"Sante",xp2:450,stat2:"Esprit"}, rooms:[
    {name:"Hydratation", desc:"2 verres d’eau", masterClause:"Aucun soda/alcool de la journée"},
    {name:"Lumière naturelle", desc:"10min", masterClause:"Pas de téléphone ou de stimulation"},
    {name:"Nutrition", desc:"2 repas propres"},
    {name:"Cohérence cardiaque", desc:"10min"},
    {name:"Le Balrog de Morgoth", desc:"Douche froide · 5min"},
  ]},
  {id:"warrior", title:"Donjon du Guerrier", short:"Guerrier", stat:"Force", icon:"⚔️", color:"#fb923c", reward:{xp:2250,stat:"Force",xp2:450,stat2:"Discipline"}, rooms:[
    {name:"Pompes", desc:"100reps", masterClause:"30 sec max de repos entre les séries"},
    {name:"Abdos", desc:"150reps", masterClause:"30 sec max de repos entre les séries"},
    {name:"Squats", desc:"50reps", masterClause:"Exécution contrôlée, 3 secondes par répétition"},
    {name:"Gainage", desc:"5min", masterClause:"Chaque série doit durer au moins 1 min 30 sec"},
    {name:"Le Troll des Cavernes", desc:"Wall sit · 15min"},
  ]},
  {id:"monk", title:"Donjon du Moine", short:"Moine", stat:"Esprit", icon:"🧘🏻‍♂️", color:"#ec4899", reward:{xp:2250,stat:"Esprit",xp2:450,stat2:"Discipline"}, rooms:[
    {name:"Lecture", desc:"20min", masterClause:"30 min au lieu de 20 min"},
    {name:"Mémorisation", desc:"10min", masterClause:"15 min au lieu de 10 min"},
    {name:"Méditation", desc:"15min", masterClause:"Libre, sans guidage, musique ou téléphone"},
    {name:"Gratitude", desc:"Écrire 3 choses pour lesquelles je suis reconnaissant"},
    {name:"Jörmungandr", desc:"Apprentissage actif · 1h"},
  ]},
  {id:"pilgrim", title:"Donjon du Pèlerin", short:"Pèlerin", stat:"Endurance", icon:"🥾", color:"#22d3ee", reward:{xp:2250,stat:"Endurance",xp2:450,stat2:"Agilite"}, rooms:[
    {name:"Stepper", desc:"15min", masterClause:"Hand grips en même temps"},
    {name:"Escaliers", desc:"15 montées/descentes", masterClause:"Hand grips en même temps"},
    {name:"Jumping jacks", desc:"100reps", masterClause:"Doivent être réalisés d’une traite"},
    {name:"Fentes", desc:"50reps", masterClause:"Hand grips en même temps"},
    {name:"La Horde", desc:"Running · 30min"},
  ]},
  {id:"hunter", title:"Donjon du Chasseur", short:"Chasseur", stat:"Agilite", icon:"🏹", color:"#4ade80", reward:{xp:2250,stat:"Agilite",xp2:450,stat2:"Endurance"}, rooms:[
    {name:"Éveil corporel", desc:"5min", masterClause:"10 min au lieu de 5 min et aucune stimulation"},
    {name:"Footwork", desc:"10min", masterClause:"15 min au lieu de 10 min"},
    {name:"Équilibre", desc:"10min"},
    {name:"Déplacements silencieux", desc:"10min"},
    {name:"Le Changeforme", desc:"Animal flow · 30min"},
  ]},
  {id:"guardian", title:"Donjon du Gardien", short:"Gardien", stat:"Discipline", icon:"🛡️", color:"#c084fc", reward:{xp:2250,stat:"Discipline",xp2:450,stat2:"Esprit"}, rooms:[
    {name:"Charge mentale", desc:"Traiter, planifier ou supprimer 5 éléments", masterClause:"2 éléments doivent être traités immédiatement"},
    {name:"Tâches repoussées", desc:"Terminer 2 tâches repoussées"},
    {name:"Aucun contenu passif", desc:"2h"},
    {name:"Rangement", desc:"10 objets", masterClause:"Ranger et nettoyer complètement une pièce"},
    {name:"Le Détraqueur", desc:"Bloc profond · 45min"},
  ]},
  {id:"steward", title:"Donjon de l’Intendant", short:"Intendant", stat:"Discipline", icon:"🧹", color:"#c084fc", reward:{xp:2250,stat:"Discipline",xp2:450,stat2:"Sante"}, rooms:[
    {name:"Linge", desc:"15min"},
    {name:"Rangement", desc:"15min", masterClause:"Ranger et nettoyer complètement une pièce"},
    {name:"Poussière", desc:"15min"},
    {name:"Aspirer", desc:"20min"},
    {name:"Le Grand Gobelin", desc:"Récurer · 30min"},
  ]},
];

export { DUNGEONS };
