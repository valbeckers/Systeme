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
  "quest.water":"./assets/ui/quest-water.png?v=20260809-medallions-v2",
  "quest.sleep":"./assets/ui/quest-sleep.png?v=20260809-medallions-v2",
  "quest.reading":"./assets/ui/quest-reading.png?v=20260809-medallions-v2",
  "quest.breach_reading1h":"./assets/ui/quest-reading.png?v=20260809-medallions-v2",
  "quest.walk":"./assets/ui/quest-walk.png?v=20260809-medallions-v2",
  "quest.march":"./assets/ui/quest-walk.png?v=20260809-medallions-v2",
  "quest.sp_walk30":"./assets/ui/quest-walk.png?v=20260809-medallions-v2",
  "quest.sp_sun":"./assets/ui/quest-sp-sun.png?v=20260809-medallions-v2",

  "quest.pushups":"./assets/ui/quest-pushups.png?v=20260809-medallions-v2",
  "exercise.pushups":"./assets/ui/quest-pushups.png?v=20260809-medallions-v2",
  "quest.ex_pushups":"./assets/ui/quest-pushups.png?v=20260809-medallions-v2",
  "quest.dips":"./assets/ui/quest-dips.png?v=20260809-medallions-v2",
  "exercise.dips":"./assets/ui/quest-dips.png?v=20260809-medallions-v2",
  "quest.ex_dips":"./assets/ui/quest-dips.png?v=20260809-medallions-v2",

  "quest.crunches":"./assets/ui/quest-abs.png?v=20260809-medallions-v2",
  "exercise.crunches":"./assets/ui/quest-abs.png?v=20260809-medallions-v2",
  "quest.ex_crunches":"./assets/ui/quest-abs.png?v=20260809-medallions-v2",
  "quest.leg_raises":"./assets/ui/quest-abs.png?v=20260809-medallions-v2",
  "exercise.leg_raises":"./assets/ui/quest-abs.png?v=20260809-medallions-v2",
  "quest.ex_leg_raises":"./assets/ui/quest-abs.png?v=20260809-medallions-v2",
  "quest.plank":"./assets/ui/quest-abs.png?v=20260809-medallions-v2",
  "exercise.plank":"./assets/ui/quest-abs.png?v=20260809-medallions-v2",
  "quest.ex_plank":"./assets/ui/quest-abs.png?v=20260809-medallions-v2",
  "quest.side_plank":"./assets/ui/quest-abs.png?v=20260809-medallions-v2",
  "exercise.side_plank":"./assets/ui/quest-abs.png?v=20260809-medallions-v2",
  "quest.ex_side_plank":"./assets/ui/quest-abs.png?v=20260809-medallions-v2",

  "quest.negative_pullups":"./assets/ui/quest-pullups.png?v=20260809-medallions-v2",
  "exercise.negative_pullups":"./assets/ui/quest-pullups.png?v=20260809-medallions-v2",
  "quest.ex_negative_pullups":"./assets/ui/quest-pullups.png?v=20260809-medallions-v2",
  "quest.australian_pullups":"./assets/ui/quest-pullups.png?v=20260809-medallions-v2",
  "exercise.australian_pullups":"./assets/ui/quest-pullups.png?v=20260809-medallions-v2",
  "quest.ex_australian_pullups":"./assets/ui/quest-pullups.png?v=20260809-medallions-v2",
  "quest.grips":"./assets/ui/quest-pullups.png?v=20260809-medallions-v2",

  "quest.squats":"./assets/ui/quest-legs.png?v=20260809-medallions-v2",
  "exercise.squats":"./assets/ui/quest-legs.png?v=20260809-medallions-v2",
  "quest.ex_squats":"./assets/ui/quest-legs.png?v=20260809-medallions-v2",
  "quest.calves":"./assets/ui/quest-legs.png?v=20260809-medallions-v2",
  "exercise.calves":"./assets/ui/quest-legs.png?v=20260809-medallions-v2",
  "quest.ex_calves":"./assets/ui/quest-legs.png?v=20260809-medallions-v2",
  "quest.lunges":"./assets/ui/quest-legs.png?v=20260809-medallions-v2",
  "exercise.lunges":"./assets/ui/quest-legs.png?v=20260809-medallions-v2",
  "quest.ex_lunges":"./assets/ui/quest-legs.png?v=20260809-medallions-v2",
  "quest.breach_squats150":"./assets/ui/quest-legs.png?v=20260809-medallions-v2",

  "quest.balance":"./assets/ui/quest-balance.png?v=20260809-medallions-v2",
  "quest.run":"./assets/ui/quest-run.png?v=20260809-medallions-v2",
  "quest.breach_run10":"./assets/ui/quest-run.png?v=20260809-medallions-v2",
  "quest.sp_fruits":"./assets/ui/quest-fruits.png?v=20260809-medallions-v2",
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
