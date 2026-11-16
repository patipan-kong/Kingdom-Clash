const {test}=require('node:test');
const assert=require('node:assert/strict');
const {InterstitialFrequency}=require('../.test-build/data/interstitialFrequency');

const first={recorded:true,firstClear:true};

test('only new recorded first clears count, with every third opportunity consumed immediately',()=>{
 const frequency=new InterstitialFrequency(()=>null);
 assert.equal(frequency.recordVictory(first),false);
 assert.equal(frequency.recordVictory({recorded:true,firstClear:false}),false);
 assert.equal(frequency.recordVictory({recorded:false,firstClear:false}),false);
 assert.equal(frequency.recordVictory(first),false);
 assert.equal(frequency.recordVictory(first),true);
 assert.equal(frequency.recordVictory(first),false);
});

test('partial count and shown timestamp survive reload, skipped opportunities do not accumulate',()=>{
 const values=new Map();
 const storage=()=>({getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)});
 let frequency=new InterstitialFrequency(storage);
 frequency.recordVictory(first);
 frequency.recordVictory(first);
 frequency=new InterstitialFrequency(storage);
 assert.equal(frequency.recordVictory(first),true);
 assert.equal(frequency.canShow(0),true);
 frequency.markShown(0);
 frequency=new InterstitialFrequency(storage);
 frequency.recordVictory(first);
 frequency.recordVictory(first);
 assert.equal(frequency.recordVictory(first),true);
 assert.equal(frequency.canShow(599999),false);
 assert.equal(frequency.canShow(600000),true);
 frequency=new InterstitialFrequency(storage);
 assert.equal(frequency.recordVictory(first),false);
 assert.equal(frequency.recordVictory(first),false);
 assert.equal(frequency.recordVictory(first),true);
});

test('storage failures keep tracking in memory',()=>{
 const frequency=new InterstitialFrequency(()=>{throw new Error('Storage denied');});
 assert.deepEqual(Array.from({length:3},()=>frequency.recordVictory(first)),[false,false,true]);
 frequency.markShown(1000);
 assert.equal(frequency.canShow(2000),false);
});
