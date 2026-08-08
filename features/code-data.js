import { createEditor, askInputs } from './_editor.js';

const PLACEHOLDER = 'Paste data to encode, decode, hash, format, or convert.';

// ---------- helpers ----------
const norm = (s) => s.replace(/\r\n?/g, '\n');
const toBytes = (s) => new TextEncoder().encode(s);
const fromBytes = (b) => new TextDecoder().decode(b);

function bytesToB64(bytes) {
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}
function b64ToBytes(b64) {
  const bin = atob(b64.replace(/\s+/g, ''));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const T = {
  base64Encode: (s) => bytesToB64(toBytes(s)),
  base64Decode: (s) => fromBytes(b64ToBytes(s)),
  urlEncode: (s) => encodeURIComponent(s),
  urlDecode: (s) => {
    try { return decodeURIComponent(s); } catch { return s; }
  },
  textToHex: (s) => Array.from(toBytes(s)).map((b) => b.toString(16).padStart(2, '0')).join(' '),
  hexToText: (s) => {
    const cleaned = s.replace(/(0x|\\x|%)/gi, '').replace(/[^0-9a-f]/gi, '');
    if (cleaned.length % 2 !== 0) throw new Error('Hex input has an odd number of digits');
    const out = new Uint8Array(cleaned.length / 2);
    for (let i = 0; i < cleaned.length; i += 2) out[i / 2] = parseInt(cleaned.slice(i, i + 2), 16);
    return fromBytes(out);
  },
  textToBinary: (s) => Array.from(toBytes(s)).map((b) => b.toString(2).padStart(8, '0')).join(' '),
  binaryToText: (s) => {
    const cleaned = s.replace(/[^01]/g, '');
    if (cleaned.length % 8 !== 0) throw new Error('Binary input length is not a multiple of 8');
    const out = new Uint8Array(cleaned.length / 8);
    for (let i = 0; i < cleaned.length; i += 8) out[i / 8] = parseInt(cleaned.slice(i, i + 8), 2);
    return fromBytes(out);
  },
  rot13: (s) =>
    s.replace(/[A-Za-z]/g, (c) => {
      const base = c <= 'Z' ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
    }),
  jsonFormat: (s) => JSON.stringify(JSON.parse(s), null, 2),
  jsonMinify: (s) => JSON.stringify(JSON.parse(s)),
  jsonStringify: (s) => JSON.stringify(s),
  jsonUnstringify: (s) => {
    const parsed = JSON.parse(s);
    if (typeof parsed !== 'string') throw new Error('Input is not a JSON string');
    return parsed;
  },
  slugify: (s) =>
    norm(s)
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
  sortNumbers: (s) => {
    const nums = norm(s).split(/\s+|,/).map((t) => t.trim()).filter(Boolean).map(Number);
    if (nums.some(Number.isNaN)) throw new Error('Found a token that is not a number');
    return nums.sort((a, b) => a - b).join('\n');
  },
  xmlPretty: (s) => {
    const cleaned = norm(s).replace(/>\s+</g, '><').trim();
    let depth = 0;
    let out = '';
    cleaned.replace(/<[^>]+>|[^<]+/g, (token) => {
      if (token.startsWith('<')) {
        const isClose = token.startsWith('</');
        const isSelfClose = /\/>$/.test(token) || /^<\?|^<!/.test(token);
        if (isClose) depth = Math.max(0, depth - 1);
        out += '  '.repeat(depth) + token + '\n';
        if (!isClose && !isSelfClose) depth++;
      } else {
        const t = token.trim();
        if (t) out += '  '.repeat(depth) + t + '\n';
      }
      return token;
    });
    return out.trimEnd();
  },
};

// ---------- Caesar (prompted shift) ----------
async function caesarCipher(text) {
  const ans = await askInputs({
    title: 'Caesar cipher',
    fields: [
      { key: 'shift', label: 'Shift (negative to reverse)', type: 'number', default: '3' },
    ],
    submitLabel: 'Apply',
  });
  if (!ans) return text;
  const shift = ((parseInt(ans.shift, 10) || 0) % 26 + 26) % 26;
  return text.replace(/[A-Za-z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26) + base);
  });
}

// ---------- Regex tester ----------
async function regexTester(text) {
  const ans = await askInputs({
    title: 'Regex tester',
    fields: [
      { key: 'pattern', label: 'Pattern (without slashes)', placeholder: '\\b\\w+@\\w+\\.\\w+\\b' },
      { key: 'flags', label: 'Flags', default: 'g' },
    ],
    submitLabel: 'Run',
  });
  if (!ans || !ans.pattern) return text;
  let re;
  try {
    re = new RegExp(ans.pattern, ans.flags || '');
  } catch (e) {
    return `Invalid regex: ${e.message}`;
  }
  const matches = [];
  if (re.global) {
    let m;
    while ((m = re.exec(text)) !== null) {
      matches.push({ index: m.index, match: m[0], groups: m.slice(1) });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  } else {
    const m = re.exec(text);
    if (m) matches.push({ index: m.index, match: m[0], groups: m.slice(1) });
  }
  if (!matches.length) return `No matches for /${ans.pattern}/${ans.flags || ''}`;
  const lines = [
    `${matches.length} match${matches.length === 1 ? '' : 'es'} for /${ans.pattern}/${ans.flags || ''}`,
    ''.padEnd(48, '─'),
  ];
  for (const m of matches) {
    lines.push(`@${m.index}  ${JSON.stringify(m.match)}`);
    m.groups.forEach((g, i) => {
      if (g !== undefined) lines.push(`   $${i + 1}: ${JSON.stringify(g)}`);
    });
  }
  return lines.join('\n');
}

// ---------- Morse ----------
const MORSE = {
  a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....',
  i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.',
  q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-',
  y: '-.--', z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
  5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '@': '.--.-.',
};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

function morseEncode(s) {
  return s
    .toLowerCase()
    .split('\n')
    .map((line) =>
      line
        .split(/\s+/)
        .map((word) =>
          Array.from(word)
            .map((c) => MORSE[c] || '')
            .filter(Boolean)
            .join(' ')
        )
        .filter(Boolean)
        .join(' / ')
    )
    .join('\n');
}

function morseDecode(s) {
  return s
    .split('\n')
    .map((line) =>
      line
        .split(/\s*\/\s*/)
        .map((word) =>
          word
            .split(/\s+/)
            .map((code) => MORSE_REV[code] || '')
            .join('')
        )
        .join(' ')
    )
    .join('\n');
}

// ---------- CSV ↔ JSON ----------
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  const src = norm(text);
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cell += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

function csvToJson(s) {
  const rows = parseCSV(s);
  if (rows.length < 2) throw new Error('CSV needs at least a header row and one data row');
  const [headers, ...data] = rows;
  const objs = data.map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
    return obj;
  });
  return JSON.stringify(objs, null, 2);
}

function jsonToCsv(s) {
  const parsed = JSON.parse(s);
  if (!Array.isArray(parsed) || !parsed.length) throw new Error('JSON must be a non-empty array of objects');
  const keys = [...new Set(parsed.flatMap((o) => Object.keys(o || {})))];
  const escape = (v) => {
    const str = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return [keys.join(','), ...parsed.map((o) => keys.map((k) => escape(o?.[k])).join(','))].join('\n');
}

// ---------- Hashes (Web Crypto) ----------
async function hashHex(algo, text) {
  const buf = await crypto.subtle.digest(algo, toBytes(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Time ----------
function unixToDate(s) {
  return norm(s)
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t) return '';
      const n = Number(t);
      if (!Number.isFinite(n)) return `${t} → (not a number)`;
      const ms = t.length <= 10 ? n * 1000 : n;
      const d = new Date(ms);
      if (Number.isNaN(d.getTime())) return `${t} → (invalid)`;
      return `${t} → ${d.toISOString()}  (${d.toString()})`;
    })
    .join('\n');
}

function dateToUnix(s) {
  return norm(s)
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t) return '';
      const d = new Date(t);
      if (Number.isNaN(d.getTime())) return `${t} → (could not parse)`;
      const ms = d.getTime();
      return `${t} → ${Math.floor(ms / 1000)} (s)  /  ${ms} (ms)`;
    })
    .join('\n');
}

function nowTimestamps() {
  const d = new Date();
  return [
    `Now (local):  ${d.toString()}`,
    `Now (ISO):    ${d.toISOString()}`,
    `Unix seconds: ${Math.floor(d.getTime() / 1000)}`,
    `Unix millis:  ${d.getTime()}`,
  ].join('\n');
}

// ---------- Color ----------
function parseColor(input) {
  const s = input.trim();
  let m;
  if ((m = s.match(/^#?([0-9a-f]{3})$/i))) {
    const h = m[1];
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  if ((m = s.match(/^#?([0-9a-f]{6})$/i))) {
    const h = m[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  if ((m = s.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i))) {
    return { r: +m[1], g: +m[2], b: +m[3] };
  }
  if ((m = s.match(/^hsla?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)%[,\s]+(\d+(?:\.\d+)?)%/i))) {
    return hslToRgb({ h: +m[1], s: +m[2], l: +m[3] });
  }
  return null;
}
function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s; const l = (max + min) / 2;
  if (max === min) { h = 0; s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d) + (g < b ? 6 : 0); break;
      case g: h = ((b - r) / d) + 2; break;
      default: h = ((r - g) / d) + 4;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function hslToRgb({ h, s, l }) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0, gp = 0, bp = 0;
  if (h < 60) { rp = c; gp = x; }
  else if (h < 120) { rp = x; gp = c; }
  else if (h < 180) { gp = c; bp = x; }
  else if (h < 240) { gp = x; bp = c; }
  else if (h < 300) { rp = x; bp = c; }
  else { rp = c; bp = x; }
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function colorConvert(s) {
  return norm(s)
    .split('\n')
    .map((line) => {
      if (!line.trim()) return '';
      const rgb = parseColor(line);
      if (!rgb) return `${line}  → (unrecognized color)`;
      const hex = rgbToHex(rgb);
      const hsl = rgbToHsl(rgb);
      return `${line}  →  ${hex}  /  rgb(${rgb.r}, ${rgb.g}, ${rgb.b})  /  hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    })
    .join('\n');
}

// ---------- Page ----------
function copyOutput(getValue) {
  return async () => {
    try { await navigator.clipboard.writeText(getValue()); window.tw.toast('Copied to clipboard'); }
    catch { window.tw.toast('Copy failed'); }
  };
}

function wrap(transform, label) {
  return ({ getValue, setValue }) => {
    try { setValue(transform(getValue())); }
    catch (e) { window.tw.toast(`${label}: ${e.message}`); }
  };
}

function wrapAsync(transform, label) {
  return async ({ getValue, setValue }) => {
    try { setValue(await transform(getValue())); }
    catch (e) { window.tw.toast(`${label}: ${e.message}`); }
  };
}

const ACTIONS = [
        { section: 'Encoding' },
        { label: 'Base64 encode', onClick: wrap(T.base64Encode, 'Base64') },
        { label: 'Base64 decode', onClick: wrap(T.base64Decode, 'Base64') },
        { label: 'URL encode', onClick: wrap(T.urlEncode, 'URL') },
        { label: 'URL decode', onClick: wrap(T.urlDecode, 'URL') },
        { label: 'Text → Hex', onClick: wrap(T.textToHex, 'Hex') },
        { label: 'Hex → Text', onClick: wrap(T.hexToText, 'Hex') },
        { label: 'Text → Binary', onClick: wrap(T.textToBinary, 'Binary') },
        { label: 'Binary → Text', onClick: wrap(T.binaryToText, 'Binary') },

        { section: 'Ciphers' },
        { label: 'ROT13', onClick: wrap(T.rot13, 'ROT13') },
        { label: 'Caesar cipher…', onClick: wrapAsync(caesarCipher, 'Caesar') },
        { label: 'Morse encode', onClick: wrap(morseEncode, 'Morse') },
        { label: 'Morse decode', onClick: wrap(morseDecode, 'Morse') },

        { section: 'JSON' },
        { label: 'JSON format', className: 'tw-btn tw-btn-primary', onClick: wrap(T.jsonFormat, 'JSON') },
        { label: 'JSON minify', onClick: wrap(T.jsonMinify, 'JSON') },
        { label: 'JSON stringify', onClick: wrap(T.jsonStringify, 'JSON') },
        { label: 'JSON unstringify', onClick: wrap(T.jsonUnstringify, 'JSON') },
        { label: 'CSV → JSON', onClick: wrap(csvToJson, 'CSV') },
        { label: 'JSON → CSV', onClick: wrap(jsonToCsv, 'JSON') },
        { label: 'XML pretty-print', onClick: wrap(T.xmlPretty, 'XML') },

        { section: 'Text data' },
        { label: 'Regex tester…', onClick: wrapAsync(regexTester, 'Regex') },
        { label: 'Slugify', onClick: wrap(T.slugify, 'Slugify') },
        { label: 'Sort numbers', onClick: wrap(T.sortNumbers, 'Numbers') },

        { section: 'Hashes' },
        { label: 'SHA-1', onClick: wrapAsync((s) => hashHex('SHA-1', s), 'SHA-1') },
        { label: 'SHA-256', onClick: wrapAsync((s) => hashHex('SHA-256', s), 'SHA-256') },
        { label: 'SHA-512', onClick: wrapAsync((s) => hashHex('SHA-512', s), 'SHA-512') },

        { section: 'Time' },
        { label: 'Unix → date', onClick: wrap(unixToDate, 'Unix') },
        { label: 'Date → Unix', onClick: wrap(dateToUnix, 'Date') },
        { label: 'Now', onClick: ({ setValue }) => setValue(nowTimestamps()) },

        { section: 'Color' },
        { label: 'Color converter', onClick: wrap(colorConvert, 'Color') },
];

export const codeData = {
  id: 'code-data',
  navLabel: 'Code & Data',
  navIcon: '⌘',
  title: 'Code & Data',
  subtitle: 'Encode, decode, format, hash, and convert data.',
  actions: ACTIONS,
  render(container) {
    return createEditor({
      container,
      storageKey: 'tw::code-data',
      placeholderText: PLACEHOLDER,
      buttons: ACTIONS,
      toolbarLeft: [
        { label: 'Copy', className: 'tw-btn tw-btn-primary', onClick: ({ getValue }) => copyOutput(getValue)() },
      ],
      toolbarRight: [
        { label: 'Clear', className: 'tw-btn tw-btn-ghost', onClick: ({ setValue }) => setValue('') },
      ],
    });
  },
};
