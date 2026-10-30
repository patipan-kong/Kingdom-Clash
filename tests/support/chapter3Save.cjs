// Chapter 3 release: progress stores holding a legitimate save (Chapters 1 and 2 cleared, then Chapter 3 in order). Lives outside tests/*.cjs, so scripts/test.mjs never runs it as a test file.
const {ProgressStore}=require('../../.test-build/data/campaignProgressStore.js');
const pad=n=>`campaign-${String(n).padStart(2,'0')}`;
const store=ids=>{let raw=JSON.stringify({version:1,levels:Object.fromEntries(ids.map(id=>[id,{clears:1}]))});
 const s=new ProgressStore(()=>({getItem:()=>raw,setItem:(_k,v)=>{raw=v;}}));s.refresh();return s;};
const chapters12=Array.from({length:6},(_,i)=>pad(i+1)).concat(Array.from({length:6},(_,i)=>pad(i+11)));
// Chapters 1 and 2 cleared plus Chapter 3 Missions 1..k (k=0..6)
const through=k=>store([...chapters12,...Array.from({length:k},(_,i)=>pad(21+i))]);
module.exports={store,through,pad,chapters12};
