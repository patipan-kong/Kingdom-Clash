// The shared tower art has Azure cloth and armor. Recolor just its blue pixels,
// retaining shading, alpha, and the neutral wood, stone, metal and shield.
export function crimsonTowerPixels(pixels:Uint8ClampedArray):void{
 for(let i=0;i<pixels.length;i+=4){
  const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
  if(pixels[i+3]&&b>r+20&&b>g+15){
   pixels[i]=b;pixels[i+1]=g*.65;pixels[i+2]=r+Math.max(0,g-r)*.25;
  }
 }
}
export function towerTexture(team:'blue'|'red'):string{return team==='red'?'tower-red':'tower';}
