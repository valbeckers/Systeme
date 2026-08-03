// ─── MOTEUR DE BUTIN ET DE RÉCOMPENSES D’OBJETS ───────────────────────────
// Fonctions pures : tirages indépendants, sélection des récompenses et
// mise à jour de l’état. Les animations et les appels Preact restent dans
// app.js.

import {
  INVENTORY_ITEMS,
  STANDARD_ITEM_DROPS,
  DUNGEON_GENERIC_DROPS,
  DUNGEON_SPECIFIC_DROPS
} from "./itemDefs.js?v=20260803-mystery-map-01";

function rollIndependentDrops(dropTable,random=Math.random){
  return (dropTable||[]).reduce((won,[id,probability])=>{
    const p=Number(probability)||0;
    if(random()<p){
      won.push({id,kind:p>=1?"guaranteed":"rare"});
    }
    return won;
  },[]);
}

export function rollStandardItemDrops(random=Math.random){
  return rollIndependentDrops(STANDARD_ITEM_DROPS,random);
}

export function rollDungeonItemDrops(dungeonId,random=Math.random){
  return rollIndependentDrops([
    ...DUNGEON_GENERIC_DROPS,
    ...(DUNGEON_SPECIFIC_DROPS[dungeonId]||[])
  ],random);
}

export function pickRandomBreachLoot(random=Math.random){
  const eligible=Object.entries(INVENTORY_ITEMS)
    .filter(([,item])=>!item.permanent)
    .map(([id])=>id);
  if(!eligible.length)return null;
  const index=Math.min(eligible.length-1,Math.floor(random()*eligible.length));
  return eligible[Math.max(0,index)]||null;
}

export function alliedGiftEligibleIds(){
  return Object.entries(INVENTORY_ITEMS)
    .filter(([,item])=>!item.permanent)
    .map(([id])=>id)
    .sort((a,b)=>(INVENTORY_ITEMS[a].short||"").localeCompare(
      INVENTORY_ITEMS[b].short||"",
      "fr",
      {sensitivity:"base"}
    ));
}

export function incrementLootState(state,rewardId){
  if(rewardId==="key"||rewardId==="dungeonKey"){
    return {
      ...state,
      dungeonKeys:Math.max(0,Math.floor(Number(state&&state.dungeonKeys)||0))+1
    };
  }
  return {
    ...state,
    inventory:{
      ...((state&&state.inventory)||{}),
      [rewardId]:Math.max(0,Math.floor(Number(state&&state.inventory&&state.inventory[rewardId])||0))+1
    }
  };
}

export function grantAlliedGiftState(state,rewardId){
  if(!state||!state.alliedGiftPending)return state;
  if(!alliedGiftEligibleIds().includes(rewardId))return state;
  return {
    ...incrementLootState(state,rewardId),
    alliedGiftPending:null
  };
}
