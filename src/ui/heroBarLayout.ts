import type {controlLayout} from './controlLayout';
/** Chapter 5 Hero Command HUD (docs/CHAPTER5_HERO_HUD.md): where the Allied Hero portraits, the command popover and the target prompt sit, in the HUD's logical 960x540 space; sizes are CSS pixels.
 * The only free band for a persistent control is the bottom strip between the joystick and the skill cluster: the portraits start one gap past the joystick, above the gesture inset.
 * The popover (Follow / Attack / Defend) and, in its place while targeting, the prompt sit directly above the portraits and end before the skill cluster. Short phone landscape (under 360 px tall) uses
 * 44 px portrait targets and square command buttons; at 780x250 three portraits clear Bash by about 4 CSS px (a known layout warning, docs/CHAPTER5_HERO_HUD.md). */
export const HERO_SLOTS=3;
export type HeroBarLayout=ReturnType<typeof heroBarLayout>;
export function heroBarLayout(controls:ReturnType<typeof controlLayout>,scale:number,count:number){
 const s=Math.max(.1,scale),p=(v:number)=>v/s,short=540*s<360,j=controls.joystick,n=Math.max(0,Math.min(HERO_SLOTS,count));
 const hit=short?22:24,radius=short?16:19,gap=short?4:8,y=540-p(controls.bottomCssInset+hit+4),x0=j.x+j.radius+p(hit+12),pitch=p(2*hit+gap);
 const slots=Array.from({length:n},(_,i)=>({x:x0+i*pitch,y,radius:p(radius),hitRadius:p(hit)}));
 const bash=controls.abilities.find(a=>a.id==='bash')!,utilityRight=controls.utilities.reduce((a,u)=>Math.max(a,u.x+u.hitRadius),0);
 const button={width:p(short?48:60),height:p(48),gap:p(6)},width=3*button.width+2*button.gap,right=bash.x-bash.hitRadius-p(6);
 const left=Math.max(utilityRight+p(6),Math.min(x0-p(hit),right-width)),top=y-p(hit)-p(10)-button.height;
 return {short,scale:s,slots,
  popover:{x:left,y:top,width,height:button.height,button},
  // The prompt takes the popover's place; its cancel chip is at its right end, inside the skill cluster's clearance.
  prompt:{x:left,y:top,width:Math.min(right-left,p(short?172:280)),height:button.height,cancel:p(22),font:p(short?13:15)}};
}
