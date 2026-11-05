const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {battlefield}=require('../.test-build/world/battlefield.js');
const {RESOURCE_UNITS}=require('../.test-build/data/resources.js');
const {buildings}=require('../.test-build/data/buildings.js');
const {strike,route,DT,HZ}=require('./support/campaignBot.cjs');
const {run}=require('./support/brokenBot.cjs');
// Chapter 5 Mission 4 "The Broken Alliance" (docs/CHAPTER5_M4.md): two outposts, the Warden, the Tavern at Hero Cap 2, up to two Azure Barracks, the Iron Marshal, the Shadowblade and the Fortress Gate, built from existing systems only.
// Every balance value is provisional; the bot results are comparative evidence, not a balance sign-off.
const L=campaign.get('campaign-44'),KEEP='red-base',GATE='red-fortress-gate';
const fresh=(id='l44')=>new Simulation(id,campaign.setup(44));
const play=(sim,ticks,log)=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){sim.advance(DT);for(const e of sim.drainEvents())log?.push({at:sim.clock.tick,...e});}return log;};
const money=(sim,gold=1e4,wood=1e4,iron=1e4)=>{sim.economy.balances={...sim.economy.balances,gold:gold*RESOURCE_UNITS,wood:wood*RESOURCE_UNITS,iron:iron*RESOURCE_UNITS};};
const calm=sim=>{sim.encounter={...sim.encounter,waves:[],continuous:false};return sim;};
// a field with an unkillable Keep and Guardian, so only the clock decides what happens
const sturdy=sim=>{sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp=1e7;sim.hero.hp=sim.hero.maxHp=1e7;return sim;};
const pads=[[10,10],[10,14],[13,12],[20,7],[18,18]];
const azure=(sim,id)=>{sim.state.posts.find(q=>q.id===id).owner='azure';};
const openCamp=(sim,id)=>{const c=sim.setup.posts.find(q=>q.id===id);for(const h of c.holders)sim.state.structures[h].hp=0;};
const footmen=sim=>Object.values(sim.state.units).filter(u=>u.id.startsWith('blue-s-')&&u.hp>0);

test('Mission 4 is The Broken Alliance: Chapter 5, campaign-44, capture both outposts then destroy the Keep, the fourth Chapter 5 slot',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[44,5,'campaign-44','The Broken Alliance','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.deepEqual(L.mission,{waveMode:'until-objectives',phases:[
  {id:'capture',objectives:[{id:'north',type:'capture',post:'north',display:{label:'Capture the North Outpost'}},{id:'south',type:'capture',post:'south',display:{label:'Capture the South Outpost'}}]},
  {id:'assault',objectives:[{id:'keep',type:'destroy',targets:[KEEP],display:{label:'Destroy the Crimson Keep'}}]}]});
 const ch=campaignChapters.find(c=>c.number===5);assert.equal(ch.slots[3].levelId,'campaign-44');assert.equal(ch.release,'coming-soon');
});
test('the approved values: map, resources, waves, outposts, Warden, no Raider, Commanders, garrison, Tavern, Barracks pads and cap',()=>{
 const o=L.match.overrides;
 assert.equal(o.battlefield,'broken-alliance');assert.deepEqual(o.start,{gold:100,wood:220,iron:30,guardian:{x:600,y:600}});
 assert.deepEqual(o.waves.enemyPerWave,[7,7,8,8,9,9,10,10]);assert.equal(o.waves.firstWaveTick,30*HZ);assert.equal(o.waves.waveInterval,30*HZ);assert.equal(o.waves.flanks,undefined);assert.deepEqual(o.waves.redSlots,[[1776,480],[1776,720]]);
 assert.equal(o.crimsonKeepArmed,true);assert.equal(o.post,undefined);assert.equal(o.posts.length,2);assert.equal(o.hero,undefined,'the Raider is removed');assert.equal(o.cart,undefined,'no War Cart in M4');
 const [north,south]=o.posts;assert.deepEqual([north.id,south.id,north.hero,north.counter.count,south.counter.count],['north','south',undefined,2,2]);assert.ok(south.hero);
 assert.deepEqual(o.gates,[{id:GATE,hp:2500,faction:true,assist:true}]);assert.deepEqual(o.garrison,{archetype:'crimson-elite',after:GATE,slots:[[1560,456],[1560,744]],counts:[4],delayTicks:30,intervalTicks:3600*30});
 const [m,sb]=o.commanders;assert.deepEqual([m.id,m.firstTick,m.warningTicks,m.restTicks,m.escort.count],['red-marshal',180*HZ,6*HZ,60*HZ,3]);assert.deepEqual([sb.id,sb.firstTick,sb.warningTicks,sb.restTicks],['red-shadowblade',240*HZ,6*HZ,40*HZ]);
 assert.deepEqual(o.tavern,{cap:2,roster:['roland','borin','kael']});
 assert.deepEqual(o.azure,{pads:pads.map(([col,row])=>({col,row})),initial:[],limit:2});
});
test('the match starts quiet: both outposts Crimson, Keep shielded, the Warden in the south bowl, no Tavern, no Barracks, the Guardian on the Azure plain',()=>{
 const sim=fresh(),s=sim.state;
 assert.deepEqual([s.gold,s.wood,s.iron],[100,220,30]);assert.deepEqual(s.posts.map(p=>[p.id,p.owner,p.captured]),[['north','crimson',false],['south','crimson',false]]);
 assert.equal(s.bases[KEEP].invulnerable,true);assert.ok(s.units['red-hero']);assert.ok(s.units['red-hero'].y>800,'the Warden stands in the south');assert.equal(s.units['red-raider'],undefined);
 assert.deepEqual([sim.hero.x,sim.hero.y],[600,600]);assert.deepEqual(s.tavern,{slots:[]});assert.equal(Object.values(s.structures).filter(b=>b.tavern||b.azureBarracks).length,0);
});
test('the opening buys a Tavern and a Barracks at once, and nothing else is affordable until income arrives',()=>{
 const sim=calm(fresh());
 assert.equal(buildings.tavern.wood+buildings.barracks.wood,220);assert.equal(buildings.tavern.iron+buildings.barracks.iron,30);
 const cell=(kind,r0,c0)=>{for(let r=r0;r<16;r++)for(let c=c0;c<16;c++)if(sim.placementReason(kind,c,r)==='')return {col:c,row:r};};
 sim.send({type:'place',requestId:'bk',kind:'barracks',col:10,row:10});play(sim,2);
 const t=cell('tavern',8,6);assert.ok(t);sim.send({type:'place',requestId:'tv',kind:'tavern',...t});play(sim,2);
 assert.deepEqual([Math.round(sim.state.wood),Math.round(sim.state.iron)],[0,0]);assert.ok(sim.state.gold<=100);
});
test('Barracks pads: three at home open at once; the North and South pads open only when their outpost is Azure; the cap is two',()=>{
 const sim=calm(fresh());money(sim);
 for(const [c,r] of pads.slice(0,3))assert.equal(sim.placementReason('barracks',c,r),'',`home pad ${c},${r}`);
 assert.match(sim.placementReason('barracks',20,7),/Capture the North Outpost first/);assert.match(sim.placementReason('barracks',18,18),/Capture the South Outpost first/);
 openCamp(sim,'north');azure(sim,'north');assert.equal(sim.placementReason('barracks',20,7),'');assert.match(sim.placementReason('barracks',18,18),/Capture the South Outpost first/,'only its own outpost opens a pad');
 openCamp(sim,'south');azure(sim,'south');assert.equal(sim.placementReason('barracks',18,18),'');
 sim.send({type:'place',requestId:'a',kind:'barracks',col:10,row:10});sim.send({type:'place',requestId:'b',kind:'barracks',col:10,row:14});play(sim,2);
 assert.equal(Object.values(sim.state.structures).filter(b=>b.azureBarracks).length,2);
 for(const [c,r] of [[13,12],[20,7],[18,18]])assert.notEqual(sim.placementReason('barracks',c,r),'',`refused at the cap: ${c},${r}`);
});
for(const [id,col,row] of [['north',20,7],['south',18,18]])
 test(`the ${id} pad (${col},${row}) is clear of terrain, towers, ruin, flag and the Warden, the Guardian can walk to it from home, and a Barracks there trains footmen that follow him`,()=>{
  const sim=calm(fresh());money(sim);const b=sim.state.structures;
  const cx=(col+.5)*48,cy=(row+.5)*48,post=L.match.overrides.posts.find(p=>p.id===id);
  assert.ok(Math.hypot(cx-post.circle.x,cy-post.circle.y)<=post.circle.radius,'the pad is inside the build circle');
  for(const h of post.holders)assert.ok(Math.hypot(b[h].x-cx,b[h].y-cy)>=96,'clear of the watchtower '+h);
  assert.ok(Math.hypot(post.flag.x-cx,post.flag.y-cy)>=48,'clear of the flag');assert.ok(!(post.ruin.col===col&&post.ruin.row===row),'not the ruin cell');
  const w=sim.state.units['red-hero'];assert.ok(Math.hypot(w.x-cx,w.y-cy)>150,'the Warden does not stand on it');
  openCamp(sim,id);azure(sim,id);assert.equal(sim.placementReason('barracks',col,row),'');
  const path=route(sim,{x:cx-75,y:cy});assert.ok(path.length>0&&Math.hypot(path[path.length-1].x-(cx-75),path[path.length-1].y-cy)<30,'a walkable route reaches the pad');
  sim.teleportHero(cx-75,cy);sim.send({type:'place',requestId:'bk',kind:'barracks',col,row});play(sim,8*HZ);
  const bk=Object.values(sim.state.structures).find(x=>x.azureBarracks);assert.ok(bk&&bk.progress>=1,'construction completes');assert.deepEqual([bk.col,bk.row],[col,row]);
  play(sim,3*HZ);assert.equal(footmen(sim).length,2,'two footmen spawn');
  assert.ok(footmen(sim).every(u=>Math.hypot(u.x-sim.hero.x,u.y-sim.hero.y)<450),'they stand with the Guardian at the outpost');
  sim.teleportHero(600,400);play(sim,40*HZ);assert.ok(footmen(sim).every(u=>Math.hypot(u.x-sim.hero.x,u.y-sim.hero.y)<700),'and follow the Guardian away');
 });
test('the Keep stays shielded until BOTH outposts are Azure',()=>{
 const sim=calm(fresh()),s=sim.state;
 assert.equal(s.bases[KEEP].invulnerable,true);azure(sim,'north');play(sim,2);assert.equal(s.bases[KEEP].invulnerable,true,'one outpost is not enough');
 azure(sim,'south');play(sim,2);assert.equal(s.bases[KEEP].invulnerable,undefined);
});
test('each outpost captured by the Guardian sends its own two Elites once',()=>{
 const sim=calm(fresh()),s=sim.state;
 for(const id of ['c5-north-a','c5-north-b'])strike(sim,'guardian',id);sim.teleportHero(1080,324);play(sim,130);
 assert.equal(s.posts.find(p=>p.id==='north').owner,'azure');assert.equal(s.bases[KEEP].invulnerable,true);
 const seen=new Set();for(let i=0;i<10*HZ;i++){play(sim,1);for(const u of Object.values(s.units))if(/^red-ca-/.test(u.id))seen.add(u.id);}assert.equal(seen.size,2,'two Elites for the North Outpost');
 for(const id of ['c5-south-a','c5-south-b'])strike(sim,'guardian',id);delete s.units['red-hero']; // the Warden stands in the ring and blocks the Banner until he falls
 sim.teleportHero(1032,828);play(sim,130);
 assert.equal(s.posts.find(p=>p.id==='south').owner,'azure');assert.equal(s.bases[KEEP].invulnerable,undefined);
 for(let i=0;i<10*HZ;i++){play(sim,1);for(const u of Object.values(s.units))if(/^red-ca-/.test(u.id))seen.add(u.id);}assert.equal(seen.size,4,'two more for the South Outpost');
});
test('an Allied Hero standing alone in an outpost ring captures it (the split strategy)',()=>{
 const sim=calm(fresh());money(sim);
 const hc=(()=>{for(let r=8;r<16;r++)for(let c=8;c<16;c++)if(sim.placementReason('tavern',c,r)==='')return {col:c,row:r};})();sim.send({type:'place',requestId:'tv',kind:'tavern',...hc});play(sim,160);money(sim);
 sim.send({type:'tavern',requestId:'h',action:'hire',merc:'roland'});play(sim,4);
 const ally=Object.values(sim.state.units).find(u=>u.ally);assert.ok(ally);
 openCamp(sim,'north');sim.teleportHero(330,900);ally.x=1080;ally.y=330;
 sim.send({type:'ally',requestId:'o',id:ally.id,order:{type:'defend',x:1080,y:330}});play(sim,160);
 assert.equal(sim.state.posts.find(p=>p.id==='north').owner,'azure');
});
test('the Iron Marshal is announced 6 s ahead at 174 s, takes the field at 180 s with three escorts; the Shadowblade at 234 s and 240 s; no Raider ever',()=>{
 const sim=sturdy(fresh()),log=play(sim,241*HZ,[]);
 const ev=(id,change)=>log.find(e=>e.type==='commander'&&e.id===id&&e.change===change);
 assert.equal(ev('red-marshal','warning').at,174*HZ);assert.equal(ev('red-marshal','released').at,180*HZ);assert.equal(ev('red-shadowblade','warning').at,234*HZ);assert.equal(ev('red-shadowblade','released').at,240*HZ);
 assert.equal(Object.values(sim.state.units).filter(u=>u.escortOf==='red-marshal').length,3);assert.equal(ev('red-marshal','warning').lane,'north');
 assert.ok(!log.some(e=>e.id==='red-raider')&&!sim.state.units['red-raider']);
});
test('waves alone threaten the Keep, but not before a built defence can exist (first wave at 30 s)',()=>{
 const sim=fresh();sim.teleportHero(1500,300);let firstHit=null;
 while(sim.clock.tick<100*HZ&&!sim.ended){sim.advance(DT);if(firstHit===null&&sim.state.bases['blue-base'].hp<3000)firstHit=sim.clock.tick/HZ;}
 assert.ok(firstHit>40,`the first damage to the Keep comes at ${firstHit}`);
});
test('the Fortress Gate: a faction gate, and its fall sends the Last Stand garrison of four Elites',()=>{
 const sim=sturdy(fresh());play(sim,1);const gate=sim.state.structures[GATE];assert.ok(gate&&gate.hp===2500);
 gate.protectionTick=0;sim.hit(sim.hero,gate,1e6,'direct');const log=[];for(let i=0;i<120*HZ;i++){for(const id of Object.keys(sim.state.units))if(/^red-w/.test(id))delete sim.state.units[id];play(sim,1,log);} // the waves would fill the Crimson unit cap
 assert.ok(gate.hp<=0);const born=log.filter(e=>e.type==='spawn'&&/^red-g[0-9]/.test(e.id));assert.equal(born.length,4,'four garrison Elites, once');
});
test('M4 asks for no code change: Tavern, outposts, Commanders and garrison pass matchSetup together, and the M2, M3 and Crimson Fortress setups are untouched',()=>{
 assert.doesNotThrow(()=>matchSetup('extended',structuredClone(L.match.overrides)));
 for(const n of ['campaign-36','campaign-42','campaign-43'])assert.doesNotThrow(()=>matchSetup('extended',structuredClone(campaign.get(n).match.overrides)));
});
for(const plan of ['concentrate-south','concentrate-north','split','split-keep','no-barracks'])
 test(`bot, ${plan}: finishes the mission from the production level with no stall deadlock and no more than 40 live units`,()=>{
  const r=run({plan,startAt:90*HZ});assert.equal(r.outcome,'victory',JSON.stringify({...r,sim:undefined,log:undefined}));
  assert.equal(Object.keys(r.captures).sort().join(),'north,south');assert.ok(r.sec<=900);assert.ok(r.stalls<=10&&r.stallTicks<=90*HZ,`ally stalls ${r.stalls}, ${Math.round(r.stallTicks/HZ)} s`);assert.ok(r.giveUps<=3,`stall-breaker give-ups ${r.giveUps}`);assert.ok(r.peakLive<=40,`peak live units ${r.peakLive}`);
  if(plan==='no-barracks')assert.equal(r.barracks.length,0);else assert.ok(r.barracks.length>=1,'the first Barracks went up');
  assert.ok(r.hires.length>=2,'both heroes were hired');
 });
test('the unaided Guardian neither deadlocks nor floods the field (bot, no Barracks and no heroes)',()=>{
 const r=run({plan:'none',startAt:90*HZ});assert.ok(r.peakLive<=40);assert.equal(r.barracks.length,0);assert.equal(r.hires.length,0);
});
test('Missions 1 to 4 are the only registered Chapter 5 levels; M4 reuses Crimson Fortress\'s roads but leaves Chapter 4 alone',()=>{
 assert.equal(campaign.has('campaign-47'),false);assert.equal(campaign.get('campaign-44').chapter,5);
 const d=battlefield('broken-alliance'),c=battlefield('crimson-fortress');
 assert.deepEqual(d.barriers,c.barriers);assert.deepEqual(d.outposts,c.outposts);assert.deepEqual(d.gates,c.gates);assert.deepEqual(d.flankVia,c.flankVia);
 assert.notDeepEqual(d.towers.map(t=>t.id),c.towers.map(t=>t.id));assert.deepEqual(d.towers.map(t=>[t.x,t.y]),c.towers.map(t=>[t.x,t.y]));
 assert.equal(campaign.get('campaign-36').match.overrides.battlefield,'crimson-fortress');assert.equal(campaign.get('campaign-36').match.overrides.tavern,undefined);
});
