import Phaser from 'phaser';
import reviewed from '../../public/assets/stages/reviewed.json';
import {arenaCoverScale} from '../ui/battleLayout';
import {BATTLE_ARENAS,type BattleArenaKey} from '../data/battleArenas';

// Reviewed original animation layer, independent of encounter balance and music.
export const STAGE_ANIMATIONS:Record<string,{key:string;root:string}>={
 reactor:{key:'stage_reactor',root:'assets/stages/reactor'},
 ...Object.fromEntries(Object.entries(reviewed).filter(([,arena])=>arena.animation)
   .map(([id])=>[id,{key:'stage_'+id,root:'assets/stages/'+id}])),
};
interface StagePackets {
 schema:'prepared-stage-packets-v1';profile:string;fps:number;count:number;loop:boolean;
 presentation:{canvas:[number,number];origin:[number,number]};
 textures:{file:string;width:number;height:number;sha256:string;filter?:'linear'}[];
 sampling?:{policy:'ffrogue-reviewed-soft-cells-v1';cells:{cell:number;texture:number;rect:[number,number,number,number]}[]};
 cells:{image:string;x:number;y:number;width:number;height:number}[];
 frames:number[][][];
}
function packets(scene:Phaser.Scene,arena:string):StagePackets|undefined {
 const entry=STAGE_ANIMATIONS[arena];if(!entry)return;
 const p=scene.cache.json.get(entry.key)as StagePackets;
 if(p?.schema!=='prepared-stage-packets-v1'||p.profile!=='sspb-v1-affine-normal-add'||!p.loop||p.count!==p.frames.length||p.fps<=0||p.fps>60)throw Error('Unsupported prepared stage animation');
 if(p.sampling&&(p.sampling.policy!=='ffrogue-reviewed-soft-cells-v1'||new Set(p.sampling.cells.map(s=>s.cell)).size!==p.sampling.cells.length
  ||p.sampling.cells.some(s=>!p.cells[s.cell]||p.textures[s.texture]?.filter!=='linear'||s.rect[0]<0||s.rect[1]<0||s.rect[2]!==p.cells[s.cell].width||s.rect[3]!==p.cells[s.cell].height
   ||s.rect[0]+s.rect[2]>p.textures[s.texture].width||s.rect[1]+s.rect[3]>p.textures[s.texture].height)))throw Error('Unsupported stage sampling policy');
 return p;
}
export function queueStageTextures(scene:Phaser.Scene,arena:string):void {
 const entry=STAGE_ANIMATIONS[arena];
 if(entry&&!scene.cache.json.exists(entry.key)){
  scene.load.once('filecomplete-json-'+entry.key,()=>queueStageTextures(scene,arena));
  scene.load.json(entry.key,entry.root+'/animation.json');
  return;
 }
 const p=packets(scene,arena);
 p?.textures.forEach((t,i)=>{const key=entry.key+'_'+i;if(!scene.textures.exists(key))scene.load.image(key,entry.root+'/'+t.file);});
}

/** Original prepared quads on Phaser's existing pipeline; no second scene/camera. */
export class StageAnimation {
 private elapsed=0;private frame=-1;private quads:Phaser.GameObjects.Rope[]=[];
 private maskShape:Phaser.GameObjects.Graphics;private mask:Phaser.Display.Masks.GeometryMask;
 constructor(private scene:Phaser.Scene,private arena:string,private bounds:{x:number;y:number;width:number;height:number},private data:StagePackets){
  data.textures.forEach((t,i)=>scene.textures.get(STAGE_ANIMATIONS[arena].key+'_'+i).setFilter(t.filter==='linear'?Phaser.Textures.FilterMode.LINEAR:Phaser.Textures.FilterMode.NEAREST));
  this.maskShape=scene.make.graphics({x:0,y:0}).fillStyle(0xffffff).fillRect(bounds.x,bounds.y,bounds.width,bounds.height);
  this.mask=this.maskShape.createGeometryMask();
  for(let i=0;i<Math.max(...data.frames.map(f=>f.length));i++){
   const q=scene.add.rope(0,0,STAGE_ANIMATIONS[arena].key+'_0',undefined,[new Phaser.Math.Vector2(),new Phaser.Math.Vector2(1,0)],true);
   q.setMask(this.mask).setDepth(-90+i*.0001);this.quads.push(q);
  }
  this.draw(0);scene.events.on(Phaser.Scenes.Events.UPDATE,this.update,this);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,this.destroy,this);
 }
 private update(_time:number,delta:number):void {this.elapsed+=delta;this.draw(Math.floor(this.elapsed*this.data.fps/1000)%this.data.count);}
 private draw(frame:number):void {
  if(frame===this.frame)return;this.frame=frame;
  const d=this.data,scale=arenaCoverScale(this.bounds.width,this.bounds.height,{width:d.presentation.canvas[0],height:d.presentation.canvas[1],
   contentWidth:(BATTLE_ARENAS[this.arena as BattleArenaKey] as {contentWidth?:number}|undefined)?.contentWidth});
  const x=this.bounds.x+this.bounds.width/2+(d.presentation.origin[0]-d.presentation.canvas[0]/2)*scale;
  const y=this.bounds.y+this.bounds.height/2+(d.presentation.origin[1]-d.presentation.canvas[1]/2)*scale;
  this.quads.forEach((q,i)=>{
   const p=d.frames[frame][i];q.setVisible(!!p);if(!p)return;
   const cell=d.cells[p[0]],sampling=d.sampling?.cells.find(c=>c.cell===p[0]),index=sampling?.texture??d.textures.findIndex(t=>t.file===cell.image),texture=d.textures[index];
   const [cx,cy,cw,ch]=sampling?.rect??[cell.x,cell.y,cell.width,cell.height];
   q.setTexture(STAGE_ANIMATIONS[this.arena].key+'_'+index);q.setPosition(x,y).setScale(scale);
   q.setAlpha(p[2]/255).setBlendMode(p[1]===2?Phaser.BlendModes.ADD:Phaser.BlendModes.NORMAL);
   q.vertices.set(p.slice(5));
   const us=[cx/texture.width,(cx+cw)/texture.width],vs=[cy/texture.height,(cy+ch)/texture.height];
   q.uv.set([us[p[3]?1:0],vs[p[4]?1:0],us[p[3]?1:0],vs[p[4]?0:1],us[p[3]?0:1],vs[p[4]?1:0],us[p[3]?0:1],vs[p[4]?0:1]]);
   q.dirty=false;
  });
 }
 snapshot(){return {arena:this.arena,frame:this.frame,elapsedMs:this.elapsed,fps:this.data.fps,count:this.data.count,draws:this.data.frames[this.frame].length};}
 private destroy():void {this.scene.events.off(Phaser.Scenes.Events.UPDATE,this.update,this);this.quads.forEach(q=>q.destroy());this.mask.destroy();this.maskShape.destroy();}
 static create(scene:Phaser.Scene,arena:string,bounds:{x:number;y:number;width:number;height:number}):StageAnimation|undefined {
  const p=packets(scene,arena);if(!p)return;
  if(p.textures.some((_,i)=>!scene.textures.exists(STAGE_ANIMATIONS[arena].key+'_'+i)))throw Error('Stage texture failed to load');
  return new StageAnimation(scene,arena,bounds,p);
 }
}
