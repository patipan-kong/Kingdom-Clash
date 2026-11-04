/** Chapter 5 Hero Command HUD: the command mode, kept pure so its transitions are tested without Phaser (docs/CHAPTER5_HERO_HUD.md, "Interaction flow").
 * idle: the portraits only. menu: a hero is selected and the popover shows Follow / Attack / Defend. attack / defend: target mode, waiting for a tap on the battlefield.
 * Follow is issued at once (the result carries it); Attack and Defend are issued by the HUD after a tap the Simulation accepts ('picked'); a refused tap keeps the mode and shows its reason. */
export type HeroOrderType='follow'|'attack'|'defend';
export interface HeroCommandState{readonly mode:'idle'|'menu'|'attack'|'defend';readonly selected?:string;readonly reason?:string}
export type HeroCommandAction=
 {type:'portrait';id:string}|{type:'command';order:HeroOrderType}|{type:'picked'}|{type:'refused';reason:string}|{type:'map'}|{type:'cancel'}|{type:'roster';ids:readonly string[]};
export const heroIdle:HeroCommandState={mode:'idle'};
export const targeting=(s:HeroCommandState)=>s.mode==='attack'||s.mode==='defend';
export function heroCommand(s:HeroCommandState,a:HeroCommandAction):{state:HeroCommandState;follow?:string}{
 switch(a.type){
  // The selected portrait toggles: it closes the popover, and while targeting it is the cancel. Another portrait selects that hero instead.
  case 'portrait':return {state:s.selected===a.id&&s.mode!=='idle'?heroIdle:{mode:'menu',selected:a.id}};
  case 'command':
   if(s.mode!=='menu'||!s.selected)return {state:s};
   return a.order==='follow'?{state:heroIdle,follow:s.selected}:{state:{mode:a.order,selected:s.selected}};
  case 'picked':return {state:targeting(s)?heroIdle:s};
  case 'refused':return {state:targeting(s)?{...s,reason:a.reason}:s};
  // An empty-map tap closes the popover; in target mode the HUD resolves it as a pick (a Defend point, or an Attack miss).
  case 'map':return {state:s.mode==='menu'?heroIdle:s};
  case 'cancel':return {state:heroIdle};
  // The selected hero died (or the match has no heroes any more).
  case 'roster':return {state:s.selected&&!a.ids.includes(s.selected)?heroIdle:s};
 }
}
