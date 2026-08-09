import { REGRESSION_DEF, hasValidatedDailyCompletion } from "./dailyEngine.js";
import { wkStr } from "./dayCycle.js";
import { getRankBase, sortStat } from "./progression.js";
import {
  LEGACY_EXERCISE_DEFAULTS,
  isExerciseFamilyQuestId,
  exerciseFamilyLabel,
  rotatedQuestObjects
} from "./exerciseRotation.js";
import { RECORD_EXERCISE_DEFS, recordExerciseValueForDay } from "./records.js";
import { UiIcon } from "./uiIcons.js?v=20260809-medallions-v6";

const { h, Fragment } = window.preact;

const WEEKLY_BADGE_COLOR = "#818cf8";
const BONUS_BADGE_COLOR = "#fbbf24";

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
  objs,
  baseObjs,
  today,
  ri,
  prestige,
  wkOff,
  setWkOff,
  historyOpen,
  setHistoryOpen,
  getValidateThreshold,
  runRecordResetDay
}){
  const open = historyOpen;
  const setOpen = setHistoryOpen;
  const toggle = k => setOpen(o=>({...o,[k]:!o[k]}));
  const ChevronBtn = ({k}) => h("span",{
    onClick:(e)=>{e.stopPropagation();toggle(k);},
    style:"cursor:pointer;color:var(--td);font-size:10px;font-family:Orbitron,sans-serif;font-weight:700;letter-spacing:1px;flex-shrink:0;user-select:none"
  },open[k]?"\u25B2":"\u25BC");
  function localDate(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return y+"-"+m+"-"+day;}
  function getWS(off){const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7)-off*7);d.setHours(0,0,0,0);return d;}
  const ws=getWS(wkOff);
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(ws);d.setDate(ws.getDate()+i);return localDate(d);});
  const wKey=wkStr(ws);
  const dt={};
  weekDays.forEach(dk=>Object.entries(state.dailyLog[dk]||{}).forEach(([id,v])=>{dt[id]=(dt[id]||0)+v;}));
  const wkLogEntry=state.weeklyLog[wKey]||{};
  const tots={...dt,...wkLogEntry};
  const we=new Date(ws); we.setDate(ws.getDate()+6);
  const fmt=d=>d.getDate().toString().padStart(2,"0")+"/"+(d.getMonth()+1).toString().padStart(2,"0");
  const lbl=wkOff===0?"Cette semaine":wkOff===1?"Semaine derni\u00e8re":fmt(ws)+" \u2013 "+fmt(we);
  const ordered=[...sortStat(objs.filter(o=>o.daily&&!o.optional)),...sortStat(objs.filter(o=>o.weekly)),...sortStat(objs.filter(o=>o.daily&&o.optional&&!o.bonusHidden))];

  const exerciseHistoryDefs=RECORD_EXERCISE_DEFS;
  const rotatingSourceIds=new Set(["push","negative_pullups","abs","squats","calves"]);
  function dailyQuestForHistoryDay(obj,day){
    if(!isExerciseFamilyQuestId(obj.id)) return obj;
    const rotation=(state.exerciseRotationByDay||{})[day]||{
      push:LEGACY_EXERCISE_DEFAULTS.push,
      back:LEGACY_EXERCISE_DEFAULTS.back,
      abs:LEGACY_EXERCISE_DEFAULTS.abs,
      legs:LEGACY_EXERCISE_DEFAULTS.legs
    };
    return rotatedQuestObjects(baseObjs,rotation,state.stats,state.totalXp).find(q=>q.id===obj.id)||obj;
  }
  const standardDailyRecordObjs=[
    ...sortStat(objs.filter(o=>o.daily&&!o.optional&&!o.binary&&!rotatingSourceIds.has(o.id))),
    ...sortStat(objs.filter(o=>o.weekly&&!o.binary&&!rotatingSourceIds.has(o.id))),
    ...sortStat(objs.filter(o=>o.daily&&o.optional&&!o.binary&&!o.bonusHidden&&!rotatingSourceIds.has(o.id)))
  ];
  const recordDisplayObjs=[...exerciseHistoryDefs,...standardDailyRecordObjs];

  const weekLbls=["L","M","M","J","V","S","D"];

  function weeklyTargetFor(obj){
    if(obj.binary) return 7;
    return obj.weekly ? getRankBase(obj.id,ri,prestige,state.stats) : ((obj.target&&!obj.binary?obj.target:getRankBase(obj.id,ri,prestige,state.stats))*7);
  }
  function dayTargetFor(obj,day){
    if(obj.binary) return 1;
    if(obj.weekly) return getRankBase(obj.id,ri,prestige,state.stats);
    return obj.target&&!obj.binary ? obj.target : getValidateThreshold(obj,day);
  }
  function dayMarkFor(obj,day){
    const log=state.dailyLog[day]||{};
    const dayObj=dailyQuestForHistoryDay(obj,day);
    const value=log[obj.id]||0;
    const target=dayTargetFor(dayObj,day);
    const validationTarget=obj.optional?Math.ceil(target*0.5):target;
    const previouslyValidated=day<today&&!!obj.daily&&!obj.optional&&hasValidatedDailyCompletion(state,day);
    const ok=previouslyValidated||value>=validationTarget;

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
    h("div",{class:"card",style:"padding:12px 16px"},
      h("div",{style:"display:flex;align-items:center;justify-content:space-between;gap:8px"},
        h("button",{style:"background:var(--sf2);border:1px solid var(--rc);border-radius:8px;color:var(--rc);font-size:18px;width:40px;height:40px;cursor:pointer;opacity:"+(wkOff>=51?.3:.8),onClick:()=>setWkOff(o=>Math.min(o+1,51))},"\u2039"),
        h("div",{style:"text-align:center;flex:1"},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:12px;color:var(--rc);letter-spacing:1px"},lbl),
          h("div",{style:"font-size:10px;color:var(--td);margin-top:2px"},fmt(ws)+" \u2013 "+fmt(we))
        ),
        h("button",{style:"background:var(--sf2);border:1px solid var(--rc);border-radius:8px;color:var(--rc);font-size:18px;width:40px;height:40px;cursor:pointer;opacity:"+(wkOff===0?.3:.8),onClick:()=>setWkOff(o=>Math.max(o-1,0))},"\u203A")
      ),
      wkOff>0&&h("button",{style:"width:100%;margin-top:10px;background:rgba(255,255,255,0.03);border:1px solid var(--rc);border-radius:8px;color:var(--rc);font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:2px;padding:7px;cursor:pointer;text-transform:uppercase",onClick:()=>setWkOff(0)},"Aujourd'hui")
    ),
    h("div",{class:"card"},
      h("div",{class:"ctitle"},"Activité de la semaine"),
      h("div",{style:"display:grid;grid-template-columns:minmax(0,1fr) repeat(7,22px);gap:5px;align-items:center;margin-top:10px;margin-bottom:8px;font-family:Orbitron,sans-serif;font-size:9px;color:#fff;letter-spacing:1px;text-transform:uppercase"},
        h("div",null,"Quête"),
        weekLbls.map((dayLabel,i)=>h("div",{key:"h"+i,style:"text-align:center;color:#fff"},dayLabel))
      ),
      h("div",{style:"display:flex;flex-direction:column;gap:7px"},
        ordered.map(obj=>{
          const marks=weekDays.map(d=>dayMarkFor(obj,d));
          const displayName=exerciseFamilyLabel(obj.id,obj.name);
          return h("div",{key:obj.id,style:"display:grid;grid-template-columns:minmax(0,1fr) repeat(7,22px);gap:5px;align-items:center;padding:6px 0;border-top:1px solid rgba(255,255,255,0.04)"},
            h("div",{style:"display:flex;align-items:center;gap:6px;min-width:0;color:var(--tx);font-size:12px"},
              QuestIcon(obj.id,obj.icon,14),
              h("span",{style:"overflow:hidden;text-overflow:ellipsis;white-space:nowrap"},displayName)
            ),
            marks.map((mark,i)=>h("div",{key:obj.id+"_d"+i,style:"text-align:center;font-family:Orbitron,sans-serif;font-size:12px;font-weight:700;color:"+mark.color+";opacity:"+mark.opacity},mark.txt))
          );
        }),
        h("div",{key:REGRESSION_DEF.id,style:"display:grid;grid-template-columns:minmax(0,1fr) repeat(7,22px);gap:5px;align-items:center;padding:6px 0;border-top:1px solid rgba(255,255,255,0.04)"},
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
    (()=>{
      const allDays=Object.keys(state.dailyLog).sort();
      const firstDay=allDays.length>0?allDays[0]:null;
      const fmtFirst=d=>{if(!d)return"";const p=d.split("-");return p[2]+"/"+p[1]+"/"+p[0];};
      const totals={};
      Object.values(state.dailyLog).forEach(log=>{
        Object.entries(log).forEach(([id,val])=>{totals[id]=(totals[id]||0)+val;});
      });
      Object.values(state.weeklyLog).forEach(log=>{
        Object.entries(log).forEach(([id,val])=>{totals[id]=(totals[id]||0)+val;});
      });
      exerciseHistoryDefs.forEach(def=>{
        totals[def.id]=Object.entries(state.dailyLog||{}).reduce((sum,[day,log])=>sum+recordExerciseValueForDay(def,day,log,state.exerciseRotationByDay),0);
      });
      return h("div",{class:"card"},
        h("div",{style:"display:flex;align-items:center;justify-content:space-between;cursor:pointer",onClick:()=>toggle("totals")},
          h("div",{class:"ctitle",style:"margin:0"},"Totaux depuis le d\u00e9but"+(firstDay?" \u2014 "+fmtFirst(firstDay):"")),
          h(ChevronBtn,{k:"totals"})
        ),
        open.totals&&h(Fragment,null,
          h("div",{style:"margin-top:12px"}),
          recordDisplayObjs.map(o=>{
            const total=totals[o.id]||0;
            const unitLbl=total>1?({rep:"reps",page:"pages",verre:"verres",km:"km",min:"min",contact:"contacts",action:"actions"}[o.unit]||o.unit):o.unit;
            return h("div",{key:o.id,style:"display:flex;align-items:center;gap:8px;margin-bottom:8px"+(total===0?";opacity:.35":"")},
              QuestIcon(o.id,o.icon,14),
              h("div",{style:"flex:1"},
                h("div",{style:"font-size:12px;color:var(--tx);display:flex;align-items:center;gap:5px"},
                  o.name,
                  o.weekly&&h(QuestBadge,{label:"HEBDO",color:WEEKLY_BADGE_COLOR}),
                  o.optional&&!o.weekly&&h(QuestBadge,{label:"BONUS",color:BONUS_BADGE_COLOR})
                )
              ),
              h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:var(--tx)"},
                total===0?"—":(total%1===0?total.toLocaleString("fr-FR"):total.toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2}))+(total>0?" "+unitLbl:"")
              )
            );
          })
        )
      );
    })()
  );
}
