import { addDaysStr } from "./dayCycle.js";

export const INJURY_ZONES = [
  {id:"push",label:"PECS & TRICEPS"},
  {id:"abs",label:"ABDOS"},
  {id:"squats",label:"JAMBES"}
];

const validDay = value => typeof value==="string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value+"T12:00:00Z"));

export function cleanInjuryPeriods(value){
  if(!Array.isArray(value)) return [];
  return value.filter(entry=>entry && INJURY_ZONES.some(zone=>zone.id===entry.zoneId) &&
    validDay(entry.startDay) && validDay(entry.endDay) && entry.endDay>=entry.startDay &&
    addDaysStr(entry.startDay,364)>=entry.endDay)
    .map(({zoneId,startDay,endDay})=>({zoneId,startDay,endDay})).slice(-200);
}

export function injuryForDay(state,day){
  return (state?.injuryPeriods||[]).findLast(entry=>entry.startDay<=day && day<=entry.endDay) || null;
}

export function isInjuredQuest(state,day,questId){
  return injuryForDay(state,day)?.zoneId===questId;
}

export function injuryDaysRemaining(injury,day){
  if(!injury || day<injury.startDay || day>injury.endDay) return 0;
  return Math.round((Date.parse(injury.endDay+"T12:00:00Z")-Date.parse(day+"T12:00:00Z"))/86400000)+1;
}
