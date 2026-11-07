import {paintEncounterFold} from './paintEncounterFold';
import {crystalPulsePeak,paintCrystal} from './paintCrystalEncounter';
import type {EncounterSoundPhase} from '../audio/uiSoundDesign';

export type EncounterStyle = 'vortex' | 'mosaic' | 'fold' | 'crystal';

export function encounterStyle(search: string): EncounterStyle {
  const requested=new URLSearchParams(search).get('encounter');
  return requested==='vortex'||requested==='fold'||requested==='mosaic'?requested:'crystal';
}

/** Masks the live arena after its first rendered frame. The scene owns all gameplay. */
export class EncounterTransition {
  private readonly root = document.createElement('div');
  private readonly canvas = document.createElement('canvas');
  private readonly skipButton = document.createElement('button');
  private readonly inputs = new AbortController();
  private animation?: Animation;
  private frame = 0;
  private loading?: ReturnType<typeof setTimeout>;
  private skipped = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private onSkip?: () => void;
  private covered:Promise<void>=Promise.resolve();
  private stopCover?:()=>void;
  private readonly soundStops: (()=>void)[]=[];
  private soundSkipped=false;

  constructor(private readonly ui: HTMLElement, private readonly style: EncounterStyle|'cut',
    private readonly fromArea=false,
    private readonly sound?:(phase:EncounterSoundPhase)=>()=>void) {
    this.root.className = 'encounter-transition';
    this.root.dataset.style = style;
    this.root.dataset.phase = 'cover';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Entering battle');
    this.skipButton.className = 'rpg-button secondary';
    this.skipButton.textContent = 'Skip transition';
    this.skipButton.onclick = () => this.skip();
    this.ui.inert = true;
    this.root.append(this.canvas, this.skipButton);
    document.body.append(this.root);
    const key = (event: KeyboardEvent) => {
      event.stopImmediatePropagation();
      if (event.type === 'keydown' && event.key === 'Escape') {
        event.preventDefault();
        this.skip();
      } else if (event.key === 'Tab' || event.target !== this.skipButton || event.repeat) {
        event.preventDefault();
      }
    };
    for (const type of ['keydown', 'keypress', 'keyup'] as const) {
      window.addEventListener(type, key, {capture:true, signal:this.inputs.signal});
    }
    this.skipButton.focus({preventScroll:true});
  }

  private playSound(phase:EncounterSoundPhase):void {
    if(this.sound&&!this.soundSkipped)this.soundStops.push(this.sound(phase));
  }

  private stopSounds():void {
    for(const stop of this.soundStops.splice(0))stop();
  }

  async cover(start: () => void, onTimeout: () => void,
    capture?:()=>Promise<HTMLCanvasElement>): Promise<void> {
    if(!this.skipped)this.playSound('gather');
    const crystal=this.style==='crystal'&&!this.skipped?this.canvas.getContext('2d'):null;
    if(crystal){
      this.canvas.width=innerWidth;
      this.canvas.height=innerHeight;
      this.root.dataset.phase='gather';
      const started=performance.now();
      let loading=false;
      const load=()=>{
        if(loading||!this.root.isConnected)return;
        loading=true;
        this.loading=setTimeout(onTimeout,30000);
        start();
      };
      let impacted=false;
      this.covered=new Promise(resolve=>{
        const finish=()=>{
          cancelAnimationFrame(this.frame);
          this.stopCover=undefined;
          this.root.dataset.phase='loading';
          resolve();
          load();
        };
        this.stopCover=finish;
        const draw=(now:number)=>{
          const progress=Math.min(1,(now-started)/890);
          crystal.clearRect(0,0,this.canvas.width,this.canvas.height);
          paintCrystal(crystal,this.canvas.width,this.canvas.height,progress,'gather',this.fromArea);
          if(!impacted&&progress>=crystalPulsePeak){impacted=true;this.playSound('impact');}
          if(progress>=(this.fromArea ? .40 : .33))load();
          if(progress<1)this.frame=requestAnimationFrame(draw);
          else finish();
        };
        this.frame=requestAnimationFrame(draw);
      });
      return;
    }
    if(this.style==='fold'&&capture&&!this.skipped){
      let picture:HTMLCanvasElement|undefined;
      let captureDeadline:number|undefined;
      try{
        picture=await Promise.race([capture(),new Promise<undefined>(resolve=>{
          captureDeadline=window.setTimeout(resolve,650);
        })]);
      }catch(error){console.warn('Encounter snapshot unavailable',error);}
      finally{clearTimeout(captureDeadline);}
      if(!this.root.isConnected)return;
      const context=this.canvas.getContext('2d');
      if(picture&&context&&!this.skipped){
        const snapshot=picture;
        this.canvas.width=innerWidth;this.canvas.height=innerHeight;
        paintEncounterFold(context,snapshot,this.canvas.width,this.canvas.height,0);
        this.root.dataset.phase='fold';
        this.covered=new Promise(resolve=>{
          let sounded=false;
          const started=performance.now();
          const finish=()=>{
            cancelAnimationFrame(this.frame);
            if(this.skipped)context.clearRect(0,0,this.canvas.width,this.canvas.height);
            this.stopCover=undefined;
            this.root.dataset.phase='loading';
            resolve();
          };
          this.stopCover=finish;
          const draw=(now:number)=>{
            const progress=Math.min(1,(now-started)/700);
            if(!sounded&&progress>=.8){sounded=true;this.playSound('impact');}
            paintEncounterFold(context,snapshot,this.canvas.width,this.canvas.height,progress);
            if(progress<1)this.frame=requestAnimationFrame(draw);
            else finish();
          };
          this.frame=requestAnimationFrame(draw);
        });
        this.loading=setTimeout(onTimeout,30000);
        start();
        return;
      }
    }
    this.animation = this.canvas.animate([{opacity:0}, {opacity:1}], {
      duration:this.skipped ? 0 : this.style==='cut' ? 110 : 240, fill:'both', easing:'ease-in',
    });
    await this.animation.finished.catch(() => {});
    if (!this.root.isConnected) return;
    this.root.dataset.phase = 'loading';
    this.loading = setTimeout(onTimeout, 30000);
    if(!this.skipped)this.playSound('impact');
    start();
  }

  async reveal(arena: HTMLCanvasElement, finish: () => void, onReveal:()=>void): Promise<void> {
    await this.covered;
    if(!this.root.isConnected)return;
    clearTimeout(this.loading);
    onReveal();
    if (this.skipped) { finish(); return; }
    const context = this.canvas.getContext('2d');
    if (!context) { finish(); return; }
    this.onSkip = finish;
    const started = performance.now();
    let sounded=false;
    const draw = (now: number) => {
      const duration={cut:155,fold:320,vortex:720,mosaic:640,crystal:620}[this.style];
      const progress = Math.min(1, (now - started) / duration);
      if (progress >= 1) { finish(); return; }
      if(!sounded){sounded=true;this.playSound('reveal');}
      const width = innerWidth, height = innerHeight;
      if (this.canvas.width !== width) this.canvas.width = width;
      if (this.canvas.height !== height) this.canvas.height = height;
      if(this.style==='crystal'){
        this.animation?.cancel();
        context.clearRect(0,0,width,height);
        paintCrystal(context,width,height,progress,'reveal',this.fromArea);
        if(this.root.dataset.phase!=='reveal')this.root.dataset.phase='reveal';
        this.frame=requestAnimationFrame(draw);
        return;
      }
      context.globalCompositeOperation = 'source-over';
      context.fillStyle = '#02040b';
      context.fillRect(0, 0, width, height);
      const rect = arena.getBoundingClientRect();
      if(this.style==='fold'||this.style==='cut'){
        this.animation?.cancel();
        this.canvas.style.opacity=String((1-progress)**2);
        if(this.root.dataset.phase!=='reveal')this.root.dataset.phase='reveal';
        this.frame=requestAnimationFrame(draw);
        return;
      }
      context.globalCompositeOperation = 'destination-out';
      context.save();
      context.beginPath();
      context.rect(rect.left, rect.top, rect.width, rect.height);
      context.clip();
      if (this.style === 'vortex') this.vortex(context, rect, progress);
      else this.mosaic(context, rect, progress);
      context.restore();
      if(this.root.dataset.phase!=='reveal')this.root.dataset.phase = 'reveal';
      this.frame = requestAnimationFrame(draw);
    };
    this.frame = requestAnimationFrame(draw);
  }

  close(): void {
    clearTimeout(this.loading);
    this.stopSounds();
    this.root.remove();
    this.stopCover?.();
    cancelAnimationFrame(this.frame);
    this.inputs.abort();
    this.animation?.cancel();
    this.ui.inert = false;
  }

  private skip(): void {
    this.soundSkipped=true;
    this.stopSounds();
    this.skipped = true;
    this.skipButton.hidden = true;
    if (this.root.dataset.phase === 'cover') this.animation?.finish();
    this.stopCover?.();
    this.onSkip?.();
  }

  private mosaic(context: CanvasRenderingContext2D, rect: DOMRect, progress: number): void {
    const columns = 10, rows = 16;
    const width = rect.width / columns, height = rect.height / rows;
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const stagger = ((row * 11 + col * 7) % 13) / 13;
      const start = row / rows * .55 + stagger * .23;
      const visible = Math.max(0, Math.min(1, (progress - start) / .22));
      if (!visible) continue;
      const left = Math.round(rect.left + col * width);
      const top = Math.round(rect.top + row * height);
      const right = Math.round(rect.left + (col + 1) * width);
      const bottom = Math.round(rect.top + (row + 1) * height);
      context.globalAlpha = visible;
      context.fillRect(left, top, right - left, bottom - top);
    }
    context.globalAlpha = 1;
  }

  private vortex(context: CanvasRenderingContext2D, rect: DOMRect, progress: number): void {
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const radius = Math.hypot(rect.width, rect.height) / 2 + 2;
    const sector = Math.PI * 2 / 3;
    const opening = sector * Math.sin(progress * Math.PI / 2);
    for (let blade = 0; blade < 3; blade++) {
      context.beginPath();
      context.moveTo(cx, cy);
      for (let edge = 0; edge < 2; edge++) for (let i = 0; i <= 24; i++) {
        const r = (edge ? 24 - i : i) / 24;
        const angle = blade * sector + r * 2.2 - progress * 3 + edge * opening;
        context.lineTo(cx + Math.cos(angle) * radius * r, cy + Math.sin(angle) * radius * r);
      }
      context.closePath();
      context.fill();
    }
  }
}
