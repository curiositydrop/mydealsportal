import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const origin='https://www.mydealsportal.com';
async function fixture(){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mdp-release-'));
 await fs.mkdir(path.join(root,'listings','businesses','abc'),{recursive:true});
 await fs.mkdir(path.join(root,'listings','deals'),{recursive:true});
 await fs.writeFile(path.join(root,'CNAME'),'www.mydealsportal.com\n');
 await fs.writeFile(path.join(root,'index.html'),'<html><body>Home</body></html>');
 await fs.writeFile(path.join(root,'robots.txt'),'Sitemap: '+origin+'/sitemap.xml');
 await fs.writeFile(path.join(root,'sitemap.xml'),'<?xml version="1.0"?><urlset><url><loc>'+origin+'/</loc></url><url><loc>'+origin+'/advertise.html</loc></url><url><loc>'+origin+'/faq.html</loc></url><url><loc>'+origin+'/listings/businesses/abc/</loc></url></urlset>');
 await fs.writeFile(path.join(root,'listings','businesses','abc','index.html'),'<html><head><title>Test</title><link rel="canonical" href="'+origin+'/listings/businesses/abc/"></head><body><h1>Test</h1></body></html>');
 return root;
}
const run=root=>spawnSync(process.execPath,['seo/release-check.mjs',root],{encoding:'utf8'});
test('valid staged pages pass release review',async()=>{
 const root=await fixture();try{const r=run(root);assert.equal(r.status,0,r.stderr);}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('missing listing sitemap URL blocks release',async()=>{
 const root=await fixture();try{await fs.writeFile(path.join(root,'sitemap.xml'),'<?xml version="1.0"?><urlset><url><loc>'+origin+'/</loc></url><url><loc>'+origin+'/advertise.html</loc></url></urlset>');assert.notEqual(run(root).status,0);}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('wrong custom domain blocks release',async()=>{
 const root=await fixture();try{await fs.writeFile(path.join(root,'CNAME'),'example.com');assert.notEqual(run(root).status,0);}finally{await fs.rm(root,{recursive:true,force:true});}
});
test('private field marker blocks release',async()=>{
 const root=await fixture();try{await fs.appendFile(path.join(root,'listings','businesses','abc','index.html'),'ownerUid');assert.notEqual(run(root).status,0);}finally{await fs.rm(root,{recursive:true,force:true});}
});

test('missing FAQ sitemap URL blocks release',async()=>{
 const root=await fixture();
 try {
  const p=path.join(root,'sitemap.xml');
  const xml=await fs.readFile(p,'utf8');
  await fs.writeFile(p,xml.replace('<url><loc>'+origin+'/faq.html</loc></url>',''));
  assert.notEqual(run(root).status,0);
 } finally {await fs.rm(root,{recursive:true,force:true});}
});
