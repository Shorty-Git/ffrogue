// Diagnostic thresholds are code-value monitors, not perceptual JND claims.
export function connectedErrorRegions(delta,width,threshold) {
  if(!Number.isInteger(width)||width<1||delta.length%width)throw Error('Rectangular error map required');
  const height=delta.length/width;let count=0;
  for(const value of delta)if(value>threshold)count++;
  if(!count)return {pixels:0,components:0,largest:[]};
  const seen=new Uint8Array(delta.length),queue=new Int32Array(count),largest=[];let components=0;
  for(let start=0;start<delta.length;start++)if(!seen[start]&&delta[start]>threshold){
    components++;let head=0,tail=1,area=0,left=width,right=0,bottom=height,top=0,maximum=0;
    queue[0]=start;seen[start]=1;
    while(head<tail){
      const at=queue[head++],x=at%width,y=Math.floor(at/width);area++;
      left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);maximum=Math.max(maximum,delta[at]);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy||x+dx<0||x+dx>=width||y+dy<0||y+dy>=height)continue;
        const next=at+dy*width+dx;
        if(!seen[next]&&delta[next]>threshold){seen[next]=1;queue[tail++]=next;}
      }
    }
    largest.push({pixels:area,bounds:{left,right,bottom,top},maximum});
    largest.sort((a,b)=>b.pixels-a.pixels||b.maximum-a.maximum);if(largest.length>5)largest.length=5;
  }
  return {pixels:count,components,largest};
}
