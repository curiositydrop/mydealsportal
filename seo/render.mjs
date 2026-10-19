// Pure, read-only SEO renderer. No Firebase or billing access.
export const origin='https://www.mydealsportal.com';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
const publicBusiness=b=>Boolean(b&&validId(b.id)&&b.status==='active'&&(['active','trialing'].includes(b.subscriptionStatus)||b.lifetimeFree===true)&&!b.sample&&b.name);
const publicDeal=d=>Boolean(d&&validId(d.id)&&d.active===true&&d.publishingApproved===true&&!d.sample&&d.title&&d.businessId&&!isExpired(d));
const isExpired=d=>{if(!d.expiresAt)return false;const v=d.expiresAt;const millis=typeof v==='string'?Date.parse(v):typeof v==='number'?v:typeof v?.toMillis==='function'?v.toMillis():typeof v?.seconds==='number'?v.seconds*1000:NaN;return Number.isFinite(millis)?millis<=Date.now():true;};
const page=(title,description,url,body)=>'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow"><title>'+esc(title)+'</title><meta name="description" content="'+esc(description)+'"><link rel="canonical" href="'+esc(url)+'"></head><body><main>'+body+'</main></body></html>';
export function generatePublicPages(businesses,deals){
  const pages=new Map(),active=new Map();
  for(const b of businesses){if(publicBusiness(b))active.set(b.id,b);}
  for(const b of active.values()){
    const url=origin+'/listings/businesses/'+encodeURIComponent(b.id)+'/';
    const title=b.name+' | MyDealsPortal';
    const desc=[b.name,b.city,b.zip,'Find local offers on MyDealsPortal.'].filter(Boolean).join(' · ').slice(0,160);
    pages.set('listings/businesses/'+b.id+'/index.html',page(title,desc,url,'<h1>'+esc(b.name)+'</h1><p>'+esc([b.city,b.zip].filter(Boolean).join(', '))+'</p><p><a href="/business.html?id='+encodeURIComponent(b.id)+'">See current business offers</a></p>'));
  }
  for(const d of deals){
    if(!publicDeal(d)||!active.has(d.businessId))continue;
    const b=active.get(d.businessId),url=origin+'/listings/deals/'+encodeURIComponent(d.id)+'/';
    const desc=[d.title,b.name,d.city||b.city,d.description].filter(Boolean).join(' · ').slice(0,160);
    pages.set('listings/deals/'+d.id+'/index.html',page(d.title+' | MyDealsPortal',desc,url,'<h1>'+esc(d.title)+'</h1><p>From '+esc(b.name)+'</p><p>'+esc(d.description)+'</p><p><a href="/deal.html?id='+encodeURIComponent(d.id)+'">View current deal and terms</a></p>'));
  }
  const urls=[origin+'/',origin+'/advertise.html',...Array.from(pages.keys(),p=>origin+'/'+p.replace(/index\.html$/,''))];
  pages.set('sitemap.xml','<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>'  <url><loc>'+esc(u)+'</loc></url>').join('\n')+'\n</urlset>\n');
  return pages;
}
