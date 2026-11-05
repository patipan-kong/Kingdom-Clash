const {test}=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {campaignChapters}=require('../.test-build/data/campaignChapters.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {battlefield}=require('../.test-build/world/battlefield.js');
const {RESOURCE_UNITS}=require('../.test-build/data/resources.js');
const {DT,HZ}=require('./support/campaignBot.cjs');
// Chapter 5 Mission 5 "The Last Stronghold" (docs/CHAPTER5_M5.md): M4's two outposts, Tavern, Barracks, Commanders and Fortress Gate, plus the Ballista ruin in the North Outpost and a War Cart wreck that lies in the South Outpost from tick 0
// (locked until the South Outpost is Azure, repaired once). Every balance value is provisional; the bot results are comparative evidence, not a balance sign-off.
const L=campaign.get('campaign-45'),KEEP='red-base',GATE='red-fortress-gate',WRECK={col:20,row:19,x:984,y:936};
const fresh=(id='l45')=>new Simulation(id,campaign.setup(45));
const play=(sim,ticks,log)=>{const end=sim.clock.tick+ticks;while(sim.clock.tick<end&&!sim.ended){sim.advance(DT);for(const e of sim.drainEvents())log?.push({at:sim.clock.tick,...e});}return log;};
const money=(sim,gold=1e4,wood=1e4,iron=1e4)=>{sim.economy.balances={...sim.economy.balances,gold:gold*RESOURCE_UNITS,wood:wood*RESOURCE_UNITS,iron:iron*RESOURCE_UNITS};};
const calm=sim=>{sim.encounter={...sim.encounter,waves:[],continuous:false};return sim;};
const sturdy=sim=>{sim.state.bases['blue-base'].hp=sim.state.bases['blue-base'].maxHp=1e7;sim.hero.hp=sim.hero.maxHp=1e7;return sim;};
const azure=(sim,id)=>{sim.state.posts.find(q=>q.id===id).owner='azure';};
const clearRed=sim=>{for(const id of Object.keys(sim.state.units))if(/^red-/.test(id)&&!sim.state.units[id].commander&&!sim.state.units[id].escortOf)delete sim.state.units[id];};
const cartOf=sim=>sim.state.units['blue-c-1'];
// the Guardian pays and waits at the wreck until the repair finishes
const repair=(sim,log)=>{sim.teleportHero(WRECK.x,WRECK.y);play(sim,200,log);};

test('Mission 5 is The Last Stronghold: Chapter 5, campaign-45, capture both outposts then destroy the Keep, the fifth Chapter 5 slot',()=>{
 assert.deepEqual([L.number,L.chapter,L.id,L.display.title,L.display.difficulty],[45,5,'campaign-45','The Last Stronghold','standard']);
 assert.ok(L.display.description&&L.display.briefing&&L.display.strategy);assert.ok(Object.isFrozen(L));
 assert.deepEqual(L.mission,{waveMode:'until-objectives',phases:[
  {id:'capture',objectives:[{id:'north',type:'capture',post:'north',display:{label:'Capture the North Outpost'}},{id:'south',type:'capture',post:'south',display:{label:'Capture the South Outpost'}}]},
  {id:'assault',objectives:[{id:'keep',type:'destroy',targets:[KEEP],display:{label:'Destroy the Crimson Keep'}}]}]});
 const ch=campaignChapters.find(c=>c.number===5);assert.equal(ch.slots[4].levelId,'campaign-45');assert.equal(ch.release,'coming-soon');
});
test('the approved values: map, resources, waves, Commanders, Last Stand of 4, Tavern, Barracks and the cart fields',()=>{
 const o=L.match.overrides;
 assert.equal(o.battlefield,'last-stronghold');assert.deepEqual(o.start,{gold:100,wood:180,iron:25,guardian:{x:600,y:600}});
 assert.deepEqual(o.waves.enemyPerWave,[7,7,8,8,9,9,10,10]);assert.equal(o.waves.firstWaveTick,30*HZ);assert.equal(o.waves.waveInterval,30*HZ);
 assert.equal(o.hero,undefined);assert.equal(o.posts.length,2);assert.deepEqual(o.gates,[{id:GATE,hp:2500,faction:true,assist:true}]);
 assert.deepEqual(o.garrison.counts,[4]);assert.equal(o.garrison.after,GATE);
 const [m,sb]=o.commanders;assert.deepEqual([m.id,m.firstTick,m.warningTicks,m.restTicks],['red-marshal',210*HZ,6*HZ,60*HZ]);assert.deepEqual([sb.id,sb.firstTick,sb.warningTicks,sb.restTicks],['red-shadowblade',300*HZ,6*HZ,40*HZ]);
 assert.deepEqual(o.tavern,{cap:2,roster:['roland','borin','kael']});assert.equal(o.azure.limit,2);assert.equal(o.azure.initial.length,0);
 assert.deepEqual(o.cart,{start:[1776,600],startTick:1,sites:[{col:20,row:19}],ring:96,repair:{wood:160,iron:40,ticks:150},order:[GATE],follow:300,wreckAtStart:true,post:'south'});
 assert.deepEqual(o.posts[0].ballista,{col:24,row:5});assert.equal(o.posts[1].ballista,undefined);
});
test('the battlefield is Crimson Fortress plus two forward towers on the sally ground, nothing else changed',()=>{
 const f=battlefield('last-stronghold'),c=battlefield('crimson-fortress');
 assert.deepEqual([f.barriers,f.gates,f.outposts,f.flankVia,f.territory],[c.barriers,c.gates,c.outposts,c.flankVia,c.territory]);
 assert.deepEqual(f.towers.map(t=>[t.id,t.x,t.y]),[...c.towers.map(t=>[t.id.replace('c6-','c5-'),t.x,t.y]),['c5-sally-north',1320,504],['c5-sally-south',1320,696]]);
 assert.equal(Object.keys(fresh().state.structures).filter(id=>id.startsWith('c5-')).length,8);
});

test('1. the wreck is there from tick 0 on the authored site, no Crimson cart ever spawns, and the Keep is still shielded',()=>{
 const sim=fresh(),log=[];assert.deepEqual(sim.state.cartWreck,WRECK);assert.equal(sim.cartLocked,true);
 play(sim,120*HZ,log);assert.equal(Object.keys(sim.state.units).some(id=>id==='red-cart'),false);assert.equal(log.some(e=>e.type==='spawn'&&e.id==='red-cart'),false);
 assert.deepEqual(sim.state.cartWreck,{...WRECK});assert.equal(sim.state.bases[KEEP].invulnerable,true);
});
test('2. repair is blocked before the South Outpost is Azure: nothing is paid and no job starts, even beside the wreck with every price met',()=>{
 const sim=sturdy(calm(fresh()));money(sim);const before=[sim.state.wood,sim.state.iron];const income=()=>[sim.state.wood>=before[0],sim.state.iron>=before[1]];
 azure(sim,'north'); // the North Outpost does not unlock it
 repair(sim);
 assert.equal(sim.cartLocked,true);assert.equal(sim.state.cartWreck.repair,undefined);assert.equal(cartOf(sim),undefined);assert.deepEqual(income(),[true,true],'only income, nothing paid');
});
test('3. repair opens when the South Outpost is Azure: 160 Wood and 40 Iron, 150 ticks, one Azure cart appears at the wreck',()=>{
 const sim=sturdy(calm(fresh())),log=[];azure(sim,'south');assert.equal(sim.cartLocked,false);
 money(sim,0,160,40);sim.teleportHero(WRECK.x,WRECK.y);play(sim,5,log);
 assert.ok(sim.state.cartWreck.repair,'paid and repairing');assert.ok(sim.state.wood<1&&sim.state.iron<1,'160 Wood and 40 Iron were taken');
 play(sim,160,log);const c=cartOf(sim);assert.ok(c&&c.hp>0,'the cart stands');assert.equal(c.team,'blue');assert.equal(c.cart.follow,300);assert.deepEqual(c.cart.order,[GATE]);
 assert.ok(Math.hypot(c.x-WRECK.x,c.y-WRECK.y)<=96);assert.equal(sim.state.cartWreck,undefined);
 assert.ok(log.some(e=>e.type==='site'&&e.id==='cart'&&e.change==='repairing')&&log.some(e=>e.type==='site'&&e.id==='cart'&&e.change==='repaired'));
});
test('3b. short of Iron the Guardian waits at the wreck: nothing is paid until both prices are met',()=>{
 const sim=sturdy(calm(fresh())),log=[];azure(sim,'south');money(sim,0,200,39);sim.teleportHero(WRECK.x,WRECK.y);play(sim,100,log);
 assert.equal(sim.state.cartWreck.repair,undefined);assert.ok(log.some(e=>e.type==='site'&&e.id==='cart'&&e.change==='short'),'tells the player');
 money(sim,0,200,40);play(sim,5,log);assert.ok(sim.state.cartWreck.repair);
});
test('4. the cart can be repaired once: when the Azure cart dies there is no new wreck and nothing can be paid again',()=>{
 const sim=sturdy(calm(fresh())),log=[];azure(sim,'south');money(sim);repair(sim,log);const c=cartOf(sim);assert.ok(c);
 const after=sim.state.wood;c.hp=1;c.x=1290;c.y=696;sim.teleportHero(c.x,c.y);play(sim,90,log); // beside the forward south tower: it dies in combat
 assert.ok(log.some(e=>e.type==='death'&&e.id==='blue-c-1'),'it fell in combat');assert.equal(cartOf(sim),undefined);assert.equal(sim.state.cartWreck,undefined,'a dead Azure cart leaves nothing');
 sim.teleportHero(WRECK.x,WRECK.y);play(sim,200,log);assert.equal(cartOf(sim),undefined);assert.ok(sim.state.wood>=after,'no second payment');
 assert.equal(log.filter(e=>e.type==='site'&&e.id==='cart'&&e.change==='repaired').length,1);
});
test('5. the repaired cart is Azure-owned, a structures-only attacker, and walks only while the Guardian is within 300 px',()=>{
 const sim=sturdy(calm(fresh()));azure(sim,'south');money(sim);repair(sim);clearRed(sim);const c=cartOf(sim);assert.equal(c.team,'blue');assert.ok(c.cart);
 const x0=c.x;sim.teleportHero(c.x-700,c.y);play(sim,90);assert.equal(Math.round(cartOf(sim).x),Math.round(x0),'left alone it waits');
 sim.teleportHero(cartOf(sim).x,cartOf(sim).y);play(sim,90);assert.ok(Math.hypot(cartOf(sim).x-x0,cartOf(sim).y-WRECK.y)>20,'it walks once the Guardian is back');
});
test('6. the cart reaches the Fortress Gate and attacks it',()=>{
 const sim=sturdy(calm(fresh())),log=[];azure(sim,'south');money(sim);repair(sim);clearRed(sim);
 for(const id of ['c5-sally-north','c5-sally-south','c5-gate-north','c5-gate-south'])sim.state.structures[id].hp=0;
 const gate=sim.state.structures[GATE];let first=null;
 for(let i=0;i<150*HZ&&!sim.ended&&gate.hp>0;i++){const c=cartOf(sim);if(!c)break;sim.teleportHero(c.x-60,c.y);play(sim,1,log);clearRed(sim);if(first===null&&gate.hp<gate.maxHp)first=Math.round(sim.clock.tick/HZ);}
 const dmg=log.filter(e=>e.type==='damage'&&e.id===GATE&&String(e.sourceId).startsWith('blue-c')).reduce((a,e)=>a+e.amount,0);
 assert.ok(dmg>0,'the cart hits the gate');assert.ok(gate.hp<=0,'and breaks it');
});

test('7. the Ballista: locked until the North Outpost is Azure, then repaired at its cell for the camp price, and it reaches the gate and a forward tower',()=>{
 const sim=sturdy(calm(fresh())),log=[];money(sim);
 assert.notEqual(sim.placementReason('ballista',24,5),'');assert.equal(sim.placementReason('ballista',23,5),'Not a Ballista ruin');
 azure(sim,'north');for(const id of ['c5-north-a','c5-north-b'])sim.state.structures[id].hp=0;assert.equal(sim.placementReason('ballista',24,5),'');const quote=sim.repairPrice('ballista');
 sim.send({type:'place',requestId:'bal',kind:'ballista',col:24,row:5});play(sim,200,log);
 const b=Object.values(sim.state.structures).find(x=>x.ballista);assert.ok(b&&b.hp>0,'the Ballista stands');assert.equal([b.col,b.row].join(),'24,5');
 assert.ok(quote.wood<140&&quote.iron<30,'a repair, not a new build');
 const t0=sim.state.structures['c5-sally-north'].hp;play(sim,20*HZ,log);
 const hits=new Set(log.filter(e=>e.type==='damage'&&e.sourceId===b.id).map(e=>e.id));
 assert.ok(hits.has('c5-sally-north'),'the forward north tower is in reach: '+[...hits]);assert.ok(sim.state.structures['c5-sally-north'].hp<t0);
 play(sim,120*HZ,log);assert.ok(new Set(log.filter(e=>e.type==='damage'&&e.sourceId===b.id).map(e=>e.id)).has(GATE),'and the gate');
});

test('war-cart options: wreckAtStart needs a site, post must be a post id and needs wreckAtStart; Chapter 4 campaign-34 is unchanged',()=>{
 const base=campaign.get('campaign-45').match.overrides;
 const make=cart=>matchSetup('extended',{...base,cart});
 assert.doesNotThrow(()=>make({...base.cart}));
 assert.throws(()=>make({...base.cart,post:'nowhere'}),/Invalid War Cart/);
 assert.throws(()=>make({...base.cart,wreckAtStart:undefined,post:'south'}),/Invalid War Cart/);
 assert.throws(()=>make({...base.cart,wreckAtStart:false}),/Invalid War Cart/);
 const c34=new Simulation('c34',campaign.setup(34));assert.equal(c34.state.cartWreck,undefined);assert.equal(c34.cartLocked,false);
 assert.equal(campaign.setup(34).cart.wreckAtStart,undefined);assert.equal(campaign.setup(34).cart.post,undefined);
 const log=[];play(c34,901,log);assert.ok(log.some(e=>e.type==='spawn'&&e.id==='red-cart')||c34.state.units['red-cart'],'Chapter 4 still spawns its Crimson cart at 900');
});
test('matchSetup is unchanged for the other Chapter 5 missions and the registry now ends at campaign-46',()=>{
 for(const n of [36,41,42,43,44])assert.equal(campaign.setup(n).cart,undefined);
 assert.equal(campaign.has('campaign-47'),false);assert.equal(campaign.get('campaign-45').chapter,5);
});

// Bot evidence (tests/support/strongholdBot.cjs): comparative only, the human Galaxy S24 playtest decides balance.
const {run}=require('./support/strongholdBot.cjs');
test('bot: North-first and South-first both take both outposts and win; neither is dominant',()=>{
 for(const plan of ['north-first','south-first']){
  const r=run({plan,startAt:90*HZ,cap:700});
  assert.equal(r.outcome,'victory',plan);assert.ok(r.captures.north&&r.captures.south,plan+' captured both');assert.ok(r.sec>=240&&r.sec<=640,plan+' time '+r.sec);
  assert.ok(r.peakLive<=40,'peak '+r.peakLive);assert.ok(r.stalls<=10&&r.stallTicks<=90*HZ,'stalls');
 }
});
test('bot: the Guardian alone loses and a direct rush on the gate cannot win (the Keep stays shielded) and costs far more',()=>{
 const none=run({plan:'none',startAt:90*HZ,cap:600}),rush=run({plan:'rush',startAt:90*HZ,cap:420}),prepared=run({plan:'no-siege',startAt:90*HZ,cap:700});
 assert.notEqual(none.outcome,'victory');assert.notEqual(rush.outcome,'victory');assert.equal(prepared.outcome,'victory');
 assert.ok(rush.heroFalls>prepared.heroFalls,'the rush loses more heroes: '+rush.heroFalls+' vs '+prepared.heroFalls);assert.ok(rush.gDeaths>=prepared.gDeaths);
});
test('bot: iron decides the order of the siege assets: a saving South-first plan repairs the cart early, a normal one cannot afford it',()=>{
 const saving=run({plan:'south-first',startAt:90*HZ,cap:300,save:true}),normal=run({plan:'south-first',startAt:90*HZ,cap:300});
 assert.ok(saving.cartLog.repairedAt!==null&&saving.cartLog.repairedAt<240,'saving repairs by 4 minutes: '+saving.cartLog.repairedAt);
 assert.ok(normal.cartLog.repairedAt===null||normal.cartLog.repairedAt>saving.cartLog.repairedAt,'normal spending is later: '+normal.cartLog.repairedAt);
});
