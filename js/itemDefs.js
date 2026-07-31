// ─── DÉFINITIONS DES OBJETS ET TAUX DE LOOT ────────────────────────────────
// Ce fichier contient uniquement les données statiques de l’inventaire et les
// tables de probabilités. Il ne dépend ni de Preact, ni de l’état de
// l’application, ni du stockage local.

import { BREACH_LOOT_TEXT } from "./breachDefs.js";

const BASE_INVENTORY_ITEMS={
    codex:{name:"CODEX",short:"CODEX",emoji:"📖",action:"",desc:"Recueil permanent des règles et contenus de l’application.",obtain:[],permanent:true},
    regressionOrb:{name:"ORBE DE RÉGRESSION",short:"ORBE DE RÉGRESSION",emoji:"🔴",action:"ACTIVER",desc:"Permet de lancer une régression. Si plusieurs régressions existent, vous pourrez choisir laquelle activer.",obtain:[],permanent:true},
    debtAcknowledgement:{name:"RECONNAISSANCE DE DETTE",short:"RECONNAISSANCE DE DETTE",emoji:"📜",action:"UTILISER",desc:"Objet permanent permettant de créer une dette sur une quête éligible.",obtain:[],permanent:true},
    dungeonKey:{name:"CLÉ DE DONJON",short:"CLÉ DE DONJON",emoji:"🗝️",action:"UTILISER",desc:"Cette clé vous permet d’entrer dans n’importe quel donjon.",obtain:["Après avoir complété la quête urgente, toutes les quêtes journalières et toutes les quêtes bonus dans la même journée (Taux : 100 %).","Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %).","Après avoir complété un donjon (Taux : 10 %)."]},
    majorElixir:{name:"ÉLIXIR D’EXPÉRIENCE MAJEUR",short:"ÉLIXIR MAJEUR",emoji:"🧪",action:"CONSOMMER",pct:.20,desc:"Cet élixir vous permet de gagner 20 % d’XP en plus dans la statistique de votre choix pendant 24 h. Utilisez-le à bon escient !",obtain:["Après avoir complété toutes les quêtes journalières (Taux : 0,5 %).","Après avoir complété toutes les quêtes bonus (Taux : 0,5 %).","Après avoir complété une quête urgente (Taux : 0,5 %).","Après avoir accompli un nouveau record (Taux : 0,5 %).","Après avoir complété un donjon (Taux : 5 %).","Après avoir complété le Donjon de l’Alchimiste (Taux : 5 %)."]},
    minorElixir:{name:"ÉLIXIR D’EXPÉRIENCE MINEUR",short:"ÉLIXIR MINEUR",emoji:"🧪",action:"CONSOMMER",pct:.10,desc:"Cet élixir vous permet de gagner 10 % d’XP en plus dans la statistique de votre choix pendant 24 h. Utilisez-le à bon escient !",obtain:["Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %).","Après avoir complété un donjon (Taux : 100 %).","Après avoir complété le Donjon de l’Alchimiste (Taux : 10 %)."]},
    supremeElixir:{name:"ÉLIXIR D’EXPÉRIENCE MAGISTRAL",short:"ÉLIXIR MAGISTRAL",emoji:"🧪",action:"CONSOMMER",pct:.30,desc:"Cet élixir vous permet de gagner 30 % d’XP en plus pendant 24 h. Utilisez-le à bon escient !",obtain:["En fusionnant 5 Élixirs d’expérience mineurs via le Grimoire de transmutation (Taux : 100 %).","Après avoir complété toutes les quêtes journalières (Taux : 0,1 %).","Après avoir complété toutes les quêtes bonus (Taux : 0,1 %).","Après avoir complété une quête urgente (Taux : 0,1 %).","Après avoir accompli un nouveau record (Taux : 0,1 %).","Après avoir complété un donjon (Taux : 1 %).","Après avoir complété le Donjon de l’Alchimiste (Taux : 1 %)."]},
    transmutationGrimoire:{name:"GRIMOIRE DE TRANSMUTATION",short:"GRIMOIRE",emoji:"📔",action:"TRANSMUTER",desc:"Permet de fusionner cinq Élixirs d’expérience mineurs pour créer un Élixir d’expérience magistral.",obtain:["Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %).","Après avoir complété un donjon (Taux : 10 %).","Après avoir complété le Donjon de l’Alchimiste (Taux : 10 %)."]},
    destinyCompass:{name:"BOUSSOLE DU DESTIN",short:"BOUSSOLE DU DESTIN",emoji:"🧭",action:"ORIENTER",desc:"Permet de choisir la statistique de la prochaine quête urgente. La quête précise reste tirée aléatoirement dans la catégorie choisie. La Boussole doit être activée avant le reset, ne permet pas de répéter immédiatement la même quête et ne modifie pas le cycle anti-répétition des statistiques.",obtain:["Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %).","Après avoir complété un donjon (Taux : 10 %).","Après avoir complété le Donjon du Pèlerin (Taux : 10 %)."]},
    etherStopper:{name:"BOUCHON D’ÉTHER",short:"BOUCHON D’ÉTHER",emoji:"🔮",action:"SUSPENDRE",desc:"Met en pause la durée restante d’un élixir actif. L’élixir peut être réactivé manuellement avec exactement le temps qu’il lui restait. La suspension dure au maximum 24 h, puis l’élixir reprend automatiquement. Aucun autre élixir ne peut être activé pendant la suspension.",obtain:["Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %).","Après avoir complété un donjon (Taux : 10 %).","Après avoir complété le Donjon de l’Alchimiste (Taux : 10 %)."]},
    rerollToken:{name:"JETON DE RELANCE",short:"JETON DE RELANCE",emoji:"🔄",action:"INVOQUER",desc:"Après avoir terminé la quête urgente du jour, invoque immédiatement une seconde quête urgente. Cette quête accorde ses XP et ses objets normaux, ne peut pas être relancée et ne peut être invoquée qu’une fois par jour.",obtain:["Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %).","Après avoir complété un donjon (Taux : 10 %)."]},
    alchemicalCatalyst:{name:"CATALYSEUR ALCHIMIQUE",short:"CATALYSEUR ALCHIMIQUE",emoji:"⚗️",action:"PRÉPARER",desc:"Lors de la prochaine utilisation du Grimoire de transmutation, réduit le coût de cinq à trois Élixirs d’expérience mineurs. Le Catalyseur et le Grimoire sont tous les deux consommés au moment de la transmutation.",obtain:["Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %).","Après avoir complété un donjon (Taux : 10 %).","Après avoir complété le Donjon de l’Alchimiste (Taux : 10 %)."]},
    masterContract:{name:"CONTRAT DU MAÎTRE",short:"CONTRAT DU MAÎTRE",emoji:"📜",action:"UTILISER",desc:"Au lancement du prochain donjon, choisissez une contrainte supplémentaire parmi trois. Si le donjon est terminé, la récompense finale augmente de 20 %. Contraintes : délai réduit à 12 heures, objectifs multipliés par 1,5, ou boss remplacé par un Boss de Rupture.",obtain:["Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %).","Après avoir complété un donjon (Taux : 10 %).","Après avoir complété le Donjon du Guerrier (Taux : 10 %)."]},
    recordHammer:{name:"MARQUE DU DÉPASSEMENT",short:"MARQUE DU DÉPASSEMENT",emoji:"✨",action:"DESSINER",desc:"Permet de marquer un record comme objectif officiel de la semaine. Le battre avant la fin de semaine rapporte +500 XP. L’objet est perdu en cas d’échec.",obtain:["Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %).","Après avoir complété un donjon (Taux : 10 %).","Après avoir complété le Donjon du Guerrier (Taux : 10 %)."]},
    teleportCrystal:{name:"CRISTAL DE TÉLÉPORTATION",short:"CRISTAL DE TÉLÉPORTATION",emoji:"💠",action:"BRISER",desc:"Permet d’aller aider un pays voisin en se téléportant à la Brèche la plus proche. Si elle est refermée, vous obtenez l’XP et le butin habituels de la Brèche, puis choisissez un objet supplémentaire offert par le pays allié.",obtain:["Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %).","Après avoir complété un donjon (Taux : 10 %).","Après avoir complété le Donjon du Chasseur (Taux : 10 %)."]},
    invisibilityCape:{name:"POTION D’INVISIBILITÉ ÉPHÉMÈRE",short:"POTION D’INVISIBILITÉ",emoji:"🧪",action:"UTILISER",desc:"Permet de devenir invisible le temps de traverser une salle de donjon. La salle est considérée comme terminée, sans gain d’XP.",obtain:["Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %).","Après avoir complété un donjon (Taux : 10 %).","Après avoir complété le Donjon de l’Alchimiste (Taux : 10 %)."]},
    recoveryOintment:{name:"ONGUENT DE RÉCUPÉRATION",short:"ONGUENT DE RÉCUPÉRATION",emoji:"🧴",action:"UTILISER",desc:"Permet de passer une quête journalière ou bonus en cas de blessure ou de repos forcé. La quête est considérée comme validée, sans gain d’XP.",obtain:["Après avoir complété toutes les quêtes journalières (Taux : 1 %).","Après avoir complété toutes les quêtes bonus (Taux : 1 %).","Après avoir complété une quête urgente (Taux : 1 %).","Après avoir accompli un nouveau record (Taux : 1 %).","Après avoir complété un donjon (Taux : 10 %).","Après avoir complété le Donjon du Moine (Taux : 10 %)."]},
  };

// Toutes les récompenses non permanentes peuvent aussi être tirées après la
// fermeture d’une Brèche. La mention est ajoutée ici une seule fois, sans
// mutation ultérieure depuis l’interface.
export const INVENTORY_ITEMS=Object.fromEntries(
  Object.entries(BASE_INVENTORY_ITEMS).map(([id,item])=>[
    id,
    item.permanent
      ? item
      : {...item,obtain:[...(item.obtain||[]),BREACH_LOOT_TEXT]}
  ])
);

// Tirages indépendants après les quêtes journalières, bonus, urgentes et les
// nouveaux records. "key" désigne la Clé de Donjon, stockée hors inventaire.
export const STANDARD_ITEM_DROPS=[
  ["key",0.01],
  ["minorElixir",0.01],
  ["majorElixir",0.005],
  ["supremeElixir",0.001],
  ["transmutationGrimoire",0.01],
  ["masterContract",0.01],
  ["recordHammer",0.01],
  ["teleportCrystal",0.01],
  ["invisibilityCape",0.01],
  ["destinyCompass",0.01],
  ["etherStopper",0.01],
  ["rerollToken",0.01],
  ["alchemicalCatalyst",0.01],
  ["recoveryOintment",0.01]
];

// Tirages indépendants effectués après n’importe quel donjon terminé.
export const DUNGEON_GENERIC_DROPS=[
  ["key",0.10],
  ["minorElixir",1],
  ["majorElixir",0.05],
  ["supremeElixir",0.01],
  ["transmutationGrimoire",0.10],
  ["masterContract",0.10],
  ["recordHammer",0.10],
  ["teleportCrystal",0.10],
  ["invisibilityCape",0.10],
  ["destinyCompass",0.10],
  ["etherStopper",0.10],
  ["rerollToken",0.10],
  ["alchemicalCatalyst",0.10],
  ["recoveryOintment",0.10]
];

// Tirages supplémentaires propres au donjon terminé.
export const DUNGEON_SPECIFIC_DROPS={
  alchemist:[["etherStopper",0.10],["alchemicalCatalyst",0.10],["supremeElixir",0.01],["majorElixir",0.05],["minorElixir",0.10],["transmutationGrimoire",0.10],["invisibilityCape",0.10]],
  pilgrim:[["destinyCompass",0.10]],
  warrior:[["masterContract",0.10],["recordHammer",0.10]],
  hunter:[["teleportCrystal",0.10]],
  monk:[["recoveryOintment",0.10]],
  steward:[]
};
