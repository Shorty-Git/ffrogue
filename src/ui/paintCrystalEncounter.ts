const clamp = (value: number) => Math.max(0, Math.min(1, value));
const pulseStart = .63;
const pulseSpan = .36;
export const crystalPulsePeak = pulseStart + pulseSpan / 2;
const smooth = (value: number) => { const t=clamp(value); return t*t*(3-2*t); };

function light(ctx: CanvasRenderingContext2D, x:number,y:number,r:number,color:string,opacity:number) {
  if(r<=0||opacity<=0)return;
  const gradient=ctx.createRadialGradient(x,y,0,x,y,r);
  gradient.addColorStop(0,color);
  gradient.addColorStop(1,'transparent');
  ctx.globalAlpha=opacity;
  ctx.fillStyle=gradient;
  ctx.fillRect(x-r,y-r,r*2,r*2);
}

export function paintCrystal(
  ctx:CanvasRenderingContext2D, width:number,height:number,t:number,phase:'gather'|'reveal',fromArea:boolean,
):void {
  const x=width*.5,y=height*.44,unit=Math.min(width,height);
  ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=phase==='gather'?smooth(t/(fromArea ? .39 : .32)):1;
  ctx.fillStyle='#030b1a';
  ctx.fillRect(0,0,width,height);
  ctx.save();
  ctx.translate(x,y);
  if(phase==='reveal'){
    const open=smooth(t);
    const radius=1+open*Math.hypot(width,height)*.85;
    const aperture=ctx.createRadialGradient(0,0,radius*.67,0,0,radius);
    aperture.addColorStop(0,'rgba(0,0,0,1)');
    aperture.addColorStop(1,'transparent');
    ctx.globalCompositeOperation='destination-out';
    ctx.fillStyle=aperture;
    ctx.fillRect(-x,-y,width,height);
    ctx.globalCompositeOperation='screen';
    light(ctx,0,0,unit*.27,'#366bc5',.29*(1-open));
    ctx.restore();
    return;
  }

  const charge=smooth((t-.09)/.46), release=smooth((t-.67)/.33);
  const intensity=charge*(1-release);
  const pulse=Math.sin(Math.PI*smooth((t-pulseStart)/pulseSpan));
  ctx.globalCompositeOperation='screen';
  light(ctx,0,0,unit*.27,'#366bc5',.29*release);
  light(ctx,0,0,unit*.48,'#174389',.79*intensity);
  light(ctx,0,0,unit*.30,'#307fff',.32*intensity+.51*pulse);

  // Three perspective orbits draw inward around the crystal.
  for(let orbit=0;orbit<3;orbit++){
    const reach=unit*(.34+orbit*.067)*(1-charge*.42+release*.31);
    ctx.save();
    ctx.rotate(-.9+orbit*.69+t*.53);
    ctx.scale(1,.31+orbit*.105);
    ctx.globalAlpha=intensity*(.20+orbit*.075);
    ctx.strokeStyle=orbit===1?'#bceaff':'#547ef5';
    ctx.lineWidth=1+orbit*.35;
    ctx.beginPath();
    ctx.arc(0,0,reach,.8+orbit+t*2.8,4.8+orbit+t*2.8);
    ctx.stroke();
    ctx.restore();
  }

  // Depth is encoded by size and travel rate, with a stable visual-only distribution.
  for(let i=0;i<56;i++){
    const age=clamp((t-(i%11)*.026-.07)/(.60+(i%5)*.033));
    if(age===0||age===1)continue;
    const angle=i*2.399963+age*(1.0+(i%3)*.27);
    const reach=unit*(.26+(i%13)*.031)*(1-age**1.52);
    const size=(1+(i%5)*.7)*(.55+age*1.3);
    ctx.save();
    ctx.translate(Math.cos(angle)*reach,Math.sin(angle)*reach*.83);
    ctx.rotate(angle+.78);
    ctx.globalAlpha=Math.sin(age*Math.PI)*intensity*(.32+(i%4)*.17);
    ctx.fillStyle=i%5===0?'#eefcff':i%3===0?'#a6d9ff':'#518cfe';
    ctx.fillRect(-size/2,-size/2,size,size);
    ctx.fillRect(size,-.45,size*(2+age*4),.9);
    ctx.restore();
  }

  const core=unit*(.059+charge*.022)*(1-release*.87);
  light(ctx,0,0,core*2.8,'#72baff',.55*intensity+.30*pulse);
  const turn=Math.cos(t*4.4);
  const points=[[0,-1.65],[.73,-.39],[.55,.64],[0,1.48],[-.55,.64],[-.73,-.39]];
  const facets=[
    {path:[0,1,2,3],color:'#76beff'},
    {path:[0,3,4,5],color:'#366fc7'},
    {path:[0,5,4,3],color:'#95ddff'},
    {path:[0,1,2,3],color:'#e2f8ff'},
  ];
  ctx.rotate(-.15+t*.23);
  for(let i=0;i<facets.length;i++){
    const facet=facets[i];
    ctx.beginPath();
    facet.path.forEach((index,j)=>{
      const [px,py]=points[index];
      const widthScale=i<2?1:Math.abs(turn)*.86;
      const destX=px*core*widthScale,destY=py*core;
      if(j===0)ctx.moveTo(destX,destY);else ctx.lineTo(destX,destY);
    });
    ctx.closePath();
    ctx.globalAlpha=intensity*(i<2?.72:.51);
    ctx.fillStyle=facet.color;
    ctx.fill();
    ctx.strokeStyle='#d4f4ff';
    ctx.lineWidth=1.2;
    ctx.stroke();
  }
  ctx.restore();
}
