import test from 'node:test';
import assert from 'node:assert/strict';
import {generatePublicPages} from './render.mjs';
test('only approved public businesses and deals are exported',()=>{
 const b=[{id:'b1',name:'Bakery',status:'active',publishingApproved:true},{id:'b2',name:'Draft',status:'draft',publishingApproved:true}];
 const d=[{id:'d1',businessId:'b1',title:'Bread',active:true,publishingApproved:true},{id:'d2',businessId:'b2',title:'Hidden',active:true,publishingApproved:true},{id:'d3',businessId:'b1',title:'Unapproved',active:true,publishingApproved:false}];
 const out=generatePublicPages(b,d);
 assert.ok(out.has('listings/deals/d1/index.html'));
 assert.ok(!out.has('listings/deals/d2/index.html'));
 assert.ok(!out.has('listings/deals/d3/index.html'));
 assert.ok(!out.get('sitemap.xml').includes('d2'));
});
test('escapes malicious listing text and validates ids',()=>{
 const out=generatePublicPages([{id:'safe',name:'<script>alert(1)</script>',status:'active',publishingApproved:true}],[{id:'../bad',title:'Bad',businessId:'safe',active:true,publishingApproved:true}]);
 const html=out.get('listings/businesses/safe/index.html');
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>'));
 assert.ok(!out.has('listings/deals/../bad/index.html'));
});
