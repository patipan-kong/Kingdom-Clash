const {test}=require('node:test');const assert=require('node:assert/strict');
const {Simulation}=require('../.test-build/simulation/Simulation.js');
const {minionStats}=require('../.test-build/data/combat.js');
const {bashCone,bashVictims,inBashCone}=require('../.test-build/data/guardian.js');
const {stunned}=require('../.test-build/simulation/Statuses.js');
const ticks=(s,n)=>{for(let i=0;i<n;i++)s.advance(1000/30);};
function fixture(){const s=new Simulation();s.state.spawnedWaves=2;s.state.units={guardian:s.hero};Object.assign(s.hero,{x:750,y:575});s.skills.refreshStats();s.drainEvents();return s;}
function foe(s,id,x,y,hp=1000){const u={id,kind:'minion-red',team:'red',x,y,...minionStats,hp,maxHp:hp,armor:0,speed:0,damage:0,readyTick:0,protectionTick:0};s.state.units[id]=u;return u;}
function learn(s){s.send({type:'learn',skill:'bash',requestId:'learn-bash'});ticks(s,1);s.drainEvents();}
const cast=(s,extra={},id='cast')=>s.send({type:'cast',skill:'bash',requestId:id,...extra});
const at=(deg,d)=>({x:750+Math.cos(deg*Math.PI/180)*d,y:575+Math.sin(deg*Math.PI/180)*d});
const dealt=u=>u.maxHp-u.hp;

test('Bash on one foe is what it was: full damage, the 15-tick stun, one hit reported',()=>{
 const s=fixture(),e=foe(s,'e',790,575);learn(s);cast(s,{targetId:'e'});ticks(s,1);const start=s.clock.tick;ticks(s,6);
 assert.equal(dealt(e),80);const stun=e.statuses.find(x=>x.type==='stun');assert.equal(stun.expiresTick-stun.startTick,15);
 const fx=s.drainEvents().find(x=>x.type==='cast-effect');assert.deepEqual(fx.hits,['e']);assert.equal(fx.primaryId,'e');assert.ok(start>0);});

test('Bash on a group: the aimed foe takes 100%, the others in the cone 60%, all are stunned, nobody outside is touched',()=>{
 const s=fixture();const p=foe(s,'p',790,575),a=foe(s,'a',...Object.values(at(25,60))),b=foe(s,'b',...Object.values(at(-40,70)));
 const behind=foe(s,'behind',...Object.values(at(180,50))),side=foe(s,'side',...Object.values(at(75,60))),far=foe(s,'far',...Object.values(at(0,95)));
 learn(s);cast(s,{targetId:'p'});ticks(s,8);
 assert.equal(dealt(p),80);assert.equal(dealt(a),48);assert.equal(dealt(b),48);
 for(const u of [behind,side,far]){assert.equal(dealt(u),0,u.id);assert.ok(!stunned(u,s.clock.tick-1)&&!u.statuses?.length,u.id);}
 for(const u of [p,a,b])assert.ok(u.statuses.some(x=>x.type==='stun'&&x.expiresTick-x.startTick===15),u.id);});

test('Bash reaches at most 5 foes: the aimed one and the 4 nearest in the cone',()=>{
 const s=fixture(),spots=[[0,38],[35,45],[-35,45],[15,70],[-15,70],[40,80],[-45,80]],ids=spots.map(([deg,d],i)=>{const q=at(deg,d);return foe(s,'f'+i,q.x,q.y).id;});
 learn(s);cast(s,{targetId:'f4'});ticks(s,8);const hit=ids.filter(i=>dealt(s.state.units[i])>0);
 assert.equal(hit.length,5);assert.equal(dealt(s.state.units.f4),80);assert.deepEqual(hit.sort(),['f0','f1','f2','f3','f4']);for(const i of ['f0','f1','f2','f3'])assert.equal(dealt(s.state.units[i]),48,i);});

test('the cone is 120 degrees out to 90 px: 59 degrees in, 61 out, 90 in, 91 out',()=>{
 const o={x:0,y:0},axis={x:1,y:0},pt=(deg,d)=>({x:Math.cos(deg*Math.PI/180)*d,y:Math.sin(deg*Math.PI/180)*d});
 assert.equal(inBashCone(o,axis,pt(59,60)),true);assert.equal(inBashCone(o,axis,pt(-59,60)),true);assert.equal(inBashCone(o,axis,pt(61,60)),false);assert.equal(inBashCone(o,axis,pt(0,90)),true);assert.equal(inBashCone(o,axis,pt(0,91)),false);assert.equal(bashCone.range,90);assert.equal(bashCone.half,Math.PI/3);});

test('a dragged Bash uses the drag direction as the cone axis; a drag that misses the foe falls back to aiming at the foe',()=>{
 {const s=fixture(),south=foe(s,'south',...Object.values(at(90,60))),east=foe(s,'east',790,575),se=foe(s,'se',...Object.values(at(45,60)));learn(s);cast(s,{targetId:'south',direction:{x:0,y:1}});ticks(s,8);
  assert.equal(dealt(south),80);assert.equal(dealt(se),48);assert.equal(dealt(east),0,'90 degrees off the drag axis: outside');}
 {const s=fixture(),south=foe(s,'south',...Object.values(at(90,60))),east=foe(s,'east',790,575);learn(s);cast(s,{targetId:'south',direction:{x:1,y:0}});ticks(s,8);
  assert.equal(dealt(south),80);assert.equal(dealt(east),0,'the drag axis did not contain the aimed foe, so the cone points at the foe');}});

test('a Bash whose aimed foe is gone still never retargets',()=>{
 const s=fixture(),e=foe(s,'e',790,575),o=foe(s,'o',790,590);learn(s);cast(s,{targetId:'e'});ticks(s,2);e.x=1500;ticks(s,8);assert.equal(dealt(o),0);assert.equal(dealt(e),0);});

test('the shared cone rule predicts exactly the foes the simulation hits (the aim preview uses the same function)',()=>{
 let seed=7;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
 for(let run=0;run<60;run++){
  const s=fixture(),n=2+Math.floor(rnd()*8);const list=[],pts=[{x:750,y:575}];
  for(let i=0,tries=0;i<n&&tries<400;tries++){const a=rnd()*Math.PI*2,d=50+rnd()*40,x=750+Math.cos(a)*d,y=575+Math.sin(a)*d;if(pts.some(q=>Math.hypot(q.x-x,q.y-y)<50))continue;pts.push({x,y});list.push(foe(s,'f'+i,x,y));i++;} // spaced so nothing is pushed before the Bash lands
  const target=list.find(u=>inBashCone(s.hero,{x:u.x-750,y:u.y-575},u)&&Math.hypot(u.x-750,u.y-575)<=90);if(!target)continue;
  const ang=rnd()*Math.PI*2;const axisInput=rnd()<.5?{x:Math.cos(ang),y:Math.sin(ang)}:undefined;
  learn(s);cast(s,{targetId:target.id,...(axisInput?{direction:axisInput}:{})});ticks(s,1);
  const toT=Math.hypot(target.x-750,target.y-575),axis=axisInput&&inBashCone(s.hero,axisInput,target)?axisInput:{x:(target.x-750)/toT,y:(target.y-575)/toT};
  const predicted=bashVictims(s.hero,axis,list.filter(u=>Math.hypot(u.x-750,u.y-575)<=90&&s.skills.legalTarget(u,90)),target.id).map(u=>u.id).sort();
  ticks(s,8);const hit=list.filter(u=>dealt(u)>0).map(u=>u.id).sort();assert.deepEqual(hit,predicted,'run '+run);}});

test('Bash never adds an attack and loses at most one: the cycle against a plain auto-attack, for every cast offset',()=>{
 const run=(offset)=>{const s=fixture(),e=foe(s,'e',790,575,100000);learn(s);s.send({type:'attack'});let basic=0,bash=0;
  for(let t=0;t<240;t++){if(offset>=0&&t===offset)cast(s,{targetId:'e'});ticks(s,1);for(const ev of s.drainEvents())if(ev.type==='damage'&&ev.sourceId==='guardian'){if(ev.castId)bash++;else basic++;}}
  return {basic,bash,e};};
 const base=run(-1);assert.ok(base.basic>=9);
 for(let k=0;k<23;k++){const r=run(k);assert.equal(r.bash,1,'offset '+k);assert.ok(r.basic<=base.basic,'no extra attack at offset '+k);assert.ok(base.basic-r.basic<=1,'at most one attack lost at offset '+k);}});

test('Bash lands in place of the swing it cuts off, then the next swing starts the tick the 6-tick lock ends',()=>{
 const s=fixture(),e=foe(s,'e',790,575,100000);learn(s);s.send({type:'attack'});ticks(s,2);assert.ok(s.hero.strike,'a swing is in flight');
 const accepted=s.clock.tick+1;cast(s,{targetId:'e'});ticks(s,1);assert.equal(s.hero.strike,undefined);assert.equal(s.state.skills.lockTick,accepted+6);
 ticks(s,6);assert.equal(s.hero.strike.atTick,accepted+6+6);assert.equal(s.hero.readyTick,accepted+6+23);});
