import type {UnitManifest,AnimationMeta} from '../types/manifest';
import type {SkillConfig} from '../types/skills';
export interface BodyAsset {texture:string;url:string;meta:AnimationMeta;}
export function bodyAssets(manifests:Record<string,UnitManifest>,requests:{key:string;clips:string[]}[],forms?:{key:string;assetPath:string}[]):BodyAsset[];
export function heroBodyClips(manifest:UnitManifest,skills:SkillConfig[],attackClip?:string):string[];
