import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Window } from '../../node_modules/happy-dom/lib/index.js';
import { applyTheme, themeIds } from '../web/appearance.mjs';
import { themes } from '../../dist/themes.js';
import { studioThemes, studioThemeCss } from '../theme-catalog.mjs';
import { connectReaderAppearance } from '../web/reader-appearance.mjs';

test('changing the theme clears legacy native overrides and persists the selected palette', async () => {
  const window = new Window();
  const previousDocument = globalThis.document, previousStorage = globalThis.localStorage;
  globalThis.document = window.document; globalThis.localStorage = window.localStorage;
  try {
    document.documentElement.style.setProperty('--bg','rgba(190,190,190,1)');
    document.documentElement.style.setProperty('--accent','rgba(255,150,0,1)');
    assert.equal(applyTheme('light'), 'light');
    assert.equal(document.documentElement.style.getPropertyValue('--bg'), '');
    assert.equal(document.documentElement.style.getPropertyValue('--accent'), '');
    assert.equal(document.documentElement.style.colorScheme, 'light');
    for (const theme of themeIds) {
      applyTheme(theme); assert.equal(document.documentElement.dataset.theme, theme);
      assert.equal(localStorage.getItem('cydoc-studio-theme'), theme);
    }
    assert.equal(applyTheme('light-grey'), 'light');
  } finally { globalThis.document=previousDocument;globalThis.localStorage=previousStorage;await window.happyDOM.close(); }
});

test('the bundled reader receives all six themes and forwards its selection to the native app', async () => {
  const window = new Window();
  const messages = []; let receive;
  window.cyuiNative = { addEventListener: (type, handler) => {receive=handler;}, postMessage: value=>messages.push(value) };
  window.document.body.innerHTML='<div class="cydoc-viewer"><button data-set-theme="paper">Paper</button></div>';
  connectReaderAppearance(window);
  assert.equal(messages[0].type, 'reader-ready');
  const root = window.document.querySelector('.cydoc-viewer');
  for (const theme of themeIds) {
    receive({data:{protocol:'cyui.web',version:1,type:'theme',payload:{theme}}});
    assert.equal(root.dataset.theme, theme);
    assert.equal(window.localStorage.getItem('cydoc:theme'), theme);
  }
  window.document.querySelector('button').click();
  assert.deepEqual(messages.at(-1),{protocol:'cyui.web',version:1,type:'appearance',payload:{theme:'paper'}});
  receive({data:{protocol:'cyui.web',version:1,type:'theme',payload:{theme:'unknown'}}});
  assert.equal(root.dataset.theme,'contrast');
  await window.happyDOM.close();
});

test('Studio exposes every reader theme using the reader palette, with readable text and links', async () => {
  const catalog = await studioThemes();
  assert.deepEqual(themeIds, themes.map(theme=>theme.id));
  assert.deepEqual(catalog.map(({id,fr,en,color})=>({id,fr,en,color})), themes);
  const css = studioThemeCss(catalog);
  const luminance = hex => {
    const rgb = hex.length === 3 ? [...hex].map(char=>parseInt(char+char,16)) : hex.match(/../g).map(pair=>parseInt(pair,16));
    return rgb.map(value=>value/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
  };
  for (const theme of themeIds) {
    const block = css.match(new RegExp(`:root\\[data-theme=${theme}\\]\\{([^}]+)\\}`))?.[1];
    assert.ok(block, theme);
    const values = Object.fromEntries([...block.matchAll(/--([\w-]+):#([a-f0-9]{3,6})(?:;|$)/g)].map(match=>[match[1],match[2]]));
    for (const token of ['text','muted','accent']) {
      const a=luminance(values.bg), b=luminance(values[token]);
      assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5, `${theme}: ${token}`);
    }
  }
});
