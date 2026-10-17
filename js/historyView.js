import { REGRESSION_DEF, hasValidatedDailyCompletion } from "./dailyEngine.js";
import { isInjuredQuest } from "./injuryEngine.js?v=20261017-editor-v1";
import { hasResolvedQuestDebt, inferLegacyResolvedDebtQuestId } from "./debtEngine.js?v=20260817-debt-history-v3";
import { wkStr } from "./dayCycle.js";
import { getRankBase, sortStat } from "./progression.js?v=20261017-vacuum-v1";
import {
  LEGACY_EXERCISE_DEFAULTS,
  isExerciseFamilyQuestId,
  exerciseFamilyLabel,
  rotatedQuestObjects
} from "./exerciseRotation.js?v=20261017-editor-v1";
import { RECORD_EXERCISE_DEFS, recordExerciseValueForDay } from "./records.js?v=20261017-editor-v1";
import { UiIcon } from "./uiIcons.js?v=20261017-vacuum-v1";
import { weeklyXpWithoutRegression } from "./weeklyRegressionXp.js?v=20261016-v1";
import { dailyEligibleForDay } from "./drawPreferences.js?v=20261017-vacuum-v1";

const { h, Fragment } = window.preact;
const { useRef, useState } = window.preactHooks;

const WEEKLY_BADGE_COLOR = "#818cf8";
const BONUS_BADGE_COLOR = "#fbbf24";
const HIDDEN_FROM_HISTORY_IDS = new Set([
  "weekly_pro_meetings",
  "weekly_pro_actions",
  "weekly_pro_anticipation"
]);
const HIDDEN_FROM_WEEKLY_ACTIVITY_IDS = new Set([
  "bonus_pullups",
  "bonus_negative_pullups",
  "bonus_australian_pullups",
  "walk",
  "march"
]);

function QuestIcon(id, fallback, size=14, extraStyle=""){
  const slotSize=size>=18?26:18;
  return h(UiIcon,{
    iconKey:"quest."+id,
    fallback,
    slotSize,
    glyphSize:size,
    extraStyle
  });
}

function questBadgeStyle(color, filled=false, extra=""){
  return "display:inline-flex;align-items:center;justify-content:center;height:13px;min-width:34px;padding:0 4px;border-radius:3px;font-family:Orbitron,sans-serif;font-size:7.5px;font-weight:700;letter-spacing:0.65px;line-height:1;border:1px solid "+color+"55;color:"+color+";background:"+(filled?color+"22":"transparent")+";flex-shrink:0;white-space:nowrap;"+extra;
}

function QuestBadge({label,color,filled=false,extra=""}){
  return h("span",{style:questBadgeStyle(color,filled,extra)},label);
}

const fmtNum = (v, max=2) => {
  const n = Number(v);
  if(!Number.isFinite(n)) return "0";
  if(Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toFixed(max).replace(/\.0+$/,"").replace(/(\.\d*?)0+$/,"$1");
};

export function HistoryTab({
  state,
  setState,
  objs,
  baseObjs,
  today,
  ri,
  prestige,
  wkOff,
  setWkOff,
  monthOff,
  setMonthOff,
  selectedHistoryDay,
  setSelectedHistoryDay,
  historyOpen,
  setHistoryOpen,
  getWeekSummary,
  getValidateThreshold,
  runRecordResetDay
}){
  const weightInputRef=useRef(null);
  const [weightError,setWeightError]=useState("");
  const [weightMonthOff,setWeightMonthOff]=useState(0);
  const [selectedWeighIn,setSelectedWeighIn]=useState(null);
  const [confirmWeightDeletion,setConfirmWeightDeletion]=useState(false);
  const open = historyOpen;
  const setOpen = setHistoryOpen;
  const toggle = k => setOpen(o=>({week:false,monthly:false,weight:false,records:false,[k]:!o[k]}));
  const ChevronBtn = ({k}) => h("span",{
    onClick:(e)=>{e.stopPropagation();toggle(k);},
    style:"cursor:pointer;color:var(--td);font-size:10px;font-family:Orbitron,sans-serif;font-weight:700;letter-spacing:1px;flex-shrink:0;user-select:none"
  },open[k]?"\u25B2":"\u25BC");
  function localDate(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return y+"-"+m+"-"+day;}
  function getWS(off){const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7)-off*7);d.setHours(0,0,0,0);return d;}
  const ws=getWS(wkOff);
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(ws);d.setDate(ws.getDate()+i);return localDate(d);});
  const wKey=wkStr(ws);
  const weeklySummary=getWeekSummary(wKey);
  const dt={};
  weekDays.forEach(dk=>Object.entries(state.dailyLog[dk]||{}).forEach(([id,v])=>{dt[id]=(dt[id]||0)+v;}));
  const wkLogEntry=state.weeklyLog[wKey]||{};
  const tots={...dt,...wkLogEntry};
  const we=new Date(ws); we.setDate(ws.getDate()+6);
  const fmt=d=>d.getDate().toString().padStart(2,"0")+"/"+(d.getMonth()+1).toString().padStart(2,"0");
  const lbl=wkOff===0?"Cette semaine":wkOff===1?"Semaine derni\u00e8re":fmt(ws)+" \u2013 "+fmt(we);
  const visibleInHistory=o=>!HIDDEN_FROM_HISTORY_IDS.has(o.id);
  const visibleInWeeklyActivity=o=>visibleInHistory(o)&&!HIDDEN_FROM_WEEKLY_ACTIVITY_IDS.has(o.id);
  const ordered=[...sortStat(objs.filter(o=>visibleInWeeklyActivity(o)&&o.daily&&!o.optional)),...sortStat(objs.filter(o=>visibleInWeeklyActivity(o)&&o.weekly)),...sortStat(objs.filter(o=>visibleInWeeklyActivity(o)&&o.daily&&o.optional&&!o.bonusHidden))];

  const exerciseHistoryDefs=RECORD_EXERCISE_DEFS;
  const rotatingSourceIds=new Set(["push","negative_pullups","abs","squats","calves"]);
  const hiddenFromRecordsAndTotals=new Set(["water","sleep"]);
  function dailyQuestForHistoryDay(obj,day){
    if(!isExerciseFamilyQuestId(obj.id)) return obj;
    const rotation=(state.exerciseRotationByDay||{})[day]||{
      push:LEGACY_EXERCISE_DEFAULTS.push,
      back:LEGACY_EXERCISE_DEFAULTS.back,
      abs:LEGACY_EXERCISE_DEFAULTS.abs,
      legs:LEGACY_EXERCISE_DEFAULTS.legs
    };
    return rotatedQuestObjects(baseObjs,rotation,state.stats,state.totalXp,ri,state.prestige||0).find(q=>q.id===obj.id)||obj;
  }
  const standardDailyRecordObjs=[
    ...sortStat(objs.filter(o=>visibleInHistory(o)&&o.daily&&!o.optional&&!o.binary&&!rotatingSourceIds.has(o.id)&&!hiddenFromRecordsAndTotals.has(o.id))),
    ...sortStat(objs.filter(o=>visibleInHistory(o)&&o.weekly&&!o.binary&&!rotatingSourceIds.has(o.id))),
    ...sortStat(objs.filter(o=>visibleInHistory(o)&&o.daily&&o.optional&&!o.binary&&!o.bonusHidden&&!rotatingSourceIds.has(o.id)))
  ];
  const recordDisplayObjs=[...exerciseHistoryDefs,...standardDailyRecordObjs];

  const weekLbls=["L","M","M","J","V","S","D"];
  const monthStart=new Date(Number(today.slice(0,4)),Number(today.slice(5,7))-1-monthOff,1);
  const monthYear=monthStart.getFullYear();
  const monthIndex=monthStart.getMonth();
  const monthKey=monthYear+"-"+String(monthIndex+1).padStart(2,"0");
  const monthLabel=monthStart.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
  const daysInMonth=new Date(monthYear,monthIndex+1,0).getDate();
  const monthPadding=(monthStart.getDay()+6)%7;
  const chosenDay=selectedHistoryDay?.startsWith(monthKey+"-")
    ? selectedHistoryDay
    : monthKey+"-"+String(monthOff===0?Number(today.slice(8)):1).padStart(2,"0");
  const monthlyQuests=[...sortStat(objs.filter(o=>o.daily&&!o.optional)),...objs.filter(o=>o.id==="run")];
  const weighIns=[...(state.weightLog||[])].sort((a,b)=>a.recordedAt-b.recordedAt);
  const currentMonth=new Date();
  const firstWeighIn=weighIns[0];
  const oldestMonth=firstWeighIn?new Date(Number(firstWeighIn.date.slice(0,4)),Number(firstWeighIn.date.slice(5,7))-1,1):currentMonth;
  const maxWeightMonthOff=Math.max(0,(currentMonth.getFullYear()-oldestMonth.getFullYear())*12+currentMonth.getMonth()-oldestMonth.getMonth());
  const displayedWeightMonthOff=Math.min(weightMonthOff,maxWeightMonthOff);
  const weightMonthStart=new Date(currentMonth.getFullYear(),currentMonth.getMonth()-displayedWeightMonthOff,1);
  const weightMonthEnd=new Date(weightMonthStart.getFullYear(),weightMonthStart.getMonth()+1,1);
  const weightMonthKey=localDate(weightMonthStart).slice(0,7);
  const weightMonthLabel=weightMonthStart.toLocaleDateString("fr-FR",{month:"long",year:"numeric"});
  const graphEntries=weighIns.filter(entry=>entry.date.startsWith(weightMonthKey));
  const minWeight=weighIns.length?Math.min(...weighIns.map(x=>x.weight)):0;
  const maxWeight=weighIns.length?Math.max(...weighIns.map(x=>x.weight)):0;
  const graphLow=minWeight-Math.max(.5,(maxWeight-minWeight)*.15);
  const graphHigh=maxWeight+Math.max(.5,(maxWeight-minWeight)*.15);
  const graphPoints=graphEntries.map(entry=>({
    x:30+300*Math.max(0,Math.min(1,(entry.recordedAt-weightMonthStart.getTime())/(weightMonthEnd.getTime()-weightMonthStart.getTime()))),
    y:140-112*(entry.weight-graphLow)/(graphHigh-graphLow)
  }));
  const weightLabel=value=>fmtNum(value,2).replace(".",",");
  const shortDate=date=>date.slice(8)+"/"+date.slice(5,7)+"/"+date.slice(0,4);
  function saveWeight(event){
    event.preventDefault();
    const input=weightInputRef.current;
    const value=Number(String(input?.value||"").trim().replace(",","."));
    if(!Number.isFinite(value)||value<=0||value>500||!/^\d+(?:[.,]\d{1,2})?$/.test(input.value.trim())){
      setWeightError("Saisis un poids valide en kg, avec deux décimales au maximum.");
      return;
    }
    const now=new Date();
    const date=localDate(now);
    setState(previous=>{
      const log=previous.weightLog||[];
      const recordedAt=Math.max(now.getTime(),(log.at(-1)?.recordedAt||0)+1);
      return {...previous,weightLog:[...log,{date,weight:value,recordedAt}]};
    });
    input.value="";
    setWeightError("");
  }

  function weeklyTargetFor(obj){
    if(obj.binary) return 7;
    return obj.weekly ? getRankBase(obj.id,ri,prestige,state.stats) : ((obj.target&&!obj.binary?obj.target:getRankBase(obj.id,ri,prestige,state.stats))*7);
  }
  function dayTargetFor(obj,day){
    if(obj.binary) return 1;
    if(obj.weekly) return getValidateThreshold(obj,day);
    return getValidateThreshold(obj,day);
  }
  function dayMarkFor(obj,day){
    if(obj.startDate&&day<obj.startDate) return {txt:"·",color:"var(--td)",opacity:.45};
    if(obj.daily&&!obj.optional&&!dailyEligibleForDay(state,day,obj.id))
      return {txt:"·",color:"var(--td)",opacity:.45};
    if((obj.daily&&!obj.optional&&isInjuredQuest(state,day,obj.id)) ||
       (obj.id==="run"&&isInjuredQuest(state,day,"squats")))
      return {txt:"",color:"#86efac",opacity:1,injured:true};
    const log=state.dailyLog[day]||{};
    const dayObj=dailyQuestForHistoryDay(obj,day);
    const value=log[obj.id]||0;
    const target=dayTargetFor(dayObj,day);
    const validationTarget=obj.optional?Math.ceil(target*0.5):target;
    const previouslyValidated=day<today&&!!obj.daily&&!obj.optional&&hasValidatedDailyCompletion(state,day);
    const requiredForDay=objs
      .filter(item=>item.daily&&!item.optional&&(!item.startDate||item.startDate<=day)&&dailyEligibleForDay(state,day,item.id))
      .map(item=>dailyQuestForHistoryDay(item,day));
    const legacyDebtQuestId=inferLegacyResolvedDebtQuestId(
      state,
      day,
      requiredForDay,
      (item,targetDay)=>dayTargetFor(item,targetDay)
    );
    const debtValidated=hasResolvedQuestDebt(state,day,obj.id)||legacyDebtQuestId===obj.id;
    const ok=previouslyValidated||debtValidated||value>=validationTarget;

    if(ok) return {txt:"✓",color:"#4ade80",opacity:1};
    if(day>today) return {txt:"·",color:"var(--td)",opacity:.45};
    if(day===today) return {txt:"·",color:"var(--td)",opacity:.75};
    return {txt:"✘",color:"#ef4444",opacity:1};
  }

  const records={};
  Object.entries(state.dailyLog).forEach(([date,log])=>{
    Object.entries(log).forEach(([id,val])=>{
      if(id==="run"&&date<runRecordResetDay) return;
      if(!records[id]||val>records[id].val) records[id]={val,date};
    });
  });
  exerciseHistoryDefs.forEach(def=>{
    Object.entries(state.dailyLog||{}).forEach(([date,log])=>{
      const val=recordExerciseValueForDay(def,date,log,state.exerciseRotationByDay);
      if(val>0&&(!records[def.id]||val>records[def.id].val)) records[def.id]={val,date};
    });
  });

  return h("div",{class:"tab"},
    h("div",{class:"card"},
      h("div",{style:"display:flex;align-items:center;justify-content:space-between;cursor:pointer",onClick:()=>toggle("week")},
        h("div",{class:"ctitle",style:"margin:0"},"Activité de la semaine"),
        h(ChevronBtn,{k:"week"})
      ),
      open.week&&h(Fragment,null,
      h("div",{style:"display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:14px"},
        h("button",{type:"button",disabled:wkOff>=51,style:"background:var(--sf2);border:1px solid var(--rc);border-radius:8px;color:var(--rc);font-size:18px;width:40px;height:40px;cursor:pointer;opacity:"+(wkOff>=51?.3:.8),onClick:()=>setWkOff(o=>Math.min(o+1,51))},"\u2039"),
        h("div",{style:"text-align:center;flex:1"},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:12px;color:var(--rc);letter-spacing:1px"},lbl),
          h("div",{style:"font-size:10px;color:var(--td);margin-top:2px"},fmt(ws)+" \u2013 "+fmt(we))
        ),
        h("button",{type:"button",disabled:wkOff===0,style:"background:var(--sf2);border:1px solid var(--rc);border-radius:8px;color:var(--rc);font-size:18px;width:40px;height:40px;cursor:pointer;opacity:"+(wkOff===0?.3:.8),onClick:()=>setWkOff(o=>Math.max(o-1,0))},"\u203A")
      ),
      h("div",{style:"display:grid;grid-template-columns:minmax(0,1fr) repeat(7,22px);gap:5px;align-items:center;margin-top:10px;margin-bottom:8px;font-family:Orbitron,sans-serif;font-size:9px;color:#fff;letter-spacing:1px;text-transform:uppercase"},
        h("div",null,"Quête"),
        weekLbls.map((dayLabel,i)=>h("div",{key:"h"+i,style:"text-align:center;color:#fff"},dayLabel))
      ),
      h("div",{style:"display:flex;flex-direction:column;gap:0"},
        ordered.map(obj=>{
          const marks=weekDays.map(d=>dayMarkFor(obj,d));
          const displayName=exerciseFamilyLabel(obj.id,obj.name);
          return h("div",{key:obj.id,style:"display:grid;grid-template-columns:minmax(0,1fr) repeat(7,22px);gap:5px;align-items:center;padding:9.5px 0;border-top:1px solid rgba(255,255,255,0.04)"},
            h("div",{style:"display:flex;align-items:center;gap:6px;min-width:0;color:var(--tx);font-size:12px"},
              QuestIcon(obj.id,obj.icon,14),
              h("span",{style:"overflow:hidden;text-overflow:ellipsis;white-space:nowrap"},displayName)
            ),
            marks.map((mark,i)=>h("div",{key:obj.id+"_d"+i,title:mark.injured?"Blessure · quête suspendue":undefined,"aria-label":mark.injured?"Blessure · quête suspendue":undefined,style:"display:flex;align-items:center;justify-content:center;min-height:22px;text-align:center;font-family:Orbitron,sans-serif;font-size:12px;font-weight:700;color:"+mark.color+";opacity:"+mark.opacity},
              mark.injured?h("img",{src:"./assets/ui/injury-bandage.png?v=20261003-v1",alt:"",width:20,height:20,draggable:false,style:"display:block;width:19.8px;height:19.8px;object-fit:contain"}):mark.txt
            ))
          );
        }),
        h("div",{key:REGRESSION_DEF.id,style:"display:grid;grid-template-columns:minmax(0,1fr) repeat(7,22px);gap:5px;align-items:center;padding:9.5px 0;border-top:1px solid rgba(255,255,255,0.04)"},
          h("div",{style:"display:flex;align-items:center;min-width:0;color:var(--tx);font-size:12px"},
            QuestIcon(REGRESSION_DEF.id,REGRESSION_DEF.icon,14)
          ),
          weekDays.map((day,i)=>{
            const future=day>today;
            const activated=!!((state.regressionLog||{})[day]);
            const mark=future
              ? {txt:"·",color:"var(--td)",opacity:.45}
              : activated
                ? {txt:"✘",color:"#ef4444",opacity:1}
                : {txt:"✓",color:"#4ade80",opacity:1};
            return h("div",{key:REGRESSION_DEF.id+"_d"+i,style:"text-align:center;font-family:Orbitron,sans-serif;font-size:12px;font-weight:700;color:"+mark.color+";opacity:"+mark.opacity},mark.txt);
          })
        ),
        ordered.every(o=>!(tots[o.id]>0))&&h("div",{style:"text-align:center;font-size:13px;color:var(--td);padding:16px 0"},"Aucune activité cette semaine")
      ),
      h("div",{style:"display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:18px;padding-top:13px;border-top:1px solid rgba(255,255,255,.08)"},
        [["Meilleur streak",(weeklySummary.bestStreak||0)+" j"],
         ["Donjons terminés",weeklySummary.dungeons||0],
         ["Portails contenus",weeklySummary.portals||0],
         ["XP obtenu",Math.round(weeklyXpWithoutRegression(state,weeklySummary)).toLocaleString("fr-FR")+" XP"]]
          .map(([label,value])=>h("div",{key:label,style:"padding:8px;border-radius:8px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);text-align:center"},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:var(--rc)"},value),
            h("div",{style:"font-size:8.5px;color:var(--td);margin-top:3px;text-transform:uppercase"},label)
          ))
      ),
      weeklySummary.professional&&weeklySummary.professional.length>0&&h("div",{style:"margin-top:14px"},weeklySummary.professional.map(item=>h("div",{key:item.id,style:"display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:8px 0;border-top:1px solid rgba(255,255,255,.05);font-size:11px"},
        h("span",{style:"color:var(--tx);min-width:0"},item.name),
        h("span",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:"+(item.done?"#4ade80":"var(--td)")+";white-space:nowrap"},fmtNum(item.value)+"/"+fmtNum(item.target)+" "+item.unit+(item.done?" ✓":""))
      )))
      )
    ),
    h("div",{class:"card"},
      h("div",{style:"display:flex;align-items:center;justify-content:space-between;cursor:pointer",onClick:()=>toggle("monthly")},
        h("div",{class:"ctitle",style:"margin:0"},"Activité du mois"),
        h(ChevronBtn,{k:"monthly"})
      ),
      open.monthly&&h(Fragment,null,
        h("div",{style:"display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px"},
          h("button",{onClick:()=>{setMonthOff(v=>Math.min(v+1,36));setSelectedHistoryDay(null);},disabled:monthOff>=36,style:"background:var(--sf2);border:1px solid var(--rc);border-radius:8px;color:var(--rc);font-size:18px;width:38px;height:38px;opacity:"+(monthOff>=36?.3:1)},"‹"),
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:var(--rc);text-align:center;text-transform:capitalize"},monthLabel),
          h("button",{onClick:()=>{setMonthOff(v=>Math.max(v-1,0));setSelectedHistoryDay(null);},disabled:monthOff===0,style:"background:var(--sf2);border:1px solid var(--rc);border-radius:8px;color:var(--rc);font-size:18px;width:38px;height:38px;opacity:"+(monthOff===0?.3:1)},"›")
        ),
        h("div",{style:"display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;margin-top:14px"},
          weekLbls.map((label,i)=>h("div",{key:"month_head_"+i,style:"text-align:center;font-family:Orbitron,sans-serif;font-size:9px;color:var(--td);padding:3px"},label)),
          Array.from({length:monthPadding},(_,i)=>h("div",{key:"month_blank_"+i})),
          Array.from({length:daysInMonth},(_,i)=>{
            const day=monthKey+"-"+String(i+1).padStart(2,"0");
            const future=day>today;
            const selected=day===chosenDay;
            const progressed=monthlyQuests.some(obj=>Number((state.dailyLog[day]||{})[obj.id])>0);
            return h("button",{key:day,onClick:()=>setSelectedHistoryDay(day),disabled:future,
              style:"height:43px;min-width:0;border-radius:8px;border:1px solid "+(selected?"var(--rc)":"rgba(255,255,255,.08)")+";background:"+(selected?"rgba(168,85,247,.17)":"rgba(255,255,255,.025)")+";color:"+(future?"var(--td)":"var(--tx)")+";opacity:"+(future?.35:1)+";font-family:Orbitron,sans-serif;font-size:11px;cursor:"+(future?"default":"pointer")},
              i+1,
              h("span",{style:"display:block;width:4px;height:4px;border-radius:50%;margin:3px auto 0;background:"+(progressed?"#a78bfa":"transparent")})
            );
          })
        ),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:var(--rc);margin-top:17px;margin-bottom:5px"},"LE "+chosenDay.slice(8)+"/"+chosenDay.slice(5,7)),
        monthlyQuests.filter(obj=>!obj.startDate||obj.startDate<=chosenDay).map(obj=>{
          const dayObj=dailyQuestForHistoryDay(obj,chosenDay);
          const value=Number((state.dailyLog[chosenDay]||{})[obj.id])||0;
          const injured=isInjuredQuest(state,chosenDay,obj.id)||(obj.id==="run"&&isInjuredQuest(state,chosenDay,"squats"));
          const unit=dayObj.unit==="rep"?(value>1?"reps":"rep"):dayObj.unit==="verre"?(value>1?"verres":"verre"):dayObj.unit||"";
          return h("div",{key:"month_"+obj.id,style:"display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px solid rgba(255,255,255,.05)"},
            h("div",{style:"display:flex;align-items:center;gap:7px;min-width:0;font-size:11px;color:var(--tx)"},QuestIcon(obj.id,obj.icon,14),h("span",{style:"overflow:hidden;text-overflow:ellipsis;white-space:nowrap"},dayObj.name)),
            h("span",{style:"display:inline-flex;align-items:center;gap:3px;font-family:Orbitron,sans-serif;font-size:10px;color:"+(injured?"#ef4444":value>0?"var(--rc)":"var(--td)")+";white-space:nowrap"},fmtNum(value)+" "+unit,
              injured&&h("img",{src:"./assets/ui/injury-bandage.png?v=20261003-v1",alt:"Blessure",width:17,height:17,style:"width:17px;height:17px;object-fit:contain"})
            )
          );
        })
      )
    ),
    h("div",{class:"card"},
      h("div",{style:"display:flex;align-items:center;justify-content:space-between;cursor:pointer",onClick:()=>toggle("weight")},
        h("div",{class:"ctitle",style:"margin:0"},"Suivi du poids"),
        h(ChevronBtn,{k:"weight"})
      ),
      open.weight&&h(Fragment,null,
        h("form",{onSubmit:saveWeight,style:"display:flex;gap:8px;align-items:center;margin-top:15px"},
          h("input",{ref:weightInputRef,type:"text",inputMode:"decimal",placeholder:"Poids (kg)","aria-label":"Poids en kilogrammes",class:"min",style:"flex:1;min-width:0;margin:0;text-align:center"}),
          h("button",{type:"submit",class:"mbtn mprim",style:"width:auto;min-width:105px;margin:0"},"Enregistrer")
        ),
        weightError&&h("div",{style:"font-size:11px;color:#ef4444;margin-top:7px"},weightError),
        weighIns.length>0?h(Fragment,null,
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:var(--rc);margin:18px 0 9px"},"Dernière pesée : "+weightLabel(weighIns.at(-1).weight)+" kg"),
          h("div",{style:"display:flex;align-items:center;justify-content:space-between;gap:10px;margin:12px 0"},
            h("button",{type:"button",disabled:displayedWeightMonthOff>=maxWeightMonthOff,onClick:()=>setWeightMonthOff(v=>Math.min(v+1,maxWeightMonthOff)),"aria-label":"Mois précédent",style:"background:var(--sf2);border:1px solid var(--rc);border-radius:8px;color:var(--rc);font-size:18px;width:38px;height:38px;opacity:"+(displayedWeightMonthOff>=maxWeightMonthOff?.3:1)},"‹"),
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:var(--rc);text-transform:capitalize;text-align:center"},weightMonthLabel),
            h("button",{type:"button",disabled:displayedWeightMonthOff===0,onClick:()=>setWeightMonthOff(v=>Math.max(0,v-1)),"aria-label":"Mois suivant",style:"background:var(--sf2);border:1px solid var(--rc);border-radius:8px;color:var(--rc);font-size:18px;width:38px;height:38px;opacity:"+(displayedWeightMonthOff===0?.3:1)},"›")
          ),
          h("div",{style:"border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);border-radius:10px;padding:7px"},
            h("svg",{viewBox:"0 0 360 170",role:"img","aria-label":"Évolution du poids en "+weightMonthLabel,style:"display:block;width:100%;height:auto"},
              [28,84,140].map(y=>h("line",{key:"grid"+y,x1:30,x2:330,y1:y,y2:y,stroke:"rgba(255,255,255,.12)","stroke-width":1})),
              h("text",{x:2,y:31,fill:"#94a3b8","font-size":10},weightLabel(graphHigh)),
              h("text",{x:2,y:143,fill:"#94a3b8","font-size":10},weightLabel(graphLow)),
              graphPoints.length>1&&h("polyline",{points:graphPoints.map(point=>point.x.toFixed(1)+","+point.y.toFixed(1)).join(" "),fill:"none",stroke:"#a78bfa","stroke-width":2.5,"stroke-linecap":"round","stroke-linejoin":"round"}),
              graphPoints.map((point,index)=>h("g",{key:graphEntries[index].recordedAt,role:"button",tabIndex:0,"aria-label":"Pesée du "+shortDate(graphEntries[index].date)+" : "+weightLabel(graphEntries[index].weight)+" kilogrammes",onClick:()=>setSelectedWeighIn(graphEntries[index]),onKeyDown:event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();setSelectedWeighIn(graphEntries[index]);}},style:"cursor:pointer"},
                h("circle",{cx:point.x,cy:point.y,r:16,fill:"transparent"}),
                h("circle",{cx:point.x,cy:point.y,r:index===graphPoints.length-1?4:3,fill:index===graphPoints.length-1?"#c4b5fd":"#a78bfa",style:"pointer-events:none"})
              )),
              h("text",{x:30,y:160,fill:"#94a3b8","font-size":10},"01/"+String(weightMonthStart.getMonth()+1).padStart(2,"0")),
              h("text",{x:330,y:160,fill:"#94a3b8","font-size":10,"text-anchor":"end"},String(new Date(weightMonthEnd.getTime()-86400000).getDate()).padStart(2,"0")+"/"+String(weightMonthStart.getMonth()+1).padStart(2,"0"))
            )
          ),
          !graphEntries.length&&h("div",{style:"font-size:10px;color:var(--td);margin-top:7px"},"Aucune pesée ce mois-ci.")
        ):h("div",{style:"font-size:12px;color:var(--td);text-align:center;padding:24px 0 8px"},"Aucune pesée enregistrée.")
      )
    ),
    h("div",{class:"card"},
      h("div",{style:"display:flex;align-items:center;justify-content:space-between;cursor:pointer",onClick:()=>toggle("records")},
        h("div",{class:"ctitle",style:"margin:0"},"Records personnels"),
        h(ChevronBtn,{k:"records"})
      ),
      open.records&&h(Fragment,null,
        h("div",{style:"margin-top:12px"}),
        recordDisplayObjs.map(o=>{
          const rec=records[o.id];
          if(!rec) return h("div",{key:o.id,style:"display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;margin-bottom:8px;opacity:.35"},
            h("div",{style:"display:flex;align-items:center;gap:6px;min-width:0"},
              QuestIcon(o.id,o.icon,14),
              h("div",{style:"min-width:0;font-size:12px;color:var(--td);display:flex;align-items:center;gap:5px"},
                h("span",{style:"overflow:hidden;text-overflow:ellipsis;white-space:nowrap"},o.name),
                o.weekly&&h(QuestBadge,{label:"HEBDO",color:WEEKLY_BADGE_COLOR}),
                o.optional&&!o.weekly&&h(QuestBadge,{label:"BONUS",color:BONUS_BADGE_COLOR})
              )
            ),
            h("span",{style:"font-size:11px;color:var(--td);white-space:nowrap;text-align:right"},"—")
          );
          const fmt2=d=>{if(d.includes("-W"))return d.replace("-W","-S");const p=d.split("-");return p[2]+"/"+p[1];};
          return h("div",{key:o.id,style:"display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;margin-bottom:8px"},
            h("div",{style:"display:flex;align-items:center;gap:6px;min-width:0"},
              QuestIcon(o.id,o.icon,14),
              h("div",{style:"min-width:0;font-size:12px;color:var(--tx);display:flex;align-items:center;gap:5px"},
                h("span",{style:"overflow:hidden;text-overflow:ellipsis;white-space:nowrap"},o.name),
                o.weekly&&h(QuestBadge,{label:"HEBDO",color:WEEKLY_BADGE_COLOR}),
                o.optional&&!o.weekly&&h(QuestBadge,{label:"BONUS",color:BONUS_BADGE_COLOR}),
                h("span",{style:"font-size:10px;color:var(--td);white-space:nowrap;flex-shrink:0"},"· "+fmt2(rec.date))
              )
            ),
            h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:var(--tx);white-space:nowrap;text-align:right"},
              fmtNum(rec.val)+" "+((rec.val>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres",contact:"contacts",action:"actions"}[o.unit]||o.unit)
            )
          );
        })
      )
    ),
    selectedWeighIn&&h("div",{class:"modal-ov",onClick:event=>{if(event.target===event.currentTarget){setSelectedWeighIn(null);setConfirmWeightDeletion(false);}}},
      h("div",{class:"modal",style:"max-width:350px;text-align:center;position:relative;padding-top:37px"},
        h("button",{type:"button","aria-label":"Fermer",onClick:()=>{setSelectedWeighIn(null);setConfirmWeightDeletion(false);},style:"position:absolute;top:12px;right:15px;border:0;background:transparent;color:#fff;font-size:23px;line-height:1;cursor:pointer;padding:2px 6px"},"×"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:25px;color:var(--rc);margin-bottom:11px"},weightLabel(selectedWeighIn.weight)+" kg"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:14px;color:var(--tx);margin-bottom:25px"},shortDate(selectedWeighIn.date)),
        h("button",{type:"button",class:"mbtn",style:"width:100%;border:1px solid #ef4444;color:#ef4444;background:transparent",onClick:()=>setConfirmWeightDeletion(true)},"Supprimer cette pesée")
      )
    ),
    selectedWeighIn&&confirmWeightDeletion&&h("div",{class:"ruov",style:"--rc:#ef4444;--rg:rgba(239,68,68,.55);background:rgba(0,0,0,.92)",onClick:event=>{if(event.target===event.currentTarget)setConfirmWeightDeletion(false);}},
      h("div",{class:"rucont",style:"width:min(500px,calc(100vw - 34px));background:rgba(15,15,18,.97);border:1px solid #ef444488;border-radius:18px;padding:22px;box-shadow:0 0 30px rgba(239,68,68,.12)"},
        h("div",{class:"ruevol",style:"color:#ef4444"},"CONFIRMATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:17px;font-weight:900;color:#fff;text-align:center;line-height:1.4;margin-top:10px"},"Supprimer la pesée du "+shortDate(selectedWeighIn.date)+" ?"),
        h("div",{style:"font-size:12px;color:var(--td);text-align:center;line-height:1.5;margin-top:12px"},weightLabel(selectedWeighIn.weight)+" kg · Cette pesée sera retirée de la courbe."),
        h("div",{style:"display:flex;gap:10px;width:100%;margin-top:20px"},
          h("button",{type:"button",onClick:()=>setConfirmWeightDeletion(false),style:"flex:1;padding:12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px;cursor:pointer"},"ANNULER"),
          h("button",{type:"button",onClick:()=>{
            const recordedAt=selectedWeighIn.recordedAt;
            setState(previous=>({...previous,weightLog:(previous.weightLog||[]).filter(entry=>entry.recordedAt!==recordedAt)}));
            setConfirmWeightDeletion(false);
            setSelectedWeighIn(null);
          },style:"flex:1;padding:12px;border-radius:9px;border:1px solid #ef4444;background:rgba(239,68,68,.15);color:#ef4444;font-family:Orbitron,sans-serif;font-size:10px;cursor:pointer"},"SUPPRIMER")
        )
      )
    )
  );
}
