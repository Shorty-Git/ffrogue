/** Original FFBE HP/MP gauges (frames + bars from tools/export_battle_ui.py), shared by battle HUD and menus. */
export const UI_PARTS='/assets/ui/battle/';

const ratio=(value:number,max:number)=>Math.max(0,Math.min(1,value/Math.max(1,max)));
/** FFBE colors HP bars green above half, yellow above a quarter, red below. */
const level=(value:number,max:number)=>{const r=ratio(value,max);return r>.5?'high':r>.25?'mid':'low';};
export const formatValue=(value:number)=>Math.max(0,Math.ceil(value)).toLocaleString('en-US');

/** Gauge frame with its bar placed in the measured track (styles in combatHud.css). */
export function gauge(kind:'hp'|'mp'|'enemy',value:number,max:number,label:string):string{
  return `<span class="gauge gauge-${kind}" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="${Math.max(1,max)}" aria-valuenow="${Math.max(0,value)}">`+
    `<span class="gauge-fill" data-level="${kind==='mp'?'mp':level(value,max)}" style="--fill:${ratio(value,max).toFixed(4)}"></span></span>`;
}

/** Labelled HP or MP gauge row: value above the right end, as on the battle party cards. */
export function gaugeRow(kind:'hp'|'mp',value:number,max:number):string{
  return `<span class="gauge-row"><span class="gauge-value"><b>${formatValue(value)}</b>/${formatValue(max)}</span>${gauge(kind,value,max,kind.toUpperCase())}</span>`;
}
