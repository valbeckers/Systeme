// ─── MOTEUR DE BUTIN ET DE RÉCOMPENSES D’OBJETS ───────────────────────────
// Fonctions pures : tirages indépendants, sélection des récompenses et
// mise à jour de l’état. Les animations et les appels Preact restent dans
// app.js.

import {
  INVENTORY_ITEMS,
  STANDARD_ITEM_DROPS,
  DUNGEON_GENERIC_DROPS,
  DUNGEON_SPECIFIC_DROPS
} from "./itemDefs.js?v=20260808-rewrite-rune-distinct";

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

const COUNTERPART_BALANCE_ID="counterpartBalance";

function finiteInventoryQty(state,id){
  if(id==="dungeonKey")return Math.max(0,Math.floor(Number(state&&state.dungeonKeys)||0));
  return Math.max(0,Math.floor(Number(state&&state.inventory&&state.inventory[id])||0));
}

function sortedNonPermanentIds(){
  return Object.entries(INVENTORY_ITEMS)
    .filter(([,item])=>!item.permanent)
    .map(([id])=>id)
    .sort((a,b)=>(INVENTORY_ITEMS[a].short||"").localeCompare(
      INVENTORY_ITEMS[b].short||"",
      "fr",
      {sensitivity:"base"}
    ));
}

export function counterpartBalanceSacrificeEligibleIds(state){
  return sortedNonPermanentIds()
    .filter(id=>id!==COUNTERPART_BALANCE_ID)
    .filter(id=>finiteInventoryQty(state,id)>0);
}

export function counterpartBalanceRewardEligibleIds(){
  return sortedNonPermanentIds();
}

export function exchangeCounterpartBalanceState(state,sacrificeIds,rewardId){
  if(!state)return state;
  const sacrifices=[...new Set((sacrificeIds||[]).map(String))];
  const sacrificeEligible=new Set(counterpartBalanceSacrificeEligibleIds(state));
  const rewardEligible=new Set(counterpartBalanceRewardEligibleIds());
  if(sacrifices.length!==3 || sacrifices.some(id=>!sacrificeEligible.has(id)) || !rewardEligible.has(rewardId))return state;
  if(finiteInventoryQty(state,COUNTERPART_BALANCE_ID)<1)return state;

  const inventory={...((state&&state.inventory)||{})};
  let dungeonKeys=Math.max(0,Math.floor(Number(state.dungeonKeys)||0));
  inventory[COUNTERPART_BALANCE_ID]=Math.max(0,Math.floor(Number(inventory[COUNTERPART_BALANCE_ID])||0)-1);

  for(const id of sacrifices){
    if(id==="dungeonKey")dungeonKeys=Math.max(0,dungeonKeys-1);
    else inventory[id]=Math.max(0,Math.floor(Number(inventory[id])||0)-1);
  }

  if(rewardId==="dungeonKey")dungeonKeys+=1;
  else inventory[rewardId]=Math.max(0,Math.floor(Number(inventory[rewardId])||0)+1);

  return {...state,inventory,dungeonKeys};
}

