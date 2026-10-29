import Phaser from 'phaser';

export const FANTASY={
 gold:0xd7b66a,
 goldBright:0xffe4a0,
 bronze:0x8d6428,
 ink:0x091725,
 navy:0x10283b,
 navyLift:0x193d56,
 steel:0x607c8d,
 steelDark:0x294657,
 disabled:0x132733,
 disabledEdge:0x3f5662,
 selected:0x285878,
 shadow:0x020810,
 warning:0x8c3f39,
 success:0x3d755f,
} as const;

export const FANTASY_TEXT={primary:'#fff3d3',muted:'#bdd0da',gold:'#f0d797',warning:'#ffb0a5',ink:'#102536'} as const;
export const UI_FONT='Arial, sans-serif';

export type ButtonTone='primary'|'secondary'|'selected'|'card'|'danger'|'disabled';
export type ControlVariant='primaryCompact'|'secondaryCompact'|'tabCompact'|'iconCompact'|'contextualCompact'|'skillCompact'|'card';
export type Frame={x:number;y:number;width:number;height:number};

/** Visible controls can be quieter than their 48 CSS-pixel interaction bounds. */
export const COMPACT_CONTROLS={
 primaryCompact:{height:40,widthRatio:1},
 secondaryCompact:{height:38,widthRatio:1},
 tabCompact:{height:40,widthRatio:1},
 iconCompact:{height:36,widthRatio:.82},
 contextualCompact:{height:36,widthRatio:.78},
 skillCompact:{height:40,widthRatio:.82},
 card:{height:Infinity,widthRatio:1},
} as const;

const px=(n:number,scale:number)=>n/Math.max(.1,scale);

export function compactControlFrame(x:number,y:number,w:number,h:number,scale:number,variant:ControlVariant):Frame{
 const token=COMPACT_CONTROLS[variant],height=Math.min(h,px(token.height,scale));
 const width=variant==='card'?w:Math.max(Math.min(w,px(40,scale)),w*token.widthRatio);
 return{x:x+(w-width)/2,y:y+(h-height)/2,width,height};
}

export function drawFantasyPanel(g:Phaser.GameObjects.Graphics,f:Frame,scale:number){
 const p=(n:number)=>px(n,scale),r=p(11);
 g.clear();
 g.fillStyle(FANTASY.shadow,.42).fillRoundedRect(f.x+p(2),f.y+p(5),f.width,f.height,r+p(2));
 g.fillGradientStyle(0x17364d,0x112a3e,0x0a1b2b,0x081624,.985).fillRoundedRect(f.x,f.y,f.width,f.height,r);
 g.lineStyle(p(2),FANTASY.bronze,.95).strokeRoundedRect(f.x,f.y,f.width,f.height,r);
 g.lineStyle(p(1),FANTASY.goldBright,.58).strokeRoundedRect(f.x+p(2),f.y+p(2),f.width-p(4),f.height-p(4),r-p(2));
 g.lineStyle(p(1),0x315268,.72).strokeRoundedRect(f.x+p(5),f.y+p(5),f.width-p(10),f.height-p(10),r-p(4));
 g.fillGradientStyle(FANTASY.bronze,FANTASY.goldBright,FANTASY.gold,FANTASY.bronze,.9).fillRoundedRect(f.x+p(18),f.y+p(1),Math.max(0,f.width-p(36)),p(2),p(1));
}

export function drawDivider(g:Phaser.GameObjects.Graphics,x:number,y:number,width:number,scale:number){
 const p=(n:number)=>px(n,scale);
 g.lineStyle(p(1),0x6d8a99,.28).lineBetween(x,y,x+width,y);
 g.lineStyle(p(1),FANTASY.gold,.3).lineBetween(x+p(14),y+p(1),x+width-p(14),y+p(1));
}

export function drawFantasyButton(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,scale:number,tone:ButtonTone,pressed=false){
 const p=(n:number)=>px(n,scale),radius=Math.min(p(9),h/3),down=pressed?p(2):0;
 const disabled=tone==='disabled';
 const colors:Record<ButtonTone,[number,number,number]>={
  primary:[FANTASY.goldBright,FANTASY.bronze,FANTASY.gold],
  secondary:[0x31556a,0x172f42,FANTASY.gold],
  selected:[0x3b7190,0x1b405d,FANTASY.goldBright],
  card:[0x24465d,0x122b40,0x688493],
  danger:[0x9a5548,0x582c31,0xd39a74],
  disabled:[0x1a303b,FANTASY.disabled,FANTASY.disabledEdge],
 };
 const [top,bottom,edge]=colors[tone];
 g.clear();
 g.fillStyle(FANTASY.shadow,disabled ? .18 : .42).fillRoundedRect(x+p(1),y+p(3),w,h,radius);
 g.fillGradientStyle(pressed?bottom:top,pressed?bottom:top,bottom,bottom,disabled ? .72 : 1).fillRoundedRect(x,y+down,w,h-down,radius);
 g.lineStyle(p(tone==='selected'||tone==='primary'?2:1),edge,disabled ? .45 : .96).strokeRoundedRect(x,y+down,w,h-down,radius);
 g.lineStyle(p(1),tone==='primary'?0xfff0bd:0x83a3b2,disabled ? .16 : .42).strokeRoundedRect(x+p(2),y+down+p(2),w-p(4),h-down-p(4),Math.max(p(2),radius-p(2)));
 if(tone==='selected')g.fillStyle(FANTASY.goldBright,.92).fillRoundedRect(x+p(4),y+down+p(4),p(3),Math.max(p(8),h-down-p(8)),p(1.5));
}

export function drawInsetCard(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,scale:number,active=false,available=true){
 const p=(n:number)=>px(n,scale),r=p(8);
 g.clear();
 g.fillStyle(FANTASY.shadow,.32).fillRoundedRect(x+p(1),y+p(2),w,h,r);
 g.fillGradientStyle(active?0x315d78:available?0x203f56:0x172d3b,active?0x274c68:available?0x1a3549:0x142734,0x0f2233,0x0c1c2b,1).fillRoundedRect(x,y,w,h,r);
 g.lineStyle(p(active?2:1),active?FANTASY.goldBright:available?0x698595:FANTASY.disabledEdge,active ? .92 : .72).strokeRoundedRect(x,y,w,h,r);
 g.lineStyle(p(1),0x8ba6b3,active ? .35 : .2).lineBetween(x+p(8),y+p(2),x+w-p(8),y+p(2));
 if(active)g.fillStyle(FANTASY.gold,.9).fillRoundedRect(x+p(4),y+p(5),p(3),Math.max(p(8),h-p(10)),p(1.5));
}

export function drawPill(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,scale:number,warm=false){
 const p=(n:number)=>px(n,scale);
 g.fillStyle(warm?0x5a4422:0x0b1c2b,.9).fillRoundedRect(x,y,w,h,h/2);
 g.lineStyle(p(1),warm?FANTASY.gold:0x607c8d,warm ? .7 : .45).strokeRoundedRect(x,y,w,h,h/2);
}

export function drawCallout(g:Phaser.GameObjects.Graphics,x:number,y:number,w:number,h:number,scale:number,warning=false){
 const p=(n:number)=>px(n,scale);
 g.fillStyle(warning?0x3d2229:0x0b2030,.88).fillRoundedRect(x,y,w,h,p(6));
 g.lineStyle(p(1),warning?0xb66c61:0x496f83,.55).strokeRoundedRect(x,y,w,h,p(6));
}

/** Progress pips: a row of small diamonds, `filled` of `total` lit gold. x,y is the top-left of the row. Returns the row width. */
export function drawPips(g:Phaser.GameObjects.Graphics,x:number,y:number,total:number,filled:number,size=12,gap=5){
 for(let i=0;i<total;i++){
  const cx=x+i*(size+gap)+size/2,cy=y+size/2,r=size/2,on=i<filled;
  g.fillStyle(on?FANTASY.gold:0x0b1c2b,on?1:.85).beginPath().moveTo(cx,cy-r).lineTo(cx+r,cy).lineTo(cx,cy+r).lineTo(cx-r,cy).closePath().fillPath();
  g.lineStyle(1,on?FANTASY.goldBright:0x607c8d,on?.95:.7).beginPath().moveTo(cx,cy-r).lineTo(cx+r,cy).lineTo(cx,cy+r).lineTo(cx-r,cy).closePath().strokePath();
 }
 return total*size+Math.max(0,total-1)*gap;
}

/** A padlock centred on cx,cy, `size` px wide. */
export function drawLock(g:Phaser.GameObjects.Graphics,cx:number,cy:number,size:number,color:number,alpha=1){
 const bodyH=size*.62,bodyY=cy+size*.5-bodyH,r=size*.28;
 g.lineStyle(Math.max(1.5,size*.15),color,alpha).beginPath().arc(cx,bodyY,r,Phaser.Math.DegToRad(180),Phaser.Math.DegToRad(360),false).strokePath();
 g.fillStyle(color,alpha).fillRoundedRect(cx-size/2,bodyY,size,bodyH,size*.12);
 g.fillStyle(FANTASY.ink,.85).fillCircle(cx,bodyY+bodyH*.42,Math.max(1,size*.09));
}

/** A check mark centred on cx,cy, `size` px wide. */
export function drawCheck(g:Phaser.GameObjects.Graphics,cx:number,cy:number,size:number,color:number,width=Math.max(2,size*.16)){
 g.lineStyle(width,color,1).beginPath().moveTo(cx-size*.5,cy+size*.02).lineTo(cx-size*.15,cy+size*.36).lineTo(cx+size*.5,cy-size*.36).strokePath();
}

export type MedallionTone='next'|'done'|'open'|'locked';
/** The round mission-number badge: gold for the next mission, teal for a cleared one, navy for an open one and dim for a locked one. The caller draws the numeral (or the check). */
export function drawMedallion(g:Phaser.GameObjects.Graphics,cx:number,cy:number,r:number,tone:MedallionTone){
 const fill={next:FANTASY.gold,done:0x2f7d6d,open:0x193d56,locked:0x132733}[tone],edge={next:FANTASY.goldBright,done:0x8cebd1,open:0x698595,locked:FANTASY.disabledEdge}[tone];
 g.fillStyle(FANTASY.shadow,.4).fillCircle(cx+1,cy+2,r);
 g.fillStyle(fill,tone==='locked'?.8:1).fillCircle(cx,cy,r);
 g.lineStyle(2,edge,tone==='locked'?.6:.95).strokeCircle(cx,cy,r);
 g.lineStyle(1,0xffffff,tone==='next'?.35:.12).strokeCircle(cx,cy,r-3);
}
