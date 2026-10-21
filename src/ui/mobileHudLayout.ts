/** CSS pixels relative to the already-safe gameplay canvas. */
export type HudRect={x:number;y:number;width:number;height:number};
export function mobileHudLayout(width:number,height:number){
 const compact=width<800||height<340,header=compact?64:72;
 return {width,height,compact,header,
  hero:{x:compact?12:20,y:8,width:compact?152:176,height:48},
  objective:{x:compact?172:404,y:8,width:width-(compact?296:584),height:48},
  map:{x:width-(compact?116:172),y:8,width:compact?48:96,height:compact?48:58},
  pause:{x:width-(compact?60:68),y:8,width:48,height:48},
  dock:{x:width-272,y:compact?72:80,width:248,height:Math.min(232,height-(compact?72:80)-24)},
  tools:{x:144,y:height-72,width:48,height:48},
  notice:{x:144,y:compact?72:80,width:Math.min(240,width-392),height:40},
  cancel:{x:width-204,y:Math.max(header+32,height-208),radius:24}
 };
}
export function mobileHud(scene:{game:any}){if(!window.kingdomViewport?.mobile)return undefined;const t=window.kingdomViewport.transform();return mobileHudLayout(t.scale*scene.game.scale.width,t.scale*scene.game.scale.height);}
export function logicalRect(r:HudRect,scale:number):HudRect{return {x:r.x/scale,y:r.y/scale,width:r.width/scale,height:r.height/scale};}
