const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {level,calm,strong,fund,allies,watcher,walker,run,ally,openSpot,strike,dist,ALLY}=require('./support/allyBot.cjs');
// Chapter 5 Phase 0 (docs/CHAPTER5_ALLY_PROBE.md): Allied Hero AI and the three Simple Commands on the Chapter 4 maps. Scratch probe only; every number is provisional.
// Each scenario prints one "PROBE {...}" line of measurements for the report. Allies marked strong have 1e6 HP so navigation is measured apart from balance.
const probe=(name,data)=>console.log('PROBE '+JSON.stringify({name,...data}));
const HOME={x:500,y:600};
const park=(sim,p=HOME)=>{assert.ok(sim.teleportHero(p.x,p.y),'Guardian parked');strong(sim.hero);};
const killedBy=(log,id)=>log.find(e=>e.type==='death'&&e.id===id)?.sourceId;
// Every Crimson unit (M4: the War Cart, the guard Hero, Elite Barracks trainees) is removed whenever present, so a solo Knight run measures navigation only and is not lost at home.
const noRaid=sim=>{for(const u of Object.values(sim.state.units))if(u.team==='red'&&u.hp>0)strike(sim,'guardian',u.id);};
// strong() lasts until the next stat refresh (a level-up recomputes the Guardian's maximum HP), so long runs reapply it.
const keepStrong=sim=>{if(sim.hero.hp>0&&sim.hero.maxHp<1e6)strong(sim.hero);};
const hitsBy=(log,src,id)=>log.filter(e=>e.type==='damage'&&e.sourceId===src&&(!id||e.id===id)).reduce((n,e)=>n+e.amount,0);

test('Follow: the Knight keeps up with a walking Guardian, assists his target and settles beside him; no stalls',()=>{
 const sim=calm(level(31));strong(sim.hero);strike(sim,'guardian','red-hero');
 const a=ally(sim,760,590,{strong:true}),w=watcher(sim);let far=0;
 for(const to of [{x:1000,y:600},{x:700,y:520},{x:560,y:600}]){const step=walker(sim,to);let done=false;run(sim,900,()=>{keepStrong(sim);if(!done)done=step();w.tick();far=Math.max(far,dist(sim.hero,sim.state.units[a]));});}
 const settled=dist(sim.hero,sim.state.units[a]);
 probe('follow-walk',{maxDistance:Math.round(far),settled:Math.round(settled),stalls:w.stalls,episodes:w.episodes,giveUps:w.giveUps});
 assert.ok(settled<=ALLY.FOLLOW_LEAVE,`settles beside the Guardian (${Math.round(settled)} px)`);assert.equal(w.stalls,0);
 // Assist: the Guardian attacks a camp tower; the Knight on Follow joins him on it.
 park(sim,openSpot(sim,1120,500));sim.send({type:'attack'});sim.send({type:'target',id:'c4-camp-north'});
 const log=run(sim,600,()=>{sim.send({type:'attack'});w.tick();});
 probe('follow-assist',{allyDamageOnTower:Math.round(hitsBy(log,a,'c4-camp-north'))});
 assert.ok(hitsBy(log,a,'c4-camp-north')>0,'the Knight hits the tower the Guardian attacks');
});

test('Follow: while the Guardian is dead the Knight holds where it stood, then rejoins him at his respawn',()=>{
 const sim=calm(level(31));strike(sim,'guardian','red-hero');park(sim,{x:820,y:600});
 const a=ally(sim,760,600,{strong:true});run(sim,90);
 const at={...sim.state.units[a]};sim.hero.hp=sim.hero.maxHp=1200;strike(sim,'red-base','guardian');assert.ok(sim.hero.hp<=0);
 let drift=0;const log=run(sim,3000,t=>{if(sim.hero.hp<=0)drift=Math.max(drift,dist(sim.state.units[a],at));});
 const back=log.find(e=>e.type==='respawn');assert.ok(back,'the Guardian respawned');
 const u=sim.state.units[a];probe('follow-death-hold',{driftWhileDead:Math.round(drift),respawnTick:back.at,finalDistance:Math.round(dist(u,sim.hero)),hold:u.ally.hold??null});
 assert.ok(drift<=8,'holds its ground while the Guardian is dead');
 assert.ok(dist(u,sim.hero)<=ALLY.FOLLOW_LEAVE,'rejoins the Guardian after the respawn');
});

test('Attack: the Knight takes a tower, a faction gate and the Crimson Keep far beyond the 400 px soldier tether, then defends where it stopped',()=>{
 const sim=calm(level(34));park(sim);strike(sim,'guardian','red-hero');
 const a=ally(sim,560,600,{strong:true}),w=watcher(sim),log=[],out={};
 for(const id of ['c4-fwd-north','red-forward-gate','c4-main-north','c4-main-south','red-main-gate','red-base']){
  if(!(sim.state.structures[id]??sim.state.bases[id])?.hp)continue;
  assert.ok(sim.orderAlly(a,{type:'attack',targetId:id}),`order accepted: ${id}`);
  const start=sim.clock.tick;run(sim,id==='red-base'?3600:1800,()=>{noRaid(sim);w.tick();},log);
  const dead=log.some(e=>e.type==='death'&&e.id===id);
  out[id]={dead,seconds:+(((log.find(e=>e.type==='death'&&e.id===id)?.at??sim.clock.tick)-start)/30).toFixed(1),by:killedBy(log,id),guardianDistance:Math.round(dist(sim.state.units[a],sim.hero))};
  if(id!=='red-base'){assert.ok(dead,`${id} destroyed`);assert.equal(out[id].by,a);}
 }
 probe('attack-chain',{...out,stalls:w.stalls,episodes:w.episodes,giveUps:w.giveUps,final:sim.outcome?.outcome??null});
 assert.ok(out['c4-fwd-north'].guardianDistance>400,'the first kill happened beyond the soldier tether');
 assert.equal(w.stalls,0);
 assert.ok(sim.ended&&sim.outcome.outcome==='victory','the Knight alone destroyed the Crimson Keep');
});

test('Attack: the order turns into Defend at the last position when the target dies, and the Knight stays there',()=>{
 const sim=calm(level(34));park(sim);strike(sim,'guardian','red-hero');
 const a=ally(sim,560,600,{strong:true});sim.orderAlly(a,{type:'attack',targetId:'c4-fwd-north'});
 const log=run(sim,1800,()=>noRaid(sim));assert.ok(log.some(e=>e.type==='death'&&e.id==='c4-fwd-north'));run(sim,2);
 const u=sim.state.units[a],o=u.ally.order;assert.equal(o.type,'defend');
 const at={x:u.x,y:u.y};run(sim,300,()=>noRaid(sim));
 probe('attack-then-defend',{order:o,drift:Math.round(dist(sim.state.units[a],at))});
 assert.ok(dist(sim.state.units[a],at)<=ALLY.ARRIVE,'stays at the last position');
});

test('Attack orders are refused for a shielded Keep, a friendly target and an unknown id',()=>{
 const sim=calm(level(32));const a=ally(sim,760,600);
 assert.equal(sim.state.bases['red-base'].invulnerable,true);
 assert.equal(sim.orderAlly(a,{type:'attack',targetId:'red-base'}),false);
 assert.equal(sim.orderAlly(a,{type:'attack',targetId:'blue-base'}),false);
 assert.equal(sim.orderAlly(a,{type:'attack',targetId:'nope'}),false);
 assert.equal(sim.orderAlly(a,{type:'defend',x:-50,y:600}),false);
 assert.equal(sim.state.units[a].ally.order.type,'follow');
});

test('Defend: the Knight holds a road point against live waves with the Guardian at home, and walks back after each fight',()=>{
 const sim=level(31);park(sim);
 const post={x:888,y:600},a=ally(sim,post.x,post.y,{strong:true});assert.ok(sim.orderAlly(a,{type:'defend',...post}));
 const w=watcher(sim);let excursion=0;const log=run(sim,90*30,()=>{w.tick();excursion=Math.max(excursion,dist(sim.state.units[a],post));});
 const kills=log.filter(e=>e.type==='death'&&e.sourceId===a&&String(e.id).startsWith('red-')).length;
 for(const u of Object.values(sim.state.units))if(u.team==='red'){u.hp=0;delete sim.state.units[u.id];}
 calm(sim);run(sim,300,()=>w.tick());
 const back=dist(sim.state.units[a],post);
 probe('defend-waves',{kills,maxExcursion:Math.round(excursion),backAtPost:Math.round(back),stalls:w.stalls,episodes:w.episodes,giveUps:w.giveUps,guardianDistance:Math.round(dist(post,sim.hero))});
 assert.ok(kills>=5,'it fought the waves');assert.ok(excursion<=ALLY.DEFEND_RADIUS+ALLY.REACH+80,'it never chased far from its post');assert.ok(back<=ALLY.ARRIVE+2,'back at the post');assert.equal(w.stalls,0);
});

test('Capture: a Knight alone in the ring raises the Banner (Forest Camp) and the Keep shield falls',()=>{
 const sim=calm(level(31));park(sim);for(const id of ['c4-camp-north','c4-camp-south','red-hero'])strike(sim,'guardian',id);
 const a=ally(sim,760,600,{strong:true});assert.ok(sim.orderAlly(a,{type:'defend',x:1080,y:576}));
 const log=run(sim,900);const cap=log.find(e=>e.type==='post'&&e.change==='captured');
 probe('capture-banner',{capturedAt:cap?.at??null,guardianDistance:Math.round(dist(sim.hero,{x:1080,y:504})),shield:!!sim.state.bases['red-base'].invulnerable});
 assert.ok(cap,'the camp was captured with only the Knight in the ring');assert.ok(dist(sim.hero,{x:1080,y:504})>400);
 assert.equal(sim.state.bases['red-base'].invulnerable,undefined);
});

test('Capture without Repair: a Knight captures the Forward Gatehouse but cannot repair it or the War Cart wreck; the Guardian then can',()=>{
 const sim=calm(level(34));park(sim);for(const id of ['c4-fwd-north','c4-fwd-south'])strike(sim,'guardian',id);
 const a=ally(sim,880,600,{strong:true});assert.ok(sim.orderAlly(a,{type:'defend',x:936,y:600}));
 run(sim,200);const cs=sim.state.captures['red-forward-gate'];assert.equal(cs.stage,'captured','the Knight alone captured the gatehouse');
 fund(sim);run(sim,400);assert.equal(cs.stage,'captured');assert.equal(cs.repairDone,undefined,'no repair while only the Knight stands there');
 park(sim,{x:960,y:660});const log=run(sim,200);assert.ok(log.some(e=>e.type==='site'&&e.change==='repairing'&&e.id==='red-forward-gate'),'the Guardian starts the repair');
 // The wreck: kill the Crimson cart when it rolls out, put the Knight on the wreck, the Guardian away.
 park(sim);run(sim,Math.max(0,905-sim.clock.tick));assert.ok(sim.state.units['red-cart']);strike(sim,'guardian','red-cart');run(sim,2);
 const wk=sim.state.cartWreck;assert.ok(wk,'a wreck lies on a site');
 assert.ok(sim.orderAlly(a,{type:'defend',x:wk.x+48,y:wk.y}));fund(sim);run(sim,600);
 probe('capture-no-repair',{gate:cs.stage,wreck:{x:wk.x,y:wk.y},allyOnWreck:Math.round(dist(sim.state.units[a],wk)),repairing:!!sim.state.cartWreck?.repair});
 assert.ok(dist(sim.state.units[a],wk)<=96,'the Knight stands in the wreck ring');assert.equal(sim.state.cartWreck?.repair,undefined,'the Knight cannot repair the wreck');
});

test('Faction gate stays solid for the Knight: it breaks the Cliff Pass gate to reach a tower behind it, never walks through it',()=>{
 const sim=calm(level(32));park(sim);strike(sim,'guardian','red-hero');
 const a=ally(sim,980,600,{strong:true}),w=watcher(sim);sim.orderAlly(a,{type:'attack',targetId:'c4-gate-north'});
 let crossed=false;const gate=sim.state.structures['red-gate'];
 const log=run(sim,2400,()=>{w.tick();if(sim.state.structures['red-gate']?.hp>0&&sim.state.units[a].x>gate.x)crossed=true;});
 probe('faction-gate',{gateDamageByAlly:Math.round(hitsBy(log,a,'red-gate')),gateDead:!sim.state.structures['red-gate'],towerDead:!sim.state.structures['c4-gate-north'],crossedWhileStanding:crossed,stalls:w.stalls,episodes:w.episodes,giveUps:w.giveUps});
 assert.equal(crossed,false);assert.ok(!sim.state.structures['c4-gate-north'],'reached and destroyed the tower behind the gate');
});

test('Cell-edge towers and the Gatehouse: the Knight finds an attack cell for each (River & Island, Forest Edge), no stalls',()=>{
 const out={};
 for(const [n,id] of [[33,'c4-gate-north'],[33,'c4-gate-south'],[33,'red-gate'],[31,'c4-camp-north'],[31,'c4-camp-south']]){
  const sim=calm(level(n));park(sim);strike(sim,'guardian','red-hero');
  const t=sim.state.structures[id],a=ally(sim,820,600,{strong:true}),w=watcher(sim);sim.orderAlly(a,{type:'attack',targetId:id});
  const log=run(sim,2400,()=>w.tick());
  out[`L${n}:${id}`]={at:[t.x,t.y],edge:[t.x%48===0,t.y%48===0],dead:log.some(e=>e.type==='death'&&e.id===id),seconds:+((log.find(e=>e.type==='death'&&e.id===id)?.at??NaN)/30).toFixed(1),stalls:w.stalls,episodes:w.episodes,giveUps:w.giveUps};
 }
 probe('cell-edge',out);
 for(const [k,v] of Object.entries(out)){assert.ok(v.dead,`${k} destroyed`);assert.equal(v.stalls,0,k);}
});

test('Follow round the Crimson Fortress ridge with three Knights: no anchor-snap freezes at the spine corners',()=>{
 const sim=calm(level(36));strong(sim.hero);
 const ids=[ally(sim,540,600,{strong:true}),ally(sim,540,520,{strong:true}),ally(sim,540,680,{strong:true})],w=watcher(sim);let far=0;
 for(const to of [{x:1000,y:330},{x:760,y:600},{x:980,y:880},{x:600,y:600}]){const step=walker(sim,to);let done=false;run(sim,1200,()=>{keepStrong(sim);if(!done)done=step();w.tick();for(const id of ids)far=Math.max(far,dist(sim.hero,sim.state.units[id]));});}
 const settled=ids.map(id=>Math.round(dist(sim.hero,sim.state.units[id])));
 probe('follow-ridge',{maxDistance:Math.round(far),settled,stalls:w.stalls,episodes:w.episodes,giveUps:w.giveUps});
 assert.equal(w.stalls,0);for(const d of settled)assert.ok(d<=ALLY.FOLLOW_LEAVE+48,'all three settle beside the Guardian');
});

test('Determinism: the same scripted orders replay to an identical state',()=>{
 const play=()=>{const sim=level(34);park(sim);const a=ally(sim,560,600),b=ally(sim,560,520),c=ally(sim,560,680);sim.orderAlly(b,{type:'attack',targetId:'c4-fwd-north'});sim.orderAlly(c,{type:'defend',x:888,y:600});const log=run(sim,2400);return createHash('sha256').update(JSON.stringify(log)).update(JSON.stringify(sim.state)).digest('hex');};
 const h1=play(),h2=play();probe('determinism',{hash:h1.slice(0,16)});assert.equal(h1,h2);
});

test('Capture speed does not stack: three Knights and the Guardian in a ring capture exactly as fast as one Knight (Gatehouse and Banner)',()=>{
 const gate=crowd=>{const sim=calm(level(34));park(sim,crowd?{x:960,y:660}:HOME);for(const id of ['c4-fwd-north','c4-fwd-south'])strike(sim,'guardian',id);
  const ids=[ally(sim,880,600,{strong:true}),...(crowd?[ally(sim,880,520,{strong:true}),ally(sim,880,680,{strong:true})]:[])];
  ids.forEach((id,k)=>sim.orderAlly(id,{type:'defend',...[{x:936,y:600},{x:984,y:520},{x:984,y:680}][k]}));
  let first;const log=run(sim,400,t=>{if(first===undefined&&sim.state.captures['red-forward-gate'].progress>0)first=t;});const cap=log.find(e=>e.type==='site'&&e.change==='captured'&&e.id==='red-forward-gate');return cap&&first!==undefined?cap.at-first:undefined;};
 const banner=crowd=>{const sim=calm(level(31));park(sim,crowd?{x:1080,y:600}:HOME);for(const id of ['c4-camp-north','c4-camp-south','red-hero'])strike(sim,'guardian',id);
  const ids=[ally(sim,760,600,{strong:true}),...(crowd?[ally(sim,760,520,{strong:true}),ally(sim,760,680,{strong:true})]:[])];
  ids.forEach((id,k)=>sim.orderAlly(id,{type:'defend',...[{x:1080,y:576},{x:1008,y:528},{x:1152,y:528}][k]}));
  const log=run(sim,900),raise=log.find(e=>e.type==='post'&&e.change==='raising'),cap=log.find(e=>e.type==='post'&&e.change==='captured');return raise&&cap?cap.at-raise.at:undefined;};
 const g1=gate(false),g4=gate(true),b1=banner(false),b4=banner(true);
 probe('capture-no-stack',{gateOne:g1,gateCrowd:g4,bannerRaiseOne:b1,bannerRaiseCrowd:b4});
 assert.ok(g1&&g4&&b1&&b4,'every capture happened');
 // Measured from the first tick of capture progress (the gatehouse) or of the Banner raise, so walking time does not count: one Knight or a crowd, the same ticks.
 assert.equal(g1,g4,'the gatehouse captures in the same time');assert.equal(b1,b4,'the Banner rises in the same time');
});
