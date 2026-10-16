'use strict';
// Balance v0.2 provisional experiment. These pin the approved experimental values and their scope; they are not canonical specification.
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {balanceV02}=require('../.test-build/data/balanceV02');
const {activeCombatVariant,crimsonTowerRawVsGuardian}=require('../.test-build/data/gameplayV041');
const {buildings}=require('../.test-build/data/buildings');
const {enemyXp}=require('../.test-build/data/progression');
const {artifact}=require('../.test-build/data/artifacts');
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30+.01);};
const own=(s,itemId)=>{s.state.inventory.slots.length;const cmd={type:'buy-item',matchId:s.state.inventory.matchId,heroId:'guardian',requestId:'b-'+itemId,itemId};s.economy.balances={...s.economy.balances,gold:5000*120};s.state.gold=5000;s.hero.x=450;s.hero.y=600;assert.equal(s.send(cmd),true);ticks(s);};
function fixture(){const s=new Simulation('v02','extended',2000);s.state.units={guardian:s.hero};s.hero.x=450;s.hero.y=600;s.skills.refreshStats();return s;}
function target(s,kind,id=kind){const base={...s.hero,id,team:'red',x:s.hero.x+40,y:s.hero.y,hp:100000,maxHp:100000,armor:0,protectionTick:0,strike:undefined,targetId:undefined,shield:undefined,statuses:[]};
 if(kind==='base-red'){const b=s.state.bases['red-base'];b.hp=b.maxHp=100000;b.x=base.x;b.y=base.y;return b;}
 const t={...base,kind};if(kind==='minion-red')s.state.units[id]=t;else s.state.structures[id]=t;return t;}
const strike=(s,t)=>{s.drainEvents();s.basicHit(s.hero,t);return s.drainEvents().find(e=>e.type==='damage');};

test('Balance v0.2 provisional constants',()=>{
 assert.deepEqual({...balanceV02},{heroStructureDamage:0.6,crimsonTowerDamageVsGuardian:24,crimsonTowerXp:30,crimsonMinionGold:25});
});
test('Guardian basic attacks deal 0.6x to valid enemy towers and the Keep, full damage to units',()=>{
 for(const kind of ['tower','base-red']){const s=fixture(),t=target(s,kind);const e=strike(s,t);assert.equal(e.raw,80*0.6);assert.equal(e.amount,48);}
 const s=fixture();assert.equal(strike(s,target(s,'minion-red')).raw,80);
});
test('Siege Hammer keeps its +25% and multiplies the already-reduced structural base',()=>{
 const s=fixture();own(s,'siege-hammer');assert.deepEqual(artifact('siege-hammer').modifiers,[{kind:'attack',amount:20},{kind:'building-damage',fraction:.25}]);
 assert.equal(s.hero.damage,100);assert.equal(strike(s,target(s,'tower')).raw,100*0.6*1.25);const u=fixture();own(u,'siege-hammer');assert.equal(strike(u,target(u,'minion-red','m')).raw,100);
});
test('only Guardian basic attacks use the structural multiplier: allied minions, towers and direct hits are unchanged',()=>{
 const s=fixture(),t=target(s,'tower');const ally={...s.hero,id:'ally',kind:'minion-blue',team:'blue',damage:18,x:t.x-30,y:t.y,hp:500,protectionTick:0};s.state.units.ally=ally;
 s.drainEvents();s.basicHit(ally,t);assert.equal(s.drainEvents().find(e=>e.type==='damage').raw,18);
 s.hit(s.hero,t,80,'direct');assert.equal(s.drainEvents().find(e=>e.type==='damage').raw,80);
});
test('Crimson tower hits: 24 base (26 under active Variant B) against the Guardian, 18 against allied minions; stats and cadence unchanged',()=>{
 assert.equal(buildings.tower.damage,18);assert.equal(balanceV02.crimsonTowerDamageVsGuardian,24);assert.equal(crimsonTowerRawVsGuardian(activeCombatVariant),26);
 const s=new Simulation('v02-towers','extended');const reds=Object.values(s.state.structures);assert.equal(reds.length,8);
 assert.ok(reds.every(t=>t.damage===18&&t.range===240&&t.cooldownTicks===24&&t.maxHp===650));
 const t=s.state.structures['red-tower-front-center'];for(const id of Object.keys(s.state.structures))if(id!==t.id)delete s.state.structures[id];s.hero.x=t.x-120;s.hero.y=t.y;s.hero.armor=0;s.hero.hp=s.hero.maxHp=5000;
 const hit=(target)=>{s.drainEvents();s.basicHit(t,target);return s.drainEvents().find(e=>e.type==='damage');};
 const guardianHit=hit(s.hero);assert.equal(guardianHit.raw,26);assert.equal(guardianHit.amount,26);
 const ally={...s.hero,id:'ally',kind:'minion-blue',team:'blue',x:t.x-100,y:t.y+10,hp:240,maxHp:240,armor:0,protectionTick:0,strike:undefined};s.state.units.ally=ally;
 const allyHit=hit(ally);assert.equal(allyHit.raw,18);assert.equal(allyHit.amount,18);
});
test('player-built towers deal 18 to the Guardian-team enemy and to minions (rule is Crimson-only)',()=>{
 const s=new Simulation('v02-built','extended');s.state.units={guardian:s.hero};
 const red=s.state.structures['red-tower-front-center'];for(const id of Object.keys(s.state.structures))delete s.state.structures[id];const built={...red,id:'built-fixture',team:'blue'};s.state.structures[built.id]=built;
 const foe=(kind)=>({...s.hero,id:'foe-'+kind,kind,team:'red',x:built.x-100,y:built.y,hp:1000,maxHp:1000,armor:0,protectionTick:0,strike:undefined});
 for(const kind of ['guardian','minion-red']){const target=foe(kind);s.state.units[target.id]=target;s.drainEvents();s.basicHit(built,target);assert.equal(s.drainEvents().find(e=>e.type==='damage').raw,18,kind);}
 const real=new Simulation('v02-real','extended');real.state.units={guardian:real.hero};real.state.wood=500;real.state.iron=100;real.economy.balances={...real.economy.balances,wood:500*120,iron:100*120};
 real.send({type:'place',kind:'tower',col:10,row:12,requestId:'p'});ticks(real,200);const placed=Object.values(real.state.structures).find(x=>x.team==='blue'&&x.kind==='tower');assert.ok(placed);assert.equal(placed.damage,18);
});
test('repeated identical runs are bit-for-bit deterministic under v0.2',()=>{
 const run=()=>{const s=new Simulation('v02-det','extended',2000);s.state.spawnedWaves=12;s.teleportHero(1330,600);s.send({type:'attack'});for(let i=0;i<900;i++)s.advance(1000/30+.01);return JSON.stringify([s.state,s.drainEvents().length]);};
 assert.equal(run(),run());
});
test('Crimson tower kills award exactly 30 XP, Crimson minions still 60, existing thresholds unchanged',()=>{
 assert.equal(enemyXp.tower,30);assert.equal(enemyXp['minion-red'],60);assert.equal(7*enemyXp.tower,210);
});
test('each Crimson minion kill awards 25 Gold once; tower and Keep kills award no Gold',()=>{
 const s=fixture(),m=target(s,'minion-red','m1');m.hp=1;const gold=s.state.gold;s.basicHit(s.hero,m);const e=s.drainEvents();
 assert.equal(e.find(x=>x.type==='reward').gold,25);assert.equal(s.state.gold,gold+25);
 const t=target(s,'tower','tw');t.hp=1;s.basicHit(s.hero,t);assert.equal(s.drainEvents().filter(x=>x.type==='reward').length,0);assert.equal(s.state.gold,gold+25);
});
