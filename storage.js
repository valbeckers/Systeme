export const STORAGE_VERSION = "2026-05-11-v4";
export const BACKUP_KEYS = ["sl_v3","sl_v3_backup1","sl_v3_backup2","sl_v3_backup3"];

// Lecture : essaie la clé principale, puis les sauvegardes de secours.
// La normalisation reste injectée par app.js afin de ne pas coupler le stockage
// aux règles métier et aux migrations de l'application.
export function loadStoredState(cleanState){
  const normalize = typeof cleanState === "function" ? cleanState : value => value;
  for(const key of BACKUP_KEYS){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      const parsed = JSON.parse(raw);
      if(parsed && typeof parsed === "object" && parsed.statXp){
        // Si un backup valide est utilisé, il redevient la sauvegarde principale.
        if(key !== "sl_v3"){
          try{ localStorage.setItem("sl_v3",raw); }catch{}
        }
        return normalize(parsed);
      }
    }catch{}
  }
  return null;
}

// Écriture : nettoie l'état via app.js, effectue la rotation des backups,
// puis enregistre la nouvelle sauvegarde principale.
export function saveStoredState(state,exportState){
  try{
    const serialize = typeof exportState === "function" ? exportState : value => value;
    const toSave = serialize(state);
    const json = JSON.stringify(toSave);

    try{
      const current = localStorage.getItem("sl_v3");
      const backup1 = localStorage.getItem("sl_v3_backup1");
      const backup2 = localStorage.getItem("sl_v3_backup2");

      // La rotation ne se fait que si la valeur change réellement.
      if(current && current !== json){
        if(backup2) localStorage.setItem("sl_v3_backup3",backup2);
        if(backup1) localStorage.setItem("sl_v3_backup2",backup1);
        localStorage.setItem("sl_v3_backup1",current);
      }
    }catch{}

    localStorage.setItem("sl_v3",json);
    localStorage.setItem("sl_version",STORAGE_VERSION);
  }catch{}
}
