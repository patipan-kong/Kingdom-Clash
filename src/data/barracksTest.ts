import type {MatchSetup} from './matchSetup';
import type {Simulation} from '../simulation/Simulation';
// Development-only integration scenario for the Azure Barracks (src/simulation/AzureBarracks.ts), on Chapter 3 Mission 2's battlefield:
// ?debug=1&chapter=3&mission=2&barracksTest=1. Production (dev=false), a missing debug=1 and any other value return false, so normal play has no pads and no Barracks.
// The scenario starts with enough Wood and Iron for three Barracks, three authored pads and one Barracks already ordered; nothing is saved and no campaign progress is recorded.
export const BARRACKS_TEST_PADS=[{col:13,row:9},{col:13,row:12},{col:13,row:15}] as const;
export const barracksTestFromSearch=(search:string,dev:boolean)=>{const q=new URLSearchParams(search);return dev&&q.get('debug')==='1'&&q.get('barracksTest')==='1';};
export const barracksTestSetup=(setup:MatchSetup):MatchSetup=>({...setup,start:{...setup.start,wood:Math.max(setup.start.wood,400),iron:Math.max(setup.start.iron,70)}});
export function applyBarracksTest(sim:Simulation){
 sim.azurePads=BARRACKS_TEST_PADS;
 sim.send({type:'place',requestId:'dbg-barracks-1',kind:'barracks',col:BARRACKS_TEST_PADS[1].col,row:BARRACKS_TEST_PADS[1].row});
 console.info('[Kingdom Clash] BARRACKS TEST: 3 pads, 1 Barracks ordered');
}
