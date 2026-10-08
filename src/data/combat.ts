// Phase 1A balance assumptions: the specifications prescribe rules, not unit stats.
export const guardianStats={maxHp:1200,armor:20,radius:20,speed:280,damage:80,range:90,cooldownTicks:23,windupTicks:6};
export const minionStats={maxHp:240,armor:0,radius:12,speed:95,damage:18,range:48,cooldownTicks:30,windupTicks:9};
export const previewSeconds:Record<string,number>={bash:3.2,taunt:4.2,charge:2.8,zone:6};
export const waves=[{tick:1,positions:[[1200,565],[1290,625],[1360,550]]},{tick:240,positions:[[1320,575],[1390,575],[1460,575]]}];
