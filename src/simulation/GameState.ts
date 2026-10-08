export interface Unit {
 id:string; kind:'guardian'|'minion-red'; team:'blue'|'red'; x:number; y:number;
 hp:number; maxHp:number; armor:number; radius:number; speed:number; damage:number; range:number;
 cooldownTicks:number; windupTicks:number; readyTick:number; protectionTick:number;
 targetId?:string; strike?:{targetId:string;atTick:number}; respawnTick?:number;
}
export interface GameState {
 units:Record<string,Unit>; move:{x:number;y:number}; attacking:boolean; selectedTarget?:string;
 gold:number; kills:number; spawnedWaves:number; previewReady:Record<string,number>;
}
export type Command={type:'move';x:number;y:number}|{type:'attack'}|{type:'target';id:string}|{type:'preview';key:string};
export type GameEvent={type:'rejected';reason:string}|{type:'spawn'|'respawn';id:string}|{type:'attack';id:string;targetId:string}|{type:'damage';id:string;sourceId:string;amount:number}|{type:'death';id:string;sourceId:string}|{type:'reward';id:string;gold:number}|{type:'wave';index:number}|{type:'preview';key:string};
