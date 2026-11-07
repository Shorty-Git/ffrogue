import type Phaser from 'phaser';
import type {PreparedSceneManifest} from './sceneProfile.mjs';
export interface PreparedSceneHost {
  width: number; height: number;
  arena: {x:number;y:number;width:number;height:number};
  /** Visible battlefield (defaults to arena): clip region and target of screen coverage surfaces. */
  view?: {x:number;y:number;width:number;height:number};
  caster: {x:number;y:number};
  /** Caster footprint for source caster-unit rectangles (idle frame, pivot, scale). */
  casterUnit?: {frameWidth:number;frameHeight:number;pivotX:number;pivotY:number;scale:number};
  targets: Record<string,{x:number;y:number}>;
  units: Record<string,{frameWidth:number;frameHeight:number;pivotX:number;pivotY:number;scale:number}>;
}
export interface PreparedSceneBridge {
  ready: Promise<void>;
  canPlay(key:string,count?:number):boolean;
  duration(key:string):number;
  choreography(key:string):{movement:'dash'|'stationary';approachFrames:number;returnFrames:number;targetOffsetX:number};
  play(key:string,host:PreparedSceneHost,onComplete?:()=>void,onFrame?:(frame:number)=>void):void;
  stop():void;
  seek(frame:number):void;
  destroy():void;
  snapshot():{active:boolean;key:string|null;frame:number|null;quality:'experimental-preview';errors:string[];limitations:string[];variants:number;host:PreparedSceneHost|null;layers:Record<string,unknown[]>|null};
}
export function casterStrikeOffset(plan:unknown,casterUnit:PreparedSceneHost['casterUnit']):{x:number;y:number}|null;
export function createPreparedSceneBridge(scene:Phaser.Scene,manifests:PreparedSceneManifest[]):PreparedSceneBridge;
export function scenePresentationMembers(plan:{presentation:{scope:string};members:Record<string,unknown>[]},keys:string[]):Record<string,unknown>[];
