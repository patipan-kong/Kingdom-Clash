// UI-A1 only: CSS-sized Guardian plate beside the unchanged logical Match panel.
export function topHudLayout(scale:number){
 const s=Math.max(.1,scale),p=(v:number)=>v/s,x=8,y=8;
 const width=Math.max(192,Math.min(232,308*s-16)),skillsX=x+width-56,bodyX=60,bodyWidth=skillsX-8-bodyX;
 return {
  guardian:{x:p(x),y:p(y),width:p(width),height:p(64)},
  portrait:{x:p(32),y:p(40),radius:p(18),hitRadius:p(24)},
  skills:{x:p(skillsX+24),y:p(40),width:p(48),height:p(48)},
  body:{x:p(bodyX),width:p(bodyWidth),levelY:p(12),hpY:p(28),hpBarY:p(49),xpY:p(54),xpBarX:p(bodyX+24),xpBarY:p(61),xpBarWidth:p(bodyWidth-24)},
  // Former banner/match clearance, retained solely for approved Shop anchoring.
  shopHudBottom:Math.max(140,90+Math.ceil(48/s),98,46+24/s)+8/s,
 };
}
