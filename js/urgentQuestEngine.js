import { SP } from "./questDefs.js";

// ─── MOTEUR DE TIRAGE DES QUÊTES URGENTES ───────────────────────────────────
// Sélection pure de la prochaine quête urgente : cycle des six statistiques,
// anti-répétition sur quatre cycles et éventuel forçage par la Boussole.
// La création de la quête, ses délais et les mutations de l'état restent dans app.js.

export const URGENT_QUEST_STATS = Object.freeze([
  "Sante",
  "Force",
  "Esprit",
  "Endurance",
  "Agilite",
  "Discipline"
]);

export function appendUrgentQuestDrawLog(log,quest,drawnAt=Date.now()){
  if(!quest || !quest.id) return Array.isArray(log)?log:[];
  const current=Array.isArray(log)?log:[];
  const sqid=quest.sqid||("draw_"+drawnAt+"_"+quest.id);
  if(current.some(entry=>entry && entry.sqid===sqid)) return current;
  const entry={
    sqid,
    id:quest.id,
    stat:quest.stat||null,
    drawnAt:Number(drawnAt)||Date.now()
  };
  // On conserve une marge confortable ; le tirage n'utilise que les 24 derniers.
  return [...current,entry].slice(-120);
}

export function pickRandomSq(usedIds,statCycle,selectionLog,forcedStat=null){
  const stats=URGENT_QUEST_STATS;
  const cycle = [...new Set((statCycle||[]).filter(s=>stats.includes(s)))];
  const remaining = stats.filter(s=>!cycle.includes(s));
  const cycleReset = remaining.length===0;
  const pool = cycleReset ? stats : remaining;

  // Anti-répétition : une même quête urgente ne peut pas revenir avant 4 cycles complets.
  const recentWindow = stats.length * 4;
  const recentIds = (selectionLog||[])
    .slice(-recentWindow)
    .map(x=>typeof x==="string" ? x : x.id)
    .filter(Boolean);
  const lastDrawnId=(selectionLog||[]).slice().reverse().map(x=>typeof x==="string"?x:x&&x.id).find(Boolean)||null;

  const availableForStat = (s, respectCooldown=true) => (SP[s]||[]).filter(t =>
    !(usedIds||[]).includes(t.id) &&
    (!respectCooldown || !recentIds.includes(t.id))
  );

  // La Boussole force uniquement la statistique. Le cycle de statistiques reste intact.
  if(stats.includes(forcedStat)){
    let avail=availableForStat(forcedStat,true).filter(t=>t.id!==lastDrawnId);
    if(!avail.length) avail=availableForStat(forcedStat,false).filter(t=>t.id!==lastDrawnId);
    if(!avail.length) avail=availableForStat(forcedStat,false);
    if(!avail.length) return null;
    const chosen=avail[Math.floor(Math.random()*avail.length)];
    return {tpl:{...chosen,stat:chosen.stat||forcedStat},pickedStat:forcedStat,cycleReset:false,forced:true};
  }

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
          return {tpl:{stat:s,...chosen}, pickedStat:s, cycleReset, forced:false};
        }
      }
    }
    return null;
  }

  const stat = usable[Math.floor(Math.random()*usable.length)];
  const avail = availableForStat(stat,respectCooldown);
  const chosen = avail[Math.floor(Math.random()*avail.length)];
  return {tpl:{...chosen,stat:chosen.stat||stat}, pickedStat:stat, cycleReset, forced:false};
}
