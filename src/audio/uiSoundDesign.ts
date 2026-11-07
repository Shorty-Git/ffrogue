type Note = readonly [at: number, hz: number, length: number, gain: number];
type Glide = readonly [at:number, from:number, to:number, length:number, gain:number, pan:number];
type Cue = { duration: number; notes?: readonly Note[]; contacts?: readonly Note[]; glides?: readonly Glide[] };
const cues = {
  select: {duration:.092, notes:[[0,784,.078,.30],[.027,1175,.06,.10]]},
  selectSoft: {duration:.105, notes:[[0,659,.092,.29],[.029,880,.07,.13]]},
  battleFelt: {duration:.115, notes:[[0,294,.106,.31],[.012,440,.075,.065]],
    contacts:[[0,188,.035,.065]]},
  confirm: {duration:.165, notes:[[0,523,.12,.25],[.042,784,.11,.28]]},
  confirmSoft: {duration:.19, notes:[[0,440,.13,.26],[.058,659,.12,.26]]},
  back: {duration:.14, notes:[[0,587,.078,.24],[.048,392,.08,.23]]},
  unavailable: {duration:.14, notes:[[0,262,.13,.26],[0,277,.08,.15]]},
  reward: {duration:.25, notes:[[0,523,.14,.23],[.045,659,.16,.20],[.092,988,.15,.23]]},
  encounter: {duration:.55, notes:[[.025,146.83,.46,.24],[.09,220,.40,.17],[.17,293.66,.36,.15]],
    contacts:[[0,164,.32,.28],[.11,280,.27,.14]]},
  arcaneGather: {duration:.84, glides:[[0,46,105,.84,.38,-.28],[.07,72,186,.76,.22,.58],
    [.19,145,331,.65,.14,-.72],[.30,249,587,.53,.12,.5]]},
  arcaneImpact: {duration:.44, glides:[[0,106,46,.37,.51,0]], contacts:[[0,98,.19,.49],[.016,890,.12,.25]],
    notes:[[.016,622,.29,.20],[.036,932,.30,.18],[.054,1479,.26,.15]]},
  arcaneReveal: {duration:.52, notes:[[0,466,.40,.19],[.04,698,.42,.15],[.083,932,.43,.11],[.12,1397,.35,.07]]},
  impactGather: {duration:.85, glides:[[0,39,71,.85,.43,0],[.11,57,118,.73,.34,.31],[.24,84,218,.59,.25,-.55]],
    contacts:[[.33,63,.23,.20],[.50,71,.24,.27]]},
  impactHit: {duration:.47, glides:[[0,144,40,.43,.66,0],[.015,218,63,.23,.24,-.35]],
    contacts:[[0,86,.26,.72],[.009,560,.18,.41],[.027,1330,.13,.24]], notes:[[.031,784,.31,.17],[.058,1245,.24,.12]]},
  impactReveal: {duration:.39, notes:[[0,392,.34,.17],[.025,784,.32,.14],[.053,1047,.30,.10]]},
  classicGather: {duration:.82, glides:[[.22,92,258,.58,.35,-.42],[.32,131,392,.48,.26,.46]],
    contacts:[[.36,158,.28,.28],[.50,246,.26,.22]]},
  classicImpact: {duration:.31, glides:[[0,296,77,.25,.39,0]], contacts:[[0,186,.17,.55],[.013,980,.105,.24]],
    notes:[[0,523,.17,.23],[.024,784,.21,.17],[.06,1047,.23,.14]]},
  classicReveal: {duration:.32, notes:[[0,659,.22,.18],[.04,988,.25,.14],[.085,1319,.22,.08]]},
  leverMove: {duration:.17, contacts:[[0,540,.045,.23],[.052,310,.085,.31],[.104,200,.06,.18]]},
  leverSeat: {duration:.105, contacts:[[0,170,.091,.42],[.007,760,.045,.19]]},
  leverReturn: {duration:.09, contacts:[[0,450,.075,.15],[.013,870,.054,.09]]},
  rolling: {duration:.26, contacts:[[.003,430,.035,.15],[.068,340,.041,.15],[.133,475,.038,.16],[.198,380,.035,.14]]},
  reelStop: {duration:.116, contacts:[[0,225,.103,.37],[.006,980,.04,.15]]},
  starReveal: {duration:.31, notes:[[0,659,.18,.27],[.064,988,.19,.22],[.108,1319,.18,.16]]},
  nvReveal: {duration:.42, notes:[[0,196,.23,.31],[.038,587,.25,.22],[.092,880,.26,.22],[.136,1175,.26,.17]], contacts:[[0,150,.15,.23]]},
} satisfies Record<string, Cue>;

export type UiSound = keyof typeof cues;
export const encounterSounds = {
  arcane: {gather:'arcaneGather',impact:'arcaneImpact',reveal:'arcaneReveal'},
  impact: {gather:'impactGather',impact:'impactHit',reveal:'impactReveal'},
  classic: {gather:'classicGather',impact:'classicImpact',reveal:'classicReveal'},
} as const;
export type EncounterSoundPhase = keyof typeof encounterSounds.arcane;

export type UiPreview = 'crystal' | 'soft';

/** FFRogue-authored chimes and mechanical transients, independent of gameplay RNG. */
export function renderUiSound(context: BaseAudioContext, event: UiSound): AudioBuffer {
  const cue: Cue = cues[event];
  const rate = context.sampleRate;
  const buffer = context.createBuffer(cue.glides ? 2 : 1, Math.ceil(cue.duration * rate), rate);
  const samples = buffer.getChannelData(0);
  for (const [at, hz, length, gain] of cue.notes ?? []) {
    const start = Math.round(at * rate);
    const omega = Math.PI * 2 * hz;
    for (let i = 0; i < Math.floor(length * rate) && start + i < samples.length; i++) {
      const t = i / rate;
      const envelope = Math.min(1, t / .005) * (1 - t / length) ** 2;
      const phase = omega * t;
      samples[start + i] += gain * envelope *
        (.76 * Math.sin(phase) + .16 * Math.sin(phase * 2.01) * Math.exp(-50 * t) + .08 * Math.sin(phase * 3.97) * Math.exp(-85 * t));
    }
  }
  let noiseSeed = 0x1b49;
  for (const [at, hz, length, gain] of cue.contacts ?? []) {
    const start = Math.round(at * rate);
    let noise = 0;
    for (let i = 0; i < Math.floor(length * rate) && start + i < samples.length; i++) {
      const t = i / rate;
      noiseSeed = (Math.imul(1664525, noiseSeed) + 1013904223) >>> 0;
      noise += .22 * (noiseSeed / 0x80000000 - 1 - noise);
      const envelope = Math.min(1, t / .0025) * (1 - t / length) ** 3;
      const phase = Math.PI * 2 * hz * t;
      samples[start + i] += gain * envelope * (.5 * noise + .35 * Math.sin(phase) + .15 * Math.sin(phase * 2.76));
    }
  }
  if(cue.glides){
    const right=buffer.getChannelData(1);
    right.set(samples);
    for(const [at,from,to,length,gain,pan] of cue.glides){
      const start=Math.round(at*rate);
      const rising=to>from;
      for(let i=0;i<Math.floor(length*rate)&&start+i<samples.length;i++){
        const t=i/rate, progress=t/length;
        const envelope=rising?Math.sin(Math.PI*progress)**1.4:Math.min(1,t/.006)*(1-progress)**2;
        const phase=2*Math.PI*(from*t+(to-from)*t*t/(2*length));
        const value=gain*envelope*(Math.sin(phase)*.84+Math.sin(phase*2)*.16);
        samples[start+i]+=value*(1-pan*.52);
        right[start+i]+=value*(1+pan*.52);
      }
    }
    let peak=1;
    for(const channel of [samples,right])for(const value of channel)peak=Math.max(peak,Math.abs(value));
    for(const channel of [samples,right])for(let i=0;i<channel.length;i++)channel[i]/=peak;
  }
  return buffer;
}
