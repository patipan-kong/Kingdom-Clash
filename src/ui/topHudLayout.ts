// CSS top plates; retain A1 Guardian geometry and the original popup reference.
export function topHudLayout(scale:number,pauseLeftCss?:number){
 const s=Math.max(.1,scale),p=(v:number)=>v/s,x=8,y=8;
 const width=Math.max(192,Math.min(232,308*s-16)),skillsX=x+width-56,bodyX=60,bodyWidth=skillsX-8-bodyX;
 const left=x+width+8,right=(pauseLeftCss??745*s-24)-16,matchWidth=Math.max(1,Math.min(250,right-left));
 const matchX=Math.max(left,(left+right-matchWidth)/2);
 return {
  guardian:{x:p(x),y:p(y),width:p(width),height:p(64)},
  portrait:{x:p(32),y:p(40),radius:p(18),hitRadius:p(24)},
  skills:{x:p(skillsX+24),y:p(40),width:p(48),height:p(48)},
  body:{x:p(bodyX),width:p(bodyWidth),levelY:p(12),hpY:p(28),hpBarY:p(49),xpY:p(54),xpBarX:p(bodyX+24),xpBarY:p(61),xpBarWidth:p(bodyWidth-24)},
  match:{x:p(matchX),y:p(8),width:p(matchWidth),height:p(64)},
  // Former banner/match clearance, retained solely for approved Shop anchoring.
  shopHudBottom:Math.max(140,90+Math.ceil(48/s),98,46+24/s)+8/s,
 };
}
