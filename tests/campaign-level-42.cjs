const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {battlefield}=require('../.test-build/world/battlefield.js');
const {RESOURCE_UNITS}=require('../.test-build/data/resources.js');
const {strike,DT,HZ}=require('./support/campaignBot.cjs');
const {run}=require('./support/brothersBot.cjs');
// Chapter 5 Mission 2 "Brothers in Arms" (docs/CHAPTER5_M2.md): two Allied Heroes against the camp's Warden and a timed Raider, built from existing systems only.
// Every balance value is provisional; the bot results are comparative evidence, not a balance sign-off.
const L=campaign.get('campaign-42'),NORTH='c5-cross-north',SOUTH='c5-cross-south',KEEP='red-base',BANNER='c4-banner';
const fresh=(id='l42')=>new Simulation(id,campaign.setup(42));
const play=(sim,ticks,log=[])=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});}return log;};
const money=(sim,gold=1e4,wood=1e4,iron=1e4)=>{sim.economy.balances={...sim.economy.balances,gold:gold*RESOURCE_UNITS,wood:wood*RESOURCE_UNITS,iron:iron*RESOURCE_UNITS};};
const calm=sim=>{sim.encounter={...sim.encounter,waves:[],continuous:false};return sim;};
const homeCell=sim=>{for(let r=8;r<16;r++)for(let c=8;c<16;c++)if(sim.placementReason('tavern',c,r)==='')return {col:c,row:r};};
const buildTavern=sim=>{const c=homeCell(sim);sim.send({type:'place',requestId:'tv',kind:'tavern',...c});play(sim,160);};
const rejected=log=>log.filter(e=>e.type==='rejected').map(e=>e.reason);
const raider=sim=>sim.state.units['red-raider'];

test('Mission 2 is Brothers in Arms: Chapter 5, campaign-42, capture then destroy the Keep, the second Chapter 5 slot',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[42,5,'campaign-42','Brothers in Arms','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.deepEqual(L.mission,{waveMode:'until-objectives',phases:[
  {id:'capture',objectives:[{id:'camp',type:'capture',display:{label:'Capture the Crossroads Camp'}}]},
  {id:'assault',objectives:[{id:'keep',type:'destroy',targets:[KEEP],display:{label:'Destroy the Crimson Keep'}}]}]});
 assert.equal(campaignChapters.find(c=>c.number===5).slots[1].levelId,'campaign-42');assert.equal(campaignChapters.find(c=>c.number===5).release,'coming-soon');
});
test('the approved values: map, resources, waves, flanks, Warden, Raider, Elites, Tavern, no Barracks',()=>{
 const o=L.match.overrides;
 assert.equal(o.battlefield,'brothers-in-arms');assert.deepEqual(o.start,{gold:100,wood:140,iron:15});
 assert.deepEqual(o.waves.enemyPerWave,[5,5,6,6,6,7,7,8]);assert.equal(o.waves.firstWaveTick,25*HZ);assert.equal(o.waves.waveInterval,30*HZ);assert.deepEqual(o.waves.flanks,[{wave:4,lane:'south',units:'all'},{wave:7,lane:'south',units:'all'}]);
 assert.equal(o.crimsonKeepArmed,true);assert.deepEqual(o.defenders,['red-tower-front-north','red-tower-front-south',NORTH,SOUTH]);
 const p=o.post;assert.deepEqual([p.name,p.bannerHp,p.raiseTicks,p.repair,p.counter.count,p.holders],['Crossroads Camp',2000,4*HZ,{percent:60,ticks:5*HZ},3,[NORTH,SOUTH]]);
 assert.deepEqual([p.hero.anchor,p.hero.guard,p.hero.respawnTicks],[[1128,540],220,45*HZ]);
 assert.deepEqual(o.hero,{spawn:[1752,600],delayTicks:100*HZ,respawnTicks:60*HZ});
 assert.deepEqual(o.tavern,{cap:2,roster:['roland','borin','kael']});assert.equal(o.azure,undefined);assert.equal(o.posts,undefined);
});
test('the Warden is the only narrow validation exception: a single camp may carry a Raider only in a Tavern mission whose camp has its own Warden',()=>{
 const o=()=>structuredClone(L.match.overrides);
 assert.doesNotThrow(()=>matchSetup('extended',o()));
 assert.throws(()=>matchSetup('extended',{...o(),tavern:undefined}),/Invalid post/,'no Tavern: still rejected');
 const noWarden=o();delete noWarden.post.hero;assert.throws(()=>matchSetup('extended',noWarden),/Invalid post/,'no Warden: still rejected');
 const f=structuredClone(campaign.get('campaign-31').match.overrides);assert.throws(()=>matchSetup('extended',{...f,hero:{spawn:[1752,600],delayTicks:3000,respawnTicks:1800}}),/Invalid post/,'Chapter 4 single posts are unchanged');
 const m1=structuredClone(campaign.get('campaign-41').match.overrides);assert.throws(()=>matchSetup('extended',{...m1,hero:{spawn:[1752,600],delayTicks:3000,respawnTicks:1800}}),/Invalid post/,'M1 has no Warden, so it cannot take a Raider');
 assert.throws(()=>matchSetup('extended',{...o(),hero:{spawn:[1752,600],delayTicks:-1,respawnTicks:1800}}),/Invalid Crimson Hero/);
});
test('the match starts quiet: camp Crimson, Keep shielded, the Warden at his anchor, no Raider, no Tavern, no Barracks pad',()=>{
 const sim=fresh(),s=sim.state;
 assert.deepEqual([s.gold,s.wood,s.iron],[100,140,15]);assert.deepEqual([s.post.owner,s.post.captured],['crimson',false]);
 assert.equal(s.bases[KEEP].invulnerable,true);assert.ok(s.units['red-hero']);assert.deepEqual([s.units['red-hero'].x,s.units['red-hero'].y],[1128,540]);assert.equal(raider(sim),undefined);
 assert.deepEqual(s.tavern,{slots:[]});assert.equal(sim.azurePads.length,0);assert.equal(Object.values(s.structures).filter(b=>b.tavern||b.azureBarracks).length,0);
 calm(sim);play(sim,99*HZ);assert.equal(raider(sim),undefined,'no Raider before 100 s');play(sim,2*HZ);assert.ok(raider(sim),'the Raider takes the field at 100 s');
 assert.equal(sim.state.units['red-raider'].archetype,'crimson-hero');
});
test('the Tavern hires two heroes and refuses a third',()=>{
 const sim=calm(fresh());money(sim);buildTavern(sim);money(sim);
 sim.send({type:'tavern',requestId:'a',action:'hire',merc:'roland'});sim.send({type:'tavern',requestId:'b',action:'hire',merc:'borin'});play(sim,4);
 assert.equal(Object.values(sim.state.units).filter(u=>u.ally).length,2);
 sim.send({type:'tavern',requestId:'c',action:'hire',merc:'kael'});assert.match(sim.tavernReason({action:'hire',merc:'kael'}),/cap/i);
});
test('the Warden no longer blocks the road: unopposed, the Raider reaches the Azure Keep and destroys it (measured about 46 s after release)',()=>{
 const sim=calm(fresh()),s=sim.state;sim.teleportHero(1500,300);let first=null,dead=null,arrived=false;
 while(sim.clock.tick<200*HZ&&!sim.ended){sim.advance(DT);const t=sim.clock.tick/HZ,r=raider(sim);if(r&&Math.hypot(r.x-330,r.y-600)<200)arrived=true;if(first===null&&s.bases['blue-base'].hp<3000)first=t;if(dead===null&&s.bases['blue-base'].hp<=0)dead=t;}
 assert.ok(arrived,'the Raider walks the whole road');assert.ok(first>100&&first<130,`first damage ${first}`);assert.ok(dead>first&&dead<160,`the Keep falls ${dead}`);
});
test('the first capture sends three Elites once, drops the Keep shield, and the Warden and the Raider then hunt the Banner',()=>{
 const sim=calm(fresh()),s=sim.state;for(const id of [NORTH,SOUTH])strike(sim,'guardian',id);sim.teleportHero(1080,552);play(sim,130);
 assert.equal(s.post.owner,'azure');assert.equal(s.bases[KEEP].invulnerable,undefined);const seen=new Set();for(let i=0;i<10*HZ;i++){play(sim,1);for(const u of Object.values(s.units))if(/^red-ca-/.test(u.id))seen.add(u.id);}assert.equal(seen.size,3,'three Elites');
 assert.equal(s.post.bannerId,BANNER);play(sim,90*HZ);const w=s.units['red-hero'],r=raider(sim);
 assert.ok(!w||Math.hypot(w.x-1080,w.y-504)<700,'the Warden went to the Banner');assert.ok(r&&Math.hypot(r.x-1080,r.y-504)<900||s.structures[BANNER]?.hp<=0,'the Raider went to the Banner');
});
for(const plan of ['balanced','follow2','defend2','none'])
 test(`bot, ${plan}: finishes the mission from the production level with no stall deadlock (the stall breaker resolves every stall)`,()=>{
  const r=run({plan,startAt:90*HZ,waitHires:true});assert.equal(r.outcome,'victory',JSON.stringify({...r,sim:undefined,log:undefined}));
  assert.ok(r.capture.length>=1);assert.ok(r.sec<=900);assert.ok(r.stalls<=3,'at most a few three-second Allied Hero stalls, each resolved by the stall breaker');
  if(plan==='none')assert.equal(r.hires.length,0);else{assert.equal(r.hires.length>=2,true,'both heroes were hired');assert.ok(r.tavernBuilt!==null);}
 });
test('a hero plan is clearly better than none: faster, and a Guardian who stays at the assault loses the Azure Keep without one (comparative bot evidence at the same tempo)',()=>{
 const a=run({plan:'balanced',startAt:120*HZ,waitHires:true,noRecall:true}),n=run({plan:'none',startAt:120*HZ,waitHires:true,noRecall:true});
 assert.equal(a.outcome,'victory');assert.ok(n.outcome!=='victory'||n.sec>a.sec,`none ${n.outcome} ${n.sec} vs balanced ${a.sec}`);
});
test('Missions 1 to 4 are the only registered Chapter 5 levels and Chapters 1-4 carry no Raider beside a Tavern',()=>{
 assert.equal(campaign.has('campaign-45'),false);assert.equal(campaign.get('campaign-42').chapter,5);
 assert.equal(battlefield('brothers-in-arms').flankVia.south.y,984);
});
