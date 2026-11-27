import {coarsePointer} from './fullscreen';
/** Desktop UX D2 (docs/DESKTOP_UX_D1_ASSESSMENT.md): which control scheme the battle HUD presents.
 * 'touch' is the approved mobile HUD, unchanged (joystick, diamond, phone sizes). 'keyboard' is the desktop HUD (movement hint, skill bar, key badges, larger controls).
 * The starting mode comes from the primary pointer (the same coarse-pointer test fullscreen uses), never from the screen width. A real touch switches to 'touch' and a
 * movement or shortcut key switches to 'keyboard', so a touchscreen laptop gets the joystick back on its first touch. ?input=touch|keyboard pins the mode (checks, screenshots). */
export type InputMode='touch'|'keyboard';
/** KeyboardEvent.code values that mean the player is on a keyboard: movement and the HUD shortcuts. Codes, not keys, so a Thai or Japanese layout matches too. */
export const KEYBOARD_CODES:ReadonlySet<string>=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Digit1','Digit2','Digit3','Digit4','Numpad1','Numpad2','Numpad3','Numpad4','KeyB','KeyT','KeyK']);
export function parseInputOverride(search:string):InputMode|undefined{const v=new URLSearchParams(search).get('input');return v==='touch'||v==='keyboard'?v:undefined;}
let mode:InputMode|undefined;let pinned=false;
const listeners=new Set<(mode:InputMode)=>void>();
function set(next:InputMode){if(pinned||next===mode)return;mode=next;listeners.forEach(f=>f(next));}
function install(){
 if(mode!==undefined)return;
 const override=typeof location==='undefined'?undefined:parseInputOverride(location.search);
 pinned=!!override;mode=override??(coarsePointer()?'touch':'keyboard');
 if(typeof window==='undefined')return;
 window.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')set('touch');},{capture:true,passive:true});
 window.addEventListener('keydown',e=>{if(KEYBOARD_CODES.has(e.code))set('keyboard');},{capture:true});
}
export function inputMode():InputMode{install();return mode!;}
/** Called after every change of mode; returns the unsubscribe. */
export function onInputMode(fn:(mode:InputMode)=>void){install();listeners.add(fn);return ()=>{listeners.delete(fn);};}
