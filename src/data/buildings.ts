export type BuildingKind='wall'|'tower'|'barracks';
export const buildings={
 wall:{wood:25,iron:0,maxHp:400,buildTicks:60,damage:0,range:0,cooldownTicks:24},
 tower:{wood:80,iron:10,maxHp:650,buildTicks:150,damage:18,range:240,cooldownTicks:24},
 barracks:{wood:120,iron:20,maxHp:600,buildTicks:150,damage:0,range:0,cooldownTicks:24}, // Chapter 3 Azure Barracks: a wall-kind structure (see AzureBarracks.ts), buildable on authored pads only
};
