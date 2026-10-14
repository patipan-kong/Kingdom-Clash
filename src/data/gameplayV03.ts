import {balanceV02} from './balanceV02';
// Gameplay v0.3: experimental strategic-pressure values, not an approved final balance. Revert by restoring the "was" values.
export const gameplayV03={
 aggro:{
  acquireRange:160, // was 560. Unprovoked: Crimson minions notice the Guardian only this close; every other target keeps the 560 sight range.
  retainRange:260, // An unprovoked pursuit of the Guardian is dropped beyond this distance (hysteresis over acquireRange).
  retaliateRange:320, // After a valid Guardian hit the minion may acquire the Guardian this far away...
  retaliateRetainRange:420, // ...and keeps it until this distance.
  retaliateTicks:120, // A hit provokes the minion for 4 s; further hits renew the provocation but never the leash.
  leashTravel:300, // A pursuit ends once the minion has moved this far from where it began.
  leashTicks:300, // ...or after 10 s of continuous pursuit.
  ignoreTicks:120, // After a leash ends the Guardian is ignored for 4 s unless within attack reach; hits during the cooldown do not re-provoke.
 },
 waves:{
  // Waves 1-12 are the scripted extendedRules. Wave 13+ continue on the same 40 s cadence.
  lateFirstWave:13,lateStartCount:8,lateStepEveryWaves:3,lateCap:10,
  lateMinionGold:10, // was 25 (balanceV02.crimsonMinionGold) for wave 13+ Crimson minions only.
 },
 respawn:{
  // respawnSeconds = min(capSeconds, baseSeconds + perLevelSeconds*(level-1) + perPriorDeathSeconds*priorDeaths). Was 5 s + 0.8 s/level, cap 25 s.
  baseSeconds:8,perLevelSeconds:0.5,perPriorDeathSeconds:3,capSeconds:22,
 },
} as const;
// Crimson minions per wave beyond the scripted waves: 8,8,8,9,9,9,10 (capped).
export const lateWaveCount=(wave:number)=>Math.min(gameplayV03.waves.lateCap,gameplayV03.waves.lateStartCount+Math.floor((wave-gameplayV03.waves.lateFirstWave)/gameplayV03.waves.lateStepEveryWaves));
// Wave number encoded in an extended Crimson minion id ("red-w13-2") or its life id ("match:red-w13-2:7"); undefined for other ids.
export const crimsonWaveOf=(id:string)=>{const m=/(?:^|:)red-w(\d+)-\d+(?::|$)/.exec(id);return m?Number(m[1]):undefined;};
// Gold for a Crimson minion kill: the balanceV02 value for waves 1-12 and the prototype, reduced from wave 13 onward.
export const crimsonMinionGold=(id:string)=>{const wave=crimsonWaveOf(id);return wave!==undefined&&wave>=gameplayV03.waves.lateFirstWave?gameplayV03.waves.lateMinionGold:balanceV02.crimsonMinionGold;};
