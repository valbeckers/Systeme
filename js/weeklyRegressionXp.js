import { REGRESSION_DEF } from "./dailyEngine.js?v=20260802-debt-sameday-01";
import { wkStr } from "./dayCycle.js";

export function regressionPenaltyForWeek(state,weekKey){
  return Object.keys(state.regressionLog||{}).reduce((sum,day)=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||wkStr(new Date(day+"T12:00:00"))!==weekKey)return sum;
    const logged=Number(state.dailyExtraXp?.[day]?.regressionMalus);
    return sum+(Number.isFinite(logged)&&logged<0?-logged:REGRESSION_DEF.globalPenalty);
  },0);
}

export function weeklyXpWithoutRegression(state,summary){
  const xp=Number(summary?.xp)||0;
  return summary?.regressionsExcluded===true?xp:xp+regressionPenaltyForWeek(state,summary?.weekKey);
}
