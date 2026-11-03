'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {panelSpan,wrapWidth,shortCanvas,PANEL_MIN_WIDTH}=require('../.test-build/ui/panelSpan');
const {controlLayout}=require('../.test-build/ui/controlLayout');
const {topHudLayout}=require('../.test-build/ui/topHudLayout');
const {skillsLayout}=require('../.test-build/ui/skillsLayout');
const {shopGridLayout}=require('../.test-build/ui/shopGridLayout');
const {equipmentLayout}=require('../.test-build/ui/equipmentLayout');
const {buildLayout}=require('../.test-build/ui/buildLayout');
const sizes=[[960,540],[832,291],[780,250],[740,270]];
test('wrapWidth never returns less than a readable minimum, for any input',()=>{
 for(const v of [-50,0,1,12,NaN,Infinity,-Infinity])assert.ok(wrapWidth(v)>=40||v===Infinity,String(v));
 assert.equal(wrapWidth(200),200);assert.equal(wrapWidth(NaN),40);
});
test('panels keep a readable width and stay inside the canvas on every phone viewport',()=>{
 for(const [w,h] of sizes){
  const s=h/540,c=controlLayout(s),top=topHudLayout(s),utilityX=c.panelAnchorX,hud=Math.max(top.guardian.y+top.guardian.height,top.match.y+top.match.height);
  const canvasW=960*s,canvasH=540*s;
  const skills=skillsLayout(s,hud,utilityX),shop=shopGridLayout(s,hud,utilityX),eq=equipmentLayout(s,hud,utilityX),build=buildLayout(s,hud,utilityX,false);
  for(const [name,f] of [['skills',skills],['shop',shop],['equipment',eq],['build',build]]){
   assert.ok(f.width*s>=Math.min(PANEL_MIN_WIDTH,canvasW-124-8)-1e-6||canvasW>=880,`${w}x${h} ${name}: width ${f.width*s}`);
   assert.ok(f.x>=0&&(f.x+f.width)*s<=canvasW+1e-6,`${w}x${h} ${name}: inside the canvas horizontally`);
   assert.ok(f.y>=0&&(f.y+f.height)*s<=canvasH+1e-6,`${w}x${h} ${name}: inside the canvas vertically`);
  }
 }
});
test('desktop-size layouts are unchanged by the phone floor',()=>{
 const s=1,c=controlLayout(s),top=topHudLayout(s),hud=Math.max(top.guardian.y+top.guardian.height,top.match.y+top.match.height);
 assert.equal(skillsLayout(s,hud,c.panelAnchorX).width,Math.min(550,c.panelAnchorX-30-124));
 assert.equal(shortCanvas(1),false);assert.equal(shortCanvas(.6),true);
 assert.equal(c.joystick.radius,43);assert.equal(c.abilities[4].radius,36);assert.equal(c.utilities.length,3);assert.ok(c.utilities.every(u=>!u.hidden));
});
test('short phone canvases shrink the controls but keep 44 px targets, clear the top plates and drop Army only when three do not fit',()=>{
 for(const [,h] of sizes.slice(1)){
  const s=h/540,c=controlLayout(s),top=topHudLayout(s),plate=Math.max(top.guardian.y+top.guardian.height,top.match.y+top.match.height)*s;
  const shown=c.utilities.filter(u=>!u.hidden);
  assert.ok(shown.length>=2);
  for(const u of shown){
   assert.ok(u.hitRadius*s*2>=44-1e-6,`${h}: utility target`);
   assert.ok((u.y-u.hitRadius)*s>=plate-4,`${h}: below the plates`);
   assert.ok(Math.hypot(u.x*s-c.joystick.x*s,u.y*s-c.joystick.y*s)>=u.hitRadius*s+c.joystick.radius*s+4,`${h}: clear of the joystick`);
  }
  assert.ok(c.abilities.every(a=>a.hitRadius*s*2>=44-1e-6),`${h}: ability targets`);
  assert.ok(c.joystick.radius*s*2>=56&&c.abilities[4].hitRadius*s*2>=56);
 }
});
