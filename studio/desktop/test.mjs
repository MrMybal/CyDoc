import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { startStudio } from '../server/server.mjs';
const studio=resolve(dirname(fileURLToPath(import.meta.url)),'..');
await mkdir(resolve(studio,'.tmp'),{recursive:true});
const directory=await mkdtemp(resolve(studio,'.tmp/core-test-'));
const localOnly=process.env.CYDOC_STUDIO_TEST_LOCAL==='1';
const app=await startStudio({directory:join(directory,'server'),port:0,localOnly});
try{
  let secret='';
  if(!localOnly){
  const setup=await fetch(`${app.origin}/api/setup`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'SDK Demo',email:'sdk@example.com',password:'example-sdk-passphrase',code:app.setupSecret})});
  if(setup.status!==201)throw new Error('Fixture setup failed.');
  const token=await fetch(`${app.origin}/api/tokens`,{method:'POST',headers:{'Content-Type':'application/json',Cookie:setup.headers.get('set-cookie').split(';')[0]},body:'{"name":"Test SDK"}'}).then(response=>response.json());
  secret=token.token;
  }
  const fixture=join(directory,'fixture.json');await writeFile(fixture,JSON.stringify({origin:app.origin,token:secret,localOnly}),{mode:0o600});
  const python=process.env.CYDOC_TEST_PYTHON||resolve(studio,'runtime/python/Scripts/python.exe');
  const result=await new Promise((done,reject)=>{const child=spawn(python,['-m','pytest','-q',resolve(studio,'desktop/tests')],{stdio:'inherit',windowsHide:true,env:{...process.env,CYDOC_STUDIO_TEST_FIXTURE:fixture}});child.on('error',reject);child.on('exit',done);});
  if(result)process.exitCode=result;
}finally{await app.close();await rm(directory,{recursive:true,force:true,maxRetries:5,retryDelay:50});}
