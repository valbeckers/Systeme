import { xpMomentumAdjustment } from "./xpMomentum.js?v=20260817-xp-momentum-v1";

export const REGRESSION_DEFS = [{
  id:"reg_red",
  name:"Régression actuelle",
  icon:"🔴",
  statPenalty:2000,
  globalPenalty:12000
}];

export const REGRESSION_DEF = REGRESSION_DEFS[0];

export function applyRegressionState(state,regression,{day,stats,getLevel}){
  if(!state || !regression || !day) return state;
  if((state.regressionLog||{})[day]) return state;

  const statXp={...(state.statXp||{})};
  const nextStats={...(state.stats||{})};
  (stats||[]).forEach(stat=>{
    statXp[stat]=Math.max(0,(Number(statXp[stat])||0)-regression.statPenalty);
    nextStats[stat]=getLevel(statXp[stat]);
  });

  return {
    ...state,
    totalXp:Math.max(0,(Number(state.totalXp)||0)-regression.globalPenalty),
    statXp,
    stats:nextStats,
    regressionLog:{...(state.regressionLog||{}),[day]:regression.id||true},
    lastActiveDay:day
  };
}

export function hasValidatedDailyCompletion(state,day){
  return !!(
    state?.streakBonusDay===day ||
    (Number((((state?.dailyExtraXp)||{})[day]||{}).streak)||0)>0
  );
}

export function areRequiredDailyQuestsComplete(state,requiredObjectives,dailyLog,targetFor){
  if(state?.questDebt&&state.questDebt.status==="active") return false;
  return (requiredObjectives||[]).every(obj=>(Number((dailyLog||{})[obj.id])||0)>=targetFor(obj));
}

export function areBonusQuestsComplete(bonusObjectives,dailyLog,targetFor){
  const objectives=bonusObjectives||[];
  if(!objectives.length) return false;
  return objectives.every(obj=>{
    if(obj.isEnduranceChoice) return false;
    const target=(obj.target&&!obj.binary)?obj.target:targetFor(obj);
    const value=Number((dailyLog||{})[obj.id])||0;
    return obj.binary ? value>=1 : value>=target;
  });
}

export function computeQuestStreak(state,today,{activeObjectivesOnDay,targetForDay,targetForToday}){
  let streak=0;
  const debt=state?.questDebt;
  const resolved=state?.debtResolvedDays||{};
  const isProtectedDebtDay=day=>!!(
    resolved[day] ||
    (debt && debt.sourceDay===day && debt.status==="active")
  );

  const d=new Date(today);
  d.setDate(d.getDate()-1);
  for(let i=0;i<365;i++){
    const day=d.toISOString().slice(0,10);
    const log=(state?.dailyLog||{})[day]||{};
    const naturallyDone = hasValidatedDailyCompletion(state,day) ||
      (activeObjectivesOnDay(day)||[]).every(obj=>(Number(log[obj.id])||0)>=targetForDay(obj,day));
    if(naturallyDone){
      streak++;
    }else if(isProtectedDebtDay(day)){
      if(resolved[day]) streak++;
    }else{
      break;
    }
    d.setDate(d.getDate()-1);
  }

  const todayLog=(state?.dailyLog||{})[today]||{};
  const todayDone=(activeObjectivesOnDay(today)||[]).every(obj=>(Number(todayLog[obj.id])||0)>=targetForToday(obj));
  if(todayDone && !(debt&&debt.status==="active")) streak++;
  return streak;
}

function nextDay(day){
  const d=new Date(day+"T12:00:00Z");
  d.setUTCDate(d.getUTCDate()+1);
  return d.toISOString().slice(0,10);
}

// Finalise les journées dans l'ordre. Une dette encore active suspend la
// décision : elle ne crée aucun jour manqué avant son échéance.
export function reconcileXpMomentumState(state,today,{activeObjectivesOnDay,targetForDay}){
  if(!state||!today) return state;
  let last=state.xpMomentumLastProcessedDay||today;
  let missed=Math.max(0,Math.floor(Number(state.inertiaMissedDays)||0));
  let inertia=Math.min(5,Math.max(0,Number(state.inertiaPercent)||0));
  let changed=false;
  let day=nextDay(last);

  for(let guard=0;guard<400&&day<today;guard++,day=nextDay(day)){
    const debt=state.questDebt;
    const resolved=!!((state.debtResolvedDays||{})[day]);
    if(debt&&debt.sourceDay===day&&debt.status==="active"&&!resolved) break;

    const log=(state.dailyLog||{})[day]||{};
    const complete=resolved || hasValidatedDailyCompletion(state,day) ||
      (activeObjectivesOnDay(day)||[]).every(obj=>(Number(log[obj.id])||0)>=targetForDay(obj,day));

    if(complete){
      missed=0;
      inertia=0;
    }else{
      missed+=1;
      inertia=Math.min(5,Math.max(0,missed-1));
    }
    last=day;
    changed=true;
  }

  if(!changed) return state;
  return {...state,xpMomentumLastProcessedDay:last,inertiaMissedDays:missed,inertiaPercent:inertia};
}

export function urgentQuestCompletedOnDay(specialQuests,day,toDayString){
  return (specialQuests||[]).some(quest=>{
    if(!quest || !quest.completedAt) return false;
    return toDayString(quest.completedAt)===day;
  });
}

export function applyDailyStreakRewardState(state,{today,getLevel}){
  let next={...state};
  if(state.lastStreakDay!==today) next={...next,lastStreakDay:today};

  if(state.streakBonusDay===today){
    return {state:next,awarded:false};
  }

  const beforeXp=next.totalXp;
  const beforeStats={...next.stats};
  const baseStreakXp=250;
  const firstGain=xpMomentumAdjustment(baseStreakXp,next).gain;
  let streakXpToday=firstGain;
  const statXp={...next.statXp,Discipline:(next.statXp.Discipline||0)+firstGain};
  next={
    ...next,
    totalXp:next.totalXp+firstGain,
    statXp,
    stats:{...next.stats,Discipline:getLevel(statXp.Discipline)},
    streakBonusDay:today
  };

  const newStreak=next.streak;
  const milestones=next.streakMilestones||[];
  let animation={
    title:"STREAK BONUS !",
    streak:newStreak,
    xp:firstGain,
    subtitle:"+"+Math.round(firstGain*100)/100+" XP Discipline"
  };

  if(newStreak>0 && newStreak%7===0 && !milestones.includes(newStreak)){
    const milestoneXp=xpMomentumAdjustment(500,next).gain;
    streakXpToday+=milestoneXp;
    const milestoneStatXp={...statXp,Discipline:(statXp.Discipline||0)+milestoneXp};
    next={
      ...next,
      totalXp:next.totalXp+milestoneXp,
      statXp:milestoneStatXp,
      stats:{...next.stats,Discipline:getLevel(milestoneStatXp.Discipline)},
      streakMilestones:[...milestones,newStreak]
    };
    animation={
      title:"MILESTONE !",
      streak:newStreak,
      xp:streakXpToday,
      subtitle:"+"+(Math.round(streakXpToday*100)/100)+" XP Discipline",
      detail:newStreak+" jours de streak"
    };
  }

  const daily={...(next.dailyExtraXp||{})};
  const dayLog={...(daily[today]||{})};
  dayLog.streak=(dayLog.streak||0)+streakXpToday;
  daily[today]=dayLog;
  next={...next,dailyExtraXp:daily};

  return {
    state:next,
    awarded:true,
    animation,
    beforeXp,
    beforeStats,
    afterXp:next.totalXp,
    afterStats:next.stats
  };
}
