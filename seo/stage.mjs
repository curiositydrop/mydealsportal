// Stage an SEO build and replace only generated listing files.
// Deliberately does NOT deploy or modify production automatically.
import fs from 'node:fs/promises';
import path from 'node:path';
const [generated,site]=process.argv.slice(2);
if(!generated||!site)throw Error('Usage: node seo/stage.mjs <generated-dir> <site-copy-dir>');
const source=path.resolve(generated),target=path.resolve(site);
if(source===target||target===process.cwd()||target===path.parse(target).root||source.startsWith(target+path.sep)||target.startsWith(source+path.sep))throw Error('Unsafe destination');
const root=path.join(target,'listings');
const expected=await fs.readFile(path.join(source,'sitemap.xml'),'utf8');
if(!expected.includes('<urlset'))throw Error('Missing valid sitemap');
if(!(await fs.stat(target)).isDirectory())throw Error('Site checkout must exist');
const stage=path.join(target,'.seo-staging-'+process.pid);
await fs.mkdir(stage,{recursive:true});
async function copyTree(src,dst){
 for(const entry of await fs.readdir(src,{withFileTypes:true})){
  const from=path.join(src,entry.name),to=path.join(dst,entry.name);
  if(entry.isSymbolicLink())throw Error('Symlinks are forbidden');
  if(entry.isDirectory()){await fs.mkdir(to,{recursive:true});await copyTree(from,to);}
  else if(entry.isFile()&&entry.name.endsWith('.html'))await fs.copyFile(from,to);
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
