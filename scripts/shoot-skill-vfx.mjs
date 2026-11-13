// Mid-effect stills of Bash and Charge (dev server AUTO_URL, Level 6, 844x390). Output: SKILL_EVIDENCE.
import {chromium} from '@playwright/test';import {mkdir} from 'node:fs/promises';
const base=process.env.AUTO_URL||'http://127.0.0.1:5461/',dir=process.env.SKILL_EVIDENCE||'docs/screenshots/skill-vfx-v2';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({...(process.env.EXE?{executablePath:process.env.EXE}:{channel:'chrome'}),headless:true,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true});
await page.goto(`${base}?debug=1&level=6`);await page.waitForFunction(()=>window.visualReady&&window.kingdomGame.scene.isActive('HUD'));await page.waitForTimeout(800);
const run=(fn,...a)=>page.evaluate(`(${fn})(window.kingdomGame.scene.getScene('Battle'),...${JSON.stringify(a)})`);
await run(`(B,gap)=>{const s=B.simulation;for(const id of Object.keys(s.state.units))if(id!=='guardian')delete s.state.units[id];s.spawnQueue.length=0;const g=s.hero;g.x=700;g.y=600;g.hp=g.maxHp;for(const k of ['bash','taunt','charge','zone'])s.state.heroProgression.ranks[k]=1;s.state.skills.ready={bash:0,taunt:0,charge:0,zone:0};s.state.autoAttack=false;
 s.state.units.dummy={...g,id:'dummy',kind:'minion-red',team:'red',x:g.x+gap,y:g.y,hp:100000,maxHp:100000,armor:0,speed:0,damage:0,range:0,readyTick:0,protectionTick:0,strike:undefined,targetId:undefined,statuses:[],shield:undefined};}`,60);
const cast=(skill,extra={})=>run(`(B,skill,extra)=>B.simulation.send({type:'cast',requestId:'s'+Math.random(),skill,...extra})`,skill,extra);
await cast('bash');
for(let i=0;i<40;i++){await page.waitForTimeout(40);if(await run(`B=>B.simulation.state.units.dummy.hp<100000`))break;}
await page.waitForTimeout(60);await page.screenshot({path:`${dir}/bash-hit.png`});
await page.waitForTimeout(1500);
await run(`(B)=>{const s=B.simulation;s.hero.x=700;s.hero.y=600;s.state.units.dummy.x=900;s.state.units.dummy.y=600;s.state.skills.ready={bash:0,taunt:0,charge:0,zone:0};s.state.skills.lockTick=0;}`);
await cast('charge',{direction:{x:1,y:0}});
await page.waitForTimeout(200);await page.screenshot({path:`${dir}/charge-mid.png`});for(let i=0;i<60;i++){await page.waitForTimeout(30);if(await run(`B=>B.simulation.state.units.dummy.hp<100000`))break;}
await page.waitForTimeout(40);await page.screenshot({path:`${dir}/charge-hit.png`});
await browser.close();
