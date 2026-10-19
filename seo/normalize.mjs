// Only fields approved for public SEO pages may cross this boundary.
export function publicBusinessRecord(id, get) {
 return {id,name:get('name'),city:get('city'),zip:get('zip'),status:get('status'),subscriptionStatus:get('subscriptionStatus'),lifetimeFree:get('lifetimeFree'),sample:get('sample')};
}
export function publicDealRecord(id, get) {
 return {id,title:get('title'),description:get('description'),city:get('city'),businessId:get('businessId'),active:get('active'),publishingApproved:get('publishingApproved'),expiresAt:get('expiresAt'),terms:get('terms'),sample:get('sample')};
}
