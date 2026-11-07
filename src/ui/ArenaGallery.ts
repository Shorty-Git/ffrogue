import type Phaser from 'phaser';
import reviewed from '../../public/assets/stages/reviewed.json';
import {musicProfiles,recommendMusic,type MusicRole} from '../audio/musicProfiles.mjs';
import {GameAudio} from '../audio/battleMusic';
import type {UnitManifest} from '../types/manifest';
import type {BattleArenaKey} from '../data/battleArenas';
import {createTrainingRun} from '../run/trainingRun';

export function openArenaGallery(scene:Phaser.Scene,manifests:Record<string,UnitManifest>):void {
  const audio=new GameAudio(scene.sound);
  const entries=Object.entries(reviewed);
  const gallery=document.createElement('aside');
  gallery.className='arena-gallery rpg-panel';
  gallery.innerHTML=`<p class="eyebrow">Development gallery</p><h1>Arena archive</h1>
    <label>Original game <select id="gallery-game"></select></label>
    <label>Arena <select id="gallery-arena"></select></label>
    <p id="gallery-status" aria-live="polite"></p>
    <label>Encounter role <select id="gallery-role"><option value="normal">Normal battle</option><option value="boss">Boss battle</option><option value="area">Area / exploration</option><option value="event">Event / story</option></select></label>
    <label>Music override <select id="gallery-music"></select></label>
    <p id="gallery-music-status" aria-live="polite"></p>
    <button class="rpg-button" type="button" id="gallery-play">Play music</button>
    <button class="rpg-button secondary" type="button" id="gallery-stop">Stop music</button>
    <button class="rpg-button secondary" type="button" id="gallery-test">Reset test battle</button>
    <a href="/">Return to title</a>`;
  document.body.append(gallery);
  const getSelect=(id:string)=>gallery.querySelector<HTMLSelectElement>('#gallery-'+id)!;
  const game=getSelect('game'),arena=getSelect('arena'),music=getSelect('music'),role=getSelect('role');
  for(const title of new Set(entries.map(([,value])=>value.title)))game.add(new Option(title,title));
  let currentArena='';
  const launch=()=>{currentArena=arena.value;
    scene.scene.start('BattleScene',{manifests,runContext:createTrainingRun(scene.cache,{arena:arena.value as BattleArenaKey}).context});};
  const musicStatus=()=>{
    const entry=reviewed[arena.value as keyof typeof reviewed];
    const track=musicProfiles.find(track=>track.id===Number(music.value));
    gallery.querySelector('#gallery-music-status')!.textContent=track?
      `${track.title} · ${track.game} · ${track.role} · ${track.series===entry.title?'Thematic FFRogue selection':'FFRogue fallback'}`:'No track recommended';
    gallery.querySelector<HTMLButtonElement>('#gallery-play')!.disabled=!track?.available;
  };
  const selectMusic=()=>{
    const entry=reviewed[arena.value as keyof typeof reviewed];
    const boss=arena.value==='reactor_05'?400993:undefined;
    const recommendation=recommendMusic(entry.title,role.value as MusicRole,boss);
    music.replaceChildren();
    music.add(new Option(recommendation?'Automatic recommendation':'No automatic recommendation',''));
    if(recommendation)music.options[0].value=String(recommendation);
    for(const track of musicProfiles.filter(track=>track.series===entry.title||track.id===400005)){
      const option=new Option(`${track.title} · ${track.role}${track.available?'':' · archive unavailable'}`,String(track.id));
      option.disabled=!track.available;
      music.add(option);
    }
    musicStatus();
  };
  const selectArena=()=>{
    const entry=reviewed[arena.value as keyof typeof reviewed];
    gallery.querySelector('#gallery-status')!.textContent=
      `#${entry.id} · ${entry.animation?`${entry.animation.frames} frames at ${entry.animation.fps} FPS`:'Static'} · Prepared · Training encounter`;
    selectMusic();
    audio.setMusic(null);
    if(arena.value!==currentArena)launch();
  };
  const selectGame=()=>{
    arena.replaceChildren();
    for(const [key,entry] of entries)if(entry.title===game.value)arena.add(new Option(entry.name,key));
    selectArena();
  };
  role.onchange=()=>{audio.setMusic(null);selectMusic();};
  music.onchange=()=>{audio.setMusic(null);musicStatus();};
  game.onchange=selectGame;
  arena.onchange=selectArena;
  gallery.querySelector<HTMLButtonElement>('#gallery-play')!.onclick=()=>audio.playGalleryMusic(Number(music.value));
  gallery.querySelector<HTMLButtonElement>('#gallery-stop')!.onclick=()=>audio.setMusic(null);
  gallery.querySelector<HTMLButtonElement>('#gallery-test')!.onclick=launch;
  selectGame();
}
