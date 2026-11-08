// Le cours d'allemand est inclus au tirage initial, mais reste modifiable ensuite.
export function ensureDailyBonusDraw(state,day,quests,goal=5,random=Math.random){
  const drawn=state.bonusDrawDays||[];
  const byDay=state.selectedBonusQuestIdsByDay||{};
  let selected=byDay[day];
  if(drawn.includes(day)){
    return state;
  }
  if(!Array.isArray(selected)){
    const german=quests.find(quest=>quest.id==="bonus_german");
    const mandatoryIds=german?[german.id]:[];
    const groups=new Map();
    const germanStat=german?(german.category||german.stat):null;
    for(const quest of quests){
      const stat=quest.category||quest.stat;
      if(!stat||!quest.id||quest.id==="bonus_german"||stat===germanStat)continue;
      if(!groups.has(stat))groups.set(stat,new Map());
      groups.get(stat).set(quest.id,quest);
    }
    const pool=[...groups.values()];
    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(random()*(i+1));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }
    const remaining=Math.max(0,goal-mandatoryIds.length);
    const drawnGroups=pool.slice(0,remaining);
    selected=[...mandatoryIds,...drawnGroups.map(group=>{
      const ids=[...group.keys()];
      return ids[Math.floor(random()*ids.length)];
    })];
  }
  return {...state,selectedBonusQuestIdsByDay:{...byDay,[day]:selected},bonusDrawDays:[...drawn,day]};
}
