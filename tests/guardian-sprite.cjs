const {test}=require('node:test');const assert=require('node:assert/strict');
const {GF,GUARDIAN_SHEET,GUARDIAN_MOTION:M,attackFrame,castFrame,walkFrame,guardianPose,nextFacing,faceToward}=require('../.test-build/world/guardianSprite.js');
const {AIM,aimDirection,chargeAim,bashAim,inCancel}=require('../.test-build/ui/skillAim.js');
const base=(o={})=>({now:10000,travelled:0,movedAt:-1e9,attackWindup:200,dashing:false,stunned:false,...o});
test('every frame index fits the sheet once',()=>{const all=[GF.idle,...GF.walk,...GF.attack,...GF.bash,...GF.charge,...GF.taunt,...GF.protect,GF.hurt,...GF.death,GF.rise];assert.equal(new Set(all).size,all.length);assert.ok(Math.max(...all)<GUARDIAN_SHEET.frames);});
test('the attack contact frame shows exactly from the end of the windup (the damage tick)',()=>{for(const w of [200,400,100]){assert.notEqual(attackFrame(w-1,w),GF.attack[3]);assert.equal(attackFrame(w,w),GF.attack[3]);assert.equal(attackFrame(0,w),GF.attack[0]);assert.equal(attackFrame(w+400,w),undefined);}});
test('the attack ends before the Guardian can attack again (23 ticks)',()=>{assert.equal(attackFrame(23*1000/30,200),undefined);});
test('Bash, Taunt and Protect land their contact frame on the resolve tick',()=>{assert.equal(castFrame('bash',200,200),GF.bash[3]);assert.notEqual(castFrame('bash',199,200),GF.bash[3]);assert.equal(castFrame('taunt',200,200),GF.taunt[2]);assert.equal(castFrame('zone',300,300),GF.protect[2]);assert.notEqual(castFrame('zone',299,300),GF.protect[2]);for(const k of ['bash','taunt','zone'])assert.equal(castFrame(k,2000,200),undefined);});
test('Charge braces during the windup and strides while the simulation dashes',()=>{assert.equal(castFrame('charge',100,200),GF.charge[0]);assert.equal(castFrame('charge',200,200),undefined);const a=guardianPose(base({dashing:true,now:0})).frame,b=guardianPose(base({dashing:true,now:M.dashMs})).frame;assert.deepEqual([a,b].sort(),[GF.charge[1],GF.charge[2]].sort());});
test('walk frames follow distance: one cycle per stride, no frame skipped',()=>{const seen=[];for(let d=0;d<M.stride;d+=M.stride/60)seen.push(walkFrame(d));assert.deepEqual([...new Set(seen)],[...GF.walk]);assert.equal(walkFrame(0),walkFrame(M.stride));assert.equal(walkFrame(-1),GF.walk[5]);});
test('priority: death over everything, then dash, cast, attack, hurt, walk, idle',()=>{
 assert.equal(guardianPose(base({deadAt:9990,dashing:true,cast:{skill:'bash',at:9990,windup:200}})).frame,GF.death[0]);
 assert.equal(guardianPose(base({dashing:true,cast:{skill:'charge',at:9900,windup:200},attackAt:9990})).frame>=GF.charge[1],true);
 assert.equal(guardianPose(base({cast:{skill:'taunt',at:9900,windup:200},attackAt:9990})).frame,GF.taunt[1]);
 assert.equal(guardianPose(base({attackAt:9900,hurtAt:9990})).frame,GF.attack[1]);
 assert.equal(guardianPose(base({hurtAt:9990,movedAt:9990})).frame,GF.hurt);
 assert.equal(guardianPose(base({movedAt:9990,travelled:0})).frame,GF.walk[0]);
 assert.equal(guardianPose(base()).frame,GF.idle);
 assert.equal(guardianPose(base({movedAt:10000-M.moveHold-1})).frame,GF.idle);});
test('death holds the fallen frame, then fades; respawn rises and fades in',()=>{const d=t=>guardianPose(base({deadAt:0,now:t}));assert.equal(d(5000).frame,GF.death[2]);assert.equal(d(M.deathHold).alpha,1);assert.equal(d(M.deathHold+M.deathFade).alpha,0);const r=t=>guardianPose(base({respawnAt:0,now:t}));assert.equal(r(0).alpha,0);assert.equal(r(0).frame,GF.death[0]);assert.equal(r(M.riseMs-1).frame,GF.rise);assert.equal(r(M.riseMs).frame,GF.idle);assert.equal(r(M.riseMs).alpha,1);});
test('facing: a nudge back does not turn, a walk back does, and turns are paced',()=>{let f={facing:1,drift:0};for(let i=0;i<3;i++)f=nextFacing(f.facing,f.drift,-1,1000);assert.equal(f.facing,1);f=nextFacing(1,0,-5,1000);assert.equal(f.facing,-1);assert.equal(nextFacing(1,0,-50,M.turnHold-1).facing,1);assert.equal(faceToward(-1,2),-1);assert.equal(faceToward(-1,40),1);});
test('aim: a drag up the screen aims up the battlefield, undoing the 0.72 projection',()=>{const d=aimDirection({x:0,y:0},{x:0,y:-36},.72);assert.ok(Math.abs(d.y+1)<1e-9);const e=aimDirection({x:0,y:0},{x:72,y:72*.72},.72);assert.ok(Math.abs(e.x-e.y)<1e-9);assert.equal(aimDirection({x:5,y:5},{x:5,y:5},.72),undefined);});
test('Charge aim: distance grows with the drag up to the rank maximum',()=>{assert.equal(chargeAim({x:0,y:0},{x:AIM.full,y:0},.72,1,240).distance,240);assert.equal(chargeAim({x:0,y:0},{x:AIM.full*2,y:0},.72,1,240).distance,240);assert.equal(chargeAim({x:0,y:0},{x:AIM.full/2,y:0},.72,1,240).distance,120);assert.equal(chargeAim({x:0,y:0},{x:AIM.full/2,y:0},.72,2,144).distance,144);});
test('Bash aim picks the target best lined up with the drag inside the cone',()=>{const h={x:0,y:0},a={id:'a',x:60,y:5},b={id:'b',x:10,y:60},c={id:'c',x:-60,y:0};assert.equal(bashAim(h,{x:1,y:0},[a,b,c]).id,'a');assert.equal(bashAim(h,{x:0,y:1},[a,b,c]).id,'b');assert.equal(bashAim(h,{x:0,y:-1},[a,b,c]),undefined);const n={id:'n',x:30,y:0},f={id:'f',x:80,y:0};assert.equal(bashAim(h,{x:1,y:0},[f,n]).id,'n');});
test('cancel target hit test',()=>{assert.ok(inCancel({x:10,y:0},{x:0,y:0,radius:10}));assert.ok(!inCancel({x:11,y:0},{x:0,y:0,radius:10}));});
test('the Guardian sheet is drawn facing right: facing 1 is the unmirrored art',()=>{assert.equal(require('../.test-build/world/guardianSprite.js').GUARDIAN_AUTHORED,1);});

test('every action clip (attack, Bash, Charge, Taunt, Protect) takes the opposite mirror (the sword leads); every other frame keeps the walk mirror',()=>{
 const {GF,guardianUnmirrored,guardianSwordLeftFrame}=require('../.test-build/world/guardianSprite.js');
 for(const f of [...GF.attack,...GF.bash,...GF.charge,...GF.taunt,...GF.protect]){assert.equal(guardianSwordLeftFrame(f),true,String(f));assert.equal(guardianUnmirrored(1,f),false);assert.equal(guardianUnmirrored(-1,f),true);}
 for(const f of [GF.idle,...GF.walk,GF.hurt,...GF.death,GF.rise]){assert.equal(guardianSwordLeftFrame(f),false,String(f));assert.equal(guardianUnmirrored(1,f),true);assert.equal(guardianUnmirrored(-1,f),false);}
})
