import type Phaser from 'phaser';

export interface CombatActionNotice {
  sequence:number;actorKey:string;actorName:string;abilityId:string;abilityName:string;
  side:'hero'|'enemy';kind:'attack'|'skill'|'prepare';origin:'source'|'ffrogue'|'basic';
}

/** Banner colours (docs/game-design.md, UI "FF Graphite"): a dark band with gold hairlines for the party,
 * deep red with red hairlines for enemies. */
const STYLE={hero:{fill:0x111215,edge:0xe2c26b,name:'#f2efe8',actor:'#e2c26b'},enemy:{fill:0x2a0f12,edge:0xe5534b,name:'#f6dcd8',actor:'#e5534b'}} as const;
const NAME_FONT='Cinzel, Georgia, serif',ACTOR_FONT='"Source Sans 3", "Segoe UI", sans-serif';

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
    this.actor=scene.add.text(48,-30,'',{fontFamily:ACTOR_FONT,fontSize:'13px',fontStyle:'bold',color:STYLE.hero.actor}).setOrigin(0,0).setLetterSpacing(3);
    this.label=scene.add.text(46,-12,'',{fontFamily:NAME_FONT,fontSize:'32px',fontStyle:'600',color:STYLE.hero.name}).setOrigin(0,0).setShadow(0,2,'#000000',8,false,true);
    this.root.add([this.bar,this.actor,this.label]);
    scene.events.on('combat-action',this.enqueue,this);
    scene.events.once('shutdown',()=>{this.clear();scene.events.off('combat-action',this.enqueue,this);});
  }
  private enqueue(notice:CombatActionNotice){if(notice.sequence<=this.lastSequence)return;this.lastSequence=notice.sequence;this.queue.push(notice);this.next();}
  private next(){
    if(this.active||!this.queue.length)return;
    const notice=this.queue.shift()!,generation=this.generation;this.active=true;
    const style=STYLE[notice.side];
    // Translucent band fading out to the right, hairlines above and below.
    this.bar.clear();
    this.bar.fillGradientStyle(style.fill,style.fill,style.fill,style.fill,.94,.15,.94,.15).fillRect(0,-38,this.width,70);
    this.bar.fillGradientStyle(style.edge,style.edge,style.edge,style.edge,.9,0,.9,0).fillRect(0,-38,this.width,1).fillRect(0,31,this.width,1);
    this.actor.setColor(style.actor);this.label.setColor(style.name);
    this.actor.setText((notice.kind==='prepare'?`${notice.actorName} is charging up`:notice.actorName).toUpperCase());
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
