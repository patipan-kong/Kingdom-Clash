// Chapter 4 M6: the two Crimson Commanders, told apart by silhouette before colour (they are small on a phone).
// Iron Marshal: the Frost Warlord sprite (crimson-warlord.png) drawn larger than the Warlord, a heavy armoured giant.
// Shadowblade: the shared Crimson minion art with its red cloth turned deep violet, drawn only a little larger than a soldier, a lean figure.
// Purely visual: the scale multiplies the Crimson soldier's 48 px sprite height; collision radius and every stat are the unit's own.
export const marshalScale=2.3,shadowbladeScale=1.35;
export const shadowbladeTexture='minion-red-shadowblade';
export function shadowbladePixels(pixels:Uint8ClampedArray):void{
 for(let i=0;i<pixels.length;i+=4){
  const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
  if(pixels[i+3]&&r>g+25&&r>b+25){
   const l=.3*r+.59*g+.11*b;
   pixels[i]=Math.min(255,l*.55+40);pixels[i+1]=Math.min(255,l*.25+10);pixels[i+2]=Math.min(255,l*.8+60);
  }
 }
}
