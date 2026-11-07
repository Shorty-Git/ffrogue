export interface PopupRect {left:number;top:number;width:number;height:number;}
export interface RewardStageBounds extends PopupRect {arena:{top:number;height:number};party:{left:number;top:number;right:number;bottom:number}[];}
export function rewardPopupLayout(input:{viewport:{width:number;height:number};canvas:PopupRect;arena:{top:number;height:number};party:RewardStageBounds['party'];panel:{width:number;height:number}}):PopupRect&{partyOverlap:number};
