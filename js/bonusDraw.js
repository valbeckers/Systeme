// Un tirage par jour système. La quête d'allemand est toujours incluse.
function includeMandatoryGerman(selected,state,day,quests,goal){
  const german=quests.find(quest=>quest.id==="bonus_german");
  if(!german||selected.includes(german.id))return selected;
  const next=[...selected];
  if(next.length>=goal){
    const germanStat=german.category||german.stat;
    const notStarted=id=>Number((((state.dailyLog||{})[day]||{})[id])||0)<=0;
    let index=next.findIndex(id=>{
      const quest=quests.find(item=>item.id===id);
      return quest&&(quest.category||quest.stat)===germanStat&&notStarted(id);
    });
    if(index<0)index=next.findIndex(notStarted);
    if(index>=0)next.splice(index,1);
  }
  return [german.id,...next];
}

export function ensureDailyBonusDraw(state,day,quests,goal=5,random=Math.random){
  const drawn=state.bonusDrawDays||[];
  const byDay=state.selectedBonusQuestIdsByDay||{};
  let selected=byDay[day];
  if(drawn.includes(day)){
    if(!Array.isArray(selected))return state;
    const guaranteed=includeMandatoryGerman(selected,state,day,quests,goal);
    return guaranteed===selected?state:{...state,selectedBonusQuestIdsByDay:{...byDay,[day]:guaranteed}};
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
  }else{
    selected=includeMandatoryGerman(selected,state,day,quests,goal);
  }
  return {...state,selectedBonusQuestIdsByDay:{...byDay,[day]:selected},bonusDrawDays:[...drawn,day]};
}
