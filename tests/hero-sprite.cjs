const {test}=require('node:test');const assert=require('node:assert/strict');
const {HERO_SHEET,ELITE_SHEET,SOLDIER_SHEET,SOLDIER_MOTION,SF,soldierGeometry,soldierStride,soldierWalkFrame,soldierPose}=require('../.test-build/world/soldierSprite.js');
const {crimsonHero}=require('../.test-build/data/combat.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');const {campaign}=require('../.test-build/data/campaignLevels.js');
test('the Hero sheet: 14 frames in the Soldier frame map, one 408 x 360 cell, feet pivot (230,326), the idle 215 cell px tall',()=>{
 assert.equal(HERO_SHEET.key,'soldier-hero');assert.equal(HERO_SHEET.frameWidth,408);assert.equal(HERO_SHEET.frameHeight,360);assert.equal(HERO_SHEET.pivotX,230);assert.equal(HERO_SHEET.pivotY,326);assert.equal(HERO_SHEET.idleHeight,215);
 assert.deepEqual([SF.idle,...SF.walk,...SF.attack,SF.hurt,...SF.death],[0,1,2,3,4,5,6,7,8,9,10,11,12,13],'the Hero uses the Soldier frame numbers');
 assert.ok(HERO_SHEET.hit.x+HERO_SHEET.hit.w<=HERO_SHEET.frameWidth&&HERO_SHEET.hit.y+HERO_SHEET.hit.h<=HERO_SHEET.pivotY+3,'the tap box is the idle body, inside the cell and on the feet');
});
test('geometry lookup: the Hero and the Elite have their own; every other soldier sheet keeps the Soldier geometry, stride and 350 ms flinch gap',()=>{
 assert.equal(soldierGeometry('soldier-hero'),HERO_SHEET);assert.equal(soldierGeometry('soldier-elite'),ELITE_SHEET);
 for(const key of ['soldier-azure','soldier-crimson','soldier-desert','soldier-shadowblade']){const g=soldierGeometry(key);
  assert.equal(g.frameWidth,SOLDIER_SHEET.frameWidth);assert.equal(g.pivotX,SOLDIER_SHEET.pivotX);assert.equal(g.pivotY,SOLDIER_SHEET.pivotY);assert.equal(g.idleHeight,SOLDIER_SHEET.idleHeight);assert.equal(g.feetX,SOLDIER_SHEET.feetX);assert.deepEqual(g.hit,SOLDIER_SHEET.hit);assert.equal(g.stride,SOLDIER_MOTION.stride);assert.equal(g.hurtGap,SOLDIER_MOTION.hurtGap);assert.equal(g.strideCells,undefined);}
 assert.equal(ELITE_SHEET.hurtGap,SOLDIER_MOTION.hurtGap,'the Elite flinches at the Soldier gap');assert.equal(HERO_SHEET.hurtGap,900,'a Hero flinches at most once per 900 ms');
});
test('stride: a sheet with strideCells follows the drawn size (the Marshal is the same sheet 2.3/1.9 larger); the others use their own world stride',()=>{
 const lord=109.44/HERO_SHEET.idleHeight,marshal=132.48/HERO_SHEET.idleHeight;
 assert.ok(Math.abs(soldierStride(HERO_SHEET,lord)-HERO_SHEET.stride)<1,'at the Lord scale the cycle is the nominal stride');
 assert.ok(Math.abs(soldierStride(HERO_SHEET,marshal)/soldierStride(HERO_SHEET,lord)-2.3/1.9)<1e-9,'the Marshal stride is proportional to his size');
 assert.equal(soldierStride(ELITE_SHEET,.576),ELITE_SHEET.stride);assert.equal(soldierStride(soldierGeometry('soldier-crimson'),.48),SOLDIER_MOTION.stride);
});
test('walk and pose logic are the Soldier\'s: the stride only changes the length of a cycle',()=>{
 const L=88,seen=[];for(let i=0;i<6;i++)seen.push(soldierWalkFrame((i+.5)*L/6,L));assert.deepEqual(seen,SF.walk);
 for(let d=0;d<200;d+=3.7)assert.equal(soldierWalkFrame(d),SF.walk[Math.floor(((d/SOLDIER_MOTION.stride)%1)*6)%6]);
 const base={now:1000,travelled:0,movedAt:-1e9,attackWindup:200};
 assert.equal(soldierPose({...base,attackAt:950}),SF.attack[0]);assert.equal(soldierPose({...base,attackAt:850}),SF.attack[1]);assert.equal(soldierPose({...base,attackAt:790}),SF.attack[2],'contact from the end of the 6-tick (200 ms) windup');
 assert.equal(soldierPose({...base,hurtAt:990}),SF.hurt);assert.equal(soldierPose(base),SF.idle);
});
test('the Hero is a Crimson soldier\'s speed and range with its own HP, armor, damage and windup: the picture changes no number',()=>{
 const s=crimsonHero.stats;assert.equal(s.maxHp,833);assert.equal(s.speed,95);assert.equal(s.damage,80);assert.equal(s.range,48);assert.equal(s.radius,20);assert.equal(s.armor,20);assert.equal(s.windupTicks,6);assert.equal(s.cooldownTicks,23);
});
test('simulation: the Throne Gate releases the Crimson Lord (x1.2 HP, x1.1 damage) who returns 45 s after a death; the Iron Marshal is warned of and released at 240 s with an 8-tick windup',()=>{
 const sim=new Simulation('hero-sprite',campaign.setup(46)),gate=sim.state.structures['red-fortress-gate'];assert.ok(gate);
 const lord=()=>sim.state.units['red-hero'],step=n=>{const ev=[];for(let i=0;i<n;i++){sim.advance(1000/30+.01);ev.push(...sim.drainEvents());sim.hero.hp=sim.hero.maxHp=1e8;sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp=1e9;}return ev;};
 assert.equal(lord(),undefined,'nothing before the gate falls');sim.hit(sim.hero,gate,1e9,'direct');step(120);
 assert.ok(lord()&&lord().hp>0,'the Lord is released');assert.equal(lord().maxHp,Math.round(crimsonHero.stats.maxHp*1.2));assert.equal(lord().windupTicks,6);assert.equal(lord().archetype,'crimson-hero');
 sim.hit(sim.hero,lord(),1e9,'direct');step(2);assert.equal(lord(),undefined,'he falls');
 step(1300);assert.equal(lord(),undefined,'not yet back before 45 s');step(120);assert.ok(lord()&&lord().hp>0,'back after 45 s');
 const ev=step(7500-sim.clock.tick),m=sim.state.units['red-marshal'];
 assert.ok(ev.some(e=>e.type==='commander'&&e.change==='warning')&&ev.some(e=>e.type==='commander'&&e.change==='released'),'warned of, then released');assert.ok(m&&m.commander.role==='marshal'&&m.windupTicks===8&&m.maxHp===Math.round(crimsonHero.stats.maxHp*1.6),'the Marshal: 8-tick windup, x1.6 HP');
});
