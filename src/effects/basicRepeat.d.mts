export interface BasicRepeat{minHits:number;maxHits:number;targeting:'target'|'all'|'random';}
export function basicRepeatFromSource(raw:unknown):(BasicRepeat&{power:number})|null;
export function validateBasicRepeat(skill:unknown):BasicRepeat;
