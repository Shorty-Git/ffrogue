export type Element='fire'|'ice'|'lightning'|'water'|'wind'|'earth'|'light'|'dark';
export const ELEMENTS:Element[];
export const ENEMY_ELEMENT_RESIST:Record<string,Partial<Record<Element,number>>>;
export const ENEMY_SKILL_ELEMENTS:Record<string,Record<string,Element[]>>;
export const HERO_ELEMENT_RESIST:Record<string,Partial<Record<Element,number>>>;
