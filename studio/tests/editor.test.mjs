import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from '../../node_modules/happy-dom/lib/index.js';
import * as Y from 'yjs';

test('visual edits preserve explicit anchors, CyDoc JSON blocks, public links and code languages',async()=>{
  const window=new Window({url:'http://localhost/'});
  const originals=new Map();
  for(const key of ['window','document','navigator','Node','HTMLElement','Element','MutationObserver','getComputedStyle','requestAnimationFrame','cancelAnimationFrame','DOMParser','KeyboardEvent','Range']){
    originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
    Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:typeof window[key]==='function'&&/^(getComputedStyle|requestAnimationFrame|cancelAnimationFrame)$/.test(key)?window[key].bind(window):window[key]});
  }
  try{
    const {bindEditor}=await import('../web/editor.mjs');
    const visual=document.createElement('div'),source=document.createElement('div');document.body.append(visual,source);
    const body='## **A stable section** {#public-anchor}\n\n[Open](doc:overview#public-anchor).\n\n```image\n{"id":"stable-media","src":"assets/example.png","alt":"Example","controls":"minimal"}\n```\n\n```hlsl\nfloat4 main() : SV_Target { return 1; }\n```\n\n````markdown\n```cpp\nopenHelp();\n```\n````\n';
    let updates=0;const editor=bindEditor({visual,source,body,writable:true,onChange:()=>updates++,assetBase:'/api/projects/example/'});
    const server=new Y.Doc();server.getText('markdown').insert(0,body);editor.initialize(Y.encodeStateAsUpdate(server));
    await new Promise(resolve=>setTimeout(resolve,40));assert.equal(updates,0,'Opening the visual editor must not rewrite the file.');assert.equal(editor.shared.toString(),body);
    assert.equal(visual.querySelector('h2')?.id,'public-anchor');
    assert.equal(visual.querySelector('img')?.getAttribute('src'),'/api/projects/example/assets/example.png');
    editor.rich.commands.insertContentAt(editor.rich.state.doc.content.size,{type:'paragraph',content:[{type:'text',text:'An authored addition.'}]});
    const result=editor.shared.toString();assert.match(result,/\{#public-anchor\}/);assert.match(result,/doc:overview#public-anchor/);assert.match(result,/"id":"stable-media"/);assert.match(result,/```hlsl\nfloat4/);assert.match(result,/An authored addition/);
    assert.match(result,/````markdown\n```cpp\nopenHelp\(\);\n```\n````/);
    editor.destroy();server.destroy();
  }finally{
    await window.happyDOM.close();for(const[key,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  }
});
