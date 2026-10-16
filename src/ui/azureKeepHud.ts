// Always-visible Azure Keep HP plate under the minimap. Reads only simulation state; it has no HP counter of its own.
export const azureKeepHudRules={warnFraction:.5,lowFraction:.3,cssWidth:170,cssHeight:30,cssGap:4} as const;
export type AzureKeepLevel='healthy'|'damaged'|'low'|'destroyed';
// Logical canvas rect, right-aligned with the minimap panel (frame + 4) and below its shadow (+3). Sizes are CSS pixels.
export function azureKeepHudLayout(scale:number,mapFrame:{x:number;y:number;width:number;height:number}){
 const s=Math.max(.1,scale),r=azureKeepHudRules,p=(v:number)=>v/s,right=mapFrame.x+mapFrame.width+4,width=p(r.cssWidth),height=p(r.cssHeight),x=right-width,y=mapFrame.y+mapFrame.height+7+p(r.cssGap);
 return {x,y,width,height,label:{x:x+p(8),y:y+p(3),size:p(11)},hp:{x:right-p(8),y:y+p(2),size:p(12)},bar:{x:x+p(8),y:y+p(22),width:width-p(16),height:p(5)},radius:p(6)};
}
export function azureKeepHudState(hp:number,maxHp:number){
 const fraction=maxHp>0?Math.max(0,Math.min(1,hp/maxHp)):0,r=azureKeepHudRules;
 const level:AzureKeepLevel=hp<=0?'destroyed':fraction<r.lowFraction?'low':fraction<r.warnFraction?'damaged':'healthy';
 return {fraction,level,text:`${Math.ceil(Math.max(0,hp))} / ${maxHp}`};
}
export const azureKeepHudColors:Record<AzureKeepLevel,{bar:number;text:string;border:number}>={
 healthy:{bar:0x70d7ff,text:'#ffffff',border:0xdcbf7a},
 damaged:{bar:0xf4d58e,text:'#f4d58e',border:0xdcbf7a},
 low:{bar:0xff7976,text:'#ff9a8f',border:0xff7976},
 destroyed:{bar:0xff7976,text:'#ff9a8f',border:0xff7976},
};
