import {gameplayV03} from './gameplayV03';
// Gameplay v0.4: experimental Keep defense and wave pressure values, not an approved final balance (docs/GAMEPLAY_V0_4.md).
// Extended encounter only; the prototype encounter keeps inert Keeps and its own waves. Revert by restoring the "was" values.
export interface KeepDefense {damage:number;cooldownTicks:number;range:number;targeting:'guardian-first'|'nearest'}
export const gameplayV04={
 // A Keep attacks from the nearest point of its own 3x3 footprint, so its body never blocks its own line of sight and
 // the shot is the reverse of the attacker's own segment: any Guardian able to hit the Keep is inside its reach.
 // range is measured from that footprint edge (towers measure from their centre). No windup, physical damage, armor applies.
 keepDefense:{
  red:{damage:14,cooldownTicks:24,range:140,targeting:'guardian-first'} as KeepDefense|null, // was inert (damage 0, range 0). Explored 12-16 damage, 18-24 ticks.
  blue:null as KeepDefense|null, // Azure Keep stays inert (asymmetric model A; a symmetric Azure Keep was measured and rejected).
 },
 waves:{
  // Crimson minions per scripted wave 1-12: +1 for waves 4-6, +2 for 7-10, +3 for 11-12. was [3,3,4,4,5,5,6,6,7,7,8,8] (extendedRules, Phase 2C).
  enemyPerWave:[3,3,4,5,6,6,8,8,9,9,11,11],
  // Wave 13+: lateStartCount, +1 every lateStepEveryWaves waves, capped. was 8 / 3 / 10 (gameplayV03.waves).
  lateStartCount:9,lateStepEveryWaves:3,lateCap:11,
 },
};
// Crimson minions per wave beyond the scripted waves (v0.4): 9,9,9,10,10,10,11 (capped). Supersedes gameplayV03.lateWaveCount for the extended encounter.
export const lateWaveCount=(wave:number)=>{const w=gameplayV04.waves;return Math.min(w.lateCap,w.lateStartCount+Math.floor((wave-gameplayV03.waves.lateFirstWave)/w.lateStepEveryWaves));};
