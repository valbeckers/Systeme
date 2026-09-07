// ─── MOTEUR DES ÉLIXIRS ─────────────────────────────────────────────────────
// Fonctions pures utilisées pour valider les élixirs sauvegardés, déterminer
// leur état courant, calculer leur bonus d'XP et préparer leur suspension ou
// leur reprise. Les mutations de l'état Preact restent dans app.js.

export const ELIXIR_KINDS = Object.freeze([
  "minorElixir",
  "majorElixir",
  "supremeElixir"
]);

export const ELIXIR_STATS = Object.freeze([
  "Force",
  "Sante",
  "Esprit",
  "Endurance",
  "Agilite"
]);

export const ELIXIR_DURATION_MS = 24 * 60 * 60 * 1000;
export const ELIXIR_SUSPENSION_MAX_MS = 24 * 60 * 60 * 1000;

export function isElixirKind(kind){
  return ELIXIR_KINDS.includes(kind);
}

export function cleanStoredActiveElixir(elixir,now=Date.now()){
  if(!elixir || Number(elixir.expiresAt)<=now) return null;
  if(elixir.kind==="supremeElixir") return elixir;
  return ELIXIR_STATS.includes(elixir.stat) ? elixir : null;
}

export function cleanStoredSuspendedElixir(elixir){
  return elixir && Number(elixir.remainingMs)>0 ? elixir : null;
}

export function currentActiveElixir(elixir,now=Date.now()){
  return elixir && now<(Number(elixir.expiresAt)||0) ? elixir : null;
}

export function currentSuspendedElixir(elixir){
  return elixir && Number(elixir.remainingMs)>0 ? elixir : null;
}

export function elixirBonusForStat(elixir,stat,baseXp,now=Date.now()){
  const base=Number(baseXp)||0;
  if(!elixir || now>=(Number(elixir.expiresAt)||0)) return 0;
  if(elixir.kind!=="supremeElixir" && elixir.stat!==stat) return 0;
  return Math.round(base*(Number(elixir.pct)||0));
}

export function buildResumedElixir(elixir,now=Date.now()){
  return {
    kind:elixir.kind,
    stat:elixir.stat||null,
    pct:elixir.pct,
    startedAt:now,
    resumedAt:now,
    expiresAt:now+Math.max(1,Number(elixir.remainingMs)||1)
  };
}

export function buildSuspendedElixir(elixir,now=Date.now()){
  return {
    kind:elixir.kind,
    stat:elixir.stat||null,
    pct:elixir.pct,
    remainingMs:Math.max(1,(Number(elixir.expiresAt)||now)-now),
    suspendedAt:now,
    resumeDeadline:now+ELIXIR_SUSPENSION_MAX_MS
  };
}
