import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { startStudio } from './server.mjs';
import { atomic } from './storage.mjs';

const { values } = parseArgs({ options: { data: { type: 'string', default: './data' }, host: { type: 'string', default: '127.0.0.1' }, port: { type: 'string', default: '4310' }, origin: { type: 'string' }, local: { type: 'boolean', default: false }, 'allow-root': { type: 'string', multiple: true }, 'allow-roots-file':{type:'string'},ready: { type: 'string' } } });
const app = await startStudio({ directory: resolve(values.data), host: values.host, port: Number(values.port), publicOrigin: values.origin, localOnly: values.local, allowRoots: values['allow-root'],allowRootsFile:values['allow-roots-file'] });
console.error(`CyDoc Studio: ${app.origin}`);
if (!app.localOnly && !Object.keys(app.db.data.users).length && !values.ready) console.error(`First administrator setup code: ${app.setupSecret}`);
if (values.ready) await atomic(resolve(values.ready), JSON.stringify({ origin: app.origin, mode: app.localOnly ? 'local' : 'accounts', setupCode: Object.keys(app.db.data.users).length ? undefined : app.setupSecret }));
let closing = false;
async function close(){if(closing)return;closing=true;await app.close();process.exit(0);}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal,close);
// A desktop parent owns this private stdin pipe; no network endpoint can stop the service.
process.stdin.setEncoding('utf8');let pending='';
process.stdin.on('data',chunk=>{pending+=chunk;let end;while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);if(line.trim()==='cydoc:shutdown')close();}if(pending.length>1000)pending='';});
if(values.ready)process.stdin.on('end',close);
