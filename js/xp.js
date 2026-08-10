// ─── MOTEUR D’XP ET DE NIVEAUX ─────────────────────────────────────────────
// Fonctions pures : niveaux de statistiques, niveau global et calcul des XP
// produits par les quêtes. Aucune lecture ni écriture de l’état de l’app.

// XP pour passer du niveau N au niveau N+1 : 1000 * 1.1^N
export const xpForLvl = l => Math.round(1000*Math.pow(1.1,l));
export const totForLvl = l => { let t=0; for(let i=0;i<l;i++)t+=xpForLvl(i); return t; };
export const getLvl = xp => { let l=0; while(xp>=totForLvl(l+1))l++; return l; };

// Niveau global du personnage : progression courte/moyenne, indépendante des rangs.
// Niveau 1 -> 2 = 3 000 XP, puis +250 XP requis à chaque niveau.
const GLOBAL_MAX_LEVEL = 100;
const globalXpForNextLevel = lvl => 3000 + (Math.max(1,lvl)-1)*250;
const globalTotForLevel = lvl => {
  let t=0;
  for(let i=1;i<Math.max(1,lvl);i++)t+=globalXpForNextLevel(i);
  return t;
};
export function getGlobalLevelInfo(xp){
  const total = Math.max(0,Number(xp)||0);
  let level = 1;
  while(level < GLOBAL_MAX_LEVEL && total >= globalTotForLevel(level+1)) level++;
  const nextLevel = Math.min(GLOBAL_MAX_LEVEL, level+1);
  const start = globalTotForLevel(level);
  const next = level >= GLOBAL_MAX_LEVEL ? start : globalTotForLevel(nextLevel);
  const need = Math.max(1,next-start);
  const inLevel = Math.max(0,total-start);
  const pct = level >= GLOBAL_MAX_LEVEL ? 100 : Math.max(0,Math.min(100,(inLevel/need)*100));
  return {level,nextLevel,start,next,need,inLevel,pct,maxed:level>=GLOBAL_MAX_LEVEL};
}

export function calcXp(obj,total,baseOverride){
  if(!obj||total<=0)return 0;
  const t = baseOverride!=null ? baseOverride : obj.base;
  if(obj.binary){return total>=t?(obj.binaryXp||50):0;}
  if(obj.tiers && obj.tiers.length>0){
    const tierXp = obj.tiers.reduce((sum,tier)=>{
      if(total < tier.at) return sum;
      return sum + (tier.xp||0) + (tier.xp2||0) + (tier.xp3||0);
    },0);
    const overTarget = obj.target || obj.tiers[obj.tiers.length-1].at || obj.base || 0;
    const overXp = obj.overGoalXpPer ? Math.max(0,total-overTarget) * obj.overGoalXpPer : 0;
    return tierXp + overXp;
  }
  const xpPer=obj.xpPer;
  const effectiveTotal = total;
  // Cas spécial reading : Esprit linéaire
  if(obj.id==="reading") return effectiveTotal*xpPer;
  // Cas spécial water : linéaire dès le 1er
  if(obj.id==="water") return effectiveTotal*xpPer;
  // Cas spécial run : linéaire + 50% si ≥ 2x objectif
  if(obj.id==="run"){
    let xp = effectiveTotal*xpPer;
    if(effectiveTotal >= t*2) xp += Math.round(effectiveTotal*xpPer*0.5);
    return xp;
  }
  // Marche : 35 XP Endurance / km, strictement linéaire.
  if(obj.id==="march") return effectiveTotal*xpPer;
  // Cas standard
  if(obj.optional){
    let xp = effectiveTotal*xpPer;
    const mult = Math.floor(effectiveTotal/t);
    if(mult>=2) xp += (mult-1)*t*xpPer;
    return xp;
  } else {
    if(effectiveTotal < t) return 0;
    let xp = effectiveTotal*xpPer;
    const mult = Math.floor(effectiveTotal/t);
    if(mult>=2) xp += (mult-1)*t*xpPer;
    return xp;
  }
}

// XP global réellement produit par une quête, toutes stats confondues.
// calcXp() calcule la ligne principale (ou tous les paliers pour les quêtes à paliers).
export function calcQuestTotalXp(obj,total,baseOverride){
  const primary=calcXp(obj,total,baseOverride);
  if(!obj || primary<=0) return 0;
  // Les quêtes à paliers sont déjà entièrement additionnées dans calcXp().
  if(obj.tiers && obj.tiers.length>0) return primary;
  let sum=primary;
  if(obj.stat2){
    if(obj.xpPer2 && obj.xpPer) sum+=Math.round(primary*(obj.xpPer2/obj.xpPer));
    else if(obj.xp2) sum+=Number(obj.xp2)||0;
    else sum+=primary;
  }
  if(obj.stat3){
    if(obj.xpPer3 && obj.xpPer) sum+=Math.round(primary*(obj.xpPer3/obj.xpPer));
    else if(obj.xp3) sum+=Number(obj.xp3)||0;
    else sum+=primary;
  }
  return sum;
}
