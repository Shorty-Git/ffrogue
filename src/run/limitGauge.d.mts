export const LB_MAX:number;
export const LB_PER_ACTION:number;
export const LB_PER_FULL_HP_LOST:number;
export function gainFromAction(gauge:number):number;
export function gainFromDamage(gauge:number,damage:number,maxHp:number):number;
export function isFull(gauge:number):boolean;
