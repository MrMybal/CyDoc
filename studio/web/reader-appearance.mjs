import { themes } from '../../dist/themes.js';

/** Native theme bridge for Studio's bundled manual only, never exported app manuals. */
export function connectReaderAppearance(target = window) {
  const bridge = target.cyuiNative;
  if (!bridge?.addEventListener) return;
  const ids = themes.map(theme => theme.id);
  let pending, observer;
  function apply() {
    const root = target.document.querySelector('.cydoc-viewer');
    if (!root || !pending) return;
    observer?.disconnect();
    root.dataset.theme = pending;
    root.querySelectorAll('[data-set-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.setTheme === pending)));
    target.localStorage.setItem('cydoc:theme', pending);
    bridge.postMessage({protocol:'cyui.web',version:1,type:'appearance-applied',payload:{theme:pending,reader:true}});
  }
  bridge.addEventListener('message', event => {
    const message = event.data;
    if(message?.protocol!=='cyui.web'||message.version!==1||message.type!=='theme'||!ids.includes(message.payload?.theme))return;
    pending = message.payload.theme;
    apply();
    if(!target.document.querySelector('.cydoc-viewer')){
      observer?.disconnect();observer=new target.MutationObserver(apply);
      observer.observe(target.document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    }
  });
  target.document.addEventListener('click', event => {
    const theme = event.target.closest?.('[data-set-theme]')?.dataset.setTheme;
    if(ids.includes(theme))bridge.postMessage({protocol:'cyui.web',version:1,type:'appearance',payload:{theme}});
  });
  bridge.postMessage({protocol:'cyui.web',version:1,type:'reader-ready'});
}
if(typeof window!=='undefined')connectReaderAppearance();
