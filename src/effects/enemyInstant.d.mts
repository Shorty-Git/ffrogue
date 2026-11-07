import type {EnemyInstantEffect} from '../types/skills';
export function resolveEnemyInstant(effect:EnemyInstantEffect,target:{currentHp:number;isBoss?:boolean},random?:()=>number):{amount:number;executed:boolean;immune:boolean};
