export type BuildingKind='wall'|'tower'|'barracks'|'ballista'|'tavern';
export const buildings={
 wall:{wood:25,iron:0,maxHp:400,buildTicks:60,damage:0,range:0,cooldownTicks:24},
 tower:{wood:80,iron:10,maxHp:650,buildTicks:150,damage:18,range:240,cooldownTicks:24},
 // SCRATCH PROBE (Chapter 4 M2): a Ballista is a tower-kind structure placed only on a post's Ballista ruin. Provisional values: a tower hits for 18 every 0.8 s at 240 px; this hits for 70 every 3 s at 420 px.
 ballista:{wood:140,iron:30,maxHp:520,buildTicks:150,damage:70,range:420,cooldownTicks:90},
 barracks:{wood:120,iron:20,maxHp:600,buildTicks:150,damage:0,range:0,cooldownTicks:24}, // Chapter 3 Azure Barracks: a wall-kind structure (see AzureBarracks.ts), buildable on authored pads only
 // Chapter 5 Phase 1B: the Tavern, a wall-kind structure (one at a time, only in a match whose setup has a tavern) that hires and revives Allied Heroes. Provisional price.
 tavern:{wood:100,iron:10,maxHp:600,buildTicks:150,damage:0,range:0,cooldownTicks:24},
};
