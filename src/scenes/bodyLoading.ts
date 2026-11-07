import Phaser from 'phaser';
import type {BodyAsset} from '../data/bodyAssets.mjs';
import {Textures} from 'phaser';
/** Phaser's scene preload barrier guarantees all required sheets precede create. */
export function queueBodyAssets(scene:Phaser.Scene,assets:BodyAsset[]):void {
 for(const asset of assets){
  const layers=scene.game.renderer.type===Phaser.WEBGL?asset.meta.bodyLayers:undefined;
  const root=asset.url.slice(0,asset.url.lastIndexOf('/')+1);
  const size={frameWidth:asset.meta.frameWidth,frameHeight:asset.meta.frameHeight};
  if(!scene.textures.exists(asset.texture))scene.load.spritesheet(asset.texture,layers?root+layers.normal:asset.url,size);
  if(layers&&!scene.textures.exists(asset.texture+'_emission'))scene.load.spritesheet(asset.texture+'_emission',root+layers.emission,size);
 }
}
export function missingBodyAssets(scene:Phaser.Scene,assets:BodyAsset[]):string[]{
 return assets.flatMap(a=>{
  const keys=[a.texture];
  if(scene.game.renderer.type===Phaser.WEBGL&&a.meta.bodyLayers)keys.push(a.texture+'_emission');
  return keys.filter(key=>!scene.textures.exists(key));
 });
}

export function setBodySampling(scene:Phaser.Scene,textureKey:string,linear:boolean):void {
 if(!scene.textures.exists(textureKey))return;
 const texture=scene.textures.get(textureKey);
 texture.setFilter(linear?Textures.FilterMode.LINEAR:Textures.FilterMode.NEAREST);
 for(const name of texture.getFrameNames()){
  const frame=texture.get(name);
  frame.updateUVs();
  if(!linear)continue;
  // Clamp sampling to the edge texel centers of this body frame.
  frame.u0+=.5/frame.source.width;
  frame.u1-=.5/frame.source.width;
  frame.v0+=.5/frame.source.height;
  frame.v1-=.5/frame.source.height;
 }
}
