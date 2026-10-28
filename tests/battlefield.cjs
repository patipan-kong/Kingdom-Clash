const {test}=require('node:test'),assert=require('node:assert/strict');
const layout=require('../.test-build/world/layout.js');
const {meadow,battlefield,validateBattlefield}=require('../.test-build/world/battlefield.js');
const {Geometry,meadowGeometry,blocked,lineOfSight}=require('../.test-build/simulation/Collision.js');
const {canAttackOn}=require('../.test-build/simulation/Combat.js');
const {Navigation}=require('../.test-build/simulation/Navigation.js');
const {placementReason}=require('../.test-build/simulation/Building.js');
const {constructionCost}=require('../.test-build/simulation/ConstructionCosts.js');
const {buildings}=require('../.test-build/data/buildings.js');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {matchSetup}=require('../.test-build/data/matchSetup.js');
const {campaign}=require('../.test-build/data/campaignLevels.js');
const {combatStructures}=require('../.test-build/simulation/GameState.js');
const {minionStats}=require('../.test-build/data/combat.js');
const {nextLevelXp}=require('../.test-build/data/progression.js');
// Chapter 2 S1: the match-scoped Battlefield. Meadow must reproduce the pre-S1 rules exactly; test-only battlefields (built here, never
// registered) show that collision, placement, skills, line of sight, respawn, routing and Keeps all follow the match's own map.

// --- Pre-S1 rules, copied verbatim from main 5b31ef8 (Collision.blocked/lineOfSight, Building.placementReason) as the oracle. ---
const {GRID,WORLD,terrain,scenery,entities}=layout;
function oldBlocked(x,y,r,structures={}){
 if(x<r||x>WORLD.width-r||y<r||y>WORLD.height-r)return true;
 if(x>terrain.riverLeft-r&&x<terrain.riverRight+r&&(y<terrain.bridgeTop+r||y>terrain.bridgeBottom-r))return true;
 if(scenery.some(p=>Math.hypot(x-p.x,y-p.y)<p.radius+r))return true;
 if(Object.values(structures).some(b=>b.hp>0&&Math.abs(x-b.x)<(b.columns??1)*GRID/2+r&&Math.abs(y-b.y)<(b.rows??1)*GRID/2+r))return true;
 return entities.some(e=>'columns' in e.footprint&&Math.abs(x-e.x)<e.footprint.columns*GRID/2+r&&Math.abs(y-e.y)<e.footprint.rows*GRID/2+r);
}
function oldLineOfSight(a,b,structures={}){
 const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4);
 for(let i=0;i<=n;i++){const t=n?i/n:0;if(oldBlocked(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,0,structures))return false;}
 return true;
}
function oldPlacementReason(s,kind,col,row,resources=s){
 if(!Object.hasOwn(buildings,kind)||!Number.isInteger(col)||!Number.isInteger(row))return 'Invalid command';
 const x=(col+.5)*GRID,y=(row+.5)*GRID;
 if(col<0||row<0||x>=WORLD.width||y>=WORLD.height)return 'Outside map';
 if(Math.hypot(x-330,y-600)>8*GRID)return 'Outside controlled territory';
 if(Object.values(s.structures).some(b=>Math.abs(b.x-x)<GRID&&Math.abs(b.y-y)<GRID))return 'Occupied structure cell';
 if(Object.values(s.units).some(u=>u.hp>0&&Math.abs(u.x-x)<24+u.radius&&Math.abs(u.y-y)<24+u.radius))return 'Occupied by unit';
 if(Math.abs(x-450)<24+24&&Math.abs(y-600)<24+24||s.encounter.reserved.some(([a,b])=>Math.abs(a-x)<36&&Math.abs(b-y)<36))return 'Reserved spawn area';
 const left=x-GRID/2,right=x+GRID/2,top=y-GRID/2,bottom=y+GRID/2;
 if(right>terrain.riverLeft&&left<terrain.riverRight&&(top<terrain.bridgeTop||bottom>terrain.bridgeBottom))return 'Water overlaps cell';
 if(scenery.some(p=>Math.hypot(p.x-Math.max(left,Math.min(right,p.x)),p.y-Math.max(top,Math.min(bottom,p.y)))<p.radius))return 'Scenery overlaps cell';
 if(entities.some(e=>'columns' in e.footprint&&Math.abs(x-e.x)<(e.footprint.columns+1)*GRID/2&&Math.abs(y-e.y)<(e.footprint.rows+1)*GRID/2))return 'Occupied static structure';
 if(kind==='tower'&&Object.values(s.structures).filter(b=>b.kind==='tower'&&b.team!=='red').length>=30)return 'Tower limit reached';
 const cost=constructionCost(s.inventory,kind);if(resources.wood<cost.wood||resources.iron<cost.iron)return 'Not enough resources';
 return '';
}
const RADII=[0,12,20,21,24];
// Live structures for the "with structures" passes: the Level 10 Crimson towers and both Keeps, plus a built wall and an unfinished tower.
const sampleStructures=()=>{const s=new Simulation('oracle',campaign.setup(10)).state,st=combatStructures(s);
 st.w={id:'w',kind:'wall',team:'blue',x:600,y:552,hp:400,columns:1,rows:1};st.t={id:'t',kind:'tower',team:'blue',x:504,y:744,hp:3,columns:1,rows:1};st.dead={id:'dead',kind:'wall',team:'blue',x:700,y:400,hp:0};return st;};

test('Meadow collision equals the pre-S1 rule on a 4 px sweep of the whole map and beyond, every radius, with and without structures',()=>{
 const st=sampleStructures(),geo=new Simulation().geo;let checked=0;
 for(const structures of [undefined,st])for(const r of RADII)for(let x=-48;x<=WORLD.width+48;x+=4)for(let y=-48;y<=WORLD.height+48;y+=4){
  const want=oldBlocked(x,y,r,structures);
  if(geo.blocked(x,y,r,structures)!==want||blocked(x,y,r,structures)!==want)assert.fail(`blocked(${x},${y},${r}) ${structures?'with':'without'} structures should be ${want}`);checked++;
 }
 assert.ok(checked>1.5e6);
});
test('Meadow collision equals the pre-S1 rule exactly on every river, bridge and world boundary, and 1e-9 either side',()=>{
 const xs=[0,terrain.riverLeft,terrain.riverRight,WORLD.width],ys=[0,terrain.bridgeTop,terrain.bridgeBottom,WORLD.height],st=sampleStructures();
 const around=(edges,r)=>edges.flatMap(v=>[v-r,v,v+r]).flatMap(v=>[v-1e-9,v,v+1e-9]);
 for(const structures of [undefined,st])for(const r of RADII)for(const x of around(xs,r))for(const y of around(ys,r)){
  const want=oldBlocked(x,y,r,structures);if(meadowGeometry.blocked(x,y,r,structures)!==want)assert.fail(`boundary blocked(${x},${y},${r}) should be ${want}`);
 }
 // The open-ended river: a point on the top or bottom edge of the river band is water for a zero radius, as before S1.
 for(const y of [0,WORLD.height])for(const x of [881,960,1039])assert.equal(meadowGeometry.blocked(x,y,0),true);
 for(const x of [NaN,Infinity,-Infinity])assert.equal(meadowGeometry.blocked(x,600,20),oldBlocked(x,600,20));
});
test('Meadow line of sight equals the pre-S1 rule on 5000 seeded segments, with and without structures',()=>{
 let seed=0x5eed;const rnd=()=>(seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32;const st=sampleStructures();
 for(let i=0;i<5000;i++){
  const a={x:rnd()*(WORLD.width+40)-20,y:rnd()*(WORLD.height+40)-20},len=rnd()*600,ang=rnd()*Math.PI*2,b={x:a.x+Math.cos(ang)*len,y:a.y+Math.sin(ang)*len},structures=i%2?st:undefined;
  const want=oldLineOfSight(a,b,structures);
  if(meadowGeometry.lineOfSight(a,b,structures)!==want||lineOfSight(a,b,structures)!==want)assert.fail(`segment ${i} ${JSON.stringify([a,b])} should be ${want}`);
 }
});
test('Meadow placement equals the pre-S1 rule for every cell, both kinds, on a fresh and on a busy match',()=>{
 const fresh=new Simulation(),busy=new Simulation('busy',campaign.setup(10));for(let i=0;i<600;i++)busy.advance(1000/30);
 busy.state.structures.w={id:'w',kind:'wall',team:'blue',x:600,y:552,hp:400,columns:1,rows:1};
 const reasons=new Set();
 for(const sim of [fresh,busy])for(const kind of ['wall','tower'])for(const res of [{wood:999,iron:999},{wood:0,iron:0},sim.state])for(let col=-1;col<=40;col++)for(let row=-1;row<=24;row++){
  const want=oldPlacementReason(sim.state,kind,col,row,res);reasons.add(want);
  assert.equal(placementReason(meadow,sim.state,kind,col,row,res),want,`${kind} ${col},${row}`);
 }
 for(const col of [9,12,20,0.5])assert.equal(fresh.placementReason('wall',col,12),oldPlacementReason(fresh.state,'wall',col,12,{wood:fresh.state.wood,iron:fresh.state.iron}));
 // The river lies outside Meadow's construction territory, so "Water overlaps cell" is unreachable there, before and after S1.
 for(const r of ['','Outside map','Outside controlled territory','Reserved spawn area','Scenery overlaps cell','Occupied static structure','Occupied structure cell','Not enough resources'])assert.ok(reasons.has(r),`the sweep reaches "${r}"`);
 assert.equal(reasons.has('Water overlaps cell'),false);
});

// --- Meadow identity: every Chapter 1 match and Full Battle run on Meadow, with the legacy values, and nothing enters GameState. ---
test('Meadow is the legacy layout itself, with the legacy territory, reserved cell, respawn order and route objectives',()=>{
 assert.equal(meadow.id,'meadow');assert.equal(battlefield('meadow'),meadow);
 assert.equal(meadow.scenery,layout.scenery);assert.equal(meadow.entities,layout.entities);
 assert.deepEqual(meadow.barriers,[{x0:880,y0:-Infinity,x1:1040,y1:535,reason:'Water overlaps cell'},{x0:880,y0:615,x1:1040,y1:Infinity,reason:'Water overlaps cell'}]);
 assert.deepEqual(meadow.territory,{x:330,y:600,radius:384});assert.deepEqual(meadow.reserved,[{x:450,y:600}]);
 assert.deepEqual(meadow.respawn,[{x:450,y:600},...Array.from({length:6},(_,i)=>[552,600,648].map(y=>({x:450+i*48,y}))).flat()]);
 assert.deepEqual(meadow.objectives,{blue:{x:1490,y:600},red:{x:450,y:600}});
 assert.ok(Object.isFrozen(meadow)&&Object.isFrozen(meadow.barriers)&&Object.isFrozen(meadow.respawn[0]));
});
test('prototype, Full Battle (extended), every Chapter 1 level and Full Battle resolve to Meadow (Levels 11, 13, 15, 17 and 19 are Canyon Pass missions, Levels 12, 14, 16, 18 and 20 are Oasis, Levels 21 and 22 are the Frost Citadel); GameState keys are unchanged',()=>{
 const setups=[matchSetup('prototype'),matchSetup('extended'),...campaign.list().filter(l=>!['campaign-11','campaign-12','campaign-13','campaign-14','campaign-15','campaign-16','campaign-17','campaign-18','campaign-19','campaign-20','campaign-21','campaign-22'].includes(l.id)).map(l=>campaign.setup(l.id))];
 assert.equal(setups.length,13);for(const s of setups)assert.equal(s.battlefield,meadow);
 for(const l of campaign.list())assert.equal(Object.hasOwn(l.match,'battlefield'),false,`${l.id} level data names no battlefield`);
 const sim=new Simulation('keys',campaign.setup('full-battle'));assert.equal(sim.field,meadow);assert.equal(sim.geo.field,meadow);
 assert.deepEqual(Object.keys(sim.state),['burns','criticalRandom','inventory','heroProgression','skills','bases','match','units','structures','wood','iron','move','attacking','encounter','gold','kills','spawnedWaves','guardianDeaths','previewReady']);
 assert.deepEqual(Object.keys(sim.state.bases),['blue-base','red-base']);
 assert.doesNotMatch(JSON.stringify(sim.state),/meadow|barrier|territory/);
});
test('battlefield validation: unknown ids, malformed fields and setups without a battlefield fail loudly',()=>{
 assert.throws(()=>battlefield('no-such-field'),/Unknown battlefield/);assert.throws(()=>matchSetup('prototype',{battlefield:'no-such-field'}),/Unknown battlefield/);
 assert.throws(()=>new Simulation('x',{...matchSetup('prototype'),battlefield:undefined}),/Invalid battlefield/);
 for(const [why,o] of [['barrier',{barriers:[{x0:10,y0:0,x1:10,y1:5,reason:'x'}]}],['blue-base',{entities:meadow.entities.filter(e=>e.id!=='blue-base')}],
  ['respawn',{respawn:[]}],['outside',{respawn:[{x:-1,y:5}]}],['territory',{territory:{x:0,y:0,radius:0}}],['scenery',{scenery:[{x:0,y:0,radius:-1}]}]])
  assert.throws(()=>validateBattlefield({...meadow,id:'bad',...o}),new RegExp(why),why);
});

// --- Test-only battlefields ---
const field=(id,o)=>validateBattlefield({...meadow,id,...o});
const CLIFF={x0:780,y0:500,x1:800,y1:650,reason:'Cliff overlaps cell'}; // a short wall between the Guardian (750,575) and x 820
const cliff=field('test-cliff',{barriers:[...meadow.barriers,CLIFF]});
const ticks=(s,n=1)=>{for(let i=0;i<n;i++)s.advance(1000/30);};
function sim(f,level=1){
 const s=new Simulation('bf',{...matchSetup('prototype'),battlefield:f});s.state.spawnedWaves=2;s.state.units={guardian:s.hero};Object.assign(s.hero,{x:750,y:575});
 if(level>1)s.progression.award('fixture',Array.from({length:level-1},(_,i)=>nextLevelXp(i+1)).reduce((a,b)=>a+b,0));s.skills.refreshStats();s.drainEvents();return s;
}
function minion(s,id='enemy',team='red',x=820,y=575){const u={id,kind:team==='red'?'minion-red':'minion-blue',team,x,y,...minionStats,hp:240,armor:0,speed:0,damage:0,readyTick:0,protectionTick:0};s.state.units[id]=u;return u;}
const learn=(s,skill)=>{s.send({type:'learn',skill,requestId:'learn-'+skill});ticks(s);s.drainEvents();};
const cast=(s,skill,extra={},id='cast')=>{s.send({type:'cast',skill,requestId:id,...extra});ticks(s);return s.drainEvents();};
const rejected=events=>events.filter(e=>e.type==='rejected').map(e=>e.reason);

test('wall placement follows the match battlefield: barrier reason, edge contact, moved territory and reserved cells',()=>{
 const cell=field('test-cell',{barriers:[...meadow.barriers,{x0:576,y0:528,x1:624,y1:576,reason:'Cliff overlaps cell'}]});
 const f=new Simulation('a',{...matchSetup('prototype'),battlefield:cell}),m=new Simulation();
 assert.equal(f.placementReason('wall',12,11),'Cliff overlaps cell');assert.equal(m.placementReason('wall',12,11),'');
 for(const [c,r] of [[11,11],[13,11],[12,10],[12,12]])assert.equal(f.placementReason('wall',c,r),m.placementReason('wall',c,r),`edge-touching cell ${c},${r} is unaffected`);
 f.send({type:'place',requestId:'p',kind:'wall',col:12,row:11});m.send({type:'place',requestId:'p',kind:'wall',col:12,row:11});ticks(f);ticks(m);
 assert.deepEqual(rejected(f.drainEvents()),['Cliff overlaps cell']);assert.ok(m.drainEvents().some(e=>e.type==='built'));
 // Territory: cell (10,12) is 174 px from the Keep centre; a 174 px territory includes it, 173.999 does not.
 const at=radius=>new Simulation('t',{...matchSetup('prototype'),battlefield:field('test-territory',{territory:{x:330,y:600,radius}})}).placementReason('wall',10,12);
 assert.deepEqual([at(174),at(173.999),new Simulation().placementReason('wall',10,12)],['','Outside controlled territory','']);
 const moved=new Simulation('r',{...matchSetup('prototype'),battlefield:field('test-reserved',{reserved:[{x:600,y:600}]})});
 assert.deepEqual([moved.placementReason('wall',12,12),moved.placementReason('wall',9,12)],['Reserved spawn area','']);
 assert.deepEqual([m.placementReason('wall',12,12),m.placementReason('wall',9,12)],['','Reserved spawn area']);
});
test('Vanguard Charge stops at a battlefield barrier and is refused when already against it; on Meadow it runs on',()=>{
 const c=sim(cliff),m=sim(meadow);for(const s of [c,m]){learn(s,'charge');cast(s,'charge',{direction:{x:1,y:0}});ticks(s,20);}
 assert.ok(c.hero.x<=760+1e-7&&c.hero.x>759.9,`stopped at the cliff edge, x=${c.hero.x}`);assert.equal(c.hero.y,575);assert.ok(m.hero.x>800,`ran on, x=${m.hero.x}`);
 const pinned=sim(cliff),open=sim(meadow);for(const s of [pinned,open]){s.hero.x=760;learn(s,'charge');}
 assert.deepEqual(rejected(cast(pinned,'charge',{direction:{x:1,y:0}})),['Charge path blocked']);assert.equal(pinned.state.skills.ready.charge,0);
 assert.deepEqual(rejected(cast(open,'charge',{direction:{x:1,y:0}})),[]);assert.ok(open.state.skills.ready.charge>0);
});
test('Shield Bash needs line of sight across the battlefield: refused behind a barrier, lands on Meadow',()=>{
 const c=sim(cliff),m=sim(meadow),ce=minion(c),me=minion(m);
 for(const s of [c,m])learn(s,'bash');
 assert.deepEqual(rejected(cast(c,'bash')),['No legal target in range / line of sight']);assert.equal(c.state.skills.ready.bash,0);
 assert.deepEqual(rejected(cast(m,'bash')),[]);ticks(c,7);ticks(m,7);assert.equal(ce.hp,240);assert.equal(me.hp,160);
});
test('Taunt skips raiders behind a barrier and drops a taunt whose line of sight a barrier breaks',()=>{
 const c=sim(cliff),m=sim(meadow);for(const s of [c,m]){minion(s);learn(s,'taunt');cast(s,'taunt');ticks(s,7);}
 assert.equal(c.state.units.enemy.statuses?.some(x=>x.type==='taunt')??false,false);assert.ok(m.state.units.enemy.statuses.some(x=>x.type==='taunt'));
 const lc=sim(cliff),lm=sim(meadow);for(const s of [lc,lm]){minion(s,'enemy','red',750,460);learn(s,'taunt');cast(s,'taunt');ticks(s,7);assert.ok(s.state.units.enemy.statuses.some(x=>x.type==='taunt'));Object.assign(s.state.units.enemy,{x:820,y:575});ticks(s);}
 assert.equal(typeof lc.state.units.enemy.statuses.find(x=>x.type==='taunt').lostLosTick,'number');assert.equal(lm.state.units.enemy.statuses.find(x=>x.type==='taunt').lostLosTick,undefined);
 ticks(lc,8);ticks(lm,8);assert.equal(lc.state.units.enemy.statuses.some(x=>x.type==='taunt'),false);assert.ok(lm.state.units.enemy.statuses.some(x=>x.type==='taunt'));
});
test('Guardian Zone shields and armours only allies in line of sight of the zone on this battlefield',()=>{
 const c=sim(cliff,6),m=sim(meadow,6),ca=minion(c,'ally','blue'),ma=minion(m,'ally','blue');
 for(const s of [c,m]){learn(s,'zone');cast(s,'zone');ticks(s,10);}
 assert.equal(ca.shield,undefined);assert.equal(ca.armor,0);assert.equal(ma.shield.remaining,72);assert.equal(ma.armor,10);
 assert.equal(c.hero.shield.remaining,120);assert.equal(m.hero.shield.remaining,120);
});
test('the Azure Keep armour aura needs line of sight to the Keep on this battlefield',()=>{
 const wall=field('test-keep-wall',{barriers:[...meadow.barriers,{x0:420,y0:560,x1:430,y1:640,reason:'Cliff overlaps cell'}]});
 const c=sim(wall),m=sim(meadow);for(const s of [c,m]){Object.assign(s.hero,{x:450,y:600});s.skills.refreshStats();}
 assert.equal(c.hero.armor,20);assert.equal(m.hero.armor,25);
});
test('basic attacks, tower shots and assist XP are blocked by battlefield barriers',()=>{
 const c=sim(cliff),m=sim(meadow),ce=minion(c),me=minion(m);for(const s of [c,m]){s.send({type:'attack'});ticks(s,30);}
 assert.equal(ce.hp,240,'the Guardian cannot strike through the cliff');assert.ok(me.hp<240);
 const tower={id:'tw',kind:'tower',team:'blue',x:700,y:575,hp:650,range:240},raider={id:'rd',kind:'minion-red',team:'red',x:850,y:575,hp:240};
 assert.equal(canAttackOn(c.geo,tower,raider),false);assert.equal(canAttackOn(m.geo,tower,raider),true);
 const xc=sim(cliff),xm=sim(meadow);for(const s of [xc,xm]){const e=minion(s,'enemy','red',850,575);s.hit({...s.hero,id:'ally',kind:'minion-blue'},e,240);}
 assert.equal(xc.state.heroProgression.xp,0);assert.equal(xm.state.heroProgression.xp,60);
});
test('the Guardian respawns at the first open respawn point of its battlefield, in that battlefield order',()=>{
 const points=[{x:600,y:700},{x:648,y:700}],plain=field('test-respawn',{respawn:points});
 const covered=field('test-respawn-covered',{respawn:points,barriers:[...meadow.barriers,{x0:590,y0:690,x1:610,y1:710,reason:'Cliff overlaps cell'}]});
 const where=f=>{const s=sim(f);s.hit({...s.hero,id:'killer',team:'red',kind:'minion-red'},s.hero,1e7,'direct');assert.equal(s.hero.hp,0);for(let i=0;i<3000&&s.hero.hp<=0;i++)ticks(s);assert.ok(s.hero.hp>0);return {x:s.hero.x,y:s.hero.y};};
 assert.deepEqual(where(plain),{x:600,y:700});assert.deepEqual(where(covered),{x:648,y:700});assert.deepEqual(where(meadow),{x:450,y:600});
 assert.equal(sim(cliff).teleportHero(790,575),false);assert.equal(sim(meadow).teleportHero(790,575),true);
});
test('routes fall back to the battlefield objectives, and Keeps and opening Azure minions come from the battlefield',()=>{
 const f=field('test-objectives',{objectives:{blue:{x:1200,y:900},red:{x:600,y:300}}});
 const goal=(F,team)=>{const s=sim(F),u=minion(s,'mover',team,team==='red'?1200:600,575);u.speed=95;u.damage=18;const st={...s.state,bases:{}};s.navigation.begin(st);return s.navigation.route(u,undefined,st,1).goal;};
 assert.deepEqual([goal(f,'red'),goal(f,'blue'),goal(meadow,'red'),goal(meadow,'blue')],['objective:12:6','objective:25:18','objective:9:12','objective:31:12']);
 const moved=field('test-entities',{entities:meadow.entities.map(e=>e.id==='red-base'?{...e,x:1500}:e).filter(e=>e.kind!=='minion-blue')});
 const s=new Simulation('e',{...matchSetup('prototype'),battlefield:moved}),legacy=new Simulation();
 assert.deepEqual([s.state.bases['red-base'].x,s.state.bases['red-base'].col],[1500,31]);assert.deepEqual([legacy.state.bases['red-base'].x,legacy.state.bases['red-base'].col],[1610,33]);
 assert.deepEqual(Object.keys(s.state.units),['guardian']);assert.deepEqual(Object.keys(legacy.state.units),['guardian','blue-0','blue-1','blue-2']);
 assert.equal(s.geo.blocked(1500,600,0),true);assert.equal(legacy.geo.blocked(1500,600,0),false);
 const n=new Navigation(new Geometry(cliff));assert.equal(n.geo.field,cliff);
});
