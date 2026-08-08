// ─── SOURCES DES IMAGES D’OBJETS ────────────────────────────────────────────
// Les visuels sont stockés comme fichiers PNG afin de ne plus alourdir app.js.
// Les anciens noms de constantes sont conservés pour limiter les changements
// dans la couche d’interface.

const ASSET_VERSION="20260808-rewrite-rune-art";

function itemAsset(fileName){
  const url=new URL(`../assets/items/${fileName}`,import.meta.url);
  url.searchParams.set("v",ASSET_VERSION);
  return url.href;
}

export const REGRESSION_ORB_ICON_DATA=itemAsset("regression-orb.png");
export const DUNGEON_KEY_ICON_DATA=itemAsset("dungeon-key.png");
export const MINOR_ELIXIR_ICON_DATA=itemAsset("minor-elixir.png");
export const MAJOR_ELIXIR_ICON_DATA=itemAsset("major-elixir.png");
export const SUPREME_ELIXIR_ICON_DATA=itemAsset("supreme-elixir.png");
export const GRIMOIRE_ICON_DATA=itemAsset("transmutation-grimoire.png");
export const DEBT_ACKNOWLEDGEMENT_ICON_DATA=itemAsset("debt-acknowledgement.png");

export const NEW_ITEM_ICON_DATA=Object.freeze({
  codex:itemAsset("codex.png"),
  destinyCompass:itemAsset("destiny-compass.png"),
  etherStopper:itemAsset("ether-stopper.png"),
  rerollToken:itemAsset("reroll-token.png"),
  rewriteRune:itemAsset("rewrite-rune.png"),
  alchemicalCatalyst:itemAsset("alchemical-catalyst.png"),
  masterContract:itemAsset("master-contract.png"),
  recordHammer:itemAsset("record-mark.png"),
  teleportCrystal:itemAsset("teleport-crystal.png"),
  invisibilityCape:itemAsset("invisibility-potion.png"),
  recoveryOintment:itemAsset("recovery-ointment.png"),
  transmutationGrimoire:itemAsset("transmutation-grimoire.png"),
  mysteryMap:itemAsset("depth-map.png"),
  counterpartBalance:itemAsset("counterpart-balance.png")
});
