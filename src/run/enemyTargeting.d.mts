export interface EnemyTargetCandidate{alive:boolean;hp:number;maxHp:number;}
export function enemyTargetIndex(heroes:EnemyTargetCandidate[],random:()=>number):number;
