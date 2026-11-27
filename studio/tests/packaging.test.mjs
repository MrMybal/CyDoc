import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { copyRuntime } from '../desktop/copy-runtime.mjs';

test('packaging preserves nested runtime versions and package data, excluding build-only packages', async () => {
  const work = await mkdtemp(join(tmpdir(),'cydoc-runtime-packages-'));
  try {
    const source=join(work,'source'), output=join(work,'output');
    async function pkg(path, metadata, data) {
      const directory=join(source,path);await mkdir(directory,{recursive:true});
      await writeFile(join(directory,'package.json'),JSON.stringify(metadata));
      await writeFile(join(directory,'LICENSE'),'Fixture license');
      await writeFile(join(directory,'data.txt'),data);
    }
    await pkg('node_modules/server',{name:'server',dependencies:{shared:'1',nested:'1'},optionalDependencies:{absent:'1'}},'server');
    await pkg('node_modules/shared',{name:'shared'},'v1');
    await pkg('node_modules/nested',{name:'nested',dependencies:{shared:'2'}},'nested');
    await pkg('node_modules/nested/node_modules/shared',{name:'shared'},'v2');
    await pkg('node_modules/build-only',{name:'build-only'},'unused');
    await copyRuntime(source,output,['server']);
    assert.equal(await readFile(join(output,'node_modules/shared/data.txt'),'utf8'),'v1');
    assert.equal(await readFile(join(output,'node_modules/nested/node_modules/shared/data.txt'),'utf8'),'v2');
    assert.equal(await readFile(join(output,'node_modules/server/LICENSE'),'utf8'),'Fixture license');
    await assert.rejects(access(join(output,'node_modules/build-only')));
    await assert.rejects(copyRuntime(source,join(work,'missing'),['unknown']),/Missing runtime dependency/);
    await assert.rejects(copyRuntime(source,join(work,'escaped'),['..']),/Invalid package name/);
  } finally { await rm(work,{recursive:true,force:true}); }
});
