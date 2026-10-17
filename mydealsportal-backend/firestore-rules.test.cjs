const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-mydealsportal',firestore:{rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});
 try {
   await env.withSecurityRulesDisabled(async context=>{
     const db=context.firestore();
     await db.doc('businesses/owner1').set({ownerUid:'owner1',status:'active',subscriptionStatus:'active'});
     await db.doc('deals/deal123456').set({ownerUid:'owner1',businessId:'owner1',active:true,publishingApproved:true});
     await db.doc('redemptionSecrets/owner1').set({hash:'test-hash'});
     await db.doc('dealClaims/claim1').set({businessId:'owner1',status:'claimed'});
     await db.doc('redemptionLimits/limit1').set({count:1});
   });
   for(const [label,context] of [['anonymous',env.unauthenticatedContext()],['owner',env.authenticatedContext('owner1')],['other',env.authenticatedContext('other1')]]){
     const db=context.firestore();
     for(const [collection,id] of [['redemptionSecrets','owner1'],['dealClaims','claim1'],['redemptionLimits','limit1']]){
       await assertFails(db.doc(collection+'/'+id).get());
       await assertFails(db.doc(collection+'/'+id).set({test:true}));
       await assertFails(db.doc(collection+'/'+id).update({test:true}));
       await assertFails(db.doc(collection+'/'+id).delete());
     }
     console.log(label+' cannot access private redemption data');
   }
   await assertSucceeds(env.unauthenticatedContext().firestore().doc('deals/deal123456').get());
   console.log('Public approved deal remains readable');
   const owner=env.authenticatedContext('owner1').firestore();
   const outsider=env.authenticatedContext('other1').firestore();
   const guest=env.unauthenticatedContext().firestore();
   await assertFails(guest.doc('businesses/owner1').update({subscriptionStatus:'active'}));
   await assertFails(owner.doc('businesses/owner1').update({subscriptionStatus:'trialing'}));
   await assertFails(owner.doc('businesses/owner1').update({redemptionPinSet:true}));
   await assertFails(outsider.doc('businesses/owner1').update({status:'active'}));
   await assertFails(owner.doc('deals/deal123456').update({publishingApproved:false}));
   await assertFails(outsider.doc('deals/deal123456').update({active:false}));
   await assertSucceeds(owner.doc('deals/deal123456').update({active:false}));
   await assertFails(guest.doc('deals/deal123456').get());
   console.log('Billing status, PIN activation and publishing approval are server-only');
 } finally {await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
