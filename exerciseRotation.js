import { statLevelTier, legRaiseTargetForForceLevel, getStatLevelTarget } from "./progression.js";

export const EXERCISE_ROTATIONS = {
  push:[
    {id:"pushups",label:"Pompes",icon:"💪🏼"},
    {id:"dips",label:"Dips",icon:"💪🏼"},
  ],
  back:[
    {id:"negative_pullups",label:"Tractions négatives",icon:"💪🏼"},
    {id:"australian_pullups",label:"Tractions australiennes",icon:"💪🏼"},
  ],
  abs:[
    {id:"crunches",label:"Crunches",icon:"🧎🏻"},
    {id:"leg_raises",label:"Levées de jambes",icon:"🦵🏻"},
    {id:"plank",label:"Gainage",icon:"🫳🏼"},
    {id:"side_plank",label:"Gainage obliques",icon:"🧎🏻‍♂️‍➡️"},
  ],
  legs:[
    {id:"squats",label:"Squats",icon:"🦵🏻"},
    {id:"calves",label:"Mollets",icon:"🦵🏻"},
    {id:"lunges",label:"Fentes",icon:"🦵🏻"},
  ],
};
export const EXERCISE_FAMILY_LABELS={push:"Pecs & Triceps",negative_pullups:"Dos & Biceps",abs:"Abdos",squats:"Jambes"};
export const EXERCISE_FAMILY_ICONS={push:"🦾",negative_pullups:"🦾",abs:"🧱",squats:"🦿"};
export const LEGACY_EXERCISE_DEFAULTS={push:"pushups",back:"negative_pullups",abs:"crunches",legs:"squats"};
export function isExerciseFamilyQuestId(id){ return id==="push"||id==="negative_pullups"||id==="abs"||id==="squats"; }
export function exerciseFamilyLabel(id,fallback){ return EXERCISE_FAMILY_LABELS[id]||fallback||id; }
export function exerciseFamilyIcon(id,fallback){ return EXERCISE_FAMILY_ICONS[id]||fallback||"•"; }

export function weightedExercisePick(options,lastId){
  if(!Array.isArray(options)||!options.length) return null;
  if(!lastId || !options.some(o=>o.id===lastId)) return options[Math.floor(Math.random()*options.length)];
  const n=options.length;
  const repeatWeight=n===2?.30:n===3?.20:.10;
  const otherWeight=(1-repeatWeight)/(n-1);
  let roll=Math.random();
  for(const option of options){
    roll-=option.id===lastId?repeatWeight:otherWeight;
    if(roll<=0) return option;
  }
  return options[options.length-1];
}
export function previousRotationChoice(history,day,family){
  const days=Object.keys(history||{}).filter(d=>d<day).sort().reverse();
  for(const d of days){
    const id=history[d]&&history[d][family];
    if(id) return id;
  }
  return null;
}
export function ensureExerciseRotationForDay(state,day){
  const history={...(state.exerciseRotationByDay||{})};
  const current={...(history[day]||{})};
  let changed=!history[day];
  for(const [family,options] of Object.entries(EXERCISE_ROTATIONS)){
    if(options.some(o=>o.id===current[family])) continue;
    const last=previousRotationChoice(history,day,family);
    const picked=weightedExercisePick(options,last);
    current[family]=picked&&picked.id;
    changed=true;
  }
  if(!changed) return state;
  history[day]=current;
  return {...state,exerciseRotationByDay:history};
}
export function cleanExerciseRotationByDay(raw){
  const out={};
  Object.entries(raw||{}).forEach(([day,row])=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!row||typeof row!=="object") return;
    const clean={};
    Object.entries(EXERCISE_ROTATIONS).forEach(([family,options])=>{
      if(options.some(o=>o.id===row[family])) clean[family]=row[family];
    });
    // Migration d'une ancienne variante supprimée.
    if(row.abs==="reverse_plank" && !clean.abs) clean.abs="plank";
    if(Object.keys(clean).length) out[day]=clean;
  });
  return out;
}
export function rotatedQuestObjects(baseObjs,rotation,stats,totalXp){
  const force=Math.max(1,Number((stats||{}).Force)||1);
  const tier=statLevelTier(force);
  const byId=(family,id)=>EXERCISE_ROTATIONS[family].find(o=>o.id===id)||EXERCISE_ROTATIONS[family][0];
  const chest=byId("push",rotation&&rotation.push);
  const back=byId("back",rotation&&rotation.back);
  const abs=byId("abs",rotation&&rotation.abs);
  const legs=byId("legs",rotation&&rotation.legs);
  return (baseObjs||[]).map(obj=>{
    if(obj.id==="push") return {...obj,name:"Pecs & Triceps - "+chest.label,icon:chest.icon,exerciseId:chest.id,exerciseIcon:chest.icon,rotationExercise:chest.label,target:getStatLevelTarget("push",stats),unit:"rep",xpPer:3,stat2:null,xpPer2:null};
    if(obj.id==="negative_pullups"){
      if(back.id==="australian_pullups") return {...obj,name:"Dos & Biceps - Tractions australiennes",icon:back.icon,exerciseId:back.id,exerciseIcon:back.icon,rotationExercise:back.label,target:getStatLevelTarget("squats",stats),unit:"rep",xpPer:6,stat2:null,xpPer2:null};
      return {...obj,name:"Dos & Biceps - Tractions négatives",icon:back.icon,exerciseId:back.id,exerciseIcon:back.icon,rotationExercise:back.label,target:getStatLevelTarget("negative_pullups",stats),unit:"rep",xpPer:12,stat2:null,xpPer2:null};
    }
    if(obj.id==="abs"){
      if(abs.id==="crunches") return {...obj,name:"Abdos - Crunches",icon:abs.icon,exerciseId:abs.id,exerciseIcon:abs.icon,rotationExercise:abs.label,target:getStatLevelTarget("abs",stats),unit:"rep",xpPer:1.5};
      if(abs.id==="leg_raises") return {...obj,name:"Abdos - Levées de jambes",icon:abs.icon,exerciseId:abs.id,exerciseIcon:abs.icon,rotationExercise:abs.label,target:legRaiseTargetForForceLevel(force),unit:"rep",xpPer:3};
      if(abs.id==="side_plank") return {...obj,name:"Abdos - Gainage obliques",icon:abs.icon,exerciseId:abs.id,exerciseIcon:abs.icon,rotationExercise:abs.label,target:getStatLevelTarget("push",stats),unit:"rep",xpPer:3};
      return {...obj,name:"Abdos - Gainage",icon:abs.icon,exerciseId:abs.id,exerciseIcon:abs.icon,rotationExercise:abs.label,target:Math.max(1,Math.ceil(force/10)),unit:"min",xpPer:50};
    }
    if(obj.id==="squats"){
      if(legs.id==="calves") return {...obj,name:"Jambes - Mollets",icon:legs.icon,exerciseId:legs.id,exerciseIcon:legs.icon,rotationExercise:legs.label,target:getStatLevelTarget("calves",stats),unit:"rep",xpPer:2,stat2:"Agilite",xpPer2:1};
      if(legs.id==="lunges") return {...obj,name:"Jambes - Fentes",icon:legs.icon,exerciseId:legs.id,exerciseIcon:legs.icon,rotationExercise:legs.label,target:getStatLevelTarget("push",stats),unit:"rep",xpPer:3,stat2:null,xpPer2:null};
      return {...obj,name:"Jambes - Squats",icon:legs.icon,exerciseId:legs.id,exerciseIcon:legs.icon,rotationExercise:legs.label,target:getStatLevelTarget("squats",stats),unit:"rep",xpPer:3,stat2:"Agilite",xpPer2:3};
    }
    return obj;
  });
}
