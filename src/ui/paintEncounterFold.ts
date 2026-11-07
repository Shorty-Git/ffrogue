/** Fragment the outgoing picture itself. The grid uses a fixed visual hash. */
export function paintEncounterFold(
  context: CanvasRenderingContext2D, image: HTMLCanvasElement, width: number, height: number, progress: number,
): void {
  context.fillStyle='#02040b';
  context.fillRect(0,0,width,height);
  const zoom=1+.105*Math.min(1,progress/.3);
  context.save();
  context.translate(width/2,height/2);
  context.rotate(Math.min(1,progress/.33)*-.031);
  context.scale(zoom,zoom);
  const step=Math.max(15,Math.round(Math.min(width,height)/39));
  const cellWidth=width/Math.ceil(width/step),cellHeight=height/Math.ceil(height/step);
  const cols=Math.ceil(width/step),rows=Math.ceil(height/step);
  const sourceWidth=image.width/cols,sourceHeight=image.height/rows;
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const hash=((Math.imul(col+19,73856093)^Math.imul(row+31,19349663))>>>0)%997/997;
    const dx=(col+.5)*cellWidth-width/2,dy=(row+.5)*cellHeight-height/2;
    const age=Math.max(0,Math.min(1,(progress-.22-hash*.34)/.40));
    if(age===1)continue;
    const size=1-age*age*(3-2*age);
    const pull=1-age*.13;
    const w=cellWidth*size,h=cellHeight*size,x=dx*pull-w/2,y=dy*pull-h/2;
    context.globalAlpha=1-age*.7;
    context.drawImage(image,col*sourceWidth,row*sourceHeight,sourceWidth,sourceHeight,x,y,w+.25,h+.25);
    if(age>0){
      context.strokeStyle='rgba(3, 9, 22, .9)';
      context.lineWidth=.5+age*2;
      context.strokeRect(x,y,w,h);
    }
  }
  context.restore();
}
