// Prefer the arena center, lifting the popup only when it obscures the party.
// Geometry is presentation data; this never moves actors or consumes run RNG.
export function rewardPopupLayout({viewport,canvas,arena,party,panel}) {
  const gap=12;
  if([viewport.width,viewport.height,canvas.left,canvas.top,canvas.width,canvas.height,
    arena.top,arena.height,panel.width,panel.height].some(v=>!Number.isFinite(v)))throw Error('Finite reward viewport required');
  const height=Math.min(panel.height,Math.max(1,viewport.height-gap*2));
  const width=Math.min(panel.width,Math.max(1,viewport.width-gap*2));
  const clamp=(v,min,max)=>Math.max(min,Math.min(Math.max(min,max),v));
  const left=clamp(canvas.left+(canvas.width-width)/2,gap,viewport.width-width-gap);
  const preferred=arena.top+arena.height/2-height/2;
  const firstActor=party.length?Math.min(...party.map(p=>p.top)):viewport.height;
  const candidates=[preferred,firstActor-height-gap,(viewport.height-height)/2,gap,viewport.height-height-gap]
    .map(top=>clamp(top,gap,viewport.height-height-gap));
  const overlap=top=>party.reduce((sum,p)=>sum+Math.max(0,Math.min(left+width,p.right)-Math.max(left,p.left))*Math.max(0,Math.min(top+height,p.bottom)-Math.max(top,p.top)),0);
  candidates.sort((a,b)=>overlap(a)-overlap(b)||Math.abs(a-preferred)-Math.abs(b-preferred));
  return {left,top:candidates[0],width,height,partyOverlap:overlap(candidates[0])};
}
