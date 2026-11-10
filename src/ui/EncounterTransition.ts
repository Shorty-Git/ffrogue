import {SHATTER_COVER_MS,SHATTER_CRACK,SHATTER_REVEAL_MS,paintShatterCover,paintShatterReveal} from './paintShatterEncounter';

const FADE_COVER_MS=320;

/**
 * Battle entry. 'shatter' (run start only): the outgoing screen breaks like glass. 'fade' (between
 * fights): a short dip to dark. Both then fade the arena up from the dark. Masks the live arena until
 * its first rendered frame; the scene owns all gameplay.
 */
export class EncounterTransition {
  private readonly root = document.createElement('div');
  private readonly canvas = document.createElement('canvas');
  private readonly skipButton = document.createElement('button');
  private readonly inputs = new AbortController();
  private frame = 0;
  private loading?: ReturnType<typeof setTimeout>;
  private skipped = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private onSkip?: () => void;
  private covered:Promise<void>=Promise.resolve();
  private stopCover?:()=>void;
  private stopSound?:()=>void;

  constructor(private readonly ui: HTMLElement, private readonly mode:'shatter'|'fade', private readonly crackSound?:()=>()=>void) {
    this.root.className = 'encounter-transition';
    this.root.dataset.phase = 'capture';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Entering battle');
    this.skipButton.className = 'rpg-button secondary';
    this.skipButton.textContent = 'Skip transition';
    // Transitions take about a second; the developer asked for no visible skip buttons (2026-11-11).
    this.skipButton.style.display = 'none';
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

  /** Shatter the captured screen; `start` begins loading the battle underneath. */
  async cover(start: () => void, onTimeout: () => void, capture?:()=>Promise<HTMLCanvasElement>): Promise<void> {
    let loading=false;
    const load=()=>{
      if(loading||!this.root.isConnected)return;
      loading=true;
      this.loading=setTimeout(onTimeout,30000);
      start();
    };
    if(this.mode==='fade'||!capture){
      const context=this.canvas.getContext('2d');
      if(this.skipped||!context){this.root.dataset.phase='loading';load();return;}
      this.canvas.width=innerWidth;this.canvas.height=innerHeight;
      this.root.dataset.phase='fade';
      this.covered=new Promise(resolve=>{
        const started=performance.now();
        const finish=()=>{cancelAnimationFrame(this.frame);this.stopCover=undefined;this.root.dataset.phase='loading';resolve();load();};
        this.stopCover=finish;
        const draw=(now:number)=>{
          const progress=Math.min(1,(now-started)/FADE_COVER_MS);
          context.clearRect(0,0,this.canvas.width,this.canvas.height);
          context.fillStyle=`rgba(2, 4, 11, ${progress*progress*(3-2*progress)})`;
          context.fillRect(0,0,this.canvas.width,this.canvas.height);
          if(progress<1)this.frame=requestAnimationFrame(draw);else finish();
        };
        this.frame=requestAnimationFrame(draw);
      });
      return;
    }
    let picture:HTMLCanvasElement|undefined;
    if(!this.skipped){
      let deadline:number|undefined;
      try{
        picture=await Promise.race([capture(),new Promise<undefined>(resolve=>{deadline=window.setTimeout(resolve,650);})]);
      }catch(error){console.warn('Encounter snapshot unavailable',error);}
      finally{clearTimeout(deadline);}
    }
    if(!this.root.isConnected)return;
    const context=this.canvas.getContext('2d');
    if(!picture||!context||this.skipped){
      // No snapshot (or reduced motion): a plain dark cut keeps the same flow.
      this.root.dataset.phase='loading';
      load();
      return;
    }
    const snapshot=picture;
    this.canvas.width=innerWidth;this.canvas.height=innerHeight;
    paintShatterCover(context,snapshot,this.canvas.width,this.canvas.height,0);
    this.root.dataset.phase='shatter';
    this.covered=new Promise(resolve=>{
      let cracked=false;
      const started=performance.now();
      const finish=()=>{
        cancelAnimationFrame(this.frame);
        this.stopCover=undefined;
        this.root.dataset.phase='loading';
        resolve();
        load();
      };
      this.stopCover=finish;
      const draw=(now:number)=>{
        const progress=Math.min(1,(now-started)/SHATTER_COVER_MS);
        if(!cracked&&progress>=SHATTER_CRACK){cracked=true;this.stopSound=this.crackSound?.();}
        paintShatterCover(context,snapshot,this.canvas.width,this.canvas.height,progress);
        // Battle preparation runs underneath while the shards are still flying.
        if(progress>=.45)load();
        if(progress<1)this.frame=requestAnimationFrame(draw);
        else finish();
      };
      this.frame=requestAnimationFrame(draw);
    });
  }

  /** Fade the dark veil away once the arena has rendered; `onReveal` starts music and the entrance. */
  async reveal(finish: () => void, onReveal:()=>void): Promise<void> {
    await this.covered;
    if(!this.root.isConnected)return;
    clearTimeout(this.loading);
    onReveal();
    const context = this.canvas.getContext('2d');
    if (this.skipped || !context) { finish(); return; }
    this.onSkip = finish;
    const started = performance.now();
    this.root.dataset.phase='reveal';
    const draw = (now: number) => {
      const progress = Math.min(1, (now - started) / SHATTER_REVEAL_MS);
      if (progress >= 1) { finish(); return; }
      const width = innerWidth, height = innerHeight;
      if (this.canvas.width !== width) this.canvas.width = width;
      if (this.canvas.height !== height) this.canvas.height = height;
      paintShatterReveal(context,width,height,progress);
      this.frame = requestAnimationFrame(draw);
    };
    this.frame = requestAnimationFrame(draw);
  }

  close(): void {
    clearTimeout(this.loading);
    this.stopSound?.();
    this.root.remove();
    this.stopCover?.();
    cancelAnimationFrame(this.frame);
    this.inputs.abort();
    this.ui.inert = false;
  }

  private skip(): void {
    this.stopSound?.();
    this.skipped = true;
    this.skipButton.hidden = true;
    this.stopCover?.();
    this.onSkip?.();
  }
}
