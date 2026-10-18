// Read-only Firestore export for an isolated local preview.
// Requires Application Default Credentials with Firestore read permissions.
// Never commit credential files or generated listings.
import {createRequire} from 'node:module';
// Resolve the existing backend dependency, not an undeclared root package.
const requireBackend=createRequire(new URL('../mydealsportal-backend/package.json',import.meta.url));
const {getApps,initializeApp,applicationDefault}=requireBackend('firebase-admin/app');
const {getFirestore}=requireBackend('firebase-admin/firestore');
import {generatePublicPages} from './render.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
const dest=process.argv[2];
if(!dest)throw Error('Usage: node seo/export-firestore.mjs <empty-output-directory>');
const target=path.resolve(dest);
if(target===process.cwd()||target===path.parse(target).root||process.cwd().startsWith(target+path.sep))throw Error('Unsafe output directory');
const outputStat=await fs.lstat(target).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));
if(outputStat?.isSymbolicLink()||(outputStat&&!outputStat.isDirectory()))throw Error('Output must be a real directory');
if(!process.env.GOOGLE_CLOUD_PROJECT)throw Error('Set GOOGLE_CLOUD_PROJECT explicitly before reading Firestore');
if((await fs.readdir(target).catch(e=>e.code==='ENOENT'?[]:Promise.reject(e))).length)throw Error('Output directory must be empty to avoid stale pages');
if(!getApps().length)initializeApp({credential:applicationDefault(),projectId:process.env.GOOGLE_CLOUD_PROJECT});
const db=getFirestore();
// Explicit validation-only mode: count candidate records without writing any files.
const countOnly=process.env.SEO_COUNT_ONLY==='1';
const [bs,ds]=await Promise.all([db.collection('businesses').where('status','==','active').get(),db.collection('deals').where('active','==',true).where('publishingApproved','==',true).get()]);
// Strict field allowlist prevents exporting owner email, billing or redemption data.
const businesses=bs.docs.map(s=>({id:s.id,name:s.get('name'),city:s.get('city'),zip:s.get('zip'),status:s.get('status'),subscriptionStatus:s.get('subscriptionStatus')}));
const deals=ds.docs.map(s=>({id:s.id,title:s.get('title'),description:s.get('description'),city:s.get('city'),businessId:s.get('ownerUid'),active:s.get('active'),publishingApproved:s.get('publishingApproved'),expiresAt:s.get('expiresAt')}));
const pages=generatePublicPages(businesses,deals);
if(countOnly){
 console.log('Read-only SEO validation:',businesses.length,'candidate businesses,',deals.length,'candidate deals,',pages.size,'generated files (not written).');
 process.exit(0);
}
await fs.mkdir(target,{recursive:true});
for(const kind of ['businesses','deals'])await fs.mkdir(path.join(target,'listings',kind),{recursive:true});
for(const [relative,html] of pages){
 const file=path.resolve(target,relative);
 if(!file.startsWith(target+path.sep))throw Error('Invalid path');
 await fs.mkdir(path.dirname(file),{recursive:true});
 await fs.writeFile(file,html,'utf8');
}
console.log('Preview generated:',businesses.length,'candidate businesses,',deals.length,'candidate deals,',pages.size,'files.');
