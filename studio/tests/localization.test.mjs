import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from '../../node_modules/typescript/lib/typescript.js';

test('French and English editor labels are complete and all literal UI lookups resolve',async()=>{
  const source=await readFile(new URL('../web/i18n.mjs',import.meta.url),'utf8');
  const file=ts.createSourceFile('i18n.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const labels={en:new Map(),fr:new Map()};
  const key=node=>node.name?.text;
  function collect(node){
    if(ts.isVariableDeclaration(node)&&node.name.getText(file)==='messages'){
      for(const locale of node.initializer.properties)for(const entry of locale.initializer.properties){
        labels[key(locale)].set(key(entry),entry.initializer.text);
      }
    }
    if(ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.EqualsToken){
      const match=node.left.getText(file).match(/^messages\.(en|fr)\.([\w]+)$/);
      if(match)labels[match[1]].set(match[2],node.right.text);
    }
    ts.forEachChild(node,collect);
  }
  collect(file);
  assert.deepEqual([...labels.fr.keys()].sort(),[...labels.en.keys()].sort());
  for(const [locale,entries] of Object.entries(labels))for(const [name,value] of entries){
    assert.equal(typeof value,'string',`${locale}.${name}`);assert.ok(value.trim(),`${locale}.${name}`);
  }
  const app=ts.createSourceFile('app.mjs',await readFile(new URL('../web/app.mjs',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  function inspect(node){
    if(ts.isCallExpression(node)&&node.expression.getText(app)==='t'&&ts.isStringLiteral(node.arguments[0])){
      assert.ok(labels.fr.has(node.arguments[0].text),'Missing French UI label: '+node.arguments[0].text);
    }
    ts.forEachChild(node,inspect);
  }
  inspect(app);
});
