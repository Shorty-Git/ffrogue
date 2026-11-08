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
  leverMove: {duration:.17, contacts:[[0,540,.045,.23],[.052,310,.085,.31],[.104,200,.06,.18]]},
  leverSeat: {duration:.105, contacts:[[0,170,.091,.42],[.007,760,.045,.19]]},
  leverReturn: {duration:.09, contacts:[[0,450,.075,.15],[.013,870,.054,.09]]},
  rolling: {duration:.26, contacts:[[.003,430,.035,.15],[.068,340,.041,.15],[.133,475,.038,.16],[.198,380,.035,.14]]},
  reelStop: {duration:.116, contacts:[[0,225,.103,.37],[.006,980,.04,.15]]},
  starReveal: {duration:.31, notes:[[0,659,.18,.27],[.064,988,.19,.22],[.108,1319,.18,.16]]},
  nvReveal: {duration:.42, notes:[[0,196,.23,.31],[.038,587,.25,.22],[.092,880,.26,.22],[.136,1175,.26,.17]], contacts:[[0,150,.15,.23]]},
} satisfies Record<string, Cue>;

export type UiSound = keyof typeof cues;

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
