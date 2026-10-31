// Un tirage par jour système. Une sélection vidée volontairement reste vide.
export function ensureDailyBonusDraw(state,day,quests,goal=5,random=Math.random){
  const drawn=state.bonusDrawDays||[];
  if(drawn.includes(day))return state;
  const byDay=state.selectedBonusQuestIdsByDay||{};
  let selected=byDay[day];
  if(!Array.isArray(selected)){
    const groups=new Map();
    for(const quest of quests){
      const stat=quest.category||quest.stat;
      if(!stat||!quest.id)continue;
      if(!groups.has(stat))groups.set(stat,new Map());
      groups.get(stat).set(quest.id,quest);
    }
    const pool=[...groups.values()];
    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(random()*(i+1));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }
    selected=pool.slice(0,goal).map(group=>{
      const ids=[...group.keys()];
      return ids[Math.floor(random()*ids.length)];
    });
  }
  return {...state,selectedBonusQuestIdsByDay:{...byDay,[day]:selected},bonusDrawDays:[...drawn,day]};
}
