export type MusicRole='normal'|'boss'|'area'|'event';
export const musicProfiles:ReadonlyArray<{id:number;title:string;game:string;series:string;role:MusicRole;available:boolean}>;
export function recommendMusic(series:string,role:MusicRole,explicitBoss?:number):number|null;
