import { createEditor, askInputs } from './_editor.js';

const PLACEHOLDER = 'Paste text from a terminal, doc, or anywhere — then clean, sort, dedupe, or transform it.';

const norm = (s) => s.replace(/\r\n?/g, '\n');

const T = {
  trimTrailing: (s) =>
    norm(s).split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n'),
  trimEach: (s) => norm(s).split('\n').map((l) => l.trim()).join('\n'),
  collapseSpaces: (s) =>
    norm(s)
      .split('\n')
      .map((l) => {
        const m = l.match(/^[ \t]*/);
        const indent = m ? m[0] : '';
        return indent + l.slice(indent.length).replace(/[ \t]+/g, ' ');
      })
      .join('\n'),
  removeBlankLines: (s) =>
    norm(s).split('\n').filter((l) => l.trim() !== '').join('\n'),
  tabsToSpaces: (s) => norm(s).replace(/\t/g, '    '),
  removeLineBreaks: (s) => norm(s).replace(/\n+/g, ' ').replace(/  +/g, ' ').trim(),
  removeDuplicateLines: (s) => {
    const seen = new Set();
    const out = [];
    for (const line of norm(s).split('\n')) {
      if (!seen.has(line)) {
        seen.add(line);
        out.push(line);
      }
    }
    return out.join('\n');
  },
  sortLinesAsc: (s) =>
    norm(s).split('\n').sort((a, b) => a.localeCompare(b)).join('\n'),
  sortLinesDesc: (s) =>
    norm(s).split('\n').sort((a, b) => b.localeCompare(a)).join('\n'),
  reverseLineOrder: (s) => norm(s).split('\n').reverse().join('\n'),
  reverseText: (s) => Array.from(norm(s)).reverse().join(''),
  sortWords: (s) => {
    const words = norm(s).match(/\S+/g) || [];
    return words.sort((a, b) => a.localeCompare(b)).join(' ');
  },
  removeEmDashes: (s) => norm(s).replace(/[—–]/g, ''),
  removeUnderscores: (s) => norm(s).replace(/_+/g, ' '),

  // Drop ANSI escape sequences (terminal color/style codes).
  stripAnsi: (s) => norm(s).replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, ''),

  // Drop HTML/XML tags but keep their text content.
  stripHtml: (s) => norm(s).replace(/<[^>]*>/g, ''),

  // Curly quotes -> ASCII.
  smartToStraight: (s) =>
    norm(s)
      .replace(/[‘’‚‛′]/g, "'")
      .replace(/[“”„‟″]/g, '"')
      .replace(/…/g, '...')
      .replace(/[–—]/g, '-'),

  // ASCII quotes/dashes -> typographic versions.
  straightToSmart: (s) => {
    let out = norm(s)
      .replace(/(^|[\s(\[{"'])"/g, '$1“')
      .replace(/"/g, '”')
      .replace(/(^|[\s(\[{"“])'/g, '$1‘')
      .replace(/'/g, '’')
      .replace(/---/g, '—')
      .replace(/--/g, '–')
      .replace(/\.\.\./g, '…');
    return out;
  },

  // Add "1. ", "2. ", … to each non-blank line.
  addLineNumbers: (s) => {
    const lines = norm(s).split('\n');
    const pad = String(lines.length).length;
    let n = 0;
    return lines
      .map((l) => (l.trim() === '' ? l : `${String(++n).padStart(pad, ' ')}. ${l}`))
      .join('\n');
  },

  // Strip leading line numbers (formats: "1. ", "1) ", "1: ", "1- ").
  stripLineNumbers: (s) =>
    norm(s).split('\n').map((l) => l.replace(/^\s*\d+[.):\-]\s*/, '')).join('\n'),

  // Join lines within each paragraph (paragraphs are separated by blank lines).
  unwrapParagraphs: (s) =>
    norm(s)
      .split(/\n\s*\n/)
      .map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean).join(' '))
      .join('\n\n'),

  // Heuristic: join lines that look like tmux/terminal soft wraps —
  // line N doesn't end with terminal punctuation and line N+1 isn't a list
  // marker / header / blank.
  dewrapTerminal: (s) => {
    const lines = norm(s).split('\n').map((l) => l.replace(/[ \t]+$/, ''));
    const out = [];
    let i = 0;
    while (i < lines.length) {
      let line = lines[i];
      while (i + 1 < lines.length) {
        const next = lines[i + 1];
        const nextTrim = next.replace(/^\s+/, '');
        const isBlank = next.trim() === '';
        const isList = /^([-*+•]|\d+[.)]|[#>])\s/.test(nextTrim);
        const endsHard = /[.!?:;)\]}"”]$/.test(line);
        if (isBlank || isList || endsHard || !line.length) break;
        line = line + ' ' + nextTrim;
        i++;
      }
      out.push(line);
      i++;
    }
    return out.join('\n');
  },
};

async function wrapToWidth(text) {
  const ans = await askInputs({
    title: 'Wrap text to width',
    fields: [{ key: 'width', label: 'Column width', type: 'number', default: '80' }],
    submitLabel: 'Wrap',
  });
  if (!ans) return text;
  const w = Math.max(10, parseInt(ans.width, 10) || 80);
  return norm(text)
    .split(/\n\s*\n/)
    .map((para) => {
      const words = para.replace(/\s+/g, ' ').trim().split(' ');
      const lines = [];
      let cur = '';
      for (const word of words) {
        if (!cur) cur = word;
        else if ((cur + ' ' + word).length <= w) cur += ' ' + word;
        else { lines.push(cur); cur = word; }
      }
      if (cur) lines.push(cur);
      return lines.join('\n');
    })
    .join('\n\n');
}

async function indentText(text) {
  const ans = await askInputs({
    title: 'Indent every line',
    fields: [{ key: 'n', label: 'Spaces', type: 'number', default: '2' }],
    submitLabel: 'Indent',
  });
  if (!ans) return text;
  const n = Math.max(0, parseInt(ans.n, 10) || 0);
  const pad = ' '.repeat(n);
  return norm(text).split('\n').map((l) => (l ? pad + l : l)).join('\n');
}

async function dedentText(text) {
  const ans = await askInputs({
    title: 'Dedent every line',
    fields: [{ key: 'n', label: 'Spaces (blank = auto, removes common leading whitespace)', default: '' }],
    submitLabel: 'Dedent',
  });
  if (!ans) return text;
  const lines = norm(text).split('\n');
  let n = parseInt(ans.n, 10);
  if (!Number.isFinite(n)) {
    const indents = lines
      .filter((l) => l.trim() !== '')
      .map((l) => l.match(/^[ \t]*/)[0].length);
    n = indents.length ? Math.min(...indents) : 0;
  }
  return lines.map((l) => l.replace(new RegExp(`^[ \\t]{0,${n}}`), '')).join('\n');
}

async function findReplace(text) {
  const ans = await askInputs({
    title: 'Find & Replace',
    fields: [
      { key: 'find', label: 'Find', placeholder: 'text to find' },
      { key: 'replace', label: 'Replace with', placeholder: '(leave empty to delete)' },
    ],
    submitLabel: 'Replace all',
  });
  if (!ans || !ans.find) return text;
  return norm(text).split(ans.find).join(ans.replace ?? '');
}

async function removeChars(text) {
  const ans = await askInputs({
    title: 'Remove characters',
    fields: [
      {
        key: 'chars',
        label: 'Characters to remove (each character is removed individually)',
        placeholder: 'e.g. .,;:',
      },
    ],
    submitLabel: 'Remove',
  });
  if (!ans || !ans.chars) return text;
  const set = new Set(Array.from(ans.chars));
  return Array.from(norm(text)).filter((c) => !set.has(c)).join('');
}

async function repeatText(text) {
  const ans = await askInputs({
    title: 'Repeat text',
    fields: [
      { key: 'count', label: 'Times to repeat', type: 'number', default: '2' },
      { key: 'sep', label: 'Separator (\\n for new line)', default: '\\n' },
    ],
    submitLabel: 'Repeat',
  });
  if (!ans) return text;
  const n = Math.max(1, Math.min(10000, parseInt(ans.count, 10) || 1));
  const sep = (ans.sep ?? '').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  return Array(n).fill(text).join(sep);
}

const ACTIONS = [
  { section: 'Whitespace' },
  { label: 'Clean (trim trailing)', className: 'tw-btn tw-btn-primary',
    onClick: ({ getValue, setValue }) => { setValue(T.trimTrailing(getValue())); window.tw.toast('Trailing whitespace removed'); } },
  { label: 'Trim each line', onClick: ({ getValue, setValue }) => setValue(T.trimEach(getValue())) },
  { label: 'Collapse spaces', onClick: ({ getValue, setValue }) => setValue(T.collapseSpaces(getValue())) },
  { label: 'Remove blank lines', onClick: ({ getValue, setValue }) => setValue(T.removeBlankLines(getValue())) },
  { label: 'Tabs → spaces', onClick: ({ getValue, setValue }) => setValue(T.tabsToSpaces(getValue())) },

  { section: 'Lines' },
  { label: 'Remove line breaks', onClick: ({ getValue, setValue }) => setValue(T.removeLineBreaks(getValue())) },
  { label: 'Unwrap paragraphs', onClick: ({ getValue, setValue }) => setValue(T.unwrapParagraphs(getValue())) },
  { label: 'De-wrap terminal lines', onClick: ({ getValue, setValue }) => setValue(T.dewrapTerminal(getValue())) },
  { label: 'Wrap to width…', onClick: async ({ getValue, setValue }) => setValue(await wrapToWidth(getValue())) },
  { label: 'Remove duplicate lines', onClick: ({ getValue, setValue }) => setValue(T.removeDuplicateLines(getValue())) },
  { label: 'Sort lines A→Z', onClick: ({ getValue, setValue }) => setValue(T.sortLinesAsc(getValue())) },
  { label: 'Sort lines Z→A', onClick: ({ getValue, setValue }) => setValue(T.sortLinesDesc(getValue())) },
  { label: 'Reverse line order', onClick: ({ getValue, setValue }) => setValue(T.reverseLineOrder(getValue())) },
  { label: 'Add line numbers', onClick: ({ getValue, setValue }) => setValue(T.addLineNumbers(getValue())) },
  { label: 'Strip line numbers', onClick: ({ getValue, setValue }) => setValue(T.stripLineNumbers(getValue())) },
  { label: 'Indent…', onClick: async ({ getValue, setValue }) => setValue(await indentText(getValue())) },
  { label: 'Dedent…', onClick: async ({ getValue, setValue }) => setValue(await dedentText(getValue())) },

  { section: 'Words & characters' },
  { label: 'Reverse text', onClick: ({ getValue, setValue }) => setValue(T.reverseText(getValue())) },
  { label: 'Sort words A→Z', onClick: ({ getValue, setValue }) => setValue(T.sortWords(getValue())) },
  { label: 'Remove em dashes', onClick: ({ getValue, setValue }) => setValue(T.removeEmDashes(getValue())) },
  { label: 'Remove underscores', onClick: ({ getValue, setValue }) => setValue(T.removeUnderscores(getValue())) },
  { label: 'Strip HTML tags', onClick: ({ getValue, setValue }) => setValue(T.stripHtml(getValue())) },
  { label: 'Strip ANSI codes', onClick: ({ getValue, setValue }) => setValue(T.stripAnsi(getValue())) },
  { label: 'Smart → straight quotes', onClick: ({ getValue, setValue }) => setValue(T.smartToStraight(getValue())) },
  { label: 'Straight → smart quotes', onClick: ({ getValue, setValue }) => setValue(T.straightToSmart(getValue())) },

  { section: 'Custom' },
  { label: 'Find & replace…', onClick: async ({ getValue, setValue }) => setValue(await findReplace(getValue())) },
  { label: 'Remove characters…', onClick: async ({ getValue, setValue }) => setValue(await removeChars(getValue())) },
  { label: 'Repeat text…', onClick: async ({ getValue, setValue }) => setValue(await repeatText(getValue())) },
];

export const textTools = {
  id: 'text-tools',
  navLabel: 'Text Tools',
  navIcon: 'T',
  title: 'Text Tools',
  subtitle: 'Clean, reshape, sort, and transform text.',
  actions: ACTIONS,
  render(container) {
    return createEditor({
      container,
      // Inherit content from the original whitespace-cleaner key so existing
      // saved text carries over.
      storageKey: 'tw::whitespace-cleaner',
      placeholderText: PLACEHOLDER,
      buttons: ACTIONS,
      toolbarLeft: [
        {
          label: 'Copy',
          className: 'tw-btn tw-btn-primary',
          onClick: async ({ getValue }) => {
            try { await navigator.clipboard.writeText(getValue()); window.tw.toast('Copied to clipboard'); }
            catch { window.tw.toast('Copy failed'); }
          },
        },
      ],
      toolbarRight: [
        { label: 'Clear', className: 'tw-btn tw-btn-ghost', onClick: ({ setValue }) => setValue('') },
      ],
    });
  },
};
