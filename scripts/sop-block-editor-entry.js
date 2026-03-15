/**
 * SOP Block Editor — vanilla bundle for the SOP app.
 * Uses the same npm packages as components/BlockEditor.js (no CDN).
 * Build: npm run build:sop-editor (from repo root)
 * Output: sop/public/js/block-editor.bundle.js
 */

import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';
import Quote from '@editorjs/quote';
import Code from '@editorjs/code';
import Delimiter from '@editorjs/delimiter';
import Warning from '@editorjs/warning';

function parseInitialData(val) {
  if (!val) return { blocks: [] };
  if (typeof val === 'object' && val.blocks) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (parsed.blocks) return parsed;
    } catch (e) {
      if (val.trim()) {
        return {
          blocks: [{ type: 'paragraph', data: { text: val } }]
        };
      }
    }
  }
  return { blocks: [] };
}

function init(holderIdOrElement, initialData, options = {}) {
  const { onChange, readOnly = false, minHeight = 200, placeholder = 'Start typing or press Tab to add a block...' } = options;
  const data = parseInitialData(initialData);
  const editor = new EditorJS({
    holder: holderIdOrElement,
    readOnly,
    placeholder,
    minHeight,
    data,
    tools: {
      paragraph: {
        class: Paragraph,
        inlineToolbar: true,
        config: { placeholder: 'Start typing or press Tab to add a block...' }
      },
      header: {
        class: Header,
        inlineToolbar: true,
        config: { placeholder: 'Enter a heading', levels: [2, 3, 4], defaultLevel: 2 }
      },
      list: {
        class: List,
        inlineToolbar: true,
        config: { defaultStyle: 'unordered' }
      },
      quote: {
        class: Quote,
        inlineToolbar: true,
        config: { quotePlaceholder: 'Enter a quote', captionPlaceholder: 'Quote author' }
      },
      code: {
        class: Code,
        config: { placeholder: 'Enter code...' }
      },
      delimiter: Delimiter,
      warning: {
        class: Warning,
        inlineToolbar: true,
        config: { titlePlaceholder: 'Title', messagePlaceholder: 'Message' }
      }
    },
    onChange: () => {
      if (editor && onChange) {
        editor.save().then((output) => onChange(output)).catch(() => {});
      }
    }
  });
  return editor;
}

export { init, parseInitialData };
