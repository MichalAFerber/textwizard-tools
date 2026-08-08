import { createEditor, askInputs } from './_editor.js';

const PLACEHOLDER = 'Generators write their output here. "Random choice" reads the lines you paste in.';

const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const LOREM = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod ' +
  'tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis ' +
  'nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis ' +
  'aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur').split(' ');

function uuidLines(n) {
  return Array.from({ length: n }, () => crypto.randomUUID()).join('\n');
}

function makePassword(len, { lower = true, upper = true, digits = true, symbols = false } = {}) {
  let pool = '';
  if (lower) pool += LETTERS;
  if (upper) pool += LETTERS.toUpperCase();
  if (digits) pool += '0123456789';
  if (symbols) pool += '!@#$%^&*()-_=+[]{};:,.?/';
  if (!pool) pool = LETTERS;
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < len; i++) out += pool[buf[i] % pool.length];
  return out;
}

function randomNumbers(min, max, count) {
  if (min > max) [min, max] = [max, min];
  return Array.from({ length: count }, () => String(randInt(min, max))).join('\n');
}

const randomLetter = () => pick(LETTERS.split(''));
const randomMonth = () => pick(MONTHS);

function randomDates(startStr, endStr, count) {
  const a = new Date(startStr).getTime();
  const b = new Date(endStr).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) throw new Error('Enter valid start and end dates (YYYY-MM-DD)');
  const lo = Math.min(a, b), hi = Math.max(a, b);
  return Array.from({ length: count }, () =>
    new Date(lo + Math.random() * (hi - lo)).toISOString().slice(0, 10)
  ).join('\n');
}

function randomChoice(text, n) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) throw new Error('Paste some non-empty lines to choose from first');
  const shuffled = [...lines];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(n, shuffled.length)).join('\n');
}

const randomIP = () => Array.from({ length: 4 }, () => randInt(0, 255)).join('.');
const randomHexColor = () =>
  '#' + Array.from({ length: 3 }, () => randInt(0, 255).toString(16).padStart(2, '0')).join('');

function loremIpsum(paras, wordsPer) {
  const out = [];
  for (let p = 0; p < paras; p++) {
    const words = Array.from({ length: wordsPer }, () => pick(LOREM));
    const s = words.join(' ');
    out.push(s.charAt(0).toUpperCase() + s.slice(1) + '.');
  }
  return out.join('\n\n');
}

// ---- Sample structured data (JSON / XML / CSV) ----
const FIRST_NAMES = ['Ava', 'Liam', 'Noah', 'Emma', 'Olivia', 'Ethan', 'Mia', 'Lucas',
  'Sophia', 'Mason', 'Isla', 'Leo', 'Aria', 'Kai', 'Zoe', 'Ivy', 'Owen', 'Nora', 'Finn', 'Ruby'];
const LAST_NAMES = ['Smith', 'Johnson', 'Lee', 'Brown', 'Garcia', 'Martin', 'Nguyen', 'Patel',
  'Khan', 'Silva', 'Rossi', 'Chen', 'Kim', 'Lopez', 'Walsh', 'Ali', 'Haddad', 'Novak', 'Reyes', 'Ford'];
const CITIES = ['Austin', 'Denver', 'Portland', 'Boston', 'Miami', 'Seattle', 'Dublin', 'Berlin',
  'Tokyo', 'Lisbon', 'Oslo', 'Toronto', 'Madrid', 'Prague', 'Cairo'];
const EMAIL_DOMAINS = ['example.com', 'mail.test', 'demo.io', 'sample.org'];

function sampleRecords(n) {
  return Array.from({ length: n }, (_, i) => {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    return {
      id: i + 1,
      name: `${first} ${last}`,
      email: `${first}.${last}@${pick(EMAIL_DOMAINS)}`.toLowerCase(),
      age: randInt(18, 80),
      city: pick(CITIES),
      active: Math.random() < 0.5,
    };
  });
}

const sampleJson = (n) => JSON.stringify(sampleRecords(n), null, 2);

function sampleCsv(n) {
  const rows = sampleRecords(n);
  const keys = Object.keys(rows[0]);
  const cell = (v) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(','), ...rows.map((r) => keys.map((k) => cell(r[k])).join(','))].join('\n');
}

function sampleXml(n) {
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const body = sampleRecords(n)
    .map(
      (r) =>
        '  <record>\n' +
        Object.entries(r).map(([k, v]) => `    <${k}>${esc(v)}</${k}>`).join('\n') +
        '\n  </record>'
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<records>\n${body}\n</records>`;
}

function sampleMarkdownTable(n) {
  const rows = sampleRecords(n);
  const keys = Object.keys(rows[0]);
  const cell = (v) => String(v).replace(/\|/g, '\\|');
  const line = (cells) => `| ${cells.join(' | ')} |`;
  return [line(keys), line(keys.map(() => '---')), ...rows.map((r) => line(keys.map((k) => cell(r[k]))))].join('\n');
}

function randomBase64(bytes) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

// US-style phone number. digits: 10 or 11 (leading country code 1).
// format: 'dashes' | 'dots' | 'parens' | 'plain'.
function randomPhone({ digits = 10, format = 'dashes' } = {}) {
  const area = String(randInt(2, 9) * 100 + randInt(0, 99));
  const prefix = String(randInt(2, 9) * 100 + randInt(0, 99));
  const line = String(randInt(0, 9999)).padStart(4, '0');
  let core;
  if (format === 'dots') core = `${area}.${prefix}.${line}`;
  else if (format === 'parens') core = `(${area}) ${prefix}-${line}`;
  else if (format === 'plain') core = `${area}${prefix}${line}`;
  else core = `${area}-${prefix}-${line}`;
  if (digits !== 11) return core;
  const j = format === 'dots' ? '.' : format === 'plain' ? '' : format === 'parens' ? ' ' : '-';
  return `1${j}${core}`;
}

// Exported for unit tests; the UI wires these through the actions below.
export const _gen = {
  uuidLines, makePassword, randomNumbers, randomLetter, randomMonth,
  randomDates, randomChoice, randomIP, randomHexColor, loremIpsum,
  sampleRecords, sampleJson, sampleCsv, sampleXml,
  sampleMarkdownTable, randomBase64, randomPhone,
};

const clampCount = (v, fallback = 1) => Math.max(1, Math.min(1000, parseInt(v, 10) || fallback));

const ACTIONS = [
  { section: 'Identifiers' },
  {
    label: 'UUID…',
    className: 'tw-btn tw-btn-primary',
    onClick: async ({ setValue }) => {
      const ans = await askInputs({
        title: 'Generate UUIDs',
        fields: [{ key: 'count', label: 'How many', type: 'number', default: '1' }],
        submitLabel: 'Generate',
      });
      if (!ans) return;
      setValue(uuidLines(clampCount(ans.count)));
    },
  },
  {
    label: 'Password…',
    onClick: async ({ setValue }) => {
      const ans = await askInputs({
        title: 'Random password',
        fields: [
          { key: 'len', label: 'Length', type: 'number', default: '20' },
          { key: 'count', label: 'How many', type: 'number', default: '1' },
          { key: 'symbols', label: 'Include symbols? (yes/no)', default: 'yes' },
        ],
        submitLabel: 'Generate',
      });
      if (!ans) return;
      const len = Math.max(4, Math.min(256, parseInt(ans.len, 10) || 20));
      const symbols = /^y/i.test((ans.symbols || '').trim());
      const lines = Array.from({ length: clampCount(ans.count) }, () => makePassword(len, { symbols }));
      setValue(lines.join('\n'));
    },
  },
  {
    label: 'Base64…',
    title: 'Generate random Base64 strings',
    onClick: async ({ setValue }) => {
      const ans = await askInputs({
        title: 'Random Base64',
        fields: [
          { key: 'bytes', label: 'Random bytes', type: 'number', default: '32' },
          { key: 'count', label: 'How many', type: 'number', default: '1' },
        ],
        submitLabel: 'Generate',
      });
      if (!ans) return;
      const bytes = Math.max(1, Math.min(4096, parseInt(ans.bytes, 10) || 32));
      const lines = Array.from({ length: clampCount(ans.count) }, () => randomBase64(bytes));
      setValue(lines.join('\n'));
    },
  },

  { section: 'Numbers & picks' },
  {
    label: 'Random number…',
    onClick: async ({ setValue }) => {
      const ans = await askInputs({
        title: 'Random number',
        fields: [
          { key: 'min', label: 'Min', type: 'number', default: '1' },
          { key: 'max', label: 'Max', type: 'number', default: '100' },
          { key: 'count', label: 'How many', type: 'number', default: '1' },
        ],
        submitLabel: 'Generate',
      });
      if (!ans) return;
      const min = parseInt(ans.min, 10) || 0;
      const max = parseInt(ans.max, 10) || 0;
      setValue(randomNumbers(min, max, clampCount(ans.count)));
    },
  },
  { label: 'Random letter', onClick: ({ setValue }) => setValue(randomLetter()) },
  { label: 'Random month', onClick: ({ setValue }) => setValue(randomMonth()) },
  {
    label: 'Random date…',
    onClick: async ({ setValue }) => {
      const ans = await askInputs({
        title: 'Random date in range',
        fields: [
          { key: 'start', label: 'Start (YYYY-MM-DD)', default: '2000-01-01' },
          { key: 'end', label: 'End (YYYY-MM-DD)', default: '2030-12-31' },
          { key: 'count', label: 'How many', type: 'number', default: '1' },
        ],
        submitLabel: 'Generate',
      });
      if (!ans) return;
      try { setValue(randomDates(ans.start, ans.end, clampCount(ans.count))); }
      catch (e) { window.tw.toast(e.message); }
    },
  },
  {
    label: 'Random choice…',
    title: 'Pick N random lines from the textarea',
    onClick: async ({ getValue, setValue }) => {
      const ans = await askInputs({
        title: 'Random choice from lines',
        fields: [{ key: 'n', label: 'How many to pick', type: 'number', default: '1' }],
        submitLabel: 'Pick',
      });
      if (!ans) return;
      try { setValue(randomChoice(getValue(), clampCount(ans.n))); }
      catch (e) { window.tw.toast(e.message); }
    },
  },

  { section: 'Web & filler' },
  { label: 'Random IP', onClick: ({ setValue }) => setValue(randomIP()) },
  { label: 'Random hex color', onClick: ({ setValue }) => setValue(randomHexColor()) },
  {
    label: 'Phone number…',
    title: 'Generate US phone numbers (10 or 11 digits; -, ., () formats)',
    onClick: async ({ setValue }) => {
      const ans = await askInputs({
        title: 'Phone number',
        fields: [
          { key: 'digits', label: 'Digits (10 or 11)', type: 'number', default: '10' },
          { key: 'sep', label: 'Separator (- / . / () / none)', default: '-' },
          { key: 'count', label: 'How many', type: 'number', default: '1' },
        ],
        submitLabel: 'Generate',
      });
      if (!ans) return;
      const digits = parseInt(ans.digits, 10) === 11 ? 11 : 10;
      const s = (ans.sep || '-').trim().toLowerCase();
      let format = 'dashes';
      if (s === '.' || s === 'dot' || s === 'dots') format = 'dots';
      else if (s === '()' || s === '(' || s === ')' || s === 'paren' || s === 'parens') format = 'parens';
      else if (s === 'none' || s === 'plain' || s === '') format = 'plain';
      const lines = Array.from({ length: clampCount(ans.count) }, () => randomPhone({ digits, format }));
      setValue(lines.join('\n'));
    },
  },
  {
    label: 'Lorem ipsum…',
    onClick: async ({ setValue }) => {
      const ans = await askInputs({
        title: 'Lorem ipsum',
        fields: [
          { key: 'paras', label: 'Paragraphs', type: 'number', default: '3' },
          { key: 'words', label: 'Words per paragraph', type: 'number', default: '40' },
        ],
        submitLabel: 'Generate',
      });
      if (!ans) return;
      const paras = Math.max(1, Math.min(100, parseInt(ans.paras, 10) || 3));
      const words = Math.max(1, Math.min(500, parseInt(ans.words, 10) || 40));
      setValue(loremIpsum(paras, words));
    },
  },

  { section: 'Sample data' },
  {
    label: 'JSON…',
    title: 'Generate sample JSON records',
    onClick: async ({ setValue }) => {
      const ans = await askInputs({
        title: 'Sample JSON',
        fields: [{ key: 'count', label: 'How many records', type: 'number', default: '5' }],
        submitLabel: 'Generate',
      });
      if (!ans) return;
      setValue(sampleJson(clampCount(ans.count)));
    },
  },
  {
    label: 'XML…',
    title: 'Generate sample XML records',
    onClick: async ({ setValue }) => {
      const ans = await askInputs({
        title: 'Sample XML',
        fields: [{ key: 'count', label: 'How many records', type: 'number', default: '5' }],
        submitLabel: 'Generate',
      });
      if (!ans) return;
      setValue(sampleXml(clampCount(ans.count)));
    },
  },
  {
    label: 'CSV…',
    title: 'Generate sample CSV rows',
    onClick: async ({ setValue }) => {
      const ans = await askInputs({
        title: 'Sample CSV',
        fields: [{ key: 'count', label: 'How many rows', type: 'number', default: '5' }],
        submitLabel: 'Generate',
      });
      if (!ans) return;
      setValue(sampleCsv(clampCount(ans.count)));
    },
  },
  {
    label: 'Markdown table…',
    title: 'Generate a sample Markdown table',
    onClick: async ({ setValue }) => {
      const ans = await askInputs({
        title: 'Sample Markdown table',
        fields: [{ key: 'count', label: 'How many rows', type: 'number', default: '5' }],
        submitLabel: 'Generate',
      });
      if (!ans) return;
      setValue(sampleMarkdownTable(clampCount(ans.count)));
    },
  },
];

export const generators = {
  id: 'generators',
  navLabel: 'Generators',
  navIcon: '⚄',
  title: 'Generators',
  subtitle: 'Generate UUIDs, passwords, Base64, phone numbers, colors, dates, filler text, and sample JSON/XML/CSV/Markdown.',
  actions: ACTIONS,
  render(container) {
    return createEditor({
      container,
      storageKey: 'tw::generators',
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
