import type {SkillConfig,ActionChoreography} from '../types/skills';
import type {AnimationMeta} from '../types/manifest';
export function validateActionChoreography(skill:SkillConfig,durationFrames?:number,animations?:Record<string,AnimationMeta>):ActionChoreography;
export function actionTravel(choreography:ActionChoreography,prepared:{approachFrames:number;returnFrames:number},hero:{manifest:{animations:Record<string,AnimationMeta>};scaleY:number}):{approachMs:number;returnMs:number;stepDistance?:number};
