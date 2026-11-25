import {battlefield,type BattlefieldId} from './battlefield';
// Chapter 2 S2b (D5): until Chapter 2 levels exist, the dev server alone may open a quick match on another battlefield with
// ?battlefield=<id>. Production passes dev=false and always gets Meadow. Only one exact, registered id counts; anything else is Meadow.
export function battlefieldFromSearch(search:string,dev:boolean):BattlefieldId{
 if(!dev)return 'meadow';
 const values=new URLSearchParams(search).getAll('battlefield');
 if(values.length!==1||values[0].startsWith('serpent-vale')||values[0]==='ridgeback'||values[0].startsWith('last-warlord')||(values[0]==='raze-or-seize'||values[0]==='raze-or-seize-v3'))return 'meadow'; // Chapter 6 fields need their authored mission setups.
 try{return battlefield(values[0] as BattlefieldId).id as BattlefieldId;}catch{return 'meadow';}
}
