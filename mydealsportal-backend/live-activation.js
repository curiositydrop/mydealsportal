import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { billingPlan, nextChargeAt } from "./billing-policy.js";
const db={collection:(...args)=>getFirestore().collection(...args),runTransaction:(...args)=>getFirestore().runTransaction(...args),batch:()=>getFirestore().batch()};
const paidStatuses=new Set(["active","trialing"]);
export async function chooseOffer(uid){
  for(let n=1;n<=100;n++){
    const ref=db.collection("foundingSlots").doc(String(n).padStart(3,"0"));
    const yes=await db.runTransaction(async tx=>{
      const s=await tx.get(ref),v=s.data();
      if(v?.status==="paid" || (v?.status==="held" && v.uid!==uid && v.expires?.toMillis()>Date.now())) return false;
      tx.set(ref,{uid,status:"held",expires:Timestamp.fromMillis(Date.now()+30*60*1000)});
      return true;
    });
    if(yes)return {plan:"founding",slot:ref.id};
  }
  return {plan:"standard",slot:null};
}
export async function activateOwnerSetup(stripe,session){
  if(!session.livemode || session.mode!=="setup" || session.status!=="complete"
     || session.metadata?.special!=="owner_lifetime")return;
  const uid=session.metadata.uid;
  if(!uid)throw Error("Owner identity missing");
  const ref=db.collection("businesses").doc(uid),snap=await ref.get();
  const business=snap.data();
  if(!business || business.ownerUid!==uid ||
     business.name?.trim().toLowerCase()!=="new leaf painting co." ||
     session.customer!=="cus_VRLMvrEopLMLid")throw Error("Owner offer mismatch");
  if(business.pendingCheckoutId!==session.id && business.checkoutSessionId!==session.id)
    throw Error("Owner checkout not linked to business");
  const customer=await stripe.customers.retrieve(session.customer);
  if(customer.deleted || customer.email?.toLowerCase()!=="newleafpaintingcompany@gmail.com")
    throw Error("Owner email mismatch");
  if(business.stripeSubscriptionId){
    if(business.checkoutSessionId===session.id)return;
    throw Error("Subscription already exists");
  }
  const setup=await stripe.setupIntents.retrieve(session.setup_intent);
  if(setup.status!=="succeeded" || !setup.payment_method || setup.customer!==session.customer)
    throw Error("Card setup not completed");
  await stripe.customers.update(session.customer,{
    invoice_settings:{default_payment_method:setup.payment_method}
  });
  const subscription=await stripe.subscriptions.create({
    customer:session.customer,
    items:[{price:billingPlan("founding").recurringPrice}],
    discounts:[{coupon:"3CrSRADI"}],
    default_payment_method:setup.payment_method,
    metadata:{uid,plan:"founding",project:"mydealsportal",special:"owner_lifetime"}
  },{idempotencyKey:"mdp-owner-sub-"+session.id});
  if(!paidStatuses.has(subscription.status))throw Error("Owner subscription inactive");
  const applied=(subscription.discounts||[]).length>0;
  if(!applied)throw Error("Lifetime discount not confirmed");
  await ref.update({
    stripeCustomerId:session.customer,stripeSubscriptionId:subscription.id,
    checkoutSessionId:session.id,pendingCheckoutId:FieldValue.delete(),
    subscriptionStatus:subscription.status,status:"active",plan:"founding",
    lifetimeFree:true,activatedAt:FieldValue.serverTimestamp()
  });
  const deals=await db.collection("deals").where("ownerUid","==",uid).get();
  for(let start=0;start<deals.docs.length;start+=450){
    const batch=db.batch();
    deals.docs.slice(start,start+450).forEach(d=>batch.update(d.ref,{publishingApproved:true}));
    await batch.commit();
  }
}
export async function activateAfterPayment(stripe,session){
  if(!session.livemode)return;
  if(session.metadata?.complimentary==="newleaf"){
    if(session.mode!=="subscription"||session.status!=="complete"||!session.subscription)return;
    const uid=session.metadata.uid;
    if(uid!=="KBqo5oM9IEdOQLB9ATwpsMrp6Vx2")throw Error("Invalid complimentary owner");
    const business=db.collection("businesses").doc(uid),snap=await business.get();
    if(!snap.exists||snap.data().ownerUid!==uid)throw Error("Unknown complimentary business");
    if(snap.data().stripeSubscriptionId===session.subscription)return;
    const sub=await stripe.subscriptions.retrieve(session.subscription,{expand:["discounts"]});
    const discounts=sub.discounts||[];
    const hasCoupon=discounts.some(d=>d?.coupon?.id==="3CrSRADI"||d?.source?.coupon==="3CrSRADI"||d?.source?.coupon?.id==="3CrSRADI");
    if(!["active","trialing"].includes(sub.status)||!hasCoupon)throw Error("Complimentary subscription not verified");
    await business.update({stripeCustomerId:session.customer,stripeSubscriptionId:sub.id,
      checkoutSessionId:session.id,pendingCheckoutId:FieldValue.delete(),subscriptionStatus:sub.status,
      status:"active",plan:"founding",complimentary:true,activatedAt:FieldValue.serverTimestamp()});
    const deals=await db.collection("deals").where("ownerUid","==",uid).get();
    for(let start=0;start<deals.docs.length;start+=450){
      const batch=db.batch();
      deals.docs.slice(start,start+450).forEach(d=>batch.update(d.ref,{publishingApproved:true}));
      await batch.commit();
    }
    return;
  }
  if(session.payment_status!=="paid")return;
  const {uid,plan,slot}=session.metadata||{};
  if(!uid||!["founding","standard"].includes(plan))throw Error("Invalid checkout metadata");
  const business=db.collection("businesses").doc(uid),snapshot=await business.get();
  if(!snapshot.exists||snapshot.data().ownerUid!==uid)throw Error("Unknown business");
  if(snapshot.data().checkoutSessionId===session.id && snapshot.data().stripeSubscriptionId)return;
  if(plan==="founding"){
    const ref=db.collection("foundingSlots").doc(slot);
    await db.runTransaction(async tx=>{
      const s=await tx.get(ref);
      if(!s.exists||s.data().uid!==uid)throw Error("Founding slot mismatch");
      tx.set(ref,{uid,status:"paid",sessionId:session.id,paidAt:FieldValue.serverTimestamp()});
    });
  }
  const payment=await stripe.paymentIntents.retrieve(session.payment_intent);
  if(!payment.payment_method)throw Error("Saved payment method missing");
  await stripe.customers.update(session.customer,{invoice_settings:{default_payment_method:payment.payment_method}});
  const subscription=await stripe.subscriptions.create({
    customer:session.customer,items:[{price:billingPlan(plan).recurringPrice}],
    default_payment_method:payment.payment_method,
    trial_end:nextChargeAt(payment.created,plan),
    trial_settings:{end_behavior:{missing_payment_method:"cancel"}},
    metadata:{uid,plan,project:"mydealsportal"}
  },{idempotencyKey:"mdp-sub-"+session.id});
  await business.update({stripeCustomerId:session.customer,stripeSubscriptionId:subscription.id,
    checkoutSessionId:session.id,pendingCheckoutId:FieldValue.delete(),subscriptionStatus:subscription.status,status:"active",plan,
    paidAt:FieldValue.serverTimestamp(),nextBillingAt:Timestamp.fromMillis(subscription.trial_end*1000)});
  const deals=await db.collection("deals").where("ownerUid","==",uid).get();
  for(let start=0;start<deals.docs.length;start+=450){
    const batch=db.batch();deals.docs.slice(start,start+450).forEach(d=>batch.update(d.ref,{publishingApproved:true}));
    await batch.commit();
  }
}
export async function syncSubscription(subscription){
  if(subscription.metadata?.project!=="mydealsportal")return;
  const uid=subscription.metadata.uid;if(!uid)return;
  const ref=db.collection("businesses").doc(uid),snap=await ref.get();
  if(!snap.exists || snap.data().stripeSubscriptionId!==subscription.id)return;
  const enabled=paidStatuses.has(subscription.status);
  await ref.update({status:enabled?"active":"draft",subscriptionStatus:subscription.status});
  if(!enabled){
    const deals=await db.collection("deals").where("ownerUid","==",uid).get();
    for(let start=0;start<deals.docs.length;start+=450){
      const batch=db.batch();deals.docs.slice(start,start+450).forEach(d=>batch.update(d.ref,{publishingApproved:false}));
      await batch.commit();
    }
  }
}
