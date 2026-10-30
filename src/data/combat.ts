// Phase 1A balance assumptions: the specifications prescribe rules, not unit stats.
export const guardianStats={maxHp:1200,armor:20,radius:20,speed:280,damage:80,range:90,cooldownTicks:23,windupTicks:6};
export const minionStats={maxHp:240,armor:0,radius:12,speed:95,damage:18,range:48,cooldownTicks:30,windupTicks:9};
// Chapter 2 S3: enemy archetypes of a red minion. Absent = Crimson (minionStats). All Desert Raider numbers are provisional.
// Collision radius stays the Crimson 12 (one navigation grid per radius); visualRadius only scales the sprite.
// Chapter 3 M6: the Crimson Elite Soldier (twice a Crimson soldier's hit points) and the Crimson Hero, the Frost Warlord (Director-approved initial balance: 85% of the Guardian's 980 at level 1; the same 80 damage and armor 20).
export type MinionArchetype='desert-raider'|'crimson-elite'|'crimson-hero';
export const desertRaider={stats:{...minionStats,maxHp:130,speed:150,damage:14},xp:40,visualRadius:11} as const;
export const crimsonElite={stats:{...minionStats,maxHp:480},xp:60} as const;
export const crimsonHero={stats:{...minionStats,maxHp:833,armor:20,radius:20,speed:95,damage:80,range:48,cooldownTicks:23,windupTicks:6},xp:150} as const;
export const heroId='red-hero';
export const minionStatsOf=(archetype?:MinionArchetype)=>archetype==='desert-raider'?desertRaider.stats:archetype==='crimson-elite'?crimsonElite.stats:archetype==='crimson-hero'?crimsonHero.stats:minionStats;
export const previewSeconds:Record<string,number>={bash:3.2,taunt:4.2,charge:2.8,zone:6};
// Phase 1C mirrors scripted reinforcement timing; initial allies use approved staging.
export const waves=[{tick:1,positions:[[1200,565],[1290,625],[1360,550]],alliedPositions:[] as number[][]},{tick:240,positions:[[1320,575],[1390,575],[1460,575]],alliedPositions:[[500,552],[500,648],[552,504]]}];
