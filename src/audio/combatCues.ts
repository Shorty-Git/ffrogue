import {skillCueFiles} from './skillCueRegistry';

// Hand-mixed cues; every other reviewed Source cue plays at a default gain.
const mixedCues = {
  'SE:1': {file:'sword', gain:.29},
  'SE:7': {file:'strike', gain:.26},
  'SE:12': {file:'gun', gain:.25},
  'SE:25': {file:'heal', gain:.22},
  'SE:58': {file:'tolerance-break', gain:.21},
  'SE:82': {file:'status-down', gain:.21},
  'SE:98': {file:'explosion', gain:.22},
  'SE:100': {file:'flash', gain:.24},
  'SE:600': {file:'vortex', gain:.22},
  'SE:614': {file:'kyougiri', gain:.24},
  'System:47': {file:'dissolve', gain:.31},
  'System:48': {file:'special-dissolve', gain:.30},
  'System:69': {file:'critical', gain:.23},
} as const;
const generatedCues = Object.fromEntries(Object.entries(skillCueFiles)
  .filter(([key]) => !Object.hasOwn(mixedCues, key)).map(([key, file]) => [key, {file, gain: .23}]));
export const combatCues: Record<string, {file: string; gain: number}> = {...generatedCues, ...mixedCues};

export type CombatCue = string;
// Memorial battle_group.deadEffect routed through MonsterUnit::deadFadeOut.
export const enemyDissolveCues: Readonly<Partial<Record<string, CombatCue>>> = {
  '1110310':'System:47',
  '2061310':'System:48',
  '3110010':'System:48',
  '4060810':'System:48',
};
export function isCombatCue(value: string): value is CombatCue {
  return Object.hasOwn(combatCues, value);
}
