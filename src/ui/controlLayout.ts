/** Presentation coordinates in the existing 960x540 FIT canvas; sizes are CSS pixels. */
export function controlLayout(scale:number){
 const s=Math.max(.1,scale),w=960*s,h=540*s,p=(v:number)=>v/s;
 const right=w-60,bottom=h-24,low=bottom-50,left=right-130;
 // Short phone landscape (under 360 px tall): a 30 px joystick and 44 px utility targets so the column fits between the top plates and the joystick; Build and Shop keep the rows they had when a third (Army) button stood below them.
 const short=h<360,jr=short?30:43,hit=short?22:24,first=72+8+hit,last=bottom-2*jr-8-hit,pitch=short?44:50,fitsThree=last-2*pitch>=first;
 // The four skills form a compact diamond in the bottom-right corner (there is no Attack disc any more): Charge on top, Taunt left, Protect right, Bash at the thumb's old home spot below. Buttons are drawn about 10% smaller (21.6 vs 24) but keep a 48 px touch target. The side buttons stand wide enough (dx) that their name labels clear the Bash disc.
 const ar=short?19:21.6,ah=short?22:24,dx=short?52:58,dy=short?32:36,cx=right-dx,cy=low-dy;
 const ability=(id:string,x:number,y:number,r=24,hit=r)=>({id,x:p(x),y:p(y),radius:p(r),hitRadius:p(hit)});
 return {
  abilities:[ability('bash',cx,cy+dy,ar,ah),ability('taunt',cx-dx,cy,ar,ah),ability('charge',cx,cy-dy,ar,ah),ability('zone',cx+dx,cy,ar,ah)],
  // Build / Shop stand in a column above the joystick (the left edge is the least valuable part of the battlefield); their panels stay anchored at the old column x.
  utilities:['build','shop'].map((id,i)=>({id,x:p(61),y:p(short?(fitsThree?last-(2-i)*pitch:last-(1-i)*pitch):bottom-43-43-8-24-(2-i)*50),radius:p(short?15:17),hitRadius:p(hit),labelRight:true})),
  panelAnchorX:p(left-76),
  /** Gameplay area between the joystick column and the skill cluster, and above the bottom gesture inset; the HUD adds the top (below the top plates). */
  safe:{left:p(75+43),right:p(left-24-8),bottom:p(bottom)},
  joystick:{x:p(75),y:p(bottom-jr),radius:p(jr),travel:p(short?20:25)},
  cancel:{x:p(left-156),y:p(low-72),radius:p(24)},
  feedback:{x:p(right-60),y:p(cy-dy-38),width:p(180)},
  bottomCssInset:24,
  /** Keyboard mode only: the movement hint plate that replaces the joystick. */
  hint:undefined as undefined|{x:number;y:number;width:number;height:number;scale:number},
  /** Keyboard mode only: the desktop size tier (1 on touch). */
  tier:1
 };
}
export type ControlLayout=ReturnType<typeof controlLayout>;
/** Desktop UX D2: the keyboard-mode size tier from the canvas CSS height: 150% from 700 px, 125% from 500 px, otherwise 100%. */
export const desktopTier=(cssHeight:number)=>cssHeight>=700?1.5:cssHeight>=500?1.25:1;
/** Desktop UX D2: skill label scale in keyboard mode (125%, but never more than the tier, so the smallest tier's labels still clear their neighbours). */
export const desktopLabelScale=(tier:number)=>Math.min(1.25,tier);
/** Desktop UX D2 key badges: one size for every badge of a tier (CSS px). */
export const keyBadgeCss=(tier:number)=>Math.round(16+8*(tier-1));
/** Keyboard mode (docs/DESKTOP_UX_D1_ASSESSMENT.md, D2 approval): the same controls, laid out for a mouse and keyboard. Touch keeps controlLayout untouched.
 * Skills: a horizontal bar in the bottom-right corner, Bash, Charge, Taunt, Protect from left to right, each name under its icon. Build and Shop: a column in the
 * bottom-left corner, directly above the movement hint that replaces the joystick. The hint's frame stands in for the joystick geometry, so the Hero Bar still starts
 * one gap past it. The aim-cancel target and the panel anchor stay where the touch layout puts them, so the approved panels and the cancel circle do not move. */
export function desktopControlLayout(scale:number,tier:number){
 const base=controlLayout(scale),s=Math.max(.1,scale),w=960*s,h=540*s,p=(v:number)=>v/s,k=tier;
 const inset=18,margin=24;
 // Skill bar: 48 px targets and 43 px discs at 100%, a fixed gap, the name label (font + padding + stroke) under each icon.
 const ar=21.6*k,ah=24*k,gap=14*k,pitch=2*ah+gap,labelHeight=Math.ceil(12*desktopLabelScale(k))+8,cy=h-inset-labelHeight-4-ar,last=w-margin-ah;
 const order=['bash','charge','taunt','zone'] as const,ability=(id:string,x:number)=>({id,x:p(x),y:p(cy),radius:p(ar),hitRadius:p(ah)});
 const xs=order.map((_,i)=>last-(order.length-1-i)*pitch);
 // Movement hint: a plate of two key clusters (WASD and the arrows) over a caption, a little smaller than the buttons' tier.
 const hk=1+(k-1)*.4,hw=136*hk,hh=66*hk,hx=inset,hy=h-inset-hh;
 // Build / Shop: their usual 34 px discs and 48 px targets scaled by the tier, left-aligned with the hint, Shop directly above it.
 const ur=17*k,uh=24*k,ux=inset+uh,shopY=hy-10-uh,buildY=shopY-(2*uh+10*k);
 return {...base,
  // Same id order as controlLayout (the HUD's buttons); only the positions differ.
  abilities:(['bash','taunt','charge','zone'] as const).map(id=>ability(id,xs[order.indexOf(id)])),
  utilities:[{id:'build',x:p(ux),y:p(buildY),radius:p(ur),hitRadius:p(uh),labelRight:true},{id:'shop',x:p(ux),y:p(shopY),radius:p(ur),hitRadius:p(uh),labelRight:true}],
  safe:{left:p(hx+hw),right:p(xs[0]-ah-8),bottom:p(h-inset)},
  joystick:{x:p(hx+hw/2),y:p(hy+hh/2),radius:p(hw/2),travel:base.joystick.travel},
  feedback:{x:p((xs[0]+last)/2),y:p(cy-ah-38),width:p(180)},
  hint:{x:p(hx),y:p(hy),width:p(hw),height:p(hh),scale:hk},
  tier:k
 };
}
