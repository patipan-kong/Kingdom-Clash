/** Presentation coordinates in the existing 960x540 FIT canvas; sizes are CSS pixels. */
export function controlLayout(scale:number){
 const s=Math.max(.1,scale),w=960*s,h=540*s,p=(v:number)=>v/s;
 const right=w-60,bottom=h-24,low=bottom-50,left=right-130;
 // Short phone landscape (under 360 px tall): a 30 px joystick and 44 px utility targets so the column fits between the top plates and the joystick; Army (not playable yet) is dropped when three do not fit.
 const short=h<360,jr=short?30:43,hit=short?22:24,first=72+8+hit,last=bottom-2*jr-8-hit,pitch=short?44:50,fitsThree=last-2*pitch>=first;
 // The skill cluster hugs Attack: buttons are drawn about 10% smaller (21.6 vs 24) but keep a 48 px touch target, and sit 8-12 px closer together.
 const grip=right-(short?108:120),high=low-(short?88:100),mid=low-(short?52:64),ar=short?19:21.6,ah=short?22:24;
 const ability=(id:string,x:number,y:number,r=24,hit=r)=>({id,x:p(x),y:p(y),radius:p(r),hitRadius:p(hit)});
 return {
  abilities:[ability('bash',grip,low,ar,ah),ability('taunt',grip,mid,ar,ah),ability('charge',right-(short?52:60),high,ar,ah),ability('zone',right,high,ar,ah),ability('attack',right,low-8,short?30:36)],
  // Build / Shop / Army stand in a column above the joystick (the left edge is the least valuable part of the battlefield); their panels stay anchored at the old column x.
  utilities:['build','shop','army'].map((id,i)=>({id,x:p(61),y:p(short?(fitsThree?last-(2-i)*pitch:last-(1-i)*pitch):bottom-43-43-8-24-(2-i)*50),radius:p(short?15:17),hitRadius:p(hit),labelRight:true,hidden:short&&!fitsThree&&id==='army'})),
  panelAnchorX:p(left-76),
  /** Gameplay area between the joystick column and the skill cluster, and above the bottom gesture inset; the HUD adds the top (below the top plates). */
  safe:{left:p(75+43),right:p(left-24-8),bottom:p(bottom)},
  joystick:{x:p(75),y:p(bottom-jr),radius:p(jr),travel:p(short?20:25)},
  attackLabel:{x:p(right),y:p(low+31)},
  cancel:{x:p(left-156),y:p(low-72),radius:p(24)},
  feedback:{x:p(right-60),y:p(high-38),width:p(180)},
  bottomCssInset:24
 };
}
