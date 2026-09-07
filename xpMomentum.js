export const XP_MOMENTUM_CAP_PERCENT = 5;

export function elanBonusPercent(streak){
  const days=Math.max(0,Math.floor(Number(streak)||0));
  return Math.min(XP_MOMENTUM_CAP_PERCENT,Math.floor(days/5));
}

export function inertiaMalusPercent(missedDays){
  const days=Math.max(0,Math.floor(Number(missedDays)||0));
  return Math.min(XP_MOMENTUM_CAP_PERCENT,Math.max(0,days-1));
}

export function xpMomentumAdjustment(amount,state){
  const base=Math.max(0,Number(amount)||0);
  const bonusPercent=elanBonusPercent(state&&state.streak);
  const malusPercent=Math.min(
    XP_MOMENTUM_CAP_PERCENT,
    Math.max(0,Number(state&&state.inertiaPercent)||0)
  );
  const netPercent=bonusPercent-malusPercent;
  const delta=base*netPercent/100;
  return {base,bonusPercent,malusPercent,netPercent,delta,gain:Math.max(0,base+delta)};
}
