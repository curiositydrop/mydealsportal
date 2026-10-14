import test from "node:test";
import assert from "node:assert/strict";
import {attemptState,blocked,WINDOW_MS,LOCK_MS} from "./redemption-limits.js";
test("five failures trigger a lockout",()=>{
 let state={};
 for(let i=0;i<4;i++){state=attemptState(state,1000);assert.equal(blocked(state,1000),false);}
 state=attemptState(state,1000);
 assert.equal(state.attempts,5);
 assert.equal(state.lockedUntil,1000+LOCK_MS);
 assert.equal(blocked(state,1000),true);
});
test("lockout does not allow a new burst of guesses after fifteen minutes",()=>{
 let state={};
 for(let i=0;i<5;i++)state=attemptState(state,1000);
 assert.equal(blocked(state,1000+LOCK_MS+1),true);
 assert.equal(blocked(state,1000+WINDOW_MS+1),false);
});
test("window resets after one hour",()=>{
 const state=attemptState({attempts:5,windowStart:1000,lockedUntil:1000+LOCK_MS},1000+WINDOW_MS+1);
 assert.equal(state.attempts,1);
 assert.equal(state.lockedUntil,0);
});
