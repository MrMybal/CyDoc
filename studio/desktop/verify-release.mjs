// Verify the complete local Windows/Linux release using only Node built-ins.
import assert from 'node:assert/strict';
import {createHash,createPublicKey,verify} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile,readdir,stat,writeFile} from 'node:fs/promises';
import {basename,dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const {values}=parseArgs({options:{release:{type:'string'},report:{type:'string'}}});
assert(values.release,'Supply --release DIRECTORY');
const repo=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const directory=resolve(values.release);
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const source=await json(join(repo,'.cyinstaller/cyinstaller.json'));
const version=(await json(join(repo,'studio/package.json'))).version;
const manifest=await json(join(directory,'cyinstaller.json'));
const metadata=await json(join(directory,'update.json'));
assert.deepEqual(manifest,source,'The staged manifest must match the permanent source identity and trust.');
assert.equal(metadata.version,version);assert.equal(metadata.app_id,source.app.id);
assert.deepEqual(Object.keys(metadata.assets).sort(),['linux-x64','win-x64']);
const publicBytes=Buffer.from(source.signing.publisher_key.replace(/^ed25519:/,''),'base64');
assert.equal(publicBytes.length,32);
const key=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),publicBytes]),format:'der',type:'spki'});
const signature=Buffer.from((await readFile(join(directory,'update.json.sig'),'utf8')).trim(),'base64');
assert(verify(null,await readFile(join(directory,'update.json')),key,signature),'Invalid Ed25519 signature');
async function digest(path){const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
const sums=new Map((await readFile(join(directory,'SHA256SUMS.txt'),'utf8')).trim().split(/\r?\n/).map(line=>{
  const match=/^([a-f0-9]{64})  ([^/\\]+)$/.exec(line);assert(match,'Invalid checksum line');return [match[2],match[1]];
}));
const files=(await readdir(directory)).filter(name=>name!=='SHA256SUMS.txt').sort();
assert.deepEqual([...sums.keys()].sort(),files,'Checksums must cover every staged file.');
const hashes={};
for(const name of files){hashes[name]=await digest(join(directory,name));assert.equal(hashes[name],sums.get(name),'Checksum mismatch: '+name);}
assert.equal(hashes['cyinstaller.json'],metadata.manifest.sha256);
for(const platform of ['win-x64','linux-x64']){
  for(const kind of ['payload','engine','setup']){
    const asset=metadata.assets[platform][kind];assert.equal(basename(asset.file),asset.file);
    assert.equal((await stat(join(directory,asset.file))).size,asset.size);assert.equal(hashes[asset.file],asset.sha256);
  }
  const bootstrap=`${source.app.file_name}-${platform}-websetup${platform==='win-x64'?'.exe':'.run'}`;
  assert(hashes[bootstrap],'Missing online bootstrap: '+bootstrap);
}
const report={version,appId:source.app.id,platforms:Object.keys(metadata.assets),ed25519Verified:true,permanentTrustVerified:true,
  allChecksumsVerified:true,files:files.map(name=>({name,sha256:hashes[name]})),published:false};
if(values.report)await writeFile(resolve(values.report),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
