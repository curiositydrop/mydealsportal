import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const run=(src,dst)=>spawnSync(process.execPath,['seo/stage.mjs',src,dst],{encoding:'utf8'});
test('staging replaces stale listings and sitemap',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mdp-seo-'));
 try{
  const src=path.join(dir,'generated'),dst=path.join(dir,'site');
  await fs.mkdir(path.join(src,'listings','deals'),{recursive:true});
  await fs.mkdir(path.join(src,'listings','businesses'),{recursive:true});
  await fs.mkdir(path.join(dst,'listings','deals'),{recursive:true});
  await fs.mkdir(path.join(src,'listings','deals','new'),{recursive:true});
  await fs.writeFile(path.join(src,'listings','deals','new','index.html'),'new');
  await fs.writeFile(path.join(dst,'listings','deals','old.html'),'old');
  await fs.writeFile(path.join(src,'sitemap.xml'),'<?xml version="1.0"?><urlset>new</urlset>');
  await fs.writeFile(path.join(dst,'sitemap.xml'),'<?xml version="1.0"?><urlset>old</urlset>');
  const result=run(src,dst);
  assert.equal(result.status,0,result.stderr);
  assert.equal(await fs.readFile(path.join(dst,'listings','deals','new','index.html'),'utf8'),'new');
  await assert.rejects(fs.stat(path.join(dst,'listings','deals','old.html')));
  assert.equal(await fs.readFile(path.join(dst,'sitemap.xml'),'utf8'),'<?xml version="1.0"?><urlset>new</urlset>');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('rejects nested source and destination',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mdp-seo-'));
 try{
  const src=path.join(dir,'site','generated'),dst=path.join(dir,'site');
  await fs.mkdir(src,{recursive:true});
  await fs.writeFile(path.join(src,'sitemap.xml'),'<urlset/>');
  assert.notEqual(run(src,dst).status,0);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('rejects symlink listing destination without modifying it',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mdp-seo-'));
 try{
  const src=path.join(dir,'generated'),dst=path.join(dir,'site'),outside=path.join(dir,'outside');
  await fs.mkdir(src);await fs.mkdir(dst);await fs.mkdir(outside);
  await fs.writeFile(path.join(src,'sitemap.xml'),'<?xml version="1.0"?><urlset></urlset>');
  await fs.writeFile(path.join(outside,'keep.txt'),'keep');
  await fs.symlink(outside,path.join(dst,'listings'));
  assert.notEqual(run(src,dst).status,0);
  assert.equal(await fs.readFile(path.join(outside,'keep.txt'),'utf8'),'keep');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('incomplete export fails without deleting existing listings',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mdp-seo-'));
 try{
  const src=path.join(dir,'generated'),dst=path.join(dir,'site');
  await fs.mkdir(path.join(src,'listings','deals'),{recursive:true});
  await fs.mkdir(path.join(dst,'listings','deals'),{recursive:true});
  await fs.writeFile(path.join(src,'sitemap.xml'),'<?xml version="1.0"?><urlset></urlset>');
  await fs.writeFile(path.join(dst,'listings','deals','keep.html'),'keep');
  await fs.writeFile(path.join(dst,'sitemap.xml'),'old sitemap');
  assert.notEqual(run(src,dst).status,0);
  assert.equal(await fs.readFile(path.join(dst,'listings','deals','keep.html'),'utf8'),'keep');
  assert.equal(await fs.readFile(path.join(dst,'sitemap.xml'),'utf8'),'old sitemap');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('malformed sitemap fails without deleting existing listings',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mdp-seo-'));
 try{
  const src=path.join(dir,'generated'),dst=path.join(dir,'site');
  for(const kind of ['deals','businesses'])await fs.mkdir(path.join(src,'listings',kind),{recursive:true});
  await fs.mkdir(path.join(dst,'listings','deals'),{recursive:true});
  await fs.writeFile(path.join(src,'sitemap.xml'),'not an XML sitemap');
  await fs.writeFile(path.join(dst,'listings','deals','keep.html'),'keep');
  assert.notEqual(run(src,dst).status,0);
  assert.equal(await fs.readFile(path.join(dst,'listings','deals','keep.html'),'utf8'),'keep');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('symlink in generated tree fails before replacing site',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mdp-seo-'));
 try{
  const src=path.join(dir,'generated'),dst=path.join(dir,'site');
  for(const kind of ['deals','businesses'])await fs.mkdir(path.join(src,'listings',kind),{recursive:true});
  await fs.mkdir(path.join(dst,'listings','deals'),{recursive:true});
  await fs.writeFile(path.join(src,'sitemap.xml'),'<?xml version="1.0"?><urlset></urlset>');
  await fs.writeFile(path.join(dst,'listings','deals','keep.html'),'keep');
  await fs.symlink(path.join(dst,'listings','deals','keep.html'),path.join(src,'listings','deals','linked.html'));
  assert.notEqual(run(src,dst).status,0);
  assert.equal(await fs.readFile(path.join(dst,'listings','deals','keep.html'),'utf8'),'keep');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('refuses to overwrite unexpected existing listing content',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mdp-seo-'));
 try{
  const src=path.join(dir,'generated'),dst=path.join(dir,'site');
  for(const kind of ['deals','businesses'])await fs.mkdir(path.join(src,'listings',kind),{recursive:true});
  await fs.mkdir(path.join(dst,'listings','custom'),{recursive:true});
  await fs.writeFile(path.join(src,'sitemap.xml'),'<?xml version="1.0"?><urlset></urlset>');
  await fs.writeFile(path.join(dst,'listings','custom','keep.html'),'custom content');
  assert.notEqual(run(src,dst).status,0);
  assert.equal(await fs.readFile(path.join(dst,'listings','custom','keep.html'),'utf8'),'custom content');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('refuses to erase extra files within an existing listing',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mdp-seo-'));
 try{
  const src=path.join(dir,'generated'),dst=path.join(dir,'site');
  for(const kind of ['deals','businesses'])await fs.mkdir(path.join(src,'listings',kind),{recursive:true});
  await fs.mkdir(path.join(dst,'listings','deals','shop123'),{recursive:true});
  await fs.writeFile(path.join(src,'sitemap.xml'),'<?xml version="1.0"?><urlset></urlset>');
  await fs.writeFile(path.join(dst,'listings','deals','shop123','notes.txt'),'important');
  assert.notEqual(run(src,dst).status,0);
  assert.equal(await fs.readFile(path.join(dst,'listings','deals','shop123','notes.txt'),'utf8'),'important');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
