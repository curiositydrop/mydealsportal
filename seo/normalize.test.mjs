import test from 'node:test';
import assert from 'node:assert/strict';
import {publicBusinessRecord,publicDealRecord} from './normalize.mjs';
import {generatePublicPages} from './render.mjs';

test('Firestore businessId links a paid business to its deals without leaking private fields',()=>{
 const business={name:'Bakery',city:'Saco',zip:'04072',status:'active',subscriptionStatus:'trialing',ownerUid:'uid123',email:'private@example.com',stripeCustomerId:'cus_private'};
 const deal={title:'Half-price bread',ownerUid:'uid123',businessId:'uid123',active:true,publishingApproved:true,description:'Today only',customerEmail:'secret@example.com',claimCode:'private'};
 const b=publicBusinessRecord('uid123',field=>business[field]);
 const d=publicDealRecord('deal456',field=>deal[field]);
 assert.equal(d.businessId,'uid123');
 assert.equal(b.email,undefined);
 assert.equal(d.claimCode,undefined);
 const pages=generatePublicPages([b],[d]);
 assert.ok(pages.has('listings/deals/deal456/index.html'));
 const html=pages.get('listings/deals/deal456/index.html');
 assert.ok(!html.includes('private@example.com'));
 assert.ok(!html.includes('secret@example.com'));
 assert.ok(!html.includes('cus_private'));
});

test('sample business and sample deal are not exported',()=>{
 const b=publicBusinessRecord('shop',field=>({name:'Shop',status:'active',subscriptionStatus:'active',sample:true})[field]);
 const d=publicDealRecord('deal',field=>({title:'Sample',ownerUid:'shop',businessId:'shop',active:true,publishingApproved:true,sample:true})[field]);
 assert.ok(!generatePublicPages([b],[d]).has('listings/businesses/shop/index.html'));
});
