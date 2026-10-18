import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {generatePublicPages} from './render.mjs';

async function writeGenerated(dir,businesses,deals){
  await fs.mkdir(dir,{recursive:true});
  for(const kind of ['businesses','deals'])await fs.mkdir(path.join(dir,'listings',kind),{recursive:true});
  for(const [relative,html] of generatePublicPages(businesses,deals)){
    const file=path.join(dir,relative);
    await fs.mkdir(path.dirname(file),{recursive:true});
    await fs.writeFile(file,html,'utf8');
  }
}
function stage(generated,site,allowEmpty=false){
  const result=spawnSync(process.execPath,['seo/stage.mjs',generated,site,...(allowEmpty?['--allow-empty']:[])],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
}
test('approved listing appears and canceled listing disappears from pages and sitemap',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'mdp-seo-life-'));
 try{
  const site=path.join(tmp,'site');
  await fs.mkdir(site);
  await fs.writeFile(path.join(site,'index.html'),'original homepage');
  const business={id:'shop123',name:'Local Shop',city:'Saco',status:'active',subscriptionStatus:'active'};
  const deal={id:'deal123',businessId:'shop123',title:'Half Price',description:'Today only',active:true,publishingApproved:true};
  const first=path.join(tmp,'first');
  await writeGenerated(first,[business],[deal]);
  stage(first,site);
  assert.match(await fs.readFile(path.join(site,'listings/deals/deal123/index.html'),'utf8'),/Half Price/);
  assert.match(await fs.readFile(path.join(site,'sitemap.xml'),'utf8'),/deals\/deal123/);
  const second=path.join(tmp,'second');
  await writeGenerated(second,[{...business,subscriptionStatus:'canceled'}],[deal]);
  stage(second,site,true);
  await assert.rejects(fs.stat(path.join(site,'listings/deals/deal123/index.html')));
  await assert.rejects(fs.stat(path.join(site,'listings/businesses/shop123/index.html')));
  assert.doesNotMatch(await fs.readFile(path.join(site,'sitemap.xml'),'utf8'),/deal123|shop123/);
  assert.equal(await fs.readFile(path.join(site,'index.html'),'utf8'),'original homepage');
 }finally{await fs.rm(tmp,{recursive:true,force:true});}
});
