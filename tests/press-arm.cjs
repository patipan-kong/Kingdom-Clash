const {test}=require('node:test');const assert=require('node:assert/strict');
const {PressArm}=require('../.test-build/ui/pressArm.js');

test('a release with no press on the button does nothing (a finger that began elsewhere)',()=>{
 const a=new PressArm();const retry={};assert.equal(a.release(1,retry),false);});

test('press then release on the same button with the same pointer activates once',()=>{
 const a=new PressArm();const retry={};a.arm(1,retry);assert.equal(a.armed,true);assert.equal(a.release(1,retry),true);assert.equal(a.armed,false);assert.equal(a.release(1,retry),false,'spent');});

test('a different pointer or a different button does not activate, and the arm is spent',()=>{
 const a=new PressArm();const retry={},next={};a.arm(1,retry);assert.equal(a.release(2,retry),false);a.arm(1,retry);assert.equal(a.release(1,next),false);assert.equal(a.armed,false);});

test('clear (release outside, cancel, overlay removed, scene change) disarms',()=>{
 const a=new PressArm();const retry={};a.arm(3,retry);a.clear();assert.equal(a.armed,false);assert.equal(a.release(3,retry),false);});

test('pointer 0 is a real pointer id (mouse)',()=>{
 const a=new PressArm();const b={};a.arm(0,b);assert.equal(a.release(0,b),true);});
