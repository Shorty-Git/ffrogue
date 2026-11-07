type PartyEntry = {name:string; portrait?:string; hp:number; maxHp:number; mp:number; maxMp:number; status:string; active:boolean; disabled:boolean; target?:number};
type Command = {name:string; cost:string; description:string; disabled:boolean; selected:boolean};
type ArenaActor = {id:number; name:string; hp?:number; maxHp?:number; status?:string; boss?:boolean; marked:boolean; selectable:boolean;
  /** Current enemy target: drawn with the crystal target cursor. */ targeted:boolean;
  x:number; y:number; width:number; height:number};
export type CombatHudState = {
  area:string; phase:string; message:string; pending:boolean; party:PartyEntry[]; commands:(Command|null)[]; actors:ArenaActor[];
};

// Crystal arrow pointing at the target from the party side (party stands right of the enemies).
const TARGET_CURSOR=`<svg class="target-cursor" viewBox="0 0 40 28" aria-hidden="true"><defs><linearGradient id="cursor-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#cfe6ff"/><stop offset="1" stop-color="#6f9cc9"/></linearGradient></defs><path d="M2 14 L22 2 L19 10 L38 10 L38 18 L19 18 L22 26 Z" fill="url(#cursor-fill)" stroke="#0b1a2e" stroke-width="2" stroke-linejoin="round"/><path d="M8 14 L20 6.5 L18.5 12 L34 12" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity=".85"/></svg>`;

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

export class CombatHud {
  private readonly root=document.createElement('section');
  private previous='';
  private readonly observer:ResizeObserver;
  private readonly resize=()=>{
    const {left,top,width,height}=this.canvas.getBoundingClientRect();
    Object.assign(this.root.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
  };

  constructor(private readonly canvas:HTMLCanvasElement,activate:(action:string,index:number)=>void){
    this.root.className='combat-ui';
    this.root.setAttribute('aria-label','Battle ribbon');
    this.root.addEventListener('click',event=>{
      const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-command]');
      if(button&&!button.disabled)activate(button.dataset.command!,Number(button.dataset.index));
    });
    document.body.append(this.root);
    this.observer=new ResizeObserver(this.resize);
    this.observer.observe(canvas);
    window.addEventListener('resize',this.resize);
    this.resize();
  }

  moveFocus(delta:number):void {
    const targets=Array.from(this.root.querySelectorAll<HTMLButtonElement>('.arena-hit'));
    if(!targets.length)return;
    const index=targets.indexOf(document.activeElement as HTMLButtonElement);
    targets[index<0?(delta<0?targets.length-1:0):(index+delta+targets.length)%targets.length].focus({preventScroll:true});
  }

  focusedTarget():number|undefined {
    const element=document.activeElement as HTMLElement|null;
    if(element&&this.root.contains(element)&&element.dataset.command==='target')return Number(element.dataset.index);
    return undefined;
  }

  render(state:CombatHudState):void {
    const signature=JSON.stringify(state);
    if(signature===this.previous)return;
    this.previous=signature;
    const focus=this.root.contains(document.activeElement)?(document.activeElement as HTMLElement).dataset.focus:undefined;
    const meter=(kind:string,value:number,max:number)=>`<meter class="${kind}" aria-label="${kind.toUpperCase()}" min="0" max="${Math.max(1,max)}" value="${Math.max(0,value)}"></meter>`;
    const attrs=(action:string,i:number)=>`data-command="${action}" data-index="${i}" data-focus="${action}-${i}"`;
    const party=state.party.map((hero,i)=>`<button type="button" ${attrs(hero.target===undefined?'hero':'target',hero.target??i)} ${hero.disabled?'disabled':''} aria-pressed="${hero.active}">
      ${hero.portrait?`<img src="${escapeHtml(hero.portrait)}" alt="" draggable="false">`:''}
      <span class="ribbon-member"><strong>${escapeHtml(hero.name)}</strong><small>${escapeHtml(hero.status)}</small>
      <span>HP <b>${hero.hp.toLocaleString()}</b> / ${hero.maxHp.toLocaleString()}</span>${meter('hp',hero.hp,hero.maxHp)}
      <span>MP <b>${hero.mp}</b> / ${hero.maxMp}</span>${meter('mp',hero.mp,hero.maxMp)}</span></button>`).join('');
    const commands=state.commands.map((command,i)=>command?`<button type="button" ${attrs('ability',i)} ${command.disabled?'disabled':''} aria-pressed="${command.selected}" title="${escapeHtml(command.description)}">
      <kbd>${i+1}</kbd><strong>${escapeHtml(command.name)}</strong><small>${escapeHtml(command.cost)}</small></button>`:`<span class="ribbon-empty" aria-hidden="true"></span>`).join('');
    const actors=state.actors.map(actor=>{
      const position=`left:${actor.x}%;top:${actor.y}%;width:${actor.width}%;height:${actor.height}%`;
      const label=actor.hp===undefined?'':`<span class="arena-health ${actor.boss?'is-boss':''}"><strong>${escapeHtml(actor.name)}</strong><span>${actor.hp.toLocaleString()} / ${actor.maxHp!.toLocaleString()}</span>${meter('hp',actor.hp,actor.maxHp!)}${actor.status?`<small>${escapeHtml(actor.status)}</small>`:''}</span>`;
      return `<div class="arena-actor ${actor.marked?'is-marked':''} ${actor.targeted?'is-targeted':''}" style="${position}">${label}${actor.targeted?TARGET_CURSOR:''}
        ${actor.selectable?`<button type="button" class="arena-hit" ${attrs('target',actor.id)} aria-label="Target ${escapeHtml(actor.name)}" aria-pressed="${actor.targeted}"></button>`:''}</div>`;
    }).join('');
    this.root.innerHTML=`<div class="combat-caption"><strong>${escapeHtml(state.area)}</strong><span>${escapeHtml(state.phase)}</span></div>
      ${actors}<div class="combat-dock"><div class="combat-party">${party}</div><div class="ribbon-commands">${commands}</div>
      <div class="ribbon-prompt"><span role="status">${escapeHtml(state.message)}</span>${state.pending?`<button type="button" ${attrs('clear',0)}>Cancel <small>Esc</small></button>`:''}</div></div>`;
    if(focus)this.root.querySelector<HTMLElement>(`[data-focus="${focus}"]:not(:disabled)`)?.focus({preventScroll:true});
  }

  destroy():void {this.observer.disconnect();window.removeEventListener('resize',this.resize);this.root.remove();}
}
