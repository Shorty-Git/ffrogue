import type Phaser from 'phaser';
import {RPG_FONT} from './designTokens';

export interface CombatActionNotice {
  sequence:number;actorKey:string;actorName:string;abilityId:string;abilityName:string;
  side:'hero'|'enemy';kind:'attack'|'skill'|'prepare';origin:'source'|'ffrogue'|'basic';
}

const TEXTURES={hero:'ui_skill_banner_ally',enemy:'ui_skill_banner_enemy'} as const;
const FILES={hero:'assets/ui/battle/skill_banner_ally.png',enemy:'assets/ui/battle/skill_banner_enemy.png'} as const;

/**
 * FFBE-style action banner: the original blue (party) / red (enemy) skill bars from the battle UI
 * atlas across the top of the arena, with the ability name large and left-aligned. Presentation-
 * only FIFO; it never holds gameplay or advances action timelines.
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
  constructor(private readonly scene:Phaser.Scene){
    const width=scene.scale.width;
    this.root=scene.add.container(0,96).setDepth(1800).setVisible(false);
    this.bar=scene.add.image(0,0,'__WHITE').setOrigin(0,.5).setDisplaySize(width,74);
    this.actor=scene.add.text(46,-30,'',{fontFamily:RPG_FONT,fontSize:'15px',fontStyle:'bold',color:'#c9d6f2'}).setOrigin(0,0);
    this.label=scene.add.text(44,-12,'',{fontFamily:RPG_FONT,fontSize:'34px',fontStyle:'bold',color:'#ffffff'})
      .setOrigin(0,0).setShadow(2,2,'#000814',4,true,true);
    this.root.add([this.bar,this.actor,this.label]);
    for(const side of ['hero','enemy'] as const)if(!scene.textures.exists(TEXTURES[side]))scene.load.image(TEXTURES[side],FILES[side]);
    if(!scene.load.isLoading())scene.load.start();
    scene.events.on('combat-action',this.enqueue,this);
    scene.events.once('shutdown',()=>{this.clear();scene.events.off('combat-action',this.enqueue,this);});
  }
  private enqueue(notice:CombatActionNotice){if(notice.sequence<=this.lastSequence)return;this.lastSequence=notice.sequence;this.queue.push(notice);this.next();}
  private next(){
    if(this.active||!this.queue.length)return;
    const notice=this.queue.shift()!,generation=this.generation;this.active=true;
    const texture=TEXTURES[notice.side];
    if(this.scene.textures.exists(texture))this.bar.setTexture(texture).setDisplaySize(this.scene.scale.width,74).setAlpha(1);
    else this.bar.setTint(notice.side==='enemy'?0x6a1d24:0x163a7a).setAlpha(.92);
    this.actor.setText(notice.kind==='prepare'?`${notice.actorName} prepares`:notice.actorName);
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
