const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {battlefield}=require('../.test-build/world/battlefield.js');
const {RESOURCE_UNITS}=require('../.test-build/data/resources.js');
const {buildings}=require('../.test-build/data/buildings.js');
const {strike,route,DT,HZ}=require('./support/campaignBot.cjs');
const {run}=require('./support/dividedBot.cjs');
// Chapter 5 Mission 3 "The Divided Road" (docs/CHAPTER5_M3.md): two roads, two camps, two Allied Heroes and up to two Azure Barracks, built from existing systems only.
// Every balance value is provisional; the bot results are comparative evidence, not a balance sign-off.
const L=campaign.get('campaign-43'),KEEP='red-base';
const fresh=(id='l43')=>new Simulation(id,campaign.setup(43));
const play=(sim,ticks)=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){sim.advance(DT);sim.drainEvents();}};
const money=(sim,gold=1e4,wood=1e4,iron=1e4)=>{sim.economy.balances={...sim.economy.balances,gold:gold*RESOURCE_UNITS,wood:wood*RESOURCE_UNITS,iron:iron*RESOURCE_UNITS};};
const calm=sim=>{sim.encounter={...sim.encounter,waves:[],continuous:false};return sim;};
const raider=sim=>sim.state.units['red-raider'];
const pads=[[10,10],[10,14],[13,12],[23,6],[20,17]]; // the Basin pad is (20,17): at (21,20) it sat under the placement panel on the phone layout (PO fix)
const azure=(sim,id)=>{const p=sim.state.posts.find(q=>q.id===id);p.owner='azure';};
const openCamp=(sim,id)=>{const c=sim.setup.posts.find(q=>q.id===id);for(const h of c.holders)sim.state.structures[h].hp=0;};

test('Mission 3 is The Divided Road: Chapter 5, campaign-43, capture both camps then destroy the Keep, the third Chapter 5 slot',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[43,5,'campaign-43','The Divided Road','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.deepEqual(L.mission,{waveMode:'until-objectives',phases:[
  {id:'capture',objectives:[{id:'rim',type:'capture',post:'rim',display:{label:'Capture the Rim Camp'}},{id:'basin',type:'capture',post:'basin',display:{label:'Capture the Basin Camp'}}]},
  {id:'assault',objectives:[{id:'keep',type:'destroy',targets:[KEEP],display:{label:'Destroy the Crimson Keep'}}]}]});
 const ch=campaignChapters.find(c=>c.number===5);assert.equal(ch.slots[2].levelId,'campaign-43');assert.equal(ch.release,'coming-soon');
});
test('the approved values: map, resources, waves, camps, Warden, Raider, Tavern, Barracks pads and cap',()=>{
 const o=L.match.overrides;
 assert.equal(o.battlefield,'divided-road');assert.deepEqual(o.start,{gold:100,wood:220,iron:30});
 assert.deepEqual(o.waves.enemyPerWave,[8,8,9,9,9,10,10,10]);assert.equal(o.waves.firstWaveTick,30*HZ);assert.equal(o.waves.waveInterval,30*HZ);assert.equal(o.waves.flanks,undefined);assert.deepEqual(o.waves.redSlots,[[1776,480],[1776,720]]);
 assert.equal(o.crimsonKeepArmed,true);assert.equal(o.post,undefined);assert.equal(o.posts.length,2);
 const [rim,basin]=o.posts;assert.deepEqual([rim.id,basin.id,rim.hero,rim.counter.count,basin.counter.count],['rim','basin',undefined,2,2]);
 assert.deepEqual([basin.hero.guard,basin.hero.spawn,basin.hero.respawnTicks],[220,[1512,888],45*HZ]);
 assert.deepEqual(o.hero,{spawn:[1512,312],delayTicks:90*HZ,respawnTicks:50*HZ});
 assert.deepEqual(o.tavern,{cap:2,roster:['roland','borin','kael']});
 assert.deepEqual(o.azure,{pads:pads.map(([col,row])=>({col,row})),initial:[],limit:2});
});
test('the match starts quiet: both camps Crimson, Keep shielded, the Warden in the Basin bowl, no Raider, no Tavern, no Barracks',()=>{
 const sim=fresh(),s=sim.state;
 assert.deepEqual([s.gold,s.wood,s.iron],[100,220,30]);assert.deepEqual(s.posts.map(p=>[p.id,p.owner,p.captured]),[['rim','crimson',false],['basin','crimson',false]]);
 assert.equal(s.bases[KEEP].invulnerable,true);assert.ok(s.units['red-hero']);assert.ok(s.units['red-hero'].y>800,'the Warden stands in the south');assert.equal(raider(sim),undefined);
 assert.deepEqual(s.tavern,{slots:[]});assert.equal(Object.values(s.structures).filter(b=>b.tavern||b.azureBarracks).length,0);
 calm(sim);play(sim,89*HZ);assert.equal(raider(sim),undefined,'no Raider before 90 s');play(sim,2*HZ);assert.ok(raider(sim),'the Raider takes the field at 90 s');
 assert.ok(raider(sim).y<450,'and he rides out of the north courtyard');
});
test('the opening buys a Tavern and a Barracks at once, and nothing else is affordable until income arrives',()=>{
 const sim=calm(fresh());
 assert.equal(buildings.tavern.wood+buildings.barracks.wood,220);assert.equal(buildings.tavern.iron+buildings.barracks.iron,30);
 const cell=(kind,r0,c0)=>{for(let r=r0;r<16;r++)for(let c=c0;c<16;c++)if(sim.placementReason(kind,c,r)==='')return {col:c,row:r};};
 assert.equal(sim.placementReason('barracks',10,10),'');
 sim.send({type:'place',requestId:'bk',kind:'barracks',col:10,row:10});play(sim,2);
 const t=cell('tavern',8,6);assert.ok(t);sim.send({type:'place',requestId:'tv',kind:'tavern',...t});play(sim,2);
 assert.deepEqual([Math.round(sim.state.wood),Math.round(sim.state.iron)],[0,0],'both fit the starting wood and iron exactly');
 assert.ok(sim.state.gold<=100);
});
test('Barracks pads: three at home open at once; the Rim and Basin pads open only when their camp is Azure; the cap is two',()=>{
 const sim=calm(fresh());money(sim);
 for(const [c,r] of pads.slice(0,3))assert.equal(sim.placementReason('barracks',c,r),'',`home pad ${c},${r}`);
 assert.match(sim.placementReason('barracks',23,6),/Capture the Rim Camp first/);assert.match(sim.placementReason('barracks',20,17),/Capture the Basin Camp first/);
 azure(sim,'rim');assert.equal(sim.placementReason('barracks',23,6),'');assert.match(sim.placementReason('barracks',20,17),/Capture the Basin Camp first/,'only its own camp opens a pad');
 openCamp(sim,'basin');azure(sim,'basin');assert.equal(sim.placementReason('barracks',20,17),''); // a camp is Azure only once its watchtowers are down (a standing tower at 192 px would shoot the Barracks)
 sim.send({type:'place',requestId:'a',kind:'barracks',col:10,row:10});sim.send({type:'place',requestId:'b',kind:'barracks',col:10,row:14});play(sim,2);
 assert.equal(Object.values(sim.state.structures).filter(b=>b.azureBarracks).length,2);
 assert.notEqual(sim.placementReason('barracks',13,12),'','the third is refused at the cap');assert.notEqual(sim.placementReason('barracks',23,6),'');assert.notEqual(sim.placementReason('barracks',20,17),'');
});
test('the Basin pad (20,17) is clear of terrain, towers, ruin, flag and the Warden, the Guardian can walk to it from home, and a Barracks there trains footmen that follow him',()=>{
 const sim=calm(fresh());money(sim);const b=sim.state.structures;
 const cx=20.5*48,cy=17.5*48,basin=L.match.overrides.posts[1];
 assert.ok(Math.hypot(cx-basin.circle.x,cy-basin.circle.y)<=basin.circle.radius,'the pad is inside the Basin build circle');
 for(const id of basin.holders)assert.ok(Math.hypot(b[id].x-cx,b[id].y-cy)>=96,'clear of the watchtower '+id);
 assert.ok(Math.hypot(basin.flag.x-cx,basin.flag.y-cy)>=48,'clear of the flag');assert.ok(!(basin.ruin.col===20&&basin.ruin.row===17),'not the ruin cell');
 const w=sim.state.units['red-hero'];assert.ok(Math.hypot(w.x-cx,w.y-cy)>150,'the Warden does not stand on it');
 openCamp(sim,'basin');azure(sim,'basin');assert.equal(sim.placementReason('barracks',20,17),''); // a camp is Azure only once its watchtowers are down (a standing tower at 192 px would shoot the Barracks)
 // the Guardian walks from the Keep to the pad by the real route
 const path=route(sim,{x:cx-75,y:cy});assert.ok(path.length>0&&Math.hypot(path[path.length-1].x-(cx-75),path[path.length-1].y-cy)<30,'a walkable route reaches the pad');
 sim.teleportHero(cx-75,cy);sim.send({type:'place',requestId:'bk',kind:'barracks',col:20,row:17});play(sim,8*HZ);
 const bk=Object.values(sim.state.structures).find(x=>x.azureBarracks);assert.ok(bk&&bk.progress>=1,'construction completes');assert.deepEqual([bk.col,bk.row],[20,17]);
 play(sim,3*HZ);const foot=()=>Object.values(sim.state.units).filter(u=>u.id.startsWith('blue-s-')&&u.hp>0);assert.equal(foot().length,2,'two footmen spawn');
 assert.ok(foot().every(u=>Math.hypot(u.x-sim.hero.x,u.y-sim.hero.y)<450),'they stand with the Guardian at the camp');
 sim.teleportHero(600,400);play(sim,40*HZ);assert.ok(foot().every(u=>Math.hypot(u.x-sim.hero.x,u.y-sim.hero.y)<700),'and follow the Guardian away from the camp');
});
test('a Barracks makes two footmen that follow the Guardian, and replaces a dead one for free',()=>{
 const sim=calm(fresh());money(sim);sim.send({type:'place',requestId:'a',kind:'barracks',col:10,row:10});play(sim,10*HZ);
 const foot=()=>Object.values(sim.state.units).filter(u=>u.id.startsWith('blue-s-')&&u.hp>0);
 assert.equal(foot().length,2);
 sim.teleportHero(900,300);play(sim,40*HZ);
 assert.ok(foot().every(u=>Math.hypot(u.x-sim.hero.x,u.y-sim.hero.y)<700),'the footmen stand with the Guardian, not at the Barracks');
 const before=foot()[0];before.hp=0;play(sim,2);assert.equal(foot().length,1);play(sim,17*HZ);assert.equal(foot().length,2,'a dead footman is replaced after 15 s at no cost');
});
test('the Keep stays shielded until BOTH camps are Azure',()=>{
 const sim=calm(fresh()),s=sim.state;
 assert.equal(s.bases[KEEP].invulnerable,true);azure(sim,'rim');play(sim,2);assert.equal(s.bases[KEEP].invulnerable,true,'one camp is not enough');
 azure(sim,'basin');play(sim,2);assert.equal(s.bases[KEEP].invulnerable,undefined);
});
test('each camp captured by the Guardian sends its own two Elites once, and the second capture breaks the shield',()=>{
 const sim=calm(fresh()),s=sim.state;
 for(const id of ['c5-rim-north','c5-rim-south'])strike(sim,'guardian',id);sim.teleportHero(1176,360);play(sim,130);
 assert.equal(s.posts.find(p=>p.id==='rim').owner,'azure');assert.equal(s.bases[KEEP].invulnerable,true);
 const seen=new Set();for(let i=0;i<10*HZ;i++){play(sim,1);for(const u of Object.values(s.units))if(/^red-ca-/.test(u.id))seen.add(u.id);}assert.equal(seen.size,2,'two Elites for the Rim');
 for(const id of ['c5-basin-north','c5-basin-south'])strike(sim,'guardian',id);sim.teleportHero(1080,840);play(sim,130);
 assert.equal(s.posts.find(p=>p.id==='basin').owner,'azure');assert.equal(s.bases[KEEP].invulnerable,undefined);
 for(let i=0;i<10*HZ;i++){play(sim,1);for(const u of Object.values(s.units))if(/^red-ca-/.test(u.id))seen.add(u.id);}assert.equal(seen.size,4,'two more for the Basin');
});
test('an Allied Hero standing alone in a camp ring captures it (the split strategy)',()=>{
 const sim=calm(fresh());money(sim);
 const hc=(()=>{for(let r=8;r<16;r++)for(let c=8;c<16;c++)if(sim.placementReason('tavern',c,r)==='')return {col:c,row:r};})();sim.send({type:'place',requestId:'tv',kind:'tavern',...hc});play(sim,160);money(sim);
 sim.send({type:'tavern',requestId:'h',action:'hire',merc:'roland'});play(sim,4);
 const ally=Object.values(sim.state.units).find(u=>u.ally);assert.ok(ally);
 openCamp(sim,'rim');sim.teleportHero(330,900);ally.x=1176;ally.y=372;
 sim.send({type:'ally',requestId:'o',id:ally.id,order:{type:'defend',x:1176,y:372}});play(sim,160);
 assert.equal(sim.state.posts.find(p=>p.id==='rim').owner,'azure');
});
test('the Warden is not on the Raider\'s road: unopposed, the Raider reaches the Azure Keep and destroys it (about 14 s after release to first damage)',()=>{
 const sim=calm(fresh()),s=sim.state;sim.teleportHero(1500,600);let first=null,dead=null;
 while(sim.clock.tick<200*HZ&&!sim.ended){sim.advance(DT);const t=sim.clock.tick/HZ;if(first===null&&s.bases['blue-base'].hp<3000)first=t;if(dead===null&&s.bases['blue-base'].hp<=0)dead=t;}
 assert.ok(first>95&&first<115,`first damage ${first}`);assert.ok(dead>first&&dead<135,`the Keep falls ${dead}`);
});
test('waves alone threaten the Keep, but not before a built defence can exist (first wave at 30 s, Tavern and Barracks done by 9 s)',()=>{
 const sim=fresh();sim.teleportHero(1500,300);let firstHit=null;
 while(sim.clock.tick<100*HZ&&!sim.ended){sim.advance(DT);if(firstHit===null&&sim.state.bases['blue-base'].hp<3000)firstHit=sim.clock.tick/HZ;}
 assert.ok(firstHit>40,`the first damage to the Keep comes at ${firstHit}`);
});
test('M3 asks for no code change: the Raider-and-Tavern setup passes matchSetup, and the single-post rule of M2 is untouched',()=>{
 assert.doesNotThrow(()=>matchSetup('extended',structuredClone(L.match.overrides)));
 const o=structuredClone(L.match.overrides);o.posts.forEach(p=>delete p.hero);assert.doesNotThrow(()=>matchSetup('extended',o),'the Warden is optional');
 const m2=structuredClone(campaign.get('campaign-42').match.overrides);assert.doesNotThrow(()=>matchSetup('extended',m2));
});
for(const plan of ['concentrate-south','concentrate-north','split','split-keep','no-barracks','none'])
 test(`bot, ${plan}: finishes the mission from the production level with no stall deadlock and no more than 40 live units`,()=>{
  const r=run({plan,startAt:90*HZ});assert.equal(r.outcome,'victory',JSON.stringify({...r,sim:undefined,log:undefined}));
  assert.equal(Object.keys(r.captures).sort().join(),'basin,rim');assert.ok(r.sec<=900);assert.ok(r.stalls<=4,`stalls ${r.stalls}`);assert.ok(r.peakLive<=40,`peak live units ${r.peakLive}`);
  if(plan==='none'||plan==='no-barracks')assert.equal(r.barracks.length,0);else assert.ok(r.barracks.length>=1,'the first Barracks went up');
  if(plan==='none')assert.equal(r.hires.length,0);else assert.ok(r.hires.length>=2,'both heroes were hired');
 });
test('Missions 1 to 4 are the only registered Chapter 5 levels; M3 reuses Canyon Basin\'s roads but leaves Chapter 4 alone',()=>{
 assert.equal(campaign.has('campaign-45'),false);assert.equal(campaign.get('campaign-43').chapter,5);
 const d=battlefield('divided-road'),c=battlefield('canyon-basin');
 assert.deepEqual(d.barriers,c.barriers);assert.deepEqual(d.outposts,c.outposts);assert.notDeepEqual(d.towers.map(t=>t.id),c.towers.map(t=>t.id));assert.deepEqual(d.towers.map(t=>[t.x,t.y]),c.towers.map(t=>[t.x,t.y]));
 assert.equal(campaign.get('campaign-35').match.overrides.battlefield,'canyon-basin');assert.equal(campaign.get('campaign-35').match.overrides.tavern,undefined);
});
