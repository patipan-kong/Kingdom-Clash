// Balance v0.2: provisional experimental values, not canonical specification. Revert by restoring the "was" values.
export const balanceV02={
 heroStructureDamage:0.6, // was 1. Guardian basic attacks vs enemy towers/Keep, applied before the Siege Hammer multiplier.
 crimsonTowerDamageVsGuardian:24, // was 18. Crimson (red) towers hitting the Guardian only; every other target and all player-built towers keep buildings.tower.damage (18).
 crimsonTowerXp:30, // was 80
 crimsonMinionGold:25 // was 15
} as const;
