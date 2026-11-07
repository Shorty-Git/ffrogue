import type {SkillConfig} from '../types/skills';

/** Original FFBE skill icons published by tools/export_skill_icons.mjs. */
export type SkillIconIndex = {skills:Record<string,string>};
const ROOT='/assets/icons/skills/';
let index:SkillIconIndex={skills:{}};

export function setSkillIcons(data:SkillIconIndex|undefined):void{index=data?.skills?data:{skills:{}};}

/** URL of the skill's original icon, or undefined when the export has none for it. */
export function skillIconUrl(skill:Pick<SkillConfig,'ffbeId'|'type'>):string|undefined{
  const type=(skill.type??'ABILITY')==='MAGIC'?'MAGIC':'ABILITY';
  const file=index.skills[`${type}:${skill.ffbeId}`];
  return file?ROOT+file:undefined;
}
