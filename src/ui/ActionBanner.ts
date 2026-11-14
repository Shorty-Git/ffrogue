import type Phaser from 'phaser';

export interface CombatActionNotice {
  sequence:number;actorKey:string;actorName:string;abilityId:string;abilityName:string;
  side:'hero'|'enemy';kind:'attack'|'skill'|'prepare';origin:'source'|'ffrogue'|'basic';
}

/** Arcade banner colours (docs/game-design.md, UI): hero actions dark with a yellow edge, enemy actions red. */
const STYLE={hero:{fill:0x1f2126,edge:0xffd23f,name:'#fff8ec',actor:'#b6bac2'},enemy:{fill:0xff4d5e,edge:0x08090a,name:'#1a0610',actor:'#3a0610'}} as const;
const BANNER_FONT='"Archivo Black", "Archivo", Arial, sans-serif';

/**
 * Action banner across the top of the arena: a chunky Arcade bar with the ability name large and
 * left-aligned. Presentation-only FIFO; it never holds gameplay or advances action timelines.
 */
export class ActionBanner {
  private readonly root;
  private readonly bar;
  private readonly label;
  private readonly actor;
  private queue:CombatActionNotice[]=[];
  private active=false;
  private tween?:Phaser.Tweens.Tween;
  private generation=0;
  private lastSequence=0;
  private readonly width:number;
  constructor(private readonly scene:Phaser.Scene){
    const width=scene.scale.width;
    this.root=scene.add.container(0,96).setDepth(1800).setVisible(false);
    this.width=width;
    this.bar=scene.add.graphics();
    this.actor=scene.add.text(46,-30,'',{fontFamily:BANNER_FONT,fontSize:'14px',color:STYLE.hero.actor}).setOrigin(0,0);
    this.label=scene.add.text(44,-14,'',{fontFamily:BANNER_FONT,fontSize:'32px',color:STYLE.hero.name}).setOrigin(0,0);
    this.root.add([this.bar,this.actor,this.label]);
    scene.events.on('combat-action',this.enqueue,this);
    scene.events.once('shutdown',()=>{this.clear();scene.events.off('combat-action',this.enqueue,this);});
  }
  private enqueue(notice:CombatActionNotice){if(notice.sequence<=this.lastSequence)return;this.lastSequence=notice.sequence;this.queue.push(notice);this.next();}
  private next(){
    if(this.active||!this.queue.length)return;
    const notice=this.queue.shift()!,generation=this.generation;this.active=true;
    const style=STYLE[notice.side];
    // A tilted tile with a hard drop shadow; the edge sits on its bottom.
    this.bar.clear();
    this.bar.fillStyle(0x08090a,1).fillRect(-20,-30,this.width+40,74);
    this.bar.fillStyle(style.fill,1).fillRect(-20,-38,this.width+40,70);
    this.bar.fillStyle(style.edge,1).fillRect(-20,28,this.width+40,4);
    this.actor.setColor(style.actor);this.label.setColor(style.name);
    this.actor.setText(notice.kind==='prepare'?`${notice.actorName} is charging up`:notice.actorName);
    this.label.setText(notice.abilityName);
    this.label.setScale(Math.min(1,(this.scene.scale.width-90)/Math.max(1,this.label.width)));
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.root.setVisible(true).setAlpha(reduced?1:0).setX(reduced?0:-60);
    this.tween=this.scene.tweens.add({targets:this.root,alpha:1,x:0,duration:reduced?0:160,ease:'Cubic.easeOut',onComplete:()=>{
      if(generation!==this.generation)return;
      this.tween=this.scene.tweens.add({targets:this.root,alpha:0,delay:950,duration:reduced?0:180,onComplete:()=>{
        if(generation!==this.generation)return;this.root.setVisible(false);this.active=false;this.next();
      }});
    }});
  }
  clear(){this.generation++;this.tween?.stop();this.queue=[];this.active=false;this.root.setVisible(false);}
}
