/** Capture only our own live game and interface. No browser screen permission is needed. */
export async function captureEncounter(
  ui: HTMLElement,
  captureBattle?: (paint: (arena: HTMLCanvasElement) => void) => Promise<void>,
): Promise<HTMLCanvasElement> {
  const width=innerWidth, height=innerHeight, scale=.8;
  const frame=document.createElement('canvas');
  frame.width=Math.round(width*scale);
  frame.height=Math.round(height*scale);
  const context=frame.getContext('2d')!;
  context.scale(frame.width/width,frame.height/height);
  context.fillStyle='#02040b';
  context.fillRect(0,0,width,height);
  const {default:html2canvas}=await import('html2canvas');
  const bounds=ui.getBoundingClientRect();
  const uiFrame=html2canvas(ui,{backgroundColor:null,scale,logging:false,removeContainer:true,
    onclone:doc=>{
      const root=doc.getElementById(ui.id);
      root?.querySelectorAll<HTMLElement>('*').forEach(element=>{
        element.style.animationPlayState='paused';
      });
    }});
  if(captureBattle)await captureBattle(arena=>{
    const rect=arena.getBoundingClientRect();
    context.drawImage(arena,rect.left,rect.top,rect.width,rect.height);
  });
  context.drawImage(await uiFrame,bounds.left,bounds.top,bounds.width,bounds.height);
  return frame;
}
