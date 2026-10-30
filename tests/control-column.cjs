'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {controlLayout}=require('../.test-build/ui/controlLayout');
const {topHudLayout}=require('../.test-build/ui/topHudLayout');
test('Build / Shop / Army form a left column above the joystick, clear of it, the top plates and each other at phone sizes',()=>{
 for(const h of [360,390,540,720,1080]){
  const s=h/540,c=controlLayout(s),top=topHudLayout(s),plateBottom=Math.max(top.guardian.y+top.guardian.height,top.match.y+top.match.height)*s,j=c.joystick;
  const css=c.utilities.map(u=>({x:u.x*s,y:u.y*s,r:u.hitRadius*s}));
  for(const u of css){
   assert.ok(Math.abs(u.r*2-48)<1e-6,'48 px touch target');
   assert.ok(Math.hypot(u.x-j.x*s,u.y-j.y*s)>=u.r+j.radius*s+8-1e-6,`${h}: clear of the joystick`);
   assert.ok(u.y-u.r>=plateBottom+8,`${h}: below the top plates`);
   assert.ok(u.x-u.r>=8&&u.x+u.r<=j.x*s+j.radius*s,`${h}: inside the joystick's column`);
  }
  for(let i=1;i<css.length;i++)assert.ok(css[i].y-css[i-1].y>=50-1e-6,`${h}: touch targets do not overlap`);
  assert.deepEqual(c.utilities.map(u=>u.id),['build','shop','army']);
 }
});
test('panels keep the old column x and the safe area sits between the joystick column and the skill cluster',()=>{
 for(const h of [360,390,540,1080]){
  const s=h/540,c=controlLayout(s),right=960*s-60,left=right-130;
  assert.ok(Math.abs(c.panelAnchorX*s-(left-76))<1e-6);
  assert.ok(c.safe.left*s>=c.joystick.x*s+c.joystick.radius*s-1e-6);
  assert.ok(c.safe.right*s<=Math.min(...c.abilities.map(a=>(a.x-a.radius)*s))-8+1e-6);
  assert.ok(c.safe.left<c.safe.right&&c.safe.bottom*s<=h-24+1e-6);
 }
});
