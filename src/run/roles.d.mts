export type Role='damage'|'healer'|'tank'|'support';
export const ROLES:Role[];
export const ROLE_LABELS:Record<Role,string>;
export const ROLE_SHARE:number;
export const ROLE_OVERRIDES:Record<string,Role>;
export function skillRole(skill:import('../types/skills').SkillConfig):Role;
export function deriveRole(character:{skills?:import('../types/skills').SkillConfig[]}):Role;
export function roleOf(character:{key:string;skills?:import('../types/skills').SkillConfig[]}):Role;
