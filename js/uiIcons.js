import {
  DUNGEON_KEY_ICON_DATA,
  REGRESSION_ORB_ICON_DATA,
  NEW_ITEM_ICON_DATA
} from "./itemImages.js?v=20260808-items-normalized-v1";

const { h } = window.preact;

// Registre central des images qui remplacent les emojis.
// Tant qu'une clé n'est pas renseignée, l'emoji actuel reste affiché dans le
// même emplacement fixe. Les nouveaux visuels pourront donc être ajoutés par
// lots, sans modifier la mise en page des cartes.
export const UI_ICON_IMAGES=Object.freeze({
  "quest.water":"./assets/ui/quest-water.png?v=20260809-medallions-v4",
  "quest.sleep":"./assets/ui/quest-sleep.png?v=20260809-medallions-v4",
  "quest.reading":"./assets/ui/quest-reading.png?v=20260809-medallions-v4",
  "quest.breach_reading1h":"./assets/ui/quest-reading.png?v=20260809-medallions-v4",
  "quest.med":"./assets/ui/quest-meditation.png?v=20260809-medallions-v4",
  "quest.walk":"./assets/ui/quest-walk.png?v=20260809-medallions-v4",
  "quest.march":"./assets/ui/quest-walk.png?v=20260809-medallions-v4",
  "quest.sp_walk30":"./assets/ui/quest-walk.png?v=20260809-medallions-v4",
  "quest.sp_sun":"./assets/ui/quest-sp-sun.png?v=20260809-medallions-v4",
  "quest.sp_breath":"./assets/ui/quest-heart.png?v=20260809-medallions-v4",
  "quest.sp_nojunk":"./assets/ui/quest-no-junk.png?v=20260809-medallions-v4",
  "quest.sp_balanced_meals":"./assets/ui/quest-fruits.png?v=20260809-medallions-v4",
  "quest.sp_no_sugar":"./assets/ui/quest-no-sugar.png?v=20260809-medallions-v4",
  "quest.sp_mealnostim":"./assets/ui/quest-meal-no-stim.png?v=20260809-medallions-v4",
  "quest.sp_memo30":"./assets/ui/quest-memory.png?v=20260809-medallions-v4",
  "quest.sp_silence30":"./assets/ui/quest-silence.png?v=20260809-medallions-v4",
  "quest.sp_nophone3h":"./assets/ui/quest-no-screen.png?v=20260809-medallions-v4",
  "quest.sp_stairs":"./assets/ui/quest-stairs.png?v=20260809-medallions-v4",
  "quest.sp_shadow_boxing":"./assets/ui/quest-shadow-boxing.png?v=20260809-medallions-v4",
  "quest.sp_flow20":"./assets/ui/quest-animal-flow.png?v=20260809-medallions-v4",
  "quest.breach_flex60":"./assets/ui/quest-animal-flow.png?v=20260809-medallions-v4",
  "quest.sp_fluide":"./assets/ui/quest-martial-flow.png?v=20260809-medallions-v4",
  "quest.breach_martialflow60":"./assets/ui/quest-martial-flow.png?v=20260809-medallions-v4",
  "quest.sp_silent":"./assets/ui/quest-silent-movement.png?v=20260809-medallions-v4",
  "quest.sp_footwork":"./assets/ui/quest-footwork.png?v=20260809-medallions-v4",
  "quest.sp_no_passive":"./assets/ui/quest-no-screen.png?v=20260809-medallions-v4",
  "quest.sp_task":"./assets/ui/quest-task.png?v=20260809-medallions-v4",
  "quest.sp_declutter":"./assets/ui/quest-declutter.png?v=20260809-medallions-v4",

  "quest.pushups":"./assets/ui/quest-pushups.png?v=20260809-medallions-v4",
  "exercise.pushups":"./assets/ui/quest-pushups.png?v=20260809-medallions-v4",
  "quest.ex_pushups":"./assets/ui/quest-pushups.png?v=20260809-medallions-v4",
  "quest.dips":"./assets/ui/quest-dips.png?v=20260809-medallions-v4",
  "exercise.dips":"./assets/ui/quest-dips.png?v=20260809-medallions-v4",
  "quest.ex_dips":"./assets/ui/quest-dips.png?v=20260809-medallions-v4",

  "quest.crunches":"./assets/ui/quest-abs.png?v=20260809-medallions-v4",
  "exercise.crunches":"./assets/ui/quest-abs.png?v=20260809-medallions-v4",
  "quest.ex_crunches":"./assets/ui/quest-abs.png?v=20260809-medallions-v4",
  "quest.leg_raises":"./assets/ui/quest-abs.png?v=20260809-medallions-v4",
  "exercise.leg_raises":"./assets/ui/quest-abs.png?v=20260809-medallions-v4",
  "quest.ex_leg_raises":"./assets/ui/quest-abs.png?v=20260809-medallions-v4",
  "quest.plank":"./assets/ui/quest-abs.png?v=20260809-medallions-v4",
  "exercise.plank":"./assets/ui/quest-abs.png?v=20260809-medallions-v4",
  "quest.ex_plank":"./assets/ui/quest-abs.png?v=20260809-medallions-v4",
  "quest.side_plank":"./assets/ui/quest-abs.png?v=20260809-medallions-v4",
  "exercise.side_plank":"./assets/ui/quest-abs.png?v=20260809-medallions-v4",
  "quest.ex_side_plank":"./assets/ui/quest-abs.png?v=20260809-medallions-v4",

  "quest.negative_pullups":"./assets/ui/quest-pullups.png?v=20260809-medallions-v4",
  "exercise.negative_pullups":"./assets/ui/quest-pullups.png?v=20260809-medallions-v4",
  "quest.ex_negative_pullups":"./assets/ui/quest-pullups.png?v=20260809-medallions-v4",
  "quest.australian_pullups":"./assets/ui/quest-pullups.png?v=20260809-medallions-v4",
  "exercise.australian_pullups":"./assets/ui/quest-pullups.png?v=20260809-medallions-v4",
  "quest.ex_australian_pullups":"./assets/ui/quest-pullups.png?v=20260809-medallions-v4",
  "quest.grips":"./assets/ui/quest-pullups.png?v=20260809-medallions-v4",

  "quest.squats":"./assets/ui/quest-legs.png?v=20260809-medallions-v4",
  "exercise.squats":"./assets/ui/quest-legs.png?v=20260809-medallions-v4",
  "quest.ex_squats":"./assets/ui/quest-legs.png?v=20260809-medallions-v4",
  "quest.calves":"./assets/ui/quest-legs.png?v=20260809-medallions-v4",
  "exercise.calves":"./assets/ui/quest-legs.png?v=20260809-medallions-v4",
  "quest.ex_calves":"./assets/ui/quest-legs.png?v=20260809-medallions-v4",
  "quest.lunges":"./assets/ui/quest-legs.png?v=20260809-medallions-v4",
  "exercise.lunges":"./assets/ui/quest-legs.png?v=20260809-medallions-v4",
  "quest.ex_lunges":"./assets/ui/quest-legs.png?v=20260809-medallions-v4",
  "quest.breach_squats150":"./assets/ui/quest-legs.png?v=20260809-medallions-v4",

  "quest.balance":"./assets/ui/quest-balance.png?v=20260809-medallions-v4",
  "quest.run":"./assets/ui/quest-run.png?v=20260809-medallions-v4",
  "quest.breach_run10":"./assets/ui/quest-run.png?v=20260809-medallions-v4",
  "quest.sp_fruits":"./assets/ui/quest-fruits.png?v=20260809-medallions-v4",
  "item.dungeonKey":DUNGEON_KEY_ICON_DATA,
  "item.masterContract":NEW_ITEM_ICON_DATA.masterContract,
  "item.regressionOrb":REGRESSION_ORB_ICON_DATA,
  "item.teleportCrystal":NEW_ITEM_ICON_DATA.teleportCrystal
});

export function UiIcon({
  iconKey,
  fallback="",
  slotSize=18,
  glyphSize=14,
  extraStyle="",
  className="",
  label=""
}={}){
  const src=UI_ICON_IMAGES[iconKey]||"";
  const slot=Math.max(1,Number(slotSize)||18);
  const glyph=Math.max(1,Number(glyphSize)||14);
  const itemClass=String(iconKey||"").startsWith("item.")?" ui-icon-item":"";
  const accessibility=label
    ? {role:"img","aria-label":label}
    : {"aria-hidden":"true"};
  const fallbackStyle="display:"+(src?"none":"inline-flex")+";align-items:center;justify-content:center;width:100%;height:100%;font-size:var(--ui-icon-glyph);line-height:1;white-space:nowrap";

  return h("span",{
    ...accessibility,
    class:"ui-icon-slot"+itemClass+(className?" "+className:""),
    style:"--ui-icon-slot:"+slot+"px;--ui-icon-glyph:"+glyph+"px;"+extraStyle
  },
    src&&h("img",{
      src,
      alt:"",
      draggable:false,
      "aria-hidden":"true",
      onError:event=>{
        event.currentTarget.style.display="none";
        const fallbackNode=event.currentTarget.nextElementSibling;
        if(fallbackNode) fallbackNode.style.display="inline-flex";
      }
    }),
    h("span",{class:"ui-icon-fallback",style:fallbackStyle},fallback)
  );
}
