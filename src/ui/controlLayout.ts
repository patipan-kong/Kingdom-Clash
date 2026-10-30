/** Presentation coordinates in the existing 960x540 FIT canvas; sizes are CSS pixels. */
export function controlLayout(scale:number){
 const s=Math.max(.1,scale),w=960*s,h=540*s,p=(v:number)=>v/s;
 const right=w-60,bottom=h-24,low=bottom-50,left=right-130;
 // The skill cluster hugs Attack: buttons are drawn about 10% smaller (21.6 vs 24) but keep a 48 px touch target, and sit 8-12 px closer together.
 const grip=right-120,high=low-100,mid=low-64;
 const ability=(id:string,x:number,y:number,r=24,hit=r)=>({id,x:p(x),y:p(y),radius:p(r),hitRadius:p(hit)});
 return {
  abilities:[ability('bash',grip,low,21.6,24),ability('taunt',grip,mid,21.6,24),ability('charge',right-60,high,21.6,24),ability('zone',right,high,21.6,24),ability('attack',right,low-8,36)],
  // Build / Shop / Army stand in a column above the joystick (the left edge is the least valuable part of the battlefield); their panels stay anchored at the old column x.
  utilities:['build','shop','army'].map((id,i)=>({id,x:p(61),y:p(bottom-43-43-8-24-(2-i)*50),radius:p(17),hitRadius:p(24),labelRight:true})),
  panelAnchorX:p(left-76),
  /** Gameplay area between the joystick column and the skill cluster, and above the bottom gesture inset; the HUD adds the top (below the top plates). */
  safe:{left:p(75+43),right:p(left-24-8),bottom:p(bottom)},
  joystick:{x:p(75),y:p(bottom-43),radius:p(43),travel:p(25)},
  attackLabel:{x:p(right),y:p(low+31)},
  cancel:{x:p(left-156),y:p(low-72),radius:p(24)},
  feedback:{x:p(right-60),y:p(high-38),width:p(180)},
  bottomCssInset:24
 };
}
