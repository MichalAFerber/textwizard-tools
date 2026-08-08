import { createEditor } from './_editor.js';

const PLACEHOLDER = 'Paste text to analyze. Reports replace the content — use Undo to restore.';

function statsReport(s) {
  const text = s.replace(/\r\n?/g, '\n');
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text === '' ? 0 : text.split('\n').length;
  const paragraphs = text.split(/\n\s*\n+/).filter((p) => p.trim()).length;
  const sentences = (text.match(/[^.!?]+[.!?]+/g) || []).length;
  const readingMin = Math.max(1, Math.round(words / 250));
  const speakingMin = Math.max(1, Math.round(words / 130));
  return [
    'TextWizard — Stats Report',
    ''.padEnd(28, '─'),
    `Characters:       ${chars.toLocaleString()}`,
    `Characters (no spaces): ${charsNoSpaces.toLocaleString()}`,
    `Words:            ${words.toLocaleString()}`,
    `Sentences:        ${sentences.toLocaleString()}`,
    `Lines:            ${lines.toLocaleString()}`,
    `Paragraphs:       ${paragraphs.toLocaleString()}`,
    `Reading time:     ~${readingMin} min (at 250 wpm)`,
    `Speaking time:    ~${speakingMin} min (at 130 wpm)`,
  ].join('\n');
}

function wordFrequency(s, limit = 100) {
  const counts = new Map();
  const tokens = s.toLowerCase().match(/[a-z0-9']+/gi) || [];
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = sorted.slice(0, limit);
  if (!top.length) return 'No words found.';
  const padCount = Math.max(...top.map(([, c]) => String(c).length));
  const lines = [
    `Word frequency — top ${top.length} of ${sorted.length} unique words`,
    ''.padEnd(48, '─'),
    ...top.map(([w, c]) => `${String(c).padStart(padCount, ' ')}  ${w}`),
  ];
  return lines.join('\n');
}

function duplicateLines(s) {
  const counts = new Map();
  for (const line of s.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim()) continue;
    counts.set(line, (counts.get(line) || 0) + 1);
  }
  const dups = [...counts.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
  if (!dups.length) return 'No duplicate lines found.';
  const padCount = Math.max(...dups.map(([, c]) => String(c).length));
  return [
    `Duplicate lines — ${dups.length} found`,
    ''.padEnd(48, '─'),
    ...dups.map(([line, c]) => `${String(c).padStart(padCount, ' ')}×  ${line}`),
  ].join('\n');
}

function duplicateWords(s) {
  const counts = new Map();
  const tokens = s.toLowerCase().match(/[a-z0-9']+/gi) || [];
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  const dups = [...counts.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!dups.length) return 'No duplicate words found.';
  const padCount = Math.max(...dups.map(([, c]) => String(c).length));
  return [
    `Duplicate words — ${dups.length} appear more than once`,
    ''.padEnd(48, '─'),
    ...dups.map(([w, c]) => `${String(c).padStart(padCount, ' ')}×  ${w}`),
  ].join('\n');
}

function sentenceCount(s) {
  const sentences = (s.match(/[^.!?]+[.!?]+/g) || []).map((x) => x.trim()).filter(Boolean);
  if (!sentences.length) return 'No sentences detected (need ., !, or ? to terminate).';
  return [
    `Sentences: ${sentences.length}`,
    ''.padEnd(28, '─'),
    ...sentences.map((sent, i) => `${i + 1}. ${sent}`),
  ].join('\n');
}

const ACTIONS = [
  {
    label: 'Stats report',
    className: 'tw-btn tw-btn-primary',
    onClick: ({ getValue, setValue }) => setValue(statsReport(getValue())),
  },
  { label: 'Word frequency', onClick: ({ getValue, setValue }) => setValue(wordFrequency(getValue())) },
  { label: 'Duplicate lines', onClick: ({ getValue, setValue }) => setValue(duplicateLines(getValue())) },
  { label: 'Duplicate words', onClick: ({ getValue, setValue }) => setValue(duplicateWords(getValue())) },
  { label: 'Sentence list', onClick: ({ getValue, setValue }) => setValue(sentenceCount(getValue())) },
];

export const analyzers = {
  id: 'analyzers',
  navLabel: 'Analyzers',
  navIcon: '∑',
  title: 'Analyzers',
  subtitle: 'Count, profile, and find patterns in text. Use Undo to restore the original.',
  actions: ACTIONS,
  render(container) {
    return createEditor({
      container,
      storageKey: 'tw::analyzers',
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
