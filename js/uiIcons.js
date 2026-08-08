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
