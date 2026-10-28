// Chapter 3 C3-2 bot for Level 22. Same driver as the shared campaign bot's play(), with two differences the Frost Citadel needs: the walk home follows a grid route (the shared bot steers straight at the hold
// point and sticks on the bush at (1240,800) and the tree at (1420,968) south of the fortress), and the player recalls to the Azure Keep whenever Crimson comes near it, buys the three Shop items in order and keeps rebuilding towers.
// Lives outside tests/*.cjs, so scripts/test.mjs never runs it as a test file. The shared bot is unchanged. Preliminary evidence, not a human playtest.
const {HZ,DT,dist,route}=require('./campaignBot.cjs');
const {combatStructures}=require('../../.test-build/simulation/GameState.js');
const APPROACH=[[-75,0],[-70,-30],[-70,30],[-50,-60],[-50,60],[0,-80],[0,80]],KEEP_APPROACH=[[-112,0],[-108,-40],[-108,40],[0,-118],[0,118]];
const approach=(sim,t)=>{const st=combatStructures(sim.state),G=8;for(const [dx,dy] of t.id==='red-base'?KEEP_APPROACH:APPROACH){const x=Math.round((t.x+dx)/G)*G,y=Math.round((t.y+dy)/G)*G;if(!sim.geo.blocked(x,y,21,st))return {x:t.x+dx,y:t.y+dy};}return {x:t.x-(t.id==='red-base'?112:75),y:t.y};};
const CELLS=[[14,12],[14,11],[14,13],[13,12],[13,11],[13,13],[12,12],[12,11],[12,13],[11,12]],ITEMS=[['iron-sword',200],['guardian-shield',500],['siege-hammer',550]],KEEP={x:330,y:600};
function play(sim,maxTicks,{towers=0,cast={},leash=420,hold={x:540,y:600},gate=()=>false,targets=[],stop=()=>false,log=[]}={}){
 const s=sim.state,h=sim.hero;let n=0,path=null,wi=0,goalFor=null,spot=null,home=null,hi=0,homeAt=0;
 while(!sim.ended&&sim.clock.tick<maxTicks&&!stop(sim)){
  const t=sim.clock.tick,p=s.heroProgression;
  if(p.skillPoints>0){const sk=['bash','taunt','charge','zone'].find(k=>p.ranks[k]<1&&p.level>=(k==='zone'?6:1));if(sk)sim.send({type:'learn',requestId:'l'+(++n),skill:sk});}
  if(towers&&t%15===0&&s.wood>=80&&s.iron>=10&&Object.values(s.structures).filter(b=>b.team==='blue'&&b.kind==='tower').length<towers){const c=CELLS.find(([c,r])=>sim.placementReason('tower',c,r)==='');if(c)sim.send({type:'place',requestId:'p'+(++n),kind:'tower',col:c[0],row:c[1]});}
  if(h.hp>0&&t%10===0&&cast.bash&&p.ranks.bash&&sim.remaining('bash')===0&&Object.values(s.units).some(u=>u.team==='red'&&u.hp>0&&dist(u,h)<100))sim.send({type:'cast',skill:'bash',requestId:'c'+(++n)});
  const next=targets.map(id=>id==='red-base'?s.bases[id]:s.structures[id]).find(x=>x&&x.hp>0);
  if(h.hp>0){
   if(!next||gate(sim)){
    const foe=Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0&&dist(u,KEEP)<leash).sort((a,b)=>dist(a,h)-dist(b,h))[0],goal=foe??hold,d=dist(goal,h);
    let aim=goal;
    if(d>200){if(!home||t>=homeAt){try{home=route(sim,{x:Math.min(goal.x,1100),y:goal.y});}catch{home=null;}hi=0;homeAt=t+30;}if(home){while(hi<home.length&&dist(h,home[hi])<14)hi++;if(hi<home.length)aim=home[hi];}}else home=null;
    const da=dist(aim,h);sim.send({type:'move',...(da>(aim===goal&&foe?70:aim===goal?30:1)?{x:(aim.x-h.x)/da,y:(aim.y-h.y)/da}:{x:0,y:0})});sim.send({type:'attack'});path=null;
   }else{
    home=null;
    if(goalFor!==next.id||!path){goalFor=next.id;spot=approach(sim,next);path=route(sim,spot);wi=0;}
    const goal=wi<path.length?path[wi]:spot;if(wi<path.length&&dist(h,goal)<14)wi++;
    const d=dist(goal,h),k=Math.min(1,d/(280/HZ))/(d||1);
    sim.send({type:'target',id:next.id});sim.send({type:'attack'});sim.send({type:'move',...(d>1?{x:(goal.x-h.x)*k,y:(goal.y-h.y)*k}:{x:0,y:0})});
   }
  }
  if(h.hp<=0){path=null;home=null;}
  sim.advance(DT);for(const e of sim.drainEvents())log.push({at:sim.clock.tick,...e});
 }
 return log;
}
// One recorded match: `targets` is the order the player attacks (structure ids), `recall` the Azure Keep radius inside which a Crimson unit sends the Guardian home, `maxTowers` the towers kept standing,
// `homeUntil` is the tick before which the player stays home building towers (Level 22 has no Hold phase, so this is the player's own choice), `raidUntil` ignores every threat before that tick. Returns the log plus the figures the tests quote.
function siege(sim,{targets,recall=420,maxTowers=4,homeUntil=3000,raidUntil=0,cap=600}){
 const s=sim.state,log=[],bought=[];let n=0,maxLive=0,azureMin=3000;
 const threat=()=>Object.values(s.units).some(u=>u.team==='red'&&u.hp>0&&dist(u,KEEP)<recall);
 const gate=x=>x.clock.tick>=raidUntil&&(x.clock.tick<homeUntil||threat());
 const stop=x=>{maxLive=Math.max(maxLive,Object.values(s.units).filter(u=>u.team==='red'&&u.hp>0).length);azureMin=Math.min(azureMin,s.bases['blue-base'].hp);
  if(bought.length<ITEMS.length){const [id,price]=ITEMS[bought.length];if(s.gold>=price&&!sim.shopAccessReason()){sim.send({type:'buy-item',matchId:s.inventory.matchId,heroId:s.inventory.ownerHeroId,requestId:'b'+(++n),itemId:id});bought.push(id);}}
  return false;};
 play(sim,cap*HZ,{towers:maxTowers,cast:{bash:true},leash:650,hold:{x:620,y:600},targets,gate,stop,log});
 const at=id=>log.find(e=>e.type==='death'&&e.id===id)?.at;
 return {log,at,bought,maxLive,azureMin,seconds:sim.outcome?sim.outcome.tick/HZ:null,deaths:log.filter(e=>e.type==='death'&&e.id==='guardian').length,gold:log.filter(e=>e.type==='reward').reduce((a,e)=>a+e.gold,0),
  towersLost:log.filter(e=>e.type==='death'&&String(e.id).startsWith('built-')).length};
}
module.exports={siege};
