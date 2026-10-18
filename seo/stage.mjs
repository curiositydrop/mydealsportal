// Stage an SEO build and replace only generated listing files.
// Deliberately does NOT deploy or modify production automatically.
import fs from 'node:fs/promises';
import path from 'node:path';
const [generated,site,...flags]=process.argv.slice(2);
const allowEmpty=flags.includes('--allow-empty');
if(flags.some(f=>f!=='--allow-empty'))throw Error('Unknown staging option');
if(!generated||!site)throw Error('Usage: node seo/stage.mjs <generated-dir> <site-copy-dir>');
const source=path.resolve(generated),target=path.resolve(site);
if(source===target||target===process.cwd()||target===path.parse(target).root||source.startsWith(target+path.sep)||target.startsWith(source+path.sep))throw Error('Unsafe destination');
const root=path.join(target,'listings');
// Never follow symlinks in the destination tree.
for(const p of [target,root,path.join(target,'sitemap.xml')]){
 const stat=await fs.lstat(p).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));
 if(stat?.isSymbolicLink())throw Error('Symlink destination forbidden: '+p);
}
const expected=await fs.readFile(path.join(source,'sitemap.xml'),'utf8');
const sourceItems=await fs.readdir(source,{withFileTypes:true});
if(sourceItems.some(e=>e.isSymbolicLink()||!['listings','sitemap.xml'].includes(e.name)))throw Error('Unexpected export contents');
const listingStat=await fs.lstat(path.join(source,'listings')).catch(()=>null);
if(!listingStat?.isDirectory()||listingStat.isSymbolicLink())throw Error('Incomplete listing export');
const expectedKinds=['businesses','deals'];
for(const kind of expectedKinds){
 const s=await fs.lstat(path.join(source,'listings',kind)).catch(()=>null);
 if(!s?.isDirectory()||s.isSymbolicLink())throw Error('Incomplete export: '+kind);
}
let generatedCount=0;
for(const kind of expectedKinds){
 const entries=await fs.readdir(path.join(source,'listings',kind));
 generatedCount+=entries.length;
}
if(generatedCount===0&&!allowEmpty)throw Error('Empty SEO export: refusing to remove all published listings without --allow-empty');
const sitemapStat=await fs.lstat(path.join(source,'sitemap.xml'));
if(!sitemapStat.isFile()||sitemapStat.isSymbolicLink())throw Error('Invalid sitemap source');
if(!expected.startsWith('<?xml')||!expected.includes('<urlset')||!expected.includes('</urlset>'))throw Error('Missing valid sitemap');
if(!(await fs.stat(target)).isDirectory())throw Error('Site checkout must exist');
// Never erase hand-maintained content under listings.
if(await fs.lstat(root).then(s=>s.isDirectory()).catch(()=>false)){
 const existing=await fs.readdir(root);
 if(existing.some(name=>!expectedKinds.includes(name)))throw Error('Unrecognized existing listings content; refusing replacement');
 for(const kind of existing){
  const kindPath=path.join(root,kind);
  const kindStat=await fs.lstat(kindPath);
  if(!kindStat.isDirectory()||kindStat.isSymbolicLink())throw Error('Unexpected existing listing category');
  for(const id of await fs.readdir(kindPath)){
   if(!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw Error('Unexpected existing listing ID');
   const idPath=path.join(kindPath,id),idStat=await fs.lstat(idPath);
   if(!idStat.isDirectory()||idStat.isSymbolicLink())throw Error('Unexpected existing listing entry');
   const names=await fs.readdir(idPath);
   if(names.some(n=>n!=='index.html'))throw Error('Unexpected existing listing file');
   if(names.includes('index.html')){
    const htmlStat=await fs.lstat(path.join(idPath,'index.html'));
    if(!htmlStat.isFile()||htmlStat.isSymbolicLink())throw Error('Unexpected existing listing HTML');
   }
  }
 }
}
const stage=path.join(target,'.seo-staging-'+process.pid);
await fs.mkdir(stage,{recursive:true});
async function copyTree(src,dst){
 for(const entry of await fs.readdir(src,{withFileTypes:true})){
  const from=path.join(src,entry.name),to=path.join(dst,entry.name);
  if(entry.isSymbolicLink())throw Error('Symlinks are forbidden');
  if(entry.isDirectory()){
   if(!/^[A-Za-z0-9_-]{1,128}$/.test(entry.name))throw Error('Unexpected listing directory '+from);
   await fs.mkdir(to,{recursive:true});await copyTree(from,to);
  }
  else if(entry.isFile()&&entry.name==='index.html')await fs.copyFile(from,to);
  else throw Error('Unexpected generated file '+from);
 }
}
try{
 for(const kind of ['businesses','deals']){
  const dir=path.join(source,'listings',kind);
  await fs.mkdir(path.join(stage,kind),{recursive:true});
  if(await fs.stat(dir).then(s=>s.isDirectory()).catch(()=>false))await copyTree(dir,path.join(stage,kind));
 }
 // On a dedicated checkout copy only: remove all old generated listing pages.
 // A rollback copy is kept until the staging process completes.
 const backup=path.join(target,'.seo-backup-'+process.pid);
 let backed=false;
 const sitemapPath=path.join(target,'sitemap.xml');
 const oldSitemap=await fs.readFile(sitemapPath).catch(e=>e.code==='ENOENT'?null:Promise.reject(e));
 let replaced=false;
 try{
  if(await fs.stat(root).then(s=>s.isDirectory()).catch(()=>false)){
   await fs.rename(root,backup);backed=true;
  }
  await fs.rename(stage,root);
  replaced=true;
  // Write sitemap last, after the replacement succeeds.
  await fs.writeFile(sitemapPath,expected,'utf8');
  if(backed)await fs.rm(backup,{recursive:true,force:true});
 }catch(error){
  if(replaced)await fs.rm(root,{recursive:true,force:true});
  if(backed)await fs.rename(backup,root);
  if(oldSitemap===null)await fs.rm(sitemapPath,{force:true});
  else await fs.writeFile(sitemapPath,oldSitemap);
  throw error;
 }
 console.log('Staged listing pages and sitemap; stale pages removed.');
}finally{await fs.rm(stage,{recursive:true,force:true});}
