import Phaser from 'phaser';
import './style.css';
import { Battle } from './scenes/Battle';
import { HUD } from './scenes/HUD';
import { MainMenu } from './scenes/MainMenu';
import { CampaignSelect } from './scenes/CampaignSelect';
import { ChapterSelect } from './scenes/ChapterSelect';
import { MissionBriefing } from './scenes/MissionBriefing';
function report(message:string){const e=document.getElementById('error')!; e.style.display='block';e.textContent=message;}
window.addEventListener('error', e=>report(`Prototype error: ${e.message}`));
window.addEventListener('unhandledrejection',e=>report(`Prototype error: ${String(e.reason)}`));
// Capture canvas touches to prevent compatibility mouse clicks toggling menus twice.
const game = new Phaser.Game({ type:Phaser.AUTO,parent:'game',width:960,height:540,backgroundColor:'#10252b',antialias:true,input:{activePointers:3,touch:{capture:true}},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[MainMenu,ChapterSelect,CampaignSelect,MissionBriefing,Battle,HUD],render:{roundPixels:false},fps:{target:60},callbacks:{postBoot:()=>{document.querySelector('canvas')?.setAttribute('aria-label','Kingdom Clash fantasy strategy game');}} });
// Safe-area changes can resize the parent without a window resize. Read its
// current bounds before FIT refresh so the canvas stays inside those insets.
const parentObserver=new ResizeObserver(()=>{if(game.isBooted){game.scale.getParentBounds();game.scale.refresh();}});
parentObserver.observe(document.getElementById('game')!);
game.events.once('destroy',()=>parentObserver.disconnect());
declare global { interface Window { kingdomGame: Phaser.Game; visualReady: boolean; } }
window.kingdomGame=game;
