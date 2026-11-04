import type {MatchSetup} from './matchSetup';
import {mercenaries} from './mercenaries';
// Chapter 5 Phase 1B (docs/CHAPTER5_PHASE1B.md): development-only Tavern playtest on any campaign level, until the Chapter 5 missions exist: ?debug=1&level=36&tavernTest=1 (or 2, 3: the hero cap).
// The match gets the Tavern (Build card and panel), the whole roster and 1000 Gold / 500 Wood / 100 Iron to start. Pure parse; production (dev=false), a missing debug=1 and any other value change nothing, so Chapters 1-4 never have a Tavern.
export function tavernTestFromSearch(search:string,dev:boolean):1|2|3|0{
 if(!dev)return 0;
 const q=new URLSearchParams(search),v=q.get('tavernTest');
 return q.get('debug')==='1'&&(v==='1'||v==='2'||v==='3')?Number(v) as 1|2|3:0;
}
export function withTavernTest<T extends MatchSetup|string>(setup:T,search:string,dev:boolean):T|MatchSetup{
 const cap=tavernTestFromSearch(search,dev);
 return cap&&typeof setup!=='string'?{...(setup as MatchSetup),start:{...(setup as MatchSetup).start,gold:1000,wood:500,iron:100},tavern:{cap,roster:mercenaries.map(m=>m.id)}}:setup;
}
