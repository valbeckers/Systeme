// Fonctions pures du cycle de vie des Donjons.
// Les mutations d'interface, animations, loot et application effective de l'XP
// restent volontairement dans app.js.

export function dungeonRoomRewardPairs(dungeon, roomIdx){
  if(!dungeon || !dungeon.reward) return [];
  const isBoss = roomIdx >= (dungeon.rooms||[]).length-1;
  const mainXp = isBoss ? 1350 : 225;
  const secondXp = isBoss ? 270 : 45;
  return [
    {xp:mainXp,stat:dungeon.reward.stat},
    dungeon.reward.stat2 ? {xp:secondXp,stat:dungeon.reward.stat2} : null,
    dungeon.reward.stat3 ? {xp:secondXp,stat:dungeon.reward.stat3} : null,
  ].filter(Boolean);
}

export function dungeonRewardPairs(dungeon){
  if(!dungeon || !dungeon.reward) return [];
  const totals={};
  (dungeon.rooms||[]).forEach((_,idx)=>{
    dungeonRoomRewardPairs(dungeon,idx).forEach(r=>{
      totals[r.stat]=(totals[r.stat]||0)+(r.xp||0);
    });
  });
  return Object.entries(totals).map(([stat,xp])=>({stat,xp}));
}

export function drawRandomDungeonId(dungeons, random=Math.random){
  const stats=[...new Set((dungeons||[]).map(d=>d.stat))];
  if(!stats.length) return null;
  const drawnStat=stats[Math.floor(random()*stats.length)];
  const candidates=(dungeons||[]).filter(d=>d.stat===drawnStat);
  if(!candidates.length) return null;
  return candidates[Math.floor(random()*candidates.length)].id;
}

export function activeDungeonView(activeDungeon, dungeons, now=Date.now()){
  const tpl=activeDungeon ? (dungeons||[]).find(d=>d.id===activeDungeon.id) : null;
  if(!activeDungeon || !tpl || activeDungeon.completedAt || now>=(activeDungeon.expiresAt||0)) return null;
  return {...tpl,...activeDungeon,tpl};
}

export function countDungeonRunsThisWeek(state, week, weekKeyForDate){
  const launched=new Set();
  (state.dungeonLog||[]).forEach(entry=>{
    const ts=entry && (entry.startedAt||entry.completedAt);
    if(ts && weekKeyForDate(new Date(ts))===week){
      launched.add(entry.runId||("log_"+ts+"_"+(entry.id||"")));
    }
  });
  const active=state.activeDungeon;
  if(active && active.startedAt && weekKeyForDate(new Date(active.startedAt))===week){
    launched.add(active.runId||("active_"+active.startedAt));
  }
  return launched.size;
}

export function launchDungeonState(state, options){
  const {
    id,
    constraint=null,
    now=Date.now(),
    day,
    week,
    dungeons,
    nextResetAt,
    weekKeyForDate
  }=options||{};

  const current=state.activeDungeon;
  if(current && !current.completedAt) return state;
  if(state.dungeonRunDay===day) return state;
  if(countDungeonRunsThisWeek(state,week,weekKeyForDate)>=3) return state;
  if(state.dungeonAccessOpen!==true) return state;

  const dungeon=(dungeons||[]).find(d=>d.id===id);
  if(!dungeon) return state;

  const expiresAt=nextResetAt;

  return {
    ...state,
    activeDungeon:{
      id,
      runId:"dg_"+now,
      startedAt:now,
      expiresAt,
      completedRooms:[],
      completedAt:null,
      contractConstraint:constraint||null
    },
    masterContractArmed:constraint?false:state.masterContractArmed,
    dungeonRunDay:day,
    dungeonAccessOpen:false,
    dungeonKeyDay:null,
    dungeonKeyRollWon:false,
    lastActiveDay:day
  };
}

export function expireActiveDungeonState(state, now=Date.now()){
  const current=state.activeDungeon;
  return current && !current.completedAt && now>=(current.expiresAt||0)
    ? {...state,activeDungeon:null}
    : state;
}

export function canValidateDungeonRoom(activeDungeon, dungeon, roomIdx){
  if(!activeDungeon || activeDungeon.completedAt || !dungeon) return false;
  if(!Number.isInteger(roomIdx) || roomIdx<0 || roomIdx>=dungeon.rooms.length) return false;
  const completed=Array.isArray(activeDungeon.completedRooms)?activeDungeon.completedRooms:[];
  if(completed.includes(roomIdx)) return false;
  const bossIdx=dungeon.rooms.length-1;
  if(activeDungeon.contractConstraint==="sealedPath"){
    const nextRequired=Array.from({length:dungeon.rooms.length},(_,i)=>i).find(i=>!completed.includes(i));
    return roomIdx===nextRequired;
  }
  if(roomIdx!==bossIdx) return true;
  return Array.from({length:bossIdx},(_,i)=>i).every(i=>completed.includes(i));
}
