// Chapter 4 M6 "Crimson Fortress" regression bot (docs/CHAPTER4_M6.md), basinBot.cjs adapted to campaign-36: home towers, the outposts in `order`, the second and the ruined Barracks, then the Fortress Gate and the Keep.
// A deterministic player that plays the production level through commands only. Plans:
//  defend = after each Shadowblade warning, meet it at its target; fight the Iron Marshal once he reaches the Azure plain
//  ignore = never chase the Shadowblade (the Marshal and the Keep are still defended)
//  rush   = after the captures go straight for the gate and the Keep, defending only the Keep itself
// Results are bot behaviour, not human-playtest outcomes; they guard against regressions, not for balance sign-off.
const {Simulation}=require('../../.test-build/simulation/Simulation.js');
const {combatStructures}=require('../../.test-build/simulation/GameState.js');
const {campaign}=require('../../.test-build/data/campaignLevels.js');
const {route,dist,DT,HZ}=require('./campaignBot.cjs');
const HOME=[[12,9],[12,15],[13,11],[13,13]],KEEP={x:330,y:600},ITEMS=[['iron-sword',200],['guardian-shield',500],['siege-hammer',550]];
const APPROACH=[[-75,0],[-70,-30],[-70,30],[-50,-60],[-50,60],[0,-80],[0,80],[75,0]],KEEP_APPROACH=[[-112,0],[-108,-40],[-108,40],[0,-118],[0,118]];
const COMMANDERS=['red-marshal','red-shadowblade'];
const at=t=>+(t/HZ).toFixed(1);
function run(o={}){
 o={plan:'defend',order:['south','north'],homeTowers:2,ruin:true,second:true,cap:900,...o};
 const setup=campaign.setup(36);if(o.tune)o.tune(setup);
 const sim=new Simulation('c4m6',setup,o.seed),s=sim.state,h=sim.hero;
 const m={capture:{},lost:[],guardianDeaths:0,structuresLost:[],commander:[],kills:{},downtime:[],lastStand:0,keepDamage:{},nav:{}};
 const red=()=>Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0);
 let n=0,path=null,pathKey='',pathAt=0,wi=0;
 const goTo=(goal,stopAt=8)=>{const key=Math.round(goal.x/24)+','+Math.round(goal.y/24),t=sim.clock.tick;
  if(key!==pathKey||t>=pathAt){try{path=route(sim,goal);}catch{path=[goal];}pathKey=key;pathAt=t+45;wi=0;}
  while(wi<path.length-1&&dist(h,path[wi])<14)wi++;const aim=path[Math.min(wi,path.length-1)]??goal,d=dist(aim,h),final=wi>=path.length-1;
  sim.send({type:'move',...(d>(final?stopAt:1)?{x:(aim.x-h.x)/d*Math.min(1,d/(280/HZ)),y:(aim.y-h.y)/d*Math.min(1,d/(280/HZ))}:{x:0,y:0})});};
 const approach=t=>{const st=combatStructures(s);for(const [dx,dy] of t.id==='red-base'?KEEP_APPROACH:APPROACH){const p={x:t.x+dx,y:t.y+dy};if(!sim.geo.blocked(Math.round(p.x/8)*8,Math.round(p.y/8)*8,21,st))return p;}return {x:t.x-75,y:t.y};};
 const fight=(foe,stop=40)=>{sim.send({type:'target',id:foe.id});sim.send({type:'attack'});goTo(foe,stop);};
 const strike=t=>{sim.send({type:'target',id:t.id});sim.send({type:'attack'});goTo(approach(t));};
 const place=(kind,col,row)=>{if(sim.placementReason(kind,col,row)!=='')return false;sim.send({type:'place',requestId:'p'+(++n),kind,col,row});return true;};
 let alert=null,bothDown=null;const idle={};const fort={down:0,up:0},ticks={down:0,up:0};
 while(!sim.ended&&sim.clock.tick<o.cap*HZ){
  const t=sim.clock.tick,p=s.heroProgression,ps=sim.postStates;
  if(t%15===0){ // spending: home towers, then the ruined Barracks, the second Barracks, one tower on each Azure outpost's ruin
   const towers=HOME.filter(([c,r])=>Object.values(s.structures).some(b=>b.kind==='tower'&&b.team==='blue'&&b.col===c&&b.row===r&&b.hp>0)).length;
   if(towers<o.homeTowers){const cell=HOME.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(cell)place('tower',...cell);}
   else if(o.ruin&&ps.find(q=>q.id==='south').owner==='azure'&&place('barracks',19,19)){}
   else if(o.second&&place('barracks',10,14)){}
   else for(const [i,q] of ps.entries())if(q.owner==='azure'&&place('tower',sim.camps[i].ruin.col,sim.camps[i].ruin.row))break;
  }
  if(p.skillPoints>0){const sk=['bash','taunt','charge','zone'].find(k=>p.ranks[k]<1&&p.level>=(k==='zone'?6:1));if(sk)sim.send({type:'learn',requestId:'l'+(++n),skill:sk});}
  if(h.hp>0){
   const near=red().filter(u=>dist(u,h)<110);
   if(t%10===0&&p.ranks.bash&&sim.remaining('bash')===0&&near.length)sim.send({type:'cast',skill:'bash',requestId:'c'+(++n)});
   if(t%10===0&&p.ranks.taunt&&sim.remaining('taunt')===0&&near.some(u=>COMMANDERS.includes(u.id)))sim.send({type:'cast',skill:'taunt',requestId:'c'+(++n)});
   const bought=m.bought??=[];if(bought.length<ITEMS.length){const [id,price]=ITEMS[bought.length];if(s.gold>=price&&!sim.shopAccessReason()){sim.send({type:'buy-item',matchId:s.inventory.matchId,heroId:s.inventory.ownerHeroId,requestId:'b'+(++n),itemId:id});bought.push(id);}}
   const shadow=s.units['red-shadowblade'],marshal=s.units['red-marshal'];
   const homeFoe=red().filter(u=>dist(u,KEEP)<420).sort((a,b)=>Number(COMMANDERS.includes(b.id))-Number(COMMANDERS.includes(a.id))||dist(a,h)-dist(b,h))[0];
   const guarded=alert&&(s.structures[alert]??s.bases[alert]);
   const next=o.order.find(id=>ps.find(q=>q.id===id).owner!=='azure'),camp=next&&sim.camps.find(c=>c.id===next);
   const gate=s.structures['red-fortress-gate'];
   if(homeFoe&&(o.plan!=='rush'||dist(homeFoe,KEEP)<300))fight(homeFoe);
   else if(o.plan==='defend'&&guarded&&guarded.hp>0){if(shadow&&dist(shadow,guarded)<400)fight(shadow);else goTo({x:guarded.x-60,y:guarded.y},20);}
   else if(o.plan==='defend'&&marshal&&marshal.x<760)fight(marshal);
   else if(camp){const holder=camp.holders.map(id=>s.structures[id]).find(b=>b?.hp>0);if(holder)strike(holder);else{sim.send({type:'attack'});goTo({x:camp.flag.x,y:camp.flag.y+(camp.flag.y<600?60:-60)},4);}}
   else{const foe=red().find(u=>dist(u,h)<90);if(foe)fight(foe);else if(gate?.hp>0)strike(gate);else{const tw=['c6-gate-north','c6-gate-south'].map(id=>s.structures[id]).find(b=>b?.hp>0);strike(tw??s.bases['red-base']);}}
  }else sim.send({type:'move',x:0,y:0});
  sim.advance(DT);
  const both=COMMANDERS.every(id=>!(s.units[id]?.hp>0));
  for(const e of sim.drainEvents()){const when=at(sim.clock.tick);
   if(e.type==='commander'){m.commander.push({at:when,id:e.id.slice(4),change:e.change,lane:e.lane,...(e.targetId&&{target:e.targetId})});if(e.id==='red-shadowblade'&&e.change==='warning')alert=e.targetId;if(e.id==='red-shadowblade'&&e.change==='down')alert=null;}
   if(e.type==='post'&&e.change==='captured')m.capture[e.camp]??=when;
   if(e.type==='post'&&e.change==='lost')m.lost.push([e.camp,when]);
   if(e.type==='death'){if(e.id==='guardian')m.guardianDeaths++;if(COMMANDERS.includes(e.id))m.kills[e.id.slice(4)]=(m.kills[e.id.slice(4)]??0)+1;if(e.id===alert&&e.id!=='blue-base')alert=null;
    if(COMMANDERS.includes(e.sourceId)&&!e.id.startsWith('blue-')&&e.id!=='guardian')m.structuresLost.push([e.id,e.sourceId.slice(4),when]);if(e.id==='red-fortress-gate')m.gateDown=when;}
   if(e.type==='damage'&&e.id==='blue-base'){const k=COMMANDERS.includes(e.sourceId)?e.sourceId.slice(4):e.sourceId.includes('-escort-')?'escort':'waves';m.keepDamage[k]=Math.round((m.keepDamage[k]??0)+e.amount);}
   if(e.type==='damage'&&e.sourceId==='guardian'&&(e.id==='red-fortress-gate'||e.id==='red-base'||e.id.startsWith('c6-gate')))fort[both?'down':'up']+=e.amount;
   if(e.type==='spawn'&&/^red-g\d/.test(e.id))m.lastStand++;
   if(e.type==='match-end')m.end={outcome:e.outcome,at:at(e.tick)};}
  if(t>=150*HZ)ticks[both?'down':'up']++;
  if(both&&t>=150*HZ&&bothDown===null)bothDown=t;if(!both&&bothDown!==null){m.downtime.push({from:at(bothDown),s:at(t-bothDown),crimson:red().length});bothDown=null;}
  // navigation watch: a Commander, escort or Azure soldier that neither moves nor strikes for 10 s
  for(const u of Object.values(s.units)){if(!(COMMANDERS.includes(u.id)||u.escortOf||u.id.startsWith('blue-s-')))continue;const q=idle[u.id]??={x:u.x,y:u.y,since:t,ready:u.readyTick};
   if(Math.hypot(u.x-q.x,u.y-q.y)>1||u.readyTick!==q.ready){q.x=u.x;q.y=u.y;q.since=t;q.ready=u.readyTick;}else if(t-q.since===10*HZ){const ref=h.hp>0?h:s.bases['blue-base'];if(!(u.id.startsWith('blue-s-')&&dist(u,ref)>=380))m.nav[u.id]=[Math.round(u.x),Math.round(u.y),at(t)];}} // a soldier held at the 400 px leash is waiting by design (SoldierProto), not stuck
 }
 m.end??={outcome:'timeout',at:o.cap};m.keepHp=Math.round(s.bases['blue-base'].hp);m.level=s.heroProgression.level;
 m.window={downShare:+(ticks.down/Math.max(1,ticks.down+ticks.up)).toFixed(2),fortressDpsDown:+(fort.down/Math.max(1,ticks.down/HZ)).toFixed(1),fortressDpsUp:+(fort.up/Math.max(1,ticks.up/HZ)).toFixed(1)};
 return m;
}
module.exports={run};
