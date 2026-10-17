import { UiIcon } from "./uiIcons.js?v=20261017-editor-v1";
const {h}=window.preact;
const {useState}=window.preactHooks;
const STAT_LABEL={Sante:"Santé",Force:"Force",Esprit:"Esprit",Endurance:"Endurance",Agilite:"Agilité",Discipline:"Discipline"};
const KINDS={daily:"Journalière",bonus:"Bonus",weekly:"Hebdomadaire",urgent:"Urgente",dungeon:"Donjon",breach:"Portail"};
const FAMILY={auto:"Auto (actuel)",none:"Aucune",push:"Pecs & Triceps",negative_pullups:"Dos & Biceps",abs:"Abdos",squats:"Jambes"};
const number=v=>Number(String(v).trim().replace(",","."));
const textStyle={width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,.04)",color:"var(--tx)",border:"1px solid var(--rc)",borderRadius:8,padding:"10px",fontSize:14};

export function CatalogEditor({row,catalog,tuning,externalError,onClose,onSave}){
  const source=row.obj, stored=catalog?.[row.id];
  const initial=stored||{
    kind:row.kind,name:row.label,stat:source.stat||"Esprit",unit:source.unit||"rep",
    target:source.target||source.base||1,xpPer:row.kind==="dungeon"?source.reward?.xp:source.xpPer||source.binaryXp||source.xp||1,
    binary:source.binary===true,stat2:source.stat2||source.reward?.stat2||source.tiers?.find(t=>t.stat2)?.stat2||"",
    xpPer2:source.xpPer2||source.xp2||source.reward?.xp2||source.tiers?.reduce((sum,t)=>sum+(Number(t.xp2)||0),0)||"",
    family:"auto",category:source.category||source.stat,icon:source.icon||"✦",tiers:source.tiers||[],rooms:source.rooms||[],
    completionBonusXp:source.completionBonusXp||0,overGoalXpPer:source.overGoalXpPer||0,
    bossObjective:source.bossObjective||source.name,step:source.step||1,
    bossName:row.kind==="breach"?row.boss?.name||"Boss de Rupture":"",
    guards:row.boss?.guards||[]
  };
  const [kind,setKind]=useState(initial.kind);
  const [binary,setBinary]=useState(initial.binary);
  const [tiered,setTiered]=useState(!!initial.tiers?.length);
  const [preview,setPreview]=useState(null);
  const [error,setError]=useState("");
  const [rooms,setRooms]=useState(initial.rooms?.length?initial.rooms.map(r=>({...r})):[{name:"",desc:"",masterClause:""},{name:"",desc:"",masterClause:""}]);
  const [guards,setGuards]=useState(initial.guards?.length?initial.guards.map(g=>({...g})):[{name:"",objective:"",unit:"rep",target:1,step:1}]);
  const initialButtons=(tuning?.[row.id]||[]).at(-1)?.buttons||source.quickAmounts||[];
  const field=(name,label,value,options={})=>h("label",{style:"display:block;margin:10px 0;font-size:12px;color:var(--td)"},label,
    h("input",{name,defaultValue:value??"",type:"text",inputMode:options.numeric?"decimal":"text",style:{...textStyle,marginTop:5}}));
  const select=(name,label,value,values,onChange)=>h("label",{style:"display:block;margin:10px 0;font-size:12px;color:var(--td)"},label,
    h("select",{name,defaultValue:value,onChange,style:{...textStyle,marginTop:5}},Object.entries(values).map(([key,title])=>h("option",{key,value:key},title))));
  function read(form){
    const data=new FormData(form);const get=k=>String(data.get(k)||"").trim();
    const target=kind==="dungeon"?rooms.length:(binary&&["daily","bonus","weekly"].includes(kind)?1:number(get("target"))),xpPer=number(get("xpPer"));
    const stat2=get("stat2"),xpPer2=stat2?number(get("xpPer2")):0;
    const entry={kind,name:get("name"),stat:get("stat"),unit:kind==="dungeon"?"salle":get("unit"),target,xpPer,binary,icon:initial.icon,stat2,xpPer2};
    if(get("family")!=="auto")entry.family=get("family")==="none"?"":get("family");
    if(binary&&["daily","bonus","weekly"].includes(kind))entry.target=1;
    if(binary&&tiered&&kind!=="breach")throw Error("Les paliers nécessitent un objectif progressif.");
    if(kind==="bonus")entry.category=entry.stat===initial.stat?(initial.category||entry.stat):entry.stat;
    if(kind==="weekly"){
      entry.completionBonusXp=number(get("completionBonusXp"));entry.overGoalXpPer=number(get("overGoalXpPer"));
      if(!Number.isFinite(entry.completionBonusXp)||entry.completionBonusXp<0||!Number.isFinite(entry.overGoalXpPer)||entry.overGoalXpPer<0)throw Error("Les bonus hebdomadaires doivent être positifs ou nuls.");
    }
    const buttons=get("buttons").split(/[;/\s]+/).filter(Boolean).map(number);
    if(buttons.length>3||buttons.some(v=>!Number.isFinite(v)||v<=0))throw Error("Boutons : jusqu’à trois nombres positifs, séparés par des espaces.");
    entry.buttons=buttons;
    if(!entry.name||!entry.unit||!Number.isFinite(target)||target<=0||!Number.isFinite(xpPer)||xpPer<=0||stat2&&(!Number.isFinite(xpPer2)||xpPer2<=0))throw Error("Renseigne un nom, une unité, un objectif et des XP positifs.");
    if(stat2===entry.stat)throw Error("Choisis deux statistiques différentes.");
    if(tiered&&!["dungeon","breach"].includes(kind)){
      const lines=get("tiers").split("\n").map(s=>s.trim()).filter(Boolean);
      const tiers=lines.map(line=>{const bits=line.split(/[;|]/).map(s=>s.trim());return {at:number(bits[0]),xp:number(bits[1]),stat:entry.stat,...(bits[2]?{xp2:number(bits[2]),stat2:entry.stat2}:{})};});
      if(!tiers.length||tiers.some(t=>!Number.isFinite(t.at)||t.at<=0||!Number.isFinite(t.xp)||t.xp<=0||t.xp2!=null&&(!entry.stat2||!Number.isFinite(t.xp2)||t.xp2<=0))||tiers.some((t,i)=>i&&t.at<=tiers[i-1].at)||tiers.at(-1).at!==target)throw Error("Paliers : une ligne « objectif ; XP ; XP secondaire facultative », dans l’ordre, avec un dernier palier égal à l’objectif.");
      entry.tiers=tiers;
    }
    if(kind==="dungeon"){
      entry.short=get("short")||entry.name;
      entry.color=initial.color||source.color||"#a78bfa";
      entry.rooms=rooms.map(r=>({name:String(r.name||"").trim(),desc:String(r.desc||"").trim(),masterClause:String(r.masterClause||"").trim()}));
      if(entry.rooms.length<2||entry.rooms.length>12||entry.rooms.some(r=>!r.name||!r.desc))throw Error("Donjon : entre 2 et 12 salles, chacune avec un nom et un objectif.");
      entry.target=entry.rooms.length;entry.unit="salle";
    }
    if(kind==="breach"){
      entry.step=number(get("step"));entry.bossObjective=get("bossObjective");entry.bossName=get("bossName");
      entry.guards=guards.map(g=>({name:String(g.name||"").trim(),objective:String(g.objective||"").trim(),unit:String(g.unit||"").trim(),target:number(g.target),step:number(g.step)}));
      if(!entry.bossObjective||!entry.bossName||!Number.isFinite(entry.step)||entry.step<=0||!entry.guards.length||entry.guards.length>8||entry.guards.some(g=>!g.name||!g.objective||!g.unit||!Number.isFinite(g.target)||g.target<=0||!Number.isFinite(g.step)||g.step<=0))throw Error("Portail : complète l’objectif, le boss et jusqu’à 8 gardes.");
    }
    return entry;
  }
  function inspect(e,save=false){
    const form=e.currentTarget.closest("form");
    try{const entry=read(form);setError("");if(save)onSave(row.id,entry);else setPreview(entry);}catch(err){setError(err.message);setPreview(null);}
  }
  return h("div",{class:"modal-ov",style:"z-index:501",onClick:e=>{e.stopPropagation();if(e.target===e.currentTarget)onClose();}},
    h("div",{class:"modal",style:"max-width:470px;max-height:85vh;overflow-y:auto"},
      h("form",{onSubmit:e=>e.preventDefault(),onInput:()=>{if(preview)setPreview(null);},onChange:()=>{if(preview)setPreview(null);}},
        h("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:10px"},h("div",{class:"mtitle",style:"font-size:18px;margin:0"},row.label),h("button",{type:"button",onClick:onClose,style:"background:none;border:0;color:white;font-size:24px"},"×")),
        h("div",{style:"font-size:11px;color:var(--td);margin:12px 0"},"Modifications applicables demain. L’historique et les parties en cours conservent leurs données."),
        select("kind","Type",kind,["push","negative_pullups","abs","squats"].includes(row.id)?{daily:KINDS.daily}:["run","walk","march","med","grips","balance"].includes(row.id)?{bonus:KINDS.bonus}:KINDS,e=>{setKind(e.currentTarget.value);setPreview(null);}),
        field("name","Nom",initial.name),
        select("stat","Statistique principale",initial.stat,STAT_LABEL),
        select("stat2","Deuxième statistique (facultative)",initial.stat2||"",{"":"Aucune",...STAT_LABEL}),
        field("xpPer2","XP de la deuxième statistique",initial.xpPer2,{numeric:true}),
        kind==="dungeon"?h("div",{style:"font-size:12px;color:var(--td);margin:10px 0"},"Objectif : terminer toutes les salles."):h("div",null,field("unit","Unité",initial.unit),binary&&["daily","bonus","weekly"].includes(kind)?h("div",{style:"font-size:12px;color:var(--td);margin:10px 0"},"Objectif : 1 validation."):field("target","Objectif",initial.target,{numeric:true})),
        field("xpPer",tiered&&!["dungeon","breach"].includes(kind)?"XP de référence (les paliers déterminent les gains)":["dungeon","breach","urgent"].includes(kind)?"XP à la validation / récompense":"XP par unité (validation simple : XP fixes)",initial.xpPer,{numeric:true}),
        !["dungeon","breach"].includes(kind)&&field("buttons","Boutons de saisie (1 5 10)",initialButtons.join(" ")),
        kind==="weekly"&&h("div",null,field("completionBonusXp","Bonus XP à l'objectif",initial.completionBonusXp||0,{numeric:true}),field("overGoalXpPer","XP par unité au-delà de l’objectif",initial.overGoalXpPer||0,{numeric:true})),
        kind!=="dungeon"&&h("div",null,
          select("family","Famille musculaire",initial.family===""?"none":initial.family||"auto",FAMILY),
          select("objectiveMode","Type d’objectif",binary?"simple":"progressif",{progressif:"Progressif",simple:"Validation simple"},e=>{setBinary(e.currentTarget.value==="simple");setPreview(null);}),
          kind!=="breach"&&select("tierMode","Paliers",tiered?"yes":"no",{no:"Non",yes:"Oui"},e=>{setTiered(e.currentTarget.value==="yes");setPreview(null);}),
          tiered&&kind!=="breach"&&h("label",{style:"display:block;font-size:12px;color:var(--td)"},"Paliers : objectif ; XP ; XP secondaire (facultative), un par ligne",
            h("textarea",{name:"tiers",rows:4,defaultValue:(initial.tiers||[]).map(t=>t.at+" ; "+t.xp+(t.xp2?" ; "+t.xp2:"")).join("\n"),style:{...textStyle,marginTop:5}}))
        ),
        kind==="dungeon"&&h("div",null,field("short","Nom court du donjon",initial.short||initial.name),
          h("div",{style:"font-size:12px;color:var(--td);margin:15px 0 8px"},"Salles · la dernière est le boss"),
          rooms.map((room,index)=>h("div",{key:index,style:"border:1px solid rgba(255,255,255,.15);border-radius:9px;padding:10px;margin-bottom:9px"},
            h("div",{style:"display:flex;justify-content:space-between;align-items:center;color:var(--rc);font-size:11px"},index===rooms.length-1?"Boss":"Salle "+(index+1),
              h("button",{type:"button",disabled:rooms.length<=2,onClick:()=>{setRooms(rooms.filter((_,i)=>i!==index));setPreview(null);},style:"background:none;border:0;color:#ef4444;font-size:17px"},"×")),
            ["name","desc","masterClause"].map((key)=>h("input",{key,placeholder:{name:"Nom",desc:"Objectif",masterClause:"Clause du maître (facultative)"}[key],value:room[key]||"",onInput:e=>setRooms(rooms.map((r,i)=>i===index?{...r,[key]:e.currentTarget.value}:r)),style:{...textStyle,marginTop:6}}))
          )),
          h("button",{type:"button",class:"mbtn",onClick:()=>{setRooms([...rooms,{name:"",desc:"",masterClause:""}]);setPreview(null);},style:"width:100%;margin-bottom:10px"},"+ Ajouter une salle")
        ),
        kind==="breach"&&h("div",null,field("bossObjective","Objectif du portail",initial.bossObjective||initial.name),field("step","Pas des boutons",initial.step||1,{numeric:true}),field("bossName","Nom du boss",initial.bossName),
          h("div",{style:"font-size:12px;color:var(--td);margin:15px 0 8px"},"Garde rapprochée"),
          guards.map((guard,index)=>h("div",{key:index,style:"border:1px solid rgba(255,255,255,.15);border-radius:9px;padding:10px;margin-bottom:9px"},
            h("div",{style:"display:flex;justify-content:space-between;align-items:center;color:var(--rc);font-size:11px"},"Garde "+(index+1),
              h("button",{type:"button",disabled:guards.length<=1,onClick:()=>{setGuards(guards.filter((_,i)=>i!==index));setPreview(null);},style:"background:none;border:0;color:#ef4444;font-size:17px"},"×")),
            ["name","objective","unit","target","step"].map(key=>h("input",{key,placeholder:{name:"Nom",objective:"Action",unit:"Unité",target:"Objectif",step:"Pas"}[key],value:guard[key]??"",inputMode:["target","step"].includes(key)?"decimal":"text",onInput:e=>setGuards(guards.map((g,i)=>i===index?{...g,[key]:e.currentTarget.value}:g)),style:{...textStyle,marginTop:6}}))
          )),
          h("button",{type:"button",class:"mbtn",onClick:()=>{setGuards([...guards,{name:"",objective:"",unit:"rep",target:1,step:1}]);setPreview(null);},style:"width:100%;margin-bottom:10px"},"+ Ajouter un garde")
        ),
        (error||externalError)&&h("div",{style:"color:#ef4444;font-size:12px;margin:12px 0"},error||externalError),
        preview&&h("div",{style:"border:1px solid var(--rc);background:"+(preview.kind==="breach"?"rgba(35,65,115,.18)":"rgba(168,85,247,.08)")+";border-radius:10px;padding:12px;margin:14px 0;line-height:1.5;font-size:12px"},
          h("strong",null,"APERÇU · "+KINDS[preview.kind]),
          h("div",{style:"display:flex;align-items:center;gap:9px;font-size:14px;margin:9px 0"},h(UiIcon,{iconKey:preview.kind==="dungeon"?"dungeon."+row.id:"quest."+row.id,fallback:initial.icon,slotSize:30,glyphSize:20}),h("span",null,preview.name)),
          h("div",null,preview.target+" "+preview.unit),
          h("div",null,preview.binary?"Validation simple":"Progression"+(preview.tiers?.length?" · "+preview.tiers.length+" paliers":"")),
          !preview.tiers?.length&&h("div",null,preview.xpPer+" XP · "+STAT_LABEL[preview.stat]+(preview.stat2?" + "+preview.xpPer2+" XP · "+STAT_LABEL[preview.stat2]:"")),
          preview.tiers?.map((tier,i)=>h("div",{key:i},"Palier "+(i+1)+" : "+tier.at+" "+preview.unit+" → "+tier.xp+" XP"+(tier.xp2?" + "+tier.xp2+" XP "+STAT_LABEL[tier.stat2]:""))),
          preview.kind!=="dungeon"&&h("div",null,"Famille : "+(preview.family===undefined?"Automatique":preview.family?FAMILY[preview.family]:"Aucune")),
          preview.kind==="weekly"&&h("div",null,"Bonus à l’objectif : "+preview.completionBonusXp+" XP · dépassement : "+preview.overGoalXpPer+" XP/"+preview.unit),
          preview.kind==="dungeon"&&h("div",null,preview.rooms.length+" salles"),
          preview.kind==="breach"&&h("div",null,preview.guards.length+" gardes · "+preview.bossName),
          preview.kind!=="dungeon"&&h("div",{style:"height:5px;background:rgba(255,255,255,.1);border-radius:4px;margin-top:10px"})
        ),
        h("button",{type:"button",class:"mbtn mprim",style:"width:100%;margin:8px 0",onClick:e=>inspect(e)},"Voir l’aperçu"),
        h("button",{type:"button",class:"mbtn",disabled:!preview,style:"width:100%;margin:8px 0;opacity:"+(preview?1:.5),onClick:e=>inspect(e,true)},"Enregistrer")
      )
    )
  );
}
