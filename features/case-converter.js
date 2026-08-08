import { createEditor } from './_editor.js';

const PLACEHOLDER = 'Type or paste text, then pick a case below.';

// Break a string into "words" while preserving non-word separators so we can
// rebuild snake_case / kebab-case / etc. without losing line breaks.
function splitWords(s) {
  // Insert spaces at camelCase boundaries so existing camelCase splits cleanly.
  const normalized = s
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  return normalized.match(/[A-Za-z0-9]+/g) || [];
}

const transforms = {
  upper: (s) => s.toUpperCase(),

  lower: (s) => s.toLowerCase(),

  // Each word capitalized.
  title: (s) =>
    s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),

  // Only the first letter of each sentence is uppercase.
  sentence: (s) => {
    const lower = s.toLowerCase();
    // Capitalize first non-space letter, and any letter that follows .!? + whitespace.
    return lower.replace(/(^|[.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
  },

  // aLtErNaTiNg cAsE — toggle on every alphabetic character.
  alternating: (s) => {
    let i = 0;
    return s.replace(/[A-Za-z]/g, (c) => {
      const out = i % 2 === 0 ? c.toLowerCase() : c.toUpperCase();
      i++;
      return out;
    });
  },

  // Flip each letter's case.
  inverse: (s) =>
    s.replace(/[A-Za-z]/g, (c) =>
      c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()
    ),

  camel: (s) => {
    const words = splitWords(s);
    return words
      .map((w, i) =>
        i === 0
          ? w.toLowerCase()
          : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      )
      .join('');
  },

  pascal: (s) => {
    const words = splitWords(s);
    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
  },

  snake: (s) => splitWords(s).map((w) => w.toLowerCase()).join('_'),

  constant: (s) => splitWords(s).map((w) => w.toUpperCase()).join('_'),

  kebab: (s) => splitWords(s).map((w) => w.toLowerCase()).join('-'),

  dot: (s) => splitWords(s).map((w) => w.toLowerCase()).join('.'),
};

const ACTIONS = [
  { label: 'UPPER CASE', onClick: ({ getValue, setValue }) => setValue(transforms.upper(getValue())) },
  { label: 'lower case', onClick: ({ getValue, setValue }) => setValue(transforms.lower(getValue())) },
  { label: 'Title Case', onClick: ({ getValue, setValue }) => setValue(transforms.title(getValue())) },
  { label: 'Sentence case', onClick: ({ getValue, setValue }) => setValue(transforms.sentence(getValue())) },
  { label: 'aLtErNaTiNg', onClick: ({ getValue, setValue }) => setValue(transforms.alternating(getValue())) },
  { label: 'InVeRsE', onClick: ({ getValue, setValue }) => setValue(transforms.inverse(getValue())) },
  { label: 'camelCase', onClick: ({ getValue, setValue }) => setValue(transforms.camel(getValue())) },
  { label: 'PascalCase', onClick: ({ getValue, setValue }) => setValue(transforms.pascal(getValue())) },
  { label: 'snake_case', onClick: ({ getValue, setValue }) => setValue(transforms.snake(getValue())) },
  { label: 'CONSTANT_CASE', onClick: ({ getValue, setValue }) => setValue(transforms.constant(getValue())) },
  { label: 'kebab-case', onClick: ({ getValue, setValue }) => setValue(transforms.kebab(getValue())) },
  { label: 'dot.case', onClick: ({ getValue, setValue }) => setValue(transforms.dot(getValue())) },
];

export const caseConverter = {
  id: 'case-converter',
  navLabel: 'Case Converter',
  navIcon: 'Aa',
  title: 'Case Converter',
  subtitle: 'Transform the text in the box to the case you want.',
  actions: ACTIONS,
  render(container) {
    return createEditor({
      container,
      storageKey: 'tw::case-converter',
      placeholderText: PLACEHOLDER,
      buttons: ACTIONS,
      toolbarLeft: [
        {
          label: 'Copy',
          className: 'tw-btn tw-btn-primary',
          onClick: async ({ getValue }) => {
            try {
              await navigator.clipboard.writeText(getValue());
              window.tw.toast('Copied to clipboard');
            } catch {
              window.tw.toast('Copy failed');
            }
          },
        },
      ],
      toolbarRight: [
        {
          label: 'Clear',
          className: 'tw-btn tw-btn-ghost',
          onClick: ({ setValue }) => setValue(''),
        },
      ],
    });
  },
};
