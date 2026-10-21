// Validate a staged SEO tree before a human-approved production release.
// No network, credentials, or deployment actions.
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'');
if(!process.argv[2])throw Error('Usage: node seo/release-check.mjs <staged-site-dir>');
const read=p=>fs.readFile(path.join(root,p),'utf8');
const [cname,home,robots,sitemap]=await Promise.all([read('CNAME'),read('index.html'),read('robots.txt'),read('sitemap.xml')]);
if(cname.trim()!=='www.mydealsportal.com')throw Error('Unexpected custom domain');
if(!home.toLowerCase().includes('<html'))throw Error('Homepage missing');
if(!robots.includes('sitemap.xml'))throw Error('Robots sitemap reference missing');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
if(!sitemap.includes('<urlset')||!urls.includes('https://www.mydealsportal.com/'))throw Error('Invalid sitemap');
const listingPaths=[];
for(const kind of ['businesses','deals']){
 const dir=path.join(root,'listings',kind);
 for(const id of await fs.readdir(dir)){
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw Error('Unexpected listing ID');
  const relative='listings/'+kind+'/'+id+'/index.html';
  const html=await read(relative);
  const canonical='https://www.mydealsportal.com/listings/'+kind+'/'+id+'/';
  if(!html.includes('<title>')||!html.includes('<h1>')||!html.includes('rel="canonical" href="'+canonical+'"'))throw Error('Invalid SEO page: '+relative);
  if(/ownerUid|stripeCustomerId|customerEmail|claimCode|private_key/i.test(html))throw Error('Possible private field in '+relative);
  if(!urls.includes(canonical))throw Error('Listing missing from sitemap: '+relative);
  listingPaths.push(relative);
 }
}
if(listingPaths.length===0)throw Error('No listing pages');
if(!urls.includes('https://www.mydealsportal.com/faq.html'))throw Error('Public FAQ missing from sitemap');
if(urls.length!==listingPaths.length+3||new Set(urls).size!==urls.length)throw Error('Unexpected or duplicate sitemap URLs');
console.log('RELEASE REVIEW PASSED:',listingPaths.length,'listing pages,',urls.length,'sitemap URLs, homepage and CNAME intact.');
