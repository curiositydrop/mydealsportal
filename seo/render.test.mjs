import test from 'node:test';
import assert from 'node:assert/strict';
import {generatePublicPages} from './render.mjs';
test('only approved public businesses and deals are exported',()=>{
 const b=[{id:'b1',name:'Bakery',status:'active',subscriptionStatus:'trialing'},{id:'b2',name:'Draft',status:'draft',subscriptionStatus:'active'}];
 const d=[{id:'d1',businessId:'b1',title:'Bread',active:true,publishingApproved:true},{id:'d2',businessId:'b2',title:'Hidden',active:true,publishingApproved:true},{id:'d3',businessId:'b1',title:'Unapproved',active:true,publishingApproved:false}];
 const out=generatePublicPages(b,d);
 assert.ok(out.has('listings/deals/d1/index.html'));
 assert.ok(!out.has('listings/deals/d2/index.html'));
 assert.ok(!out.has('listings/deals/d3/index.html'));
 assert.ok(!out.get('sitemap.xml').includes('d2'));
});
test('escapes malicious listing text and validates ids',()=>{
 const out=generatePublicPages([{id:'safe',name:'<script>alert(1)</script>',status:'active',subscriptionStatus:'active'}],[{id:'../bad',title:'Bad',businessId:'safe',active:true,publishingApproved:true}]);
 const html=out.get('listings/businesses/safe/index.html');
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>'));
 assert.ok(!out.has('listings/deals/../bad/index.html'));
});

test('inactive subscriptions and expired deals are excluded',()=>{
 const businesses=[{id:'active',name:'Shop',status:'active',subscriptionStatus:'active'},{id:'canceled',name:'Old Shop',status:'active',subscriptionStatus:'canceled'}];
 const deals=[{id:'expired',businessId:'active',title:'Old sale',active:true,publishingApproved:true,expiresAt:'2020-01-01'},{id:'current',businessId:'active',title:'New sale',active:true,publishingApproved:true},{id:'canceled-deal',businessId:'canceled',title:'Bad',active:true,publishingApproved:true}];
 const pages=generatePublicPages(businesses,deals);
 assert.ok(pages.has('listings/deals/current/index.html'));
 assert.ok(!pages.has('listings/deals/expired/index.html'));
 assert.ok(!pages.has('listings/deals/canceled-deal/index.html'));
});

test('Firestore timestamps and invalid expiry are handled conservatively',()=>{
 const businesses=[{id:'shop',name:'Shop',status:'active',subscriptionStatus:'active'}];
 const base={businessId:'shop',title:'Offer',active:true,publishingApproved:true};
 const pages=generatePublicPages(businesses,[{...base,id:'old',expiresAt:{seconds:1}},{...base,id:'unknown',expiresAt:{bad:true}},{...base,id:'fresh',expiresAt:{seconds:4102444800}}]);
 assert.ok(!pages.has('listings/deals/old/index.html'));
 assert.ok(!pages.has('listings/deals/unknown/index.html'));
 assert.ok(pages.has('listings/deals/fresh/index.html'));
});

test('active lifetime-free business is public even without a paid subscription',()=>{
 const business={id:'newleaf',name:'New Leaf Painting',status:'active',lifetimeFree:true};
 const pages=generatePublicPages([business],[]);
 assert.ok(pages.has('listings/businesses/newleaf/index.html'));
 assert.match(pages.get('sitemap.xml'),/businesses\/newleaf/);
 assert.ok(!generatePublicPages([{...business,status:'inactive'}],[]).has('listings/businesses/newleaf/index.html'));
 assert.ok(!generatePublicPages([{...business,lifetimeFree:false}],[]).has('listings/businesses/newleaf/index.html'));
});

test('date-only terms expire at end of date; free text is not guessed',()=>{
 const b={id:'shop',name:'Shop',status:'active',subscriptionStatus:'active'};
 const base={businessId:'shop',title:'Offer',active:true,publishingApproved:true};
 const pages=generatePublicPages([b],[{...base,id:'old-terms',terms:'10/31/2020'},{...base,id:'future-terms',terms:'10/31/2099'},{...base,id:'text-terms',terms:'See store for details'},{...base,id:'invalid-terms',terms:'02/30/2026'}]);
 assert.ok(!pages.has('listings/deals/old-terms/index.html'));
 assert.ok(pages.has('listings/deals/future-terms/index.html'));
 assert.ok(pages.has('listings/deals/text-terms/index.html'));
 assert.ok(!pages.has('listings/deals/invalid-terms/index.html'));
});
