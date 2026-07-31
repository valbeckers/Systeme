import { LEGACY_EXERCISE_DEFAULTS } from "./exerciseRotation.js";

export const RECORD_EXERCISE_DEFS = [
  {id:"ex_pushups",name:"Pompes",icon:"💪🏼",unit:"rep",stat:"Force",sourceId:"push",family:"push",rotationId:"pushups"},
  {id:"ex_dips",name:"Dips",icon:"💪🏼",unit:"rep",stat:"Force",sourceId:"push",family:"push",rotationId:"dips"},
  {id:"ex_negative_pullups",name:"Tractions négatives",icon:"💪🏼",unit:"rep",stat:"Force",sourceId:"negative_pullups",family:"back",rotationId:"negative_pullups"},
  {id:"ex_australian_pullups",name:"Tractions australiennes",icon:"💪🏼",unit:"rep",stat:"Force",sourceId:"negative_pullups",family:"back",rotationId:"australian_pullups"},
  {id:"ex_crunches",name:"Crunches",icon:"🧎🏻",unit:"rep",stat:"Force",sourceId:"abs",family:"abs",rotationId:"crunches"},
  {id:"ex_leg_raises",name:"Levées de jambes",icon:"🦵🏻",unit:"rep",stat:"Force",sourceId:"abs",family:"abs",rotationId:"leg_raises"},
  {id:"ex_plank",name:"Gainage",icon:"🫳🏼",unit:"min",stat:"Force",sourceId:"abs",family:"abs",rotationId:"plank"},
  {id:"ex_side_plank",name:"Gainage obliques",icon:"🧎🏻‍♂️‍➡️",unit:"rep",stat:"Force",sourceId:"abs",family:"abs",rotationId:"side_plank"},
  {id:"ex_squats",name:"Squats",icon:"🦵🏻",unit:"rep",stat:"Force",sourceId:"squats",family:"legs",rotationId:"squats"},
  {id:"ex_calves",name:"Mollets",icon:"🦵🏻",unit:"rep",stat:"Force",sourceId:"squats",family:"legs",rotationId:"calves",legacySourceId:"calves"},
  {id:"ex_lunges",name:"Fentes",icon:"🦵🏻",unit:"rep",stat:"Force",sourceId:"squats",family:"legs",rotationId:"lunges"}
];

export function questRecordUnit(unit,value){
  const n=Number(value)||0;
  const plurals={rep:"reps",page:"pages",min:"min",verre:"verres",repas:"repas",km:"km",contact:"contacts",action:"actions",objet:"objets","sér.":"sér."};
  if(n>1 && plurals[unit]) return plurals[unit];
  return unit || "";
}

export function recordRotationIdForDay(exerciseRotationByDay,day,family){
  return ((exerciseRotationByDay||{})[day]||{})[family]||LEGACY_EXERCISE_DEFAULTS[family];
}

export function recordExerciseValueForDay(def,day,log,exerciseRotationByDay){
  let value=0;
  const row=log||{};
  if(recordRotationIdForDay(exerciseRotationByDay,day,def.family)===def.rotationId){
    value+=Number(row[def.sourceId])||0;
  }
  if(def.legacySourceId)value+=Number(row[def.legacySourceId])||0;
  return value;
}

export function buildRecordOptions({questDefs,dailyLog,exerciseRotationByDay}){
  const exerciseIds=new Set(["push","negative_pullups","abs","squats","calves"]);
  const exerciseOptions=RECORD_EXERCISE_DEFS.map(def=>{
    let best=0;
    Object.entries(dailyLog||{}).forEach(([day,log])=>{
      const value=recordExerciseValueForDay(def,day,log,exerciseRotationByDay);
      if(value>best)best=value;
    });
    return best>0?{
      obj:{
        id:def.sourceId,
        name:def.name,
        icon:def.icon,
        unit:def.unit,
        stat:def.stat,
        recordRotationId:def.rotationId,
        recordFamily:def.family
      },
      best
    }:null;
  }).filter(Boolean);

  const standardOptions=(questDefs||[])
    .filter(quest=>!quest.binary&&!quest.weekly&&!exerciseIds.has(quest.id))
    .map(quest=>{
      let best=0;
      Object.values(dailyLog||{}).forEach(log=>{
        const value=Number(log&&log[quest.id])||0;
        if(value>best)best=value;
      });
      return best>0?{obj:quest,best}:null;
    })
    .filter(Boolean);

  return [...exerciseOptions,...standardOptions];
}
