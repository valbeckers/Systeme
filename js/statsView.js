import { RANKS, RANK_STAT_REQUIREMENTS, STATS, STAT_COLOR, STAT_LBL } from "./config.js";
import { MAX_PRESTIGE, countStatsAtLevel } from "./progression.js";
import { xpForLvl, totForLvl, getLvl } from "./xp.js";

const { h, Fragment } = window.preact;
const { useState } = window.preactHooks;

const RADAR_STATS = ["Sante", "Force", "Esprit", "Endurance", "Agilite", "Discipline"];

function polarPoint(cx, cy, radius, index, total){
  const angle = (-Math.PI / 2) + (index * Math.PI * 2 / total);
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function buildRadarPolygonPoints(values, maxValue, cx, cy, radius){
  const total = values.length;
  return values.map((value, index)=>{
    const ratio = maxValue > 0 ? value / maxValue : 0;
    const point = polarPoint(cx, cy, radius * ratio, index, total);
    return `${point.x},${point.y}`;
  }).join(" ");
}

function StatsRadarBackground({ state, focused }){
  const statLevels = RADAR_STATS.map(stat => ({
    id: stat,
    color: STAT_COLOR[stat] || "#fff",
    value: Math.max(0, getLvl(state.statXp?.[stat] || 0)),
  }));

  const maxValue = Math.max(1, ...statLevels.map(s => s.value));
  const size = 300;
  const cx = 150;
  const cy = 150;
  const radius = 116;
  const gridLevels = 4;

  const polygonPoints = buildRadarPolygonPoints(statLevels.map(s => s.value), maxValue, cx, cy, radius);

  return h("svg", {
        viewBox:`0 0 ${size} ${size}`,
        "aria-hidden":"true",
        style:"position:absolute;left:50%;top:50%;width:min(82%,360px);height:auto;aspect-ratio:1;transform:translate(-50%,-50%);overflow:visible;pointer-events:none;opacity:"+(focused?"1":".38")+";transition:opacity .25s ease,filter .25s ease;filter:"+(focused?"drop-shadow(0 0 14px rgba(139,92,246,.28))":"none")
      },
        Array.from({ length:gridLevels }, (_, idx) => {
          const level = (idx + 1) / gridLevels;
          const points = RADAR_STATS.map((_, statIndex) => {
            const point = polarPoint(cx, cy, radius * level, statIndex, RADAR_STATS.length);
            return `${point.x},${point.y}`;
          }).join(" ");
          return h("polygon", {
            key:`grid-${idx}`,
            points,
            fill: idx === gridLevels - 1 ? "rgba(129,140,248,0.025)" : "transparent",
            stroke:focused?"rgba(167,139,250,.30)":"rgba(167,139,250,.18)",
            "stroke-width":"1"
          });
        }),
        RADAR_STATS.map((stat, idx) => {
          const outer = polarPoint(cx, cy, radius, idx, RADAR_STATS.length);
          const labelPoint = polarPoint(cx, cy, radius + 17, idx, RADAR_STATS.length);
          return h(Fragment, { key:`axis-${stat}` },
            h("line", {
              x1: cx,
              y1: cy,
              x2: outer.x,
              y2: outer.y,
              stroke:focused?"rgba(167,139,250,.34)":"rgba(167,139,250,.20)",
              "stroke-width":"1"
            }),
            focused&&h("text", {
              x:labelPoint.x,
              y:labelPoint.y,
              fill:STAT_COLOR[stat]||"#fff",
              "font-size":"9.5",
              "font-family":"Orbitron, sans-serif",
              "font-weight":"700",
              "letter-spacing":".35",
              "text-anchor":labelPoint.x<cx-10?"end":labelPoint.x>cx+10?"start":"middle",
              "dominant-baseline":labelPoint.y<cy-30?"auto":labelPoint.y>cy+30?"hanging":"middle",
              style:"paint-order:stroke;stroke:rgba(0,0,0,.92);stroke-width:3px;stroke-linejoin:round"
            },STAT_LBL[stat]||stat)
          );
        }),
        h("polygon", {
          points: polygonPoints,
          fill:focused?"rgba(139,92,246,.24)":"rgba(139,92,246,.14)",
          stroke:focused?"rgba(192,132,252,.98)":"rgba(192,132,252,.72)",
          "stroke-width":focused?"2.2":"1.7"
        }),
        statLevels.map((stat, idx) => {
          const point = polarPoint(cx, cy, maxValue > 0 ? radius * (stat.value / maxValue) : 0, idx, RADAR_STATS.length);
          return h("circle", {
            key:`value-${stat.id}`,
            cx: point.x,
            cy: point.y,
            r:focused?"5":"4.2",
            fill: stat.color,
            stroke:"rgba(0,0,0,.86)",
            "stroke-width":"1.4",
            style:"filter:drop-shadow(0 0 4px "+stat.color+")"
          });
        })
      );
}

export function StatsTab({
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
}){
  const [radarFocused,setRadarFocused] = useState(false);
  return h("div",{class:"tab"},
    h("div",{class:"card"},
      h("div",{class:"ctitle"},"Chemin vers le rang S"),
      h("div",{class:"rpath"},RANKS.map((r,i)=>{
        const xpReached=effectiveXp>=r.xpRequired;
        // Rang réellement débloqué : XP + condition de stats
        const req = RANK_STAT_REQUIREMENTS[r.id];
        const statsOk = !req || countStatsAtLevel(state.stats, req.level) >= req.count;
        const reached = xpReached && statsOk;
        const blocked = xpReached && !statsOk;
        const cur = r.id===rank.id;
        // Couleur du cercle : vert si atteint, orange si bloqué (XP OK mais stats KO), gris sinon
        const borderColor = reached ? r.color : blocked ? "#fb923c" : "#333";
        const textColor = reached ? r.color : blocked ? "#fb923c" : "#444";
        return h(Fragment,{key:r.id},
          h("div",{class:"rnode"},
            h("div",{class:"rcirc",style:"border-color:"+borderColor+";color:"+textColor+";background:"+(cur?r.color+"22":"transparent")+";box-shadow:"+(cur?"0 0 15px "+r.glow:"none")},r.id)
          ),
          i<RANKS.length-1&&(()=>{
            const nextR = RANKS[i+1];
            const nextReq = RANK_STAT_REQUIREMENTS[nextR.id];
            const nextStatsOk = !nextReq || countStatsAtLevel(state.stats, nextReq.level) >= nextReq.count;
            const connReached = effectiveXp>=nextR.xpRequired && nextStatsOk;
            return h("div",{class:"rconn",style:"background:"+(connReached?r.color:"#222")});
          })()
        );
      })),
      nextRank&&h("div",{style:"margin-top:8px"},
        h("div",{style:"display:flex;justify-content:space-between;font-size:11px;color:var(--td);margin-bottom:4px;font-family:Orbitron,sans-serif"},
          h("span",null,"Rang "+rank.id+" → "+nextRank.id),
          h("span",null,effectiveXp.toFixed(0)+" / "+nextRank.xpRequired+" XP")
        ),
        h("div",{class:"xpbar"},h("div",{class:"xpfill",style:"width:"+rankPct+"%"}))
      ),
      (()=>{
        let label, count, threshold, ok;
        if(nextRank && nextRankReq){
          count = nextRankReq.count;
          threshold = nextRankReq.level;
          ok = nextRankStatsOk;
          label = "Rang "+nextRank.id;
        } else if(!nextRank && ascReq && prestige<MAX_PRESTIGE){
          count = ascReq.count;
          threshold = ascReq.level;
          ok = ascStatsOk;
          label = "Ascension "+nextAscension;
        } else {
          return null;
        }
        const reached = countStatsAtLevel(state.stats, threshold);
        const summaryColor = ok ? "#4ade80" : (rankBlocked || prestigeBlocked) ? "#fb923c" : "var(--td)";
        return h("div",{
          onClick:()=>setShowRankReqStats(v=>!v),
          style:"margin-top:10px;padding:9px 10px;background:rgba(255,255,255,0.02);border:1px solid "+(ok?"#4ade8033":(rankBlocked||prestigeBlocked)?"#fb923c44":"rgba(255,255,255,0.06)")+";border-radius:8px;cursor:pointer;user-select:none"
        },
          h("div",{style:"display:flex;justify-content:space-between;align-items:center;font-size:10px;font-family:Orbitron,sans-serif;letter-spacing:1px"},
            h("span",{style:"color:var(--td);text-transform:uppercase"},"Condition "+label),
            h("span",{style:"color:"+summaryColor},(ok?"✓ ":"")+reached+"/"+count+" stats niv. "+threshold+" "+(showRankReqStats?"▲":"▼"))
          ),
          showRankReqStats&&h("div",{style:"margin-top:8px;display:grid;grid-template-columns:repeat(2,1fr);gap:4px"},
            STATS.map(s=>{
              const lvl = state.stats[s]||0;
              const statOk = lvl>=threshold;
              return h("div",{key:s,style:"display:flex;justify-content:space-between;align-items:center;font-size:10px;padding:4px 6px;background:rgba(255,255,255,0.02);border-radius:4px;border:1px solid "+(statOk?"#4ade8033":"rgba(255,255,255,0.04)")},
                h("span",{style:"color:"+(STAT_COLOR[s]||"#fff")},STAT_LBL[s]||s),
                h("span",{style:"font-family:Orbitron,sans-serif;color:"+(statOk?"#4ade80":"var(--td)")},lvl+"/"+threshold)
              );
            })
          )
        );
      })()
    ),
    h("div",{class:"card"},
      h("div",{class:"ctitle"},"Niveau global"),
      h("div",{style:"display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:6px"},
        h("div",null,
          h("div",{style:"font-family:Orbitron,sans-serif;font-size:12px;font-weight:800;letter-spacing:1px;color:#fff;line-height:1;text-shadow:none"},"Niveau "+globalLevel.level),
          h("div",{style:"font-size:10px;color:#fff;text-transform:uppercase;letter-spacing:1px;margin-top:4px"},globalLevel.maxed?"Progression maximale":"Vers niveau "+globalLevel.nextLevel)
        ),
        h("div",{style:"font-size:10px;color:var(--td);font-family:Orbitron,sans-serif;text-align:right"},
          globalLevel.maxed?"MAX":Math.round(globalLevel.inLevel).toLocaleString("fr-FR")+" / "+Math.round(globalLevel.need).toLocaleString("fr-FR")+" XP"
        )
      ),
      h("div",{class:"xpbar",style:"height:7px"},h("div",{class:"xpfill",style:"width:"+globalLevel.pct+"%"}))
    ),
    h("div",{class:"card",style:"position:relative;overflow:hidden;isolation:isolate"},
      h(StatsRadarBackground,{state,focused:radarFocused}),
      h("div",{
        class:"ctitle",
        onClick:()=>setRadarFocused(v=>!v),
        title:radarFocused?"Revenir aux caractéristiques":"Mettre le graphique en évidence",
        style:"position:relative;z-index:3;cursor:pointer;user-select:none"
      },"Caractéristiques"),
      h("div",{
        style:"position:relative;z-index:2;opacity:"+(radarFocused?".16":"1")+";transition:opacity .25s ease;text-shadow:0 1px 4px #000,0 0 8px #000"
      },
        STATS.map(s=>{
          const sx=state.statXp[s]||0, lvl=getLvl(sx);
          const xpIn=sx-totForLvl(lvl), xpNeed=xpForLvl(lvl), pct=Math.max(0,Math.min(100,(xpIn/xpNeed)*100));
          return h("div",{key:s,class:"schr"},
            h("div",{class:"schn"},h("span",null,STAT_LBL[s]||s),h("span",{class:"schlvl"},"Niv. "+lvl)),
            h("div",{class:"schb"},h("div",{class:"schf",style:"width:"+pct+"%;background:linear-gradient(90deg,"+(STAT_COLOR[s]||"#fff")+"88,"+(STAT_COLOR[s]||"#fff")+")"})),
            h("div",{style:"font-size:9px;color:var(--td);margin-top:2px;font-family:Orbitron,sans-serif"},sx.toLocaleString("fr-FR")+" / "+totForLvl(lvl+1).toLocaleString("fr-FR")+" XP")
          );
        })
      )
    )
  );
}
