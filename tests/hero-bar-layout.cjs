const {test}=require('node:test'),assert=require('node:assert/strict');
const {controlLayout}=require('../.test-build/ui/controlLayout.js');
const {heroBarLayout,HERO_SLOTS}=require('../.test-build/ui/heroBarLayout.js');
// Chapter 5 Hero Command HUD (docs/CHAPTER5_HERO_HUD.md): the portrait row, the command popover and the target prompt keep clear of every existing control, at desktop and phone landscape sizes.
// Gaps are CSS px from the new element to the nearest existing hit area (joystick, skill buttons, Attack, Build/Shop); negative would be an overlap.
const viewports=[[960,540],[832,291],[780,360],[780,250],[740,270]];
const fit=([w,h])=>Math.min(w/960,h/540);
function gaps(w,h,count){
 const s=fit([w,h]),m=controlLayout(s),L=heroBarLayout(m,s,count);
 const circles=[...m.abilities.map(a=>({id:a.id,x:a.x,y:a.y,r:a.hitRadius})),...m.utilities.map(u=>({id:u.id,x:u.x,y:u.y,r:u.hitRadius})),{id:'joystick',x:m.joystick.x,y:m.joystick.y,r:m.joystick.radius}];
 const rect=(x0,y0,x1,y1)=>c=>{const nx=Math.max(x0,Math.min(x1,c.x)),ny=Math.max(y0,Math.min(y1,c.y));return Math.hypot(nx-c.x,ny-c.y)-c.r;};
 const min=fn=>Math.min(...circles.map(fn))*s;
 const slots=L.slots.map(p=>min(c=>Math.hypot(p.x-c.x,p.y-c.y)-p.hitRadius-c.r));
 const q=L.popover,pr=L.prompt;
 return {s,m,L,slots,popover:min(rect(q.x,q.y,q.x+q.width,q.y+q.height)),prompt:min(rect(pr.x,pr.y,pr.x+pr.width,pr.y+pr.height))};
}
test('the hero bar never overlaps an existing control, at every viewport and hero count',()=>{
 for(const [w,h] of viewports)for(let n=1;n<=HERO_SLOTS;n++){const g=gaps(w,h,n);
  g.slots.forEach((v,i)=>assert.ok(v>=0,`${w}x${h} ${n} heroes: portrait ${i+1} gap ${v.toFixed(1)}`));
  assert.ok(g.popover>=0,`${w}x${h}: popover gap ${g.popover.toFixed(1)}`);assert.ok(g.prompt>=0,`${w}x${h}: prompt gap ${g.prompt.toFixed(1)}`);}
});
test('at the S24 fullscreen viewport (780x360) and on desktop every new element keeps at least 12 CSS px from existing controls',()=>{
 for(const vp of [[780,360],[960,540]]){const g=gaps(...vp,HERO_SLOTS);for(const v of [...g.slots,g.popover,g.prompt])assert.ok(v>=12,`${vp.join('x')}: gap ${v.toFixed(1)}`);}
});
test('the 780x250 layout warning stays a warning: three portraits clear Bash by only a few px, two by much more',()=>{
 const three=gaps(780,250,3),two=gaps(780,250,2);
 assert.ok(three.slots[2]>=0&&three.slots[2]<8,`third portrait ${three.slots[2].toFixed(1)} px`);assert.ok(Math.min(...two.slots)>=12);
});
test('touch targets: portraits 48 CSS px (44 short), command buttons 60x48 (48x48 short), the cancel chip 44',()=>{
 for(const [w,h] of viewports){const {s,L}=gaps(w,h,3),css=v=>Math.round(v*s);
  for(const p of L.slots)assert.equal(css(p.hitRadius*2),L.short?44:48,`${w}x${h} portrait`);
  assert.deepEqual([css(L.popover.button.width),css(L.popover.height)],L.short?[48,48]:[60,48],`${w}x${h} buttons`);assert.equal(css(L.prompt.cancel*2),44,`${w}x${h} chip`);}
});
test('everything sits inside the canvas, above the gesture inset, and the prompt takes the popover place',()=>{
 for(const [w,h] of viewports){const {s,m,L}=gaps(w,h,3);
  for(const p of L.slots){assert.ok(p.x-p.hitRadius>=0&&p.x+p.hitRadius<=960);assert.ok((540-p.y-p.hitRadius)*s>=m.bottomCssInset,`${w}x${h}: above the inset`);}
  const q=L.popover,pr=L.prompt;assert.ok(q.y>0&&q.x>=0&&q.x+q.width<=960);assert.equal(pr.x,q.x);assert.equal(pr.y,q.y);
  assert.ok(q.y+q.height<L.slots[0].y-L.slots[0].hitRadius,`${w}x${h}: the popover stands above the portraits`);}
});
test('slots run left to right from the joystick, one per hero up to three',()=>{
 const s=fit([780,360]),m=controlLayout(s);
 for(const n of [0,1,2,3,5]){const L=heroBarLayout(m,s,n);assert.equal(L.slots.length,Math.min(n,HERO_SLOTS));for(let i=1;i<L.slots.length;i++)assert.ok(L.slots[i].x>L.slots[i-1].x);}
 assert.ok(heroBarLayout(m,s,1).slots[0].x>m.joystick.x+m.joystick.radius);
});
