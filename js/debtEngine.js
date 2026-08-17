import { calcXp } from "./xp.js";
import { addDaysStr } from "./dayCycle.js";

// Quêtes journalières dont la quantité manquante peut être reportée au
// lendemain par la Reconnaissance de dette.
export const DEBT_ELIGIBLE_IDS = new Set([
  "sleep",
  "push",
  "abs",
  "squats",
  "negative_pullups",
  "calves",
  "reading"
]);

export function isDebtEligibleQuest(obj){
  return !!(
    obj &&
    obj.daily &&
    !obj.optional &&
    !obj.binary &&
    DEBT_ELIGIBLE_IDS.has(obj.id)
  );
}

export function hasResolvedQuestDebt(state,day,questId){
  if(!state||!day||!questId) return false;
  const ids=((state.debtResolvedQuestIdsByDay||{})[day]||[]);
  if(Array.isArray(ids)&&ids.includes(questId)) return true;
  const debt=state.questDebt;
  return !!(
    debt&&debt.status==="paid"&&debt.sourceDay===day&&debt.id===questId
  );
}

export function debtRewardPairs(obj,current,target){
  const missing=Math.max(0,(Number(target)||0)-(Number(current)||0));
  if(missing<=0) return [];

  let mainXp=0;
  if(obj.id==="reading"){
    mainXp=missing*(obj.xpPer||0);
  }else{
    const beforeXp=calcXp(obj,current,target);
    const afterXp=calcXp(obj,target,target);
    mainXp=Math.max(0,afterXp-beforeXp);
  }

  const pairs=[];
  if(mainXp>0) pairs.push({stat:obj.stat,xp:Math.round(mainXp)});
  if(obj.stat2){
    const ratio=(obj.xpPer2||obj.xpPer||0)/(obj.xpPer||1);
    const xp2=Math.round(mainXp*ratio);
    if(xp2>0) pairs.push({stat:obj.stat2,xp:xp2});
  }
  return pairs;
}

export function createQuestDebtState(state,obj,{today,target,now=Date.now()}={}){
  if(!state || !obj || !isDebtEligibleQuest(obj)) return state;
  if(state.questDebt && state.questDebt.status==="active") return state;
  if(state.debtUseDay===today) return state;

  const current=(state.dailyLog&&state.dailyLog[today]&&state.dailyLog[today][obj.id])||0;
  const amount=Math.max(0,(Number(target)||0)-(Number(current)||0));
  if(amount<=0) return state;

  return {
    ...state,
    debtUseDay:today,
    questDebt:{
      id:obj.id,
      name:obj.name,
      icon:obj.icon,
      unit:obj.unit,
      stat:obj.stat,
      stat2:obj.stat2||null,
      amount,
      paid:0,
      target,
      current,
      sourceDay:today,
      dueDay:addDaysStr(today,1),
      createdAt:now,
      status:"active",
      rewards:debtRewardPairs(obj,current,target)
    }
  };
}

export function planQuestDebtRepayment(debt,obj,value,today){
  const val=Math.max(0,Number(value)||0);
  const sourceDay=debt&&debt.sourceDay ? debt.sourceDay : null;
  if(
    !debt ||
    debt.status!=="active" ||
    !obj ||
    debt.id!==obj.id ||
    (sourceDay && today<sourceDay) ||
    today>debt.dueDay
  ){
    return {used:0,remaining:val,willComplete:false};
  }

  const left=Math.max(0,(Number(debt.amount)||0)-(Number(debt.paid)||0));
  const used=Math.min(left,val);
  const remaining=Math.max(0,val-used);
  return {
    used,
    remaining,
    willComplete:used>0 && (Number(debt.paid)||0)+used>=(Number(debt.amount)||0)
  };
}


// Répare les dettes créées le jour même avec les anciennes versions du moteur :
// avant le correctif, une saisie effectuée le jour de création était ajoutée à la
// quête du jour au lieu de rembourser la dette. Si cette saisie a déjà comblé
// entièrement le manque initial, on clôt la dette sans redonner d'XP (les XP ont
// déjà été attribués par la validation normale de la quête).
export function reconcileSameDayQuestDebtState(state,today,now=Date.now()){
  const debt=state&&state.questDebt;
  if(!debt || debt.status!=="active" || debt.sourceDay!==today) return state;

  const logged=Number(state.dailyLog&&state.dailyLog[today]&&state.dailyLog[today][debt.id])||0;
  const baseline=Number(debt.current)||0;
  const amount=Number(debt.amount)||0;
  const postCreationProgress=Math.max(0,logged-baseline);
  if(amount<=0 || postCreationProgress<amount) return state;

  const resolved={...(state.debtResolvedDays||{}),[debt.sourceDay]:true};
  const resolvedIds={...(state.debtResolvedQuestIdsByDay||{})};
  resolvedIds[debt.sourceDay]=Array.from(new Set([...(resolvedIds[debt.sourceDay]||[]),debt.id]));
  return {
    ...state,
    questDebt:{...debt,paid:amount,status:"paid",completedAt:now,reconciledFromDailyLog:true},
    debtResolvedDays:resolved,
    debtResolvedQuestIdsByDay:resolvedIds
  };
}

export function applyQuestDebtPaymentState(state,used,today,now=Date.now()){
  if(!state || !(Number(used)>0)) return state;
  const current=state.questDebt;
  if(!current || current.status!=="active") return state;

  const paid=Math.min(
    Number(current.amount)||0,
    (Number(current.paid)||0)+Number(used)
  );
  if(paid<(Number(current.amount)||0)){
    return {...state,questDebt:{...current,paid}};
  }

  const resolved={...(state.debtResolvedDays||{}),[current.sourceDay]:true};
  const resolvedIds={...(state.debtResolvedQuestIdsByDay||{})};
  resolvedIds[current.sourceDay]=Array.from(new Set([...(resolvedIds[current.sourceDay]||[]),current.id]));
  const daily={...(state.dailyExtraXp||{})};
  const dayLog={...(daily[today]||{})};
  const totalDebtXp=(current.rewards||[]).reduce((sum,reward)=>sum+(reward.xp||0),0);
  if(totalDebtXp>0) dayLog.debt=(dayLog.debt||0)+totalDebtXp;
  daily[today]=dayLog;

  return {
    ...state,
    questDebt:{...current,paid,status:"paid",completedAt:now},
    debtResolvedDays:resolved,
    debtResolvedQuestIdsByDay:resolvedIds,
    dailyExtraXp:daily
  };
}

export function expireQuestDebtState(state,today,now=Date.now()){
  const debt=state&&state.questDebt;
  if(!debt || debt.status!=="active" || today<=debt.dueDay) return state;
  return {
    ...state,
    questDebt:{...debt,status:"failed",failedAt:now}
  };
}
