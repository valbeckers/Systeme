// ─── CYCLE JOURNALIER ET CLÉS DE CALENDRIER ────────────────────────────────
// Fonctions pures utilisées pour le reset global à 5 h, les clés de journée
// et les semaines ISO. Les noms historiques next7AM/current7AMStart sont
// conservés pour éviter toute modification de comportement pendant la
// modularisation ; ils calculent désormais bien les bornes de 5 h.

export function eventDayStr(from=Date.now()){
  const d=new Date(from);
  if(d.getHours()<5) d.setDate(d.getDate()-1);
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+day;
}

export function addDaysStr(day,delta){
  const d=new Date(day+"T12:00:00");
  d.setDate(d.getDate()+delta);
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),dd=String(d.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+dd;
}

// Prochain reset quotidien à 5 h 00.
export function next7AM(from){
  const d = new Date(from||Date.now());
  const result = new Date(d.getFullYear(),d.getMonth(),d.getDate(),5,0,0,0);
  if(d.getHours()<5) return result.getTime();
  result.setDate(result.getDate()+1);
  return result.getTime();
}

// Début de la journée Système courante, fixé à 5 h 00.
export function current7AMStart(from){
  const d=new Date(from||Date.now());
  const result=new Date(d.getFullYear(),d.getMonth(),d.getDate(),5,0,0,0);
  if(d.getHours()<5) result.setDate(result.getDate()-1);
  return result.getTime();
}

export const todayStr = (from=Date.now()) => {
  const d=new Date(from);
  if(d.getHours()<5)d.setDate(d.getDate()-1);
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+day;
};

export const wkStr = (d=new Date()) => {
  // Semaine ISO : commence le lundi.
  const dt=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  const day=dt.getUTCDay()||7; // dimanche=7
  dt.setUTCDate(dt.getUTCDate()+4-day); // jeudi de la semaine ISO
  const yearStart=new Date(Date.UTC(dt.getUTCFullYear(),0,1));
  const wk=Math.ceil(((dt-yearStart)/86400000+1)/7);
  return dt.getUTCFullYear()+"-W"+String(wk).padStart(2,"0");
};

export const prevWkStr = (d=new Date()) => {
  const x=new Date(d);
  x.setDate(x.getDate()-7);
  return wkStr(x);
};
