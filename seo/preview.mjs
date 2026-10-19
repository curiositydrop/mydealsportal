// Offline fixture preview only. Does not connect to Firebase or deploy.
import fs from 'node:fs/promises';
import path from 'node:path';
import {generatePublicPages} from './render.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node seo/preview.mjs fixture.json output-directory');
const source=JSON.parse(await fs.readFile(input,'utf8'));
if(!Array.isArray(source.businesses)||!Array.isArray(source.deals))throw Error('Fixture must have businesses and deals arrays');
const destination=path.resolve(output);
if(destination===process.cwd()||destination===path.parse(destination).root)throw Error('Choose a dedicated output directory');
await fs.mkdir(destination,{recursive:true});
for(const kind of ['businesses','deals'])await fs.mkdir(path.join(destination,'listings',kind),{recursive:true});
for(const [relative,html] of generatePublicPages(source.businesses,source.deals)){
 const file=path.resolve(destination,relative);
 if(!file.startsWith(destination+path.sep))throw Error('Unsafe generated path');
 await fs.mkdir(path.dirname(file),{recursive:true});
 await fs.writeFile(file,html,'utf8');
}
console.log('Generated SEO preview at',destination);
