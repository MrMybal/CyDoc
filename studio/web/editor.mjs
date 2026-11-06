import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import CodeBlock from '@tiptap/extension-code-block';
import { TableKit } from '@tiptap/extension-table';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorView, keymap } from '@codemirror/view';
import { Prec, Transaction } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import * as Y from 'yjs';

// Keep public deep-link anchors when switching between Markdown and visual mode.
const StableHeading = Heading.extend({
  addAttributes() { return { ...this.parent?.(), anchor: { default: null, parseHTML: element => element.getAttribute('id'), renderHTML: attrs => attrs.anchor ? { id: attrs.anchor } : {} } }; },
  parseMarkdown(token, helpers) {
    const match = token.text?.match(/\s+\{#([a-zA-Z0-9_-]+)\}\s*$/), copy = structuredClone(token.tokens || []);
    if (match && copy.length) { const last = copy.at(-1); if (last.type === 'text') { last.text = last.text.replace(/\s+\{#[a-zA-Z0-9_-]+\}\s*$/, ''); last.raw = last.text; } }
    return helpers.createNode('heading', { level: token.depth || 1, anchor: match?.[1] || null }, helpers.parseInline(copy.filter(item=>item.type!=='text'||item.text)));
  },
  renderMarkdown(node, helpers) { return `${'#'.repeat(node.attrs?.level || 1)} ${helpers.renderChildren(node.content || [])}${node.attrs?.anchor ? ` {#${node.attrs.anchor}}` : ''}`; }
});
export function difference(before, after) {
  let start = 0; while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = before.length, nextEnd = after.length;
  while (end > start && nextEnd > start && before[end - 1] === after[nextEnd - 1]) { end--; nextEnd--; }
  // Do not split a UTF-16 surrogate pair.
  if (start > 0 && /[\uDC00-\uDFFF]/.test(before[start] || after[start] || '')) start--;
  return { from: start, to: end, insert: after.slice(start, nextEnd) };
}
export function bindEditor({ visual, source, body, writable, onChange, assetBase = '', labels = {} }) {
  let updating = false, mode = 'visual', base = body, rich, code;
  const localOrigin = Symbol('editor');
  const doc = new Y.Doc(), shared = doc.getText('markdown');
  const undo = new Y.UndoManager(shared, { trackedOrigins: new Set([localOrigin]), captureTimeout: 500 });
  function change(value) {
    if (updating || !writable || value === shared.toString()) return;
    const delta = difference(shared.toString(), value);
    doc.transact(() => { if (delta.to > delta.from) shared.delete(delta.from, delta.to - delta.from); if (delta.insert) shared.insert(delta.from, delta.insert); }, localOrigin);
  }
  const mediaUrl = value => typeof value === 'string' && /^assets\/[a-zA-Z0-9_./%~-]+$/.test(value) && !value.includes('..') ? assetBase + value : '';
  const LocalImage = Image.extend({
    addNodeView() { return ({ node }) => { const dom = document.createElement('img'); dom.src = mediaUrl(node.attrs.src); dom.alt = node.attrs.alt || ''; return { dom }; }; }
  });
  const RichCode = CodeBlock.extend({
    renderMarkdown(node){const value=(node.content||[]).map(child=>child.text||'').join('');const runs=value.match(/`+/g)||[];const fence='`'.repeat(Math.max(3,...runs.map(run=>run.length+1)));return `${fence}${node.attrs?.language||''}\n${value}\n${fence}`;},
    addNodeView() { return ({ node }) => {
      const dom = document.createElement('div'), head = document.createElement('div'), title = document.createElement('strong'), picture = document.createElement('div'), details = document.createElement('details'), summary = document.createElement('summary'), pre = document.createElement('pre'), code = document.createElement('code');
      dom.className = 'rich-block'; head.className = 'rich-block-head'; head.contentEditable = 'false'; head.append(title); picture.contentEditable = 'false'; summary.contentEditable = 'false'; summary.textContent = labels.configuration || 'Configuration'; pre.append(code); details.append(summary,pre); dom.append(head,picture,details);
      function update(value) {
        const kind = value.attrs.language || ''; title.textContent = kind || labels.code || 'Code';
        const richKinds = ['image','video','gif','mesh','gallery','diagram','graph','blueprint','callout','details','tabs','steps','diff','glossary'];
        const isRich = richKinds.includes(kind); dom.classList.toggle('plain-code',!isRich); details.open = !isRich;
        picture.replaceChildren();
        try {
          const data = JSON.parse(value.textContent);
          const image = ['image','gif'].includes(kind) ? data.src : kind === 'gallery' ? data.items?.find(item => item.type === 'image')?.src : null;
          if (image && mediaUrl(image)) { const img = document.createElement('img');img.src=mediaUrl(image);img.alt=data.alt||data.title||'';picture.append(img); }
          else if (kind === 'video' && mediaUrl(data.src)) { const video=document.createElement('video');video.src=mediaUrl(data.src);video.controls=true;video.setAttribute('controlsList','nofullscreen nodownload noremoteplayback');video.disablePictureInPicture=true;video.disableRemotePlayback=true;video.preload='metadata';picture.append(video); }
          const caption=document.createElement('p');caption.textContent=data.title||data.alt||data.src||(['callout','details'].includes(kind)?data.body:'');if(caption.textContent)picture.append(caption);
        } catch { /* In-progress JSON remains editable; it is never discarded. */ }
      }
      update(node); return { dom, contentDOM: code, update(value) { if (value.type !== node.type) return false; update(value);return true; }, ignoreMutation(mutation){return mutation.type!=='selection'&&!code.contains(mutation.target)&&mutation.target!==code;},stopEvent(event) { return event.target.closest('summary,video') !== null; } };
    }; }
  });
  rich = new Editor({
    element: visual, editable: writable,
    extensions: [StarterKit.configure({ heading: false, codeBlock: false, undoRedo: false, link: { openOnClick: false, protocols: ['doc'], isAllowedUri: url => /^(?:https?:\/\/|mailto:|doc:|#)/.test(url) } }), StableHeading, RichCode, Markdown, LocalImage.configure({ allowBase64: false }), TableKit, Placeholder.configure({ placeholder: labels.placeholder || 'Start writing…' })],
    content: body, contentType: 'markdown',
    onUpdate: () => { if (!updating) change(rich.getMarkdown()); },
    editorProps: { handleKeyDown: (_, event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? undo.redo() : undo.undo(); return true; } return false; } }
  });
  code = new EditorView({ parent: source, doc: body, extensions: [Prec.highest(keymap.of([{key:'Mod-z',run:()=>{undo.undo();return true;}},{key:'Mod-Shift-z',run:()=>{undo.redo();return true;}},{key:'Mod-y',run:()=>{undo.redo();return true;}}])),basicSetup, markdown(), EditorView.lineWrapping, EditorView.editable.of(writable), EditorView.updateListener.of(update => { if (update.docChanged && !updating) change(code.state.doc.toString()); })] });
  function render() {
    const value = shared.toString(); base = value; updating = true;
    try {
      if (rich.getMarkdown() !== value) {
        const selection = rich.state.selection;
        rich.commands.setContent(value, { contentType: 'markdown', emitUpdate: false });
        rich.commands.setTextSelection({ from: Math.min(selection.from, rich.state.doc.content.size), to: Math.min(selection.to, rich.state.doc.content.size) });
      }
      if (code.state.doc.toString() !== value) code.dispatch({ changes: difference(code.state.doc.toString(), value),annotations:Transaction.addToHistory.of(false) });
    } finally { updating = false; }
  }
  shared.observe(render);
  doc.on('update', (update, origin) => { if (origin !== 'server') onChange(update, shared.toString()); });
  return {
    doc, shared, rich, undo,
    initialize(update) { Y.applyUpdate(doc, update, 'server'); },
    apply(update) { Y.applyUpdate(doc, update, 'server'); },
    setMode(value) { mode = value; visual.hidden = mode !== 'visual'; source.hidden = mode !== 'source'; },
    insert(value) { if (mode === 'visual') rich.commands.insertContent(value, { contentType: 'markdown' }); else code.dispatch({ changes: { from: code.state.selection.main.from, to: code.state.selection.main.to, insert: value } }); },
    destroy() { shared.unobserve(render); rich.destroy(); code.destroy(); undo.destroy(); doc.destroy(); }
  };
}
