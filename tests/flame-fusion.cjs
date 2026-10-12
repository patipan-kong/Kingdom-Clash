'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation');
const {goldUnits,plannedItem}=require('../.test-build/simulation/Inventory');
const {equipmentCritBasisPoints}=require('../.test-build/simulation/CriticalHits');
const {artifact,artifactAvailability}=require('../.test-build/data/artifacts');
const {minionStats}=require('../.test-build/data/combat');
const {ShopModel}=require('../.test-build/ui/shopModel');
function fixture(){const s=new Simulation('flame-test','extended',2000);s.state.units={guardian:s.hero};s.hero.x=450;s.hero.y=600;s.skills.refreshStats();for(let i=0;i<200;i++)s.economy.apply({type:'minion-reward',id:'fixture-'+i});return s;}
const ids=s=>s.state.inventory.slots.filter(Boolean);
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30);};
const cmd=(s,type,requestId,extra)=>({type,requestId,matchId:s.state.inventory.matchId,heroId:'guardian',...extra});
function trade(s,type,requestId,extra){assert.equal(s.send(cmd(s,type,requestId,extra)),true);ticks(s);return s.drainEvents();}
const buy=(s,itemId,requestId=itemId)=>{trade(s,'buy-item',requestId,{itemId});return ids(s).at(-1);};
const fuse=(s,componentIds=[],requestId='fusion')=>trade(s,'fuse-item',requestId,{itemId:'flame-blade',componentIds});
function target(s,hp=10000){const t={...minionStats,id:'victim',kind:'minion-red',team:'red',x:s.hero.x+40,y:s.hero.y,hp,maxHp:10000,armor:0,speed:0,protectionTick:0,readyTick:99999};s.state.units[t.id]=t;return t;}
function reject(s,c,pattern){const before=structuredClone(s.state),gold=s.economy.goldUnits;assert.equal(s.trades.execute(c),false);assert.deepEqual(s.state,before);assert.equal(s.economy.goldUnits,gold);assert.match(s.drainEvents().find(e=>e.type==='rejected').reason,pattern);}

for(const selected of [[],['iron-sword'],['ruby-gem'],['iron-sword','ruby-gem']])test(`live Fusion pricing for ${selected.join('+')||'no components'}`,()=>{
 const s=fixture(),components=selected.map(id=>buy(s,id)),gold=s.state.gold,q=s.shopPurchaseQuote('flame-blade',components);assert.equal(q.available,true);
 const expected=650-selected.reduce((n,id)=>n+artifact(id).priceGold,0);assert.equal(q.quote.goldDue,expected);assert.ok(Object.isFrozen(q.quote));
 const e=fuse(s,components),id=ids(s)[0];assert.equal(s.state.gold,gold-expected);assert.equal(ids(s).length,1);assert.equal(s.state.inventory.instances[id].paidGoldUnits,goldUnits(650));assert.equal(s.hero.damage,115);assert.equal(e.find(e=>e.type==='item-traded').action,'fusion');
 trade(s,'sell-item','sale',{instanceId:id});assert.equal(s.state.gold,gold-expected+390);assert.equal(s.hero.damage,80);
});
test('exact duplicate selection consumes only requested instances and never double-counts modifiers',()=>{
 const s=fixture(),a=buy(s,'iron-sword','a'),b=buy(s,'iron-sword','b'),g=buy(s,'ruby-gem','g');fuse(s,[b,g]);assert.ok(s.state.inventory.instances[a]);assert.equal(s.state.inventory.instances[b],undefined);assert.equal(s.state.inventory.instances[g],undefined);assert.equal(s.hero.damage,130);assert.equal(equipmentCritBasisPoints(s.state.inventory),1000);assert.equal(s.state.inventory.slots[1],'flame-test:guardian:item:4');
});
test('full-slot Fusion counts post-consumption capacity; no-component full purchase rejects',()=>{
 for(const count of [0,1,2]){const s=fixture(),a=buy(s,'iron-sword','a'),g=buy(s,'ruby-gem','g');for(let i=0;i<4;i++)buy(s,'iron-sword','filler-'+i);const components=[a,g].slice(0,count);
  if(!count)reject(s,cmd(s,'fuse-item','full',{itemId:'flame-blade',componentIds:components}),/full/);else{fuse(s,components);assert.equal(ids(s).length,7-count);}
 }
});
test('wrong, repeated, absent, stale and corrupt component selections reject atomically',()=>{
 const s=fixture(),a=buy(s,'iron-sword'),b=buy(s,'iron-sword','b'),shield=buy(s,'guardian-shield');
 for(const [i,selection] of [[a,a],[a,b],[shield],['old:item'],['missing']].entries())reject(s,cmd(s,'fuse-item','invalid-'+i,{itemId:'flame-blade',componentIds:selection}),/component|consumed/);
 for(const paid of [0,1]){const old=s.state.inventory.instances[a];s.state.inventory.instances[a]={...old,paidGoldUnits:paid};reject(s,cmd(s,'fuse-item','basis-'+paid,{itemId:'flame-blade',componentIds:[a]}),/paid basis/);s.state.inventory.instances[a]=old;}
 trade(s,'sell-item','sell-component',{instanceId:a});reject(s,cmd(s,'fuse-item','stale-selection',{itemId:'flame-blade',componentIds:[a]}),/consumed/);
});
test('ownership, session, supported recipe, current funds and range/LOS revalidate before commit',()=>{
 const s=fixture(),extra={itemId:'flame-blade',componentIds:[]};reject(s,{...cmd(s,'fuse-item','owner',extra),heroId:'other'},/owner/);reject(s,{...cmd(s,'fuse-item','session',extra),matchId:'old'},/Stale/);
 reject(s,cmd(s,'fuse-item','recipe',{...extra,itemId:'iron-sword'}),/Recipe/);reject(s,cmd(s,'fuse-item','unavailable',{...extra,itemId:'arcane-core'}),/unavailable/);
 s.hero.x=1500;reject(s,cmd(s,'fuse-item','range',extra),/Return/);s.hero.x=450;
 s.state.structures.block={...s.hero,id:'block',kind:'wall',team:'blue',x:432,y:600,col:9,row:12,progress:1,startTick:0,completeTick:0,constructionDamage:0,radius:24};reject(s,cmd(s,'fuse-item','los',extra),/blocked/);delete s.state.structures.block;
 const poor=new Simulation('poor','extended');poor.hero.x=450;poor.hero.y=600;reject(poor,cmd(poor,'fuse-item','poor',extra),/Gold/);
});
test('Fusion replay, competing purchases and queued array mutation cannot change accepted intent',()=>{
 const s=fixture(),a=buy(s,'iron-sword'),c=cmd(s,'fuse-item','same',{itemId:'flame-blade',componentIds:[a]});s.send(c);c.componentIds.length=0;ticks(s);s.drainEvents();assert.equal(ids(s).length,1);assert.equal(s.state.gold,2600);
 reject(s,c,/Duplicate/);reject(s,cmd(s,'sell-item','same',{instanceId:ids(s)[0]}),/Duplicate/);
 const poor=new Simulation('compete','extended');poor.hero.x=450;poor.hero.y=600;for(let i=0;i<27;i++)poor.economy.apply({type:'minion-reward',id:'fund-'+i});for(const id of ['first','second'])poor.send(cmd(poor,'fuse-item',id,{itemId:'flame-blade',componentIds:[]}));ticks(poor);const e=poor.drainEvents();assert.deepEqual(e.filter(e=>e.type==='item-traded').map(e=>e.requestId),['first']);assert.equal(poor.state.gold,5);assert.equal(poor.state.inventory.nextSequence,2);
});
test('actual discounted paid basis carries through Fusion and refund without profit',()=>{
 const s=fixture(),item=plannedItem(s.state.inventory,'iron-sword',goldUnits(100));s.state.inventory.slots[0]=item.id;s.state.inventory.instances[item.id]=item;s.state.inventory.nextSequence++;s.skills.refreshStats();const before=s.state.gold;fuse(s,[item.id]);const blade=s.state.inventory.instances[ids(s)[0]];assert.equal(blade.paidGoldUnits,goldUnits(550));trade(s,'sell-item','sell',{instanceId:blade.id});assert.equal(s.state.gold,before-450+330);
});
test('Fusion ignores client costs, preserves injured HP fraction and refreshes once per acceptance',()=>{
 const s=fixture(),a=buy(s,'iron-sword'),g=buy(s,'ruby-gem');buy(s,'guardian-shield');s.hero.hp=333.33;const hp=s.hero.hp,maxHp=s.hero.maxHp,gold=s.state.gold;
 let count=0;const refresh=s.skills.refreshStats.bind(s.skills);s.skills.refreshStats=()=>{count++;refresh();};
 assert.equal(s.trades.execute({...cmd(s,'fuse-item','untrusted',{itemId:'flame-blade',componentIds:[a,g]}),price:1,refund:999999}),true);assert.equal(count,1);assert.equal(s.state.gold,gold-300);assert.equal(s.hero.hp,hp);assert.equal(s.hero.maxHp,maxHp);
 const id=ids(s).find(id=>s.state.inventory.instances[id].itemId==='flame-blade');assert.equal(s.trades.execute(cmd(s,'sell-item','sale',{instanceId:id})),true);assert.equal(count,2);assert.equal(s.hero.hp,hp);assert.equal(s.state.gold,gold-300+390);
});
test('competing Fusion selections use current ownership and cannot consume the same components twice',()=>{
 const s=fixture(),a=buy(s,'iron-sword'),g=buy(s,'ruby-gem'),gold=s.state.gold,sequence=s.state.inventory.nextSequence;
 for(const requestId of ['first','second'])s.send(cmd(s,'fuse-item',requestId,{itemId:'flame-blade',componentIds:[a,g]}));ticks(s);
 const events=s.drainEvents();assert.equal(events.filter(e=>e.type==='item-traded').length,1);assert.equal(events.find(e=>e.type==='rejected').requestId,'second');assert.equal(s.state.gold,gold-300);assert.equal(s.state.inventory.nextSequence,sequence+1);assert.equal(ids(s).length,1);
});
test('Flame crit and positive basic HP loss apply one Burn; selling removes future effects only',()=>{
 const s=fixture();buy(s,'flame-blade');const t=target(s);s.basicHit(s.hero,t);const e=s.drainEvents().find(e=>e.type==='damage');assert.equal(e.critical,true);assert.equal(e.raw,230);assert.equal(s.state.criticalRandom.rolls,1);assert.equal(s.state.burns[t.id].damage,5);const due=s.state.burns[t.id].nextTick;
 trade(s,'sell-item','sell',{instanceId:ids(s)[0]});assert.equal(s.hero.damage,80);assert.equal(equipmentCritBasisPoints(s.state.inventory),0);s.basicHit(s.hero,t);s.drainEvents();assert.equal(s.state.burns[t.id].nextTick,due);ticks(s,due-s.clock.tick);const magic=s.drainEvents().filter(e=>e.type==='damage'&&e.damageType==='magic');assert.equal(magic.length,1);assert.equal(magic[0].raw,5);assert.equal(magic[0].critical,undefined);assert.equal(s.state.criticalRandom.rolls,1);
});
test('Burn eligibility excludes absorbed, lethal, structure and skill/direct contacts',()=>{
 for(const mode of ['absorbed','lethal','structure','direct']){const s=fixture();buy(s,'flame-blade');const t=mode==='structure'?s.state.bases['red-base']:target(s,mode==='lethal'?1:10000);
  if(mode==='structure'){s.hero.x=t.x-110;s.hero.y=t.y;}if(mode==='absorbed')t.shield={remaining:1000,expiresTick:9999,zoneId:'fixture'};
  if(mode==='direct')s.hit(s.hero,t,10,'direct');else s.basicHit(s.hero,t);assert.deepEqual(s.state.burns,{});
 }
});
test('duplicate Blades add ATK/Crit but refresh one Burn without starvation',()=>{
 const s=fixture();buy(s,'flame-blade','one');buy(s,'flame-blade','two');assert.equal(s.hero.damage,150);assert.equal(equipmentCritBasisPoints(s.state.inventory),2000);const t=target(s);s.basicHit(s.hero,t);const due=s.state.burns[t.id].nextTick;ticks(s,10);s.basicHit(s.hero,t);assert.equal(Object.keys(s.state.burns).length,1);assert.equal(s.state.burns[t.id].nextTick,due);assert.equal(s.state.burns[t.id].expiresTick,s.clock.tick+90);
});
test('live landed Burn survives source death and credits one kill with original XP/Gold',()=>{
 const s=fixture();buy(s,'flame-blade');const t=target(s,235);s.basicHit(s.hero,t);assert.equal(t.hp,5);s.hit({...s.hero,id:'enemy',team:'red'},s.hero,99999,'direct');s.drainEvents();const gold=s.state.gold;ticks(s,30);let e=s.drainEvents();assert.equal(e.filter(e=>e.type==='death'&&e.id===t.id).length,1);assert.equal(e.find(e=>e.type==='xp').amount,60);assert.equal(s.state.gold,gold+15);assert.equal(s.hero.hp,0);ticks(s,90);e=s.drainEvents();assert.equal(e.filter(e=>e.type==='reward'&&e.id===t.id).length,0);
});
test('dead Fusion retains items/basis through respawn and zero HP, with one stat refresh',()=>{
 const s=fixture();s.hit({...s.hero,id:'enemy',team:'red'},s.hero,99999,'direct');s.hero.x=1500;s.drainEvents();let count=0;const refresh=s.skills.refreshStats.bind(s.skills);s.skills.refreshStats=()=>{count++;refresh();};assert.equal(s.trades.execute(cmd(s,'fuse-item','dead',{itemId:'flame-blade',componentIds:[]})),true);assert.equal(count,1);assert.equal(s.hero.hp,0);const inv=structuredClone(s.state.inventory);ticks(s,s.hero.respawnTick-s.clock.tick);assert.deepEqual(s.state.inventory,inv);assert.equal(s.hero.damage,115);assert.equal(s.hero.hp,s.hero.maxHp);
});
test('Pause, zero speed, shutdown, Restart and results cancel pending Fusion',()=>{
 for(const cancel of [s=>s.setPaused(true),s=>s.setTimeScale(0),s=>s.clearInput(),s=>s.beginRestart()]){const s=fixture(),gold=s.state.gold;s.send(cmd(s,'fuse-item','pending',{itemId:'flame-blade',componentIds:[]}));cancel(s);ticks(s);assert.equal(s.state.gold,gold);assert.deepEqual(ids(s),[]);}
 for(const base of ['blue-base','red-base']){const s=fixture();s.state.bases[base].hp=0;ticks(s);assert.equal(s.send(cmd(s,'fuse-item','ended',{itemId:'flame-blade',componentIds:[]})),false);assert.deepEqual(s.state.burns,{});}
 const old=fixture();buy(old,'flame-blade');old.beginRestart();const fresh=new Simulation('fresh','extended');assert.deepEqual(ids(fresh),[]);assert.deepEqual(fresh.state.burns,{});assert.equal(fresh.state.criticalRandom.rolls,0);reject(fresh,cmd(old,'fuse-item','stale',{itemId:'flame-blade',componentIds:[]}),/Stale/);
});
test('Flame trading, Crit and Burn replay identically at 30/60 FPS',()=>{
 function run(fps){const s=fixture();fuse(s);const t=target(s);s.send({type:'attack'});for(let i=0;i<fps*4;i++)s.advance(1000/fps);return{state:s.state,events:s.drainEvents()};}assert.deepEqual(run(30),run(60));
});
test('Shop exact component selection snapshots requests, correlates Fusion and resets lifecycle',()=>{
 const m=new ShopModel();m.componentKind='iron-sword';m.chooseComponent('sword-second');m.componentKind='ruby-gem';m.chooseComponent('gem-first');const c=m.request('match','fusion','flame-blade','Flame Blade');assert.deepEqual(c.componentIds,['sword-second','gem-first']);assert.equal(m.request('match','fusion','flame-blade','Flame Blade'),undefined);m.components={};assert.equal(c.componentIds.length,2);
 assert.equal(m.observe({type:'item-traded',action:'fusion',requestId:'wrong',instanceId:'blade',goldDelta:-300}),false);assert.equal(m.message,'Waiting for transaction…');assert.equal(m.observe({type:'item-traded',action:'fusion',requestId:c.requestId,instanceId:'blade',goldDelta:-300}),true);assert.equal(m.message,'Flame Blade combined.');assert.deepEqual(m.componentIds,[]);m.reset();assert.equal(m.view,'shop');assert.deepEqual(m.components,{});
});
