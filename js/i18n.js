// English display layer. Internal ids and saved data deliberately stay unchanged.
const originalH=window.preact.h;

const EXACT=new Map([
  // Core navigation and stats
  ["Système","System"],["Accueil","Home"],["Quêtes","Quests"],["Inventaire","Inventory"],["Historique","History"],["Réglages","Settings"],
  ["Santé","Health"],["Sante","Health"],["Force","Strength"],["Esprit","Mind"],["Endurance","Stamina"],["Agilité","Agility"],["Agilite","Agility"],["Discipline","Discipline"],
  ["Cette semaine","This week"],["Semaine dernière","Last week"],["Aujourd'hui","Today"],["Aujourd’hui","Today"],
  ["Quête","Quest"],["HEBDO","Weekly"],["BONUS","Bonus"],["Succès","Success"],["Échec","Failure"],

  // Quest names
  ["Hydratation","Hydration"],["Dormir 8h","8 hours sleep"],["Pecs & Triceps","Chest & triceps"],["Abdos","Abs"],["Jambes","Legs"],["Mollets","Calf raises"],
  ["Entretiens/RDV","Interviews/Meetings"],["Actions commerciales","Sales actions"],["Entretiens/RDV S+1","Interviews/Meetings W+1"],
  ["Lecture","Reading"],["Méditation","Meditation"],["Running","Running"],["Rando","Hike"],["Marche","Walk"],["Équilibre","Balance"],
  ["Lumière naturelle","Daylight"],["Douche froide · 3min","Cold shower · 3 min"],["Douche froide · 10min","Cold shower · 10 min"],
  ["Grip","Grip"],["Wall-sit","Wall sit"],["Tractions","Pull-ups"],["Tractions négatives","Negative pull-ups"],["Tractions australiennes","Australian pull-ups"],["Dead hang","Dead hang"],
  ["Cohérence cardiaque","Cardiac coherence"],["Mémorisation","Memory training"],["Escaliers","Stairs"],["Shadow boxing","Shadow boxing"],["Jumping jacks","Jumping jacks"],
  ["Animal flow","Animal flow"],["Flow martial","Martial flow"],["Déplacements silencieux","Silent movement"],["Accomplir 1 tâche repoussée","Complete 1 delayed task"],["Aspirer","Vacuuming"],
  ["Pompes","Push-ups"],["Pompes diamant","Diamond push-ups"],["Dips","Dips"],["Crunches","Crunches"],["Gainage","Plank"],["Gainage oblique","Side plank"],
  ["Levées de jambes","Leg raises"],["Squats","Squats"],["Fentes","Lunges"],["Élévations de mollets","Calf raises"],
  ["Pecs & Triceps - Pompes","Chest & triceps - Push-ups"],["Pecs & Triceps - Dips","Chest & triceps - Dips"],
  ["Dos & Biceps - Tractions","Back & biceps - Pull-ups"],["Dos & Biceps - Tractions négatives","Back & biceps - Negative pull-ups"],["Dos & Biceps - Tractions australiennes","Back & biceps - Australian pull-ups"],
  ["Abdos - Crunches","Abs - Crunches"],["Abdos - Gainage","Abs - Plank"],["Abdos - Levées de jambes","Abs - Leg raises"],
  ["Jambes - Squats","Legs - Squats"],["Jambes - Mollets","Legs - Calf raises"],["Jambes - Fentes","Legs - Lunges"],

  // Emergency quests
  ["Lumière naturelle · 30min","Daylight · 30 min"],["Manger 5 fruits et légumes","Eat 5 portions of fruit and vegetables"],["Pas de junk-food","No junk food"],
  ["Manger 2 repas équilibrés","Eat 2 balanced meals"],["Aucun sucre transformé","No processed sugar"],["Manger 2 repas sans stimulation","Eat 2 distraction-free meals"],
  ["Cohérence cardiaque · 30min","Cardiac coherence · 30 min"],["Mémorisation · 30min","Memory training · 30 min"],["Silence · 30min","Silence · 30 min"],
  ["Pas d'écran · 3h","No screens · 3 hours"],["Escaliers · 30 montées/descentes","Stairs · 30 round trips"],["Marche · 30min","Walk · 30 min"],
  ["Shadow boxing · 30min","Shadow boxing · 30 min"],["Animal flow · 30min","Animal flow · 30 min"],["Flow martial · 30min","Martial flow · 30 min"],
  ["Déplacements silencieux · 30min","Silent movement · 30 min"],["Footwork · 15min","Footwork · 15 min"],["Aucun contenu passif","No passive content"],
  ["Accomplir 3 tâches repoussées","Complete 3 delayed tasks"],["Ranger ou jeter 10 objets","Organise or discard 10 items"],
  ["Mineure","Minor"],["Majeure","Major"],["Légendaire","Legendary"],

  // Dungeon names and rooms
  ["Donjon de l’Alchimiste","Alchemist’s dungeon"],["Alchimiste","Alchemist"],["Donjon du Guerrier","Warrior’s dungeon"],["Guerrier","Warrior"],
  ["Donjon du Moine","Monk’s dungeon"],["Moine","Monk"],["Donjon du Pèlerin","Pilgrim’s dungeon"],["Pèlerin","Pilgrim"],
  ["Donjon du Chasseur","Hunter’s dungeon"],["Chasseur","Hunter"],["Donjon du Gardien","Guardian’s dungeon"],["Gardien","Guardian"],
  ["Donjon de l’Intendant","Steward’s dungeon"],["Intendant","Steward"],["Nutrition","Nutrition"],["Gratitude","Gratitude"],
  ["Éveil corporel","Body activation"],["Charge mentale","Mental load"],["Tâches repoussées","Delayed tasks"],["Rangement","Tidying up"],
  ["Linge","Laundry"],["Poussière","Dusting"],["Récurer","Deep cleaning"],["Apprentissage actif","Active learning"],["Bloc profond","Deep work session"],

  // Portal names and bosses
  ["Portail","Portal"],["Portails","Portals"],["PORTAIL ACTIF","Active portal"],["PORTAIL INACTIF","Inactive portal"],["PORTAIL ALLIÉ","Allied portal"],
  ["PORTAIL EN RUPTURE","Portal break"],["RUPTURE DE PORTAIL","Portal break"],["PORTAIL FERMÉ","Portal cleared"],["RUPTURE MAÎTRISÉE","Portal break contained"],
  ["Garde rapprochée","Vanguard"],["GARDE RAPPROCHÉE","Vanguard"],
  ["Antares, Monarque des Dragons","Antares, Monarch of Dragons"],["Baran, Monarque des Démons","Baran, Monarch of Demons"],
  ["Sillad, Monarque des Glaces","Sillad, Monarch of Frost"],["Rakan, Monarque des Bêtes","Rakan, Monarch of Beasts"],
  ["Le Roi-Sorcier d’Angmar","The Witch-king of Angmar"],["Khamûl, l’Ombre de l’Orient","Khamûl, the Shadow of the East"],["Suladàn, l’Immortel","Suladàn, the Immortal"],
  ["Le Colosse","The Colossus"],["La Gorgone","The Gorgon"],["Le Golem du Soléaire","The Solar Golem"],["Le Piège Mécanique","The Mechanical Trap"],
  ["Le Minotaure","The Minotaur"],["La Harpie","The Harpy"],["Le Piège de Roches","The Rock Trap"],["Le Cyclope","The Cyclops"],["Le Ver Pourpre","The Purple Worm"],["Le Naga","The Naga"],
  ["L’Archiviste Noir","The Dark Archivist"],["Le Scribe Déchu","The Fallen Scribe"],["Le Détraqueur","The Dementor"],["Le Palantír","The Palantír"],
  ["Le Sage Déchu","The Fallen Sage"],["La Chimère","The Chimera"],["La Gargouille","The Gargoyle"],["Le Satyre","The Satyr"],["Le Draugr","The Draugr"],
  ["Le Warg Alpha","The Alpha Warg"],["Le Léviathan","The Leviathan"],["Le Métamorphe","The Shapeshifter"],["Le Doyen des Invisibles","The Elder of the Unseen"],
  ["Le Djinn des Vents","The Djinn of Winds"],["Le Shinobi","The Shinobi"],["Le Balrog de Morgoth","Morgoth’s Balrog"],["Le Troll des Cavernes","The Cave Troll"],
  ["La Horde","The Horde"],["Le Changeforme","The Shapeshifter"],["Le Grand Gobelin","The Great Goblin"],

  // Inventory items and actions
  ["ORBE DE RÉGRESSION","Regression orb"],["RECONNAISSANCE DE DETTE","Acknowledgement of debt"],["CLÉ DE DONJON","Dungeon key"],
  ["ÉLIXIR D’EXPÉRIENCE MINEUR","Minor experience elixir"],["ÉLIXIR MINEUR","Minor elixir"],["ÉLIXIR D’EXPÉRIENCE MAJEUR","Major experience elixir"],["ÉLIXIR MAJEUR","Major elixir"],
  ["ÉLIXIR D’EXPÉRIENCE MAGISTRAL","Supreme experience elixir"],["ÉLIXIR MAGISTRAL","Supreme elixir"],["GRIMOIRE DE L’ALCHIMISTE","Alchemist’s grimoire"],
  ["BOUSSOLE DU DESTIN","Compass of fate"],["BOUCHON D’ÉTHER","Ether seal"],["CARTE DES PROFONDEURS","Map of the depths"],["JETON DE RELANCE","Reroll token"],
  ["RUNE DE RÉÉCRITURE","Rune of rewriting"],["CATALYSEUR ALCHIMIQUE","Alchemical catalyst"],["CONTRAT DU MAÎTRE","Master’s contract"],
  ["MARQUE DU DÉPASSEMENT","Spark of transcendence"],["ÉTINCELLE DE DÉPASSEMENT","Spark of transcendence"],["CRISTAL DE TÉLÉPORTATION","Teleportation crystal"],
  ["POTION D’INVISIBILITÉ ÉPHÉMÈRE","Temporary invisibility potion"],["POTION D’INVISIBILITÉ","Invisibility potion"],["ONGUENT DE RÉCUPÉRATION","Recovery ointment"],
  ["BALANCE DES CONTREPARTIES","Balance of exchange"],["ACTIVER","Activate"],["UTILISER","Use"],["CONSOMMER","Consume"],["TRANSMUTER","Transmute"],
  ["ORIENTER","Set direction"],["SUSPENDRE","Suspend"],["DÉPLIER","Unfold"],["INVOQUER","Summon"],["TRACER","Draw"],["PRÉPARER","Prepare"],["DESSINER","Draw"],["BRISER","Shatter"],

  // Mantras
  ["Accepte ce que tu ne peux contrôler.","Accept what you cannot control."],["Mets de l'ordre dans ce que tu maîtrises.","Bring order to what you can control."],
  ["Fais toujours de ton mieux.","Always do your best."],["N'en fais jamais une histoire personnelle.","Never take it personally."],["Observe, vérifie, puis agis.","Observe, verify, then act."],
  ["Agis pour toi-même, pas pour la reconnaissance d'autrui.","Act for yourself, not for the approval of others."],["Concentre-toi sur l'essentiel.","Focus on what truly matters."],
  ["Aie toujours une parole impeccable.","Always be impeccable with your word."],["Tiens-toi droit.","Stand tall."],["Assume tes responsabilités.","Take responsibility."],
  ["Apprécie les choses simples de la vie.","Appreciate the simple things in life."],

  // Common standalone interface labels
  ["Quêtes journalières","Daily quests"],["Quêtes hebdomadaires","Weekly quests"],["Quêtes bonus","Bonus quests"],["Quêtes urgentes","Emergency quests"],["Quête urgente","Emergency quest"],
  ["Régressions","Regressions"],["Donjons","Dungeons"],["Donjon","Dungeon"],["Objectif","Objective"],["Récompense","Reward"],["Récompenses","Rewards"],
  ["Fermer","Close"],["Continuer","Continue"],["Terminer","Done"],["Choisir","Select"],["Confirmer","Confirm"],["Annuler","Cancel"],["Échanger","Exchange"],["Restaurer","Restore"],
  ["Exporter","Export"],["Importer","Import"],["Actualiser l'app","Reload app"],["Importer des données","Import data"],["Sauvegarde / Restauration","Backup / Restore"],
  ["XP DU JOUR","Today’s XP"],["TOTAL","Total"],["STREAK","Streak"],["ÉLAN","Momentum"],["INERTIE","Inertia"],["RESTANTE","Remaining"],["RESTANTES","Remaining"],
  ["Rang actuel","Current rank"],["Rang suivant","Next rank"],["Niveau max","Max level"],["Prestige","Prestige"],["Ascension disponible !","Ascension available!"],
  ["Montée en Ascension","Ascend"],["Caractéristiques","Attributes"],["Niveau global","Global level"],["Équilibre des stats","Stat balance"],["Chemin vers le rang S","Path to S rank"],
  ["Activité de la semaine","This week’s activity"],["Records personnels","Personal records"],["Aucune activité cette semaine","No activity this week"],
  ["Aucun XP gagné aujourd’hui.","No XP earned today."],["Aucune quête bonus sélectionnée.","No bonus quest selected."],["Chargement du défi...","Loading challenge..."],
  ["Afficher le détail de l’XP du jour","Show today’s XP breakdown"],["Corriger les données du jour","Edit today’s data"],
  ["Données de sauvegarde...","Backup data..."],["Colle ici les données exportées de ton Système.","Paste your exported System data here."],["Données copiées","Data copied"],
  ["Disponible","Available"],["Déjà lancé","Already started"],["Limite hebdo","Weekly limit"],["Verrouillé","Locked"],
  ["Aucune clé disponible.","No key available."],["Limite hebdomadaire atteinte.","Weekly limit reached."],["Aucun donjon n’est actuellement actif.","No dungeon is currently active."],
  ["Aucun choix disponible.","No option available."],["Aucun exemplaire disponible.","No copy available."],["Aucun élixir n’est actuellement actif.","No elixir is currently active."],
  ["Aucune quête urgente active à remplacer.","No active emergency quest to replace."],["Aucune quête éligible incomplète aujourd’hui.","No eligible incomplete quest today."],
  ["Aucune quête journalière ou bonus active et incomplète ne peut être passée.","No active incomplete daily or bonus quest can be skipped."],
  ["Aucun portail actif n'a été détecté à proximité.","No active portal was detected nearby."],
  ["CHOISIR UNE QUÊTE","Select a quest"],["CHOISIR UNE RÉGRESSION","Select a regression"],["CHOISIR UN RECORD","Select a record"],["CRÉER UNE DETTE","Create a debt"],["PASSER UNE SALLE","Skip a room"],
  ["DÉPLIER LA CARTE","Unfold the map"],["RÉCOMPENSE DE RANG","Rank reward"],["ANOMALIE DÉTECTÉE","Anomaly detected"],["CLAUSE DU MAÎTRE RÉVÉLÉE","Master’s clause revealed"],
  ["BONUS MASQUÉS / CONTEXTUELS","Hidden / contextual bonuses"],["OBJET COMPLÉMENTAIRE DÉTECTÉ","Compatible item detected"],["CONTRAT DU MAÎTRE DISPONIBLE","Master’s contract available"],
  ["DONJON OUVERT","Dungeon open"],["DONJON FERMÉ","Dungeon closed"],["PORTAIL ALLIÉ ACTIF","Active allied portal"],["MAÎTRISER LA RUPTURE ✓","Contain the portal break ✓"],
  ["CAP ×2 ATTEINT","×2 cap reached"],["CLAUSE RÉVÉLÉE","Clause revealed"],["STREAK PRÉSERVÉ","Streak preserved"],["DETTE REMBOURSÉE","Debt repaid"],
  ["ÉVOLUTION DE RANG","Rank up"],["PACTE SCELLÉ !","Pact sealed!"],["OBJET OBTENU !","Item acquired!"],["DROP RARE OBTENU !","Rare drop acquired!"],
  ["CADEAU DU PAYS ALLIÉ","Allied country’s gift"],["CADEAU ALLIÉ REÇU","Allied gift received"],["QUANTITÉ : ","Quantity: "],["PAUSE","Paused"],
  ["Confirmer la régression ?","Confirm regression?"],["Cette action est irréversible.","This action cannot be undone."],["Appliquer le malus","Apply penalty"],
  ["Créer la dette","Create debt"],["Passer la quête","Skip quest"],["Passer la salle","Skip room"],["Signer le contrat","Sign contract"],["Continuer sans la Carte","Continue without the map"],
  ["Par quantité","By quantity"],["En échange :","In exchange:"],["Contrainte spéciale","Special constraint"],["Salle verrouillée","Locked room"],
  ["La victoire n’a pas été enregistrée.","The victory was not recorded."],["La limite de trois donjons cette semaine est atteinte.","The limit of three dungeons this week has been reached."],
  ["Limite atteinte : 3 donjons ont déjà été lancés cette semaine.","Limit reached: 3 dungeons have already been started this week."],
  ["L’accès est ouvert, mais le donjon ne peut pas être lancé actuellement.","Access is open, but the dungeon cannot currently be started."],
  ["Choisissez 2 objets. Vous pouvez choisir deux fois le même objet.","Select 2 items. You may select the same item twice."],
  ["Choisissez librement un objet non permanent offert par le pays allié.","Select any non-permanent item offered by the allied country."],
  ["Choisissez l’objet que la Balance vous accordera en échange des 3 sacrifices.","Select the item the Balance will grant in exchange for the 3 sacrifices."],
  ["Pour vous remercier, le pays allié vous offre l’objet de votre choix.","As thanks, the allied country offers you an item of your choice."],
  ["Choisissez la statistique de la prochaine quête urgente. La quête précise restera aléatoire et le cycle anti-répétition actuel ne sera pas modifié.","Choose the attribute of the next emergency quest. The exact quest will remain random and the current anti-repeat cycle will not change."],
  ["Choisissez la statistique du prochain donjon. Si plusieurs donjons correspondent à cette statistique, le donjon précis restera tiré au sort.","Choose the attribute of the next dungeon. If several dungeons match it, the exact dungeon will remain random."],
  ["Utilise une Clé de Donjon depuis ton inventaire pour ouvrir l’accès.","Use a dungeon key from your inventory to unlock access."],
  ["Tri · Par quantité","Sort · By quantity"],["Tri · Par nom","Sort · By name"],["Par nom","By name"],
  ["Succès ✓","Success ✓"],["✘ Échec","✘ Failure"],["× Échec","× Failure"],
  ["JOURS DE STREAK","Streak days"],["OBJECTIF HEBDOMADAIRE ATTEINT","Weekly objective reached"],
  ["RUPTURE DE DONJON","Dungeon break"],["QUÊTE URGENTE COMPLÉTÉE","Emergency quest completed"],["QUÊTE URGENTE COMPLÉTÉE !","Emergency quest completed!"],
  ["PORTAIL FERMÉ !","Portal cleared!"],["RUPTURE MAÎTRISÉE !","Portal break contained!"],
  ["Faire 10 minutes de mobilité complète","Do 10 minutes of full-body mobility"],["Réaliser 5 minutes de Wall Sit","Do 5 minutes of wall sit"],
  ["Effectuer 10 minutes de mobilité des épaules et du dos","Do 10 minutes of shoulder and back mobility"],
  ["Boss objective : Pompes · 500reps","Boss objective: Push-ups · 500 reps"],["Boss objective : Tractions · 50reps","Boss objective: Pull-ups · 50 reps"],
  ["Boss objective : Gainage · 20min","Boss objective: Plank · 20 min"],["Boss objective : Squats · 250reps","Boss objective: Squats · 250 reps"],
  ["Boss objective : Douche froide · 10min","Boss objective: Cold shower · 10 min"],
  ["CHOISIR LES QUÊTES BONUS","Select bonus quests"],["CHOISIR UNE STATISTIQUE","Select an attribute"],["CHOISIR 3 CONTREPARTIES","Select 3 sacrifices"],["CHOISIR LA CONTREPARTIE","Select the reward"],
  ["CONTINUER SANS CET OBJET","Continue without this item"],["ENTRER DANS LE DONJON","Enter the dungeon"],["ENTRER DANS LE DONJON ?","Enter the dungeon?"],
  ["OBJECTIF DU BOSS","Boss objective"],["OBJET OFFERT","Gift item"],["SALLES DU DONJON — ","Dungeon rooms — "],["DOUBLE DONJON","Double dungeon"],
  ["CARTE DES PROFONDEURS DISPONIBLE","Map of the depths available"],["CATALYSEUR ALCHIMIQUE DISPONIBLE","Alchemical catalyst available"],["UTILISER LE CATALYSEUR","Use catalyst"],
  ["Totaux depuis le début","All-time totals"],["Tout sélectionner","Select all"],["Ouvrir les réglages","Open settings"],
  ["TOTAUX DEPUIS LE DÉBUT","All-time totals"],["APPLIQUER","Apply"],["Validation simple","Single completion"],
  ["PECS & TRICEPS","CHEST & TRICEPS"],["verre","glass"],["verres","glasses"],
  ["Termine toutes les salles pour accéder au boss","Clear every room to reach the boss"],["Venez à bout du nouveau Boss pour sortir du donjon","Defeat the new boss to leave the dungeon"],
  ["Tous les objectifs du donjon sont multipliés par 1,5.","All dungeon objectives are multiplied by 1.5."],["Une contrainte spéciale s’applique à cette salle.","A special constraint applies to this room."],
  ["10 min au lieu de 5 min et aucune stimulation","10 min instead of 5 min with no stimulation"],
  ["Terminez d’abord la quête urgente actuellement active.","Complete the currently active emergency quest first."],
  ["La quête urgente du jour doit être terminée avant d’utiliser le Jeton.","Today’s emergency quest must be completed before using the token."],
  ["La quantité manquante sera ajoutée à demain et devra être remboursée avant le reset suivant. Cette dette ne pourra pas être reportée.","The missing amount will be added to tomorrow and must be repaid before the following reset. This debt cannot be postponed."],
  ["La statistique sera tirée au sort, puis le donjon sera tiré parmi ceux de cette statistique. Êtes-vous certain de vouloir entrer ?","An attribute will be drawn at random, followed by a matching dungeon. Are you sure you want to enter?"],
  ["Signer le Contrat du Maître pour le prochain donjon ? La contrainte sera tirée au sort et restera cachée jusqu’au moment où elle s’activera.","Sign the Master’s contract for the next dungeon? The constraint will be drawn at random and remain hidden until it activates."],
  ["Déplier la Carte des profondeurs pour choisir la statistique du prochain donjon ?","Unfold the Map of the depths to choose the next dungeon’s attribute?"],
  ["Briser le Cristal de téléportation pour rejoindre un pays voisin et ouvrir un portail aléatoire ?","Shatter the teleportation crystal to travel to a neighbouring country and open a random portal?"],
  ["Tracer la Rune de Réécriture ? La quête urgente active sera remplacée par une nouvelle quête urgente aléatoire. La Rune sera consommée.","Draw the Rune of rewriting? The active emergency quest will be replaced with a new random emergency quest. The rune will be consumed."],
  ["Utiliser la Balance des contreparties pour sacrifier 3 objets différents et choisir 1 nouvel objet ?","Use the Balance of exchange to sacrifice 3 different items and choose 1 new item?"],
  ["Une reconnaissance de dette a déjà été utilisée aujourd’hui.","An acknowledgement of debt has already been used today."],["Une régression a déjà été déclarée aujourd’hui.","A regression has already been declared today."],
  ["Un Jeton de relance a déjà été utilisé aujourd’hui.","A reroll token has already been used today."],["Un accès au donjon est déjà ouvert.","Dungeon access is already open."],
  ["Un donjon a déjà été lancé aujourd’hui.","A dungeon has already been started today."],["Un donjon est déjà actif.","A dungeon is already active."],
  ["Un donjon est déjà actif. La Carte des profondeurs doit être utilisée avant le prochain lancement.","A dungeon is already active. The Map of the depths must be used before the next start."],
  ["Un Contrat du Maître est déjà préparé pour le prochain donjon.","A Master’s contract is already prepared for the next dungeon."],
  ["Un Catalyseur alchimique est déjà préparé pour la prochaine transmutation.","An alchemical catalyst is already prepared for the next transmutation."],
  ["Un élixir est actuellement suspendu. Réactivez-le avant d’en consommer un autre.","An elixir is currently paused. Resume it before consuming another one."],
  ["Une seconde quête urgente a été invoquée. Elle accorde ses XP et ses objets normaux, mais ne peut pas être relancée.","A second emergency quest has been summoned. It grants its usual XP and items, but cannot be rerolled."],
  ["Vous choisissez de vous allier à un pays voisin pour l’aider à fermer un portail.","You choose to ally with a neighbouring country and help it clear a portal."],
  ["Le prochain donjon sera soumis à une contrainte aléatoire, cachée jusqu’au moment où elle s’activera. Récompenses : +20 % XP si le donjon est terminé.","The next dungeon will have a random constraint, hidden until it activates. Rewards: +20% XP if the dungeon is cleared."],
  ["5 Élixirs d’expérience mineurs ont été fusionnés en 1 Élixir d’expérience magistral.","5 minor experience elixirs were merged into 1 supreme experience elixir."],
  ["Le Catalyseur et le Grimoire ont fusionné 3 Élixirs d’expérience mineurs en 1 Élixir d’expérience magistral.","The catalyst and grimoire merged 3 minor experience elixirs into 1 supreme experience elixir."],
  ["You have succombé à la tentation, une pénalité vous est imposée :","You gave in to temptation. A penalty has been imposed:"],
  ["ABDOS","ABS"],["CRÉER UNE DETTE ?","Create a debt?"],["Clause révélée","Clause revealed"],["Salle","Room"],["Salle ","Room "],["la salle liée","the linked room"],
  ["jour","day"],["jours","days"],["tâche","task"],["ÉLAN +","Momentum +"],["ÉLIXIR SUSPENDU · ","Paused elixir · "],["ᚱ DESTIN RETRACÉ","ᚱ Fate rewritten"],
  ["XP bonus (élixir/événement)","XP bonus (elixir/event)"],["Totaux depuis le début","All-time totals"],
  ["Catalyseur disponible · ","Catalyst available · "],["Catalyseur alchimique disponible · utilisez-le pour réaliser la transmutation avec 3 Élixirs mineurs.","Alchemical catalyst available · use it to perform the transmutation with 3 minor elixirs."],
  ["Le Catalyseur peut compléter cette transmutation : 3 Élixirs d’expérience mineurs seront nécessaires au lieu de 5.","The catalyst can complete this transmutation: 3 minor experience elixirs will be required instead of 5."],
  ["Le contrat doit être utilisé avant le lancement d’un donjon.","The contract must be used before starting a dungeon."],
  ["Tu as déjà lancé un donjon aujourd'hui. Prochain lancement disponible demain.","You have already started a dungeon today. The next start is available tomorrow."],
  ["Tu as déjà lancé un donjon aujourd’hui. Prochain lancement disponible demain.","You have already started a dungeon today. The next start is available tomorrow."],
  ["La prochaine quête urgente est déjà orientée vers ","The next emergency quest is already set to "],["Le prochain donjon est déjà orienté vers ","The next dungeon is already set to "],
  ["Vous pouvez déplier la Carte avant d’ouvrir le Donjon afin de choisir la statistique du prochain Donjon.","You can unfold the map before opening the dungeon to choose the next dungeon’s attribute."],
  ["Vous pouvez signer le Contrat avant d’ouvrir le Donjon. Une contrainte aléatoire restera cachée jusqu’à son activation et accordera +20 % XP si le Donjon est terminé.","You can sign the contract before opening the dungeon. A random constraint will remain hidden until it activates and grant +20% XP if the dungeon is cleared."],
  ["Trois objets différents sont nécessaires pour utiliser la Balance (","Three different items are required to use the Balance ("],
  ["Utiliser la Potion d’invisibilité éphémère pour traverser la salle « ","Use the temporary invisibility potion to cross the room “"],
  ["Utiliser l’Onguent de récupération pour valider « ","Use the recovery ointment to clear “"],
  ["Une Marque du dépassement est actuellement dessinée sur « ","A Spark of transcendence is currently assigned to “"],
  ["Effacer la Marque du dépassement actuellement dessinée sur « ","Remove the Spark of transcendence currently assigned to “"],
  ["Créer une dette sur « ","Create a debt for “"],["Lancer ce donjon avec la contrainte « ","Start this dungeon with the “"],
  ["Sacrifier ces 3 objets et consommer la Balance pour recevoir « ","Sacrifice these 3 items and consume the Balance to receive “"],
  ["Réactiver l’élixir suspendu avec exactement ","Resume the paused elixir with exactly "],
  ["Un élixir est déjà actif pendant encore ","An elixir is already active for another "],
  ["Le même malus sera répercuté sur les deux compteurs : −","The same penalty will be applied to both counters: −"],
  ["Êtes-vous certain de vouloir ","Are you sure you want to "],
  ["TOUTES LES STATISTIQUES","ALL ATTRIBUTES"],["EFFACER LA MARQUE","Remove the mark"],["ORIENTER LA BOUSSOLE","Set the compass"],["SIGNER LE CONTRAT","Sign the contract"],
  ["VALIDER LES 2 OBJETS","Confirm both items"],["Vaincre le nouveau Boss","Defeat the new boss"],
  ["La Balance vous accorde : ","The Balance grants you: "],["La Carte des profondeurs oriente ce lancement vers ","The Map of the depths directs this start towards "],
  ["Orienter la prochaine quête urgente vers la statistique ","Set the next emergency quest to the "],
  ["Ton navigateur n'a pas pu copier automatiquement. Copie le texte ci-dessous.","Your browser could not copy automatically. Copy the text below."],
  ["Tu as succombé à la tentation, une pénalité vous est imposée :","You gave in to temptation. A penalty has been imposed:"],

  // Codex and inventory descriptions
  ["Permet au joueur de consulter les quêtes et systèmes de l’application.","Lets the player view the app’s quests and systems."],
  ["Permet au joueur de lancer une régression. Si plusieurs régressions existent, vous pourrez choisir laquelle activer.","Lets the player start a regression. If several regressions are available, you can choose which one to activate."],
  ["Permet au joueur de créer une dette sur une quête éligible, à rembourser le jour même ou le lendemain.","Lets the player create a debt for an eligible quest, to be repaid the same day or the next day."],
  ["Permet au joueur d’entrer dans un donjon aléatoire.","Lets the player enter a random dungeon."],
  ["Permet au joueur de gagner 20 % d’XP en plus dans la statistique de son choix pendant 24 h.","Grants 20% additional XP in the chosen attribute for 24 hours."],
  ["Permet au joueur de gagner 10 % d’XP en plus dans la statistique de son choix pendant 24 h.","Grants 10% additional XP in the chosen attribute for 24 hours."],
  ["Permet au joueur de gagner 30 % d’XP en plus pendant 24 h.","Grants 30% additional XP for 24 hours."],
  ["Permet au joueur de fusionner cinq Élixirs d’expérience mineurs pour créer un Élixir d’expérience magistral.","Lets the player merge five minor experience elixirs into one supreme experience elixir."],
  ["Permet au joueur de choisir la statistique de la prochaine quête urgente. La Boussole doit être orientée avant le reset.","Lets the player choose the attribute of the next emergency quest. The compass must be set before the reset."],
  ["Permet au joueur de mettre en pause la durée restante d’un élixir actif. L’élixir peut être réactivé manuellement avec exactement le temps qu’il lui restait. La suspension dure au maximum 24 h, puis l’élixir reprend automatiquement. Aucun autre élixir ne peut être activé pendant la suspension.","Pauses the remaining duration of an active elixir. The elixir can be resumed manually with exactly the time it had left. The pause lasts up to 24 hours, then the elixir resumes automatically. No other elixir can be activated while it is paused."],
  ["Permet au joueur de choisir la statistique du prochain donjon. La carte doit être dépliée avant d’utiliser une Clé de Donjon. Lorsqu’une statistique correspond à plusieurs donjons, un tirage aléatoire est effectué.","Lets the player choose the attribute of the next dungeon. The map must be unfolded before using a dungeon key. If several dungeons match that attribute, one is selected at random."],
  ["Après avoir terminé la quête urgente du jour, permet au joueur d’invoquer immédiatement une nouvelle quête urgente. Cette nouvelle quête urgente ne peut pas être relancée. Utilisable une seule fois par jour.","After completing today’s emergency quest, lets the player summon a new emergency quest immediately. This new emergency quest cannot be rerolled. Can be used once per day."],
  ["Permet de remplacer la quête urgente active par une nouvelle quête urgente aléatoire.","Replaces the active emergency quest with a new random emergency quest."],
  ["Permet au joueur de réduire le coût de 5 à 3 Élixirs d’expérience mineurs lors de la prochaine utilisation du Grimoire de l’Alchimiste. Le Catalyseur doit être utilisé avant le Grimoire.","Reduces the cost from 5 to 3 minor experience elixirs the next time the Alchemist’s grimoire is used. The catalyst must be used before the grimoire."],
  ["Permet au joueur de marquer un record comme objectif officiel de la semaine. Le battre avant la fin de semaine rapporte +500 XP. L’objet est perdu en cas d’échec.","Marks a record as the week’s official objective. Beating it before the end of the week grants +500 XP. The item is lost on failure."],
  ["Permet au joueur d’aller aider un pays voisin en se téléportant jusqu’au portail le plus proche. S’il est fermé, vous obtenez l’XP et le butin habituels du portail, puis choisissez un objet supplémentaire offert par le pays allié.","Lets the player help a neighbouring country by teleporting to the nearest portal. If it is cleared, you receive the portal’s usual XP and loot, then choose an additional item offered by the allied country."],
  ["Permet au joueur de devenir invisible le temps de traverser une salle de donjon. La salle est considérée comme terminée, sans gain d’XP. Utilisable une seule fois par jour.","Makes the player invisible while crossing one dungeon room. The room counts as cleared but grants no XP. Can be used once per day."],
  ["Permet au joueur de passer une quête journalière ou bonus en cas de blessure ou de repos forcé. La quête est considérée comme validée, sans gain d’XP. Utilisable une seule fois par jour.","Lets the player skip a daily or bonus quest due to injury or forced rest. The quest counts as cleared but grants no XP. Can be used once per day."],
  ["Permet au joueur de sacrifier 3 objets différents pour en choisir 1 nouveau.","Lets the player sacrifice 3 different items to choose 1 new item."],
  ["Un portail a 1 % de chance d’apparaître au reset quotidien. Il remplace la quête urgente du jour et reste ouvert 72 h. S’il n’est pas fermé après 72 h, il entre en rupture pendant 24 h : son Boss reprend l’objectif initial et invoque une garde rapprochée de 3 sous-quêtes.","A portal has a 1% chance of appearing at the daily reset. It replaces the day’s emergency quest and stays open for 72 hours. If it is not cleared within 72 hours, a portal break begins for 24 hours: its boss regains the initial objective and summons a three-quest Vanguard."],
  ["−25 % XP si le portail en rupture n’est pas fermé dans les 24 h.","−25% XP if the portal break is not contained within 24 hours."],
  ["Un Donjon inachevé se ferme à l’expiration de son délai. Les salles déjà validées et leurs XP restent acquises.","An unfinished dungeon closes when its timer expires. Cleared rooms and their XP remain earned."],
]);

// Longer fragments come first. These cover dynamic sentences containing values,
// quest names, timers or generated reward amounts.
const FRAGMENTS=[
  ["Toutes les quêtes journalières ont été complétées.","All daily quests have been completed."],
  ["Toutes les quêtes journalières ont été complétées","All daily quests have been completed"],
  ["Toutes les quêtes bonus ont été complétées","All bonus quests have been completed"],
  ["5 quêtes bonus ont été complétées.","5 bonus quests have been completed."],
  ["L'ensemble des quêtes disponibles a été complété.","All available quests have been completed."],
  ["Choisir les quêtes bonus","Select bonus quests"],["Sélection quotidienne libre.","Free daily selection."],
  ["Une quête commencée reste sélectionnée jusqu’au reset.","A started quest remains selected until reset."],
  ["Quêtes journalières restantes","Remaining daily quests"],["Quêtes hebdomadaires restantes","Remaining weekly quests"],["Quêtes bonus restantes","Remaining bonus quests"],
  ["Quête urgente complétée","Emergency quest completed"],["Quête urgente invoquée","Emergency quest summoned"],["Prochaine quête urgente disponible dans","Next emergency quest available in"],
  ["La Quête urgente ","The emergency quest "],[" a été complétée."," has been completed."],[" a été complété."," has been completed."],
  ["PORTAIL EN RUPTURE","Portal break"],["RUPTURE DE PORTAIL","Portal break"],["Rupture de portail","Portal break"],["Portail en rupture","Portal break"],
  ["Boss de Rupture","Portal break boss"],["BOSS DE RUPTURE VAINCU","Portal break boss defeated"],["Vaincre le Boss de Rupture","Defeat the portal break boss"],
  ["Boss initial vaincu","First boss defeated"],["Objectif du Boss","Boss objective"],["GARDE RAPPROCHÉE","Vanguard"],["Garde rapprochée","Vanguard"],
  ["Portail le plus proche","Nearest portal"],["Un portail est déjà actif.","A portal is already active."],["Un portail ","A portal "],
  ["Après avoir fermé un portail","After clearing a portal"],["fermer un portail","clear a portal"],["fermé après 72 h","cleared within 72 hours"],
  ["entre en rupture pendant 24 h","triggers a portal break for 24 hours"],["portail en rupture","portal break"],["portail actif","active portal"],
  ["Donjon en cours","Dungeon in progress"],["DONJON EN COURS","Dungeon in progress"],["Donjon terminé","Dungeon cleared"],["DONJON TERMINÉ","Dungeon cleared"],
  ["DOUBLE DONJON VAINCU","Double dungeon cleared"],["UN DOUBLE DONJON EST APPARU","A double dungeon has appeared"],["VENEZ À BOUT DU NOUVEAU BOSS POUR EN SORTIR","Defeat the new boss to escape"],
  ["Contrat du Maître actif","Master’s contract active"],["CONTRAT DU MAÎTRE ACTIF","Master’s contract active"],["Récompenses : +20 % XP","Rewards: +20% XP"],
  ["Valider la salle","Clear room"],["Salle du Maître","Master’s room"],["SALLE DU MAÎTRE","Master’s room"],["Salle liée","Linked room"],["SALLE LIÉE","Linked room"],
  ["Termine toutes les salles pour accéder au Boss","Clear all rooms to reach the boss"],["Accès par clé","Key required"],["cette semaine","this week"],["par jour","per day"],
  ["Surcharge","Overload"],["SURCHARGE","Overload"],["Épreuve cachée","Hidden trial"],["ÉPREUVE CACHÉE","Hidden trial"],["Enchaînement","Chain trial"],["ENCHAÎNEMENT","Chain trial"],
  ["Sous pression","Under pressure"],["SOUS PRESSION","Under pressure"],["Double donjon","Double dungeon"],["LE BOSS VOUS ATTEND","The boss awaits"],
  ["Vous avez 30 minutes pour terminer cette salle.","You have 30 minutes to clear this room."],["Aucune autre salle ne peut être accomplie avant elle.","No other room can be cleared before it."],
  ["Vous avez ","You have "],[" pour vaincre le Boss."," to defeat the boss."],["objectif ×3","objective ×3"],["Objectif ×3","Objective ×3"],
  ["Dette active","Active debt"],["Dette créée avec une","Debt created with an"],["Remboursement de dette","Debt repayment"],["Une dette est déjà active.","A debt is already active."],
  ["Régression activée","Regression activated"],["Régression","Regression"],["Malus de Régression","Regression penalty"],["Malus de Rupture","Portal break penalty"],
  ["Marque du dépassement active","Spark of transcendence active"],["Record officiel","Official record"],["record officiel","official record"],["Nouveau record","New record"],
  ["Palier 2 ✓ · Objectif final atteint","Tier 2 ✓ · Final objective reached"],["Palier 1 ✓ · Quête validée · Palier 2 : ","Tier 1 ✓ · Quest cleared · Tier 2: "],
  ["Palier 1 : ","Tier 1: "],["Palier 2 : ","Tier 2: "],["PALIER FRANCHI !","Tier cleared!"],["Objectif final atteint","Final objective reached"],
  ["Bonus de streak","Streak bonus"],["Élan","Momentum"],["Inertie","Inertia"],["Bonus d’XP","XP bonus"],
  ["XP manquants","XP required"],["XP avant Ascension","XP before Ascension"],["Ascension disponible","Ascension available"],["Stats requises non atteintes","Stat requirements not met"],
  ["Rang actuel","Current rank"],["Rang suivant","Next rank"],["Rang ","Rank "],["Niveau global","Global level"],["Niveau maximum","Max level"],["Niveau max","Max level"],
  ["Progression maximale","Max progress"],["Vers niveau ","Towards level "],["Niveau ","Level "],["Niv. ","Lv. "],["Condition ","Requirement: "],[" stats niv. "," stats at lv. "],
  ["Objet obtenu","Item acquired"],["BUTIN OBTENU","Loot acquired"],["Alliance scellée","Alliance sealed"],["ALLIANCE SCELLÉE","Alliance sealed"],
  ["Transmutation accomplie","Transmutation complete"],["Boussole orientée","Compass set"],["Carte déployée","Map unfolded"],["Élixir réactivé","Elixir reactivated"],["Élixir suspendu","Elixir suspended"],
  ["Destin retracé","Fate rewritten"],["Catalyseur préparé","Catalyst prepared"],["Échange accompli","Exchange complete"],["Vous avez consommé un","You consumed a"],["Vous avez signé un","You signed a"],["Vous avez utilisé une","You used a"],
  ["Choisir définitivement","Permanently select"],["comme cadeau du pays allié","as the allied country’s gift"],["Cadeau du pays allié","Allied country’s gift"],
  ["Comment l’obtenir","How to obtain"],["Taux :","Drop rate:"],["Après avoir complété","After completing"],["Après avoir accompli","After achieving"],
  ["toutes les quêtes journalières","all daily quests"],["5 quêtes bonus","5 bonus quests"],["une quête urgente","an emergency quest"],["un nouveau record","a new record"],["un donjon","a dungeon"],
  ["Aucun soda/alcool de la journée","No soda or alcohol all day"],["Pas de téléphone ou de stimulation","No phone or stimulation"],["2 repas propres","2 healthy meals"],
  ["À signer avant le lancement d’un donjon.","Sign before starting a dungeon."],["Au cours du prochain donjon","During the next dungeon"],["une contrainte aléatoire sera imposée au joueur","the player will face a random constraint"],
  ["Celle-ci reste cachée et peut survenir à n’importe quel moment du donjon.","It remains hidden and can trigger at any point in the dungeon."],["Si le donjon est terminé malgré la contrainte, ses récompenses sont augmentées de 20 %.","If the dungeon is cleared despite the constraint, its rewards are increased by 20%."],
  ["Contraintes possibles :","Possible constraints:"],["objectifs multipliés par 1,5","objectives multiplied by 1.5"],["une des quatre salles devient une Salle du Maître et sa contrainte spéciale n’est révélée qu’à l’ouverture de la salle","one of the four rooms becomes a Master’s room and its special constraint is revealed only when the room is opened"],
  ["deux salles sont liées et, dès que la première est accomplie, la seconde doit être terminée dans les 30 minutes","two rooms are linked; once the first is cleared, the second must be cleared within 30 minutes"],["lorsque la quatrième salle est terminée, un compte à rebours aléatoire de 1 à 6 heures démarre pour vaincre le Boss","when the fourth room is cleared, a random 1-to-6-hour countdown begins to defeat the boss"],
  ["une fois le Boss vaincu, une des quatre salles déjà accomplies est tirée au sort et devient un nouveau Boss avec un objectif ×3","once the boss is defeated, one of the four cleared rooms is randomly selected and becomes a new boss with a ×3 objective"],["Ce nouveau Boss doit être vaincu pour terminer le donjon.","This new boss must be defeated to clear the dungeon."],
  ["30 sec max de repos entre les séries","Maximum 30 seconds of rest between sets"],["Exécution contrôlée, 3 secondes par répétition","Controlled execution, 3 seconds per repetition"],
  ["Chaque série doit durer au moins 1 min 30 sec","Each set must last at least 1 min 30 sec"],["Libre, sans guidage, musique ou téléphone","Unguided, without music or phone"],
  ["Écrire 3 choses pour lesquelles je suis reconnaissant","Write down 3 things I am grateful for"],["Hand grips en même temps","Use hand grips at the same time"],
  ["Doivent être réalisés d’une traite","Must be completed in one go"],["Traiter, planifier ou supprimer 5 éléments","Process, schedule or delete 5 items"],
  ["2 éléments doivent être traités immédiatement","2 items must be handled immediately"],["Terminer 2 tâches repoussées","Complete 2 delayed tasks"],
  ["Ranger et nettoyer complètement une pièce","Completely tidy and clean one room"],["Aucun contenu passif","No passive content"],
  ["Prendre une douche froide pendant 10 minutes","Take a cold shower for 10 minutes"],["Faire 20 minutes de wall sit","Do 20 minutes of wall sit"],["Faire 500 pompes","Do 500 push-ups"],
  ["Faire 250 squats","Do 250 squats"],["Faire 50 tractions","Do 50 pull-ups"],["Faire 20 minutes de gainage","Hold a plank for 20 minutes"],
  ["Faire 2 heures d’apprentissage actif","Do 2 hours of active learning"],["Lire pendant 2 heures","Read for 2 hours"],["Courir 10 kilomètres","Run 10 kilometres"],
  ["Faire 10 séries de 200 mètres","Run 10 sets of 200 metres"],["Faire 30 minutes de corde à sauter","Jump rope for 30 minutes"],
  ["Faire 1 heure d’animal flow","Do 1 hour of animal flow"],["Faire 1 heure de flow martial","Do 1 hour of martial flow"],
  ["Faire 10 minutes de mobilité du bas du corps","Do 10 minutes of lower-body mobility"],["Effectuer 50 fentes","Do 50 lunges"],["Effectuer 100 élévations de mollets","Do 100 calf raises"],
  ["Faire 10 minutes de mobilité des épaules et des poignets","Do 10 minutes of shoulder and wrist mobility"],["Effectuer 100 dips","Do 100 dips"],["Effectuer 20 tractions","Do 20 pull-ups"],
  ["Faire 25 tractions négatives","Do 25 negative pull-ups"],["Réaliser 2 minutes de dead hang","Do a 2-minute dead hang"],["Effectuer 100 crunches","Do 100 crunches"],
  ["Effectuer 50 répétitions de gainage oblique","Do 50 side-plank repetitions"],["Effectuer 100 jumping jacks","Do 100 jumping jacks"],
  ["Effectuer 5 minutes d’échauffement dynamique","Do 5 minutes of dynamic warm-up"],["Faire 10 minutes de marche ou de mobilité après la course","Walk or do mobility work for 10 minutes after running"],
  ["Faire 5 minutes de mobilité corporelle","Do 5 minutes of full-body mobility"],["Réaliser 10 minutes de déplacement silencieux","Do 10 minutes of silent movement"],
  ["Réaliser 10 minutes d’exercices d’équilibre et de coordination","Do 10 minutes of balance and coordination exercises"],
  ["Boire 2 litres d’eau pendant la période de Rupture","Drink 2 litres of water during the portal break"],["Prendre 2 repas propres consécutifs","Eat 2 healthy meals in a row"],
  ["Passer 30 minutes à la lumière naturelle","Spend 30 minutes in daylight"],["Rédiger un résumé de 300 mots de ce que tu viens d’apprendre","Write a 300-word summary of what you have just learned"],
  ["Réaliser 20 minutes de mémorisation","Do 20 minutes of memory training"],["Garder le téléphone hors de portée et couper les notifications pendant 3 heures","Keep your phone out of reach and disable notifications for 3 hours"],
  ["Méditer pendant 10 minutes","Meditate for 10 minutes"],["Restituer 10 idées de mémoire sans rouvrir le texte","Recall 10 ideas from memory without reopening the text"],
  ["Passer 30 minutes sans téléphone, musique, vidéo ni podcast","Spend 30 minutes without a phone, music, video or podcast"],
  ["Faire 5 minutes de mobilité des chevilles et des mollets","Do 5 minutes of ankle and calf mobility"],
  ["Sélectionnées","Selected"],["sélectionnées","selected"],["LIMITE ATTEINTE","Limit reached"],["Aucun résultat","No results"],["Aucune activité","No activity"],
  ["australiennes","Australian pull-ups"],["négatives","Negative pull-ups"],[" au-delà"," beyond the goal"],
  ["Pénalité :","Penalty:"],["CLAUSE RÉVÉLÉE · ","Revealed clause · "],["Objectif ×3 · ","×3 objective · "],["Boss inconnu","Unknown boss"],
  ["Fermeture du donjon dans ","Dungeon closes in "],[" jours manqués"," missed days"],[" jour manqué"," missed day"],
  ["Choisir définitivement « ","Permanently select “"],["Choisir « ","Select “"],["Choisir ","Select "],
  [" comme statistique du prochain donjon ?"," as the next dungeon’s attribute?"],[" » comme cadeau du pays allié ?","” as the allied country’s gift?"],
  [" » comme record officiel à dépasser avant la fin de la semaine ?","” as the official record to beat before the end of the week?"],
  [" » sans gagner d’XP ?","” without earning XP?"],[" » sans gagner son XP ?","” without earning its XP?"],
  ["Le prochain donjon appartiendra à la statistique ","The next dungeon will belong to the "],["La prochaine quête urgente appartiendra à la statistique ","The next emergency quest will belong to the "],
  ["La prochaine transmutation ne coûtera que 3 Élixirs d’expérience mineurs.","The next transmutation will cost only 3 minor experience elixirs."],
  ["Le temps restant de l’élixir est conservé pendant 24 h maximum.","The elixir’s remaining time is preserved for up to 24 hours."],
  ["L’élixir reprend avec exactement le temps qui lui restait.","The elixir resumes with exactly the time it had left."],
  ["La quête urgente active a été remplacée par une nouvelle quête urgente aléatoire.","The active emergency quest has been replaced with a new random emergency quest."],
  ["Vous bénéficiez de +","You gain +"],[" % d’XP supplémentaires pendant 24 h.","% additional XP for 24 hours."],[" % d’XP sur toutes les statistiques pendant 24 h.","% XP across all attributes for 24 hours."],
  [" pendant 24 h."," for 24 hours."],[" sur toutes les statistiques"," across all attributes"],[" dans "," in "],
  ["Après chaque montée de niveau : 1 objet aléatoire garanti.","After each level-up: 1 guaranteed random item."],["Après chaque montée de rang : 2 objets au choix garantis.","After each rank-up: choose 2 guaranteed items."],
  ["Après avoir fermé un portail : 1 objet aléatoire garanti.","After clearing a portal: 1 guaranteed random item."],
  ["Après avoir complété la quête urgente, toutes les quêtes journalières et 5 quêtes bonus dans la même journée","After completing the emergency quest, all daily quests and 5 bonus quests on the same day"],
  ["Après avoir complété le Donjon de l’Alchimiste","After clearing the Alchemist’s dungeon"],["Après avoir complété le Donjon du Pèlerin","After clearing the Pilgrim’s dungeon"],
  ["Après avoir complété le Donjon du Guerrier","After clearing the Warrior’s dungeon"],["Après avoir complété le Donjon du Gardien","After clearing the Guardian’s dungeon"],
  ["Après avoir complété le Donjon du Chasseur","After clearing the Hunter’s dungeon"],["Après avoir complété le Donjon du Moine","After clearing the Monk’s dungeon"],
  ["En fusionnant 5 Élixirs d’expérience mineurs via le Grimoire de l’Alchimiste","By merging 5 minor experience elixirs with the Alchemist’s grimoire"],
  ["Sélectionnez exactement 3 objets différents. Un exemplaire de chacun sera sacrifié avec la Balance.","Select exactly 3 different items. One of each will be sacrificed with the Balance."],
  ["Choisissez d’abord l’objet offert par le pays allié.","Select the item offered by the allied country first."],
  ["Ce choix consommera ton lancement de donjon du jour et comptera dans la limite hebdomadaire.","This choice will use today’s dungeon start and count towards the weekly limit."],
  ["Tes données ont bien été copiées dans le presse-papiers.","Your data has been copied to the clipboard."],
  [" seront restituées à la réactivation."," will be restored when resumed."],[" % d’XP à ","% XP to "],[" » pour ","” for "],
  [" » ? L’objet restera consommé et cet objectif officiel sera abandonné.","”? The item will remain consumed and this official objective will be abandoned."],
  [" » et une récompense finale augmentée de 20 % ?","” and a final reward increased by 20%?"],
  ["Le donjon sera tiré parmi ceux de cette statistique.","The dungeon will be drawn from those matching this attribute."],
  ["Êtes-vous certain de vouloir entrer ?","Are you sure you want to enter?"],["Le Donjon ","The dungeon "],
  [" sont nécessaires ("," are required ("],["Catalyseur requis : vous ne possédez que ","Catalyst required: you only have "],
  [" XP sur chacune des six statistiques et −"," XP on each of the six attributes and −"],
  ["XP bonus (élixir/événement)","XP bonus (elixir/event)"],
  ["Récompenses :","Rewards:"],["Récompense :","Reward:"],["Objectif :","Objective:"],["Objectif du boss :","Boss objective:"],
  ["Boss objective :","Boss objective:"],["OBJECTIF DU BOSS","Boss objective"],["Garde ","Vanguard "],
  ["1/jour","1/day"],["cette semaine","this week"],[" mètres"," metres"],["mètres","metres"],
  [" sélectionnés"," selected"],["sélectionnés","selected"],["sélectionné","selected"],
  ["répétitions","repetitions"],["répétition","repetition"],["idées","ideas"],["idée","idea"],["objets","items"],["objet","item"],
  ["sér.","sets"],["succès","success"],["échec","failure"],
  ["Élixirs d’expérience mineurs","minor experience elixirs"],["Élixir d’expérience mineur","minor experience elixir"],
  ["Élixir d’expérience majeur","major experience elixir"],["Élixir d’expérience magistral","supreme experience elixir"],["Élixirs mineurs","minor elixirs"],
  ["Pendant 24 h","For 24 hours"],["pendant 24 h","for 24 hours"],[" pendant "," for "],[" avant "," before "],[" après "," after "],[" sans "," without "],[" avec "," with "],
  ["Statistique","Attribute"],["statistique","attribute"],["prochaine quête urgente","next emergency quest"],["prochain donjon","next dungeon"],
  [" restants"," remaining"],[" restant"," remaining"],[" jours manqués"," missed days"],[" jour manqué"," missed day"],
  [" verre"," glass"],[" verres"," glasses"],[" repas"," meals"],[" objets"," items"],[" objet"," item"],[" tâches"," tasks"],[" tâche"," task"],
  [" portions"," portions"],[" portion"," portion"],[" mots"," words"],[" mot"," word"],[" idées"," ideas"],[" idée"," idea"],[" succès"," success"],[" jour"," day"],[" jours"," days"],
  [" montées/descentes"," round trips"],[" A/R"," round trips"],[" sér."," sets"],
  ["ACTIVER CE DONJON ?","Activate this dungeon?"],["Oui","Yes"],["Non","No"],["Données invalides","Invalid data"],["Restauré !","Restored!"],
  ["Copié !","Copied!"],["Erreur","Error"],["Fermer","Close"],["Continuer","Continue"],["Terminer","Done"],["Choisir","Select"],
];

FRAGMENTS.sort((a,b)=>b[0].length-a[0].length);

// Terms that can appear inside dynamically assembled labels. Unlike EXACT,
// these replacements deliberately work within a longer string.
const INLINE=[
  ["Pecs & Triceps","Chest & triceps"],["Gainage obliques","Side plank"],["Gainage oblique","Side plank"],["Levées de jambes","Leg raises"],
  ["Tractions australiennes","Australian pull-ups"],["Tractions négatives","Negative pull-ups"],["Élévations de mollets","Calf raises"],
  ["Running fractionné","Interval running"],["Corde à sauter","Jump rope"],["Apprentissage actif","Active learning"],
  ["Lumière naturelle","Daylight"],["Douche froide","Cold shower"],["Cohérence cardiaque","Cardiac coherence"],
  ["Déplacements silencieux","Silent movement"],["Flow martial","Martial flow"],["Tâches repoussées","Delayed tasks"],["Charge mentale","Mental load"],
  ["Dormir 8h","8 hours sleep"],["Actions commerciales","Sales actions"],["Entretiens/RDV S+1","Interviews/Meetings W+1"],["Entretiens/RDV","Interviews/Meetings"],
  ["Mémorisation","Memory training"],["Méditation","Meditation"],["Hydratation","Hydration"],["Équilibre","Balance"],["Lecture","Reading"],
  ["Tractions","Pull-ups"],["Pompes","Push-ups"],["Fentes","Lunges"],["Abdos","Abs"],["Gainage","Plank"],["Mollets","Calf raises"],
  ["Escaliers","Stairs"],["Aspirer","Vacuuming"],["Récurer","Deep cleaning"],["Poussière","Dusting"],["Rangement","Tidying up"],["Linge","Laundry"],
  ["Éveil corporel","Body activation"],["Bloc profond","Deep work"],
  ["Le Troll des Cavernes","The Cave Troll"],["La Horde","The Horde"],["Le Changeforme","The Shapeshifter"],["Le Détraqueur","The Dementor"],["Le Grand Gobelin","The Great Goblin"],
  ["Le Balrog de Morgoth","Morgoth’s Balrog"],["Le Roi-Sorcier d’Angmar","The Witch-king of Angmar"],["Khamûl, l’Ombre de l’Orient","Khamûl, the Shadow of the East"],
  ["Suladàn, l’Immortel","Suladàn, the Immortal"],["Antares, Monarque des Dragons","Antares, Monarch of Dragons"],["Baran, Monarque des Démons","Baran, Monarch of Demons"],
  ["Sillad, Monarque des Glaces","Sillad, Monarch of Frost"],["Rakan, Monarque des Bêtes","Rakan, Monarch of Beasts"],["Le Colosse","The Colossus"],
  ["La Gorgone","The Gorgon"],["Le Golem du Soléaire","The Solar Golem"],["Le Piège Mécanique","The Mechanical Trap"],["Le Minotaure","The Minotaur"],
  ["La Harpie","The Harpy"],["Le Piège de Roches","The Rock Trap"],["Le Cyclope","The Cyclops"],["Le Ver Pourpre","The Purple Worm"],["Le Naga","The Naga"],
  ["L’Archiviste Noir","The Dark Archivist"],["Le Scribe Déchu","The Fallen Scribe"],["Le Palantír","The Palantír"],["Le Sage Déchu","The Fallen Sage"],
  ["La Chimère","The Chimera"],["La Gargouille","The Gargoyle"],["Le Satyre","The Satyr"],["Le Draugr","The Draugr"],["Le Warg Alpha","The Alpha Warg"],
  ["Le Léviathan","The Leviathan"],["Le Métamorphe","The Shapeshifter"],["Le Doyen des Invisibles","The Elder of the Unseen"],["Le Djinn des Vents","The Djinn of Winds"],
  ["Le Shinobi","The Shinobi"],["Jörmungandr","Jörmungandr"],["TOTAUX DEPUIS LE DÉBUT","ALL-TIME TOTALS"],["Validation simple","Single completion"],
  ["Objectif","Objective"],["SALLES","ROOMS"],["Salles","Rooms"],["Salle","Room"],
  ["Rando","Hike"],["Marche","Walk"],
  ["Agilité","Agility"],["Agilite","Agility"],["Santé","Health"],["Sante","Health"],["Endurance","Stamina"],["Esprit","Mind"],["Force","Strength"],
];
INLINE.sort((a,b)=>b[0].length-a[0].length);

export function translateUiText(value){
  if(typeof value!=="string"||!value)return value;
  if(EXACT.has(value))return EXACT.get(value);
  let out=value;
  for(const [source,target] of FRAGMENTS){
    if(out.includes(source))out=out.split(source).join(target);
  }
  for(const [source,target] of INLINE){
    if(out.includes(source))out=out.split(source).join(target);
  }
  // Dynamic unit and shorthand cleanup.
  out=out.replace(/XP\/RDV/g,"XP/meeting")
    .replace(/\+1 RDV\b/g,"+1 meeting")
    .replace(/\bRDV\b/g,"meetings")
    .replace(/\bHEBDO\b/g,"Weekly")
    .replace(/\bBONUS\b/g,"Bonus")
    .replace(/\bNiv\.\b/g,"Lv.")
    .replace(/Sante|Santé/g,"Health")
    .replace(/\bForce\b/g,"Strength")
    .replace(/\bEsprit\b/g,"Mind")
    .replace(/\bEndurance\b/g,"Stamina")
    .replace(/Agilite|Agilité/g,"Agility")
    .replace(/\bPortails\b/g,"Portals")
    .replace(/\bPortail\b/g,"Portal")
    .replace(/\bDonjons\b/g,"Dungeons")
    .replace(/\bDonjon\b/g,"Dungeon")
    .replace(/\bQuêtes\b/g,"Quests")
    .replace(/\bQuête\b/g,"Quest")
    .replace(/(\d)(min|reps|km)\b/g,"$1 $2")
    .replace(/Health\/verre\b/g,"Health\/glass")
    .replace(/\bverres\b/g,"glasses")
    .replace(/\bverre\b/g,"glass");
  return out;
}

function translateChild(child){
  if(typeof child==="string")return translateUiText(child);
  if(Array.isArray(child))return child.map(translateChild);
  return child;
}

window.preact.h=function translatedH(type,props,...children){
  let nextProps=props;
  if(typeof type==="string"&&props){
    nextProps={...props};
    for(const key of ["title","aria-label","placeholder","alt"]){
      if(typeof nextProps[key]==="string")nextProps[key]=translateUiText(nextProps[key]);
    }
  }
  return originalH(type,nextProps,...children.map(translateChild));
};
