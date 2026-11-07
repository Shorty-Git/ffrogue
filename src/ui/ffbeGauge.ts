/** Original FFBE HP/MP gauges (frames + bars from tools/export_battle_ui.py), shared by battle HUD and menus. */
export const UI_PARTS='/assets/ui/battle/';

const ratio=(value:number,max:number)=>Math.max(0,Math.min(1,value/Math.max(1,max)));
/** FFBE colors HP bars green above half, yellow above a quarter, red below. */
const level=(value:number,max:number)=>{const r=ratio(value,max);return r>.5?'high':r>.25?'mid':'low';};
export const formatValue=(value:number)=>Math.max(0,Math.ceil(value)).toLocaleString('en-US');

/**
 * Gauge frame with its bar placed in the measured track (styles in combatHud.css).
 * A `key` marks the gauge for animated changes (see animateGauges); HP gauges also get the
 * red damage trail that lags behind the bar.
 */
export function gauge(kind:'hp'|'mp'|'enemy',value:number,max:number,label:string,key?:string):string{
  const fill=ratio(value,max).toFixed(4);
  return `<span class="gauge gauge-${kind}" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="${Math.max(1,max)}" aria-valuenow="${Math.max(0,value)}"${key?` data-key="${key}" data-fill="${fill}"`:''}>`+
    (kind==='mp'?'':`<span class="gauge-trail" style="--trail:${fill}"></span>`)+
    `<span class="gauge-fill" data-level="${kind==='mp'?'mp':level(value,max)}" style="--fill:${fill}"></span></span>`;
}

/** Labelled HP or MP gauge row: value above the right end, as on the battle party cards. */
export function gaugeRow(kind:'hp'|'mp',value:number,max:number,key?:string):string{
  return `<span class="gauge-row"><span class="gauge-value"><b>${formatValue(value)}</b>/${formatValue(max)}</span>${gauge(kind,value,max,kind.toUpperCase(),key)}</span>`;
}

type Shown={fill:number;trail:number};
const shownWidth=(gauge:HTMLElement,part:HTMLElement|null)=>{
  const track=parseFloat(getComputedStyle(gauge).getPropertyValue('--track'))||1;
  const width=gauge.getBoundingClientRect().width*track;
  return part&&width>0?part.getBoundingClientRect().width/width:undefined;
};

/** Reads what each keyed gauge currently shows (mid-transition included) before its markup is replaced. */
export function captureGauges(root:ParentNode):Map<string,Shown>{
  const shown=new Map<string,Shown>();
  root.querySelectorAll<HTMLElement>('.gauge[data-key]').forEach(element=>{
    const fill=shownWidth(element,element.querySelector('.gauge-fill'));
    if(fill===undefined)return;
    shown.set(element.dataset.key!,{fill,trail:shownWidth(element,element.querySelector('.gauge-trail'))??fill});
  });
  return shown;
}

/**
 * Restarts each changed gauge from what was shown before the re-render and lets CSS transitions
 * carry it to the new value: the bar moves quickly, the damage trail follows after a short hold.
 */
export function animateGauges(root:ParentNode,before:Map<string,Shown>):void{
  root.querySelectorAll<HTMLElement>('.gauge[data-key]').forEach(element=>{
    const previous=before.get(element.dataset.key!);
    const target=Number(element.dataset.fill);
    if(!previous||Math.abs(previous.fill-target)<.0005&&Math.abs(previous.trail-target)<.0005)return;
    const fill=element.querySelector<HTMLElement>('.gauge-fill')!,trail=element.querySelector<HTMLElement>('.gauge-trail');
    for(const part of [fill,trail])if(part)part.style.transition='none';
    fill.style.setProperty('--fill',previous.fill.toFixed(4));
    trail?.style.setProperty('--trail',Math.max(previous.trail,previous.fill).toFixed(4));
    void element.offsetWidth;
    for(const part of [fill,trail])if(part)part.style.transition='';
    fill.style.setProperty('--fill',target.toFixed(4));
    trail?.style.setProperty('--trail',target.toFixed(4));
  });
}
