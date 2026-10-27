import {desertRaider} from '../data/combat';
// Chapter 2 S3: a temporary sand-coloured Desert Raider derived from the shared Crimson minion art. Only the red cloth is recoloured;
// shading, alpha and the neutral skin, metal and wood are kept. Real desert artwork replaces this later.
export const desertRaiderTexture='minion-red-desert';
export function desertRaiderPixels(pixels:Uint8ClampedArray):void{
 for(let i=0;i<pixels.length;i+=4){
  const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
  if(pixels[i+3]&&r>g+25&&r>b+25){
   const l=.3*r+.59*g+.11*b;
   pixels[i]=Math.min(255,l*1.1+70);pixels[i+1]=Math.min(255,l*.95+48);pixels[i+2]=Math.min(255,l*.55+14);
  }
 }
}
// The sprite is drawn at visualRadius / collision radius of the Crimson size; collision never changes.
export const desertRaiderScale=desertRaider.visualRadius/desertRaider.stats.radius;
