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
  let streakXpToday=250;
  const statXp={...next.statXp,Discipline:(next.statXp.Discipline||0)+250};
  next={
    ...next,
    totalXp:next.totalXp+250,
    statXp,
    stats:{...next.stats,Discipline:getLevel(statXp.Discipline)},
    streakBonusDay:today
  };

  const newStreak=next.streak;
  const milestones=next.streakMilestones||[];
  let animation={
    title:"STREAK BONUS !",
    streak:newStreak,
    xp:250,
    subtitle:"+250 XP Discipline"
  };

  if(newStreak>0 && newStreak%7===0 && !milestones.includes(newStreak)){
    const milestoneXp=500;
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
      subtitle:"+750 XP Discipline",
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
