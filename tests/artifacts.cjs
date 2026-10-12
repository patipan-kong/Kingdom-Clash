'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {artifacts,artifact,artifactAvailability,validateArtifactCatalog}=require('../.test-build/data/artifacts');
const {initialInventory,validateInventory,equipmentStats,plannedItem,itemInstanceId,goldUnits}=require('../.test-build/simulation/Inventory');
const {quoteArtifact}=require('../.test-build/simulation/ArtifactQuotes');
const {Economy,RESOURCE_UNITS}=require('../.test-build/simulation/Economy');
const {Simulation}=require('../.test-build/simulation/Simulation');
// Test-only ownership injection: no live purchase/equip command exists in Phase 3A.
function own(inv,itemId,paidGold=artifact(itemId).priceGold){const item=plannedItem(inv,itemId,goldUnits(paidGold));const slot=inv.slots.indexOf(null);assert.notEqual(slot,-1);inv.instances[item.id]=item;inv.slots[slot]=item.id;inv.nextSequence++;return item.id;}
const ticks=(s,n)=>{for(let i=0;i<n;i++)s.advance(1000/30);};
test('original eight names, prices, modifiers and Flame Blade recipe are retained',()=>{
 assert.doesNotThrow(()=>validateArtifactCatalog());
 assert.deepEqual(artifacts.map(i=>[i.name,i.priceGold]),[['Iron Sword',200],['Ruby Gem',150],['Flame Blade',650],['Guardian Shield',500],['Arcane Core',550],["Builder's Crown",450],['Commander Banner',600],['Siege Hammer',550]]);
 assert.deepEqual(artifact('flame-blade').recipe,{components:[{itemId:'iron-sword',count:1},{itemId:'ruby-gem',count:1}],feeGold:300});
 assert.deepEqual(artifacts.map(i=>i.modifiers),[
  [{kind:'attack',amount:15}],[{kind:'crit',fraction:.1}],
  [{kind:'attack',amount:35},{kind:'crit',fraction:.1},{kind:'burn',damagePerSecond:5,durationSeconds:3,refresh:true}],
  [{kind:'hp',amount:250},{kind:'armor',amount:15}],
  [{kind:'magic-power',amount:30},{kind:'cdr',fraction:.1}],
  [{kind:'construction-discount',fraction:.08}],[{kind:'troop-attack-aura',fraction:.15}],
  [{kind:'attack',amount:20},{kind:'building-damage',fraction:.25}]]);
 assert.equal(artifact('builders-crown').uniquePassive,'builders-crown');
 assert.throws(()=>{artifact('iron-sword').modifiers[0].amount=200;},TypeError);
});
test('Sword/Shield/Ruby/Flame effects and model trading are ready; unfinished effects remain unavailable',()=>{
 assert.deepEqual(artifacts.filter(i=>artifactAvailability(i).effectsReady).map(i=>i.id),['iron-sword','ruby-gem','flame-blade','guardian-shield']);
 for(const item of artifacts)assert.equal(artifactAvailability(item).tradingEnabled,['iron-sword','guardian-shield','ruby-gem','flame-blade'].includes(item.id));
 assert.deepEqual(artifactAvailability(artifact('flame-blade')).unsupportedEffects,[]);
});
test('catalog rejects malformed IDs, prices, modifiers and recipes before play',()=>{
 for(const edit of [c=>c.push(c[0]),c=>c[0].id='',c=>c[0].id=42,c=>c[0].priceGold=-1,c=>c[0].priceGold=1.5,c=>c[0].priceGold=Infinity,c=>c[0].priceGold=Number.MAX_SAFE_INTEGER,c=>c[0].modifiers[0].amount=NaN,c=>c[0].modifiers[0].amount=-1,c=>c[0].modifiers[0].kind='unknown',c=>c[1].modifiers[0].fraction=1.1,c=>c[2].modifiers[2].durationSeconds=0,c=>c[2].recipe.components[0].itemId='missing',c=>c[2].recipe.components[0].count=0,c=>c[2].recipe.components.push(c[2].recipe.components[0]),c=>c[2].recipe.feeGold=301]){
  const c=structuredClone(artifacts);edit(c);assert.throws(()=>validateArtifactCatalog(c));
 }
 assert.throws(()=>artifact('toString'),/Unknown/);
});
test('self and indirect recipe cycles are detected independently of price totals',()=>{
 for(const indirect of [false,true]){const c=structuredClone(artifacts);c[0].recipe={feeGold:1,components:[{itemId:indirect?'ruby-gem':'iron-sword',count:1}]};if(indirect)c[1].recipe={feeGold:1,components:[{itemId:'iron-sword',count:1}]};assert.throws(()=>validateArtifactCatalog(c),/Cyclic/);}
});
test('six automatically equipped slots have stable match/hero ownership and deterministic IDs',()=>{
 const a=initialInventory('match:a','guardian'),b=initialInventory('match:a','guardian');
 for(let i=0;i<6;i++)assert.equal(own(a,'iron-sword'),own(b,'iron-sword'));
 assert.deepEqual(a,b);assert.equal(a.nextSequence,7);assert.doesNotThrow(()=>validateInventory(a));
 assert.notEqual(itemInstanceId('a:b','c',1),itemInstanceId('a','b:c',1));
 assert.notEqual(itemInstanceId('a','guardian',1),itemInstanceId('b','guardian',1));
 assert.notEqual(itemInstanceId('a','guardian',1),itemInstanceId('a','other',1));
 assert.throws(()=>itemInstanceId('a','guardian',NaN));assert.throws(()=>initialInventory(''));
});
test('inventory validation rejects extra slots, orphan items, duplicates, wrong ownership and sequence',()=>{
 const valid=initialInventory('fixture'),id=own(valid,'iron-sword');
 for(const edit of [i=>i.slots.push(null),i=>i.slots[1]=id,i=>i.slots[0]='missing',i=>i.slots[0]=null,i=>i.instances[id]={...i.instances[id],ownerHeroId:'other'},i=>i.instances[id]={...i.instances[id],matchId:'other'},i=>i.instances[id]={...i.instances[id],itemId:'missing'},i=>i.instances[id]={...i.instances[id],paidGoldUnits:-1},i=>i.nextSequence=1]){const inv=structuredClone(valid);edit(inv);assert.throws(()=>validateInventory(inv));}
});
test('pure aggregation adds duplicate flat modifiers and never applies unsupported effects',()=>{
 const inv=initialInventory('fixture');assert.deepEqual(equipmentStats(inv),{hp:0,attack:0,armor:0});
 own(inv,'iron-sword');own(inv,'iron-sword');own(inv,'guardian-shield');own(inv,'guardian-shield');own(inv,'arcane-core');own(inv,'ruby-gem');
 const before=structuredClone(inv);assert.deepEqual(equipmentStats(inv),{hp:500,attack:30,armor:30});assert.deepEqual(inv,before);
 const mixed=initialInventory('mixed');for(const id of ['flame-blade','siege-hammer','builders-crown','commander-banner'])own(mixed,id);
 assert.deepEqual(equipmentStats(mixed),{hp:0,attack:55,armor:0}); // Only supported flat stats are composed here; other effects use their own resolved-hit paths.
});
test('empty inventory exactly preserves previous Guardian formulas for every level and legal Fortitude rank',()=>{
 const s=new Simulation();s.hero.x=s.state.bases['blue-base'].x+500;s.hero.y=s.state.bases['blue-base'].y;
 for(let level=1;level<=20;level++)for(let fortitude=0;fortitude<=(level>=20?2:level>=18?1:0);fortitude++){
  s.state.heroProgression.level=level;s.state.heroProgression.fortitude=fortitude;
  const oldMax=s.hero.maxHp,oldHp=s.hero.hp,max=(1200+60*(level-1))*(1+.05*fortitude);
  const hp=oldMax===max?oldHp:Math.floor((oldHp/oldMax*max+1e-8)*100)/100;
  s.skills.refreshStats();assert.deepEqual([s.hero.maxHp,s.hero.hp,s.hero.damage,s.hero.armor],[max,hp,80+3*(level-1),20+level-1+3*fortitude]);
 }
});
test('item HP follows Fortitude; growth, duplicate stats, passive and strongest zone compose once',()=>{
 const s=new Simulation();s.state.heroProgression.level=20;s.state.heroProgression.fortitude=2;
 own(s.state.inventory,'guardian-shield');own(s.state.inventory,'guardian-shield');own(s.state.inventory,'iron-sword');
 const base=s.state.bases['blue-base'];s.hero.x=base.x+100;s.hero.y=base.y;
 s.state.skills.zones=[{x:s.hero.x,y:s.hero.y,armor:12},{x:s.hero.x,y:s.hero.y,armor:8}];
 s.skills.refreshStats();assert.deepEqual([s.hero.maxHp,s.hero.damage,s.hero.armor],[2574+500,137+15,45+30+5+12]);
 const before=structuredClone(s.hero);for(let i=0;i<100;i++)s.skills.refreshStats();assert.deepEqual(s.hero,before);
});
test('HP fraction is preserved down to existing precision; zero never revives and removing HP never heals',()=>{
 const s=new Simulation();s.hero.hp=600;const id=own(s.state.inventory,'guardian-shield');s.skills.refreshStats();assert.equal(s.hero.hp,725);assert.equal(s.hero.maxHp,1450);
 s.state.inventory.slots[0]=null;delete s.state.inventory.instances[id];s.skills.refreshStats();assert.equal(s.hero.hp,600);
 s.hero.hp=1;own(s.state.inventory,'guardian-shield');s.skills.refreshStats();assert.equal(s.hero.hp,1.2);
 s.hero.hp=0;own(s.state.inventory,'guardian-shield');s.skills.refreshStats();assert.equal(s.hero.hp,0);assert.equal(s.hero.maxHp,1700);
});
test('equipment survives actual death, Pause and respawn; a restarted/new encounter inventory is empty',()=>{
 const s=new Simulation('life-test');own(s.state.inventory,'guardian-shield');own(s.state.inventory,'iron-sword');s.skills.refreshStats();
 const before=structuredClone(s.state.inventory),enemy={...s.hero,id:'killer',kind:'minion-red',team:'red',damage:99999};s.hero.hp=1;s.hit(enemy,s.hero,99999,'direct');assert.equal(s.hero.hp,0);
 s.setPaused(true);ticks(s,10);assert.deepEqual(s.state.inventory,before);s.setPaused(false);
 ticks(s,s.hero.respawnTick-s.clock.tick);assert.equal(s.hero.hp,1450);assert.deepEqual(s.state.inventory,before);assert.equal(s.hero.damage,95);
 s.beginRestart();assert.deepEqual(s.state.inventory,before);for(const encounter of ['prototype','extended']){const fresh=new Simulation('next-match',encounter);assert.deepEqual(fresh.state.inventory,initialInventory('next-match'));assert.equal(fresh.hero.maxHp,1200);}
});
test('Flame Blade quotes cost 650/450/300 with exact selected components and preserve total paid basis',()=>{
 const inv=initialInventory('fusion');const q0=quoteArtifact(inv,'flame-blade',goldUnits(1000));assert.equal(q0.goldDue,650);assert.equal(q0.missingComponents.length,2);
 const sword=own(inv,'iron-sword');const q1=quoteArtifact(inv,'flame-blade',goldUnits(1000),[sword]);assert.equal(q1.goldDue,450);assert.deepEqual(q1.missingComponents,[{itemId:'ruby-gem',count:1,goldUnits:150*RESOURCE_UNITS}]);
 const gem=own(inv,'ruby-gem');const q2=quoteArtifact(inv,'flame-blade',goldUnits(300),[sword,gem]);assert.equal(q2.goldDue,300);assert.equal(q2.missingComponents.length,0);assert.equal(q2.goldAfterUnits,0);
 for(const q of [q0,q1,q2]){assert.equal(q.output.paidGoldUnits,goldUnits(650));assert.equal(q.effectsReady,true);assert.equal(q.tradingEnabled,true);}
});
test('full-slot Fusion checks final capacity after consumption, not temporary virtual ingredients',()=>{
 const inv=initialInventory('full'),sword=own(inv,'iron-sword'),gem=own(inv,'ruby-gem');for(let i=0;i<4;i++)own(inv,'guardian-shield');
 const none=quoteArtifact(inv,'flame-blade',goldUnits(1000));assert.equal(none.hasCapacity,false);assert.equal(none.occupiedAfter,7);assert.equal(none.outputSlot,null);
 const one=quoteArtifact(inv,'flame-blade',goldUnits(1000),[sword]);assert.equal(one.hasCapacity,true);assert.equal(one.occupiedAfter,6);assert.equal(one.outputSlot,0);
 const both=quoteArtifact(inv,'flame-blade',goldUnits(1000),[sword,gem]);assert.equal(both.hasCapacity,true);assert.equal(both.occupiedAfter,5);
 assert.equal(quoteArtifact(inv,'iron-sword',goldUnits(1000)).hasCapacity,false);
});
test('quotes are deeply immutable detached snapshots and never charge, consume, or reserve IDs',()=>{
 const inv=initialInventory('snap'),sword=own(inv,'iron-sword'),chosen=[sword],before=structuredClone(inv);
 const q=quoteArtifact(inv,'flame-blade',goldUnits(1000),chosen),again=quoteArtifact(inv,'flame-blade',goldUnits(1000),chosen);
 assert.deepEqual(q,again);assert.deepEqual(inv,before);chosen.length=0;assert.deepEqual(q.consumedInstanceIds,[sword]);
 for(const action of [()=>q.goldDue=0,()=>q.consumedInstanceIds.push('x'),()=>q.missingComponents[0].count=20,()=>q.output.itemId='x',()=>q.unsupportedEffects.push('x')])assert.throws(action,TypeError);
 own(inv,'guardian-shield');assert.equal(q.nextSequence,3);assert.equal(q.occupiedBefore,1);
});
test('insufficient funds and invalid component selection cannot change inventory or Gold ledger',()=>{
 const s=new Simulation(),ledger=new Economy(s.state),inv=s.state.inventory,sword=own(inv,'iron-sword'),shield=own(inv,'guardian-shield'),before=structuredClone(s.state);
 const q=quoteArtifact(inv,'guardian-shield',ledger.goldUnits);assert.equal(q.affordable,false);assert.equal(q.goldAfterUnits,null);
 for(const ids of [[sword,sword],[shield],['missing']])assert.throws(()=>quoteArtifact(inv,'flame-blade',ledger.goldUnits,ids));
 assert.throws(()=>quoteArtifact(inv,'iron-sword',ledger.goldUnits,[sword]));assert.throws(()=>quoteArtifact(inv,'missing',ledger.goldUnits));
 for(const balance of [-1,NaN,Infinity,1.5])assert.throws(()=>quoteArtifact(inv,'iron-sword',balance));
 assert.deepEqual(s.state,before);assert.equal(ledger.goldUnits,goldUnits(250));
 assert.equal(ledger.apply({type:'minion-reward',id:'reward'}),true);assert.equal(ledger.goldUnits,goldUnits(265));assert.equal(s.state.gold,265);
});
test('duplicate ingredients consume only selected instances; deterministic sequence never recycles consumed IDs',()=>{
 const inv=initialInventory('duplicates'),a=own(inv,'iron-sword'),b=own(inv,'iron-sword');
 const q=quoteArtifact(inv,'flame-blade',goldUnits(1000),[b]);assert.deepEqual(q.consumedInstanceIds,[b]);assert.equal(q.outputSlot,1);assert.notEqual(q.output.id,a);assert.notEqual(q.output.id,b);
 assert.throws(()=>quoteArtifact(inv,'flame-blade',goldUnits(1000),[a,b]));
});
test('malformed item commands and legacy Fusion command names reject without spending Gold',()=>{
 const s=new Simulation(),before=structuredClone(s.state);for(const type of ['buy','sell','fusion','buy-item'])assert.equal(s.send({type,itemId:'iron-sword',requestId:'trade'}),false);assert.deepEqual(s.state,before);
});
test('Guardian stat refresh rejects equipment owned by another hero',()=>{
 const s=new Simulation();s.state.inventory=initialInventory('match','other');own(s.state.inventory,'iron-sword');assert.throws(()=>s.skills.refreshStats(),/owner/);assert.equal(s.hero.damage,80);
});
test('fractional HP stays bounded through level and Fortitude changes with equipment; refresh is idempotent',()=>{
 const s=new Simulation();s.hero.hp=333.33;own(s.state.inventory,'guardian-shield');
 for(const [level,fortitude] of [[1,0],[18,1],[20,2]]){
  const fraction=s.hero.hp/s.hero.maxHp;s.state.heroProgression.level=level;s.state.heroProgression.fortitude=fortitude;s.skills.refreshStats();
  assert.equal(s.hero.maxHp,(1200+60*(level-1))*(1+.05*fortitude)+250);
  assert.ok(s.hero.hp/s.hero.maxHp<=fraction+1e-9);assert.ok(fraction-s.hero.hp/s.hero.maxHp<.01/s.hero.maxHp+1e-9);
  const before=structuredClone(s.hero);s.skills.refreshStats();assert.deepEqual(s.hero,before);
 }
});
test('quote paid basis includes actual consumed costs and handles Gem-only and exact affordability',()=>{
 const inv=initialInventory('basis'),gem=own(inv,'ruby-gem',100);
 const q=quoteArtifact(inv,'flame-blade',goldUnits(500),[gem]);assert.equal(q.goldDue,500);assert.equal(q.output.paidGoldUnits,goldUnits(600));
 assert.equal(quoteArtifact(inv,'iron-sword',goldUnits(200)).affordable,true);
 assert.equal(quoteArtifact(inv,'iron-sword',goldUnits(200)-1).affordable,false);
 assert.equal(quoteArtifact(inv,'flame-blade',goldUnits(650)-1).affordable,false);
});
test('inventory sequence and paid-basis overflow are rejected without reserving an ID',()=>{
 const inv=initialInventory('overflow');inv.nextSequence=Number.MAX_SAFE_INTEGER;assert.throws(()=>quoteArtifact(inv,'iron-sword',goldUnits(1000)),/planned/);assert.equal(inv.nextSequence,Number.MAX_SAFE_INTEGER);
 const fusion=initialInventory('basis-overflow'),sword=own(fusion,'iron-sword');fusion.instances[sword]={...fusion.instances[sword],paidGoldUnits:Number.MAX_SAFE_INTEGER-1};assert.throws(()=>quoteArtifact(fusion,'flame-blade',goldUnits(1000),[sword]),/overflow/);
});
