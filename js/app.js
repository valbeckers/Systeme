import { RANKS, RANK_STAT_REQUIREMENTS, STATS, STAT_COLOR, STAT_LBL } from "./config.js";
import { DEFS, SP, SQ_TIER_COLOR, SQ_TIER_LABEL } from "./questDefs.js";
import { pickRandomSq, appendUrgentQuestDrawLog } from "./urgentQuestEngine.js";
import {
  isDebtEligibleQuest,
  createQuestDebtState,
  planQuestDebtRepayment,
  applyQuestDebtPaymentState,
  expireQuestDebtState,
  reconcileSameDayQuestDebtState
} from "./debtEngine.js?v=20260802-debt-sameday-01";
import {
  REGRESSION_DEFS,
  REGRESSION_DEF,
  applyRegressionState,
  hasValidatedDailyCompletion,
  areRequiredDailyQuestsComplete,
  areBonusQuestsComplete,
  computeQuestStreak,
  urgentQuestCompletedOnDay,
  applyDailyStreakRewardState
} from "./dailyEngine.js";
import { BREACH_POOL } from "./breachDefs.js";
import { DUNGEONS } from "./dungeonDefs.js?v=20260803-contract-fix-01";
import {
  dungeonRoomRewardPairs,
  dungeonRewardPairs,
  drawRandomDungeonId,
  activeDungeonView,
  countDungeonRunsThisWeek,
  launchDungeonState,
  expireActiveDungeonState,
  canValidateDungeonRoom
} from "./dungeonEngine.js";
import { INVENTORY_ITEMS } from "./itemDefs.js?v=20260803-item-descriptions-02";
import {
  incrementLootState,
  pickRandomBreachLoot,
  alliedGiftEligibleIds,
  grantAlliedGiftState,
  rollStandardItemDrops,
  rollDungeonItemDrops
} from "./lootEngine.js?v=20260803-mystery-map-01";
import {
  eventDayStr,
  next7AM,
  current7AMStart,
  todayStr,
  wkStr
} from "./dayCycle.js";
import {
  getLvl,
  getGlobalLevelInfo,
  calcXp,
  calcQuestTotalXp
} from "./xp.js";
import { StatsTab } from "./statsView.js?v=20260802-kiviat-innerdots-restore-01";
import { HistoryTab } from "./historyView.js";
import {
  RANK_BASES,
  ROMAN,
  MAX_PRESTIGE,
  countStatsAtLevel,
  statLevelTier,
  legRaiseTargetForForceLevel,
  getStatLevelTarget,
  getAscensionXpRequired,
  getRankBase,
  sortStat
} from "./progression.js";
import {
  REGRESSION_ORB_ICON_DATA,
  DUNGEON_KEY_ICON_DATA,
  MINOR_ELIXIR_ICON_DATA,
  MAJOR_ELIXIR_ICON_DATA,
  SUPREME_ELIXIR_ICON_DATA,
  NEW_ITEM_ICON_DATA,
  GRIMOIRE_ICON_DATA,
  DEBT_ACKNOWLEDGEMENT_ICON_DATA
} from "./itemImages.js";
import { saveStoredState } from "./storage.js";
import { cleanSystemState, exportSystemState } from "./stateSanitizer.js?v=20260803-mystery-map-01";
import { buildInitialState, migrateGripsToMin } from "./stateBootstrap.js?v=20260803-mystery-map-01";
import {
  EXERCISE_ROTATIONS,
  LEGACY_EXERCISE_DEFAULTS,
  isExerciseFamilyQuestId,
  exerciseFamilyLabel,
  ensureExerciseRotationForDay,
  rotatedQuestObjects
} from "./exerciseRotation.js";
import {
  questRecordUnit,
  recordRotationIdForDay,
  buildRecordOptions
} from "./records.js";
import {
  buildBreachRuptureBoss,
  normalizeActiveBreach,
  processDailyBreachRoll,
  pickBreachRuptureBoss
} from "./breachEngine.js?v=20260803-contract-fix-01";
import {
  ELIXIR_STATS,
  ELIXIR_DURATION_MS,
  isElixirKind,
  currentActiveElixir,
  currentSuspendedElixir,
  elixirBonusForStat,
  buildResumedElixir,
  buildSuspendedElixir
} from "./elixirEngine.js";

const { h, render, Fragment } = window.preact;
const { useState, useEffect, useRef } = window.preactHooks;

// ─── FONCTIONS GLOBALES ─────────────────────────────────────────────────────

function QuestIcon(id, fallback, size=14, extraStyle=""){
  return h("span",{
    style:"font-size:"+size+"px;line-height:1;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;flex-shrink:0;"+extraStyle
  },fallback);
}

const getRank    = xp => { for(let i=RANKS.length-1;i>=0;i--)if(xp>=RANKS[i].xpRequired)return RANKS[i]; return RANKS[0]; };
const getNext    = id => { const i=RANKS.findIndex(r=>r.id===id); return i<RANKS.length-1?RANKS[i+1]:null; };

// Rang effectif en tenant compte des conditions de stats.
// Si la condition pour passer au rang N n'est pas remplie, on reste au rang N-1
// même si l'XP suffit.
const getRankWithStats = (xp, stats) => {
  // On part du rang naturel (basé sur XP seul) puis on descend tant que la condition échoue
  let natural = getRank(xp);
  let idx = RANKS.findIndex(r=>r.id===natural.id);
  // On vérifie que toutes les conditions menant à ce rang sont OK
  while(idx > 0){
    const req = RANK_STAT_REQUIREMENTS[RANKS[idx].id];
    if(req && countStatsAtLevel(stats, req.level) < req.count){
      idx--; // condition non remplie : on redescend d'un cran
    } else {
      break;
    }
  }
  return RANKS[idx];
};

function hexToRgb(hex){
  if(!hex) return null;
  const clean=String(hex).trim().replace("#","");
  const full=clean.length===3 ? clean.split("").map(c=>c+c).join("") : clean;
  if(full.length!==6) return null;
  const n=parseInt(full,16);
  if(Number.isNaN(n)) return null;
  return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}
function rgbToHue({r,g,b}){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
  if(d===0) return 0;
  let h;
  if(max===r) h=((g-b)/d)%6;
  else if(max===g) h=(b-r)/d+2;
  else h=(r-g)/d+4;
  h*=60;
  if(h<0) h+=360;
  return h;
}
function iconThemeFilter(color){
  const rgb=hexToRgb(color);
  if(!rgb){
    return {
      base:"saturate(1.22) contrast(1.05)",
      active:"saturate(1.38) contrast(1.08) brightness(1.04)"
    };
  }

  const hue=rgbToHue(rgb);

  // Rotation volontairement limitée pour préserver le relief cristal.
  const rotate=Math.max(-42,Math.min(42,(hue-265)*0.42));

  return {
    base:
      "saturate(1.28) "+
      "contrast(1.06) "+
      "brightness(1.01) "+
      "hue-rotate("+rotate.toFixed(1)+"deg)",

    active:
      "saturate(1.45) "+
      "contrast(1.1) "+
      "brightness(1.05) "+
      "hue-rotate("+rotate.toFixed(1)+"deg)"
  };
}

const fmtNum = (v, max=2) => {
  const n = Number(v);
  if(!Number.isFinite(n)) return "0";
  if(Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return n.toFixed(max).replace(/\.0+$/,"").replace(/(\.\d*?)0+$/,"$1");
};

// Le nettoyage et les migrations de la sauvegarde sont centralisés dans
// stateSanitizer.js ; storage.js ne gère que localStorage et la rotation
// des sauvegardes.
const saveState = state => saveStoredState(state,exportSystemState);


const RUN_RECORD_RESET_DAY = "2026-07-13";

// ─── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────

function App(){
  const [state,setState]   = useState(()=>{
    const now=Date.now();
    let base=buildInitialState();
    base=ensureExerciseRotationForDay(base,todayStr());
    base=processDailyBreachRoll(base,now);
    // Auto-init quête urgente si aucune Brèche ne la remplace aujourd’hui
    const sqs=base.specialQuests||[];
    const hasActive=sqs.find(q=>!q.completedAt&&now<(q.expiresAt||0));
    const resetStart=current7AMStart(now);
    const resetEnd=next7AM(resetStart);
    const hasCompletedThisWindow=sqs.some(q=>q.completedAt&&q.completedAt>=resetStart&&q.completedAt<resetEnd);
    const sqCdUntil=base.sqCooldownUntil||0;
    const cooldownOk=now>=sqCdUntil;
    const staleCooldownWithoutQuest=!hasActive&&!hasCompletedThisWindow&&sqCdUntil>now;
    if(base.breachTriggeredDay!==eventDayStr(now)&&!hasActive&&!hasCompletedThisWindow&&(cooldownOk||staleCooldownWithoutQuest)){
      const result=pickRandomSq(sqs.filter(q=>!q.completedAt).map(q=>q.id),base.sqStatCycle,base.sqDrawLog,base.urgentCompassStat);
      if(result){
        const {tpl,pickedStat,cycleReset,forced}=result;
        const sq={...tpl,sqid:"sq_"+now,progress:0,startedAt:now,expiresAt:next7AM(now),completedAt:null};
        const newCycle = forced ? [...(base.sqStatCycle||[])] : (cycleReset ? [pickedStat] : [...(base.sqStatCycle||[]),pickedStat]);
        return {...base,specialQuests:[...sqs.filter(q=>q.completedAt),sq],sqStatCycle:newCycle,sqDrawLog:appendUrgentQuestDrawLog(base.sqDrawLog,sq,now),sqCooldownUntil:next7AM(now),sqRerollDay:null,urgentCompassStat:forced?null:base.urgentCompassStat};
      }
    }
    return base;
  });
  const [tab,setTab]       = useState("home");
  const scrollRef = useRef(null);
  function switchTab(id){ setTab(id); if(scrollRef.current) scrollRef.current.scrollTop=0; }
  const [rankUp,setRankUp] = useState(null);
  const [levelUp,setLevelUp] = useState(null);
  const [statDecadeUp,setStatDecadeUp] = useState(null);
  const [statLevelQueue,setStatLevelQueue] = useState([]);
  const [debtUp,setDebtUp] = useState(null);
  const [confirmDebt,setConfirmDebt] = useState(null);
  const [streakUp,setStreakUp] = useState(null);
  const [completionUp,setCompletionUp] = useState(null);
  const [completionQueue,setCompletionQueue] = useState([]);
  const [recordUp,setRecordUp] = useState(null);
  const [keyLootUp,setKeyLootUp] = useState(null);
  const [keyLootQueue,setKeyLootQueue] = useState([]);
  const [itemLootUp,setItemLootUp] = useState(null);
  const [itemLootQueue,setItemLootQueue] = useState([]);
  const [alliedGiftUp,setAlliedGiftUp] = useState(null);
  const [alliedGiftChoiceOpen,setAlliedGiftChoiceOpen] = useState(false);
  const [confirmAlliedGift,setConfirmAlliedGift] = useState(null);
  const [itemUseUp,setItemUseUp] = useState(null);
  const [inventoryItem,setInventoryItem] = useState(null);
  const [inventorySort,setInventorySort] = useState("quantity");
  const [inventorySortOpen,setInventorySortOpen] = useState(false);
  const [confirmItemUse,setConfirmItemUse] = useState(null);
  const [elixirStatChoice,setElixirStatChoice] = useState(null);
  const [compassStatChoice,setCompassStatChoice] = useState(false);
  const [dungeonMapStatChoice,setDungeonMapStatChoice] = useState(false);
  const [specialItemChoice,setSpecialItemChoice] = useState(null);
  const [contractDungeonChoice,setContractDungeonChoice] = useState(null);
  const [confirmElixirUse,setConfirmElixirUse] = useState(null);
  const [confirmTargetedItemUse,setConfirmTargetedItemUse] = useState(null);
  const [dungeonUp,setDungeonUp] = useState(null);
  const [ruptureUp,setRuptureUp] = useState(null);
  const [urgentUp,setUrgentUp] = useState(null);
  const [confirmRerollSq,setConfirmRerollSq] = useState(null);
  const [confirmRegression,setConfirmRegression] = useState(false);
  const [regressionChoiceOpen,setRegressionChoiceOpen] = useState(false);
  const [regressionUp,setRegressionUp] = useState(false);
  const [confirmDungeonChoice,setConfirmDungeonChoice] = useState(null);
  const [dungeonChoiceOpen,setDungeonChoiceOpen] = useState(false);
  const [importModal,setImportModal] = useState(false);
  const [importValue,setImportValue] = useState("");
  const [exportCopiedModal,setExportCopiedModal] = useState(false);
  const [exportManualModal,setExportManualModal] = useState(false);
  const [exportValue,setExportValue] = useState("");
  const [dungeonHelpOpen,setDungeonHelpOpen] = useState({});
  const [selectedDungeonRoom,setSelectedDungeonRoom] = useState(null);
  const [historyOpen,setHistoryOpen] = useState({week:false,records:false,totals:false});
  const [codexOpen,setCodexOpen] = useState({obl:false,bonus:false,reg:false,sq:false,breach:false,breachRupture:false,debt:false,dj:false,djAlt:false,cs:false});
  const [prestigeUp,setPrestigeUp] = useState(null);
  const [showStatReqDetail,setShowStatReqDetail] = useState(false);
  const [showRankReqStats,setShowRankReqStats] = useState(false);
  const [mobOpen,setMobOpen] = useState(false);
  const [floats,setFloats] = useState([]);
  const [showSet,setShowSet]       = useState(false);
  const [confirmReset,setConfirmReset] = useState(false);
  const [wkOff,setWkOff]  = useState(0);
  const inputs = useRef({});
  const completedBreachRef = useRef(null);

  function enqueueDungeonKeyLoot(kind){
    setKeyLootQueue(q=>[...q,{kind:kind==="rare"?"rare":"guaranteed",id:Date.now()+Math.random()}]);
  }

  function awardDungeonKey(kind){
    setState(s=>incrementLootState(s,"dungeonKey"));
    enqueueDungeonKeyLoot(kind);
  }

  function enqueueItemLoot(item,kind="rare"){
    setItemLootQueue(q=>[...q,{item,kind,id:Date.now()+Math.random()}]);
  }

  function awardInventoryItem(kind,source="rare"){
    setState(s=>incrementLootState(s,kind));
    enqueueItemLoot(kind,source);
  }

  function awardRandomBreachLoot(){
    const won=pickRandomBreachLoot();
    if(!won)return null;
    if(won==="dungeonKey")awardDungeonKey("guaranteed");else awardInventoryItem(won,"guaranteed");
    return won;
  }

  function grantAlliedGift(id){
    setState(s=>grantAlliedGiftState(s,id));
  }

  function applyRegression(){
    const regression=(confirmRegression&&confirmRegression.id)?confirmRegression:REGRESSION_DEF;
    const day=todayStr();
    setState(s=>applyRegressionState(s,regression,{day,stats:STATS,getLevel:getLvl}));
    setConfirmRegression(false);
    setRegressionUp(true);
  }

  function tryRareDungeonKeyDrop(source="standard"){
    const won=rollStandardItemDrops();
    won.forEach(({id})=>{
      if(id==="key")awardDungeonKey("rare");
      else awardInventoryItem(id,"rare");
    });
    return won.length>0;
  }
  function tryDungeonItemDrops(dungeonId){
    rollDungeonItemDrops(dungeonId).forEach(({id,kind})=>{
      if(id==="key")awardDungeonKey(kind);
      else awardInventoryItem(id,kind);
    });
  }

  // Migration grips sec→min sur le state en mémoire (au cas où localStorage non migré)
  useEffect(()=>{
    const needsMigration=Object.values(state.dailyLog).some(log=>log.grips!=null&&log.grips>60);
    if(needsMigration){
      setState(s=>({...s,dailyLog:migrateGripsToMin(s.dailyLog)}));
    }
  },[]);

  // Persistance
  useEffect(()=>{ saveState(state); },[state]);


  // File d’attente des animations de montée de niveau de stat
  useEffect(()=>{
    if(statDecadeUp || !statLevelQueue.length) return;
    const [next,...rest]=statLevelQueue;
    setStatLevelQueue(rest);
    setStatDecadeUp(next);
  },[statDecadeUp,statLevelQueue]);

  useEffect(()=>{
    if(completionUp || !completionQueue.length) return;
    const [next,...rest]=completionQueue;
    setCompletionQueue(rest);
    setCompletionUp(next);
  },[completionUp,completionQueue]);


  // Penalite jours manques (une seule fois au montage)
  useEffect(()=>{
    const t=todayStr();
    if(state.lastActiveDay&&state.lastActiveDay!==t){
      const diff=Math.round((new Date(t)-new Date(state.lastActiveDay))/86400000);
      if(diff>=2)setState(s=>({...s,totalXp:Math.max(0,s.totalXp-diff*10),streak:0}));
    }
  },[]);


  // ─── CALCULS DERIVES (dans l'ordre, sans circularite) ──────────────────


  const today = todayStr();
  const wk    = wkStr();

  useEffect(()=>{
    const row=(state.exerciseRotationByDay||{})[today]||{};
    const complete=Object.entries(EXERCISE_ROTATIONS).every(([family,options])=>options.some(o=>o.id===row[family]));
    if(complete) return;
    setState(s=>ensureExerciseRotationForDay(s,today));
  },[today,state.exerciseRotationByDay]);

  const baseObjs = state.objectives||DEFS;
  const todayExerciseRotation=(state.exerciseRotationByDay||{})[today]||{};
  const objs = rotatedQuestObjects(baseObjs,todayExerciseRotation,state.stats,state.totalXp);
  const tLog  = state.dailyLog[today]||{};
  const wLog  = state.weeklyLog[wk]||{};
  const prestige = state.prestige||0;

  // Une Marque du dépassement est valable uniquement pendant sa semaine d’activation.
  useEffect(()=>{
    const challenge=state.recordChallenge;
    if(!challenge || challenge.week===wk) return;
    setState(s=>s.recordChallenge&&s.recordChallenge.week!==wk
      ? {...s,recordChallenge:null}
      : s
    );
  },[wk,state.recordChallenge?.week]);

  // Une seule sortie bonus par jour : Running ou Rando.
  const runQuestObj = objs.find(o=>o.id==="run") || DEFS.find(o=>o.id==="run");
  const hikeQuestObj = objs.find(o=>o.id==="walk") || DEFS.find(o=>o.id==="walk");
  const savedEnduranceChoice = (state.enduranceChoiceByDay||{})[today];
  const inferredEnduranceChoice = (Number(tLog.run)||0)>0 && (Number(tLog.walk)||0)>0
    ? ((Number(tLog.run)||0)>=(Number(tLog.walk)||0) ? "run" : "walk")
    : ((Number(tLog.run)||0)>0 ? "run" : ((Number(tLog.walk)||0)>0 ? "walk" : null));
  const enduranceChoiceId = savedEnduranceChoice==="run"||savedEnduranceChoice==="walk"
    ? savedEnduranceChoice
    : inferredEnduranceChoice;
  const selectedEnduranceQuest = enduranceChoiceId==="run" ? runQuestObj : enduranceChoiceId==="walk" ? hikeQuestObj : null;
  const enduranceChoicePlaceholder = {
    id:"endurance_choice",name:"Running ou Rando",icon:"🏃🏻 / 🥾",unit:"choix",
    daily:true,weekly:false,optional:true,stat:"Endurance",base:1,isEnduranceChoice:true
  };

  function chooseEnduranceQuest(id){
    if(id!=="run"&&id!=="walk") return;
    setState(s=>{
      const choices={...(s.enduranceChoiceByDay||{})};
      if(choices[today]==="run"||choices[today]==="walk") return s;
      const row=((s.dailyLog||{})[today])||{};
      const inferred=(Number(row.run)||0)>0 ? "run" : ((Number(row.walk)||0)>0 ? "walk" : null);
      choices[today]=inferred||id;
      return {...s,enduranceChoiceByDay:choices,lastActiveDay:todayStr()};
    });
  }

  function dailyBonusQuestObjects(){
    const others=objs.filter(o=>o.daily&&o.optional&&!o.bonusHidden&&o.id!=="run"&&o.id!=="walk");
    return sortStat([...others,selectedEnduranceQuest||enduranceChoicePlaceholder]);
  }

  const effectiveXp = state.totalXp;
  const rank     = getRankWithStats(effectiveXp, state.stats);
  const naturalRank = getRank(effectiveXp); // rang qu'on aurait sans les conditions de stats
  const nextRank = getNext(rank.id);
  const ri       = RANKS.findIndex(r=>r.id===rank.id);

  // Condition de stats pour le prochain rang
  const nextRankReq = nextRank ? RANK_STAT_REQUIREMENTS[nextRank.id] : null;
  const nextRankStatsCount = nextRankReq ? countStatsAtLevel(state.stats, nextRankReq.level) : 0;
  const nextRankStatsOk = nextRankReq ? nextRankStatsCount >= nextRankReq.count : true;
  // Rang bloqué : on a l'XP mais pas les stats
  const rankBlocked = nextRank && effectiveXp >= nextRank.xpRequired && !nextRankStatsOk;

  // 5. Progression XP dans le rang
  const xpInRank = effectiveXp - rank.xpRequired;
  const xpToNext = nextRank ? nextRank.xpRequired - rank.xpRequired : 1;
  const rankPct  = nextRank ? Math.min(100,(xpInRank/xpToNext)*100) : 100;
  const globalLevel = getGlobalLevelInfo(effectiveXp);

  // 5b. Prestige disponible : rang S atteint + XP max du rang S
  const S_RANK = RANKS[RANKS.length-1];
  const ASCENSION_XP_NEEDED = prestige > 0 ? getAscensionXpRequired(prestige + 1) : getAscensionXpRequired(1);
  const ASCENSION_XP_START  = prestige > 0 ? getAscensionXpRequired(prestige) : S_RANK.xpRequired;
  const nextAscension = prestige + 1;
  const ascReq = RANK_STAT_REQUIREMENTS["ASC_"+nextAscension];
  const ascStatsCount = ascReq ? countStatsAtLevel(state.stats, ascReq.level) : 0;
  const ascStatsOk = ascReq ? ascStatsCount >= ascReq.count : true;
  const prestigeXpReached = prestige < MAX_PRESTIGE && !nextRank && effectiveXp >= ASCENSION_XP_NEEDED;
  const prestigeAvailable = prestigeXpReached && ascStatsOk;
  const prestigeBlocked = prestigeXpReached && !ascStatsOk;

  // 6. XP du jour : journalières + XP ponctuelle gagnée aujourd'hui
  // Inclut maintenant les quêtes urgentes et les salles de donjon.
  const sameDayTs = ts => ts && new Date(ts).toDateString()===new Date().toDateString();
  const sumXpPairs = pairs => (pairs||[]).reduce((s,p)=>s+(Number(p?.xp)||0),0);
  const sqEarnedXp = q => {
    if(!q) return 0;
    if(q.tiers && q.tiers.length>0){
      const prog = Number(q.progress||0);
      return q.tiers.reduce((sum,tier)=>{
        if(prog < tier.at) return sum;
        return sum + (tier.xp||0) + (tier.xp2||0) + (tier.xp3||0);
      },0);
    }
    if(q.completedAt || (q.progress||0)>=(q.target||1)){
      return (q.xp||0) + (q.xp2||0) + (q.xp3||0);
    }
    return 0;
  };
  const extraToday = (state.dailyExtraXp&&state.dailyExtraXp[today]) || {};
  const extraTodayXp = Object.values(extraToday).reduce((s,v)=>s+(Number(v)||0),0);
  const legacyStreakTodayXp = extraToday.streak ? 0 : (
    state.streakBonusDay===today
      ? 250 + (((state.streak||0)>0 && (state.streak||0)%7===0 && (state.streakMilestones||[]).includes(state.streak)) ? 500 : 0)
      : 0
  );
  const legacySqTodayXp = extraToday.sq ? 0 : (state.specialQuests||[])
    .filter(q=>sameDayTs(q.completedAt))
    .reduce((s,q)=>s+sqEarnedXp(q),0);
  const legacyActiveDungeonTodayXp = extraToday.dungeon ? 0 : (()=>{
    const ad=state.activeDungeon;
    if(!ad || !sameDayTs(ad.startedAt)) return 0;
    const dg=DUNGEONS.find(d=>d.id===ad.id);
    if(!dg) return 0;
    return (ad.completedRooms||[]).reduce((sum,idx)=>sum+sumXpPairs(dungeonRoomRewardPairs(dg,idx)),0);
  })();
  const legacyCompletedDungeonTodayXp = extraToday.dungeon ? 0 : (state.dungeonLog||[])
    .filter(e=>sameDayTs(e.completedAt))
    .reduce((s,e)=>s+(Number(e.xp)||0),0);

  const todayXp = Object.entries(tLog).reduce((s,[id,a])=>{
    const o=objs.find(x=>x.id===id); if(!o) return s;
    const b = o.validateAt != null
      ? Number(o.validateAt)
      : (Number.isFinite(Number(o.target)) ? Number(o.target) : (o.base && !RANK_BASES[o.id] ? o.base : getRankBase(o.id, ri, prestige, state.stats)));
    return s + calcQuestTotalXp(o, a, b);
  },0) + extraTodayXp + legacyStreakTodayXp + legacySqTodayXp + legacyActiveDungeonTodayXp + legacyCompletedDungeonTodayXp;

  // 7. Quetes journalieres obligatoires toutes faites ?
  const reqDailyObjs  = objs.filter(o=>!o.optional&&o.daily);
  // Quêtes actives pour un jour donné (exclut les quêtes ajoutées après ce jour)
  const activeOn = (day) => reqDailyObjs.filter(o=>!o.startDate||o.startDate<=day);
  // Variante et objectif réellement applicables pour un jour donné.
  const questForDay = (obj,day) => {
    if(!obj || !isExerciseFamilyQuestId(obj.id)) return obj;
    const saved=(state.exerciseRotationByDay||{})[day]||{};
    const rotation={
      push:saved.push||LEGACY_EXERCISE_DEFAULTS.push,
      back:saved.back||LEGACY_EXERCISE_DEFAULTS.back,
      abs:saved.abs||LEGACY_EXERCISE_DEFAULTS.abs,
      legs:saved.legs||LEGACY_EXERCISE_DEFAULTS.legs
    };
    return rotatedQuestObjects(baseObjs,rotation,state.stats,state.totalXp).find(q=>q.id===obj.id)||obj;
  };
  // Base applicable pour un jour donné (gère les rotations et baseHistory).
  const getBaseForDay = (obj,day) => {
    if(!obj) return 0;
    const dayObj=questForDay(obj,day);
    if(dayObj.validateAt != null) return Number(dayObj.validateAt);
    if(Number.isFinite(Number(dayObj.target))) return Number(dayObj.target);
    if(dayObj.baseHistory&&day){
      for(const h of dayObj.baseHistory){
        if(day<=h.until) return h.base;
      }
    }
    return getRankBase(dayObj.id, ri, prestige, state.stats);
  };
  // Seuil pour considérer une quête comme "faite" (streak/historique)
  // Si validateAt est défini, on l'utilise ; sinon getBaseForDay (= la base)
  const getValidateThreshold = (obj, day) => {
    if(obj.validateAt != null) return obj.validateAt;
    return getBaseForDay(obj, day);
  };

  function getEffectiveTarget(objId, isWeekly=false){
    const obj = objs.find(o=>o.id===objId);
    if(obj && obj.validateAt != null) return obj.validateAt;
    if(obj && Number.isFinite(Number(obj.target))) return Number(obj.target);
    return getRankBase(objId, ri, prestige, state.stats);
  }

  // Une journée ayant déjà accordé le bonus de streak est définitivement validée.
  // Cela empêche une hausse ultérieure des objectifs (notamment les rotations
  // d'exercices dépendantes du niveau de Force) d'invalider rétroactivement
  // l'Historique ou la série.
  const hadValidatedDailyCompletion = day => hasValidatedDailyCompletion(state,day);

  const allDailyDone = areRequiredDailyQuestsComplete(
    state,
    reqDailyObjs,
    tLog,
    obj=>getEffectiveTarget(obj.id)
  );

  const bonusQuestObjsForCompletion = dailyBonusQuestObjects();
  const allBonusDone = areBonusQuestsComplete(
    bonusQuestObjsForCompletion,
    tLog,
    obj=>getEffectiveTarget(obj.id)
  );

  // 8. Streak : on remonte à partir d'hier (aujourd'hui peut être incomplet sans casser le streak)
  const computedStreak = computeQuestStreak(state,today,{
    activeObjectivesOnDay:activeOn,
    targetForDay:getValidateThreshold,
    targetForToday:obj=>getEffectiveTarget(obj.id)
  });

  // 9. Bonus hebdo supprimé : Running et Rando sont désormais des quêtes bonus.
  const weeklyDone = false;

  // 10. Quete speciale
  const [now,setNow] = useState(Date.now());
  const timedRefreshScrollRef = useRef(null);

  function captureTimedRefreshScroll(){
    const nodes=[...document.querySelectorAll(".scroll-area,.modal")];
    timedRefreshScrollRef.current=nodes.map((node,index)=>({
      index,
      className:node.className||"",
      scrollTop:node.scrollTop||0,
      scrollLeft:node.scrollLeft||0
    }));
  }

  useEffect(()=>{
    // Le rafraîchissement reste actif toutes les 30 secondes.
    // On mémorise seulement la position de chaque zone défilable avant le rendu.
    const id=setInterval(()=>{
      captureTimedRefreshScroll();
      setNow(Date.now());
    },30000);
    return ()=>clearInterval(id);
  },[]);

  useEffect(()=>{
    const saved=timedRefreshScrollRef.current;
    if(!saved) return;
    timedRefreshScrollRef.current=null;

    // Les menus internes sont recréés par le rendu global : on restaure leur
    // position juste après leur reconstruction, sans suspendre les minuteries.
    requestAnimationFrame(()=>{
      const nodes=[...document.querySelectorAll(".scroll-area,.modal")];
      saved.forEach(pos=>{
        const node=nodes[pos.index];
        if(!node) return;
        node.scrollTop=pos.scrollTop;
        node.scrollLeft=pos.scrollLeft;
      });
    });
  },[now]);
  useEffect(()=>{
    setState(s=>processDailyBreachRoll(s,now));
  },[now]);
  const sqs         = state.specialQuests||[];
  const activeSq    = sqs.find(q=>!q.completedAt&&now<q.expiresAt)||null;
  const activeBreach=state.activeBreach&&!state.activeBreach.completedAt?normalizeActiveBreach(state.activeBreach):null;
  const breachReplacesUrgentToday=state.breachTriggeredDay===eventDayStr(now);
  const completedSq = activeSq ? null : ([...(sqs||[])].filter(q=>q.completedAt&&(now-q.completedAt)<86400000).sort((a,b)=>(b.completedAt||0)-(a.completedAt||0))[0]||null);
  const sqCooldownUntil = state.sqCooldownUntil||null;
  const sqCooldownActive = sqCooldownUntil && now < sqCooldownUntil;
  const sqReady = !activeSq && !sqCooldownActive;
  const sqRerollUsed = state.sqRerollDay===today;

  // Réparation immédiate d'une carte urgente vide :
  // aucune quête active ni complétée depuis le dernier reset de 5 h.
  useEffect(()=>{
    const resetStart=current7AMStart(now);
    const resetEnd=next7AM(resetStart);
    const list=state.specialQuests||[];
    if(breachReplacesUrgentToday)return;
    const hasValidActive=list.some(q=>!q.completedAt&&now<(q.expiresAt||0));
    const hasCompletedCurrentWindow=list.some(q=>q.completedAt&&q.completedAt>=resetStart&&q.completedAt<resetEnd);
    if(hasValidActive||hasCompletedCurrentWindow) return;
    setState(s=>{
      const t=Date.now();
      const start=current7AMStart(t);
      const end=next7AM(start);
      const current=s.specialQuests||[];
      const stillActive=current.some(q=>!q.completedAt&&t<(q.expiresAt||0));
      const alreadyCompleted=current.some(q=>q.completedAt&&q.completedAt>=start&&q.completedAt<end);
      if(stillActive||alreadyCompleted) return s;
      const result=pickRandomSq(
        current.filter(q=>!q.completedAt).map(q=>q.id).filter(Boolean),
        s.sqStatCycle,
        s.sqDrawLog,
        s.urgentCompassStat
      );
      if(!result) return s;
      const {tpl,pickedStat,cycleReset,forced}=result;
      const sq={...tpl,sqid:"sq_"+t,progress:0,startedAt:t,expiresAt:next7AM(t),completedAt:null};
      const newCycle=forced?[...(s.sqStatCycle||[])]:(cycleReset?[pickedStat]:[...(s.sqStatCycle||[]),pickedStat]);
      return {
        ...s,
        specialQuests:[...current.filter(q=>q.completedAt),sq],
        sqStatCycle:newCycle,
        sqDrawLog:appendUrgentQuestDrawLog(s.sqDrawLog,sq,t),
        sqCooldownUntil:next7AM(t),
        sqRerollDay:null,
        urgentCompassStat:forced?null:s.urgentCompassStat,
        lastActiveDay:todayStr()
      };
    });
  },[now,state.specialQuests,state.sqCooldownUntil,breachReplacesUrgentToday]);

  const activeDungeon = activeDungeonView(state.activeDungeon,DUNGEONS,now);
  const dungeonRunDay = state.dungeonRunDay||null;
  const dungeonWeekCount = countDungeonRunsThisWeek(state,wk,wkStr);
  const dungeonDailyUsed = dungeonRunDay===today;
  const dungeonSkipDay = state.dungeonSkipDay||null;
  const dungeonSkippedToday = dungeonSkipDay===today;
  const dungeonKeyRollDone = state.dungeonKeyRollDay===today;
  const dungeonKeys = Math.max(0,Math.floor(Number(state.dungeonKeys)||0));
  const dungeonKeyAvailable = dungeonKeys>0;
  const dungeonAccessOpen = state.dungeonAccessOpen===true;
  const activeElixir = currentActiveElixir(state.activeElixir,now);
  const suspendedElixir = currentSuspendedElixir(state.suspendedElixir);

  // Après 24 h de suspension, l'élixir reprend automatiquement avec son temps restant.
  useEffect(()=>{
    const suspended=state.suspendedElixir;
    if(!suspended || now<(Number(suspended.resumeDeadline)||0)) return;
    setState(s=>{
      const cur=s.suspendedElixir;
      if(!cur || Date.now()<(Number(cur.resumeDeadline)||0) || s.activeElixir) return s;
      const t=Date.now();
      return {...s,suspendedElixir:null,activeElixir:buildResumedElixir(cur,t)};
    });
  },[now,state.suspendedElixir?.resumeDeadline,state.activeElixir?.kind]);

  const urgentDoneToday = urgentQuestCompletedOnDay(state.specialQuests,today,todayStr);
  const dungeonLootConditionsMet = allDailyDone && allBonusDone && urgentDoneToday;

  // Mémorise l’état observé pendant la session : les animations de complétion
  // ne doivent se lancer que lors du passage de « incomplet » à « complet »,
  // jamais simplement parce que l’application est ouverte ou actualisée.
  const dailyCompletionSeenRef = useRef(allDailyDone);
  const bonusCompletionSeenRef = useRef(allBonusDone);
  const allQuestsCompletionSeenRef = useRef(dungeonLootConditionsMet);
  const dungeonCanStart = !state.activeDungeon && !dungeonDailyUsed && dungeonWeekCount<3 && dungeonAccessOpen;


  // Flags bonus
  const bonusGiven       = state.streakBonusDay===today;
  const weeklyBonusGiven = state.weeklyBonusWk===wk;
  const missedDays       = (()=>{
    if(!state.lastActiveDay)return 0;
    const d=Math.round((new Date(today)-new Date(state.lastActiveDay))/86400000);
    return d>1?d:0;
  })();


  function triggerStatDecadeOverlay(beforeStats,afterStats,delay=650){
    const hits=[];
    STATS.forEach(stat=>{
      const before=Number((beforeStats||{})[stat])||0;
      const after=Number((afterStats||{})[stat])||0;
      if(after<=before) return;
      for(let level=before+1;level<=after;level++){
        const color=STAT_COLOR[stat] || rank.color || "#fbbf24";
        hits.push({
          stat,
          label:STAT_LBL[stat] || stat,
          level,
          color,
          glow:color+"66"
        });
      }
    });
    if(!hits.length) return;
    setTimeout(()=>setStatLevelQueue(q=>[...q,...hits]),delay);
  }

  function triggerProgressOverlay(beforeXp,beforeStats,afterXp,afterStats,delay=300){
    const beforeRank = getRankWithStats(beforeXp,beforeStats);
    const afterRank = getRankWithStats(afterXp,afterStats);
    const beforeLevel = getGlobalLevelInfo(beforeXp).level;
    const afterLevel = getGlobalLevelInfo(afterXp).level;
    const rankChanged = afterRank.id !== beforeRank.id;
    const levelChanged = afterLevel !== beforeLevel;

    triggerStatDecadeOverlay(beforeStats,afterStats,rankChanged||levelChanged ? delay+1200 : delay);

    if(!rankChanged && !levelChanged) return;

    setTimeout(()=>{
      if(rankChanged){
        setRankUp(levelChanged ? {...afterRank, level:afterLevel} : afterRank);
        return;
      }
      setLevelUp({
        level:afterLevel,
        color:afterRank.color,
        glow:afterRank.glow
      });
    },delay);
  }

  function maybeTriggerQuestRecord(obj,prevVal,nextVal,delay=850){
    if(!obj || obj.binary || obj.weekly) return;
    const nextNumber=Number(nextVal)||0;
    if(nextNumber<=0) return;

    let best=0;
    Object.entries(state.dailyLog||{}).forEach(([day,log])=>{
      if(obj.id==="run" && day<RUN_RECORD_RESET_DAY) return;
      const v=Number(log&&log[obj.id]);
      if(Number.isFinite(v) && v>best) best=v;
    });

    // Pas d'animation sur la toute première valeur enregistrée : on célèbre seulement un vrai record battu.
    if(best<=0 || nextNumber<=best) return;

    const color=STAT_COLOR[obj.stat] || rank.color || "#fbbf24";
    const label=fmtNum(nextNumber)+" "+questRecordUnit(obj.unit,nextNumber);
    setTimeout(()=>{
      setRecordUp({
        title:"NOUVEAU RECORD",
        name:obj.name,
        icon:obj.icon,
        value:label,
        color,
        glow:color+"55",
        rankColor:rank.color,
        rankGlow:rank.glow
      });
      tryRareDungeonKeyDrop("record");
      const challenge=state.recordChallenge;
      const challengeRotationOk=!challenge||!challenge.rotationId||recordRotationIdForDay(state.exerciseRotationByDay,today,challenge.family)===challenge.rotationId;
      if(challenge&&challenge.week===wkStr()&&challenge.questId===obj.id&&challengeRotationOk&&nextNumber>Number(challenge.target||0)){
        addXp(500,obj.stat,null,true);
        setState(s=>({...s,recordChallenge:null}));
        setTimeout(()=>setItemUseUp({id:"recordHammer",recordWon:true}),250);
      }
    },delay);
  }


  // ─── EFFECTS ──────────────────────────────────────────────────────────

  // Couleur CSS du rang
  useEffect(()=>{
    const r=document.documentElement.style;
    r.setProperty("--rc",rank.color); r.setProperty("--rg",rank.glow);
    const iconFx=iconThemeFilter(rank.color);
    r.setProperty("--icon-filter",iconFx.base);
    r.setProperty("--icon-filter-active",iconFx.active);
    r.setProperty("--ra",rank.accent); r.setProperty("--bg",rank.bg);
    const app=document.querySelector("#app");
    if(app) app.style.background=rank.bg;
  },[rank.id]);

  // Sync streak
  useEffect(()=>{
    if(computedStreak!==state.streak)setState(s=>({...s,streak:computedStreak}));
  },[computedStreak]);

  // Un Donjon expiré se ferme simplement ; les XP déjà gagnées restent acquises.
  useEffect(()=>{
    const ad=state.activeDungeon;
    if(!ad||ad.completedAt||now<(ad.expiresAt||0))return;
    setState(s=>expireActiveDungeonState(s,Date.now()));
  },[now,state.activeDungeon?.expiresAt]);

  // Une Brèche non refermée après 72 h entre en Rupture pendant 24 h.
  useEffect(()=>{
    const b=state.activeBreach;
    if(!b||b.completedAt||now<(b.expiresAt||0))return;
    if(b.ruptureBoss){
      const t=Date.now();
      setState(s=>{
        const cur=s.activeBreach;
        if(!cur||!cur.ruptureBoss||t<(cur.expiresAt||0))return s;
        return {...s,activeBreach:null,ruptureMalus:{pct:-0.25,startedAt:t,expiresAt:t+24*60*60*1000}};
      });
      return;
    }
    const boss=pickBreachRuptureBoss(b.id);
    if(!boss){
      setState(s=>s.activeBreach&&Date.now()>=(s.activeBreach.expiresAt||0)?{...s,activeBreach:null}:s);
      return;
    }
    const t=Date.now();
    const ruptureBoss={...boss,startedAt:t,expiresAt:t+24*60*60*1000};
    setState(s=>{
      const cur=s.activeBreach;
      if(!cur||cur.ruptureBoss||t<(cur.expiresAt||0))return s;
      return {...s,activeBreach:{...cur,progress:0,rupturedAt:t,ruptureBoss,expiresAt:ruptureBoss.expiresAt}};
    });
    setRuptureUp({dungeonTitle:"Brèche en Rupture",icon:"⚡",name:boss.name,objective:b.desc,ruptureColor:"#ef4444"});
  },[now,state.activeBreach?.expiresAt,state.activeBreach?.ruptureBoss?.id]);

  // Échec automatique d’une dette non remboursée après son jour d’échéance
  useEffect(()=>{
    const debt=state.questDebt;
    if(!debt || debt.status!=="active") return;
    if(today<=debt.dueDay) return;
    setState(s=>expireQuestDebtState(s,today));
  },[today,state.questDebt?.status,state.questDebt?.dueDay]);

  // Compatibilité avec les dettes remboursées le jour de leur création avant
  // le correctif : si la progression déjà saisie a comblé tout le manque,
  // la dette est clôturée sans attribuer une seconde fois ses XP.
  useEffect(()=>{
    if(!state.questDebt || state.questDebt.status!=="active" || state.questDebt.sourceDay!==today) return;
    setState(s=>reconcileSameDayQuestDebtState(s,today));
  },[today,state.questDebt?.status,state.questDebt?.sourceDay,state.questDebt?.id,state.dailyLog]);

  // Animations de complétion des groupes de quêtes — une seule fois par jour.
  // Clé de donjon : une clé garantie par journée totalement complétée
  // (toutes les journalières, la quête urgente et toutes les quêtes bonus).
  useEffect(()=>{
    if(!dungeonLootConditionsMet || dungeonKeyRollDone) return;
    setState(s=>{
      if(s.dungeonKeyRollDay===today) return s;
      return {
        ...s,
        dungeonKeyRollDay:today,
        dungeonKeyRollWon:true,
        dungeonKeyDay:today,
        dungeonKeys:Math.max(0,Math.floor(Number(s.dungeonKeys)||0))+1
      };
    });
    enqueueDungeonKeyLoot("guaranteed");
  },[dungeonLootConditionsMet,dungeonKeyRollDone,today]);

  useEffect(()=>{
    if(keyLootUp || !keyLootQueue.length) return;
    // Les animations de complétion passent toujours avant les objets.
    if(allDailyDone && state.dailyCompletionAnimDay!==today) return;
    if(dungeonLootConditionsMet && state.allQuestsCompletionAnimDay!==today) return;
    if(completionQueue.length) return;
    if(rankUp || levelUp || statDecadeUp || completionUp || streakUp || recordUp || dungeonUp || ruptureUp || urgentUp || debtUp || prestigeUp || alliedGiftUp || alliedGiftChoiceOpen || confirmAlliedGift) return;
    const [next,...rest]=keyLootQueue;
    setKeyLootQueue(rest);
    setKeyLootUp(next);
  },[keyLootQueue,keyLootUp,rankUp,levelUp,statDecadeUp,completionUp,completionQueue.length,streakUp,recordUp,dungeonUp,ruptureUp,urgentUp,debtUp,prestigeUp,alliedGiftUp,alliedGiftChoiceOpen,confirmAlliedGift,allDailyDone,dungeonLootConditionsMet,state.dailyCompletionAnimDay,state.allQuestsCompletionAnimDay,today]);

  useEffect(()=>{
    if(itemLootUp || !itemLootQueue.length) return;
    // Les animations de complétion passent toujours avant les objets.
    if(allDailyDone && state.dailyCompletionAnimDay!==today) return;
    if(dungeonLootConditionsMet && state.allQuestsCompletionAnimDay!==today) return;
    if(completionQueue.length) return;
    if(rankUp || levelUp || statDecadeUp || completionUp || streakUp || recordUp || keyLootUp || dungeonUp || ruptureUp || urgentUp || debtUp || prestigeUp || itemUseUp || alliedGiftUp || alliedGiftChoiceOpen || confirmAlliedGift) return;
    const [next,...rest]=itemLootQueue;
    setItemLootQueue(rest);
    setItemLootUp(next);
  },[itemLootQueue,itemLootUp,rankUp,levelUp,statDecadeUp,completionUp,completionQueue.length,streakUp,recordUp,keyLootUp,dungeonUp,ruptureUp,urgentUp,debtUp,prestigeUp,itemUseUp,alliedGiftUp,alliedGiftChoiceOpen,confirmAlliedGift,allDailyDone,dungeonLootConditionsMet,state.dailyCompletionAnimDay,state.allQuestsCompletionAnimDay,today]);

  useEffect(()=>{
    const pending=state.alliedGiftPending;
    if(!pending||alliedGiftUp||alliedGiftChoiceOpen||confirmAlliedGift)return;
    if(rankUp||levelUp||statDecadeUp||completionUp||streakUp||recordUp||keyLootUp||itemLootUp||dungeonUp||ruptureUp||urgentUp||debtUp||prestigeUp||itemUseUp)return;
    if(keyLootQueue.length||itemLootQueue.length)return;
    setAlliedGiftUp(pending);
  },[
    state.alliedGiftPending,
    alliedGiftUp,
    alliedGiftChoiceOpen,
    confirmAlliedGift,
    rankUp,
    levelUp,
    statDecadeUp,
    completionUp,
    streakUp,
    recordUp,
    keyLootUp,
    itemLootUp,
    dungeonUp,
    ruptureUp,
    urgentUp,
    debtUp,
    prestigeUp,
    itemUseUp,
    keyLootQueue.length,
    itemLootQueue.length
  ]);

  useEffect(()=>{
    const wasDone=dailyCompletionSeenRef.current;
    dailyCompletionSeenRef.current=allDailyDone;
    if(!allDailyDone || state.dailyCompletionAnimDay===today) return;

    // Si l’app démarre alors que les quêtes étaient déjà terminées, on marque
    // silencieusement l’animation comme traitée sans la rejouer.
    if(wasDone){
      setState(s=>s.dailyCompletionAnimDay===today?s:{...s,dailyCompletionAnimDay:today});
      return;
    }

    setState(s=>s.dailyCompletionAnimDay===today?s:{...s,dailyCompletionAnimDay:today});
    setCompletionQueue(q=>[...q,{
      type:"daily",
      text:"Toutes les quêtes journalières ont été complétées"
    }]);
    tryRareDungeonKeyDrop();
  },[allDailyDone,today,state.dailyCompletionAnimDay]);

  useEffect(()=>{
    const wasDone=bonusCompletionSeenRef.current;
    bonusCompletionSeenRef.current=allBonusDone;
    if(!allBonusDone || state.bonusCompletionAnimDay===today) return;

    if(wasDone){
      setState(s=>s.bonusCompletionAnimDay===today?s:{...s,bonusCompletionAnimDay:today});
      return;
    }

    setState(s=>s.bonusCompletionAnimDay===today?s:{...s,bonusCompletionAnimDay:today});
    setCompletionQueue(q=>[...q,{
      type:"bonus",
      text:"Toutes les quêtes bonus ont été complétées"
    }]);
    tryRareDungeonKeyDrop();
  },[allBonusDone,today,state.bonusCompletionAnimDay]);

  // Animation de journée complète : après les animations de groupes, avant les objets.
  useEffect(()=>{
    const wasDone=allQuestsCompletionSeenRef.current;
    allQuestsCompletionSeenRef.current=dungeonLootConditionsMet;
    if(!dungeonLootConditionsMet || state.allQuestsCompletionAnimDay===today) return;
    // Laisse d’abord s’enregistrer les animations Journalières/Bonus du même rendu.
    if(allDailyDone && state.dailyCompletionAnimDay!==today) return;
    if(allBonusDone && state.bonusCompletionAnimDay!==today) return;

    if(wasDone){
      setState(s=>s.allQuestsCompletionAnimDay===today?s:{...s,allQuestsCompletionAnimDay:today});
      return;
    }

    setState(s=>s.allQuestsCompletionAnimDay===today?s:{...s,allQuestsCompletionAnimDay:today});
    setCompletionQueue(q=>[...q,{
      type:"all",
      text:"L'ensemble des quêtes disponibles a été complété."
    }]);
  },[dungeonLootConditionsMet,allDailyDone,allBonusDone,today,state.dailyCompletionAnimDay,state.bonusCompletionAnimDay,state.allQuestsCompletionAnimDay]);

  // Bonus streak + increment streak au moment ou toutes les quetes sont faites
  useEffect(()=>{
    if(!allDailyDone)return;
    setState(s=>{
      const result=applyDailyStreakRewardState(s,{today:todayStr(),getLevel:getLvl});
      if(result.awarded){
        const streakAnim={
          ...result.animation,
          color:STAT_COLOR.Discipline,
          glow:STAT_COLOR.Discipline+"66"
        };
        setTimeout(()=>setStreakUp(streakAnim),300);
        triggerProgressOverlay(result.beforeXp,result.beforeStats,result.afterXp,result.afterStats,1800);
      }
      return result.state;
    });
  },[allDailyDone]);

  // Auto-launch quete speciale si sqReady (pas active + cooldown passé)
  useEffect(()=>{
    if(!sqReady) return;
    setState(s=>{
      // Re-check dans le setter (state à jour)
      const sqsNow = s.specialQuests||[];
      const hasActive = sqsNow.find(q=>!q.completedAt&&Date.now()<q.expiresAt);
      const cd = s.sqCooldownUntil||0;
      if(hasActive || Date.now()<cd) return s;
      const result=pickRandomSq(sqsNow.filter(q=>!q.completedAt).map(q=>q.id),s.sqStatCycle,s.sqDrawLog,s.urgentCompassStat);
      if(!result)return s;
      const {tpl,pickedStat,cycleReset,forced}=result;
      const t = Date.now();
      const sq={...tpl,sqid:"sq_"+t,progress:0,startedAt:t,expiresAt:next7AM(t),completedAt:null};
      const newCycle = forced ? [...(s.sqStatCycle||[])] : (cycleReset ? [pickedStat] : [...(s.sqStatCycle||[]),pickedStat]);
      return {...s,specialQuests:[...sqsNow.filter(q=>q.completedAt),sq],sqStatCycle:newCycle,sqDrawLog:appendUrgentQuestDrawLog(s.sqDrawLog,sq,t),sqCooldownUntil:next7AM(t),urgentCompassStat:forced?null:s.urgentCompassStat};
    });
  },[sqReady]);

  // Sauvegarder quête urgente complétée dans le log
  useEffect(()=>{
    if(!completedSq) return;
    setState(s=>{
      const log = s.completedSqLog||[];
      if(log.find(e=>e.sqid===completedSq.sqid)) return s;
      return {...s, completedSqLog:[...log,{sqid:completedSq.sqid,id:completedSq.id,name:completedSq.name,icon:completedSq.icon,xp:completedSq.xp,stat:completedSq.stat,completedAt:completedSq.completedAt}]};
    });
  },[completedSq?.sqid]);

  // Épreuves supprimées : pas de détection d'échec.


  function spawnFloat(txt,e){
    const id=Date.now()+Math.random();
    setFloats(f=>[...f,{id,txt}]);
    setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),2300);
  }

  const STAT_LBL2={"Force":"Force","Sante":"Sant\u00e9","Esprit":"Esprit","Endurance":"Endurance","Agilite":"Agilit\u00e9","Discipline":"Discipline"};
  function xpAdjustment(s,amount,stat,skipEventBonus=false){
    const base=Number(amount)||0;
    const el=s.activeElixir;
    const bonus=skipEventBonus?0:elixirBonusForStat(el,stat,base,Date.now());
    const malus=s.ruptureMalus&&Date.now()<(s.ruptureMalus.expiresAt||0)?-Math.round(base*0.25):0;
    return {bonus,malus,gain:Math.max(0,base+bonus+malus)};
  }
  function addXp(amount,stat,e,silent,showStat,skipEventBonus=false){
    setState(s=>{
      const adjusted=xpAdjustment(s,amount,stat,skipEventBonus);
      const eventBonus=adjusted.bonus;
      const gain=adjusted.gain;
      const nt=s.totalXp+gain;
      const sx={...s.statXp,[stat]:(s.statXp[stat]||0)+gain};
      const newStats={...s.stats,[stat]:getLvl(sx[stat])};
      const daily={...(s.dailyExtraXp||{})};
      if(eventBonus>0){
        const day=todayStr();
        const dayLog={...(daily[day]||{})};
        dayLog.eventBonus=(dayLog.eventBonus||0)+eventBonus;
        daily[day]=dayLog;
      }
      triggerProgressOverlay(s.totalXp,s.stats,nt,newStats,100);
      return {...s,totalXp:nt,statXp:sx,stats:newStats,dailyExtraXp:eventBonus>0?daily:(s.dailyExtraXp||{}),lastActiveDay:todayStr()};
    });
    if(e&&!silent){
      const lbl=showStat?("+"+Math.round(amount)+" XP "+( STAT_LBL2[showStat]||showStat)):("+"+Math.round(amount)+" XP");
      spawnFloat(lbl,e);
    }
  }


  function createQuestDebt(obj){
    if(!obj || !isDebtEligibleQuest(obj)) return;
    setState(s=>{
      const target=obj.validateAt != null
        ? Number(obj.validateAt)
        : (Number.isFinite(Number(obj.target)) ? Number(obj.target) : getRankBase(obj.id,ri,prestige,s.stats));
      return createQuestDebtState(s,obj,{today,target});
    });
    setSpecialItemChoice(null);
    setConfirmDebt(null);
    setItemUseUp({id:"debtAcknowledgement"});
  }

  function repayDebtPortion(obj,val){
    const debt=state.questDebt;
    const plan=planQuestDebtRepayment(debt,obj,val,today);
    if(plan.used<=0) return {used:0,remaining:plan.remaining};

    setState(s=>applyQuestDebtPaymentState(s,plan.used,today));
    if(plan.willComplete){
      (debt.rewards||[]).forEach(r=>addXp(r.xp,r.stat,null,true,null,true));
      setTimeout(()=>setDebtUp({
        name:debt.name,
        rewards:debt.rewards||[],
        color:STAT_COLOR[debt.stat]||rank.color,
        glow:(STAT_COLOR[debt.stat]||rank.color)+"66"
      }),500);
    }
    return {used:plan.used,remaining:plan.remaining};
  }

  function validate(obj,e,forceVal){
    if(e){e.preventDefault();e.stopPropagation();}
    const el=document.getElementById("qi_"+obj.id);
    const raw=(inputs.current[obj.id]||"").toString().replace(",",".");
    let val=parseFloat(raw); if(!val||val<=0)return;
    const debtSplit=repayDebtPortion(obj,val);
    val=debtSplit.remaining;
    inputs.current[obj.id]="";
    if(val<=0)return;
    if(el){el.value="";setTimeout(()=>{try{el.focus();}catch(_){}},50);}
    const cur=(obj.weekly)?(wLog[obj.id]||0):(tLog[obj.id]||0);
    let xp=0;
    let capJustReached_DISABLED=false;
    const b=obj.validateAt != null
      ? Number(obj.validateAt)
      : (Number.isFinite(Number(obj.target)) ? Number(obj.target) : getRankBase(obj.id,ri,prestige,state.stats));
    const prev=cur, next=cur+val;
    maybeTriggerQuestRecord(obj,prev,next);
    const alreadyCapped_DISABLED = false;
    const effectiveNext = next;
    const effectiveVal = val;
    // Tout objectif avec un base, non-binary, hors cas spéciaux (water/run) entre dans le système palier
    const isPalier = obj.base && !obj.binary && obj.id!=="water" && obj.id!=="run";

    // Cas spécial : quête avec tiers (repas équilibré x/2, etc.)
    if(obj.tiers && obj.tiers.length>0){
      // Sauvegarder le log d'abord
      setState(s=>{
        const d={...s.dailyLog};d[today]={...(d[today]||{}),[obj.id]:(d[today]?.[obj.id]||0)+val};
        if(obj.weekly){
          const w={...s.weeklyLog};w[wk]={...(w[wk]||{}),[obj.id]:(w[wk]?.[obj.id]||0)+val};
          return{...s,weeklyLog:w,dailyLog:d,lastActiveDay:todayStr()};
        }
        return{...s,dailyLog:d,lastActiveDay:todayStr()};
      });
      // Calculer les tiers franchis
      const crossedTiers = obj.tiers.filter(t => prev < t.at && next >= t.at);
      const xpByStat = {};
      if(crossedTiers.length>0){
        crossedTiers.forEach(t=>{
          addXp(t.xp, t.stat, null, true);
          xpByStat[t.stat] = (xpByStat[t.stat]||0) + t.xp;
          if(t.xp2 && t.stat2){
            addXp(t.xp2, t.stat2, null, true);
            xpByStat[t.stat2] = (xpByStat[t.stat2]||0) + t.xp2;
          }
        });
      }
      if(obj.overGoalXpPer){
        const overTarget = obj.target || obj.tiers[obj.tiers.length-1].at || obj.base || 0;
        const prevOver = Math.max(0, prev - overTarget);
        const nextOver = Math.max(0, next - overTarget);
        const overUnits = Math.max(0, nextOver - prevOver);
        const overXp = overUnits * obj.overGoalXpPer;
        if(overXp>0){
          const overStat = obj.overGoalStat || obj.stat;
          addXp(overXp, overStat, null, true);
          xpByStat[overStat] = (xpByStat[overStat]||0) + overXp;
        }
      }
      if(Object.keys(xpByStat).length>0){
        const lines = Object.entries(xpByStat).map(([stat,xp])=>"+"+Math.round(xp)+" XP "+(STAT_LBL2[stat]||stat));
        lines.forEach((txt,i)=>{
          const id=Date.now()+Math.random()+i*0.01;
          setFloats(f=>[...f,{id, y:(38+i*3)+"%", txt}]);
          setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),2300);
        });
      }
      return;
    }
    if(obj.id==="reading"){
      const espritXp=Math.max(0,effectiveVal)*obj.xpPer;
      setState(s=>{
        const d={...s.dailyLog};d[today]={...(d[today]||{}),[obj.id]:(d[today]?.[obj.id]||0)+val};
        let next2={...s,dailyLog:d,lastActiveDay:todayStr()};
        return next2;
      });
      if(espritXp>0){
        addXp(espritXp,obj.stat,null,true);
        const id=Date.now()+Math.random();
        setFloats(f=>[...f,{id,y:"38%",txt:"+"+Math.round(espritXp)+" XP "+(STAT_LBL2[obj.stat]||obj.stat)}]);
        setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),2300);
      } else if(!capJustReached_DISABLED && !alreadyCapped_DISABLED) spawnFloat("0 XP",e);
      return;
    }
    if(obj.binary){const was=cur>=b,now2=(cur+val)>=b; xp=(!was&&now2)?(obj.binaryXp||50):0;}
    else if(alreadyCapped_DISABLED){
      // Aucun cap : on log toujours la valeur
      xp=0;
    }
    else if(isPalier){
      // Utilise effectiveVal
      if(obj.optional){
        // Quêtes bonus : XP linéaire dès le début + 1 bonus par palier franchi à partir du palier 2
        xp=effectiveVal*obj.xpPer;
        const prevMult=prev<b?0:Math.floor(prev/b);
        const nextMult=effectiveNext<b?0:Math.floor(effectiveNext/b);
        for(let m=Math.max(2,prevMult+1);m<=nextMult;m++){
          xp+=b*obj.xpPer;
        }
      } else {
        // Quêtes journalières : 0 XP si objectif non atteint
        if(effectiveNext<b){xp=0;}
        else {
          const xpNext=effectiveNext*obj.xpPer;
          const xpPrev=prev>=b?prev*obj.xpPer:0;
          xp=xpNext-xpPrev;
          const prevMult=prev<b?1:Math.floor(prev/b);
          const nextMult=Math.floor(effectiveNext/b);
          for(let m=Math.max(2,prevMult+1);m<=nextMult;m++){
            xp+=b*obj.xpPer;
          }
        }
      }
    }
    else if(obj.id==="run"){
      // Course : linéaire 100xp/km + 50% bonus si total >= 2x objectif
      
      xp=effectiveVal*obj.xpPer;
      const totalAfter=effectiveNext;
      if(totalAfter>=b*2) xp+=Math.round(effectiveVal*obj.xpPer*0.5);
    }
    else{const nt=cur+val; if(cur>=b)xp=val*obj.xpPer; else if(nt<=b)xp=val*obj.xpPer; else xp=val*obj.xpPer;}
    setState(s=>{
      let next2 = s;
      if(obj.weekly){
        const w={...s.weeklyLog};w[wk]={...(w[wk]||{}),[obj.id]:(w[wk]?.[obj.id]||0)+val};
        // Stocker aussi dans dailyLog pour l'XP du jour
        const d2={...s.dailyLog};d2[today]={...(d2[today]||{}),[obj.id]:(d2[today]?.[obj.id]||0)+val};
        next2={...s,weeklyLog:w,dailyLog:d2,lastActiveDay:todayStr()};
      } else {
        const d={...s.dailyLog};d[today]={...(d[today]||{}),[obj.id]:(d[today]?.[obj.id]||0)+val};
        next2={...s,dailyLog:d,lastActiveDay:todayStr()};
      }
      
      return next2;
    });
    if(xp>0){
      if(obj.stat2&&obj.xpPer2){
        // Double stat avec XP différents (flex:5+5, grips:5+5)
        const xp2=Math.round(xp*(obj.xpPer2/obj.xpPer));
        const id1=Date.now()+Math.random(), id2=id1+0.01;
        setFloats(f=>[...f,
          {id:id1,y:"38%",txt:"+"+Math.round(xp)+" XP "+(STAT_LBL2[obj.stat]||obj.stat)},
          {id:id2,y:"41%",txt:"+"+Math.round(xp2)+" XP "+(STAT_LBL2[obj.stat2]||obj.stat2)}
        ]);
        setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id1&&p.id!==id2)),2300);
        addXp(xp,obj.stat,null,true);
        addXp(xp2,obj.stat2,null,true);
      } else if(obj.stat2){
        // Double stat même XP (squats)
        const id1=Date.now()+Math.random(), id2=id1+0.01;
        setFloats(f=>[...f,
          {id:id1,y:"38%",txt:"+"+Math.round(xp)+" XP "+(STAT_LBL2[obj.stat]||obj.stat)},
          {id:id2,y:"41%",txt:"+"+Math.round(xp)+" XP "+(STAT_LBL2[obj.stat2]||obj.stat2)}
        ]);
        setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id1&&p.id!==id2)),2300);
        addXp(xp,obj.stat,null,true);
        addXp(xp,obj.stat2,null,true);
      } else {
        addXp(xp,obj.stat,e,false,obj.stat);
      }
    } else if(!capJustReached_DISABLED && !alreadyCapped_DISABLED) spawnFloat("0 XP",e);
  }

  function progressSq(sq,e,directVal){
    let val;
    if(directVal!==undefined){
      val = directVal;
    } else {
      const el=document.getElementById("sqi_"+sq.sqid); if(!el)return;
      const raw=el.value.toString().replace(",","."); el.value="";
      val=parseFloat(raw);
    }
    if(!val||val<=0)return;
    const newProg=Math.min(sq.target,sq.progress+val);
    const wasComplete=sq.progress>=sq.target;
    const nowComplete=newProg>=sq.target;

    // Si la quête a des paliers intermédiaires (tiers), on distribue le XP palier par palier
    if(sq.tiers&&sq.tiers.length>0){
      const crossedTiers = sq.tiers.filter(t=>sq.progress<t.at&&newProg>=t.at);
      if(crossedTiers.length>0){
        // Cumuler le XP par stat pour l'affichage
        const xpByStat = {};
        crossedTiers.forEach(t=>{
          addXp(t.xp,t.stat,null,true);
          xpByStat[t.stat]=(xpByStat[t.stat]||0)+t.xp;
          // xp2/stat2 du palier optionnel
          if(t.xp2&&t.stat2){
            addXp(t.xp2,t.stat2,null,true);
            xpByStat[t.stat2]=(xpByStat[t.stat2]||0)+t.xp2;
          }
        });
        const rewardPairs = Object.entries(xpByStat).map(([stat,xp])=>({stat,xp}));
        if(nowComplete){
          triggerUrgentUp(sq,rewardPairs);
          tryRareDungeonKeyDrop("urgent");
        }else{
          const id1=Date.now()+Math.random();
          const id2=id1+0.1;
          const xpText = rewardPairs.map(p=>{
            const lbl = STAT_LBL2[p.stat] || STAT_LBL[p.stat] || p.stat || "";
            return "+"+p.xp+" XP"+(lbl?" "+lbl:"");
          }).join("\n");
          setFloats(f=>[...f,
            {id:id1,y:"35%",txt:"\u2728 PALIER FRANCHI !"},
            {id:id2,y:"40%",txt:xpText}
          ]);
          setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id1&&p.id!==id2)),1400);
        }
      }
      const awardedXp = crossedTiers.reduce((sum,t)=>
        sum + (t.xp||0) + (t.xp2||0) + (t.xp3||0),0);
      setState(s=>{
        const day=todayStr();
        const daily={...(s.dailyExtraXp||{})};
        const dayLog={...(daily[day]||{})};
        if(awardedXp>0) dayLog.sq=(dayLog.sq||0)+awardedXp;
        if(awardedXp>0) daily[day]=dayLog;
        return {...s,specialQuests:s.specialQuests.map(q=>q.sqid===sq.sqid?{...q,progress:newProg,completedAt:(nowComplete&&!wasComplete)?Date.now():q.completedAt}:q),
          sqCooldownUntil:(nowComplete&&!wasComplete)?next7AM():(s.sqCooldownUntil||null),
          dailyExtraXp:awardedXp>0?daily:(s.dailyExtraXp||{})};
      });
      return;
    }

    // Comportement standard : XP uniquement à la complétion totale
    if(!wasComplete&&nowComplete){
      const xpPairs = [
        {xp:sq.xp, stat:sq.stat||sqMainStat(sq)},
        sq.xp2&&sq.stat2 ? {xp:sq.xp2, stat:sq.stat2} : null,
        sq.xp3&&sq.stat3 ? {xp:sq.xp3, stat:sq.stat3} : null,
      ].filter(Boolean);
      xpPairs.forEach(p=>addXp(p.xp,p.stat,null,true));
      triggerUrgentUp(sq,xpPairs);
      tryRareDungeonKeyDrop("urgent");
    }
    const awardedXp = (!wasComplete&&nowComplete) ? [
      {xp:sq.xp, stat:sq.stat},
      sq.xp2&&sq.stat2 ? {xp:sq.xp2, stat:sq.stat2} : null,
      sq.xp3&&sq.stat3 ? {xp:sq.xp3, stat:sq.stat3} : null,
    ].filter(Boolean).reduce((sum,p)=>sum+(p.xp||0),0) : 0;
    setState(s=>{
      const day=todayStr();
      const daily={...(s.dailyExtraXp||{})};
      const dayLog={...(daily[day]||{})};
      if(awardedXp>0) dayLog.sq=(dayLog.sq||0)+awardedXp;
      if(awardedXp>0) daily[day]=dayLog;
      return {...s,specialQuests:s.specialQuests.map(q=>q.sqid===sq.sqid?{...q,progress:newProg,completedAt:(nowComplete&&!wasComplete)?Date.now():q.completedAt}:q),
        sqCooldownUntil:(nowComplete&&!wasComplete)?next7AM():(s.sqCooldownUntil||null),
        dailyExtraXp:awardedXp>0?daily:(s.dailyExtraXp||{})};
    });
  }

  function invokeExtraUrgentQuest(){
    setState(s=>{
      const t=Date.now();
      const day=todayStr();
      const inv={...(s.inventory||{})};
      if((Number(inv.rerollToken)||0)<1 || s.urgentTokenUseDay===day) return s;
      const list=s.specialQuests||[];
      const hasActive=list.some(q=>!q.completedAt&&t<(q.expiresAt||0));
      const completedToday=list.filter(q=>q.completedAt&&eventDayStr(q.completedAt)===day).sort((a,b)=>(b.completedAt||0)-(a.completedAt||0));
      if(hasActive || !completedToday.length) return s;
      const lastCompleted=completedToday[0];
      const result=pickRandomSq([lastCompleted.id],s.sqStatCycle,s.sqDrawLog,null);
      if(!result) return s;
      const {tpl,pickedStat,cycleReset}=result;
      const sq={...tpl,sqid:"sq_token_"+t,progress:0,startedAt:t,expiresAt:next7AM(t),completedAt:null,summonedByToken:true};
      const newCycle=cycleReset?[pickedStat]:[...(s.sqStatCycle||[]),pickedStat];
      inv.rerollToken=Math.max(0,(Number(inv.rerollToken)||0)-1);
      return {...s,inventory:inv,specialQuests:[...list.filter(q=>q.completedAt),sq],sqStatCycle:newCycle,sqDrawLog:appendUrgentQuestDrawLog(s.sqDrawLog,sq,t),sqCooldownUntil:next7AM(t),urgentTokenUseDay:day,lastActiveDay:day};
    });
    setItemUseUp({id:"rerollToken",summoned:true});
  }

  function launchNewSq(){
    setState(s=>{
      const result=pickRandomSq((s.specialQuests||[]).filter(q=>!q.completedAt).map(q=>q.id),s.sqStatCycle,s.sqDrawLog,s.urgentCompassStat);
      if(!result)return s;
      const {tpl,pickedStat,cycleReset,forced}=result;
      const t=Date.now();
      const sq={...tpl,sqid:"sq_"+t,progress:0,startedAt:t,expiresAt:next7AM(t),completedAt:null};
      const newCycle = forced ? [...(s.sqStatCycle||[])] : (cycleReset ? [pickedStat] : [...(s.sqStatCycle||[]),pickedStat]);
      return {...s,specialQuests:[...s.specialQuests.filter(q=>q.completedAt),sq],sqStatCycle:newCycle,sqDrawLog:appendUrgentQuestDrawLog(s.sqDrawLog,sq,t),sqCooldownUntil:next7AM(t),urgentCompassStat:forced?null:s.urgentCompassStat};
    });
  }

  function rerollSq(sq){
    if(!sq || sq.completedAt || sq.summonedByToken) return;
    const tDay=todayStr();
    if(state.sqRerollDay===tDay || (sq.progress||0)>0) return;

    setState(s=>{
      const active=(s.specialQuests||[]).find(q=>q.sqid===sq.sqid&&!q.completedAt);
      if(!active || (active.progress||0)>0 || s.sqRerollDay===tDay) return s;

      // Une quête passée par Relance compte comme consommée exactement comme une quête accomplie :
      // sa statistique reste dans le cycle courant et son ID entre dans l'historique de tirage.
      const cycleBase=[...(s.sqStatCycle||[])];
      const drawLogBeforeReroll=appendUrgentQuestDrawLog(s.sqDrawLog,active,active.startedAt||Date.now());

      const usedIds=(s.specialQuests||[]).filter(q=>!q.completedAt).map(q=>q.id).filter(Boolean);
      const result=pickRandomSq(usedIds,cycleBase,drawLogBeforeReroll);
      if(!result) return s;

      const {tpl,pickedStat,cycleReset}=result;
      const t=Date.now();
      const newSq={...tpl,sqid:"sq_"+t,progress:0,startedAt:t,expiresAt:next7AM(t),completedAt:null};
      const newCycle=cycleReset ? [pickedStat] : [...cycleBase,pickedStat];

      const id=Date.now()+Math.random();
      setFloats(f=>[...f,{id,y:"35%",txt:"↻ QUÊTE RELANCÉE"}]);
      setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),1400);

      return {
        ...s,
        specialQuests:[...(s.specialQuests||[]).filter(q=>q.completedAt),newSq],
        sqStatCycle:newCycle,
        sqDrawLog:appendUrgentQuestDrawLog(drawLogBeforeReroll,newSq,t),
        sqCooldownUntil:next7AM(t),
        sqRerollDay:tDay,
        lastActiveDay:tDay
      };
    });
  }

  function startRandomDungeon(){
    const forcedStat=STATS.includes(state.dungeonMapStat)?state.dungeonMapStat:null;
    let id=null;
    if(forcedStat){
      const candidates=DUNGEONS.filter(d=>d.stat===forcedStat);
      if(candidates.length)id=candidates[Math.floor(Math.random()*candidates.length)].id;
    }
    if(!id)id=drawRandomDungeonId(DUNGEONS);
    if(id)startDungeon(id);
  }

  function startDungeon(id,constraint=null){
    if(state.masterContractArmed && !constraint){setContractDungeonChoice(id);return;}
    setSelectedDungeonRoom(null);
    setState(s=>{
      const t=Date.now();
      const launched=launchDungeonState(s,{
        id,
        constraint,
        now:t,
        day:todayStr(t),
        week:wkStr(new Date(t)),
        dungeons:DUNGEONS,
        nextResetAt:next7AM(t),
        weekKeyForDate:wkStr
      });
      return launched!==s?{...launched,dungeonMapStat:null}:launched;
    });
  }

  function skipDungeonToday(){
    setState(s=>({...s,dungeonSkipDay:todayStr()}));
  }

  function validateDungeonRoom(roomIdxOverride=null){
    const selectedIdx = Number.isInteger(roomIdxOverride) ? roomIdxOverride : selectedDungeonRoom;
    setState(s=>{
      const ad=s.activeDungeon;
      if(!ad || ad.completedAt) return s;
      const dungeon=DUNGEONS.find(d=>d.id===ad.id);
      if(!dungeon) return {...s,activeDungeon:null};
      const t=Date.now();
      if(t>=ad.expiresAt) return s;

      if(ad.ruptureBoss){
        const rb=ad.ruptureBoss;
        const beforeXp=s.totalXp;
        const beforeStats=s.stats;
        let totalXp=s.totalXp;
        const statXp={...s.statXp};
        const stats={...s.stats};
        const ruptureRewards=[
          {xp:1350,stat:dungeon.reward.stat||dungeon.stat},
          dungeon.reward.stat2?{xp:270,stat:dungeon.reward.stat2}:null
        ].filter(Boolean);
        ruptureRewards.forEach(r=>{
          const adjusted=xpAdjustment(s,r.xp,r.stat);
          const gain=adjusted.gain;
          totalXp+=gain;
          statXp[r.stat]=(statXp[r.stat]||0)+gain;
          stats[r.stat]=getLvl(statXp[r.stat]);
        });
        const awardedXp=ruptureRewards.reduce((sum,r)=>sum+(r.xp||0),0);
        const day=todayStr();
        const daily={...(s.dailyExtraXp||{})};
        const dayLog={...(daily[day]||{})};
        dayLog.dungeon=(dayLog.dungeon||0)+awardedXp;
        daily[day]=dayLog;
        const priorRoomXp=(ad.completedRooms||[]).reduce((sum,idx)=>sum+sumXpPairs(dungeonRoomRewardPairs(dungeon,idx)),0);
        const completedAt=t;
        const rewardText=ruptureRewards.map(r=>"+"+r.xp+" XP "+(STAT_LBL[r.stat]||r.stat)).join(" · ");
        triggerProgressOverlay(beforeXp,beforeStats,totalXp,stats,300);
        setTimeout(()=>setDungeonUp({
          label:"BOSS DE RUPTURE VAINCU",short:rb.name,icon:"☠️",
          color:rb.ruptureColor||"#ef4444",reward:rewardText,
          subtitle:"Boss de Rupture · "+dungeon.short,rupture:true
        }),200);
        return {
          ...s,totalXp,statXp,stats,dailyExtraXp:daily,activeDungeon:null,
          dungeonLog:[...(s.dungeonLog||[]),{
            id:dungeon.id,runId:ad.runId,startedAt:ad.startedAt,title:dungeon.title,stat:dungeon.stat,
            xp:priorRoomXp+awardedXp,completedAt,expiresAt:ad.expiresAt,
            rupture:true,ruptureBoss:{
              id:rb.id,name:rb.name,objective:rb.objective
            }
          }],
          lastActiveDay:day
        };
      }

      const completed=Array.isArray(ad.completedRooms)?ad.completedRooms:[];
      const nextIdx=selectedIdx;
      if(!canValidateDungeonRoom(ad,dungeon,nextIdx)) return s;

      const beforeXp=s.totalXp;
      const beforeStats=s.stats;
      let totalXp=s.totalXp;
      const statXp={...s.statXp};
      const stats={...s.stats};
      const roomRewards=dungeonRoomRewardPairs(dungeon,nextIdx);
      roomRewards.forEach(r=>{
        const el=s.activeElixir;
        const bonus=elixirBonusForStat(el,r.stat,r.xp||0,Date.now());
        const gain=(r.xp||0)+bonus;
        totalXp+=gain;
        statXp[r.stat]=(statXp[r.stat]||0)+gain;
        stats[r.stat]=getLvl(statXp[r.stat]);
      });
      const awardedXp = roomRewards.reduce((sum,r)=>sum+(r.xp||0),0);
      const day=todayStr();
      const daily={...(s.dailyExtraXp||{})};
      const dayLog={...(daily[day]||{})};
      if(awardedXp>0) dayLog.dungeon=(dayLog.dungeon||0)+awardedXp;
      if(awardedXp>0) daily[day]=dayLog;

      const nextCompleted=[...completed,nextIdx].sort((a,b)=>a-b);
      const isComplete=nextCompleted.length>=dungeon.rooms.length;
      setSelectedDungeonRoom(null);
      triggerProgressOverlay(beforeXp,beforeStats,totalXp,stats,300);

      if(!isComplete){
        return {...s,totalXp,statXp,stats,dailyExtraXp:daily,activeDungeon:{...ad,completedRooms:nextCompleted},lastActiveDay:todayStr()};
      }

      const completedAt=t;
      const rewards=dungeonRewardPairs(dungeon);
      const contractBonusPairs=ad.contractConstraint?rewards.map(r=>({stat:r.stat,xp:Math.round(r.xp*.20)})):[];
      contractBonusPairs.forEach(r=>{totalXp+=r.xp;statXp[r.stat]=(statXp[r.stat]||0)+r.xp;stats[r.stat]=getLvl(statXp[r.stat]);});
      const rewardText=rewards.map(r=>"+"+r.xp+" XP "+(STAT_LBL[r.stat]||r.stat)).join(" · ")+(ad.contractConstraint?" · CONTRAT +20 %":"");
      setTimeout(()=>{
        setDungeonUp({title:dungeon.title,short:dungeon.short,icon:dungeon.icon,color:dungeon.color,reward:rewardText});
        tryDungeonItemDrops(dungeon.id);
      },200);
      return {...s,totalXp,statXp,stats,dailyExtraXp:daily,activeDungeon:null,dungeonLog:[...(s.dungeonLog||[]),{id:dungeon.id,title:dungeon.title,stat:dungeon.stat,xp:rewards.reduce((a,r)=>a+(r.xp||0),0)+contractBonusPairs.reduce((a,r)=>a+(r.xp||0),0),completedAt,expiresAt:ad.expiresAt||completedAt+86400000}],lastActiveDay:todayStr()};
    });
  }

  function fmtCD(ms){
    const d=Math.floor(ms/86400000),hh=Math.floor((ms%86400000)/3600000),mm=Math.floor((ms%3600000)/60000);
    if(d>0)return d+"j "+hh+"h"; if(hh>0)return hh+"h "+mm+"min"; return mm+"min";
  }


function questBadgeStyle(color, filled=false, extra=""){
  return "display:inline-flex;align-items:center;justify-content:center;height:13px;min-width:34px;padding:0 4px;border-radius:3px;font-family:Orbitron,sans-serif;font-size:7.5px;font-weight:700;letter-spacing:0.65px;line-height:1;border:1px solid "+color+"55;color:"+color+";background:"+(filled?color+"22":"transparent")+";flex-shrink:0;white-space:nowrap;"+extra;
}
function QuestBadge({label,color,filled=false,extra=""}){
  return h("span",{style:questBadgeStyle(color,filled,extra)},label);
}
const WEEKLY_BADGE_COLOR = "#818cf8";
const BONUS_BADGE_COLOR = "#fbbf24";

  // ─── SOUS-COMPOSANTS ──────────────────────────────────────────────────

  function QI({obj}){
    const isWeekly = obj.weekly;
    const t = getEffectiveTarget(obj.id, isWeekly);
    // Si obj.target est défini sans binary, on l'utilise pour l'affichage (ex: protein 1/2 → 2/2)
    const displayTarget = (obj.target && !obj.binary) ? obj.target : t;
    const d = isWeekly ? (wLog[obj.id]||0) : (tLog[obj.id]||0);

    const effectiveT = t;
    const done=obj.binary?(d>=1):(d>=effectiveT);


    // Quêtes binaires : boutons Échec / Succès
    if(obj.binary){
      function setBinary(val,e){
        const curRaw=(obj.weekly)?wLog[obj.id]:tLog[obj.id];
        const cur=curRaw||0;
        const wasD=cur>=1;
        const xp=(!wasD&&val>=1)?obj.binaryXp:0;
        const cx=e?e.clientX:200, cy=e?e.clientY:300;
        setState(s=>{
          const d2={...s.dailyLog};
          d2[today]={...(d2[today]||{}),[obj.id]:val};
          let next={...s,dailyLog:d2,lastActiveDay:todayStr()};

          return next;
        });

        if(xp>0){
          const id=Date.now()+Math.random();
          setFloats(f=>[...f,{id,x:cx,y:cy,txt:"+"+xp+" XP "+(STAT_LBL[obj.stat]||obj.stat)}]);
          setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),1300);
          setState(s=>{
            const sx={...s.statXp,[obj.stat]:(s.statXp[obj.stat]||0)+xp};
            const st={...s.stats,[obj.stat]:getLvl(sx[obj.stat])};
            const nt=s.totalXp+xp;
            triggerProgressOverlay(s.totalXp,s.stats,nt,st,100);
            return {...s,totalXp:nt,statXp:sx,stats:st,lastActiveDay:todayStr()};
          });
        }
      }
      const validated = tLog[obj.id] !== undefined;
      const failFlex = validated && !done ? 3 : 1;
      const succFlex = validated && done ? 3 : 1;
      return h("div",{class:"qi "+(done?"done":"")},
        h("div",{class:"qhdr",style:"align-items:center",style:"display:flex;justify-content:space-between;align-items:flex-start;gap:5px"},
          h("div",{class:"qname",style:"align-items:center;gap:8px",style:"flex:1;min-width:0;display:flex;align-items:center;gap:7px;line-height:1.25;white-space:normal;overflow:visible;min-height:18px"},QuestIcon(obj.id,obj.icon,14,"width:18px;height:18px;margin-top:0"),h("span",{style:"line-height:1.25;white-space:normal;overflow:visible;text-overflow:clip;display:inline-flex;align-items:center;min-height:18px"},obj.name)),
          h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:0.5px;text-align:right;white-space:nowrap;flex-shrink:0;line-height:1.25;padding-top:0"},
            (obj.binaryXp+" XP · "+(STAT_LBL[obj.stat]||obj.stat))
          )
        ),
        h("div",{style:"display:flex;gap:8px;margin-top:8px"},
          h("button",{
            onClick:e=>setBinary(0,e),
            style:"flex:"+failFlex+";padding:"+(validated&&done?"6px 4px":"10px")+";border-radius:8px;border:1px solid "+(validated&&!done?"var(--rc)":"rgba(255,255,255,0.08)")+";background:rgba(255,255,255,0.02);color:"+(validated&&!done?"#ef4444":"rgba(255,255,255,0.25)")+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s;white-space:nowrap;overflow:hidden"
          },"✘ Échec"),
          h("button",{
            onClick:e=>setBinary(1,e),
            style:"flex:"+succFlex+";padding:"+(validated&&!done?"6px 4px":"10px")+";border-radius:8px;border:1px solid "+(validated&&done?"var(--rc)":"rgba(255,255,255,0.08)")+";background:"+(validated&&done?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.02)")+";color:"+(validated&&done?"#4ade80":"rgba(255,255,255,0.25)")+";font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s;white-space:nowrap;overflow:hidden"
          },"Succès ✓")
        ),

      );
    }

    const pct=(d/displayTarget)*100, over=d>displayTarget;
    const rankColor = rank.color || "#9ca3af";
    const isCapped = false;
    let barColor = rankColor;
    // Barre alignée sur Historique :
    // en cours = hachurée, complétée = pleine, dépassée = pleine + glow
    const fillStateClass = isCapped || over
      ? " over"
      : (d>=effectiveT&&effectiveT>0)
        ? " done"
        : (pct>0 ? " partial" : "");
    const barInnerStyle = "width:"+(isCapped?100:Math.min(100,pct))+"%";
    return h("div",{class:"qi "+(d>=effectiveT&&effectiveT>0?"done":"")},
      h("div",{class:"qhdr",style:"align-items:center",style:"display:flex;justify-content:space-between;align-items:flex-start;gap:8px"},
        h("div",{class:"qname",style:"align-items:center;gap:8px",style:"flex:1;min-width:0;display:flex;align-items:center;gap:8px;white-space:normal;overflow:visible;line-height:1.25;min-height:18px;flex-wrap:wrap"},
          QuestIcon(obj.id,obj.icon,14,"width:18px;height:18px;margin-top:0;line-height:1"),
          h("span",{style:"white-space:normal;overflow:visible;text-overflow:clip;line-height:1.25;word-break:normal;display:inline-flex;align-items:center;min-height:18px"},obj.name),
          isWeekly&&h(QuestBadge,{label:"HEBDO",color:WEEKLY_BADGE_COLOR}),
        ),
        h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:0.5px;text-align:right;white-space:nowrap;flex-shrink:0;line-height:1.25;align-self:flex-start;padding-top:0"},
          obj.tiers
            ?h(Fragment,null,
                ...obj.tiers.map((tier,i)=>{
                  const primaryStat = STAT_LBL[tier.stat]||tier.stat;
                  const secondaryStat = tier.stat2 ? (STAT_LBL[tier.stat2]||tier.stat2) : null;
                  const thirdStat = tier.stat3 ? (STAT_LBL[tier.stat3]||tier.stat3) : null;
                  let rewardText = tier.xp+" XP · "+primaryStat;
                  if(tier.xp2 && tier.stat2){
                    rewardText += tier.xp2===tier.xp ? " + "+secondaryStat : " + "+tier.xp2+" XP · "+secondaryStat;
                  }
                  if(tier.xp3 && tier.stat3){
                    rewardText += tier.xp3===tier.xp ? " + "+thirdStat : " + "+tier.xp3+" XP · "+thirdStat;
                  }
                  return h("div",{key:i,style:"opacity:"+(d>=tier.at?"1":"0.6")+";white-space:nowrap"},(d>=tier.at?"\u2713 ":"")+rewardText);
                }),
                obj.overGoalXpPer&&h("div",{style:"opacity:"+(d>(obj.target||obj.base||0)?"1":"0.6")+";white-space:nowrap"},"+"+obj.overGoalXpPer+" XP/"+obj.unit+" au-delà")
              )
            :obj.binary
              ?(obj.binaryXp+" XP · "+(STAT_LBL[obj.stat]||obj.stat))
              :obj.stat2
                ?h(Fragment,null,
                    h("div",null,obj.xpPer+" XP/"+obj.unit+" · "+(STAT_LBL[obj.stat]||obj.stat)),
                    h("div",null,(obj.xpPer2||obj.xpPer)+" XP/"+obj.unit+" · "+(STAT_LBL[obj.stat2]||obj.stat2))
                  )
                :(obj.xpPer+" XP/"+obj.unit+" · "+(STAT_LBL[obj.stat]||obj.stat))
        )
      ),
      h("div",{class:"qrow"},
        h(Fragment,null,
            h("div",{class:"qbar"},h("div",{class:"qfill"+fillStateClass,style:barInnerStyle})),
            h("div",{class:"qxp",style:"white-space:nowrap;min-width:82px;text-align:right;flex-shrink:0"},fmtNum(d)+"/"+fmtNum(displayTarget)+" "+((d>1||displayTarget>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres",repas:"repas",contact:"contacts",action:"actions"}[obj.unit]||obj.unit))
          )
      ),
      (!obj.optional&&!obj.weekly&&isDebtEligibleQuest(obj)&&d<effectiveT&&state.questDebt&&state.questDebt.status==="active"&&state.questDebt.id===obj.id)&&h("div",{style:"margin-top:8px;font-family:Orbitron,sans-serif;font-size:9px;color:#f59e0b;letter-spacing:.8px;text-transform:uppercase"},"Dette active : "+fmtNum(state.questDebt.paid||0)+"/"+fmtNum(state.questDebt.amount)+" "+state.questDebt.unit),
      (()=>{
        // Repas sans stimulation : un seul bouton +1 repas
        if(obj.id==="sp_mealnostim"){
          const isMax = d >= (obj.target||2);
          if(isMax) return null;
          return h("div",{style:"display:flex;gap:8px;margin-top:8px"},
            h("button",{
              onClick:e=>{inputs.current[obj.id]="1";validate(obj,e);},
              style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s"
            },"+1 repas")
          );
        }
        // Quête avec tiers (ex: protein x/2) : bouton unique +1 unité
        if(obj.tiers && obj.tiers.length>0){
          const isMax = !obj.overGoalXpPer && d >= (obj.target||obj.tiers[obj.tiers.length-1].at);
          if(isMax) return null;
          const isLhh = obj.id==="lhh_contacts" || obj.id==="lhh_actions";
          const unitSing = obj.unit;
          const unitPlur = ({contact:"contacts",action:"actions"}[obj.unit]||obj.unit);
          return h("div",{style:"display:flex;gap:8px;margin-top:8px"},
            h("button",{
              onClick:e=>{inputs.current[obj.id]="1";validate(obj,e);},
              style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s"
            },"+1 "+unitSing),
            isLhh&&h("button",{
              onClick:e=>{inputs.current[obj.id]="10";validate(obj,e);},
              style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s"
            },"+10 "+unitPlur)
          );
        }
        const QUICK_IDS=["sleep","push","abs","squats","negative_pullups","calves","reading","flex","balance","grips","med","water","mob"];
        const unitLabel={sleep:"h",push:obj.unit,abs:obj.unit,squats:obj.unit,negative_pullups:"rep",calves:obj.unit,reading:"min",flex:"min",balance:"min",grips:"min",med:"min",water:"verre",mob:"min"};
        const unitLabelPlural={sleep:"h",push:obj.unit==="rep"?"reps":obj.unit,abs:obj.unit==="rep"?"reps":obj.unit,squats:obj.unit==="rep"?"reps":obj.unit,negative_pullups:"reps",calves:"reps",reading:"min",flex:"min",balance:"min",grips:"min",med:"min",water:"verres",mob:"min"};
        if(QUICK_IDS.includes(obj.id)){
          const lbl=unitLabel[obj.id]||obj.unit;
          const lblPl=unitLabelPlural[obj.id]||obj.unit;
          const isWater=obj.id==="water";
          const isSleep=obj.id==="sleep";
          const quickAmount=isSleep?8:10;
          return h("div",{style:"display:flex;gap:8px;margin-top:8px"},
            h("button",{
              onClick:e=>{inputs.current[obj.id]="1";validate(obj,e);},
              style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s"
            },"+1 "+lbl+(isWater?" \uD83D\uDCA7":"")),
            !isWater&&h("button",{
              onClick:e=>{inputs.current[obj.id]=String(quickAmount);validate(obj,e);},
              style:"flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);color:rgba(255,255,255,0.7);font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px;transition:all .2s"
            },"+"+quickAmount+" "+lblPl)
          );
        }
        return h("div",{class:"qinrow"},
          h("input",{class:"qin",type:"text",inputMode:"decimal",placeholder:"+ "+obj.unit,id:"qi_"+obj.id,onInput:ev=>{inputs.current[obj.id]=ev.target.value;}}),
          h("button",{class:"qbtn",onClick:e=>{
            const el=document.getElementById("qi_"+obj.id);
            if(el)inputs.current[obj.id]=el.value;
            validate(obj,e);
            if(el)el.value="";
          }},"+XP")
        );
      })()
    );
  }

  function RR({obj,isW}){
    const isWeeklyRow = isW || obj.weekly;
    const t=getEffectiveTarget(obj.id), d=isWeeklyRow?(wLog[obj.id]||0):(tLog[obj.id]||0);
    const displayTarget = (obj.target && !obj.binary) ? obj.target : t;
    const pct=Math.min(100,(d/displayTarget)*100), done=d>=displayTarget, over=d>displayTarget;
    const validated=isWeeklyRow?(wLog[obj.id]!==undefined):(tLog[obj.id]!==undefined);
    if(obj.binary){
      return h("div",{style:"display:flex;align-items:center;gap:8px;margin-bottom:8px"},
        QuestIcon(obj.id,obj.icon,14),
        h("div",{style:"flex:1"},
          h("div",{style:"font-size:12px;color:var(--tx);display:flex;justify-content:space-between;align-items:center"},
            h("span",null,obj.name),
            h("div",{style:"display:flex;align-items:center;gap:6px"},
              validated
                ?h("span",{style:"font-family:Orbitron,sans-serif;font-size:11px;font-weight:700;color:"+(done?"#4ade80":"#ef4444")},done?"Succ\u00e8s":"\u00c9chec")
                :h("span",{style:"font-size:10px;color:var(--td)"},""),
              h("span",{style:"font-family:Orbitron,sans-serif;font-size:11px;font-weight:700;width:10px;text-align:center;color:"+(done?"#4ade80":"#ef4444")},validated?(done?"\u2713":"\u2718"):"")
            )
          )
        )
      );
    }
    const isCapped = false;
    const rankColor = rank.color || "#9ca3af";
    // Barre alignée sur Historique :
    // en cours = hachurée, complétée = pleine, dépassée = pleine + glow
    const fillStateClass = isCapped || over
      ? " over"
      : (done ? " done" : (pct>0 ? " partial" : ""));
    const barInnerStyle = "width:"+(isCapped?100:Math.min(100,pct))+"%";
    return h("div",{style:"display:flex;align-items:center;gap:8px;margin-bottom:8px"},
      QuestIcon(obj.id,obj.icon,14),
      h("div",{style:"flex:1"},
        h("div",{style:"font-size:12px;color:var(--tx);margin-bottom:3px;display:flex;justify-content:space-between;align-items:center"},
          h("div",{style:"display:flex;align-items:flex-start;gap:6px;min-width:0;flex:1;white-space:normal;line-height:1.25"},
            h("span",{style:"white-space:normal;line-height:1.25;word-break:normal"},obj.name),
            (obj.weekly)&&h(QuestBadge,{label:"HEBDO",color:WEEKLY_BADGE_COLOR}),
          ),
          h("div",{style:"display:flex;align-items:center;gap:6px"},
            h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:"+(d>=displayTarget?"var(--rc)":d>0?"var(--tx)":"var(--td)")},fmtNum(d)+"/"+fmtNum(displayTarget)+" "+((d>1||displayTarget>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres",repas:"repas",contact:"contacts",action:"actions"}[obj.unit]||obj.unit)),
            h("span",{style:"font-family:Orbitron,sans-serif;font-size:11px;font-weight:700;color:#4ade80;width:10px;text-align:center"},done?"\u2713":"")
          )
        ),
        h("div",{class:"qbar"},h("div",{class:"qfill"+fillStateClass,style:barInnerStyle}))
      )
    );
  }

  function UrgentHomeRow({sq}){
    const target=Math.max(1,Number(sq.target)||1);
    const progress=Math.max(0,Number(sq.progress)||0);
    const pct=Math.min(100,(progress/target)*100);
    const done=progress>=target;
    const over=progress>target;
    const fillStateClass=over ? " over" : (done ? " done" : (pct>0 ? " partial" : ""));
    const unit=((progress>1||target>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres",repas:"repas",contact:"contacts",action:"actions"}[sq.unit])||sq.unit;
    const progressText=fmtNum(progress)+"/"+fmtNum(target)+(sq.compactUnit?"":" ")+(unit||"");
    return h("div",{style:"display:flex;align-items:center;gap:8px;margin-bottom:0"},
      QuestIcon(sq.id,sq.icon,14),
      h("div",{style:"flex:1"},
        h("div",{style:"font-size:12px;color:var(--tx);margin-bottom:3px;display:flex;justify-content:space-between;align-items:center;gap:8px"},
          h("span",{style:"white-space:normal;line-height:1.25;word-break:normal;min-width:0"},sq.name),
          h("div",{style:"display:flex;align-items:center;gap:6px"},
            h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:"+(done?"var(--rc)":progress>0?"var(--tx)":"var(--td)")+";white-space:nowrap;flex-shrink:0"},progressText),
            h("span",{style:"width:10px;flex-shrink:0"},"")
          )
        ),
        h("div",{class:"qbar"},h("div",{class:"qfill"+fillStateClass,style:
          done
            ? "width:"+pct+"%;background:linear-gradient(90deg,#991b1b,#ef4444)"
            : (pct>0
              ? "width:"+pct+"%;background-image:repeating-linear-gradient(-45deg,transparent,transparent 4px,#ef4444 4px,#ef4444 8px);background-size:11.31px 11.31px;opacity:0.8"
              : "width:"+pct+"%;background:linear-gradient(90deg,#991b1b,#ef4444)")
        }))
      )
    );
  }

  function EnduranceChoiceItem({mode="quest"}={}){
    if(selectedEnduranceQuest){
      return mode==="home"
        ? h(RR,{obj:selectedEnduranceQuest,isW:false})
        : h(QI,{obj:selectedEnduranceQuest});
    }
    const color=STAT_COLOR.Endurance||"#22d3ee";
    const buttonStyle="flex:1;min-width:0;min-height:38px;padding:0 8px;border-radius:9px;border:1px solid "+color+"55;background:"+color+"0d;color:"+color+";font-family:Orbitron,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;line-height:1.2";
    return h("div",{class:"qi",style:"padding-bottom:10px"},
      h("div",{class:"qhdr",style:"display:flex;justify-content:space-between;align-items:flex-start;gap:8px"},
        h("div",{class:"qname",style:"flex:1;min-width:0;display:flex;align-items:center;gap:8px;line-height:1.25"},
          QuestIcon("endurance_choice","🏃🏻",14,"width:18px;height:18px"),
          h("span",null,"Running ou Rando")
        ),
        h(QuestBadge,{label:"CHOIX",color})
      ),
      h("div",{style:"display:flex;gap:8px;margin-top:10px"},
        h("button",{onClick:()=>chooseEnduranceQuest("run"),style:buttonStyle},
          h("span",{style:"font-size:15px"},"🏃🏻"),
          h("span",{style:"font-size:10px;font-weight:800;letter-spacing:.7px"},"Running")
        ),
        h("button",{onClick:()=>chooseEnduranceQuest("walk"),style:buttonStyle},
          h("span",{style:"font-size:15px"},"🥾"),
          h("span",{style:"font-size:10px;font-weight:800;letter-spacing:.7px"},"Rando")
        )
      )
    );
  }

  function sqMainStat(sq){
    if(sq&&sq.stat) return sq.stat;
    const map=activeSpecialQuestMap();
    return (sq&&sq.id&&map[sq.id]&&map[sq.id].stat) || null;
  }

  function rewardLineText(item){
    const safeStat = item.stat || (item.id ? sqMainStat(item) : null);
    const primaryStat = STAT_LBL[safeStat] || safeStat || "";
    const secondaryStat = item.stat2 ? (STAT_LBL[item.stat2] || item.stat2) : null;
    const thirdStat = item.stat3 ? (STAT_LBL[item.stat3] || item.stat3) : null;
    let rewardText = (item.xp||0)+" XP · "+primaryStat;
    if(item.xp2 && item.stat2){
      rewardText += item.xp2===(item.xp||0) ? " + "+secondaryStat : " + "+item.xp2+" XP · "+secondaryStat;
    }
    if(item.xp3 && item.stat3){
      rewardText += item.xp3===(item.xp||0) ? " + "+thirdStat : " + "+item.xp3+" XP · "+thirdStat;
    }
    return rewardText;
  }

  function questRewardText(xp,stat,binary,target,unit){
    const label=STAT_LBL[stat]||stat||"";
    if(binary)return fmtNum(xp||0)+" XP · "+label;
    const perUnit=(Number(xp)||0)/Math.max(1,Number(target)||1);
    return fmtNum(perUnit)+" XP/"+unit+" · "+label;
  }

  function sqRewardLines(sq){
    if(sq?.tiers && sq.tiers.length>0){
      return sq.tiers.map((tier,i)=>({
        key:"tier_"+i,
        at:tier.at,
        text:rewardLineText(tier)
      }));
    }
    return [
      sq?.xp ? {key:"xp1", text:questRewardText(sq.xp,sq.stat||sqMainStat(sq),sq.binary,sq.target,sq.unit)} : null,
      sq?.xp2&&sq?.stat2 ? {key:"xp2", text:questRewardText(sq.xp2,sq.stat2,sq.binary,sq.target,sq.unit)} : null,
      sq?.xp3&&sq?.stat3 ? {key:"xp3", text:questRewardText(sq.xp3,sq.stat3,sq.binary,sq.target,sq.unit)} : null,
    ].filter(Boolean);
  }

  function sqRewardSummary(sq){
    return sqRewardLines(sq).map(l=>l.text).join(" ");
  }

  function SqCard({sq,showInput}){
    const remaining=sq.expiresAt-now;
    const urgent=remaining<86400000&&!sq.completedAt;
    const pct=Math.min(100,(sq.progress/sq.target)*100);
    const done=sq.progress>=sq.target;

    // Helper : liste les paires (xp, stat) actives sur cette quête (1, 2 ou 3)
    const xpPairs = [
      {xp:sq.xp, stat:sqMainStat(sq)},
      sq.xp2&&sq.stat2 ? {xp:sq.xp2, stat:sq.stat2} : null,
      sq.xp3&&sq.stat3 ? {xp:sq.xp3, stat:sq.stat3} : null,
    ].filter(Boolean);

    function completeBinary(val,e){
      if(sq.progress>=sq.target)return;
      const nowComplete=val>=1;
      const awardedXp = nowComplete ? xpPairs.reduce((sum,p)=>sum+(p.xp||0),0) : 0;
      if(nowComplete){
        triggerUrgentUp(sq,xpPairs);
        xpPairs.forEach(p=>addXp(p.xp,p.stat,null,true));
        tryRareDungeonKeyDrop("urgent");
      }
      setState(s=>{
        const day=todayStr();
        const daily={...(s.dailyExtraXp||{})};
        const dayLog={...(daily[day]||{})};
        if(awardedXp>0) dayLog.sq=(dayLog.sq||0)+awardedXp;
        if(awardedXp>0) daily[day]=dayLog;
        return {...s,specialQuests:s.specialQuests.map(q=>q.sqid===sq.sqid
          ?{...q,progress:nowComplete?(sq.target||1):val,completedAt:nowComplete?Date.now():q.completedAt}:q),
          sqCooldownUntil:nowComplete?next7AM():(s.sqCooldownUntil||null),
          dailyExtraXp:awardedXp>0?daily:(s.dailyExtraXp||{})};
      });
    }

    const tier = sq.tier || "majeure";
    const tierColor = SQ_TIER_COLOR[tier] || "#f59e0b";

    const progressText = sq.progress+"/"+sq.target+(sq.compactUnit?"":" ")+sq.unit;
    const sqFillStyle = done
      ? "width:"+pct+"%;background:linear-gradient(90deg,#991b1b,#ef4444)"
      : (pct>0
        ? "width:"+pct+"%;background-image:repeating-linear-gradient(-45deg,transparent,transparent 4px,#ef4444 4px,#ef4444 8px);background-size:11.31px 11.31px;opacity:0.8"
        : "width:"+pct+"%;background:linear-gradient(90deg,#991b1b,#ef4444)");

    return h("div",{class:"sqcard"+(urgent?" sq-urgent":"")},
      h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;gap:8px"},
        h("div",{style:"display:flex;align-items:center;gap:8px;min-width:0"},
          QuestIcon(sq.id,sq.icon,14,"line-height:1.1;min-width:24px;text-align:center"),
          h("div",{style:"min-width:0;flex:1"},
            h("div",{style:"font-size:13px;font-weight:700;color:var(--tx);line-height:1.25"},sq.name),
            showInput&&sq.desc&&h("div",{style:"font-size:10px;color:var(--td);line-height:1.35;margin-top:3px;white-space:normal"},sq.desc)
          )
        ),
        showInput
          ? h("div",{style:"text-align:right;flex-shrink:0"},
              sqRewardLines(sq).map(line=>h("div",{
                key:line.key,
                style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;line-height:1.25;white-space:nowrap;opacity:"+((line.at&&sq.progress>=line.at)?"1":"0.65")
              },(line.at&&sq.progress>=line.at?"\u2713 ":"")+line.text))
            )
          : h("div",{class:"qxp",style:"font-size:11px;color:"+(done?"#4ade80":"var(--td)")+";font-family:Orbitron,sans-serif;letter-spacing:0.5px;text-align:right;white-space:nowrap;flex-shrink:0;line-height:1.25;padding-top:0;min-width:82px"},progressText)
      ),
      showInput
        ? h("div",{class:"qrow",style:"align-items:center;margin-top:6px"},
            h("div",{class:"qbar"},h("div",{class:"qfill"+(done?" done":pct>0?" partial":""),style:sqFillStyle})),
            h("div",{class:"qxp",style:"color:"+(done?"#4ade80":"#ef4444")+";white-space:nowrap;min-width:82px;text-align:right;flex-shrink:0"},progressText)
          )
        : h("div",{class:"qrow",style:"align-items:center;margin-top:6px"},
            h("div",{class:"qbar"},h("div",{class:"qfill"+(done?" done":pct>0?" partial":""),style:sqFillStyle}))
          ),
      !done&&h("div",{style:"font-size:10px;color:"+(urgent?"#ef4444":"#ef4444bb")+";font-family:Orbitron,sans-serif;margin-top:4px;text-align:"+(showInput?"left":"right")},"\u23F1 "+fmtCD(remaining)+" restants"),
      showInput&&!done&&!sqRerollUsed&&(sq.progress||0)<=0&&h("div",{style:"margin-top:8px"},
        h("button",{
          disabled:sq.summonedByToken,
          onClick:()=>setConfirmRerollSq(sq),
          style:"width:100%;padding:9px;border-radius:8px;border:1px solid "+(sq.summonedByToken ? "rgba(255,255,255,0.08)" : "#f59e0b66")+";background:"+(sq.summonedByToken ? "rgba(255,255,255,0.02)" : "rgba(245,158,11,0.06)")+";color:"+(sq.summonedByToken ? "var(--td)" : "#f59e0b")+";font-family:Orbitron,sans-serif;font-size:10px;cursor:"+(sq.summonedByToken ? "default" : "pointer")+";letter-spacing:1px;text-transform:uppercase;opacity:"+(sq.summonedByToken ? ".65" : "1")
        },
          sq.summonedByToken ? "Relance indisponible pour une quête invoquée" : "↻ Relancer la quête (1/jour)"
        )
      ),
      showInput&&!done&&(
        sq.binary
          ?h("div",{style:"display:flex;gap:8px;margin-top:8px"},
              h("button",{onClick:e=>completeBinary(1,e),style:"flex:1;padding:10px;border-radius:8px;border:1px solid #4ade8044;background:rgba(255,255,255,0.03);color:#4ade80;font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px"},"Succ\u00e8s \u2713")
            )
          :sq.unit==="km"
            ?h("div",{class:"qinrow",style:"margin-top:8px"},
                h("input",{id:"sqi_"+sq.sqid,class:"qin",type:"text",inputMode:"decimal",placeholder:"+ km",style:"border-color:#ef444466"}),
                h("button",{class:"qbtn",style:"border-color:#ef444466;color:#ef4444",onClick:e=>progressSq(sq,e)},"+XP")
              )
          :h("div",{style:"display:flex;gap:8px;margin-top:8px"},
              h("button",{onClick:e=>progressSq(sq,e,1),style:"flex:1;padding:10px;border-radius:8px;border:1px solid #ef444466;background:rgba(255,255,255,0.03);color:#ef4444;font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px"},"+1 "+sq.unit),
              h("button",{onClick:e=>progressSq(sq,e,sq.step||10),style:"flex:1;padding:10px;border-radius:8px;border:1px solid #ef444466;background:rgba(255,255,255,0.03);color:#ef4444;font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px"},"+"+(sq.step||10)+" "+sq.unit)
            )
      ),
      done&&showInput&&h("div",{style:"text-align:center;padding:8px 0;font-size:12px;color:#4ade80;font-family:Orbitron,sans-serif"},"\u2705 Compl\u00e9t\u00e9e !")
    );
  }

  function BreachCard({compact=false}={}){
    const b=activeBreach;if(!b)return null;
    const remaining=Math.max(0,b.expiresAt-now);
    const isRupture=!!b.ruptureBoss;
    const rupture=b.ruptureBoss;
    const guards=isRupture&&Array.isArray(rupture.guards)?rupture.guards:[];
    const target=Math.max(1,Number(b.target)||1);
    const mainProgress=Math.max(0,Math.min(target,Number(b.progress)||0));
    const mainDone=mainProgress>=target;
    const guardFraction=g=>Math.min(1,(Number(g.progress)||0)/Math.max(1,Number(g.target)||1));
    const guardDone=g=>guardFraction(g)>=1;
    const guardDoneCount=guards.filter(guardDone).length;
    const ruptureComplete=isRupture&&mainDone&&guards.length===3&&guardDoneCount===guards.length;
    const pct=isRupture
      ? Math.min(100,((mainProgress/target)+guards.reduce((sum,g)=>sum+guardFraction(g),0))/Math.max(1,1+guards.length)*100)
      : Math.min(100,(mainProgress/target)*100);
    const pairs=[{xp:b.xp,stat:b.stat},b.xp2&&b.stat2?{xp:b.xp2,stat:b.stat2}:null].filter(Boolean);

    const finish=()=>{
      const current=state.activeBreach;
      if(!current||current.breachId!==b.breachId||completedBreachRef.current===b.breachId)return;
      if(current.ruptureBoss){
        const currentTarget=Math.max(1,Number(current.target)||1);
        const currentMainDone=(Number(current.progress)||0)>=currentTarget;
        const currentGuards=Array.isArray(current.ruptureBoss.guards)?current.ruptureBoss.guards:[];
        const currentGuardsDone=currentGuards.length===3&&currentGuards.every(g=>(Number(g.progress)||0)>=Math.max(1,Number(g.target)||1));
        if(!currentMainDone||!currentGuardsDone)return;
      }
      const allied=!!current.alliedTeleport;
      completedBreachRef.current=b.breachId;
      pairs.forEach(p=>addXp(p.xp,p.stat,null,true));
      triggerUrgentUp({...b,name:isRupture?rupture.name:b.name,isBreach:true,isRupture,forceBreachClosed:allied},pairs);
      setState(s=>{
        if(!s.activeBreach||s.activeBreach.breachId!==b.breachId)return s;
        const day=todayStr(),daily={...(s.dailyExtraXp||{})},row={...(daily[day]||{})};
        row.breach=(row.breach||0)+pairs.reduce((sum,p)=>sum+(p.xp||0),0);daily[day]=row;
        return {
          ...s,
          activeBreach:null,
          dailyExtraXp:daily,
          alliedGiftPending:allied?{breachId:b.breachId,breachName:b.name,createdAt:Date.now()}:s.alliedGiftPending
        };
      });
      awardRandomBreachLoot();
    };

    const addMain=n=>{
      const next=Math.min(target,mainProgress+n);
      setState(s=>s.activeBreach&&s.activeBreach.breachId===b.breachId
        ? {...s,activeBreach:{...s.activeBreach,progress:next}}
        : s
      );
      if(!isRupture&&next>=target)setTimeout(finish,0);
    };

    const completeMain=()=>{
      if(!isRupture){finish();return;}
      setState(s=>s.activeBreach&&s.activeBreach.breachId===b.breachId
        ? {...s,activeBreach:{...s.activeBreach,progress:target}}
        : s
      );
    };

    const updateGuard=(guardId,amount,complete=false)=>{
      setState(s=>{
        const current=s.activeBreach;
        if(!current||current.breachId!==b.breachId||!current.ruptureBoss)return s;
        const nextGuards=(current.ruptureBoss.guards||[]).map(g=>{
          if(g.id!==guardId)return g;
          const guardTarget=Math.max(1,Number(g.target)||1);
          const next=complete?guardTarget:Math.min(guardTarget,(Number(g.progress)||0)+amount);
          return {...g,progress:next};
        });
        return {...s,activeBreach:{...current,ruptureBoss:{...current.ruptureBoss,guards:nextGuards}}};
      });
    };

    const mainProgressText=b.binary
      ? (mainDone?"OBJECTIF DU BOSS VALIDÉ":"OBJECTIF DU BOSS À ACCOMPLIR")
      : fmtNum(mainProgress)+"/"+target+" "+b.unit;
    const progressText=isRupture
      ? "Boss "+(mainDone?"✓":Math.round((mainProgress/target)*100)+" %")+" · Garde "+guardDoneCount+"/"+guards.length
      : (b.binary?"À accomplir":fmtNum(mainProgress)+"/"+target+" "+b.unit);

    const standardButtonStyle="flex:1;padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,.38);background:rgba(255,255,255,.05);color:#fff;font-family:Orbitron,sans-serif;font-size:9px;cursor:pointer";

    return h("div",{class:"card sq-urgent",style:"position:relative;overflow:hidden;border-color:#8dbbff;background:linear-gradient(145deg,#07162f,#102e5c);box-shadow:0 0 18px rgba(141,187,255,.32),inset 0 0 24px rgba(255,255,255,.035)"},
      [["top:-10px;left:8px"],["top:-10px;right:8px"],["bottom:-11px;left:10px"],["bottom:-11px;right:10px"]].map((p,i)=>h("span",{key:i,style:"position:absolute;"+p[0]+";color:#fff;font-size:17px;filter:drop-shadow(0 0 7px #fff);pointer-events:none"},"⚡")),
      h("div",{style:"position:relative;z-index:2"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:9px"},
          h("div",{class:"ctitle",style:"margin:0;color:"+(isRupture?(rupture.ruptureColor||"#ef4444"):"#dbeafe")+";text-shadow:0 0 10px rgba(255,255,255,.55)"},b.alliedTeleport?(isRupture?"BRÈCHE ALLIÉE EN RUPTURE":"BRÈCHE ALLIÉE"):(isRupture?"BRÈCHE EN RUPTURE":"BRÈCHE")),
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:#fff;border:1px solid rgba(255,255,255,.45);border-radius:999px;padding:4px 7px;white-space:nowrap"},"⏱ "+fmtCD(remaining))
        ),
        h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:10px"},
          h("div",{style:"display:flex;align-items:center;gap:9px;min-width:0"},
            QuestIcon(b.id,isRupture?"☠️":b.icon,18,"min-width:26px"),
            h("div",{style:"min-width:0"},
              h("div",{style:"font-size:13px;font-weight:800;color:#fff;line-height:1.25"},isRupture?rupture.name:b.name),
              !compact&&h("div",{style:"font-size:10px;color:#cbd5e1;line-height:1.4;margin-top:3px"},isRupture?b.desc:b.desc)
            )
          ),
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:#dbeafe;line-height:1.35;text-align:right;white-space:nowrap"},pairs.map((p,i)=>h("div",{key:i},questRewardText(p.xp,p.stat,b.binary,b.target,b.unit))))
        ),
        h("div",{class:"qrow",style:"align-items:center;margin-top:9px"},
          h("div",{class:"qbar"},h("div",{class:"qfill partial",style:"width:"+pct+"%;background-image:repeating-linear-gradient(-45deg,#274f88,#274f88 5px,#7aa7df 5px,#7aa7df 10px);background-size:14px 14px;opacity:.95"})),
          h("div",{class:"qxp",style:"color:#dbeafe;white-space:nowrap;min-width:118px;text-align:right"},progressText)
        ),

        !compact&&!isRupture&&h("div",{style:"margin-top:9px"},
          b.binary
            ? h("button",{onClick:finish,style:"width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.07);color:#fff;font-family:Orbitron,sans-serif;font-size:11px;cursor:pointer;letter-spacing:1px"},"REFERMER LA BRÈCHE ✓")
            : h("div",{style:"display:flex;gap:8px"},
                h("button",{onClick:()=>addMain(1),style:standardButtonStyle},"+1 "+b.unit),
                h("button",{onClick:()=>addMain(b.step||10),style:standardButtonStyle},"+"+(b.step||10)+" "+b.unit)
              )
        ),

        !compact&&isRupture&&h("div",{style:"margin-top:10px"},
          h("div",{style:"padding:9px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.035)"},
            h("div",{style:"display:flex;justify-content:space-between;gap:8px;align-items:center"},
              h("div",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:#fff;letter-spacing:1px;text-transform:uppercase"},"OBJECTIF DU BOSS"),
              h("div",{style:"font-family:Orbitron,sans-serif;font-size:8.5px;color:"+(mainDone?"#4ade80":"#dbeafe")},mainProgressText)
            ),
            !mainDone&&h("div",{style:"display:flex;gap:7px;margin-top:8px"},
              b.binary
                ? h("button",{onClick:completeMain,style:"width:100%;padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.06);color:#fff;font-family:Orbitron,sans-serif;font-size:9px;cursor:pointer"},"VALIDER LE BOSS ✓")
                : h(Fragment,null,
                    h("button",{onClick:()=>addMain(1),style:standardButtonStyle},"+1 "+b.unit),
                    h("button",{onClick:()=>addMain(b.step||10),style:standardButtonStyle},"+"+(b.step||10)+" "+b.unit)
                  )
            )
          ),
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:#fff;letter-spacing:1px;text-transform:uppercase;margin:11px 0 7px"},"GARDE RAPPROCHÉE — "+guardDoneCount+"/"+guards.length),
          h("div",{style:"display:flex;flex-direction:column;gap:7px"},guards.map(g=>{
            const done=guardDone(g);
            const progress=Math.max(0,Math.min(Number(g.target)||1,Number(g.progress)||0));
            return h("div",{key:g.id,style:"padding:9px;border-radius:9px;border:1px solid "+(done?"#4ade8044":"rgba(255,255,255,.09)")+";background:"+(done?"rgba(74,222,128,.055)":"rgba(255,255,255,.025)")},
              h("div",{style:"display:flex;justify-content:space-between;gap:8px;align-items:flex-start"},
                h("div",{style:"min-width:0"},
                  h("div",{style:"font-size:10px;font-weight:800;color:#fff;line-height:1.25"},g.name),
                  h("div",{style:"font-size:9.5px;color:var(--td);line-height:1.4;margin-top:3px"},g.objective)
                ),
                h("div",{style:"font-family:Orbitron,sans-serif;font-size:8.5px;color:"+(done?"#4ade80":"#dbeafe")+";white-space:nowrap"},done?"✓":fmtNum(progress)+"/"+g.target+" "+g.unit)
              ),
              !done&&h("div",{style:"display:flex;gap:7px;margin-top:8px"},
                h("button",{onClick:()=>updateGuard(g.id,Number(g.step)||1),style:standardButtonStyle},"+"+fmtNum(g.step||1)+" "+g.unit),
                h("button",{onClick:()=>updateGuard(g.id,0,true),style:standardButtonStyle},"TERMINER ✓")
              )
            );
          })),
          h("button",{
            disabled:!ruptureComplete,
            onClick:finish,
            style:"width:100%;margin-top:10px;padding:11px;border-radius:8px;border:1px solid "+(ruptureComplete?"#4ade8088":"rgba(255,255,255,.12)")+";background:"+(ruptureComplete?"rgba(74,222,128,.12)":"rgba(255,255,255,.025)")+";color:"+(ruptureComplete?"#4ade80":"var(--td)")+";font-family:Orbitron,sans-serif;font-size:10px;cursor:"+(ruptureComplete?"pointer":"default")+";letter-spacing:1px;text-transform:uppercase"
          },ruptureComplete?"MAÎTRISER LA RUPTURE ✓":"4 OBJECTIFS À ACCOMPLIR")
        ),
        !compact&&h("div",{style:"font-size:9px;color:#bfdbfe;font-family:Orbitron,sans-serif;line-height:1.45;margin-top:9px;text-align:center"},"OBJET ALÉATOIRE GARANTI À LA RÉUSSITE")
      )
    );
  }

  function DungeonCard({compact=false}={}){
    const d=activeDungeon;
    const remaining=d ? d.expiresAt-now : 0;
    const completedRooms=d ? (d.completedRooms||[]) : [];
    const selectedRoom=d&&Number.isInteger(selectedDungeonRoom)?d.rooms[selectedDungeonRoom]:null;
    const color=d ? d.color : rank.color;
    if(compact && !d) return null;
    if(d&&d.ruptureBoss){
      const rb=d.ruptureBoss;
      const ruptureColor=rb.ruptureColor||"#ef4444";
      const secured=(d.completedRooms||[]).length;
      return h("div",{class:"card",style:"border-color:"+ruptureColor+"88;background:linear-gradient(135deg,"+ruptureColor+"12,rgba(255,255,255,0.025))"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px"},
          h("div",{style:"min-width:0"},
            h("div",{class:"ctitle",style:"margin:0;color:"+ruptureColor},"⚠️ RUPTURE — "+d.title)
          ),
        ),
        h("div",{style:"padding:12px;border-radius:11px;border:1px solid "+ruptureColor+"55;background:"+ruptureColor+"10"},
          h("div",{style:"font-size:9px;color:"+ruptureColor+";font-family:Orbitron,sans-serif;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:5px"},"☠️ Boss de Rupture · "+fmtCD(remaining)+" restants"),
          h("div",{style:"font-size:15px;color:var(--tx);font-weight:900;line-height:1.2"},rb.name),
          h("div",{style:"font-size:11px;color:var(--td);line-height:1.45;margin-top:6px"},rb.objective),
          h("div",{style:"font-size:9px;color:"+ruptureColor+";font-family:Orbitron,sans-serif;letter-spacing:.8px;text-transform:uppercase;margin-top:9px"},
            "+1350 XP "+(STAT_LBL[d.reward.stat]||d.reward.stat)+" · +270 XP "+(STAT_LBL[d.reward.stat2]||d.reward.stat2)
          )
        ),
        h("button",{onClick:validateDungeonRoom,style:"width:100%;margin-top:10px;padding:11px;border-radius:9px;border:1px solid "+ruptureColor+"77;background:"+ruptureColor+"18;color:"+ruptureColor+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"},"Vaincre le Boss de Rupture")
      );
    }
    if(d){
      return h("div",{class:"card",style:"border-color:"+color+"66"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px"},
          h("div",{style:"min-width:0"},
            h("div",{class:"ctitle",style:"margin:0;color:"+color},d.icon+" "+d.title),
            h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin-top:4px"},"Progression "+completedRooms.length+"/"+d.rooms.length+" salles · "+fmtCD(remaining)+" restants"),
            d.contractConstraint&&h("div",{style:"font-size:9px;color:#f59e0b;font-family:Orbitron,sans-serif;letter-spacing:.8px;margin-top:5px"},"📜 CONTRAT DU MAÎTRE · "+(d.contractConstraint==="x1.5"?"Surcharge · objectifs ×1,5":d.contractConstraint==="sealedPath"?"Chemin scellé · salles dans l’ordre":d.contractConstraint==="noEscape"?"Sans échappatoire · objets d’évitement interdits":"Contrainte active")+" · récompense finale +20 %")
          ),
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:"+color+";border:1px solid "+color+"55;border-radius:999px;padding:4px 7px;white-space:nowrap"},STAT_LBL[d.stat]||d.stat)
        ),
        h("div",{style:"display:flex;flex-direction:column;gap:6px;margin-top:10px"},d.rooms.map((room,i)=>{
          const done=completedRooms.includes(i);
          const boss=i===d.rooms.length-1;
          const canValidate=!done&&canValidateDungeonRoom(d,d,i);
          const locked=!done&&!canValidate;
          const selected=!done&&!locked&&selectedDungeonRoom===i;
          return h("div",{key:i,onClick:()=>{if(!done&&!locked)setSelectedDungeonRoom(i);},style:"display:flex;gap:8px;align-items:flex-start;padding:8px;border-radius:10px;background:"+(selected?color+"18":"rgba(255,255,255,0.025)")+";border:1px solid "+(selected?color+"88":"rgba(255,255,255,0.05)")+";opacity:"+(done?"0.72":locked?"0.42":"1")+";cursor:"+(!done&&!locked?"pointer":"default")+";box-shadow:"+(selected?"0 0 14px "+color+"22":"none")},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:"+(done?"#4ade80":selected?color:"var(--td)")+";width:18px;text-align:center;flex-shrink:0"},done?"✓":locked?"🔒":(i+1)),
            h("div",{style:"min-width:0;flex:1"},
              h("div",{style:"font-size:12px;color:var(--tx);font-weight:700;line-height:1.25"},(i===d.rooms.length-1?"Boss — ":"")+room.name),
              h("div",{style:"font-size:10px;color:var(--td);line-height:1.35;margin-top:2px"},d.contractConstraint==="x1.5"?String(room.desc).replace(/\d+(?:[.,]\d+)?/g,m=>String(Math.round(parseFloat(m.replace(",","."))*1.5*10)/10).replace(".",",")):room.desc),
              locked&&h("div",{style:"font-size:8.5px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:.7px;text-transform:uppercase;margin-top:4px"},d.contractConstraint==="sealedPath"?"Chemin scellé · termine la salle précédente":boss?"Termine toutes les salles pour accéder au boss":"Salle verrouillée"),
              h("div",{style:"font-size:8.5px;color:"+color+";font-family:Orbitron,sans-serif;letter-spacing:.8px;text-transform:uppercase;margin-top:4px"},dungeonRoomRewardPairs(d,i).map(r=>"+"+r.xp+" XP "+(STAT_LBL[r.stat]||r.stat)).join(" · ")),
              room.help&&h("button",{onClick:()=>setDungeonHelpOpen(o=>({...o,[d.id+"_"+i]:!o[d.id+"_"+i]})),style:"margin-top:6px;padding:5px 7px;border-radius:7px;border:1px solid "+color+"55;background:rgba(255,255,255,0.025);color:"+color+";font-family:Orbitron,sans-serif;font-size:8px;letter-spacing:1px;text-transform:uppercase;cursor:pointer"},dungeonHelpOpen[d.id+"_"+i]?"Masquer l’aide":"Aide"),
              room.help&&dungeonHelpOpen[d.id+"_"+i]&&h("div",{style:"margin-top:6px;padding:8px;border-radius:8px;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.07);font-size:10px;color:var(--td);line-height:1.45"},
                h("div",{style:"font-family:Orbitron,sans-serif;font-size:9px;color:"+color+";letter-spacing:1px;text-transform:uppercase;margin-bottom:4px"},room.helpTitle||"Aide"),
                String(room.help||"").split("\n").map((line,idx)=>h(Fragment,{key:idx},line,idx<String(room.help||"").split("\n").length-1&&h("br",null)))
              )
            )
          );
        })),
        completedRooms.length<d.rooms.length&&h("button",{
          onClick:()=>validateDungeonRoom(selectedDungeonRoom),
          disabled:!selectedRoom,
          style:"width:100%;margin-top:10px;padding:11px;border-radius:9px;border:1px solid "+color+(selectedRoom?"66":"33")+";background:"+color+(selectedRoom?"12":"08")+";color:"+(selectedRoom?color:"var(--td)")+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:"+(selectedRoom?"pointer":"not-allowed")+";opacity:"+(selectedRoom?"1":"0.55")
        },"Valider la salle"),
        h("div",{style:"display:flex;gap:8px;margin-top:8px"},
          itemQty("invisibilityCape")>0&&d.contractConstraint!=="noEscape"&&h("button",{onClick:()=>setSpecialItemChoice({type:"cape"}),style:"flex:1;padding:9px;border-radius:8px;border:1px solid #94a3b866;background:#94a3b80d;color:#cbd5e1;font-family:Orbitron,sans-serif;font-size:8px;letter-spacing:.8px"},"👣 PASSER UNE SALLE"),
          itemQty("teleportCrystal")>0&&h("button",{onClick:()=>setSpecialItemChoice({type:"teleport"}),style:"flex:1;padding:9px;border-radius:8px;border:1px solid #60a5fa66;background:#60a5fa0d;color:#60a5fa;font-family:Orbitron,sans-serif;font-size:8px;letter-spacing:.8px"},"💠 QUITTER LE DONJON")
        )
      );
    }
    return h("div",{class:"card",style:"border-color:var(--rc)44"},
      h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:10px"},
        h("div",null,h("div",{class:"ctitle",style:"margin:0;color:var(--rc)"},"Donjons"),h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin-top:4px"},"1/jour · "+dungeonWeekCount+"/3 cette semaine · Accès par clé")),
        h("div",{style:"font-size:10px;color:"+(dungeonCanStart?"#4ade80":"var(--td)")+";font-family:Orbitron,sans-serif;text-transform:uppercase;white-space:nowrap"},dungeonCanStart?"Disponible":(dungeonDailyUsed?"Déjà lancé":dungeonWeekCount>=3?"Limite hebdo":"Verrouillé"))
      ),
      dungeonCanStart
        ? h("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:8px"},DUNGEONS.map(dg=>h("button",{key:dg.id,onClick:()=>startDungeon(dg.id),style:"padding:10px 8px;border-radius:10px;border:1px solid "+dg.color+"55;background:"+dg.color+"0f;color:"+dg.color+";font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:.7px;text-transform:uppercase;cursor:pointer;text-align:center;line-height:1.25"},h("div",{style:"font-size:16px;margin-bottom:4px"},dg.icon),h("div",null,dg.short),h("div",{style:"font-size:8px;color:var(--td);margin-top:3px"},STAT_LBL[dg.stat]||dg.stat))))
        : h("div",{style:"text-align:center;padding:10px 0;color:var(--td);font-size:11px;line-height:1.45"},dungeonDailyUsed?"Tu as déjà lancé un donjon aujourd'hui. Prochain lancement disponible demain.":dungeonWeekCount>=3?"Limite hebdomadaire atteinte.":"Aucune clé disponible.")
    );
  }


  function DungeonConsultCard(){
    const d=activeDungeon;
    if(!d) return null;
    const remaining=d.expiresAt-now;
    const completedRooms=d.completedRooms||[];
    const color=d.color||rank.color;

    // Sur l'accueil, un donjon en rupture doit être présenté comme tel
    // et non comme un donjon normal fraîchement ouvert.
    if(d.ruptureBoss){
      const rb=d.ruptureBoss;
      const ruptureColor=rb.ruptureColor||"#ef4444";
      return h("div",{class:"card",style:"border-color:"+ruptureColor+"88;background:linear-gradient(135deg,"+ruptureColor+"12,rgba(255,255,255,0.025))"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px"},
          h("div",{style:"min-width:0"},
            h("div",{class:"ctitle",style:"margin:0;color:"+ruptureColor},"⚠️ RUPTURE — "+d.title)
          ),
        ),
        h("div",{style:"padding:10px;border-radius:10px;border:1px solid "+ruptureColor+"55;background:"+ruptureColor+"10"},
          h("div",{style:"font-size:8.5px;color:"+ruptureColor+";font-family:Orbitron,sans-serif;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px"},"☠️ Boss de Rupture · "+fmtCD(remaining)+" restants"),
          h("div",{style:"font-size:14px;color:var(--tx);font-weight:900;line-height:1.2"},rb.name),
          h("div",{style:"font-size:10px;color:var(--td);line-height:1.4;margin-top:5px"},rb.objective),
          h("div",{style:"font-size:8.5px;color:"+ruptureColor+";font-family:Orbitron,sans-serif;letter-spacing:.8px;text-transform:uppercase;margin-top:8px"},
            "+1350 XP "+(STAT_LBL[d.reward.stat]||d.reward.stat)+" · +270 XP "+(STAT_LBL[d.reward.stat2]||d.reward.stat2)
          )
        )
      );
    }

    return h("div",{class:"card",style:"border-color:"+color+"66"},
      h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px"},
        h("div",{style:"min-width:0"},
          h("div",{class:"ctitle",style:"margin:0;color:"+color},d.icon+" "+d.title),
          h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin-top:4px"},"Progression "+completedRooms.length+"/"+d.rooms.length+" salles · "+fmtCD(remaining)+" restants")
        ),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:"+color+";border:1px solid "+color+"55;border-radius:999px;padding:4px 7px;white-space:nowrap"},STAT_LBL[d.stat]||d.stat)
      ),
      h("div",{style:"display:flex;flex-direction:column;gap:5px;margin-top:10px"},d.rooms.map((room,i)=>{
        const done=completedRooms.includes(i);
        return h("div",{key:i,style:"display:flex;gap:8px;align-items:center;padding:7px 8px;border-radius:9px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.045);opacity:"+(done?"0.7":"1")},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;color:"+(done?"#4ade80":"var(--td)")+";width:18px;text-align:center;flex-shrink:0"},done?"✓":(i+1)),
          h("div",{style:"font-size:12px;color:var(--tx);font-weight:700;line-height:1.25;min-width:0"},(i===d.rooms.length-1?"Boss — ":"")+room.name)
        );
      }))
    );
  }

  function DungeonChoiceCard(){
    if(activeDungeon) return null;
    const dungeonGold="#f59e0b";
    const subtitle="1 par jour · "+dungeonWeekCount+"/3 cette semaine";

    return h("div",{class:"card",style:"border:1px solid rgba(245,158,11,0.55);background:rgba(245,158,11,0.025)"},
      h("div",{class:"ctitle",style:"margin:0;color:"+dungeonGold},"DONJON"),
      h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin-top:4px"},subtitle+" · 🗝️ "+dungeonKeys),
      dungeonAccessOpen&&h("div",{style:"margin-top:8px;color:#4ade80;font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:1px"},"ACCÈS AU DONJON OUVERT"),
      dungeonCanStart
        ? h("button",{onClick:()=>setConfirmDungeonChoice({type:"enter",color:dungeonGold}),style:"width:100%;margin-top:12px;padding:11px;border-radius:9px;border:1px solid "+dungeonGold+"88;background:"+dungeonGold+"12;color:"+dungeonGold+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.35px;text-transform:uppercase;cursor:pointer"},"ENTRER DANS LE DONJON")
        : h("div",{style:"text-align:center;padding:10px 0 2px;color:var(--td);font-size:11px;line-height:1.45"},
            dungeonDailyUsed
              ? "Tu as déjà lancé un donjon aujourd’hui. Prochain lancement disponible demain."
              : dungeonWeekCount>=3
                ? "Limite atteinte : 3 donjons ont déjà été lancés cette semaine."
                : !dungeonAccessOpen
                  ? "Utilise une Clé de Donjon depuis ton inventaire pour ouvrir l’accès."
                  : "L’accès est ouvert, mais le donjon ne peut pas être lancé actuellement."
          )
    );
  }


  function DebtCard({compact=false}={}){
    const debt=state.questDebt;
    if(!debt || debt.status!=="active") return null;
    const color="#B46A3C";
    const colorDark="#7C3F22";
    const colorLight="#D89A6A";
    const colorBg="rgba(180,106,60,0.06)";
    const paid=Math.max(0,Number(debt.paid)||0);
    const amount=Math.max(1,Number(debt.amount)||1);
    const pct=Math.min(100,(paid/amount)*100);
    const isDue=debt.dueDay===today;
    const debtDeadline=(()=>{
      const d=new Date(debt.dueDay+"T05:00:00");
      d.setDate(d.getDate()+1);
      return d.getTime();
    })();
    const debtRemaining=Math.max(0,debtDeadline-now);

    if(compact){
      const unit=((paid>1||amount>1)&&{rep:"reps",page:"pages",min:"min",verre:"verres",repas:"repas",contact:"contacts",action:"actions"}[debt.unit])||debt.unit;
      const progressText=fmtNum(paid)+"/"+fmtNum(amount)+" "+(unit||"");
      const done=paid>=amount;
      const fillStateClass=done ? " done" : (pct>0 ? " partial" : "");
      return h("div",{class:"card",style:"border-color:"+color+"66;background:"+colorBg},
        h("div",{class:"ctitle",style:"color:"+color+";margin-bottom:8px"},"Dette active"),
        h("div",{style:"display:flex;align-items:center;gap:8px;margin-bottom:0"},
          QuestIcon(debt.id,debt.icon,14),
          h("div",{style:"flex:1"},
            h("div",{style:"font-size:12px;color:var(--tx);margin-bottom:3px;display:flex;justify-content:space-between;align-items:center;gap:8px"},
              h("span",{style:"white-space:normal;line-height:1.25;word-break:normal;min-width:0"},debt.name),
              h("div",{style:"display:flex;align-items:center;gap:6px"},
                h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:"+(done?"var(--rc)":paid>0?"var(--tx)":"var(--td)")+";white-space:nowrap;flex-shrink:0"},progressText),
                h("span",{style:"width:10px;flex-shrink:0"},"")
              )
            ),
            h("div",{class:"qbar"},h("div",{class:"qfill"+fillStateClass,style:"width:"+pct+"%;background:"+color}))
          )
        )
      );
    }

    return h("div",{class:"card",style:"border-color:"+color+"66;background:"+colorBg},
      h("div",{class:"shdr"},
        h("div",null,
          h("div",{class:"ctitle",style:"margin:0;color:"+color},"Dette active")
        )
      ),
      h("div",{class:"sqcard",style:"border-color:"+color+"55;background:linear-gradient(135deg,"+color+"10,rgba(255,255,255,.018))"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;gap:8px"},
          h("div",{style:"display:flex;align-items:center;gap:8px;min-width:0"},
            QuestIcon(debt.id,debt.icon,14,"line-height:1.1;min-width:24px;text-align:center"),
            h("div",{style:"min-width:0;flex:1"},
              h("div",{style:"font-size:13px;font-weight:700;color:var(--tx);line-height:1.25"},debt.name)
            )
          )
        ),
        h("div",{class:"qrow",style:"align-items:center;margin-top:6px"},
          h("div",{class:"qbar"},h("div",{class:"qfill"+(pct>=100?" done":pct>0?" partial":""),style:"width:"+pct+"%;background:"+color})),
          h("div",{class:"qxp",style:"color:"+(paid>=amount?"#4ade80":color)+";white-space:nowrap;min-width:82px;text-align:right;flex-shrink:0"},fmtNum(paid)+"/"+fmtNum(amount)+" "+debt.unit)
        ),
        h("div",{style:"font-size:10px;color:"+colorLight+";font-family:Orbitron,sans-serif;margin-top:4px;text-align:left"},"⏱ "+fmtCD(debtRemaining)+" restants")
      )
    );
  }

  // ─── ONGLET ACCUEIL ───────────────────────────────────────────────────


  function CompactCompletedCard({text,prefix,accent,suffix,accentColor,detail}){
    const color="#4ade80";
    return h("div",{
      class:"card",
      style:"padding:10px 12px;margin-bottom:8px;border-color:"+color+"55;background:linear-gradient(135deg,"+color+"12,rgba(255,255,255,.018))"
    },
      h("div",{style:"display:flex;align-items:flex-start;gap:8px"},
        h("div",{style:"width:18px;min-width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:14px;color:"+color+";font-weight:900;line-height:1;text-shadow:0 0 8px "+color+"88;margin-top:0"},"✓"),
        h("div",{style:"flex:1;min-width:0;padding-top:1px"},
          h("div",{style:"font-size:10px;color:var(--tx);font-family:Orbitron,sans-serif;letter-spacing:.55px;line-height:1.35;text-transform:uppercase"},
            text || h(Fragment,null,
              prefix||"",
              h("span",{style:"color:"+(accentColor||color)+";font-weight:900;text-shadow:0 0 8px "+(accentColor||color)+"66"},accent||""),
              suffix||""
            )
          ),
          detail&&h("div",{style:"font-size:9px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:.45px;line-height:1.35;margin-top:4px;text-transform:uppercase"},detail)
        )
      )
    );
  }

  function RecordChallengeHomeCard(){
    const challenge=state.recordChallenge;
    if(!challenge || challenge.week!==wk) return null;

    const currentObj=objs.find(o=>o.id===challenge.questId)
      || DEFS.find(o=>o.id===challenge.questId)
      || null;
    const name=challenge.rotationId?(challenge.name||"Record officiel"):((currentObj&&currentObj.name)||challenge.name||"Record officiel");
    const icon=challenge.rotationId?(challenge.icon||"✨"):((currentObj&&currentObj.icon)||challenge.icon||"✨");
    const unit=challenge.rotationId?(challenge.unit||""):((currentObj&&currentObj.unit)||challenge.unit||"");
    const stat=challenge.rotationId?(challenge.stat||null):((currentObj&&currentObj.stat)||challenge.stat||null);
    const color=STAT_COLOR[stat]||"#a78bfa";
    const target=Math.max(0,Number(challenge.target)||0);

    let bestThisWeek=0;
    Object.entries(state.dailyLog||{}).forEach(([day,log])=>{
      const date=new Date(day+"T12:00:00");
      if(Number.isNaN(date.getTime()) || wkStr(date)!==challenge.week) return;
      const value=challenge.rotationId
        ? (recordRotationIdForDay(state.exerciseRotationByDay,day,challenge.family)===challenge.rotationId ? Number(log&&log[challenge.questId]) : 0)
        : Number(log&&log[challenge.questId]);
      if(Number.isFinite(value)&&value>bestThisWeek) bestThisWeek=value;
    });

    const stepByUnit={rep:1,verre:1,page:1,objet:1,contact:1,action:1,repas:1,"sér.":1,km:.01,min:.1,h:.1};
    const step=stepByUnit[unit]||1;
    const goal=target+step;
    const pct=goal>0?Math.max(0,Math.min(100,(bestThisWeek/goal)*100)):0;

    const weekEnd=new Date(now);
    const daysUntilMonday=((8-weekEnd.getDay())%7)||7;
    weekEnd.setDate(weekEnd.getDate()+daysUntilMonday);
    weekEnd.setHours(0,0,0,0);
    const remaining=Math.max(0,weekEnd.getTime()-now);

    const pluralUnit=questRecordUnit(unit,goal);
    return h("div",{class:"card",style:"border-color:"+color+"88;background:linear-gradient(135deg,"+color+"16,rgba(255,255,255,.022));box-shadow:0 0 20px "+color+"18"},
      h("div",{style:"display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px"},
        h("div",{style:"display:flex;align-items:center;gap:9px;min-width:0"},
          QuestIcon(challenge.questId,icon,20,"width:28px;height:28px"),
          h("div",{style:"min-width:0"},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;font-weight:900;letter-spacing:1px;color:"+color+";text-transform:uppercase"},"Marque du dépassement active"),
            h("div",{style:"font-size:13px;color:var(--tx);font-weight:800;line-height:1.25;margin-top:3px"},name)
          )
        )
      ),
      h("div",{style:"width:100%;padding:10px;border-radius:8px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.055);margin-bottom:10px"},
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:8px;color:var(--td);letter-spacing:.8px;text-transform:uppercase"},"Record à battre"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:15px;font-weight:900;color:var(--tx);margin-top:4px"},fmtNum(target)+" "+questRecordUnit(unit,target))
      ),
      h("div",{style:"display:flex;justify-content:space-between;align-items:center;font-family:Orbitron,sans-serif;font-size:9px;margin-bottom:5px"},
        h("span",{style:"color:var(--td)"},"MEILLEURE PERFORMANCE CETTE SEMAINE"),
        h("span",{style:"color:"+(bestThisWeek>target?"#4ade80":color)},fmtNum(bestThisWeek)+" / "+fmtNum(goal)+" "+pluralUnit)
      ),
      h("div",{class:"qbar",style:"height:7px"},
        h("div",{
          class:"qfill"+(pct>0?" partial":""),
          style:"width:"+pct+"%;background-image:repeating-linear-gradient(-45deg,transparent,transparent 4px,"+color+" 4px,"+color+" 8px);background-size:11.31px 11.31px;opacity:.8;box-shadow:0 0 10px "+color+"33"
        })
      ),
      h("div",{style:"display:flex;justify-content:space-between;gap:10px;margin-top:8px;font-family:Orbitron,sans-serif;font-size:8.5px;letter-spacing:.55px;text-transform:uppercase"},
        h("span",{style:"color:var(--td)"},"Récompense : +500 XP "+(STAT_LBL[stat]||stat||"")),
        h("span",{style:"color:"+color+";white-space:nowrap"},"Temps restant : "+fmtCD(remaining))
      )
    );
  }

  function Home(){
    const dailyObjs = sortStat(objs.filter(o=>o.daily&&!o.optional));
    const weeklyObjs = sortStat(objs.filter(o=>o.weekly));
    const bonusObjs = dailyBonusQuestObjects();

    const isDone=(obj,isWeeklyRow)=>{
      if(obj.isEnduranceChoice) return false;
      const isW = isWeeklyRow || obj.weekly;
      const target = obj.target && !obj.binary ? obj.target : getEffectiveTarget(obj.id,isW);
      const doneVal = isW ? (wLog[obj.id]||0) : (tLog[obj.id]||0);
      return obj.binary ? doneVal>=1 : doneVal>=target;
    };

    const remainingDaily = dailyObjs.filter(o=>!isDone(o,false));
    const remainingWeekly = weeklyObjs.filter(o=>!isDone(o,true));
    const remainingBonus = bonusObjs.filter(o=>!isDone(o,false));
    const reqRemaining = remainingDaily.length;

    const completedDungeonToday = [...(state.dungeonLog||[])]
      .reverse()
      .find(entry=>entry&&entry.completedAt&&new Date(entry.completedAt).toDateString()===new Date().toDateString()) || null;

    const dungeonParts = title => {
      const raw=String(title||"Donjon");
      const match=raw.match(/^Donjon\s+(du|de la|de l[’']|des|de)\s+(.+)$/i);
      if(match) return {prefix:"Le Donjon "+match[1]+" ",name:match[2]};
      return {prefix:"Le ",name:raw};
    };
    const completedDungeonParts = completedDungeonToday ? dungeonParts(completedDungeonToday.title) : null;

    const completedHomeCards = [
      dailyObjs.length>0 && remainingDaily.length===0
        ? {key:"daily",text:"Toutes les quêtes journalières ont été complétées.",color:"#4ade80"}
        : null,
      bonusObjs.length>0 && remainingBonus.length===0
        ? {key:"bonus",text:"Toutes les quêtes bonus ont été complétées.",color:BONUS_BADGE_COLOR}
        : null,
      completedSq
        ? {
            key:"sq",
            prefix:"La Quête urgente ",
            accent:completedSq.name||"Quête urgente",
            suffix:" a été complétée.",
            accentColor:STAT_COLOR[sqMainStat(completedSq)]||"#ef4444",
            detail:sqCooldownActive ? "Prochaine quête urgente disponible dans "+fmtCD(sqCooldownUntil-now) : null
          }
        : null,
      completedDungeonToday
        ? {
            key:"dungeon",
            prefix:completedDungeonParts.prefix,
            accent:completedDungeonParts.name,
            suffix:" a été complété.",
            accentColor:STAT_COLOR[completedDungeonToday.stat]||"#c084fc",
            detail:"Fermeture du donjon dans "+fmtCD(Math.max(0,(completedDungeonToday.expiresAt||((completedDungeonToday.completedAt||now)+86400000))-now))
          }
        : null,

    ].filter(Boolean);

    const secs=[
      {lb:"Quêtes journalières restantes",ob:remainingDaily,iw:false,empty:null},
      {lb:"Quêtes hebdomadaires restantes",ob:remainingWeekly,iw:true,empty:null},
      {lb:"Quêtes bonus restantes",ob:remainingBonus,iw:false,empty:null},
    ];

    return h("div",{class:"tab"},
      missedDays>=2&&h("div",{class:"warn"},"⚠️ Pénalité : -"+(missedDays*10)+" XP ("+missedDays+" jours manqués)"),

      h("div",{class:"card"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"},
          h("div",{style:"display:flex;align-items:center;gap:8px"},
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:36px;font-weight:900;color:var(--rc);text-shadow:0 0 12px var(--rg),0 0 30px var(--rg);line-height:1"},rank.id),
            h("div",null,
              h("div",{style:"font-size:10px;color:var(--td);letter-spacing:1px;text-transform:uppercase;margin-top:2px"},"Rang actuel")
            )
          ),
          h("div",{style:"font-size:18px;color:var(--td)"},"→"),
          nextRank
            ? h("div",{style:"display:flex;align-items:center;gap:8px"},
                h("div",{style:"text-align:right"},
                  h("div",{style:"font-size:10px;color:var(--td);letter-spacing:1px;text-transform:uppercase;margin-top:2px"},"Rang suivant")
                ),
                h("div",{style:"font-family:Orbitron,sans-serif;font-size:36px;font-weight:900;color:var(--td);line-height:1"},nextRank.id)
              )
            : h("div",{style:"text-align:right"},
                h("div",{style:"font-family:Orbitron,sans-serif;font-size:13px;font-weight:700;color:#a855f755"},prestige<MAX_PRESTIGE?"Ascension "+(ROMAN[prestige]||""):"Maximum"),
                h("div",{style:"font-size:10px;color:var(--td);letter-spacing:1px;text-transform:uppercase;margin-top:2px"},"Prestige")
              )
        ),
        h("div",{class:"xpbar",style:"height:8px"},h("div",{class:"xpfill",style:"width:"+(nextRank?rankPct:Math.min(100,((effectiveXp-ASCENSION_XP_START)/(ASCENSION_XP_NEEDED-ASCENSION_XP_START))*100))+"%"})),
        h("div",{style:"display:flex;justify-content:space-between;font-size:10px;color:var(--td);margin-top:5px;font-family:Orbitron,sans-serif"},
          h("span",null,Math.round(state.totalXp).toLocaleString("fr-FR")+" XP"),
          nextRank
            ? (rankBlocked
                ? h("span",{style:"color:#fb923c"},"Stats requises non atteintes")
                : h("span",{style:"color:var(--rc)"},Math.round(nextRank.xpRequired-state.totalXp).toLocaleString("fr-FR")+" XP manquants"))
            : prestigeAvailable
              ? h("span",{style:"color:#a855f7"},"Ascension disponible !")
              : prestigeBlocked
                ? h("span",{style:"color:#fb923c"},"Stats requises non atteintes")
                : h("span",{style:"color:var(--rc)"},Math.round(ASCENSION_XP_NEEDED-effectiveXp).toLocaleString("fr-FR")+" XP avant Ascension "+(ROMAN[prestige]||"I"))
        ),
        h("div",{style:"margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06)"},
          h("div",{style:"display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--td);margin-bottom:5px;font-family:Orbitron,sans-serif;text-transform:uppercase;letter-spacing:1px"},
            h("span",null,"Niveau "+globalLevel.level),
            h("span",{style:"color:var(--td);opacity:.75"},"→"),
            h("span",null,globalLevel.maxed?"Niveau max":"Niveau "+globalLevel.nextLevel)
          ),
          h("div",{class:"xpbar",style:"height:4px"},h("div",{class:"xpfill",style:"width:"+globalLevel.pct+"%"})),
          h("div",{style:"display:flex;justify-content:space-between;font-size:10px;color:var(--td);margin-top:5px;font-family:Orbitron,sans-serif"},
            h("span",null,Math.round(globalLevel.inLevel).toLocaleString("fr-FR")+" XP"),
            h("span",{style:"color:var(--rc)"},globalLevel.maxed?"MAX":Math.max(0,Math.round(globalLevel.need-globalLevel.inLevel)).toLocaleString("fr-FR")+" XP manquants")
          )
        ),
        prestigeAvailable&&h("button",{
          onClick:()=>{
            const newPrestige=(state.prestige||0)+1;
            setState(s=>({...s,streak:0,streakBonusDay:null,weeklyBonusWk:null,streakMilestones:[],dailyLog:{},weeklyLog:{},regressionLog:{},specialQuests:[],sqStatCycle:[],sqCooldownUntil:null,sqRerollDay:null,activeDungeon:null,dungeonRunDay:null,dungeonRunsByWeek:{},dungeonKeyRollDay:null,dungeonKeys:0,dungeonKeyDay:null,dungeonKeyRollWon:false,dungeonLog:[],enduranceChoiceByDay:{},prestige:newPrestige}));
            setPrestigeUp(newPrestige);
          },
          style:"width:100%;margin-top:12px;padding:12px;background:rgba(168,85,247,0.1);border:1px solid #a855f7;border-radius:10px;color:#a855f7;font-family:Orbitron,sans-serif;font-size:12px;letter-spacing:3px;cursor:pointer;text-transform:uppercase;text-shadow:0 0 12px #a855f7"
        },"⚛️ Montée en Ascension"),
        h("div",{style:"display:grid;grid-template-columns:minmax(0,1fr) 1px minmax(0,1fr) 1px minmax(0,1fr);align-items:center;justify-items:stretch;margin-top:12px;padding-top:16px;padding-bottom:0px;border-top:1px solid rgba(255,255,255,0.06)"},
          h("div",{style:"width:100%;display:flex;align-items:center;justify-content:center;gap:5px;padding:0"},
            h("div",{style:"display:flex;flex-direction:column;align-items:center;justify-content:center"},
              h("div",{style:"font-family:Orbitron,sans-serif;font-size:16px;font-weight:900;color:#fff;line-height:0.9"},state.streak),
              h("div",{style:"font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:1px;margin-top:3px"},"STREAK"),
              bonusGiven&&h("div",{style:"font-size:10px;color:#c084fc;font-family:Orbitron,sans-serif;margin-top:3px"},"+250 XP ✓")
            )
          ),
          h("div",{style:"width:1px;height:38px;background:rgba(255,255,255,0.06);justify-self:center"}),
          h("div",{style:"width:100%;display:flex;align-items:center;justify-content:center;gap:5px;padding:0"},
            h("div",{style:"display:flex;flex-direction:column;align-items:center;justify-content:center"},
              h("div",{style:"font-family:Orbitron,sans-serif;font-size:16px;font-weight:900;color:#fff;line-height:0.9"},todayXp.toFixed(0)),
              h("div",{style:"font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:1px;margin-top:3px"},"XP DU JOUR")
            )
          ),
          h("div",{style:"width:1px;height:38px;background:rgba(255,255,255,0.06);justify-self:center"}),
          h("div",{style:"width:100%;display:flex;align-items:center;justify-content:center;gap:5px;padding:0"},
            h("div",{style:"display:flex;flex-direction:column;align-items:center;justify-content:center"},
              h("div",{style:"font-family:Orbitron,sans-serif;font-size:16px;font-weight:900;color:#fff;line-height:0.9"},reqRemaining),
              h("div",{style:"font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:1px;margin-top:3px"},"RESTANTES")
            )
          )
        )
      ),

      h(RecordChallengeHomeCard,null),
      activeElixir&&h("div",{style:"margin:-2px 0 12px;padding:9px 11px;border-left:2px solid "+(activeElixir.kind==="supremeElixir"?"#9333ea":(STAT_COLOR[activeElixir.stat]||rank.color))+";background:rgba(255,255,255,.025);font-family:Orbitron,sans-serif"},
        h("div",{style:"font-size:9px;color:var(--td);letter-spacing:1.2px;text-transform:uppercase"},activeElixir.kind==="majorElixir"?"Élixir d’expérience majeur":activeElixir.kind==="supremeElixir"?"Élixir d’expérience magistral":"Élixir d’expérience mineur"),
        h("div",{style:"margin-top:4px;font-size:11px;color:"+(activeElixir.kind==="supremeElixir"?"#9333ea":(STAT_COLOR[activeElixir.stat]||rank.color))+";font-weight:800"},"+"+Math.round((activeElixir.pct||0)*100)+" % XP"+(activeElixir.kind==="supremeElixir"?" — TOUTES LES STATISTIQUES":" — "+(STAT_LBL[activeElixir.stat]||activeElixir.stat))+" · "+fmtCD((activeElixir.expiresAt||0)-now))
      ),
      state.ruptureMalus&&now<(state.ruptureMalus.expiresAt||0)&&h("div",{style:"margin:-2px 0 12px;padding:9px 11px;border-left:2px solid #ef4444;background:rgba(239,68,68,.045);font-family:Orbitron,sans-serif"},
        h("div",{style:"font-size:9px;color:var(--td);letter-spacing:1.2px;text-transform:uppercase"},"Malus de Rupture"),
        h("div",{style:"margin-top:4px;font-size:11px;color:#ef4444;font-weight:800"},"−25 % XP · "+fmtCD((state.ruptureMalus.expiresAt||0)-now))
      ),

      h(DebtCard,{compact:true}),
      activeBreach&&h(BreachCard,{compact:true}),
      activeSq&&h("div",{class:"card",style:"border-color:#ef444444"},
        h("div",{class:"ctitle",style:"color:#ef4444;margin-bottom:8px"},"Quête urgente"),
        h(UrgentHomeRow,{sq:activeSq})
      ),
      activeDungeon&&h(DungeonConsultCard,null),

      secs.map(({lb,ob,iw,empty})=>
        ob.length>0
          ? h("div",{key:lb,class:"card"},h("div",{class:"ctitle"},lb),ob.map(o=>o.isEnduranceChoice?h(EnduranceChoiceItem,{key:o.id,mode:"home"}):h(RR,{key:o.id,obj:o,isW:iw})))
          : empty
            ? h("div",{key:lb,class:"card",style:"border-color:#4ade8044"},
                h("div",{class:"ctitle",style:"color:#4ade80"},lb),
                h("div",{style:"text-align:center;padding:14px 0;color:#4ade80;font-family:Orbitron,sans-serif;font-size:12px;letter-spacing:1px"},empty)
              )
            : null
      ),
      completedHomeCards.length>0&&h("div",{style:"margin-top:2px"},
        completedHomeCards.map(item=>h(CompactCompletedCard,{key:item.key,text:item.text,prefix:item.prefix,accent:item.accent,suffix:item.suffix,accentColor:item.accentColor,detail:item.detail}))
      )
    );
  }

  // ─── ONGLET QUETES ────────────────────────────────────────────────────

  function Quests(){
    const reqBase=sortStat(objs.filter(o=>o.daily&&!o.optional));
    const bonBase=dailyBonusQuestObjects();
    const wkBase=sortStat(objs.filter(o=>o.weekly));

    const isQuestDone=(obj)=>{
      if(obj.isEnduranceChoice) return false;
      const isWeekly = obj.weekly;
      const t = getEffectiveTarget(obj.id, isWeekly);
      const effectiveT = t;
      const target = (obj.target && !obj.binary) ? obj.target : effectiveT;
      const d = isWeekly ? (wLog[obj.id]||0) : (tLog[obj.id]||0);
      return obj.binary ? d>=1 : d>=target;
    };
    const moveCompletedLast=(list)=>[
      ...list.filter(o=>!isQuestDone(o)),
      ...list.filter(o=>isQuestDone(o))
    ];

    const req=moveCompletedLast(reqBase);
    const bon=moveCompletedLast(bonBase);
    const wkq=moveCompletedLast(wkBase);

    const reqDone=reqBase.filter(isQuestDone).length;
    const reqTotal=reqBase.length;
    const bonDone=bonBase.filter(isQuestDone).length;
    const bonTotal=bonBase.length;
    const wkDone=wkBase.filter(isQuestDone).length;
    const wkTotal=wkBase.length;
    const regressionDoneToday=!!((state.regressionLog||{})[today]);

    const SectionHeader = ({title,done,total}) => h("div",{class:"shdr",style:"margin-bottom:10px"},
      h("div",{class:"ctitle",style:"margin:0"+(title==="Régressions"?";color:#ef4444":"")},title),
      h("div",{style:"font-family:Orbitron,sans-serif;font-size:11px;letter-spacing:1px;color:"+(done===total&&total>0?"#4ade80":"var(--td)")},done+"/"+total)
    );

    return h("div",{class:"tab"},
      h(DebtCard,null),
      activeBreach&&h(BreachCard,null),
      (!completedSq||activeSq)&&h("div",{class:"card",style:"border-color:#ef444444"},
        h("div",{class:"shdr"},
          h("div",null,
            h("div",{class:"ctitle",style:"margin:0;color:#ef4444"},"Quête urgente"+(activeSq&&activeSq.tier?" · "+(SQ_TIER_LABEL[activeSq.tier]||""):""))
          )
        ),
        activeSq
          ? h(SqCard,{sq:activeSq,showInput:true})
          : (!completedSq&&!sqCooldownActive
              ? h("div",{style:"font-size:12px;color:var(--td);text-align:center;padding:8px 0"},"Chargement du défi...")
              : null
            )
      ),
      activeDungeon&&h(DungeonCard,null),
      h("div",{class:"card"},
        h(SectionHeader,{title:"Quêtes journalières",done:reqDone,total:reqTotal}),
        req.map(o=>h(QI,{key:o.id,obj:o})),
      ),
      wkq.length>0&&h("div",{class:"card"},
        h(SectionHeader,{title:"Quêtes hebdomadaires",done:wkDone,total:wkTotal}),
        wkq.map(o=>h(QI,{key:o.id,obj:o}))
      ),
      bon.length>0&&h("div",{class:"card"},
        h(SectionHeader,{title:"Quêtes bonus",done:bonDone,total:bonTotal}),
        bon.map(o=>o.isEnduranceChoice?h(EnduranceChoiceItem,{key:o.id,mode:"quest"}):h(QI,{key:o.id,obj:o}))
      ),
      !activeDungeon&&h(DungeonChoiceCard,null),
    );
  }

  // ─── ONGLET STATS ─────────────────────────────────────────────────────


  function EmojiStyleItemImage(src,size,scale=1){
    const s=size||40;
    return h("img",{src,width:s,height:s,alt:"",draggable:false,"aria-hidden":"true",style:"display:block;width:"+s+"px;height:"+s+"px;object-fit:contain;transform:scale("+scale+");transform-origin:center;user-select:none;-webkit-user-drag:none"});
  }
  function FantasyItemImage(src,size,glow){
    const s=size||40;
    return h("img",{src,width:s,height:s,alt:"",draggable:false,"aria-hidden":"true",style:"display:block;width:"+s+"px;height:"+s+"px;object-fit:contain;filter:drop-shadow(0 0 5px "+(glow||"rgba(255,255,255,.18)")+");user-select:none;-webkit-user-drag:none"});
  }
  function ElixirIcon(kind,size=34){
    if(kind==="majorElixir")return EmojiStyleItemImage(MAJOR_ELIXIR_ICON_DATA,size);
    if(kind==="supremeElixir")return EmojiStyleItemImage(SUPREME_ELIXIR_ICON_DATA,size);
    return EmojiStyleItemImage(MINOR_ELIXIR_ICON_DATA,size);
  }
  function GrimoireIcon(size){
    const s=size||40;
    return h("img",{src:GRIMOIRE_ICON_DATA,width:s,height:s,alt:"",draggable:false,"aria-hidden":"true",style:"display:block;width:"+s+"px;height:"+s+"px;object-fit:contain;user-select:none;-webkit-user-drag:none"});
  }
  function InventoryItemIcon(id,size){
    if(id==="dungeonKey")return EmojiStyleItemImage(DUNGEON_KEY_ICON_DATA,size);
    if(id==="debtAcknowledgement")return EmojiStyleItemImage(DEBT_ACKNOWLEDGEMENT_ICON_DATA,size);
    if(id==="regressionOrb")return EmojiStyleItemImage(REGRESSION_ORB_ICON_DATA,size,1.25);
    if(isElixirKind(id))return ElixirIcon(id,size);
    if(id==="transmutationGrimoire")return GrimoireIcon(size);
    if(id==="invisibilityCape"&&NEW_ITEM_ICON_DATA[id])return EmojiStyleItemImage(NEW_ITEM_ICON_DATA[id],size);
    if(id==="teleportCrystal"&&NEW_ITEM_ICON_DATA[id])return EmojiStyleItemImage(NEW_ITEM_ICON_DATA[id],size,1.25);
    if(NEW_ITEM_ICON_DATA[id])return EmojiStyleItemImage(NEW_ITEM_ICON_DATA[id],size);
    return h("span",{style:"font-size:"+size+"px;line-height:1"},INVENTORY_ITEMS[id].emoji);
  }
  function itemQty(id){ return ["codex","regressionOrb","debtAcknowledgement"].includes(id)?1:id==="dungeonKey"?dungeonKeys:Math.max(0,Math.floor(Number(state.inventory&&state.inventory[id])||0)); }
  function Inventory(){
    const ids=["codex","regressionOrb","dungeonKey","debtAcknowledgement","majorElixir","minorElixir","supremeElixir","transmutationGrimoire","masterContract","destinyCompass","mysteryMap","etherStopper","rerollToken","alchemicalCatalyst","recordHammer","teleportCrystal","invisibilityCape","recoveryOintment"]
      .sort((a,b)=>{
        if(inventorySort==="name"){
          return INVENTORY_ITEMS[a].name.localeCompare(INVENTORY_ITEMS[b].name,"fr",{sensitivity:"base"});
        }

        const permanentA=["codex","regressionOrb","debtAcknowledgement"].includes(a);
        const permanentB=["codex","regressionOrb","debtAcknowledgement"].includes(b);
        const qtyA=itemQty(a);
        const qtyB=itemQty(b);

        // Tri par quantité :
        // 1. objets possédés en quantité finie, quantité décroissante ;
        // 2. objets permanents affichés avec ∞ ;
        // 3. objets non possédés ;
        const groupA=qtyA>0?(permanentA?1:0):2;
        const groupB=qtyB>0?(permanentB?1:0):2;
        if(groupA!==groupB)return groupA-groupB;

        if(groupA===0){
          const quantityDiff=qtyB-qtyA;
          if(quantityDiff!==0)return quantityDiff;
        }

        return INVENTORY_ITEMS[a].name.localeCompare(INVENTORY_ITEMS[b].name,"fr",{sensitivity:"base"});
      });
    const sortLabel=inventorySort==="name"?"Par nom":"Par quantité";
    return h("div",{class:"tab",onClick:()=>inventorySortOpen&&setInventorySortOpen(false)},
      h("div",{style:"display:flex;justify-content:flex-end;margin-bottom:10px;position:relative;z-index:5"},
        h("div",{style:"position:relative",onClick:e=>e.stopPropagation()},
          h("button",{
            onClick:()=>setInventorySortOpen(v=>!v),
            style:"width:170px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:7px;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.025);color:var(--tx);font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:.7px;cursor:pointer"
          },"Tri · "+sortLabel,h("span",{style:"font-size:10px;transform:"+(inventorySortOpen?"rotate(180deg)":"rotate(0deg)")+";transition:transform .18s"},"▼")),
          inventorySortOpen&&h("div",{style:"position:absolute;right:0;top:calc(100% + 6px);min-width:170px;padding:6px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#111318;box-shadow:0 12px 28px rgba(0,0,0,.45);z-index:20"},
            [["name","Par nom"],["quantity","Par quantité"]].map(([value,label])=>h("button",{
              key:value,
              onClick:()=>{setInventorySort(value);setInventorySortOpen(false);},
              style:"width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 10px;border:0;border-radius:7px;background:"+(inventorySort===value?"rgba(255,255,255,.06)":"transparent")+";color:"+(inventorySort===value?"var(--rc)":"var(--tx)")+";font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:.6px;text-align:left;cursor:pointer"
            },h("span",null,label),h("span",{style:"width:14px;text-align:center;color:var(--rc);font-weight:900"},inventorySort===value?"✓":"")))
          )
        )
      ),
      h("div",{style:"display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px"},ids.map(id=>{
        const it=INVENTORY_ITEMS[id], qty=itemQty(id), grey=!["codex","regressionOrb","debtAcknowledgement"].includes(id)&&!(id==="etherStopper"&&suspendedElixir)&&!(id==="recordHammer"&&state.recordChallenge&&state.recordChallenge.week===wk)&&(qty<1||(isElixirKind(id)&&(!!activeElixir||!!suspendedElixir)));
        return h("button",{key:id,onClick:()=>setInventoryItem(id),style:"position:relative;aspect-ratio:1/1;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.025);padding:8px;color:var(--tx);cursor:pointer;opacity:"+(grey?".48":"1")+";display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px"},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:8px;line-height:1.25;letter-spacing:.5px;text-transform:uppercase;text-align:center;min-height:20px"},it.short),
          h("div",{style:"line-height:1"},InventoryItemIcon(id, id==="masterContract" ? 46 : 38)),
          h("div",{style:"position:absolute;right:6px;bottom:5px;border-radius:999px;min-width:20px;padding:2px 5px;background:rgba(0,0,0,.55);font-family:Orbitron,sans-serif;font-size:9px;color:#fff"},["codex","regressionOrb","debtAcknowledgement"].includes(id)?"∞":id==="etherStopper"&&suspendedElixir?"PAUSE":"×"+qty)
        );
      }))
    );
  }
  function ObtainLine(text){
    const marker="[[GRIMOIRE]]";
    const parts=String(text||"").split(marker);
    if(parts.length===1)return "• "+text;
    return h(Fragment,null,"• "+parts[0],h("span",{style:"display:inline-flex;vertical-align:middle;margin:0 3px;transform:translateY(2px)"},GrimoireIcon(14)),parts.slice(1).join(marker));
  }
  function inventoryActionLabel(id,it){
    if(id==="minorElixir"||id==="majorElixir"||id==="supremeElixir")return "BOIRE";
    if(id==="etherStopper")return suspendedElixir?"RETIRER":"INSERER";
    if(id==="masterContract")return "SIGNER";
    if(id==="invisibilityCape")return "BOIRE";
    if(id==="debtAcknowledgement")return "SIGNER";
    if(id==="transmutationGrimoire")return "LIRE";
    if(id==="rerollToken")return "LANCER";
    if(id==="recoveryOintment")return "APPLIQUER";
    return it.action;
  }

  function InventoryItemModal(){
    if(!inventoryItem)return null;
    if(inventoryItem==="codex")return h(Codex,null);
    const id=inventoryItem,it=INVENTORY_ITEMS[id],qty=itemQty(id);
    const isElixir=isElixirKind(id);
    let disabled=(["regressionOrb","debtAcknowledgement"].includes(id)||(id==="etherStopper"&&suspendedElixir))?false:qty<1;
    let reason=(!["regressionOrb","debtAcknowledgement"].includes(id)&&!(id==="etherStopper"&&suspendedElixir)&&qty<1)?"Aucun exemplaire disponible.":"";
    if(id==="regressionOrb"){
      if((state.regressionLog||{})[today]){disabled=true;reason="Une régression a déjà été déclarée aujourd’hui.";}
    }else if(id==="dungeonKey"){
      if(dungeonAccessOpen){disabled=true;reason="Un accès au donjon est déjà ouvert.";}
      else if(activeDungeon){disabled=true;reason="Un donjon est déjà actif.";}
      else if(dungeonDailyUsed){disabled=true;reason="Un donjon a déjà été lancé aujourd’hui.";}
      else if(dungeonWeekCount>=3){disabled=true;reason="La limite de trois donjons cette semaine est atteinte.";}
    }else if(id==="transmutationGrimoire"){
      const minors=Math.max(0,Math.floor(Number(state.inventory&&state.inventory.minorElixir)||0));
      const catalystReady=state.alchemicalCatalystArmed&&itemQty("alchemicalCatalyst")>0;
      const needed=catalystReady?3:5;
      if(minors<needed){disabled=true;reason=(catalystReady?"Catalyseur préparé · ":"")+needed+" Élixirs d’expérience mineurs sont nécessaires ("+minors+"/"+needed+").";}
    }else if(id==="destinyCompass"){
      if(state.urgentCompassStat){disabled=true;reason="La prochaine quête urgente est déjà orientée vers "+(STAT_LBL[state.urgentCompassStat]||state.urgentCompassStat)+".";}
    }else if(id==="mysteryMap"){
      if(state.dungeonMapStat){disabled=true;reason="Le prochain donjon est déjà orienté vers "+(STAT_LBL[state.dungeonMapStat]||state.dungeonMapStat)+".";}
      else if(activeDungeon){disabled=true;reason="Un donjon est déjà actif. La Carte des profondeurs doit être utilisée avant le prochain lancement.";}
    }else if(id==="etherStopper"){
      if(suspendedElixir){disabled=false;reason="Élixir suspendu · "+fmtCD(suspendedElixir.remainingMs)+" seront restituées à la réactivation.";}
      else if(!activeElixir){disabled=true;reason="Aucun élixir n’est actuellement actif.";}
    }else if(id==="rerollToken"){
      if(state.urgentTokenUseDay===today){disabled=true;reason="Un Jeton de relance a déjà été utilisé aujourd’hui.";}
      else if(activeSq){disabled=true;reason="Terminez d’abord la quête urgente actuellement active.";}
      else if(!urgentDoneToday){disabled=true;reason="La quête urgente du jour doit être terminée avant d’utiliser le Jeton.";}
    }else if(id==="alchemicalCatalyst"){
      if(state.alchemicalCatalystArmed){disabled=true;reason="Un Catalyseur alchimique est déjà préparé pour la prochaine transmutation.";}
    }else if(id==="masterContract"){
      if(state.masterContractArmed){disabled=true;reason="Un Contrat du Maître est déjà préparé pour le prochain donjon.";}
      else if(activeDungeon){disabled=true;reason="Le contrat doit être utilisé avant le lancement d’un donjon.";}
    }else if(id==="invisibilityCape"&&activeDungeon&&activeDungeon.contractConstraint==="noEscape"){
      disabled=true;reason="Sans échappatoire est actif : aucun objet permettant d’éviter une salle ne peut être utilisé pendant ce donjon.";
    }else if(id==="debtAcknowledgement"){
      if(state.questDebt&&state.questDebt.status==="active"){disabled=true;reason="Une dette est déjà active.";}
      else if(state.debtUseDay===today){disabled=true;reason="Une reconnaissance de dette a déjà été utilisée aujourd’hui.";}
      else if(!objs.some(o=>o.daily&&!o.optional&&isDebtEligibleQuest(o)&&(Number(tLog[o.id])||0)<getEffectiveTarget(o.id))){disabled=true;reason="Aucune quête éligible incomplète aujourd’hui.";}
    }else if(id==="recordHammer"){
      if(state.recordChallenge&&state.recordChallenge.week===wk){disabled=false;reason="Une Marque du dépassement est actuellement dessinée sur « "+(state.recordChallenge.name||"ce record")+" ».";}
    }else if(id==="recoveryOintment"){
      const regularEligible=objs.some(o=>o.daily&&(Number(tLog[o.id])||0)<getEffectiveTarget(o.id));
      if(!regularEligible){disabled=true;reason="Aucune quête journalière ou bonus active et incomplète ne peut être passée.";}
    }else if(id==="teleportCrystal"){
      if(activeBreach){disabled=true;reason="Une Brèche est déjà active.";}
      else if(state.alliedGiftPending){disabled=true;reason="Choisissez d’abord l’objet offert par le pays allié.";}
    }else if(id==="invisibilityCape"){
      if(!activeDungeon){disabled=true;reason="Aucun donjon n’est actuellement actif.";}
    }else if(activeElixir||suspendedElixir){
      disabled=true;
      reason=suspendedElixir?"Un élixir est actuellement suspendu. Réactivez-le avant d’en consommer un autre.":"Un élixir est déjà actif pendant encore "+fmtCD((activeElixir.expiresAt||0)-now)+".";
    }
    return h("div",{class:"modal-ov",onClick:e=>{if(e.target===e.currentTarget)setInventoryItem(null)}},
      h("div",{class:"modal",style:"position:relative;max-width:390px;width:calc(100% - 28px)"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:12px"},
          h("div",{class:"mtitle",style:"margin:0;line-height:1.2;min-width:0"},it.name),
          h("button",{onClick:()=>setInventoryItem(null),style:"border:0;background:transparent;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:0;flex-shrink:0"},"×")
        ),
        h("div",{style:"display:flex;justify-content:center;align-items:center;margin:14px 0 8px"},InventoryItemIcon(id,128)),
        !it.permanent&&h("div",{style:"text-align:center;font-family:Orbitron,sans-serif;font-size:10px;color:var(--td);margin-bottom:16px"},id==="recordHammer"&&state.recordChallenge&&state.recordChallenge.week===wk?"MARQUE EN COURS":id==="etherStopper"&&suspendedElixir?"ÉLIXIR SUSPENDU · "+fmtCD(suspendedElixir.remainingMs):"QUANTITÉ : "+qty),
        h("div",{style:"font-size:12px;line-height:1.6;color:var(--tx);margin-bottom:14px"},it.desc),
        !it.permanent&&h("div",{style:"margin-bottom:16px;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08);padding:10px 0"},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1px"},"OBTENTION"),
          h("div",{style:"margin-top:9px;display:flex;flex-direction:column;gap:7px"},it.obtain.map((x,i)=>h("div",{key:i,style:"font-size:10px;color:var(--td);line-height:1.5"},ObtainLine(x))))
        ),
        reason&&h("div",{style:"font-size:10px;color:var(--td);text-align:center;margin-bottom:8px"},reason),
        h("button",{disabled,onClick:()=>{const eraseRecord=id==="recordHammer"&&state.recordChallenge&&state.recordChallenge.week===wk;setInventoryItem(null);setConfirmItemUse({id,eraseRecord})},style:"width:100%;padding:12px;border-radius:9px;border:1px solid "+(disabled?"rgba(255,255,255,.08)":(id==="recordHammer"&&state.recordChallenge&&state.recordChallenge.week===wk?"#ef4444":rank.color))+";background:"+(disabled?"rgba(255,255,255,.03)":(id==="recordHammer"&&state.recordChallenge&&state.recordChallenge.week===wk?"rgba(239,68,68,.10)":rank.color+"18"))+";color:"+(disabled?"var(--td)":(id==="recordHammer"&&state.recordChallenge&&state.recordChallenge.week===wk?"#ef4444":rank.color))+";font-family:Orbitron,sans-serif;letter-spacing:1.3px;cursor:"+(disabled?"default":"pointer")},id==="recordHammer"&&state.recordChallenge&&state.recordChallenge.week===wk?"EFFACER":inventoryActionLabel(id,it))
      )
    );
  }
  function ConfirmItemUseModal(){
    if(!confirmItemUse)return null;
    const id=confirmItemUse.id,it=INVENTORY_ITEMS[id];
    const eraseRecord=!!confirmItemUse.eraseRecord;
    const confirmColor=eraseRecord?"#ef4444":rank.color;
    const confirmGlow=eraseRecord?"rgba(239,68,68,.55)":rank.glow;
    return h("div",{class:"ruov",style:"--rc:"+confirmColor+";--rg:"+confirmGlow},h("div",{class:"rucont",style:"width:min(500px,calc(100vw - 34px));background:rgba(15,15,18,.97);border:1px solid "+confirmColor+"88;border-radius:18px;padding:22px;box-shadow:0 0 30px "+confirmColor+"22"},
      h("div",{class:"ruevol",style:"color:"+confirmColor},eraseRecord?"EFFACER LA MARQUE":"CONFIRMATION"),
      h("div",{style:"font-family:Orbitron,sans-serif;font-size:18px;font-weight:900;color:"+(eraseRecord?"#ef4444":"#fff")+";text-align:center;line-height:1.4;max-width:340px"},eraseRecord
        ?"Effacer la Marque du dépassement actuellement dessinée sur « "+((state.recordChallenge&&state.recordChallenge.name)||"ce record")+" » ? L’objet restera consommé et cet objectif officiel sera abandonné."
        :id==="etherStopper"&&suspendedElixir
          ?"Réactiver l’élixir suspendu avec exactement "+fmtCD(suspendedElixir.remainingMs)+" restants ?"
          :id==="teleportCrystal"
            ?"Briser le Cristal de téléportation pour rejoindre un pays voisin et ouvrir une Brèche aléatoire ?"
            :id==="mysteryMap"
              ?"Déplier la Carte des profondeurs pour choisir la statistique du prochain donjon ?"
              :"Êtes-vous certain de vouloir "+(id==="regressionOrb"?"activer l’":id==="debtAcknowledgement"?"utiliser la ":id==="dungeonKey"?"utiliser une ":id==="transmutationGrimoire"?"utiliser le ":id==="destinyCompass"?"orienter la ":id==="alchemicalCatalyst"?"préparer le ":"consommer un ")+it.name+" ?"),
      h("div",{style:"display:flex;gap:10px;margin-top:22px"},
        h("button",{class:"rudis",style:"min-width:110px;--rc:#64748b;--rg:rgba(100,116,139,.5)",onClick:()=>setConfirmItemUse(null)},"Non"),
        h("button",{class:"rudis",style:"min-width:110px;--rc:"+confirmColor+";--rg:"+confirmGlow,onClick:()=>{
          setConfirmItemUse(null);
          if(eraseRecord){
            setState(s=>({...s,recordChallenge:null}));
          }else if(id==="regressionOrb"){
            if(REGRESSION_DEFS.length>1)setRegressionChoiceOpen(true);
            else setConfirmRegression(REGRESSION_DEFS[0]);
          }else if(id==="dungeonKey"){
            setState(s=>({...s,dungeonKeys:Math.max(0,(Number(s.dungeonKeys)||0)-1),dungeonAccessOpen:true}));
            setItemUseUp({id});
          }else if(id==="transmutationGrimoire"){
            const catalystUsed=state.alchemicalCatalystArmed&&itemQty("alchemicalCatalyst")>0;
            const minorCost=catalystUsed?3:5;
            setState(s=>{const inv={...(s.inventory||{})};if((Number(inv.minorElixir)||0)<minorCost||(Number(inv.transmutationGrimoire)||0)<1)return s;if(catalystUsed&&(Number(inv.alchemicalCatalyst)||0)<1)return s;inv.minorElixir=Math.max(0,(Number(inv.minorElixir)||0)-minorCost);inv.transmutationGrimoire=Math.max(0,(Number(inv.transmutationGrimoire)||0)-1);if(catalystUsed)inv.alchemicalCatalyst=Math.max(0,(Number(inv.alchemicalCatalyst)||0)-1);inv.supremeElixir=Math.max(0,(Number(inv.supremeElixir)||0)+1);return {...s,inventory:inv,alchemicalCatalystArmed:catalystUsed?false:s.alchemicalCatalystArmed};});
            enqueueItemLoot("supremeElixir","guaranteed");
            setItemUseUp({id,transmuted:true,catalystUsed,minorCost});
          }else if(id==="supremeElixir"){
            const expiresAt=Date.now()+ELIXIR_DURATION_MS;
            setState(s=>{if(s.activeElixir||s.suspendedElixir)return s;return {...s,inventory:{...(s.inventory||{}),supremeElixir:Math.max(0,(Number(s.inventory&&s.inventory.supremeElixir)||0)-1)},activeElixir:{kind:id,pct:it.pct,startedAt:Date.now(),expiresAt}};});
            setItemUseUp({id,pct:it.pct,global:true});
          }else if(id==="destinyCompass"){
            setCompassStatChoice(true);
          }else if(id==="mysteryMap"){
            setDungeonMapStatChoice(true);
          }else if(id==="etherStopper"){
            if(state.suspendedElixir){
              setState(s=>{const cur=s.suspendedElixir;if(!cur||s.activeElixir)return s;const t=Date.now();return {...s,suspendedElixir:null,activeElixir:buildResumedElixir(cur,t)};});
              setItemUseUp({id,resumed:true});
            }else{
              setState(s=>{const el=s.activeElixir;if(!el||Date.now()>=(el.expiresAt||0)||(Number(s.inventory&&s.inventory.etherStopper)||0)<1)return s;const t=Date.now();return {...s,inventory:{...(s.inventory||{}),etherStopper:Math.max(0,(Number(s.inventory&&s.inventory.etherStopper)||0)-1)},activeElixir:null,suspendedElixir:buildSuspendedElixir(el,t)};});
              setItemUseUp({id,paused:true});
            }
          }else if(id==="rerollToken"){
            invokeExtraUrgentQuest();
          }else if(id==="alchemicalCatalyst"){
            setState(s=>({...s,alchemicalCatalystArmed:true}));
            setItemUseUp({id,armed:true});
          }else if(id==="masterContract"){
            setState(s=>({...s,inventory:{...(s.inventory||{}),masterContract:Math.max(0,(Number(s.inventory&&s.inventory.masterContract)||0)-1)},masterContractArmed:true}));setItemUseUp({id});
          }else if(id==="debtAcknowledgement"){
            setSpecialItemChoice({type:"debtAcknowledgement"});
          }else if(id==="recoveryOintment"){
            setSpecialItemChoice({type:"recoveryOintment"});
          }else if(id==="recordHammer"||id==="invisibilityCape"){
            setSpecialItemChoice({type:id});
          }else if(id==="teleportCrystal"){
            const t=Date.now();
            const tpl=BREACH_POOL.length?BREACH_POOL[Math.floor(Math.random()*BREACH_POOL.length)]:null;
            if(tpl){
              setState(s=>{
                if(s.activeBreach||s.alliedGiftPending||(Number(s.inventory&&s.inventory.teleportCrystal)||0)<1)return s;
                return {
                  ...s,
                  inventory:{...(s.inventory||{}),teleportCrystal:Math.max(0,(Number(s.inventory&&s.inventory.teleportCrystal)||0)-1)},
                  activeBreach:{...tpl,breachId:"allied_breach_"+t,progress:0,startedAt:t,expiresAt:t+72*60*60*1000,completedAt:null,ruptureBoss:null,isBreach:true,alliedTeleport:true}
                };
              });
              setItemUseUp({id:"teleportCrystal",alliedTeleport:true,breachName:tpl.name});
            }
          }else setElixirStatChoice({id});
        }},eraseRecord?"Effacer":id==="teleportCrystal"?"Briser":id==="dungeonKey"||id==="transmutationGrimoire"||id==="supremeElixir"?"Oui":"Continuer")
      )
    ));
  }
  function CompassStatModal(){
    if(!compassStatChoice)return null;
    const choices=["Sante","Force","Esprit","Endurance","Agilite","Discipline"];
    return h("div",{class:"modal-ov"},h("div",{class:"modal",style:"max-width:410px;width:calc(100% - 28px)"},
      h("div",{class:"mtitle"},"ORIENTER LA BOUSSOLE"),
      h("div",{style:"font-size:11px;color:var(--td);line-height:1.55;margin-bottom:12px"},"Choisissez la statistique de la prochaine quête urgente. La quête précise restera aléatoire et le cycle anti-répétition actuel ne sera pas modifié."),
      h("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:8px"},choices.map(stat=>h("button",{key:stat,onClick:()=>{
        setCompassStatChoice(false);
        setConfirmTargetedItemUse({type:"destinyCompass",stat});
      },style:"padding:11px;border-radius:9px;border:1px solid "+STAT_COLOR[stat]+"88;background:"+STAT_COLOR[stat]+"12;color:"+STAT_COLOR[stat]+";font-family:Orbitron,sans-serif;font-size:10px;cursor:pointer"},STAT_LBL[stat]||stat))),
      h("button",{onClick:()=>setCompassStatChoice(false),style:"width:100%;margin-top:12px;padding:10px;border-radius:9px;border:1px solid rgba(255,255,255,.08);background:transparent;color:var(--td);font-family:Orbitron,sans-serif;cursor:pointer"},"Annuler")
    ));
  }

  function DungeonMapStatModal(){
    if(!dungeonMapStatChoice)return null;
    const choices=[...new Set(DUNGEONS.map(d=>d.stat))].filter(stat=>STATS.includes(stat));
    return h("div",{class:"modal-ov"},h("div",{class:"modal",style:"max-width:410px;width:calc(100% - 28px)"},
      h("div",{class:"mtitle"},"DÉPLIER LA CARTE"),
      h("div",{style:"font-size:11px;color:var(--td);line-height:1.55;margin-bottom:12px"},"Choisissez la statistique du prochain donjon. Si plusieurs donjons correspondent à cette statistique, le donjon précis restera tiré au sort."),
      h("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:8px"},choices.map(stat=>h("button",{key:stat,onClick:()=>{
        setDungeonMapStatChoice(false);
        setConfirmTargetedItemUse({type:"mysteryMap",stat});
      },style:"padding:11px;border-radius:9px;border:1px solid "+STAT_COLOR[stat]+"88;background:"+STAT_COLOR[stat]+"12;color:"+STAT_COLOR[stat]+";font-family:Orbitron,sans-serif;font-size:10px;cursor:pointer"},STAT_LBL[stat]||stat))),
      h("button",{onClick:()=>setDungeonMapStatChoice(false),style:"width:100%;margin-top:12px;padding:10px;border-radius:9px;border:1px solid rgba(255,255,255,.08);background:transparent;color:var(--td);font-family:Orbitron,sans-serif;cursor:pointer"},"Annuler")
    ));
  }

  function ElixirStatModal(){
    if(!elixirStatChoice)return null;
    const id=elixirStatChoice.id,it=INVENTORY_ITEMS[id];
    const choices=ELIXIR_STATS;
    return h("div",{class:"modal-ov"},h("div",{class:"modal",style:"max-width:390px;width:calc(100% - 28px)"},
      h("div",{class:"mtitle"},"CHOISIR UNE STATISTIQUE"),
      h("div",{style:"font-size:11px;color:var(--td);line-height:1.5;margin-bottom:12px"},"Appliquer "+Math.round(it.pct*100)+" % d’XP supplémentaires pendant 24 h."),
      h("div",{style:"display:grid;grid-template-columns:1fr 1fr;gap:8px"},choices.map(stat=>h("button",{key:stat,onClick:()=>{setElixirStatChoice(null);setConfirmElixirUse({id,stat})},style:"padding:11px;border-radius:9px;border:1px solid "+STAT_COLOR[stat]+"88;background:"+STAT_COLOR[stat]+"12;color:"+STAT_COLOR[stat]+";font-family:Orbitron,sans-serif;font-size:10px;cursor:pointer"},STAT_LBL[stat]||stat))),
      h("button",{onClick:()=>setElixirStatChoice(null),style:"width:100%;margin-top:12px;padding:10px;border-radius:9px;border:1px solid rgba(255,255,255,.08);background:transparent;color:var(--td);font-family:Orbitron,sans-serif;cursor:pointer"},"Annuler")
    ));
  }
  function ConfirmElixirModal(){
    if(!confirmElixirUse)return null;
    const {id,stat}=confirmElixirUse,it=INVENTORY_ITEMS[id],c=STAT_COLOR[stat]||rank.color;
    return h("div",{class:"ruov",style:"--rc:"+c+";--rg:"+c+"66"},h("div",{class:"rucont",style:"width:min(500px,calc(100vw - 34px));background:rgba(15,15,18,.97);border:1px solid "+c+"88;border-radius:18px;padding:22px;box-shadow:0 0 30px "+c+"22"},
      h("div",{class:"ruevol",style:"color:"+c},"CONFIRMATION"),
      h("div",{style:"font-family:Orbitron,sans-serif;font-size:18px;font-weight:900;color:#fff;text-align:center;line-height:1.45;max-width:350px"},"Appliquer +"+Math.round(it.pct*100)+" % d’XP à "+(STAT_LBL[stat]||stat)+" pendant 24 h ?"),
      h("div",{style:"display:flex;gap:10px;margin-top:22px"},
        h("button",{class:"rudis",style:"min-width:110px;--rc:#64748b;--rg:rgba(100,116,139,.5)",onClick:()=>setConfirmElixirUse(null)},"Annuler"),
        h("button",{class:"rudis",style:"min-width:110px;--rc:"+c+";--rg:"+c+"66",onClick:()=>{
          const expiresAt=Date.now()+ELIXIR_DURATION_MS;
          setState(s=>{if(s.activeElixir||s.suspendedElixir)return s;return {...s,inventory:{...(s.inventory||{}),[id]:Math.max(0,(Number(s.inventory&&s.inventory[id])||0)-1)},activeElixir:{kind:id,stat,pct:it.pct,startedAt:Date.now(),expiresAt}};});
          setConfirmElixirUse(null);setItemUseUp({id,stat,pct:it.pct});
        }},"Consommer")
      )
    ));
  }

  function recordOptions(){
    return buildRecordOptions({
      questDefs:DEFS,
      dailyLog:state.dailyLog,
      exerciseRotationByDay:state.exerciseRotationByDay
    });
  }
  function SpecialItemChoiceModal(){
    if(!specialItemChoice)return null;const type=specialItemChoice.type;
    let options=[];
    if(type==="recordHammer")options=recordOptions().map(x=>({id:x.obj.id,label:x.obj.icon+" "+x.obj.name+" — "+fmtNum(x.best)+" "+x.obj.unit,obj:x.obj,best:x.best}));
    if(type==="debtAcknowledgement")options=objs.filter(o=>o.daily&&!o.optional&&isDebtEligibleQuest(o)&&(Number(tLog[o.id])||0)<getEffectiveTarget(o.id)).map(o=>({id:o.id,label:o.icon+" "+o.name+" — "+fmtNum(getEffectiveTarget(o.id)-(Number(tLog[o.id])||0))+" "+o.unit+" manquants",obj:o}));
    if(type==="recoveryOintment"){
      options=objs.filter(o=>o.daily&&(Number(tLog[o.id])||0)<getEffectiveTarget(o.id)).map(o=>({id:"regular:"+o.id,label:o.icon+" "+o.name,obj:o,questKind:"regular"}));
    }
    if(type==="invisibilityCape"||type==="cape"){const d=activeDungeon;options=d?d.rooms.slice(0,-1).map((r,i)=>!(d.completedRooms||[]).includes(i)?{id:i,label:(i+1)+". "+r.name}:null).filter(Boolean):[];}
    return h("div",{class:"modal-ov"},h("div",{class:"modal",style:"max-width:410px;width:calc(100% - 28px)"},h("div",{class:"mtitle"},type==="recordHammer"?"CHOISIR UN RECORD":type==="debtAcknowledgement"?"CRÉER UNE DETTE":type==="recoveryOintment"?"CHOISIR UNE QUÊTE":"PASSER UNE SALLE"),h("div",{style:"display:flex;flex-direction:column;gap:8px;margin-top:12px"},options.map(x=>h("button",{key:x.id,onClick:()=>{
      setSpecialItemChoice(null);
      setConfirmTargetedItemUse({type:type==="cape"?"invisibilityCape":type,choice:x});
    },style:"padding:11px;border-radius:9px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:var(--tx);font-family:Orbitron,sans-serif;font-size:9px"},x.label))),!options.length&&h("div",{style:"font-size:11px;color:var(--td);text-align:center;padding:10px"},"Aucun choix disponible."),h("button",{onClick:()=>setSpecialItemChoice(null),style:"width:100%;margin-top:12px;padding:10px"},"Annuler")));
  }
  function ContractChoiceModal(){if(!contractDungeonChoice)return null;const choices=[["x1.5","Surcharge · objectifs multipliés par 1,5"],["sealedPath","Chemin scellé · salles obligatoirement dans l’ordre"],["noEscape","Sans échappatoire · aucun objet permettant d’éviter ou de faciliter une salle"]];return h("div",{class:"modal-ov"},h("div",{class:"modal",style:"max-width:410px;width:calc(100% - 28px)"},h("div",{class:"mtitle"},"CONTRAT DU MAÎTRE"),h("div",{style:"font-size:11px;color:var(--td);line-height:1.5;margin-bottom:12px"},"Choisissez une contrainte. La récompense finale du donjon augmentera de 20 %."),choices.map(([id,label])=>h("button",{key:id,onClick:()=>{const dg=contractDungeonChoice;setContractDungeonChoice(null);setConfirmTargetedItemUse({type:"masterContract",dungeonId:dg,constraint:id,label});},style:"width:100%;margin-top:8px;padding:11px;border-radius:9px;border:1px solid #f59e0b66;background:#f59e0b0d;color:#f59e0b;font-family:Orbitron,sans-serif;font-size:9px"},label)),h("button",{onClick:()=>setContractDungeonChoice(null),style:"width:100%;margin-top:12px;padding:10px"},"Annuler")));}
  function ConfirmTargetedItemUseModal(){
    if(!confirmTargetedItemUse)return null;
    const pending=confirmTargetedItemUse;
    const type=pending.type;
    const choice=pending.choice||null;
    const color=(type==="destinyCompass"||type==="mysteryMap")?(STAT_COLOR[pending.stat]||rank.color):type==="masterContract"?"#f59e0b":rank.color;

    let text="";
    let confirmLabel="Confirmer";

    if(type==="debtAcknowledgement"){
      text="Créer une dette sur « "+choice.obj.name+" » pour "+fmtNum(getEffectiveTarget(choice.obj.id)-(Number(tLog[choice.obj.id])||0))+" "+choice.obj.unit+" manquants ?";
      confirmLabel="Créer la dette";
    }else if(type==="recordHammer"){
      text="Choisir « "+choice.obj.name+" » comme record officiel à dépasser avant la fin de la semaine ?";
      confirmLabel="Marquer ce record";
    }else if(type==="destinyCompass"){
      text="Orienter la prochaine quête urgente vers la statistique "+(STAT_LBL[pending.stat]||pending.stat)+" ?";
      confirmLabel="Orienter";
    }else if(type==="mysteryMap"){
      text="Choisir "+(STAT_LBL[pending.stat]||pending.stat)+" comme statistique du prochain donjon ?";
      confirmLabel="Choisir";
    }else if(type==="invisibilityCape"){
      text="Utiliser la Potion d’invisibilité éphémère pour traverser la salle « "+choice.label.replace(/^\d+\.\s*/,"")+" » sans gagner son XP ?";
      confirmLabel="Passer la salle";
    }else if(type==="recoveryOintment"){
      text="Utiliser l’Onguent de récupération pour valider « "+choice.obj.name+" » sans gagner d’XP ?";
      confirmLabel="Passer la quête";
    }else if(type==="masterContract"){
      text="Lancer ce donjon avec la contrainte « "+pending.label+" » et une récompense finale augmentée de 20 % ?";
      confirmLabel="Signer le contrat";
    }

    function confirmTarget(){
      if(type==="debtAcknowledgement"){
        createQuestDebt(choice.obj);
      }else if(type==="recordHammer"){
        setState(s=>({...s,inventory:{...(s.inventory||{}),recordHammer:Math.max(0,(Number(s.inventory&&s.inventory.recordHammer)||0)-1)},recordChallenge:{questId:choice.obj.id,target:choice.best,week:wk,startedAt:Date.now(),name:choice.obj.name,icon:choice.obj.icon,unit:choice.obj.unit,stat:choice.obj.stat,rotationId:choice.obj.recordRotationId||null,family:choice.obj.recordFamily||null}}));
        setItemUseUp({id:"recordHammer"});
      }else if(type==="destinyCompass"){
        const stat=pending.stat;
        setState(s=>{const inv={...(s.inventory||{})};if((Number(inv.destinyCompass)||0)<1||s.urgentCompassStat)return s;inv.destinyCompass=Math.max(0,(Number(inv.destinyCompass)||0)-1);return {...s,inventory:inv,urgentCompassStat:stat};});
        setItemUseUp({id:"destinyCompass",statChosen:stat});
      }else if(type==="mysteryMap"){
        const stat=pending.stat;
        setState(s=>{const inv={...(s.inventory||{})};if((Number(inv.mysteryMap)||0)<1||s.dungeonMapStat)return s;inv.mysteryMap=Math.max(0,(Number(inv.mysteryMap)||0)-1);return {...s,inventory:inv,dungeonMapStat:stat};});
        setItemUseUp({id:"mysteryMap",dungeonStatChosen:stat});
      }else if(type==="invisibilityCape"){
        setState(s=>{const ad=s.activeDungeon;if(!ad||(Number(s.inventory&&s.inventory.invisibilityCape)||0)<1)return s;return {...s,inventory:{...(s.inventory||{}),invisibilityCape:Math.max(0,(Number(s.inventory&&s.inventory.invisibilityCape)||0)-1)},activeDungeon:{...ad,completedRooms:[...(ad.completedRooms||[]),Number(choice.id)].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b)}};});
        setItemUseUp({id:"invisibilityCape"});
      }else if(type==="recoveryOintment"){
        setState(s=>{
          const inv={...(s.inventory||{})};
          if((Number(inv.recoveryOintment)||0)<1)return s;
          inv.recoveryOintment=Math.max(0,(Number(inv.recoveryOintment)||0)-1);
          const target=getEffectiveTarget(choice.obj.id);
          const d={...s.dailyLog};
          d[today]={...(d[today]||{}),[choice.obj.id]:target};
          return {...s,inventory:inv,dailyLog:d,lastActiveDay:todayStr()};
        });
        setItemUseUp({id:"recoveryOintment",questName:choice.obj.name});
      }else if(type==="masterContract"){
        startDungeon(pending.dungeonId,pending.constraint);
      }
      setConfirmTargetedItemUse(null);
    }

    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+color+"66"},
      h("div",{class:"rucont",style:"width:min(500px,calc(100vw - 34px));background:rgba(15,15,18,.97);border:1px solid "+color+"88;border-radius:18px;padding:22px;box-shadow:0 0 30px "+color+"22"},
        h("div",{class:"ruevol",style:"color:"+color},"CONFIRMATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:16px;font-weight:900;color:#fff;text-align:center;line-height:1.5;max-width:360px"},text),
        h("div",{style:"display:flex;gap:10px;margin-top:22px;width:100%"},
          h("button",{class:"rudis",style:"flex:1;min-width:0;display:flex;align-items:center;justify-content:center;text-align:center;box-sizing:border-box;padding-left:10px;padding-right:10px;--rc:#64748b;--rg:rgba(100,116,139,.5)",onClick:()=>setConfirmTargetedItemUse(null)},"Annuler"),
          h("button",{class:"rudis",style:"flex:1;min-width:0;display:flex;align-items:center;justify-content:center;text-align:center;box-sizing:border-box;padding-left:10px;padding-right:10px;--rc:"+color+";--rg:"+color+"66",onClick:confirmTarget},confirmLabel)
        )
      )
    );
  }

  function Stats(){
    return h(StatsTab,{
      state,
      effectiveXp,
      rank,
      nextRank,
      rankPct,
      nextRankReq,
      nextRankStatsOk,
      rankBlocked,
      prestigeBlocked,
      ascReq,
      ascStatsOk,
      prestige,
      nextAscension,
      globalLevel,
      showRankReqStats,
      setShowRankReqStats
    });
  }

  // ─── ONGLET HISTORIQUE ────────────────────────────────────────────────

  function History(){
    return h(HistoryTab,{
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
      runRecordResetDay:RUN_RECORD_RESET_DAY
    });
  }

  // ─── REGLAGES ─────────────────────────────────────────────────────────

  function Settings(){
    if(!showSet)return null;
    const ordered=[...sortStat(objs.filter(o=>o.daily&&!o.optional)),...sortStat(objs.filter(o=>o.weekly)),...sortStat(objs.filter(o=>o.daily&&o.optional&&!o.bonusHidden))];
    function applyEdit(){
      setState(s=>{
        let xpD=0;
        const ndl={...s.dailyLog}, nwl={...s.weeklyLog}, nsx={...s.statXp};
        ordered.forEach(obj=>{
          const el=document.getElementById("cd_"+obj.id); if(!el)return;
          const nv=parseFloat(el.value.replace(",",".")); if(isNaN(nv)||nv<0)return;
          const ov=obj.weekly?(s.weeklyLog[wk]?.[obj.id]||0):(s.dailyLog[today]?.[obj.id]||0);
          const oxp=calcXp(obj,ov), nxp=calcXp(obj,nv);
          xpD+=nxp-oxp; nsx[obj.stat]=Math.max(0,(nsx[obj.stat]||0)+(nxp-oxp));
          if(obj.weekly)nwl[wk]={...(nwl[wk]||{}),[obj.id]:nv};
          else ndl[today]={...(ndl[today]||{}),[obj.id]:nv};
        });
        const ns={...s.stats}; Object.keys(nsx).forEach(st=>{ns[st]=getLvl(nsx[st]);});
        const nt=Math.max(0,s.totalXp+xpD);
        triggerProgressOverlay(s.totalXp,s.stats,nt,ns,100);
        return {...s,totalXp:nt,dailyLog:ndl,weeklyLog:nwl,statXp:nsx,stats:ns};
      });
      setShowSet(false);
    }
    return h("div",{class:"modal-ov",onClick:e=>{if(e.target===e.currentTarget){setShowSet(false);setConfirmReset(false);}}},
      h("div",{class:"modal"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:20px"},
          h("div",{class:"mtitle",style:"margin:0;line-height:1.2"},"Réglages"),
          h("button",{onClick:()=>{setShowSet(false);setConfirmReset(false);},style:"border:0;background:transparent;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:0;flex-shrink:0"},"×")
        ),
        h("div",{class:"msec"},
          h("div",{class:"mlbl"},"Corriger les données du jour"),
          ordered.map(obj=>{
            const cur=(obj.weekly)?(wLog[obj.id]||0):(tLog[obj.id]||0);
            return h("div",{key:obj.id,style:"display:flex;align-items:center;gap:8px;margin-bottom:8px"},
              QuestIcon(obj.id,obj.icon,14,"min-width:24px"),
              h("span",{style:"flex:1;font-size:13px"},exerciseFamilyLabel(obj.id,obj.name)),
              h("input",{id:"cd_"+obj.id,class:"min",type:"text",inputMode:"decimal",defaultValue:String(cur),style:"width:80px;margin:0;text-align:center"}),
              h("span",{style:"font-size:11px;color:var(--td);min-width:28px"},obj.unit)
            );
          }),
          h("button",{class:"mbtn mprim",style:"width:100%;margin-top:8px",onClick:applyEdit},"Appliquer")
        ),
        h("div",{class:"divider"}),
        h("div",{class:"msec"},
          h("div",{class:"mlbl"},"Sauvegarde / Restauration"),
          h("div",{class:"mrow",style:"margin-bottom:8px"},
            h("button",{class:"mbtn mprim",style:"flex:1",onClick:()=>{
              const json=JSON.stringify(exportSystemState(state));
              navigator.clipboard.writeText(json).then(()=>{
                setExportValue(json);
                setExportCopiedModal(true);
              }).catch(()=>{
                setExportValue(json);
                setExportManualModal(true);
              });
            }},"Exporter"),
            h("button",{class:"mbtn mprim",style:"flex:1",onClick:()=>{
              setImportValue("");
              setImportModal(true);
            }},"Importer")
          ),
          h("button",{class:"mbtn mprim",style:"width:100%",onClick:()=>{
            const json=JSON.stringify(exportSystemState(state),null,2);
            const blob=new Blob([json],{type:"application/json"});
            const url=URL.createObjectURL(blob);
            const a=document.createElement("a");
            const d=new Date();
            const dateStr=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
            a.href=url; a.download="kaizen-backup-"+dateStr+".json";
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }},"Télécharger fichier"),
          h("div",{style:"font-size:10px;color:var(--td);margin-top:6px;line-height:1.4"},
            "L'app conserve automatiquement 4 sauvegardes internes (rotation \u00e0 chaque modification). En cas de probl\u00e8me, fais un t\u00e9l\u00e9chargement r\u00e9gulier."
          )
        ),
        h("div",{class:"divider"}),
        h("div",{class:"msec"},
          h("div",{class:"mlbl"},"Actualiser l'application"),
          h("div",{style:"font-size:11px;color:var(--td);margin-bottom:10px;line-height:1.5"},"Si l'app ne se charge pas correctement, actualise pour recharger tous les scripts."),
          h("button",{class:"mbtn",style:"width:100%;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.2);color:var(--tx)",onClick:()=>window.location.reload(true)},"Actualiser l'app")
        ),

      )
    );
  }

  // ─── ANIMATION RANK UP ────────────────────────────────────────────────

  function triggerUrgentUp(sq,pairs){
    if(!sq || !pairs || !pairs.length) return;
    setTimeout(()=>setUrgentUp({
      title:sq.forceBreachClosed?"BRÈCHE REFERMÉE":sq.isRupture?"RUPTURE MAÎTRISÉE":(sq.isBreach?"BRÈCHE REFERMÉE":"QUÊTE URGENTE COMPLÉTÉE"),
      name:sq.name,
      color:rank.color||"#fbbf24",
      glow:rank.glow||"#fbbf2455",
      nameColor:STAT_COLOR[sq.stat]||rank.color||"#ef4444",
      rewards:pairs.map(p=>({
        xp:p.xp||0,
        stat:p.stat,
        label:STAT_LBL2[p.stat] || STAT_LBL[p.stat] || p.stat || ""
      }))
    }),300);
  }

  const GOLD = "#fbbf24";
  const congratsStyle = "font-family:Orbitron,sans-serif;font-size:clamp(20px,5.4vw,27px);font-weight:900;letter-spacing:3px;text-transform:uppercase;color:#ffffff;text-shadow:none";
  function NotificationHeader(){
    return h("div",{style:"display:grid;grid-template-columns:34px auto 34px;align-items:center;justify-content:center;margin-bottom:14px;width:100%"},
      h("span",{style:"font-family:Orbitron,sans-serif;font-size:clamp(21px,5.6vw,28px);font-weight:900;color:#ffffff;text-align:center;line-height:1"},"❕"),
      h("span",{style:congratsStyle},"NOTIFICATION"),
      h("span",{style:"width:34px"})
    );
  }

  function RankUp(){
    if(!rankUp)return null;
    const particles=Array.from({length:40},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*3,
      dur:1.2+Math.random()*2,
      size:2+Math.random()*4,
      cyan:Math.random()>0.7
    }));
    return h("div",{class:"ruov",style:"--rc:"+rankUp.color+";--rg:"+rankUp.glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.cyan?"rgba(74,222,128,0.6)":rankUp.color)+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:"+rankUp.color+";text-shadow:0 0 14px "+rankUp.glow},"ÉVOLUTION DE RANG"),
        h("div",{class:"rurank",style:"color:"+rankUp.color+";text-shadow:0 0 18px "+rankUp.glow,"data-r":"RANG "+rankUp.id},"RANG "+rankUp.id),
        h("button",{class:"rudis",onClick:()=>setRankUp(null)},"Continuer")
      )
    );
  }

  // ─── ANIMATION COMPLÉTION DES QUÊTES ──────────────────────────────────

  function CompletionUp(){
    if(!completionUp)return null;
    const color=rank.color||"#fbbf24";
    const glow=rank.glow||color+"55";
    const green="#4ade80";
    const particles=Array.from({length:40},(_,i)=>({
      id:i,left:Math.random()*100,delay:Math.random()*2.5,
      dur:1.1+Math.random()*1.8,size:2+Math.random()*4,
      accent:Math.random()>0.55
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"rgba(255,255,255,.75)":green)+";box-shadow:0 0 9px rgba(74,222,128,.55);animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"rulabel",style:"font-size:clamp(20px,5.5vw,32px);line-height:1.35;letter-spacing:2px;max-width:350px;color:"+green+";text-shadow:0 0 14px rgba(74,222,128,.55)"},completionUp.text),
        h("button",{class:"rudis",onClick:()=>setCompletionUp(null)},"Continuer")
      )
    );
  }

  // ─── ANIMATION STREAK BONUS ───────────────────────────────────────────

  function StreakUp(){
    if(!streakUp)return null;
    const color = streakUp.color || STAT_COLOR.Discipline || "#c084fc";
    const glow = streakUp.glow || color+"66";
    const particles=Array.from({length:38},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.5,
      dur:1.1+Math.random()*1.8,
      size:2+Math.random()*4,
      accent:Math.random()>0.58
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"rgba(255,255,255,0.7)":color)+";box-shadow:0 0 8px "+glow+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol"},streakUp.title || "STREAK BONUS !"),
        h("div",{class:"rurank","data-r":String(streakUp.streak||0)},String(streakUp.streak||0)),
        h("div",{class:"rulabel",style:"margin-top:10px;letter-spacing:3px"},"JOURS DE STREAK"),
        h("div",{class:"rulabel",style:"margin-top:10px;letter-spacing:2px;color:"+color},streakUp.subtitle || ("+"+(streakUp.xp||250)+" XP Discipline")),
        streakUp.detail&&h("div",{style:"margin-top:8px;font-size:11px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;text-transform:uppercase"},streakUp.detail),
        h("button",{class:"rudis",onClick:()=>setStreakUp(null)},"Continuer")
      )
    );
  }

  // ─── ANIMATION LEVEL UP ───────────────────────────────────────────────

  function DungeonUp(){
    if(!dungeonUp)return null;
    const color=dungeonUp.color||"#c084fc";
    const glow=color+"66";
    const particles=Array.from({length:46},(_,i)=>({id:i,left:Math.random()*100,delay:Math.random()*2.8,dur:1.2+Math.random()*2,size:2+Math.random()*4,accent:Math.random()>0.45}));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"#ffffff":color)+";box-shadow:0 0 8px "+glow+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"}))),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol"},dungeonUp.label||"DONJON TERMINÉ"),
        h("div",{class:"rurank",style:"font-size:"+(dungeonUp.rupture?"clamp(34px,10vw,60px)":"clamp(48px,16vw,82px)")+";letter-spacing:-1px;white-space:"+(dungeonUp.rupture?"normal":"nowrap")+";max-width:350px;line-height:1.05","data-r":dungeonUp.short},dungeonUp.short),
        dungeonUp.subtitle&&h("div",{class:"rulabel",style:"margin-top:9px;letter-spacing:2px;color:"+color},dungeonUp.subtitle),
        h("div",{class:"rulabel",style:"margin-top:10px;letter-spacing:3px;max-width:300px;line-height:1.35"},dungeonUp.reward),
        h("button",{class:"rudis",onClick:()=>setDungeonUp(null)},"Continuer")
      )
    );
  }

  function DungeonRuptureUp(){
    if(!ruptureUp)return null;
    const rarityColor=ruptureUp.ruptureColor||"#ef4444";
    const rankColor=rank.color||"#fbbf24";
    const rankGlow=rank.glow||rankColor+"55";
    const red="#ef4444";
    const particles=Array.from({length:52},(_,i)=>({id:i,left:Math.random()*100,delay:Math.random()*2.5,dur:1+Math.random()*1.8,size:2+Math.random()*5,accent:Math.random()>0.48}));
    return h("div",{class:"ruov",style:"--rc:"+rankColor+";--rg:"+rankGlow},
      h("div",{class:"ruparts"},particles.map(p=>h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"#ffffff":rarityColor)+";box-shadow:0 0 10px "+rarityColor+"88;animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"}))),
      h("div",{class:"rucont"},
        h("div",{class:"ruevol",style:"color:"+red+";text-shadow:0 0 18px rgba(239,68,68,.65)"},"⚠️ RUPTURE DE DONJON"),
        h("div",{class:"rurank",style:"--rc:"+red+";--rg:rgba(239,68,68,.75);color:"+red+";text-shadow:0 0 20px rgba(239,68,68,.75);font-size:clamp(34px,10vw,60px);letter-spacing:-1px;white-space:normal;max-width:350px;line-height:1.05;margin-top:10px","data-r":"☠️ "+ruptureUp.name},"☠️ "+ruptureUp.name),
        h("div",{class:"rulabel",style:"margin-top:12px;letter-spacing:3px;color:"+rarityColor},"BOSS DE RUPTURE"),
        h("button",{class:"rudis",style:"--rc:#ef4444;--rg:rgba(239,68,68,.65)",onClick:()=>setRuptureUp(null)},"Continuer")
      )
    );
  }

  function UrgentUp(){
    if(!urgentUp)return null;
    const color=urgentUp.color||"#fbbf24";
    const glow=urgentUp.glow||"#fbbf2455";
    const urgentTitle=String(urgentUp.name||"");
    const longestUrgentWord=urgentTitle.split(/\s+/).reduce((max,word)=>Math.max(max,word.length),0);
    const urgentTitleSize=longestUrgentWord>=15
      ? "clamp(23px,6.2vw,38px)"
      : urgentTitle.length>=24
        ? "clamp(25px,7vw,42px)"
        : urgentTitle.length>=17
          ? "clamp(28px,8vw,49px)"
          : "clamp(34px,10vw,62px)";
    const particles=Array.from({length:42},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.8,
      dur:1.1+Math.random()*1.8,
      size:2+Math.random()*4,
      accent:Math.random()>0.65
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?(urgentUp.nameColor||color):color)+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:"+((urgentUp.title==="BRÈCHE REFERMÉE"||urgentUp.title==="RUPTURE MAÎTRISÉE")?"#8dbbff":"#ef4444")+";text-shadow:0 0 16px "+((urgentUp.title==="BRÈCHE REFERMÉE"||urgentUp.title==="RUPTURE MAÎTRISÉE")?"rgba(141,187,255,.7)":"rgba(239,68,68,.7)")},urgentUp.title==="RUPTURE MAÎTRISÉE"?"RUPTURE MAÎTRISÉE !":urgentUp.title==="BRÈCHE REFERMÉE"?"BRÈCHE REFERMÉE !":"QUÊTE URGENTE COMPLÉTÉE !"),
        h("div",{class:"rurank",style:"--rc:"+(urgentUp.nameColor||color)+";--rg:"+(urgentUp.nameColor||color)+"66;color:"+(urgentUp.nameColor||color)+";text-shadow:0 0 18px "+(urgentUp.nameColor||color)+"66;font-size:"+urgentTitleSize+";letter-spacing:-1px;white-space:normal;width:calc(100vw - 32px);max-width:360px;line-height:1.08;overflow-wrap:anywhere;word-break:normal;hyphens:auto","data-r":urgentTitle},urgentTitle),
        h("div",{style:"margin-top:14px;display:flex;flex-direction:column;gap:6px;align-items:center"},
          (urgentUp.rewards||[]).map((r,i)=>{
            const rewardColor=STAT_COLOR[r.stat]||color;
            return h("div",{key:i,style:"font-family:Orbitron,sans-serif;font-size:clamp(14px,3.8vw,20px);letter-spacing:1.5px;line-height:1.3;color:"+rewardColor+";text-transform:uppercase;text-align:center"},("+"+r.xp+" XP "+r.label).trim());
          })
        ),
        h("button",{class:"rudis",style:"--rc:#ef4444;--rg:rgba(239,68,68,.65)",onClick:()=>setUrgentUp(null)},"Continuer")
      )
    );
  }

  function DungeonKeyLootUp(){
    if(!keyLootUp)return null;
    const rare=keyLootUp.kind==="rare";
    const color=rank.color||"#fbbf24";
    const glow=rank.glow||color+"66";
    const gold="#fbbf24";
    const headingColor=rare?gold:color;
    const particles=Array.from({length:54},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.5,
      dur:1.05+Math.random()*1.9,
      size:2+Math.random()*5,
      accent:Math.random()>0.38
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?gold:"#ffffff")+";box-shadow:0 0 10px "+(p.accent?gold+"99":glow)+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:"+headingColor+";text-shadow:0 0 16px "+(rare?gold+"99":glow)},rare?"DROP RARE OBTENU !":"OBJET OBTENU !"),
        h("div",{style:"position:relative;display:flex;align-items:center;justify-content:center;width:150px;height:150px;margin:8px 0 14px"},
          h("div",{style:"position:absolute;inset:18px;border-radius:50%;background:radial-gradient(circle,"+gold+"55 0%,"+gold+"20 42%,transparent 72%);filter:blur(5px);box-shadow:0 0 34px "+gold+"77"}),
          h("div",{style:"position:relative;z-index:1;filter:drop-shadow(0 0 14px "+gold+"aa);animation:ruPulse 1.8s ease-in-out infinite"},InventoryItemIcon("dungeonKey",112))
        ),
        h("div",{class:"rurank",style:"--rc:"+gold+";--rg:"+gold+"88;color:"+gold+";text-shadow:0 0 20px "+gold+"99;font-size:clamp(32px,9vw,52px);letter-spacing:-1px;white-space:normal;max-width:350px;line-height:1.05","data-r":"CLÉ DE DONJON"},"CLÉ DE DONJON"),
        h("button",{class:"rudis",style:"--rc:"+color+";--rg:"+glow,onClick:()=>setKeyLootUp(null)},"Continuer")
      )
    );
  }

  function RecordUp(){
    if(!recordUp)return null;
    const statColor=recordUp.color||"#fbbf24";
    const statGlow=recordUp.glow||statColor+"55";
    const color=recordUp.rankColor||rank.color||"#fbbf24";
    const glow=recordUp.rankGlow||rank.glow||color+"55";
    const particles=Array.from({length:42},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.5,
      dur:1.1+Math.random()*1.8,
      size:2+Math.random()*4,
      gold:Math.random()>0.35
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.gold?"#fbbf24":color)+";box-shadow:0 0 8px "+glow+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:"+color+";text-shadow:0 0 14px "+glow},(recordUp.title||"NOUVEAU RECORD")+" !"),
        h("div",{class:"rurank",style:"--rc:"+statColor+";--rg:"+statGlow+";color:"+statColor+";text-shadow:0 0 18px "+statGlow+";font-size:clamp(38px,11vw,64px);letter-spacing:-1px;white-space:normal;max-width:340px;line-height:1.05","data-r":recordUp.name},recordUp.name),
        h("div",{class:"rulabel",style:"margin-top:10px;letter-spacing:3px;color:"+color+";font-size:clamp(18px,5vw,28px)"},recordUp.value),
        h("button",{class:"rudis",onClick:()=>setRecordUp(null)},"Continuer")
      )
    );
  }

  function ConfirmDungeonChoice(){
    if(!confirmDungeonChoice)return null;
    const isEnter=confirmDungeonChoice.type==="enter";
    const color=isEnter ? "#f59e0b" : (confirmDungeonChoice.color||"var(--rc)");
    const title=isEnter ? "ENTRER DANS LE DONJON ?" : "ACTIVER CE DONJON ?";
    const main=isEnter ? null : ((confirmDungeonChoice.icon||"")+" "+(confirmDungeonChoice.title||"Donjon"));
    const desc=isEnter
      ? (state.dungeonMapStat
          ? "La Carte des profondeurs oriente ce lancement vers "+(STAT_LBL[state.dungeonMapStat]||state.dungeonMapStat)+". Le donjon sera tiré parmi ceux de cette statistique. Êtes-vous certain de vouloir entrer ?"
          : "La statistique sera tirée au sort, puis le donjon sera tiré parmi ceux de cette statistique. Êtes-vous certain de vouloir entrer ?")
      : "Ce choix consommera ton lancement de donjon du jour et comptera dans la limite hebdomadaire.";
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+color+"55;background:rgba(0,0,0,0.92)"},
      h("div",{class:"rucont",style:"width:min(330px,calc(100vw - 38px));background:rgba(15,15,18,0.96);border:1px solid "+color+"66;border-radius:18px;padding:20px;box-shadow:0 0 30px "+color+"22"},
        h("div",{class:"ruevol",style:"margin-bottom:10px;color:"+color},"CONFIRMATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:17px;font-weight:900;color:"+color+";letter-spacing:1px;text-transform:uppercase;text-align:center;line-height:1.25"},title),
        main&&h("div",{style:"font-size:14px;color:var(--tx);font-weight:800;text-align:center;margin-top:10px;line-height:1.35"},main),
        !isEnter&&h("div",{style:"font-size:10px;color:"+color+";font-family:Orbitron,sans-serif;text-align:center;margin-top:6px;letter-spacing:1px;text-transform:uppercase"},STAT_LBL[confirmDungeonChoice.stat]||confirmDungeonChoice.stat),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.5;text-align:center;margin-top:12px"},desc),
        h("div",{style:"display:flex;gap:10px;width:100%;margin-top:18px"},
          h("button",{
            onClick:()=>setConfirmDungeonChoice(null),
            style:"flex:1;padding:11px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },isEnter?"Non":"Annuler"),
          h("button",{
            onClick:()=>{
              const choice=confirmDungeonChoice;
              setConfirmDungeonChoice(null);
              if(choice.type==="enter"){ setDungeonChoiceOpen(false); startRandomDungeon(); }
              else { setDungeonChoiceOpen(false); startDungeon(choice.id); }
            },
            style:"flex:1;padding:11px;border-radius:9px;border:1px solid "+color+";background:"+color+"1a;color:"+color+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },isEnter?"Oui":"Activer")
        )
      )
    );
  }


  function ConfirmReroll(){
    if(!confirmRerollSq)return null;
    return h("div",{class:"ruov",style:"--rc:#f59e0b;--rg:#f59e0b55;background:rgba(0,0,0,0.92)"},
      h("div",{class:"rucont",style:"width:min(330px,calc(100vw - 38px));background:rgba(15,15,18,0.96);border:1px solid #f59e0b66;border-radius:18px;padding:20px;box-shadow:0 0 30px #f59e0b22"},
        h("div",{class:"ruevol",style:"margin-bottom:10px;color:#f59e0b"},"CONFIRMATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:18px;font-weight:900;color:#f59e0b;letter-spacing:1px;text-transform:uppercase;text-align:center;line-height:1.25"},"Relancer la quête urgente ?"),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.5;text-align:center;margin-top:12px"},
          "Cette action remplacera la quête actuelle par une nouvelle. Tu ne peux relancer qu'une seule quête urgente par jour."
        ),
        h("div",{style:"display:flex;gap:10px;width:100%;margin-top:18px"},
          h("button",{
            onClick:()=>setConfirmRerollSq(null),
            style:"flex:1;padding:11px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Annuler"),
          h("button",{
            onClick:()=>{const sq=confirmRerollSq;setConfirmRerollSq(null);rerollSq(sq);},
            style:"flex:1;padding:11px;border-radius:9px;border:1px solid #f59e0b;background:rgba(245,158,11,0.1);color:#f59e0b;font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Relancer")
        )
      )
    );
  }


  function RegressionChoiceModal(){
    if(!regressionChoiceOpen)return null;
    return h("div",{class:"modal-ov",onClick:e=>{if(e.target===e.currentTarget)setRegressionChoiceOpen(false)}},
      h("div",{class:"modal",style:"max-width:410px;width:calc(100% - 28px)"},
        h("div",{class:"mtitle"},"CHOISIR UNE RÉGRESSION"),
        h("div",{style:"display:flex;flex-direction:column;gap:8px;margin-top:12px"},REGRESSION_DEFS.map(reg=>
          h("button",{key:reg.id,onClick:()=>{setRegressionChoiceOpen(false);setConfirmRegression(reg)},style:"padding:12px;border-radius:9px;border:1px solid #ef444466;background:rgba(239,68,68,.05);color:var(--tx);text-align:left;cursor:pointer"},
            h("div",{style:"display:flex;align-items:center;gap:9px"},
              h("span",{style:"font-size:18px"},reg.icon),
              h("div",null,
                h("div",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:#ef4444;text-transform:uppercase"},reg.name),
                h("div",{style:"font-size:10px;color:var(--td);margin-top:4px"},"−"+reg.statPenalty.toLocaleString("fr-FR")+" XP par statistique · −"+reg.globalPenalty.toLocaleString("fr-FR")+" XP global")
              )
            )
          )
        )),
        h("button",{onClick:()=>setRegressionChoiceOpen(false),style:"width:100%;margin-top:12px;padding:10px;border-radius:9px;border:1px solid rgba(255,255,255,.08);background:transparent;color:var(--td);font-family:Orbitron,sans-serif;cursor:pointer"},"Annuler")
      )
    );
  }

  function ConfirmRegressionModal(){
    if(!confirmRegression)return null;
    const color="#ef4444";
    const regression=(confirmRegression&&confirmRegression.id)?confirmRegression:REGRESSION_DEF;
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+color+"55;background:rgba(0,0,0,.92)",onClick:e=>{if(e.target===e.currentTarget)setConfirmRegression(false);}},
      h("div",{class:"rucont",style:"width:min(500px,calc(100vw - 34px));background:rgba(15,15,18,.97);border:1px solid "+color+"88;border-radius:18px;padding:22px"},
        h("div",{class:"ruevol",style:"color:"+color},"CONFIRMATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:18px;font-weight:900;color:"+color+";letter-spacing:1px;text-transform:uppercase;text-align:center;line-height:1.25;margin-top:8px"},"Confirmer la régression ?"),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.55;text-align:center;margin-top:12px"},
          "Le même malus sera répercuté sur les deux compteurs : −"+regression.statPenalty.toLocaleString("fr-FR")+" XP sur chacune des six statistiques et −"+regression.globalPenalty.toLocaleString("fr-FR")+" XP sur l’XP globale."
        ),
        h("div",{style:"font-size:11px;color:#ef4444;line-height:1.45;text-align:center;margin-top:9px;font-family:Orbitron,sans-serif"},"Cette action est irréversible."),
        h("div",{style:"display:flex;gap:10px;width:100%;margin-top:18px"},
          h("button",{onClick:()=>setConfirmRegression(false),style:"flex:1;padding:12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1px;text-transform:uppercase;cursor:pointer"},"Annuler"),
          h("button",{onClick:applyRegression,style:"flex:1;padding:12px;border-radius:9px;border:1px solid "+color+";background:"+color+"18;color:"+color+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1px;text-transform:uppercase;cursor:pointer"},"Appliquer le malus")
        )
      )
    );
  }

  function RegressionUp(){
    if(!regressionUp)return null;
    const color="#ef4444";
    const glow="rgba(239,68,68,.72)";
    const particles=Array.from({length:46},(_,i)=>({
      id:i,left:Math.random()*100,delay:Math.random()*2.6,
      dur:1.05+Math.random()*1.8,size:2+Math.random()*5,accent:Math.random()>0.58
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow+";background:rgba(0,0,0,.94)"},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"#7f1d1d":color)+";box-shadow:0 0 10px "+glow+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont",style:"color:"+color},
        h("div",{class:"ruevol",style:"color:"+color+";text-shadow:0 0 18px "+glow+";font-size:clamp(21px,6vw,31px);letter-spacing:2px"},"☠️ REGRESSION"),
        h("div",{style:"max-width:340px;margin-top:16px;font-size:13px;line-height:1.55;text-align:center;color:"+color+";font-family:Orbitron,sans-serif"},
          "Vous avez succombé à la tentation, une pénalité vous est imposée :"
        ),
        h("div",{style:"margin-top:17px;font-family:Orbitron,sans-serif;font-size:clamp(20px,6vw,31px);font-weight:900;line-height:1.45;letter-spacing:1px;text-align:center;color:"+color+";text-shadow:0 0 14px "+glow},
          h("div",null,"-2000XP / STAT"),
          h("div",null,"-12000XP GLOBAL")
        ),
        h("button",{class:"rudis",style:"--rc:"+color+";--rg:"+glow+";color:"+color,onClick:()=>setRegressionUp(false)},"Continuer")
      )
    );
  }

  function ConfirmDebtModal(){
    if(!confirmDebt)return null;
    const obj=confirmDebt.obj;
    const color=STAT_COLOR[obj.stat]||"#f59e0b";
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+color+"55;background:rgba(0,0,0,.92)",onClick:e=>{if(e.target===e.currentTarget)setConfirmDebt(null);}},
      h("div",{class:"rucont",style:"width:min(500px,calc(100vw - 34px));background:rgba(15,15,18,.97);border:1px solid "+color+"88;border-radius:18px;padding:22px"},
        h("div",{class:"ruevol",style:"color:"+color},"CRÉER UNE DETTE ?"),
        h("div",{style:"font-size:15px;color:var(--tx);font-weight:800;margin-top:10px;text-align:center"},obj.name+" · "+fmtNum(confirmDebt.missing)+" "+obj.unit),
        h("div",{style:"font-size:11px;color:var(--td);line-height:1.5;text-align:center;margin-top:10px"},"La quantité manquante sera ajoutée à demain et devra être remboursée avant le reset suivant. Cette dette ne pourra pas être reportée."),
        h("div",{style:"display:flex;gap:10px;width:100%;margin-top:18px"},
          h("button",{onClick:()=>setConfirmDebt(null),style:"flex:1;padding:12px;border-radius:9px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px"},"Annuler"),
          h("button",{onClick:()=>createQuestDebt(obj),style:"flex:1;padding:12px;border-radius:9px;border:1px solid "+color+";background:"+color+"22;color:"+color+";font-family:Orbitron,sans-serif;font-size:10px"},"Confirmer")
        )
      )
    );
  }

  function DebtUp(){
    if(!debtUp)return null;
    const color=debtUp.color||"#f59e0b";
    const glow=debtUp.glow||color+"66";
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol"},"DETTE REMBOURSÉE"),
        h("div",{class:"rulabel",style:"margin-top:10px;font-size:clamp(18px,5vw,28px);color:"+color},debtUp.name),
        h("div",{style:"margin-top:12px;display:flex;flex-direction:column;gap:5px"},
          (debtUp.rewards||[]).map((r,i)=>h("div",{key:i,class:"rulabel",style:"color:"+color},"+"+r.xp+" XP "+(STAT_LBL2[r.stat]||r.stat)))
        ),
        h("div",{class:"rulabel",style:"margin-top:10px;color:#4ade80"},"STREAK PRÉSERVÉ"),
        h("button",{class:"rudis",onClick:()=>setDebtUp(null)},"Continuer")
      )
    );
  }

  function ImportModal(){
    if(!importModal)return null;
    const color = rank.color;
    const soft = color + "33";
    const border = color + "99";
    function close(){
      setImportModal(false);
      setImportValue("");
    }
    function doImport(){
      const json=(importValue||"").trim();
      if(!json)return;
      try{
        const imported=JSON.parse(json);
        const cleaned=cleanSystemState(imported);
        setState(s=>({...s,...cleaned,objectives:DEFS}));
        close();
        setShowSet(false);
        spawnFloat("✅ Restauré !");
      }catch(_){
        const id=Date.now()+Math.random();
        setFloats(f=>[...f,{id,y:"38%",txt:"❌ Données invalides"}]);
        setTimeout(()=>setFloats(f=>f.filter(p=>p.id!==id)),1800);
      }
    }
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+rank.glow+";background:rgba(0,0,0,0.92)",onClick:e=>{if(e.target===e.currentTarget)close();}},
      h("div",{class:"rucont",style:"width:min(560px,calc(100vw - 34px));background:rgba(15,15,18,0.96);border:1px solid "+border+";border-radius:18px;padding:22px;box-shadow:none"},
        h("div",{class:"ruevol",style:"margin-bottom:10px;color:"+color},"IMPORTATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:clamp(22px,6vw,36px);font-weight:900;color:"+color+";letter-spacing:1px;text-transform:uppercase;text-align:center;line-height:1.15"},"Importer des données"),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.5;text-align:center;margin-top:12px"},
          "Colle ici les données exportées de ton Système."
        ),
        h("textarea",{
          value:importValue,
          onInput:e=>setImportValue(e.currentTarget.value),
          placeholder:"Données de sauvegarde...",
          spellCheck:false,
          style:"width:100%;height:170px;margin-top:18px;resize:vertical;border-radius:10px;border:1px solid "+border+";background:rgba(255,255,255,0.05);color:var(--tx);padding:12px;font-size:12px;line-height:1.45;outline:none;box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace"
        }),
        h("div",{style:"display:flex;gap:10px;width:100%;margin-top:18px"},
          h("button",{
            onClick:close,
            style:"flex:1;padding:12px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Annuler"),
          h("button",{
            onClick:doImport,
            style:"flex:1;padding:12px;border-radius:9px;border:1px solid "+color+";background:"+soft+";color:"+color+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Importer")
        )
      )
    );
  }

  function ExportCopiedModal(){
    if(!exportCopiedModal)return null;
    const color = rank.color;
    const soft = color + "33";
    const border = color + "99";
    function close(){ setExportCopiedModal(false); }
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+rank.glow+";background:rgba(0,0,0,0.92)",onClick:e=>{if(e.target===e.currentTarget)close();}},
      h("div",{class:"rucont",style:"width:min(470px,calc(100vw - 34px));background:rgba(15,15,18,0.96);border:1px solid "+border+";border-radius:18px;padding:22px;box-shadow:none"},
        h("div",{class:"ruevol",style:"margin-bottom:10px;color:"+color},"EXPORTATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:clamp(22px,6vw,34px);font-weight:900;color:"+color+";letter-spacing:1px;text-transform:uppercase;text-align:center;line-height:1.15"},"Données copiées"),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.5;text-align:center;margin-top:12px"},
          "Tes données ont bien été copiées dans le presse-papiers."
        ),
        h("div",{style:"display:flex;justify-content:flex-end;gap:10px;width:100%;margin-top:18px"},
          h("button",{
            onClick:close,
            style:"min-width:170px;padding:12px 18px;border-radius:9px;border:1px solid "+color+";background:"+soft+";color:"+color+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Fermer")
        )
      )
    );
  }

  function ExportManualModal(){
    if(!exportManualModal)return null;
    const color = rank.color;
    const soft = color + "33";
    const border = color + "99";
    function close(){
      setExportManualModal(false);
      setExportValue("");
    }
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+rank.glow+";background:rgba(0,0,0,0.92)",onClick:e=>{if(e.target===e.currentTarget)close();}},
      h("div",{class:"rucont",style:"width:min(560px,calc(100vw - 34px));background:rgba(15,15,18,0.96);border:1px solid "+border+";border-radius:18px;padding:22px;box-shadow:none"},
        h("div",{class:"ruevol",style:"margin-bottom:10px;color:"+color},"EXPORTATION"),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:clamp(22px,6vw,36px);font-weight:900;color:"+color+";letter-spacing:1px;text-transform:uppercase;text-align:center;line-height:1.15"},"Copie manuelle"),
        h("div",{style:"font-size:12px;color:var(--td);line-height:1.5;text-align:center;margin-top:12px"},
          "Ton navigateur n'a pas pu copier automatiquement. Copie le texte ci-dessous."
        ),
        h("textarea",{
          value:exportValue,
          readOnly:true,
          spellCheck:false,
          style:"width:100%;height:170px;margin-top:18px;resize:vertical;border-radius:10px;border:1px solid "+border+";background:rgba(255,255,255,0.05);color:var(--tx);padding:12px;font-size:12px;line-height:1.45;outline:none;box-sizing:border-box;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace"
        }),
        h("div",{style:"display:flex;gap:10px;width:100%;margin-top:18px"},
          h("button",{
            onClick:close,
            style:"flex:1;padding:12px;border-radius:9px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.03);color:var(--td);font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Fermer"),
          h("button",{
            onClick:e=>{ e.currentTarget.parentNode.parentNode.querySelector('textarea').select(); },
            style:"flex:1;padding:12px;border-radius:9px;border:1px solid "+color+";background:"+soft+";color:"+color+";font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer"
          },"Tout sélectionner")
        )
      )
    );
  }


  function StatDecadeUp(){
    if(!statDecadeUp)return null;
    const color = statDecadeUp.color || "#fbbf24";
    const glow = statDecadeUp.glow || color+"66";
    const label = String(statDecadeUp.label||statDecadeUp.stat||"STAT").toUpperCase();
    const particles=Array.from({length:34},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.4,
      dur:1.1+Math.random()*1.7,
      size:2+Math.random()*4,
      accent:Math.random()>0.6
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"rgba(255,255,255,0.65)":color)+";box-shadow:0 0 8px "+glow+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:"+rank.color+";text-shadow:0 0 14px "+rank.glow},"STAT LEVEL UP !"),
        h("div",{
          class:"rurank",
          style:"--rc:"+color+";--rg:"+glow+";color:"+color+";text-shadow:0 0 18px "+glow+";font-size:clamp(38px,12vw,68px);letter-spacing:-1px;white-space:normal;max-width:350px;line-height:1.05",
          "data-r":label
        },label),
        h("div",{class:"rulabel",style:"margin-top:10px;letter-spacing:3px;color:"+rank.color},"NIVEAU "+statDecadeUp.level),
        h("button",{class:"rudis",style:"--rc:"+rank.color+";--rg:"+rank.glow,onClick:()=>setStatDecadeUp(null)},"Continuer")
      )
    );
  }

  function LevelUp(){
    if(!levelUp)return null;
    const color = levelUp.color || rank.color;
    const glow = levelUp.glow || rank.glow;
    const particles=Array.from({length:34},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.4,
      dur:1.1+Math.random()*1.7,
      size:2+Math.random()*4,
      accent:Math.random()>0.65
    }));
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?"rgba(255,255,255,0.65)":color)+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:"+color+";text-shadow:0 0 14px "+glow},"LEVEL UP !"),
        h("div",{class:"rurank",style:"color:"+color+";text-shadow:0 0 18px "+glow+";font-size:clamp(34px,10vw,58px);letter-spacing:-1px;white-space:nowrap;max-width:calc(100vw - 52px);line-height:1.05","data-r":"NIVEAU "+levelUp.level},"NIVEAU "+levelUp.level),
        h("button",{class:"rudis",onClick:()=>setLevelUp(null)},"Continuer")
      )
    );
  }

  // ─── ANIMATION PRESTIGE ───────────────────────────────────────────────

  function PrestigeUp(){
    if(!prestigeUp)return null;
    const particles=Array.from({length:40},(_,i)=>({id:i,left:Math.random()*100,delay:Math.random()*3,dur:1.2+Math.random()*2,size:2+Math.random()*4}));
    const stars=Array.from({length:30},(_,i)=>({id:i,left:Math.random()*100,top:Math.random()*100,delay:Math.random()*4,dur:2+Math.random()*3}));
    return h("div",{class:"puov"},
      h("div",{class:"pubg",style:"pointer-events:none"}),
      h("div",{class:"pustars",style:"pointer-events:none"},stars.map(s=>h("div",{key:s.id,class:"pustar",style:"left:"+s.left+"%;top:"+s.top+"%;animation-delay:"+s.delay+"s;animation-duration:"+s.dur+"s"}))),
      h("div",{class:"puparts",style:"pointer-events:none"},particles.map(p=>h("div",{key:p.id,class:"pupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(Math.random()>.6?"#c084fc":"#a855f7")+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"}))),
      h("div",{class:"pucont"},
        h(NotificationHeader,null),
        h("div",{class:"puatom"},"\u269B\uFE0F"),
        h("div",{class:"pubadge"},"Ascension "+ROMAN[prestigeUp-1]),
        h("button",{class:"pudis",onClick:()=>setPrestigeUp(null)},"Continuer")
      ),
      h("div",{class:"puline",style:"pointer-events:none"})
    );
  }

  // ─── ONGLET CODEX ─────────────────────────────────────────────────────


  function responsiveItemAnimationTitleStyle(name,maxSize=48){
    const len=String(name||"").length;
    const vw=len>=28?6.5:len>=22?7.2:8;
    const min=len>=28?22:24;
    return "font-size:clamp("+min+"px,"+vw+"vw,"+maxSize+"px);white-space:normal;line-height:1.08;width:calc(100vw - 32px);max-width:360px;overflow-wrap:anywhere;word-break:normal;hyphens:auto;text-align:center";
  }

  function ItemLootUp(){
    if(!itemLootUp)return null;
    const it=INVENTORY_ITEMS[itemLootUp.item]||INVENTORY_ITEMS.minorElixir;
    const rare=itemLootUp.kind==="rare";
    const fx={
      majorElixir:{main:"#22c55e",accent:"#bbf7d0"},
      minorElixir:{main:"#38bdf8",accent:"#bae6fd"},
      supremeElixir:{main:"#a855f7",accent:"#e9d5ff"},
      transmutationGrimoire:{main:"#8b5cf6",accent:"#c4b5fd"},
      masterContract:{main:"#d4a84f",accent:"#fef3c7"},
      recordHammer:{main:"#38bdf8",accent:"#facc15"},
      teleportCrystal:{main:"#06b6d4",accent:"#a5f3fc"},
      invisibilityCape:{main:"#94a3b8",accent:"#e2e8f0"},
      debtAcknowledgement:{main:"#b91c1c",accent:"#f5d0a9"},
      recoveryOintment:{main:"#22c55e",accent:"#d9f99d"},
      destinyCompass:{main:"#d4a84f",accent:"#60a5fa"},
      mysteryMap:{main:"#b7791f",accent:"#f5d08a"},
      etherStopper:{main:"#7c3aed",accent:"#60a5fa"},
      rerollToken:{main:"#d4a84f",accent:"#38bdf8"},
      alchemicalCatalyst:{main:"#10b981",accent:"#5eead4"}
    }[itemLootUp.item]||{main:rank.color||"#f59e0b",accent:"#ffffff"};
    const main=rare?"#f59e0b":fx.main;
    const accent=rare?"#fde68a":fx.accent;
    const glow=main+"99";
    const particles=Array.from({length:52},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.6,
      dur:1.05+Math.random()*2,
      size:2+Math.random()*5,
      accent:Math.random()>.62
    }));
    return h("div",{class:"ruov",style:"--rc:"+main+";--rg:"+glow},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?accent:main)+";box-shadow:0 0 10px "+(p.accent?accent+"aa":glow)+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:"+main+";text-shadow:0 0 16px "+glow},itemLootUp.item==="debtAcknowledgement"?"PACTE SCELLÉ !":(rare?"DROP RARE OBTENU !":"OBJET OBTENU !")),
        itemLootUp.item==="debtAcknowledgement"&&h("div",{style:"font-size:28px;letter-spacing:10px;color:#9ca3af;opacity:.8;animation:ruPulse 1.4s ease-in-out infinite"},"⛓ ⛓"),
        h("div",{style:"position:relative;display:flex;align-items:center;justify-content:center;width:150px;height:150px;margin:8px 0 14px"},
          h("div",{style:"position:absolute;inset:18px;border-radius:50%;background:radial-gradient(circle,"+main+"55 0%,"+main+"20 42%,transparent 72%);filter:blur(5px);box-shadow:0 0 34px "+glow}),
          h("div",{style:"position:relative;z-index:1;filter:drop-shadow(0 0 14px "+glow+");animation:ruPulse 1.8s ease-in-out infinite"},InventoryItemIcon(itemLootUp.item,112))
        ),
        h("div",{class:"rurank",style:"--rc:"+main+";--rg:"+glow+";color:"+main+";text-shadow:0 0 18px "+glow+";"+responsiveItemAnimationTitleStyle(it.name,48),"data-r":it.name},it.name),
        h("button",{class:"rudis",style:"--rc:"+main+";--rg:"+glow,onClick:()=>setItemLootUp(null)},"Continuer")
      )
    );
  }

  function AlliedGiftUp(){
    if(!alliedGiftUp)return null;
    const blue="#60a5fa";
    const gold="#fbbf24";
    const particles=Array.from({length:48},(_,i)=>({
      id:i,
      left:Math.random()*100,
      delay:Math.random()*2.6,
      dur:1.05+Math.random()*1.9,
      size:2+Math.random()*5,
      accent:Math.random()>.55
    }));
    return h("div",{class:"ruov",style:"--rc:"+blue+";--rg:"+blue+"88"},
      h("div",{class:"ruparts"},particles.map(p=>
        h("div",{key:p.id,class:"rupart",style:"left:"+p.left+"%;bottom:0;width:"+p.size+"px;height:"+p.size+"px;background:"+(p.accent?gold:"#dbeafe")+";box-shadow:0 0 10px "+(p.accent?gold+"99":blue+"99")+";animation-delay:"+p.delay+"s;animation-duration:"+p.dur+"s"})
      )),
      h("div",{class:"rucont"},
        h(NotificationHeader,null),
        h("div",{class:"ruevol",style:"color:"+gold+";text-shadow:0 0 16px "+gold+"88"},"CADEAU DU PAYS ALLIÉ"),
        h("div",{class:"rulabel",style:"margin-top:14px;max-width:360px;line-height:1.6;color:#dbeafe;font-size:clamp(15px,4vw,20px);text-align:center"},"Pour vous remercier, le pays allié vous offre l’objet de votre choix."),
        h("button",{class:"rudis",style:"--rc:"+blue+";--rg:"+blue+"88",onClick:()=>{setAlliedGiftUp(null);setAlliedGiftChoiceOpen(true);}},"Continuer")
      )
    );
  }

  function AlliedGiftChoiceModal(){
    if(!alliedGiftChoiceOpen)return null;
    const ids=alliedGiftEligibleIds();
    return h("div",{class:"modal-ov"},
      h("div",{class:"modal",style:"position:relative;max-width:470px;width:calc(100% - 24px);max-height:88vh;overflow:auto"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:12px"},
          h("div",{class:"mtitle",style:"margin:0;line-height:1.2"},"OBJET OFFERT"),
          h("button",{onClick:()=>setAlliedGiftChoiceOpen(false),style:"border:0;background:transparent;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:0;flex-shrink:0"},"×")
        ),
        h("div",{style:"font-size:11px;color:var(--td);line-height:1.55;margin:12px 0 14px;text-align:center"},"Choisissez librement un objet non permanent offert par le pays allié."),
        h("div",{style:"display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px"},ids.map(id=>{
          const it=INVENTORY_ITEMS[id];
          return h("button",{key:id,onClick:()=>{setAlliedGiftChoiceOpen(false);setConfirmAlliedGift(id);},style:"min-height:112px;padding:10px 8px;border-radius:11px;border:1px solid rgba(96,165,250,.26);background:rgba(96,165,250,.045);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer"},
            h("div",{style:"height:54px;display:flex;align-items:center;justify-content:center"},InventoryItemIcon(id,48)),
            h("div",{style:"font-family:Orbitron,sans-serif;font-size:8px;line-height:1.3;letter-spacing:.5px;text-transform:uppercase;text-align:center"},it.short)
          );
        }))
      )
    );
  }

  function ConfirmAlliedGiftModal(){
    if(!confirmAlliedGift)return null;
    const id=confirmAlliedGift;
    const it=INVENTORY_ITEMS[id];
    const color="#60a5fa";
    return h("div",{class:"ruov",style:"--rc:"+color+";--rg:"+color+"88"},
      h("div",{class:"rucont",style:"width:min(500px,calc(100vw - 34px));background:rgba(15,15,18,.97);border:1px solid "+color+"88;border-radius:18px;padding:22px;box-shadow:0 0 30px "+color+"22"},
        h("div",{class:"ruevol",style:"color:"+color},"CONFIRMATION"),
        h("div",{style:"margin:10px 0 14px;filter:drop-shadow(0 0 12px "+color+"88)"},InventoryItemIcon(id,96)),
        h("div",{style:"font-family:Orbitron,sans-serif;font-size:17px;font-weight:900;color:#fff;text-align:center;line-height:1.45;max-width:360px"},"Choisir définitivement « "+it.name+" » comme cadeau du pays allié ?"),
        h("div",{style:"display:flex;gap:10px;margin-top:22px"},
          h("button",{class:"rudis",style:"min-width:110px;--rc:#64748b;--rg:rgba(100,116,139,.5)",onClick:()=>{setConfirmAlliedGift(null);setAlliedGiftChoiceOpen(true);}},"Retour"),
          h("button",{class:"rudis",style:"min-width:110px;--rc:"+color+";--rg:"+color+"88",onClick:()=>{
            grantAlliedGift(id);
            setConfirmAlliedGift(null);
            const floatId=Date.now()+Math.random();
            setFloats(f=>[...f,{id:floatId,y:"35%",txt:"CADEAU ALLIÉ REÇU"}]);
            setTimeout(()=>setFloats(f=>f.filter(x=>x.id!==floatId)),1800);
          }},"Confirmer")
        )
      )
    );
  }

  function ItemUseUp(){
    if(!itemUseUp)return null;
    const it=INVENTORY_ITEMS[itemUseUp.id];
    return h("div",{class:"ruov",style:"--rc:"+rank.color+";--rg:"+rank.glow},h("div",{class:"rucont"},
      h(NotificationHeader,null),
      h("div",{class:"ruevol",style:"color:"+rank.color},itemUseUp.id==="teleportCrystal"&&itemUseUp.alliedTeleport?"ALLIANCE SCELLÉE":itemUseUp.id==="dungeonKey"?"Vous avez utilisé une":itemUseUp.id==="debtAcknowledgement"?"Dette créée avec une":itemUseUp.id==="transmutationGrimoire"?"Transmutation accomplie":itemUseUp.id==="destinyCompass"?"Boussole orientée":itemUseUp.id==="mysteryMap"?"Carte déployée":itemUseUp.id==="etherStopper"?(itemUseUp.resumed?"Élixir réactivé":"Élixir suspendu"):itemUseUp.id==="rerollToken"?"Quête urgente invoquée":itemUseUp.id==="alchemicalCatalyst"?"Catalyseur préparé":"Vous avez consommé un"),
      h("div",{class:"rurank",style:responsiveItemAnimationTitleStyle(it.name,56),"data-r":it.name},it.name),
      itemUseUp.stat&&h("div",{class:"rulabel",style:"margin-top:12px;max-width:330px;line-height:1.5"},"Vous bénéficiez de +"+Math.round(itemUseUp.pct*100)+" % d’XP dans ",h("span",{style:"color:"+(STAT_COLOR[itemUseUp.stat]||rank.color)},STAT_LBL[itemUseUp.stat]||itemUseUp.stat)," pendant 24 h."),
      itemUseUp.global&&h("div",{class:"rulabel",style:"margin-top:12px;max-width:330px;line-height:1.5;color:#c084fc"},"Vous bénéficiez de +"+Math.round(itemUseUp.pct*100)+" % d’XP sur toutes les statistiques pendant 24 h."),
      itemUseUp.transmuted&&h("div",{class:"rulabel",style:"margin-top:12px;max-width:330px;line-height:1.5;color:#c084fc"},itemUseUp.catalystUsed?"Le Catalyseur et le Grimoire ont fusionné 3 Élixirs d’expérience mineurs en 1 Élixir d’expérience magistral.":"5 Élixirs d’expérience mineurs ont été fusionnés en 1 Élixir d’expérience magistral."),
      itemUseUp.statChosen&&h("div",{class:"rulabel",style:"margin-top:12px;max-width:330px;line-height:1.5;color:"+(STAT_COLOR[itemUseUp.statChosen]||rank.color)},"La prochaine quête urgente appartiendra à la statistique "+(STAT_LBL[itemUseUp.statChosen]||itemUseUp.statChosen)+"."),
      itemUseUp.dungeonStatChosen&&h("div",{class:"rulabel",style:"margin-top:12px;max-width:330px;line-height:1.5;color:"+(STAT_COLOR[itemUseUp.dungeonStatChosen]||rank.color)},"Le prochain donjon appartiendra à la statistique "+(STAT_LBL[itemUseUp.dungeonStatChosen]||itemUseUp.dungeonStatChosen)+"."),
      itemUseUp.paused&&h("div",{class:"rulabel",style:"margin-top:12px;max-width:330px;line-height:1.5"},"Le temps restant de l’élixir est conservé pendant 24 h maximum."),
      itemUseUp.resumed&&h("div",{class:"rulabel",style:"margin-top:12px;max-width:330px;line-height:1.5"},"L’élixir reprend avec exactement le temps qui lui restait."),
      itemUseUp.summoned&&h("div",{class:"rulabel",style:"margin-top:12px;max-width:330px;line-height:1.5"},"Une seconde quête urgente a été invoquée. Elle accorde ses XP et ses objets normaux, mais ne peut pas être relancée."),
      itemUseUp.alliedTeleport&&h("div",{class:"rulabel",style:"margin-top:12px;max-width:350px;line-height:1.55;color:#dbeafe"},"Vous choisissez de vous allier à un pays voisin pour l’aider à refermer une Brèche."),
      itemUseUp.alliedTeleport&&itemUseUp.breachName&&h("div",{class:"rulabel",style:"margin-top:8px;max-width:350px;line-height:1.45;color:#60a5fa"},"Brèche la plus proche : "+itemUseUp.breachName),
      itemUseUp.armed&&h("div",{class:"rulabel",style:"margin-top:12px;max-width:330px;line-height:1.5;color:#5eead4"},"La prochaine transmutation ne coûtera que 3 Élixirs d’expérience mineurs."),
      itemUseUp.recordWon&&h("div",{class:"rulabel",style:"margin-top:12px"},"Record officiel battu : +500 XP."),
      h("button",{class:"rudis",onClick:()=>setItemUseUp(null)},"Continuer")
    ));
  }

  function Codex(){
    const toggleC = k => setCodexOpen(o=>({obl:false,bonus:false,reg:false,sq:false,ev:false,mm:false,debt:false,ep:false,breach:false,breachRupture:false,dj:false,djAlt:false,cs:false,[k]:!o[k]}));
    const statLabel = stat => STAT_LBL2[stat] || STAT_LBL[stat] || stat || "";
    const unitPlural = (unit, value) => {
      if(!unit) return "";
      if(value<=1) return unit;
      return ({rep:"reps",page:"pages",verre:"verres",km:"km",min:"min",jour:"jours",nuit:"nuits",repas:"repas",contact:"contacts",action:"actions"}[unit] || unit);
    };
    const ChevronC = ({k}) => h("span",{
      onClick:e=>{e.stopPropagation();toggleC(k);},
      style:"cursor:pointer;color:var(--td);font-size:10px;font-family:Orbitron,sans-serif;font-weight:700;letter-spacing:1px;flex-shrink:0;user-select:none"
    },codexOpen[k]?"▲":"▼");

    const cardStyle = "padding:10px;border:1px solid rgba(255,255,255,0.07);border-radius:10px;margin-bottom:7px;background:rgba(255,255,255,0.025)";
    const detailStyle = "font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;line-height:1.45";

    function StatPill({stat,xp,showPlus=true}){
      const color=STAT_COLOR[stat]||"var(--rc)";
      const raw=String(xp);
      const slashIndex=raw.indexOf("/");
      const value=slashIndex>=0 ? raw.slice(0,slashIndex) : raw;
      const perUnit=slashIndex>=0 ? raw.slice(slashIndex+1) : "";
      const label=(showPlus?"+":"")+value+" XP "+statLabel(stat)+(perUnit?"/"+perUnit:"");
      return h("span",{style:"display:inline-block;border:1px solid "+color+"55;color:"+color+";border-radius:999px;padding:2px 7px;margin:2px 4px 2px 0;font-size:10px;font-family:Orbitron,sans-serif;background:"+color+"11"},
        label
      );
    }

    function renderXpPills(item,{showPlus=true}={}){
      const pairs=[];
      if(item.binary && item.binaryXp){ pairs.push({stat:item.stat,xp:item.binaryXp}); }
      else if(item.xp){ pairs.push({stat:item.stat,xp:item.xp}); }
      else if(item.xpPer){ pairs.push({stat:item.stat,xp:item.xpPer+"/"+item.unit}); }
      if(item.xp2&&item.stat2) pairs.push({stat:item.stat2,xp:item.xp2});
      if(item.xp3&&item.stat3) pairs.push({stat:item.stat3,xp:item.xp3});
      if(item.xpPer2&&item.stat2) pairs.push({stat:item.stat2,xp:item.xpPer2+"/"+item.unit});
      if(item.tiers){
        return h("div",null,item.tiers.map((t,index)=>{
          const ps=[h(StatPill,{stat:t.stat,xp:t.xp,showPlus})];
          if(t.xp2&&t.stat2) ps.push(h(StatPill,{stat:t.stat2,xp:t.xp2,showPlus}));
          return h("div",{key:t.at,style:"margin-top:3px"},
            h("span",{style:"font-family:Orbitron,sans-serif;font-size:10px;color:#fff"},"Palier "+(index+1)+" : "),
            ...ps
          );
        }));
      }
      const nodes=[];
      pairs.forEach((p,i)=>{
        nodes.push(h(StatPill,{key:"xp"+i,stat:p.stat,xp:p.xp,showPlus}));
      });
      return h("div",null,nodes);
    }

    function targetForQuest(obj){
      const isWeekly = obj.weekly;
      const period = isWeekly ? " / semaine" : " / jour";
      if(obj.binary) return "Validation simple";
      if(obj.tiers) return (obj.target||obj.base||1)+" "+unitPlural(obj.unit,obj.target||obj.base||1)+period;
      const base = getRankBase(obj.id, ri, prestige, state.stats);
      return base+" "+unitPlural(obj.unit,base)+period;
    }

    function renderExerciseFamiliesCodex(){
      const force=Math.max(1,Number((state.stats||{}).Force)||1);
      const tier=statLevelTier(force);
      const familyStyle="padding:10px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:rgba(255,255,255,.025);margin-bottom:9px";
      const subStyle="padding:9px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:rgba(255,255,255,.025);margin-top:7px";
      const objective=(value,unit)=>fmtNum(value)+" "+unit+" / jour";
      function Reward({stat,xp}){
        return h(StatPill,{stat,xp,showPlus:false});
      }
      function Exercise({icon,name,target,unit,rewards}){
        const rewardNodes=[];
        (rewards||[]).forEach((r,i)=>{
          rewardNodes.push(h(Reward,{key:"reward"+i,stat:r.stat,xp:r.xp}));
        });
        return h("div",{style:subStyle},
          h("div",{style:"display:flex;align-items:center;gap:8px"},
            h("span",{style:"font-size:15px;line-height:1;min-width:24px;text-align:center;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"},icon),
            h("div",{style:"flex:1;min-width:0"},
              h("div",{style:"font-size:12px;color:var(--tx);font-weight:800"},name),
              h("div",{style:"margin-top:5px"},rewardNodes),
              h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;line-height:1.45;margin-top:4px"},"▸ Objectif : "+objective(target,unit))
            )
          )
        );
      }
      const pushTarget=getStatLevelTarget("push",state.stats);
      const backTarget=getStatLevelTarget("negative_pullups",state.stats);
      const australianTarget=getStatLevelTarget("squats",state.stats);
      const absTarget=getStatLevelTarget("abs",state.stats);
      const legRaiseTarget=legRaiseTargetForForceLevel(force);
      const plankTarget=Math.max(1,Math.ceil(force/10));
      const sideTarget=pushTarget;
      const squatTarget=getStatLevelTarget("squats",state.stats);
      const calvesTarget=getStatLevelTarget("calves",state.stats);
      return h(Fragment,null,
        h("div",{style:familyStyle},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:12px;color:"+STAT_COLOR.Force+";letter-spacing:1px"},"🦾 PECS & TRICEPS"),
          h(Exercise,{icon:"💪🏼",name:"Pompes",target:pushTarget,unit:"reps",rewards:[{stat:"Force",xp:"3/rep"}]}),
          h(Exercise,{icon:"💪🏼",name:"Dips",target:pushTarget,unit:"reps",rewards:[{stat:"Force",xp:"3/rep"}]})
        ),
        h("div",{style:familyStyle},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:12px;color:"+STAT_COLOR.Force+";letter-spacing:1px"},"🦾 DOS & BICEPS"),
          h(Exercise,{icon:"💪🏼",name:"Tractions négatives",target:backTarget,unit:"reps",rewards:[{stat:"Force",xp:"12/rep"}]}),
          h(Exercise,{icon:"💪🏼",name:"Tractions australiennes",target:australianTarget,unit:"reps",rewards:[{stat:"Force",xp:"6/rep"}]})
        ),
        h("div",{style:familyStyle},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:12px;color:"+STAT_COLOR.Force+";letter-spacing:1px"},"🧱 ABDOS"),
          h(Exercise,{icon:"🧎🏻",name:"Crunches",target:absTarget,unit:"reps",rewards:[{stat:"Force",xp:"1,5/rep"}]}),
          h(Exercise,{icon:"🦵🏻",name:"Levées de jambes",target:legRaiseTarget,unit:"reps",rewards:[{stat:"Force",xp:"3/rep"}]}),
          h(Exercise,{icon:"🫳🏼",name:"Gainage",target:plankTarget,unit:"min",rewards:[{stat:"Force",xp:"50/min"}]}),
          h(Exercise,{icon:"🧎🏻‍♂️‍➡️",name:"Gainage obliques",target:sideTarget,unit:"reps",rewards:[{stat:"Force",xp:"3/rep"}]}),
        ),
        h("div",{style:familyStyle},
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:12px;color:"+STAT_COLOR.Force+";letter-spacing:1px"},"🦿 JAMBES"),
          h(Exercise,{icon:"🦵🏻",name:"Squats",target:squatTarget,unit:"reps",rewards:[{stat:"Force",xp:"3/rep"},{stat:"Agilite",xp:"3/rep"}]}),
          h(Exercise,{icon:"🦵🏻",name:"Mollets",target:calvesTarget,unit:"reps",rewards:[{stat:"Force",xp:"2/rep"},{stat:"Agilite",xp:"1/rep"}]}),
          h(Exercise,{icon:"🦵🏻",name:"Fentes",target:pushTarget,unit:"reps",rewards:[{stat:"Force",xp:"3/rep"}]})
        )
      );
    }

    function renderQuest(obj,dailyXpFormat=false){

      const useDailyXpFormat=dailyXpFormat===true;
      const subtitle = obj.desc || obj.subtitle || "";
      return h("div",{key:obj.id,style:cardStyle},
        h("div",{style:"display:flex;align-items:center;gap:8px"},
          QuestIcon(obj.id,obj.icon||"•",14,"line-height:1.1;min-width:24px;text-align:center"),
          h("div",{style:"flex:1;min-width:0"},
            h("div",{style:"font-size:13px;color:var(--tx);font-weight:700;line-height:1.15;display:flex;align-items:center;gap:6px;flex-wrap:wrap"},
              obj.name,
              (obj.weekly)&&h(QuestBadge,{label:"HEBDO",color:WEEKLY_BADGE_COLOR})
            ),
            subtitle&&h("div",{style:"font-size:10px;color:var(--td);margin-top:3px;line-height:1.25"},subtitle),
            h("div",{style:"margin-top:7px"},renderXpPills(obj,{showPlus:!useDailyXpFormat})),
            h("div",{style:"display:flex;flex-direction:column;gap:3px;margin-top:6px"},
              h("div",{style:detailStyle},"▸ Objectif : "+targetForQuest(obj))
            )
          )
        )
      );
    }

    function targetForSpecial(q){
      if(q.binary) return "Validation simple";
      if(q.tiers) return (q.target||1)+" "+unitPlural(q.unit,q.target||1)+" total";
      return (q.target||1)+" "+unitPlural(q.unit,q.target||1);
    }

    function renderSpecial(q){
      return h("div",{key:q.id,style:cardStyle},
        h("div",{style:"display:flex;align-items:center;gap:8px"},
          QuestIcon(q.id,q.icon||"🚨",14,"line-height:1.1;min-width:24px;text-align:center"),
          h("div",{style:"flex:1;min-width:0"},
            h("div",{style:"font-size:13px;color:var(--tx);font-weight:700;line-height:1.15"},q.name),
            q.desc&&h("div",{style:"font-size:10px;color:var(--td);margin-top:3px;line-height:1.25"},q.desc),
            h("div",{style:"margin-top:7px"},renderXpPills(q))
          )
        )
      );
    }
    function renderUrgentSpecial(q){ return renderSpecial(q); }
    function renderBreachSpecial(q){ return renderSpecial(q); }

    function renderDungeonCodex(dg){
      const rewards=dungeonRewardPairs(dg);
      return h("div",{key:dg.id,style:cardStyle},
        h("div",{style:"display:flex;align-items:center;gap:8px"},
          h("div",{style:"font-size:18px;line-height:1;min-width:24px;text-align:center;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"},dg.icon),
          h("div",{style:"flex:1;min-width:0"},
            h("div",{style:"font-size:13px;color:var(--tx);font-weight:700;line-height:1.15"},dg.title),
            h("div",{style:"margin-top:7px"},rewards.map((r,i)=>h(StatPill,{key:i,stat:r.stat,xp:r.xp}))),
            h("div",{style:"display:flex;flex-direction:column;gap:5px;margin-top:8px"},
              dg.rooms.map((room,i)=>h("div",{key:i,style:detailStyle},
                "▸ "+(i===dg.rooms.length-1?"Boss":"Salle "+(i+1))+" — "+room.name+" : "+room.desc+" · "+dungeonRoomRewardPairs(dg,i).map(r=>"+"+r.xp+" XP "+(STAT_LBL[r.stat]||r.stat)).join(" / "),
                room.help&&h("div",{style:"margin-top:4px;padding:7px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);line-height:1.45"},
                  h("div",{style:"color:"+(STAT_COLOR[dg.stat]||dg.color)+";font-family:Orbitron,sans-serif;font-size:9px;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px"},room.helpTitle||"Aide"),
                  room.help
                )
              ))
            ),
          )
        )
      );
    }


    function renderBreachCodex(b){
      const boss=buildBreachRuptureBoss(b.id);
      const color=STAT_COLOR[b.stat]||"var(--rc)";
      const rewards=[
        b.xp&&b.stat?{stat:b.stat,xp:b.xp}:null,
        b.xp2&&b.stat2?{stat:b.stat2,xp:b.xp2}:null,
        b.xp3&&b.stat3?{stat:b.stat3,xp:b.xp3}:null
      ].filter(Boolean);
      return h("div",{key:b.id,style:"margin-bottom:9px;padding:9px 10px;border-radius:9px;border:1px solid "+color+"33;background:"+color+"08"},
        h("div",{style:"font-size:11px;color:"+color+";font-family:Orbitron,sans-serif;letter-spacing:.8px;text-transform:uppercase;line-height:1.3"},boss?boss.name:b.name),
        h("div",{style:"font-size:10px;color:var(--td);line-height:1.4;margin-top:4px"},"Objectif : "+b.name),
        rewards.length>0&&h("div",{style:"margin-top:7px"},rewards.map((r,i)=>h(StatPill,{key:i,stat:r.stat,xp:r.xp})))
      );
    }

    function renderBreachBossCodex(rb){
      const color=STAT_COLOR[rb.stat]||"var(--rc)";
      return h("div",{key:rb.id,style:"margin-bottom:9px;padding:9px 10px;border-radius:9px;border:1px solid "+color+"33;background:"+color+"08"},
        h("div",{style:"font-size:11px;color:"+color+";font-family:Orbitron,sans-serif;letter-spacing:.8px;text-transform:uppercase;line-height:1.3"},rb.name),
        h("div",{style:"font-size:10px;color:var(--td);line-height:1.4;margin-top:4px"},"Objectif du Boss : "+(rb.objective||((BREACH_POOL.find(b=>b.id===rb.breachId)||{}).name)||"—")),
        h("div",{style:"font-size:8.5px;color:#fff;font-family:Orbitron,sans-serif;letter-spacing:1px;text-transform:uppercase;margin-top:9px;margin-bottom:5px"},"Garde rapprochée"),
        h("div",{style:"display:flex;flex-direction:column;gap:5px"},(rb.guards||[]).map(g=>h("div",{key:g.id,style:"padding:6px 7px;border-radius:7px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)"},
          h("div",{style:"font-size:9.5px;color:#fff;font-weight:700;line-height:1.3"},g.name),
          h("div",{style:"font-size:9.5px;color:var(--td);line-height:1.4;margin-top:2px"},g.objective)
        )))
      );
    }
    function Section({id,title,count,children}){
      const open=!!codexOpen[id];
      return h("div",{class:"card"},
        h("div",{onClick:()=>toggleC(id),style:"cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 "+(open?"12px":"0")+" 0"},
          h("div",null,
            h("div",{class:"ctitle",style:"margin:0"+(id==="reg"?";color:#ef4444":"")},title)
          ),
          h(ChevronC,{k:id})
        ),
        open&&children
      );
    }

    function xpTotalsByStat(item){
      const totals={};
      const add=(stat,xp)=>{
        if(!stat || xp==null) return;
        const n=parseFloat(String(xp).split("/")[0]);
        if(!Number.isFinite(n)) return;
        totals[stat]=(totals[stat]||0)+n;
      };
      if(item.tiers){
        item.tiers.forEach(t=>{
          add(t.stat,t.xp);
          add(t.stat2,t.xp2);
          add(t.stat3,t.xp3);
        });
      }else{
        if(item.binary && item.binaryXp) add(item.stat,item.binaryXp);
        else if(item.xp) add(item.stat,item.xp);
        else if(item.xpPer) add(item.stat,item.xpPer);
        if(item.xp2&&item.stat2) add(item.stat2,item.xp2);
        if(item.xp3&&item.stat3) add(item.stat3,item.xp3);
        if(item.xpPer2&&item.stat2) add(item.stat2,item.xpPer2);
      }
      if(item.overGoalXpPer&&item.overGoalStat) add(item.overGoalStat,item.overGoalXpPer);
      return totals;
    }

    function dominantStat(item,fallback){
      const tieOverride = {
        calves:"Force",
        sp_cold:"Sante",
        ep_coldweek:"Sante",
        dj_cold:"Sante",
        dj_douche_froide:"Sante",
        dj_froid:"Sante"
      }[item.id];
      if(tieOverride) return tieOverride;
      const totals=xpTotalsByStat(item);
      const entries=Object.entries(totals).filter(([stat,xp])=>STATS.includes(stat)&&xp>0);
      if(entries.length===0) return fallback || item.stat || "Discipline";
      entries.sort((a,b)=>b[1]-a[1]);
      if(entries.length>1 && entries[0][1]===entries[1][1]) return fallback || item.stat || entries[0][0];
      return entries[0][0];
    }

    function groupByDominantStat(list,render,fallbackStatGetter){
      const groups=STATS.map(stat=>({stat,list:[]}));
      list.forEach(item=>{
        const fallback = fallbackStatGetter ? fallbackStatGetter(item) : item.stat;
        const stat = dominantStat(item,fallback);
        const group = groups.find(g=>g.stat===stat) || groups[groups.length-1];
        group.list.push(item);
      });
      return groups.filter(g=>g.list.length>0).map(group=>h("div",{key:group.stat,style:"margin-bottom:13px"},
        h("div",{style:"font-size:11px;color:"+(STAT_COLOR[group.stat]||"var(--rc)")+";font-family:Orbitron,sans-serif;letter-spacing:1px;text-transform:uppercase;margin:2px 0 7px"},statLabel(group.stat)),
        group.list.map(render)
      ));
    }

    function renderRequiredCodex(){
      const rotatingIds=new Set(["push","negative_pullups","abs","squats","calves"]);
      const staticRequired=objs.filter(o=>o.daily&&!o.optional&&!rotatingIds.has(o.id));
      const groups=STATS.map(stat=>({stat,list:[]}));
      staticRequired.forEach(item=>{
        const stat=dominantStat(item,item.stat);
        (groups.find(g=>g.stat===stat)||groups[groups.length-1]).list.push(item);
      });
      return groups.map(group=>{
        const hasExerciseFamilies=group.stat==="Force";
        if(!hasExerciseFamilies&&group.list.length===0) return null;
        return h("div",{key:group.stat,style:"margin-bottom:13px"},
          h("div",{style:"font-size:11px;color:"+(STAT_COLOR[group.stat]||"var(--rc)")+";font-family:Orbitron,sans-serif;letter-spacing:1px;text-transform:uppercase;margin:2px 0 7px"},statLabel(group.stat)),
          hasExerciseFamilies&&renderExerciseFamiliesCodex(),
          group.list.map(item=>renderQuest(item,true))
        );
      }).filter(Boolean);
    }

    const required = objs.filter(o=>o.daily&&!o.optional);
    const weeklyCodex = objs.filter(o=>o.weekly);
    const bonus = objs.filter(o=>o.optional&&!o.weekly&&!o.bonusHidden);
    const hiddenBonus = objs.filter(o=>o.optional&&!o.weekly&&o.bonusHidden);
    const specialList = STATS.flatMap(stat=>(SP[stat]||[]).map(q=>({...q,stat:q.stat||stat})));
    const breachList=BREACH_POOL.map(q=>({...q,isBreach:true}));
    const breachBossList=BREACH_POOL.map(b=>{
      const boss=buildBreachRuptureBoss(b.id);
      return boss?{...boss,stat:b.stat,breachId:b.id}:null;
    }).filter(Boolean);

    return h("div",{class:"modal-ov",onClick:e=>{if(e.target===e.currentTarget)setInventoryItem(null)}},
      h("div",{class:"modal",style:"position:relative;max-width:470px;width:calc(100% - 24px);max-height:88vh;overflow:auto;padding-top:16px"},
        h("div",{style:"display:flex;justify-content:space-between;align-items:center;gap:12px"},
          h("div",{class:"mtitle",style:"margin:0;line-height:1.2"},"CODEX"),
          h("button",{onClick:()=>setInventoryItem(null),style:"border:0;background:transparent;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:0;flex-shrink:0"},"×")
        ),
        h("div",{style:"display:flex;justify-content:center;align-items:center;margin:14px 0 8px"},InventoryItemIcon("codex",128)),
        h("div",{style:"font-size:12px;line-height:1.6;color:var(--tx);text-align:center;margin-bottom:15px"},"Catalogue complet des quêtes et systèmes de l’application."),
        h(Section,{id:"breach",title:"Brèches",count:breachList.length},
          h(Fragment,null,
            h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;line-height:1.5;margin-bottom:10px"},"Une Brèche a 1 % de chance d’apparaître au reset quotidien. Elle remplace la quête urgente du jour et reste ouverte 72 h."),
            groupByDominantStat(breachList,renderBreachCodex,b=>b.stat)
          )
        ),
        h(Section,{id:"breachRupture",title:"Rupture de Brèche",count:breachBossList.length},
          h(Fragment,null,
            h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;line-height:1.5;margin-bottom:6px"},"Si une Brèche n’est pas refermée après 72 h, elle entre en Rupture pendant 24 h. Son Boss reprend l’objectif initial et invoque une garde rapprochée de 3 sous-quêtes."),
            h("div",{style:"font-size:10px;color:#ef4444;font-family:Orbitron,sans-serif;line-height:1.5;font-weight:800;margin-bottom:10px"},"−25 % XP si la Brèche rompue n’est pas fermée dans les 24 h."),
            groupByDominantStat(breachBossList,renderBreachBossCodex,rb=>rb.stat)
          )
        ),
        h(Section,{id:"dj",title:"Donjons",count:DUNGEONS.length},
          h(Fragment,null,
            h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;line-height:1.5;margin-bottom:10px"},"Un Donjon inachevé se ferme à l’expiration de son délai. Les salles déjà validées et leurs XP restent acquises."),
            groupByDominantStat(DUNGEONS,renderDungeonCodex,dg=>dg.stat)
          )
        ),
        h(Section,{id:"bonus",title:"Quêtes bonus",count:bonus.length+hiddenBonus.length},
          h(Fragment,null,
            groupByDominantStat(bonus,renderQuest),
            hiddenBonus.length>0&&h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;letter-spacing:1px;margin:10px 0 8px"},"BONUS MASQUÉS / CONTEXTUELS"),
            hiddenBonus.length>0&&groupByDominantStat(hiddenBonus,renderQuest)
          )
        ),
        h(Section,{id:"obl",title:"Quêtes journalières",count:required.length},renderRequiredCodex()),
        h(Section,{id:"sq",title:"Quêtes urgentes",count:specialList.length},groupByDominantStat(specialList,renderUrgentSpecial)),

      )
    );
  }
  // ─── RENDU PRINCIPAL ──────────────────────────────────────────────────

  const parts=Array.from({length:15},(_,i)=>({id:i,s:Math.random()*3+1,l:Math.random()*100,dur:Math.random()*10+8,del:Math.random()*10}));

  const DAILY_MANTRAS = [
    "Accepte ce que tu ne peux contrôler.",
    "Mets de l'ordre dans ce que tu maîtrises.",
    "Fais toujours de ton mieux.",
    "N'en fais jamais une histoire personnelle.",
    "Observe, vérifie, puis agis.",
    "Agis pour toi-même, pas pour la reconnaissance d'autrui.",
    "Concentre-toi sur l'essentiel.",
    "Aie toujours une parole impeccable.",
    "Tiens-toi droit.",
    "Assume tes responsabilités.",
    "Apprécie les choses simples de la vie."
  ];
  const mantraDayIndex = Math.floor(new Date(today).getTime()/86400000);
  const dailyMantra = DAILY_MANTRAS[Math.abs(mantraDayIndex)%DAILY_MANTRAS.length];
  const mantraColor = STAT_COLOR.Force || "#fb923c";

  return h(Fragment,null,
    h("div",{id:"app"},
      h("div",{class:"particles"},parts.map(p=>h("div",{key:p.id,class:"particle",style:"width:"+p.s+"px;height:"+p.s+"px;left:"+p.l+"%;bottom:-10px;background:"+rank.color+";box-shadow:0 0 4px "+rank.glow+";animation-duration:"+p.dur+"s;animation-delay:"+p.del+"s"}))),
      h("div",{class:"hdr-wrap"},
        h("div",{class:"hdr"},
          h("div",{class:"hdr-top",style:"position:relative;display:flex;align-items:center;gap:8px"},
            h("div",{style:"flex:1;min-width:0;padding-right:4px"},
              h("div",{class:"pname"},"VAL,"),
              h("div",{style:"margin-top:6px;width:100%;min-height:26px;font-size:9.5px;line-height:1.3;color:"+mantraColor+";font-family:Orbitron,sans-serif;letter-spacing:0.5px;text-transform:uppercase;display:block;opacity:.96;white-space:normal;overflow:hidden"},dailyMantra)
            ),
            prestige>0&&h("div",{class:"prestige-badge"},"\u269B\uFE0F Ascension "+ROMAN[prestige-1]),
            h("div",{style:"display:flex;align-items:center;gap:2px;flex:0 0 auto;transform:translateY(-2px)"},
              h("button",{class:"gbtn",title:"Réglages","aria-label":"Ouvrir les réglages",style:"display:flex;align-items:center;justify-content:center;width:40px;height:40px;padding:0;font-size:24px;line-height:1",onClick:()=>setShowSet(true)},"⚙️")
            )
          )
        )
      ),
      h("div",{class:"scroll-area",ref:scrollRef},
        h("div",{style:"height:26px;flex:0 0 auto"}),
        tab==="home"    &&h(Home,null),
        tab==="quests"  &&h(Quests,null),
        tab==="inventory"&&h(Inventory,null),
        tab==="stats"   &&h(Stats,null),
        tab==="history" && History(),
        floats.map(f=>h("div",{key:f.id,class:"xpfloat",style:"top:"+(f.y||"40%")+(typeof f.y==="number"?"px":"")+";left:50%;transform:translateX(-50%);white-space:pre-line;text-align:center"},f.txt))
      ),
      h("nav",{class:"nav"},
        h("button",{class:"nbtn "+(tab==="home"?"on":""),onClick:()=>switchTab("home")},
          h("span",null,"Accueil")
        ),
        h("button",{class:"nbtn "+(tab==="quests"?"on":""),onClick:()=>switchTab("quests")},
          h("span",null,"Quêtes")
        ),
        h("button",{class:"nbtn "+(tab==="inventory"?"on":""),onClick:()=>switchTab("inventory")},
          h("span",null,"Inventaire")
        ),
        h("button",{class:"nbtn "+(tab==="stats"?"on":""),onClick:()=>switchTab("stats")},
          h("span",null,"Stats")
        ),
        h("button",{class:"nbtn "+(tab==="history"?"on":""),onClick:()=>switchTab("history")},
          h("span",null,"Historique")
        ),

      ),
      h(Settings,null),
      h(RankUp,null),
      h(LevelUp,null),
      h(StatDecadeUp,null),
      h(CompletionUp,null),
      h(StreakUp,null),
      h(RecordUp,null),
      h(DungeonKeyLootUp,null),
      h(ItemLootUp,null),
      h(AlliedGiftUp,null),
      h(AlliedGiftChoiceModal,null),
      h(ConfirmAlliedGiftModal,null),
      h(ItemUseUp,null),
      h(InventoryItemModal,null),
      h(ConfirmItemUseModal,null),
      h(CompassStatModal,null),
      h(DungeonMapStatModal,null),
      h(ElixirStatModal,null),
      h(ConfirmElixirModal,null),
      h(SpecialItemChoiceModal,null),
      h(ContractChoiceModal,null),
      h(ConfirmTargetedItemUseModal,null),
      h(DungeonUp,null),
      h(DungeonRuptureUp,null),
      h(UrgentUp,null),
      h(DebtUp,null),
      h(RegressionChoiceModal,null),
      h(ConfirmRegressionModal,null),
      h(RegressionUp,null),
      h(ConfirmDebtModal,null),
      h(ConfirmDungeonChoice,null),
      h(ConfirmReroll,null),
      h(ImportModal,null),
      h(ExportCopiedModal,null),
      h(ExportManualModal,null),
      h(PrestigeUp,null),
    )
  );
}

render(h(App,null),document.getElementById("app"));
