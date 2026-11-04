// Chapter 5 Phase 0B (docs/CHAPTER5_HERO_HUD.md): a mockup of the Hero Command HUD drawn into the real running game, at the real phone landscape layout. Nothing in src/ changes:
// the script opens ?debug=1&level=34&allyTest=1 (Fortress Approach: an open road with a gatehouse and towers in view), reads the live HUD layout (HUD.controls, HUD.guardianLayout, the canvas scale) and draws the proposed hero bar, command popover and target modes with Phaser objects,
// then screenshots each state. Needs a dev server: ALLY_URL=http://127.0.0.1:5371/  Stills go to HUD_EVIDENCE (default the OS temp dir).
import {chromium} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const base=process.env.ALLY_URL||'http://127.0.0.1:5371/',dir=process.env.HUD_EVIDENCE||`${tmpdir()}/hero-hud`;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
// The proposal's layout, in the HUD's logical 960x540 space, from the live controls and the CSS scale. Kept here (and in the doc) as the spec for src/ui/heroBarLayout.ts.
const layoutFn=`(H,n)=>{
 const c=window.kingdomGame.canvas.getBoundingClientRect(),s=c.height/540,p=v=>v/s,short=c.height<360,m=H.controls,j=m.joystick;
 const hit=short?22:24,r=short?16:19,gap=short?4:8,rowY=540-p(m.bottomCssInset+hit+4),x0=j.x+j.radius+p(hit+12),pitch=p(2*hit+gap);
 const slots=[...Array(n).keys()].map(i=>({x:x0+i*pitch,y:rowY,r:p(r),hit:p(hit)}));
 const bash=m.abilities.find(a=>a.id==='bash'),util=m.utilities.reduce((a,u)=>Math.max(a,u.x+u.hitRadius),0);
 const bw=p(short?48:60),bh=p(48),bg=p(6),w=3*bw+2*bg,left=Math.max(util+p(6),Math.min(x0-p(hit),bash.x-bash.hitRadius-p(6)-w));
 const pop={left,top:rowY-p(hit)-p(10)-bh,w,h:bh,bw,bg,icon:true};
 // The target-mode prompt takes the popover's place above the portraits (the top centre belongs to the notice channel: wave and Commander warnings).
 const banner={left:pop.left,right:bash.x-bash.hitRadius-p(6),y:pop.top+pop.h/2,h:p(40),cancel:p(22),font:p(short?13:15)};
 return {s,short,slots,pop,banner,bashLeft:bash.x-bash.hitRadius,joy:j,util};
}`;
for(const [w,h] of [[780,360],[780,250]]){
 const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,hasTouch:true,isMobile:true}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${base}?debug=1&level=34&allyTest=1`);
 await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));
 // A scene with enemies in view: the Guardian on the road before the Forward Gatehouse, the three Knights beside him, a few Crimson soldiers coming.
 await page.evaluate(()=>{const B=window.kingdomGame.scene.getScene('Battle'),S=B.simulation;window.B=B;window.S=S;
  const st={...S.state.structures,...S.state.bases},open=(x,y,r)=>{for(let k=0;k<6;k++)for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]){const q={x:x+dx*24*k,y:y+dy*24*k};if(!S.geo.blocked(q.x,q.y,r,st))return q;}return {x,y};};
  const g0=open(860,600,20);B.setHeroPosition(g0.x,g0.y);S.hero.hp=S.hero.maxHp=1e6;
  const ids=Object.keys(S.state.units).filter(i=>i.startsWith('blue-h-'));[[790,560],[800,650],[730,600]].forEach(([x,y],k)=>{const u=S.state.units[ids[k]],q=open(x,y,20);if(u){u.x=q.x;u.y=q.y;}});
  S.orderAlly(ids[1],{type:'attack',targetId:'c4-fwd-north'});S.orderAlly(ids[2],{type:'defend',...open(720,600,20)});
  ['red-w1-a','red-w1-b','red-w1-c'].forEach((id,k)=>{const q=open(960+k*30,560+k*44,12);S.spawnQueue.push({tick:S.clock.tick,team:'red',id,x:q.x,y:q.y,wave:0});});
  for(let i=0;i<4;i++)S.advance(1000/30+.01);B.syncUnits();S.advance=()=>{};/* frozen for the stills, without the Paused state */});
 await page.waitForTimeout(600);
 await page.evaluate(`window.L=${layoutFn}`);
 // Mock drawing (HUD scene for the bar, Battle scene for world markers). draw(state) clears the previous mock first.
 await page.evaluate(()=>{
  const H=window.kingdomGame.scene.getScene('HUD'),B=window.B,S=window.S,GOLD=0xdcbf7a,INK=0x122d35,RIM=0xc1d5c2,RED=0xff6b5b,BLUE=0x59ceff,font=(px,c='#fff3d3',bold=true)=>({fontFamily:'Arial, sans-serif',fontSize:px+'px',color:c,fontStyle:bold?'bold':'normal'});
  const objs=[];const keep=o=>{objs.push(o);return o;};
  const ids=()=>Object.keys(S.state.units).filter(i=>i.startsWith('blue-h-')).sort();
  const view=(x,y)=>({x,y:y*.72});
  // Order glyphs drawn with Graphics so every device renders them the same.
  const glyph=(g,type,x,y,k,color)=>{g.lineStyle(Math.max(1.5,k*.18),color,1);
   if(type==='follow'){for(const d of [-.35,.25]){g.beginPath();g.moveTo(x+(d-.2)*k,y-.4*k);g.lineTo(x+(d+.2)*k,y);g.lineTo(x+(d-.2)*k,y+.4*k);g.strokePath();}}
   else if(type==='attack'){g.beginPath();g.moveTo(x-.45*k,y+.45*k);g.lineTo(x+.45*k,y-.45*k);g.moveTo(x+.45*k,y+.45*k);g.lineTo(x-.45*k,y-.45*k);g.strokePath();g.lineBetween(x-.5*k,y+.15*k,x-.15*k,y+.5*k);g.lineBetween(x+.5*k,y+.15*k,x+.15*k,y+.5*k);}
   else {g.beginPath();g.moveTo(x,y-.5*k);g.lineTo(x+.42*k,y-.32*k);g.lineTo(x+.36*k,y+.12*k);g.lineTo(x,y+.52*k);g.lineTo(x-.36*k,y+.12*k);g.lineTo(x-.42*k,y-.32*k);g.closePath();g.strokePath();}};
  const portrait=(sl,u,selected,dim,cancel)=>{
   const g=keep(H.add.graphics().setDepth(900));
   if(selected){g.fillStyle(GOLD,.22);g.fillCircle(sl.x,sl.y,sl.r+9);}
   g.fillStyle(INK,.92);g.fillCircle(sl.x,sl.y,sl.r);
   const tex=H.textures.get('guardian').getSourceImage(),img=keep(H.add.image(sl.x,sl.y-sl.r*1.05,'guardian').setOrigin(.5,0).setDepth(901));
   img.setScale(sl.r*2/(tex.height*.5));const shape=keep(H.make.graphics({add:false}));shape.fillStyle(0xffffff,1);shape.fillCircle(sl.x,sl.y,sl.r-1);img.setMask(shape.createGeometryMask()); // head and shoulders inside the rim
   const ring=keep(H.add.graphics().setDepth(902));ring.lineStyle(selected?4:2,selected?GOLD:RIM,selected?1:.8);ring.strokeCircle(sl.x,sl.y,sl.r);
   // HP under the portrait, order badge at its lower right
   const hpW=sl.r*1.8,f=Math.max(0,u.hp/u.maxHp);ring.fillStyle(0x0b1a1f,.9);ring.fillRect(sl.x-hpW/2,sl.y+sl.r+4,hpW,6);ring.fillStyle(0x6fe3a8,1);ring.fillRect(sl.x-hpW/2,sl.y+sl.r+4,hpW*f,6);
   const bx=sl.x+sl.r*.78,by=sl.y+sl.r*.62,br=sl.r*.42;ring.fillStyle(INK,1);ring.fillCircle(bx,by,br);ring.lineStyle(2,RIM,.9);ring.strokeCircle(bx,by,br);glyph(ring,u.ally.order.type,bx,by,br*1.15,u.ally.order.type==='attack'?RED:u.ally.order.type==='defend'?BLUE:0xfff3d3);
   if(dim){ring.fillStyle(0x020810,.45);ring.fillCircle(sl.x,sl.y,sl.r);}
   if(selected&&cancel){ring.fillStyle(0x3a1f22,.72);ring.fillCircle(sl.x,sl.y,sl.r);const k=sl.r*.42;ring.lineStyle(4,0xffe3dc,1);ring.lineBetween(sl.x-k,sl.y-k,sl.x+k,sl.y+k);ring.lineBetween(sl.x+k,sl.y-k,sl.x-k,sl.y+k);}
  };
  const button=(x,y,w,h,type,label,active,icon)=>{
   const g=keep(H.add.graphics().setDepth(910));g.fillStyle(active?0x265460:INK,.95);g.fillRoundedRect(x,y,w,h,8);g.lineStyle(2,active?GOLD:RIM,active?1:.7);g.strokeRoundedRect(x,y,w,h,8);
   const color=type==='attack'?RED:type==='defend'?BLUE:0xfff3d3;
   if(icon){glyph(g,type,x+w/2,y+h*.42,h*.42,color);keep(H.add.text(x+w/2,y+h-4,label,font(Math.round(h*.2))).setOrigin(.5,1).setDepth(911));}
   else{glyph(g,type,x+h*.42,y+h/2,h*.42,color);keep(H.add.text(x+h*.8,y+h/2,label,font(Math.round(h*.3))).setOrigin(0,.5).setDepth(911));}
  };
  const banner=(L,type,text,color)=>{
   const b=L.banner,t=keep(H.add.text(0,0,text,font(Math.round(b.font))).setDepth(921)),tw=b.h*.9+t.width+b.h*.35,x0=b.left;
   const g=keep(H.add.graphics().setDepth(920));g.fillStyle(0x0b1a1f,.88);g.fillRoundedRect(x0,b.y-b.h/2,tw,b.h,10);g.lineStyle(2,color,1);g.strokeRoundedRect(x0,b.y-b.h/2,tw,b.h,10);
   glyph(g,type,x0+b.h*.48,b.y,b.h*.5,color);t.setPosition(x0+b.h*.9,b.y).setOrigin(0,.5);
   const cx=x0+tw+8+b.cancel;if(cx+b.cancel>b.right)return; // the chip only where it clears the skill cluster; the selected portrait is the cancel everywhere
   g.fillStyle(0x3a1f22,.95);g.fillCircle(cx,b.y,b.cancel);g.lineStyle(2,0xffb4a8,1);g.strokeCircle(cx,b.y,b.cancel);const k=b.cancel*.42;g.lineStyle(3,0xffe3dc,1);g.lineBetween(cx-k,b.y-k,cx+k,b.y+k);g.lineBetween(cx+k,b.y-k,cx-k,b.y+k);
  };
  // World markers (Battle scene, view coordinates).
  const world=()=>keep(B.add.graphics().setDepth(2595));
  const ring=(g,u,color,rx=30,alpha=1,w=3)=>{const p=view(u.x,u.y);g.lineStyle(w,color,alpha);g.strokeEllipse(p.x,p.y,rx*2,rx*.9);};
  window.mock=(state)=>{
   for(const o of objs.splice(0))o.destroy();
   const L=window.L(H,3),list=ids().map(id=>S.state.units[id]),sel=state.selected;
   list.forEach((u,i)=>portrait(L.slots[i],u,i===sel,state.mode&&i!==sel,!!state.mode));
   const wg=world();
   // standing orders always visible for the selected hero only (keeps the field clean)
   if(sel!==undefined){const u=list[sel];ring(wg,u,GOLD,26,1,4);
    if(u.ally.order.type==='attack'){const t=S.state.structures[u.ally.order.targetId]??S.state.units[u.ally.order.targetId];if(t){const a=view(u.x,u.y),b=view(t.x,t.y);wg.lineStyle(2,RED,.7);wg.lineBetween(a.x,a.y,b.x,b.y);ring(wg,t,RED,30);}}
    if(u.ally.order.type==='defend'){const o=u.ally.order,p=view(o.x,o.y);wg.lineStyle(2,BLUE,.7);wg.strokeEllipse(p.x,p.y,64,64*.72);wg.fillStyle(BLUE,.9);wg.fillTriangle(p.x,p.y-34,p.x+18,p.y-27,p.x,p.y-20);wg.lineStyle(3,0xe8f6ff,1);wg.lineBetween(p.x,p.y,p.x,p.y-34);}
   }
   if(state.popover){const q=L.pop,cur=list[sel].ally.order.type;[['follow','Follow'],['attack','Attack'],['defend','Defend']].forEach(([t,l],k)=>button(q.left+k*(q.bw+q.bg),q.top,q.bw,q.h,t,l,t===cur,q.icon));}
   if(state.mode==='attack'){banner(L,'attack',L.short?'Tap an enemy':'ATTACK · tap an enemy',RED);
    for(const t of [...Object.values(S.state.units),...Object.values(S.state.structures)])if(t.team==='red'&&t.hp>0&&!t.invulnerable)ring(wg,t,RED,t.kind==='tower'?34:22,.9,2);}
   if(state.mode==='defend'){banner(L,'defend',L.short?'Tap a spot':'DEFEND · tap a spot to hold',BLUE);const p=view(state.at.x,state.at.y);wg.lineStyle(3,0xe8f6ff,.9);wg.strokeEllipse(p.x,p.y,72,72*.72);wg.lineStyle(2,BLUE,.6);wg.strokeEllipse(p.x,p.y,104,104*.72);wg.lineStyle(3,0xe8f6ff,1);wg.lineBetween(p.x,p.y,p.x,p.y-34);wg.fillStyle(BLUE,.95);wg.fillTriangle(p.x,p.y-34,p.x+18,p.y-27,p.x,p.y-20);}
   const bb=L.banner;return {bannerFits:true,slots:L.slots.map(s=>({x:Math.round(s.x),y:Math.round(s.y),hit:Math.round(s.hit)})),pop:L.pop,banner:L.banner,scale:L.s,short:L.short,bashLeft:L.bashLeft,joy:L.joy,util:L.util};
  };
 });
 // Clearance (CSS px) from each proposed element to each existing control's hit area and to the top plates: a negative gap would be an overlap.
 const gaps=await page.evaluate(()=>{const H=window.kingdomGame.scene.getScene('HUD'),L=window.L(H,3),m=H.controls,s=L.s,g=H.guardianLayout,plates=Math.max(g.guardian.y+g.guardian.height,g.match.y+g.match.height);
  const circles=[...m.abilities.map(a=>({id:a.id,x:a.x,y:a.y,r:a.hitRadius})),...m.utilities.map(u=>({id:u.id,x:u.x,y:u.y,r:u.hitRadius})),{id:'joystick',x:m.joystick.x,y:m.joystick.y,r:m.joystick.radius}];
  const rectGap=(x0,y0,x1,y1,c)=>{const nx=Math.max(x0,Math.min(x1,c.x)),ny=Math.max(y0,Math.min(y1,c.y));return Math.hypot(nx-c.x,ny-c.y)-c.r;};
  const out={};const add=(name,fn)=>{let best={gap:Infinity};for(const c of circles){const v=fn(c);if(v<best.gap)best={gap:v,to:c.id};}out[name]={gapCss:+(best.gap*s).toFixed(1),to:best.to};};
  L.slots.forEach((sl,i)=>add('portrait'+(i+1),c=>Math.hypot(sl.x-c.x,sl.y-c.y)-sl.hit-c.r));
  const q=L.pop;add('popover',c=>rectGap(q.left,q.top,q.left+q.w,q.top+q.h,c));
  out.popoverTopToPlatesCss=+((q.top-plates)*s).toFixed(1);out.portraitTargetCss=+(L.slots[0].hit*2*s).toFixed(1);out.commandTargetCss=[+(q.bw*s).toFixed(1),+(q.h*s).toFixed(1)];out.rowBottomToCanvasBottomCss=+((540-L.slots[0].y-L.slots[0].hit)*s).toFixed(1);
  return out;});
 console.log(`${w}x${h} clearance`,JSON.stringify(gaps));
 const states=[['1-bar',{}],['2-selected',{selected:1,popover:true}],['3-attack-mode',{selected:1,mode:'attack'}],['4-defend-mode',{selected:2,mode:'defend',at:{x:940,y:600}}]];
 for(const [name,st] of states){const info=await page.evaluate(s=>window.mock(s),st);await page.waitForTimeout(250);await page.screenshot({path:`${dir}/hud-${w}x${h}-${name}.png`});await page.screenshot({path:`${dir}/hud-${w}x${h}-${name}.jpg`,type:"jpeg",quality:82});if(name==='2-selected')console.log(`${w}x${h} layout`,JSON.stringify(info));}
 console.log(`${w}x${h} errors`,JSON.stringify(errors));
 await ctx.close();
}
await browser.close();
console.log(`stills in ${dir}`);
