export type NodeType='battle'|'elite'|'event'|'merchant'|'campfire'|'treasure'|'boss';
export interface MapNode{id:string;row:number;col:number;type:NodeType;next:string[];}
export interface ActMap{act:number;final?:true;nodes:MapNode[];}
export const NODE_TYPES:NodeType[];
export const COMBAT_NODES:Set<NodeType>;
export const NODE_LABELS:Record<NodeType,string>;
export const ACT_ROWS:number;export const ACT_COLUMNS:number;export const ACT_PATHS:number;
export const ROW_TYPES:Partial<Record<NodeType,number>>[];
export const PATH_FIGHTS:{min:number;max:number};
export const PATH_ELITES:number[];
export function bossNodeId(act:number):string;
export function mapPaths(map:ActMap):MapNode[][];
export function mapProblems(map:ActMap,act:number):string[];
export function actMap(seed:string,act:number,final?:boolean):ActMap;
export function mapNode(map:ActMap,id:string):MapNode|null;
export function nextNodes(map:ActMap,at:string|null|undefined):MapNode[];
export function validTrail(map:ActMap,trail:unknown):boolean;
