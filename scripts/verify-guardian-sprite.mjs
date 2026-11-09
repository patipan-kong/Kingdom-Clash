// Guardian V1.0 sprite animation and MOBA aiming in the browser, in Chapter 5 Mission 6 (?debug=1&level=46). Needs a dev server: SPRITE_URL=http://127.0.0.1:5401/
// Checks the sheet and its size in game, idle/walk frames and facing from the stick, the feet staying put on a turn (rendered pixels), the attack contact frame
// against the simulation's damage, Bash/Taunt/Protect contact frames against cast-effect, the Charge brace and dash, hurt, death and respawn, pause, the HP bar
// never moving with the art, Bash and Charge drag aiming, cancel by the cancel target, Esc and a right click, and taps on the Guardian. With SPRITE_BASELINE_URL
// (a server of origin/main) it also samples the debug FPS line of both at the Galaxy S24 landscape viewport; headless figures only compare the builds.
import {chromium} from '@playwright/test';
const base=process.env.SPRITE_URL||'http://127.0.0.1:5401/',baseline=process.env.SPRITE_BASELINE_URL,seconds=Number(process.env.SPRITE_SECONDS||20);
let failed=0;
const check=(ok,name,detail)=>{if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'} ${name}${detail===undefined?'':' '+JSON.stringify(detail)}`);};
async function open(browser,url,q,options={viewport:{width:960,height:540},hasTouch:true}){
 const ctx=await browser.newContext(options),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${url}?debug=1&${q}`);
 await page.waitForFunction(()=>window.kingdomGame?.scene.isActive('Battle')&&window.kingdomGame.scene.getScene('Battle').campaignLevel&&window.kingdomGame.scene.getScene('Battle').simulation?.state.match.phase==='playing'&&window.kingdomGame.scene.getScene('Battle').simulation.clock.tick>5,null,{timeout:30000});
 await page.evaluate(()=>{window.B=window.kingdomGame.scene.getScene('Battle');window.H=window.kingdomGame.scene.getScene('HUD');window.S=B.simulation;window.frames=n=>new Promise(r=>{const f=()=>--n<=0?r():requestAnimationFrame(f);requestAnimationFrame(f);});
  // Every frame: the Guardian's frame, alpha and facing, and the simulation events that frame drained.
  window.log=[];const u=B.sys.sceneUpdate;B.sys.sceneUpdate=function(t,d){u.call(this,t,d);const a=B.guardianArt;log.push({t:B.elapsed,tick:S.clock.tick,frame:+a?.frame.name,alpha:a?.alpha,sx:a?.scaleX,events:B.lastEvents??[]});B.lastEvents=[];};
  const drain=S.drainEvents.bind(S);S.drainEvents=()=>{const e=drain();B.lastEvents=e.map(x=>({type:x.type,id:x.id,skill:x.skill,sourceId:x.sourceId,amount:x.amount}));return e;};
  window.sent=[];const send=S.send.bind(S);S.send=c=>{if(c.type==='cast')sent.push(c);return send(c);};
  // A clear field around the Guardian: remove every other unit so each check sees only what it sets up.
  window.clearField=()=>{for(const id of Object.keys(S.state.units))if(id!==S.hero.id)delete S.state.units[id];};
  window.foe=(id,dx,dy=0,hp=5000)=>{const h=S.hero,u={...S.unit(id,'minion-red',h.x+dx,h.y+dy,undefined,undefined,S.clock.tick),hp,maxHp:hp,speed:0,damage:0};S.state.units[id]=u;return u;};
  window.learnAll=()=>{const r=S.state.heroProgression.ranks;r.bash=r.bash||1;r.taunt=r.taunt||1;r.charge=r.charge||1;r.zone=r.zone||1;};
  window.readyAll=()=>{const s=S.state.skills;for(const k of Object.keys(s.ready))s.ready[k]=0;s.lockTick=0;s.cast=undefined;};
 });
 return {ctx,page,errors};
}
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--force-device-scale-factor=1']});
const {ctx,page,errors}=await open(browser,base,'level=46');
const GF=await page.evaluate(async()=>(await import('/src/world/guardianSprite.ts')).GF);

// 1. The sheet, the size in game and idle.
{
 const r=await page.evaluate(async()=>{clearField();await frames(20);const a=B.guardianArt;return {key:a?.texture.key,frames:a?.texture.frameTotal-1,height:+(a.displayHeight*B.cameras.main.zoom).toFixed(1),scale:a.scaleY,frame:+a.frame.name,origin:[+a.originX.toFixed(3),+a.originY.toFixed(3)],x:a.x};});
 check(r.key==='guardian-sheet'&&r.frames>=29,'the Guardian draws the 29-frame sheet',r);
 check(Math.abs(r.scale*210-105.6)<.5,'idle is drawn 105.6 px tall, the size of the old still',r);
 check(r.frame===GF.idle,'standing still shows idle',r.frame);
}
// 2. Walk and facing from the stick; the HP bar and ring never move with the art.
{
 const r=await page.evaluate(async()=>{const bar=B.hpBars.get(S.hero.id).bar,v=B.visuals.get(S.hero.id),rel=()=>[+(bar.x).toFixed(2),+(bar.y).toFixed(2)];const b0=rel();
  const seq=async(x,ms)=>{B.stick={x,y:0};const out=[];const t0=performance.now();while(performance.now()-t0<ms){await frames(1);out.push({f:+B.guardianArt.frame.name,sx:Math.sign(B.guardianArt.scaleX)});}B.stick={x:0,y:0};await frames(12);return out;};
  const st=S.state.structures,open=(x,y)=>{for(let d=-330;d<=330;d+=8)if(S.geo.blocked(x+d,y,S.hero.radius,st))return false;return true;};let spot;for(let y=300;y<1000&&!spot;y+=24)for(let x=500;x<1500&&!spot;x+=24)if(open(x,y))spot={x,y};S.hero.x=spot.x;S.hero.y=spot.y;await frames(10);
  const right=await seq(1,1000),left=await seq(-1,1000);const b1=rel();return {right,left,b0,b1,idle:+B.guardianArt.frame.name};});
 const walkR=new Set(r.right.slice(4).map(x=>x.f)),walkL=new Set(r.left.slice(4).map(x=>x.f)); // a second of walking on a line of open ground is two walk cycles
 check(GF.walk.every(f=>walkR.has(f))&&[...walkR].every(f=>GF.walk.includes(f)),'walking right cycles through all six walk frames',[...walkR]);
 check(r.right.slice(4).every(x=>x.sx===-1),'walking right mirrors the art (it is authored facing left)');
 check(r.left.slice(4).every(x=>x.sx===1)&&GF.walk.every(f=>walkL.has(f)),'walking left shows the authored facing and the walk',[...walkL]);
 check(r.idle===GF.idle,'stopping returns to idle',r.idle);
 check(r.b0[0]===r.b1[0]&&r.b0[1]===r.b1[1],'the HP bar never moves with the art',[r.b0,r.b1]);
}
// 3. A turn keeps the feet still, measured on rendered pixels: the art alone, facing each way, the midpoint of both soles (the lowest 8 rows: the far sole stands about 3.5 px higher) must not move.
{
 const r=await page.evaluate(async()=>{const v=B.visuals.get(S.hero.id),a=B.guardianArt,cam=B.cameras.main;S.advanceHeld=S.advance;S.advance=()=>{};await frames(90);cam.stopFollow();await frames(3); // the camera settles, then holds still for the snapshots
  const shot=()=>new Promise(res=>{const p=v.getWorldTransformMatrix?{x:v.x-cam.scrollX,y:v.y-cam.scrollY}:{x:0,y:0};B.game.renderer.snapshotArea(Math.round(p.x-90),Math.round(p.y-130),180,150,img=>{const c=document.createElement('canvas');c.width=180;c.height=150;const g=c.getContext('2d');g.drawImage(img,0,0);res(g.getImageData(0,0,180,150).data);});});
  const feet=async sx=>{a.scaleX=Math.abs(a.scaleX)*sx;a.setFrame(0);a.setVisible(true);await frames(2);const on=await shot();a.setVisible(false);await frames(2);const off=await shot();a.setVisible(true);
   let low=-1;const cols=[];for(let y=149;y>=0&&low<0;y--)for(let x=0;x<180;x++){const i=(y*180+x)*4;if(Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2])>40){low=y;break;}}
   for(let x=0;x<180;x++)for(let y=low;y>=low-8;y--){const i=(y*180+x)*4;if(Math.abs(on[i]-off[i])+Math.abs(on[i+1]-off[i+1])+Math.abs(on[i+2]-off[i+2])>40){cols.push(x);break;}}
   return {low,mid:(Math.min(...cols)+Math.max(...cols))/2};};
  B.animateGuardianHeld=B.animateGuardian;B.animateGuardian=()=>{};const l=await feet(1),rr=await feet(-1);B.animateGuardian=B.animateGuardianHeld;S.advance=S.advanceHeld;B.followHero();return {l,r:rr};});
 check(Math.abs(r.l.mid-r.r.mid)<=2&&Math.abs(r.l.low-r.r.low)<=1,'a turn mirrors about the feet: the feet stay within 2 px',r);
}
// 4. The basic attack: the contact frame shows on the frame the simulation applies the hit.
{
 const r=await page.evaluate(async()=>{clearField();foe('red-sprite-dummy',-70);S.send({type:'target',id:'red-sprite-dummy'});log.length=0;for(let i=0;i<10;i++){S.send({type:'attack'});await frames(15);}
  const hits=log.filter(l=>l.events.some(e=>e.type==='damage'&&e.sourceId===S.hero.id&&e.id==='red-sprite-dummy'));const starts=log.filter(l=>l.events.some(e=>e.type==='attack'&&e.id===S.hero.id));
  return {hits:hits.map(h=>h.frame),starts:starts.length,facing:log.slice(-5).map(l=>Math.sign(l.sx)),seen:[...new Set(log.map(l=>l.frame))]};});
 check(r.starts>=3&&r.hits.length>=3,'the Guardian attacks the dummy',{starts:r.starts,hits:r.hits.length});
 check(r.hits.every(f=>f===GF.attack[3]),'every hit lands on the attack contact frame',r.hits);
 check(GF.attack.every(f=>r.seen.includes(f)),'all four attack frames play',r.seen);
 check(r.facing.every(s=>s===1),'he faces the dummy on his left',r.facing);
}
// 5. Skills: Bash, Taunt and Protect land their contact frame on cast-effect; Charge braces and dashes.
{
 const r=await page.evaluate(async()=>{clearField();learnAll();const out={};
  for(const [skill,contact] of [['bash','bash'],['taunt','taunt'],['zone','protect']]){readyAll();foe('red-sprite-dummy',60);S.send({type:'target',id:'red-sprite-dummy'});log.length=0;S.send({type:'cast',skill,requestId:'v-'+skill+Math.random()});await frames(40);
   const at=log.find(l=>l.events.some(e=>e.type==='cast-effect'&&e.skill===skill));out[skill]={effect:at?.frame,seen:[...new Set(log.map(l=>l.frame))],facing:Math.sign(log.at(-20)?.sx??0)};}
  readyAll();clearField();log.length=0;S.send({type:'cast',skill:'charge',requestId:'v-charge',direction:{x:-1,y:0},distance:200});await frames(50);
  out.charge={seen:log.map(l=>l.frame),dashTicks:log.filter(l=>S.state.skills.cast?.skill==='charge').length};return out;});
 check(r.bash.effect===GF.bash[3],'Bash shows the impact frame when the stun lands',r.bash);
 check(r.taunt.effect===GF.taunt[2],'Taunt shows its defiance frame when the taunt lands',r.taunt);
 check(r.zone.effect===GF.protect[2],'Sanctuary shows its hold frame when the zone appears',r.zone);
 check(r.bash.facing===-1,'Bash turns him toward the foe on his right',r.bash.facing);
 check(r.charge.seen.includes(GF.charge[0])&&r.charge.seen.includes(GF.charge[1])&&r.charge.seen.includes(GF.charge[2]),'Charge braces, then alternates both dash frames',[...new Set(r.charge.seen)]);
}
// 6. Hurt, death and respawn.
{
 const r=await page.evaluate(async()=>{clearField();readyAll();S.state.skills.cast=undefined;await frames(20);const h=S.hero,src=foe('red-sprite-hitter',300);log.length=0;h.shield=undefined;S.state.skills.zones=[];S.hit(src,h,120);await frames(3);const hurt=+B.guardianArt.frame.name;
  S.hit(src,h,h.hp+10000);await frames(4);const d1=+B.guardianArt.frame.name;await frames(30);const d3=+B.guardianArt.frame.name,ringHidden=B.visuals.get(h.id).list.filter(c=>c!==B.guardianArt).every(c=>!c.visible);
  const t0=performance.now();while(B.guardianArt.alpha>0&&performance.now()-t0<4000)await frames(5);const faded=B.guardianArt.alpha;
  h.respawnTick=S.clock.tick+2;const t1=performance.now();let rise=[];while(performance.now()-t1<6000){await frames(1);if(h.hp>0){rise.push(+B.guardianArt.frame.name);if(rise.length>40)break;}}
  return {hurt,d1,d3,ringHidden,faded,rise:[...new Set(rise)],alive:h.hp>0};});
 check(r.hurt===GF.hurt,'a hit while idle shows the hurt flinch',r.hurt);
 check(r.d1===GF.death[0]&&r.d3===GF.death[2],'death staggers, then holds the fallen frame',r);
 check(r.ringHidden,'the ring, shadow and HP bar hide while he is down');
 check(r.faded===0,'the fallen Guardian fades out before the respawn',r.faded);
 check(r.alive&&r.rise[0]===GF.death[0]&&!r.rise.some(f=>GF.walk.includes(f))&&r.rise.includes(GF.rise)&&r.rise.includes(GF.idle),'respawn kneels, rises and stands',r.rise);
}
// 7. Pause freezes the frame.
{
 const r=await page.evaluate(async()=>{clearField();B.stick={x:1,y:0};await frames(20);H.setPause(true);await frames(3);const a=+B.guardianArt.frame.name;await frames(30);const b=+B.guardianArt.frame.name;H.setPause(false);B.stick={x:0,y:0};await frames(10);return {a,b};});
 check(r.a===r.b,'pause freezes the walk frame',r);
}
// 8. MOBA aiming with real pointer drags from the skill buttons (CSS px = canvas px at this viewport).
{
 const btn=id=>page.evaluate(id=>{const a=H.abilities.find(a=>a.id===id);return {x:a.x,y:a.y};},id);
 const drag=async(id,dx,dy,{cancel=false}={})=>{const b=await btn(id);await page.mouse.move(b.x,b.y);await page.mouse.down();for(let i=1;i<=8;i++){await page.mouse.move(b.x+dx*i/8,b.y+dy*i/8);await page.waitForTimeout(16);}
  if(cancel){const c=await page.evaluate(()=>B.aimCancel());await page.mouse.move(c.x,c.y);await page.waitForTimeout(30);}await page.mouse.up();await page.waitForTimeout(120);};
 await page.evaluate(()=>{clearField();learnAll();readyAll();foe('red-aim-left',-60,0);foe('red-aim-up',0,-60);sent.length=0;});
 await drag('bash',0,-60);
 let s=await page.evaluate(()=>sent.splice(0));check(s.length===1&&s[0].targetId==='red-aim-up','dragging Bash up picks the foe above him',s);
 await page.evaluate(()=>readyAll());await drag('bash',-60,0);
 s=await page.evaluate(()=>sent.splice(0));check(s.length===1&&s[0].targetId==='red-aim-left','dragging Bash left picks the foe on his left',s);
 await page.evaluate(()=>{readyAll();clearField();});await drag('bash',-60,0);
 s=await page.evaluate(()=>sent.splice(0));check(s.length===0,'a Bash drag with nobody in reach casts nothing (no cooldown)',s);
 await page.evaluate(()=>readyAll());await drag('charge',-36,0);
 s=await page.evaluate(()=>sent.splice(0));const max=await page.evaluate(()=>[144,168,192,216,240][S.state.heroProgression.ranks.charge-1]);
 check(s.length===1&&s[0].direction.x<-.99&&Math.abs(s[0].distance-max/2)<2,'a half drag left charges left half the distance',{s,max});
 await page.evaluate(()=>readyAll());await drag('charge',-200,0);
 s=await page.evaluate(()=>sent.splice(0));check(s.length===1&&Math.abs(s[0].distance-max)<1e-6,'a long drag charges the full distance',s);
 await page.evaluate(()=>readyAll());await drag('charge',-60,-20,{cancel:true});
 s=await page.evaluate(()=>sent.splice(0));check(s.length===0,'releasing on the cancel target casts nothing',s);
 await page.evaluate(()=>readyAll());{const b=await btn('charge');await page.mouse.move(b.x,b.y);await page.mouse.down();await page.mouse.move(b.x-60,b.y,{steps:6});await page.keyboard.press('Escape');await page.mouse.up();await page.waitForTimeout(100);}
 s=await page.evaluate(()=>sent.splice(0));check(s.length===0,'Esc while aiming casts nothing',s);
 await page.evaluate(()=>readyAll());{const b=await btn('charge');await page.mouse.move(b.x,b.y);await page.mouse.down();await page.mouse.move(b.x-60,b.y,{steps:6});await page.mouse.down({button:'right'});await page.mouse.up({button:'right'});await page.mouse.up();await page.waitForTimeout(100);}
 s=await page.evaluate(()=>sent.splice(0));check(s.length===0,'a right click while aiming casts nothing',s);
 await page.evaluate(()=>{readyAll();foe('red-aim-left',-60,0);});{const b=await btn('bash');await page.mouse.click(b.x,b.y);await page.waitForTimeout(100);}
 s=await page.evaluate(()=>sent.splice(0));check(s.length===1&&!s[0].targetId,'a tap still smart-casts Bash (the simulation picks the target)',s);
 const aimFace=await page.evaluate(async()=>{readyAll();const b=H.abilities.find(a=>a.id==='charge');B.drawAim('charge',{x:b.x+60,y:b.y},true,{x:b.x,y:b.y});await frames(3);const f=Math.sign(B.guardianArt.scaleX);B.drawAim('charge');return f;});
 check(aimFace===-1,'aiming right turns him right before the cast',aimFace);
 // 8b. Bash is a 120 degree, 90 px cone: the drawn sector, the highlighted foes and the foes actually hit are the same set.
 {
  const ARITY={0:6,1:0,2:0,3:4,4:2,5:2,6:3,7:2,8:0,9:0,10:6,11:6};
  await page.evaluate(()=>{clearField();learnAll();readyAll();sent.length=0;
   foe('c-p',-60,0,5000);foe('c-a',-50,26,5000);foe('c-b',-48,-28,5000);foe('c-out',0,70,5000);foe('c-behind',60,0,5000);foe('c-far',-96,0,5000);});
  const b0=await btn('bash');
  await page.mouse.move(b0.x,b0.y);await page.mouse.down();for(let i=1;i<=8;i++){await page.mouse.move(b0.x-60*i/8,b0.y);await page.waitForTimeout(16);}await page.waitForTimeout(80);
  const held=await page.evaluate((A)=>{
   const buf=B.skillAim.commandBuffer,paths=[];let cur;
   for(let i=0;i<buf.length;){const c=buf[i],n=A[c];if(n===undefined)return {error:'unknown command '+c};if(c===1)paths.push(cur=[]);if((c===4||c===5)&&cur)cur.push({x:buf[i+1],y:buf[i+2]});i+=1+n;}
   const py=0.72,h={x:S.hero.x,y:S.hero.y*py};
   const sector=paths.find(p=>p.length>=19&&Math.abs(p[0].x-h.x)<.01&&Math.abs(p[0].y-h.y)<.01);
   if(!sector)return {error:'no sector path',paths:paths.map(p=>p.length)};
   const arc=sector.slice(1).map(q=>{const x=q.x-h.x,y=(q.y-h.y)/py;let a=Math.atan2(y,x)*180/Math.PI;if(a<0)a+=360;return {r:Math.hypot(x,y),a};});
   const prev=B.bashPreview({x:-1,y:0});
   return {n:arc.length,rMin:Math.min(...arc.map(q=>q.r)),rMax:Math.max(...arc.map(q=>q.r)),aMin:Math.min(...arc.map(q=>q.a)),aMax:Math.max(...arc.map(q=>q.a)),primary:prev.primary?.id,victims:prev.victims.map(u=>u.id).sort()};},ARITY);
  check(!held.error&&held.n===19&&Math.abs(held.rMin-90)<.01&&Math.abs(held.rMax-90)<.01&&Math.abs(held.aMin-120)<.01&&Math.abs(held.aMax-240)<.01,'the drawn sector is the real hit area: radius 90 px, 60 degrees either side of the aim',held);
  await page.mouse.up();await page.waitForTimeout(330);
  const res=await page.evaluate(()=>{const c=S.state.units,ids=['c-p','c-a','c-b','c-out','c-behind','c-far'];return {dmg:Object.fromEntries(ids.map(id=>[id,Math.round((5000-c[id].hp)*100)/100])),stun:Object.fromEntries(ids.map(id=>[id,!!c[id].statuses?.length]))};});
  const hit=Object.keys(res.dmg).filter(k=>res.dmg[k]>0).sort();
  check(JSON.stringify(hit)===JSON.stringify(held.victims),'the foes highlighted while aiming are exactly the foes the Bash hurt',{highlighted:held.victims,hurt:hit,dmg:res.dmg});
  check(res.dmg['c-p']===80&&res.dmg['c-a']===48&&res.dmg['c-b']===48&&res.dmg['c-out']===0&&res.dmg['c-behind']===0&&res.dmg['c-far']===0,'the aimed foe took 100% (80), the others in the cone 60% (48); beside, behind and out of range took nothing',res.dmg);
  check(hit.every(k=>res.stun[k])&&!res.stun['c-out']&&!res.stun['c-behind']&&!res.stun['c-far'],'every foe hit is stunned and nobody else is',res.stun);
  const none=await page.evaluate((A)=>{clearField();readyAll();foe('c-lone',0,80,5000);const b=H.abilities.find(a=>a.id==='bash');B.drawAim('bash',{x:b.x-60,y:b.y},true,{x:b.x,y:b.y});const buf=B.skillAim.commandBuffer;let amber=false;for(let i=0;i<buf.length;){const c=buf[i];if(c===7&&buf[i+1]===0xffc56a)amber=true;i+=1+A[c];}const n=B.bashPreview({x:-1,y:0}).victims.length;B.drawAim('bash');return {amber,preview:n};},ARITY);
  check(none.amber&&none.preview===0,'with no foe in the cone the sector turns amber and highlights nothing',none);
 }
}
// 9. A tap on the Guardian still reaches his art (the fixed hit box), and taps beside him reach the ground.
{
 const r=await page.evaluate(async()=>{clearField();await frames(5);const v=B.visuals.get(S.hero.id),cam=B.cameras.main,p={x:v.x-cam.scrollX,y:v.y-cam.scrollY};
  return {body:B.input.manager.hitTest({x:p.x,y:p.y-50},[B.guardianArt],cam).length>0,beside:B.input.manager.hitTest({x:p.x+90,y:p.y-50},[B.guardianArt],cam).length>0};});
 check(r.body&&!r.beside,'the Guardian is tappable on his body and not beside it',r);
}
check(errors.length===0,'no page errors',errors.slice(0,5));
await ctx.close();

// 10. FPS against origin/main at the S24 landscape viewport (780x360, DPR 3), Chapter 5 M6, with and without allyTest=stress.
if(baseline)for(const q of ['level=46','level=46&allyTest=stress']){
 const out={};for(const [name,url] of [['main',baseline],['sprite',base],['main',baseline],['sprite',base]]){const o=await open(browser,url,q,{viewport:{width:780,height:360},deviceScaleFactor:3,hasTouch:true,isMobile:true});
  const fps=await o.page.evaluate(async s=>{const ts=[];const t0=performance.now();let last=t0;await new Promise(r=>{const f=n=>{ts.push(n-last);last=n;if(n-t0<s*1000)requestAnimationFrame(f);else r();};requestAnimationFrame(f);});const m=ts.slice(10).reduce((a,b)=>a+b,0)/(ts.length-10);return +(1000/m).toFixed(1);},seconds);
  (out[name]??=[]).push(fps);await o.ctx.close();}
 console.log('FPS',q,JSON.stringify(out));
}
await browser.close();
console.log(failed?`${failed} FAILED`:'ALL PASS');process.exit(failed?1:0);
