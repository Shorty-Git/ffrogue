import Phaser from 'phaser';
import {renderUiSound,type UiSound as AuthoredUiSound,type UiPreview} from './uiSoundDesign';
import {combatCues,type CombatCue} from './combatCues';

import {importedTracks} from './importedMusic.mjs';
const tracks = new Map<number,{url:string;loopStart:number;loopEnd:number}>([
  ...importedTracks,
  [400003, { url: 'assets/audio/la003_mypage_normal1.wav', loopStart: 215038 / 44100, loopEnd: 3390206 / 44100 }],
  [400005, { url: 'assets/audio/la005_battle1.wav', loopStart: 370898 / 44100, loopEnd: 3816914 / 44100 }],
  [400842, { url: 'assets/audio/la842_let_the_battles_begin.wav', loopStart: 143152 / 44100, loopEnd: 3230640 / 44100 }],
  [4000713, { url: 'assets/audio/la00713_ex_soldier.wav', loopStart: 1239453 / 44100, loopEnd: 2619933 / 44100 }],
  [400993, { url: 'assets/audio/la993_guard_scorpion.ogg', loopStart: 13261697 / 44100, loopEnd: 16655233 / 44100 }],
  [4000711, { url: 'assets/audio/la00711_machine_battle.ogg', loopStart: 30046 / 44100, loopEnd: 11216606 / 44100 }],
  [4001101, { url: 'assets/audio/la01101_dead_end.ogg', loopStart: 9523 / 44100, loopEnd: 3117363 / 44100 }],
]);
export const HOME_MUSIC_RESOURCE = 400003;

const preferencesKey = 'ffrogue.audio.v1';
const positionKey = 'ffrogue.music-position.v1';
// Crossfade: the next track rises while the previous one falls (a 0.24 s cut felt abrupt).
const fadeInTime = 1.2, fadeOutTime = .9;
const systemSamples = {
  select: {file:'cursor', level:.20},
  confirm: {file:'confirm', level:.24},
  back: {file:'back', level:.23},
  unavailable: {file:'bump', level:.20},
  battleDecide: {file:'battle-decide', level:.15},
  battleAbility: {file:'ability-select', level:.13},
  fieldEncounter: {file:'field-encounter', level:.26},
} as const;
export type UiSound = AuthoredUiSound | keyof typeof systemSamples;
export const battleCursorProfiles = {felt:'Felt · FFRogue',decide:'Battle Decide · FFBE',ability:'Ability Select · FFBE'} as const;
export type BattleCursorProfile = keyof typeof battleCursorProfiles;
const battleCursorCues = {felt:'battleFelt',decide:'battleDecide',ability:'battleAbility'} as const;
type Bus = 'music' | 'effects';
type Preference = { volume: number; muted: boolean };



function readSaved(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; }
}

function writeSaved(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Audio works without storage. */ }
}

function loadPreference(bus: Bus, fallback: number): Preference {
  const saved = (readSaved(preferencesKey) as Partial<Record<Bus, Partial<Preference>>> | null)?.[bus];
  const volume = saved?.volume;
  return {
    volume: typeof volume === 'number' && Number.isFinite(volume) ? Phaser.Math.Clamp(volume, 0, 1) : fallback,
    muted: saved?.muted === true,
  };
}

/** Run-scoped music and presentation-only sound in Phaser's existing Web Audio context. */
export class GameAudio {
  private readonly preferences = { music: loadPreference('music', .18), effects: loadPreference('effects', .34) };
  private readonly buses = new Map<Bus, GainNode>();
  private readonly buffers = new Map<string, Promise<AudioBuffer>>();
  private readonly uiBuffers = new Map<UiSound, AudioBuffer>();
  private readonly originalUiBuffers = new Map<UiSound, AudioBuffer>();
  private readonly lastUiSound = new Map<UiSound, number>();
  private readonly combatBuffers = new Map<CombatCue, AudioBuffer>();
  private readonly combatVoices = new Map<AudioBufferSourceNode, {cue:CombatCue; gain:GainNode; start:number}>();
  private current?: { source: AudioBufferSourceNode; gain: GainNode; started: number; offset: number; scope: string; resource: number };
  private retiring?: { source: AudioBufferSourceNode; resource: number };
  private requested?: { resource: number | null; scope: string };

  constructor(private readonly sound: Phaser.Sound.BaseSoundManager) {
    window.addEventListener('pagehide', () => this.savePosition());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.savePosition();
    });
    const context = this.context;
    if (context) for (const [event, sample] of Object.entries(systemSamples)) {
      void fetch('assets/audio/system-' + sample.file + '.wav').then(response => {
        if (!response.ok) throw Error('System audio HTTP ' + response.status);
        return response.arrayBuffer();
      }).then(bytes => context.decodeAudioData(bytes)).then(buffer => {
        this.originalUiBuffers.set(event as UiSound, buffer);
      }).catch(error => console.warn('System audio unavailable', error));
    }
  }

  getPreference(bus: Bus): Readonly<Preference> { return this.preferences[bus]; }

  clearRunPosition(): void { writeSaved(positionKey, null); }

  setPreference(bus: Bus, preference: Preference): void {
    this.preferences[bus] = preference;
    writeSaved(preferencesKey, this.preferences);
    const gain = this.buses.get(bus)?.gain;
    if (gain) {
      const now = this.context!.currentTime;
      gain.cancelScheduledValues(now);
      gain.setTargetAtTime(preference.muted ? 0 : preference.volume, now, .02);
    }
  }

  private get context(): AudioContext | undefined {
    return this.sound instanceof Phaser.Sound.WebAudioSoundManager ? this.sound.context : undefined;
  }

  private bus(name: Bus): GainNode {
    let node = this.buses.get(name);
    if (!node) {
      const sound = this.sound as Phaser.Sound.WebAudioSoundManager;
      node = sound.context.createGain();
      const preference = this.preferences[name];
      node.gain.value = preference.muted ? 0 : preference.volume;
      node.connect(sound.masterMuteNode);
      this.buses.set(name, node);
    }
    return node;
  }

  private loadBuffer(context:AudioContext,url:string):Promise<AudioBuffer> {
    let loaded=this.buffers.get(url);
    if(!loaded){
      loaded=fetch(url).then(response=>{
        if(!response.ok)throw Error(`Audio HTTP ${response.status}`);
        return response.arrayBuffer();
      }).then(bytes=>context.decodeAudioData(bytes));
      this.buffers.set(url,loaded);
      void loaded.catch(()=>this.buffers.delete(url));
    }
    return loaded;
  }

  /** Preload a one-shot original sample (e.g. the encounter glass break) so it can start on time. */
  warmSample(url:string):void {
    const context=this.context;
    if(context)void this.loadBuffer(context,url).catch(error=>console.warn('Sample unavailable',url,error));
  }

  /** Play a one-shot original sample on the effects bus; returns a stop function. */
  playSample(url:string,gain:number):()=>void {
    const context=this.context;
    if(!context||context.state!=='running'||this.preferences.effects.muted)return ()=>{};
    let source:AudioBufferSourceNode|undefined,stopped=false;
    void this.loadBuffer(context,url).then(buffer=>{
      if(stopped)return;
      source=context.createBufferSource();
      const level=context.createGain();
      source.buffer=buffer;level.gain.value=gain;
      source.connect(level).connect(this.bus('effects'));
      source.onended=()=>{source?.disconnect();level.disconnect();};
      source.start();
    }).catch(error=>console.warn('Sample unavailable',url,error));
    return ()=>{stopped=true;try{source?.stop();}catch{/* already ended */}};
  }

  warmCombat():void {
    const context=this.context;
    if(!context)return;
    for(const cue of Object.keys(combatCues) as CombatCue[]){
      if(this.combatBuffers.has(cue))continue;
      void this.loadBuffer(context,`assets/audio/combat/${combatCues[cue].file}.wav`)
        .then(buffer=>this.combatBuffers.set(cue,buffer))
        .catch(error=>console.warn('Combat audio unavailable',cue,error));
    }
  }

  playCombat(cue:CombatCue, authored=false):void {
    const context=this.context,buffer=this.combatBuffers.get(cue);
    if(!buffer||context?.state!=='running'||this.preferences.effects.muted)return;
    const now=context.currentTime,voices=[...this.combatVoices.entries()];
    const similar=voices.filter(([,voice])=>voice.cue===cue);
    if (!authored && (voices.length>=6 || similar.length>=2 ||
        similar.some(([,voice])=>now-voice.start<.055))) return;
    // Keep the authored onsets, with a short release of the oldest tail at the voice limit.
    const retired=similar.length>=2?similar[0]:voices.length>=6?voices[0]:undefined;
    if (retired) {
      const [source,{gain}]=retired;
      this.combatVoices.delete(source);
      gain.gain.setTargetAtTime(0,now,.004);
      source.stop(now+.02);
    }
    const source=context.createBufferSource(),gain=context.createGain();
    source.buffer=buffer;
    gain.gain.value=combatCues[cue].gain;
    source.connect(gain).connect(this.bus('effects'));
    this.combatVoices.set(source,{cue,gain,start:now});
    source.onended=()=>{
      this.combatVoices.delete(source);
      source.disconnect();gain.disconnect();
    };
    source.start();
  }

  stopCombat():void {
    const context=this.context;
    if(!context)return;
    const now=context.currentTime;
    for(const [source,{gain}] of this.combatVoices){
      gain.gain.setTargetAtTime(0,now,.008);
      source.stop(now+.04);
    }
    this.combatVoices.clear();
  }

  warmMusic(resource: number | null): void {
    const context = this.context;
    const track = resource === null ? undefined : tracks.get(resource);
    if (context && track) void this.loadBuffer(context,track.url).catch(() => {});
  }

  playGalleryMusic(resource:number):void {
    if(this.context?.state==='suspended')void this.context.resume().catch(()=>{});
    this.setMusic(resource,'gallery');
  }

  setMusic(resource: number | null, scope = ''): void {
    if (this.requested?.resource === resource && this.requested.scope === scope) return;
    const request = { resource, scope };
    this.requested = request;
    const context = this.context;
    const track = resource === null ? undefined : tracks.get(resource);
    if (!context || !track || resource === null) { this.fadeOut(); return; }
    if (this.current?.resource === resource) { this.current.scope = scope; return; }

    const loaded=this.loadBuffer(context,track.url);
    void loaded.then(buffer => {
      if (this.requested !== request || context.state === 'closed') return;
      if (buffer.duration < track.loopEnd) throw Error('Music loop exceeds decoded length');
      this.fadeOut();
      const saved = readSaved(this.positionStorageKey(scope)) as { scope?: string; resource?: number; offset?: number } | null;
      const offset = saved?.scope === scope && saved.resource === resource && typeof saved.offset === 'number'
        && saved.offset >= 0 && saved.offset < track.loopEnd ? saved.offset : 0;
      const source = context.createBufferSource();
      const gain = context.createGain();
      const now = context.currentTime;
      if (this.retiring?.resource === resource) this.retiring.source.stop(now);
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = track.loopStart;
      source.loopEnd = track.loopEnd;
      source.connect(gain).connect(this.bus('music'));
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(1, now + fadeInTime);
      source.start(now, offset);
      this.current = { source, gain, started: now, offset, scope, resource };
    }).catch(error => {
      if (this.requested !== request) return;
      this.requested = undefined;
      this.fadeOut();
      console.warn('Music unavailable', error);
    });
  }

  private savePosition(): void {
    const playing = this.current;
    if (!playing) return;
    const { source } = playing;
    const elapsed = playing.offset + source.context.currentTime - playing.started;
    const offset = elapsed < source.loopEnd ? elapsed
      : source.loopStart + (elapsed - source.loopStart) % (source.loopEnd - source.loopStart);
    writeSaved(this.positionStorageKey(playing.scope), { scope: playing.scope, resource: playing.resource, offset });
  }

  private positionStorageKey(scope: string): string {
    return scope === 'home' ? positionKey + '.home' : positionKey;
  }

  private fadeOut(): void {
    const playing = this.current;
    if (!playing) return;
    const { source, gain } = playing;
    this.current = undefined;
    const now = source.context.currentTime;
    this.retiring?.source.stop(now);
    this.retiring = { source, resource: playing.resource };
    const level = Math.min(1, (now - playing.started) / fadeInTime);
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(level, now);
    gain.gain.linearRampToValueAtTime(0, now + fadeOutTime);
    source.onended = () => {
      if (this.retiring?.source === source) this.retiring = undefined;
      source.disconnect();
      gain.disconnect();
    };
    source.stop(now + fadeOutTime);
  }

  previewUi(event: 'select'|'confirm', profile: UiPreview|'original'): void {
    this.playUi(profile==='soft' ? (event==='select'?'selectSoft':'confirmSoft') : event,
      1, profile==='original'?'original':'authored');
  }

  playBattleUi(event: UiSound, profile:BattleCursorProfile): void {
    if (event === 'select') this.playUi(battleCursorCues[profile]);
    else this.playUi(event);
  }

  playUi(event: UiSound, rate = 1, variant: 'default'|'original'|'authored' = 'default'): () => void {
    const context = this.context;
    let cancelled = false;
    let stop: (() => void) | undefined;
    const play = () => {
      if (cancelled || context?.state !== 'running' || this.preferences.effects.muted) return;
      const now = context.currentTime;
      if (now < (this.lastUiSound.get(event) ?? -Infinity)) return;
      const original = variant !== 'authored' ? this.originalUiBuffers.get(event) : undefined;
      const sample = systemSamples[event as keyof typeof systemSamples];
      if (variant !== 'authored' && sample && !original) return;
      let buffer = original ?? this.uiBuffers.get(event);
      if (!buffer) {
        buffer = renderUiSound(context, event as AuthoredUiSound);
        this.uiBuffers.set(event, buffer);
      }
      const battleCursor=event==='battleFelt'||event==='battleDecide'||event==='battleAbility';
      this.lastUiSound.set(event, now + (battleCursor ? .14 : original ? (event === 'select' ? .15 / rate : .28) : Math.max(.075, buffer.duration / rate)));
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = rate;
      source.loop = event === 'rolling';
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0, now);
      const level = original ? sample.level : event==='battleFelt' ? .42 : .72;
      envelope.gain.linearRampToValueAtTime(level, now + .008);
      source.connect(envelope).connect(this.bus('effects'));
      source.onended = () => { stop=undefined;source.disconnect(); envelope.disconnect(); };
      source.start();
      // End comparison sounds before the next accepted cursor event can start.
      if(battleCursor&&buffer.duration>.14){
        envelope.gain.setValueAtTime(level,now+.11);
        envelope.gain.linearRampToValueAtTime(0,now+.14);
        source.stop(now+.14);
      }
      stop = () => {
        const time = context.currentTime;
        envelope.gain.cancelScheduledValues(time);
        envelope.gain.setValueAtTime(level * Math.min(1, (time - now) / .008), time);
        envelope.gain.linearRampToValueAtTime(0, time + .035);
        source.stop(time + .035);
      };
    };
    if (context?.state === 'suspended' && navigator.userActivation?.isActive) {
      void context.resume().then(play).catch(() => {});
    } else play();
    return () => {
      if (cancelled) return;
      cancelled = true;
      stop?.();
    };
  }
}
