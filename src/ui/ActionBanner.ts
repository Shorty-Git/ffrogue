import type Phaser from 'phaser';
import {RPG,RPG_FONT,rpgHex} from './designTokens';
import {rpgPanel} from './rpgPanel';

export interface CombatActionNotice {
  sequence:number;actorKey:string;actorName:string;abilityId:string;abilityName:string;
  side:'hero'|'enemy';kind:'attack'|'skill'|'prepare';origin:'source'|'ffrogue'|'basic';
}

/** Presentation-only FIFO. It never holds gameplay or advances action timelines. */
export class ActionBanner {
  private readonly root;
  private readonly label;
  private readonly provenance;
  private queue:CombatActionNotice[]=[];
  private active=false;
  private tween?:Phaser.Tweens.Tween;
  private generation=0;
  private lastSequence=0;
  constructor(private readonly scene:Phaser.Scene){
    this.root=scene.add.container(scene.scale.width/2,226).setDepth(1800).setVisible(false);
    this.label=scene.add.text(0,-13,'',{fontFamily:RPG_FONT,fontSize:'26px',fontStyle:'bold',color:rpgHex(RPG.ink)}).setOrigin(.5,0);
    this.provenance=scene.add.text(0,19,'',{fontFamily:RPG_FONT,fontSize:'13px',color:rpgHex(RPG.muted)}).setOrigin(.5,0);
    this.root.add([rpgPanel(scene,0,7,760,64),this.label,this.provenance]);
    scene.events.on('combat-action',this.enqueue,this);
    scene.events.once('shutdown',()=>{this.clear();scene.events.off('combat-action',this.enqueue,this);});
  }
  private enqueue(notice:CombatActionNotice){if(notice.sequence<=this.lastSequence)return;this.lastSequence=notice.sequence;this.queue.push(notice);this.next();}
  private next(){
    if(this.active||!this.queue.length)return;
    const notice=this.queue.shift()!,generation=this.generation;this.active=true;
    this.label.setText(`${notice.actorName} ${notice.kind==='prepare'?'prepares':'uses'} ${notice.abilityName}`);
    this.label.setScale(Math.min(1,710/Math.max(1,this.label.width)));
    this.provenance.setText(notice.origin==='ffrogue'?'FFRogue ability':'');
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.root.setVisible(true).setAlpha(reduced?1:0);
    this.tween=this.scene.tweens.add({targets:this.root,alpha:1,duration:reduced?0:85,onComplete:()=>{
      if(generation!==this.generation)return;
      this.tween=this.scene.tweens.add({targets:this.root,alpha:0,delay:480,duration:reduced?0:120,onComplete:()=>{
        if(generation!==this.generation)return;this.root.setVisible(false);this.active=false;this.next();
      }});
    }});
  }
  clear(){this.generation++;this.tween?.stop();this.queue=[];this.active=false;this.root.setVisible(false);}
}
