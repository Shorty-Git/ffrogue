/** Presentation-only input adapter. The owner remains the sole roster/RNG authority. */
export function bindSlotLever(button:HTMLButtonElement,skip:HTMLButtonElement,activate:()=>void,skipReels:()=>void,onMotion:()=>void=()=>{}):()=>void {
 const arm=button.querySelector<HTMLElement>('.lever-arm')!;
 let pointer:number|undefined,startY=0,progress=0,dragged=false,locked=false,fired=false,cancelled=false,suppressClick=false;
 let animation:Animation|undefined;
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const position=(p:number)=>{progress=p;arm.style.setProperty('--lever-pull',String(p));};
 const fire=(instant=false)=>{if(fired||cancelled)return;fired=true;locked=true;button.disabled=true;activate();if(instant)skipReels();};
 const animate=(target:number,duration:number,done:()=>void)=>{
  animation?.cancel();animation=arm.animate([{'--lever-pull':String(progress)},{'--lever-pull':String(target)}],{duration,easing:target?'ease-in':'cubic-bezier(.2,.8,.3,1)',fill:'forwards'});
  const active=animation;active.finished.then(()=>{if(!cancelled){position(target);active.cancel();if(animation===active)animation=undefined;done();}}).catch(()=>{});
 };
 const click=(event:MouseEvent)=>{if(suppressClick){suppressClick=false;return;}if(event.detail>1||locked||button.disabled)return;locked=true;skip.hidden=false;
  onMotion();if(reduced())fire(true);else animate(1,190,()=>fire());};
 const down=(e:PointerEvent)=>{if(e.button!==0||locked||button.disabled)return;pointer=e.pointerId;startY=e.clientY;dragged=false;button.setPointerCapture(pointer);};
 const move=(e:PointerEvent)=>{if(e.pointerId!==pointer||locked)return;const delta=e.clientY-startY;if(Math.abs(delta)>6&&!dragged){dragged=true;onMotion();}if(!dragged)return;
  e.preventDefault();position(Math.max(0,Math.min(1,delta/86)));if(progress===1){suppressClick=true;fire(reduced());}};
 const up=(e:PointerEvent)=>{if(e.pointerId!==pointer)return;pointer=undefined;
  if(dragged&&!fired){suppressClick=true;locked=true;animate(0,reduced()?1:180,()=>{locked=false;skip.hidden=true;});}};
 const cancel=(e:PointerEvent)=>{if(e.pointerId!==pointer)return;pointer=undefined;suppressClick=true;if(!fired){position(0);locked=false;skip.hidden=true;}};
 const skipClick=()=>fire(true);
 button.addEventListener('click',click);button.addEventListener('pointerdown',down);button.addEventListener('pointermove',move);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',cancel);skip.addEventListener('click',skipClick);
 return ()=>{cancelled=true;animation?.cancel();if(pointer!==undefined&&button.hasPointerCapture(pointer))button.releasePointerCapture(pointer);
  button.removeEventListener('click',click);button.removeEventListener('pointerdown',down);button.removeEventListener('pointermove',move);button.removeEventListener('pointerup',up);button.removeEventListener('pointercancel',cancel);skip.removeEventListener('click',skipClick);};
}
