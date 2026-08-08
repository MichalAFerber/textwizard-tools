import { createEditor } from './_editor.js';

const PLACEHOLDER = 'Type text, then restyle it with Unicode letters, symbols, and combining marks.';

const cp = (n) => String.fromCodePoint(n);

// Map A–Z / a–z / 0–9 onto a contiguous Unicode block. `holes` covers the code
// points Unicode reserved out of the math blocks (they live in Letterlike
// Symbols instead), so e.g. script "H" becomes ℋ rather than a missing glyph.
function mapBlock({ upper, lower, digits, holes = {} }) {
  return (str) =>
    Array.from(str)
      .map((ch) => {
        if (holes[ch]) return holes[ch];
        const c = ch.codePointAt(0);
        if (upper != null && ch >= 'A' && ch <= 'Z') return cp(upper + c - 65);
        if (lower != null && ch >= 'a' && ch <= 'z') return cp(lower + c - 97);
        if (digits != null && ch >= '0' && ch <= '9') return cp(digits + c - 48);
        return ch;
      })
      .join('');
}

const bold = mapBlock({ upper: 0x1d400, lower: 0x1d41a, digits: 0x1d7ce });
const italic = mapBlock({ upper: 0x1d434, lower: 0x1d44e, holes: { h: cp(0x210e) } });
const boldItalic = mapBlock({ upper: 0x1d468, lower: 0x1d482 });
const script = mapBlock({
  upper: 0x1d49c,
  lower: 0x1d4b6,
  holes: {
    B: cp(0x212c), E: cp(0x2130), F: cp(0x2131), H: cp(0x210b), I: cp(0x2110),
    L: cp(0x2112), M: cp(0x2133), R: cp(0x211b),
    e: cp(0x212f), g: cp(0x210a), o: cp(0x2134),
  },
});
const fraktur = mapBlock({
  upper: 0x1d504,
  lower: 0x1d51e,
  holes: { C: cp(0x212d), H: cp(0x210c), I: cp(0x2111), R: cp(0x211c), Z: cp(0x2128) },
});
const doubleStruck = mapBlock({
  upper: 0x1d538,
  lower: 0x1d552,
  digits: 0x1d7d8,
  holes: {
    C: cp(0x2102), H: cp(0x210d), N: cp(0x2115), P: cp(0x2119),
    Q: cp(0x211a), R: cp(0x211d), Z: cp(0x2124),
  },
});
const monospace = mapBlock({ upper: 0x1d670, lower: 0x1d68a, digits: 0x1d7f6 });

// Halfwidth ASCII → Fullwidth Forms; space → ideographic space.
function fullwidth(str) {
  return Array.from(str)
    .map((ch) => {
      const c = ch.codePointAt(0);
      if (c === 0x20) return cp(0x3000);
      if (c >= 0x21 && c <= 0x7e) return cp(c + 0xfee0);
      return ch;
    })
    .join('');
}

function circled(str) {
  return Array.from(str)
    .map((ch) => {
      const c = ch.codePointAt(0);
      if (ch >= 'A' && ch <= 'Z') return cp(0x24b6 + c - 65);
      if (ch >= 'a' && ch <= 'z') return cp(0x24d0 + c - 97);
      if (ch === '0') return cp(0x24ea);
      if (ch >= '1' && ch <= '9') return cp(0x2460 + c - 49);
      return ch;
    })
    .join('');
}

// Squared letters only exist as capitals — uppercase the input first.
function squared(str) {
  return Array.from(str.toUpperCase())
    .map((ch) => {
      const c = ch.codePointAt(0);
      if (ch >= 'A' && ch <= 'Z') return cp(0x1f130 + c - 65);
      return ch;
    })
    .join('');
}

// "Bubble" = negative (filled) circled letters/digits.
function bubble(str) {
  return Array.from(str)
    .map((ch) => {
      const up = ch.toUpperCase();
      const c = up.codePointAt(0);
      if (up >= 'A' && up <= 'Z') return cp(0x1f150 + c - 65);
      if (ch === '0') return cp(0x24ff);
      if (ch >= '1' && ch <= '9') return cp(0x2776 + ch.codePointAt(0) - 49);
      return ch;
    })
    .join('');
}

const SMALL_CAPS = {
  a: 0x1d00, b: 0x0299, c: 0x1d04, d: 0x1d05, e: 0x1d07, f: 0xa730, g: 0x0262,
  h: 0x029c, i: 0x026a, j: 0x1d0a, k: 0x1d0b, l: 0x029f, m: 0x1d0d, n: 0x0274,
  o: 0x1d0f, p: 0x1d18, q: 0xa7af, r: 0x0280, s: 0xa731, t: 0x1d1b, u: 0x1d1c,
  v: 0x1d20, w: 0x1d21, y: 0x028f, z: 0x1d22,
};
function smallCaps(str) {
  return Array.from(str)
    .map((ch) => {
      const low = ch.toLowerCase();
      return SMALL_CAPS[low] ? cp(SMALL_CAPS[low]) : ch;
    })
    .join('');
}

const SUP = {
  0: 0x2070, 1: 0x00b9, 2: 0x00b2, 3: 0x00b3, 4: 0x2074, 5: 0x2075, 6: 0x2076,
  7: 0x2077, 8: 0x2078, 9: 0x2079,
  a: 0x1d43, b: 0x1d47, c: 0x1d9c, d: 0x1d48, e: 0x1d49, f: 0x1da0, g: 0x1d4d,
  h: 0x02b0, i: 0x2071, j: 0x02b2, k: 0x1d4f, l: 0x02e1, m: 0x1d50, n: 0x207f,
  o: 0x1d52, p: 0x1d56, r: 0x02b3, s: 0x02e2, t: 0x1d57, u: 0x1d58, v: 0x1d5b,
  w: 0x02b7, x: 0x02e3, y: 0x02b8, z: 0x1dbb,
  '+': 0x207a, '-': 0x207b, '=': 0x207c, '(': 0x207d, ')': 0x207e,
};
const SUB = {
  0: 0x2080, 1: 0x2081, 2: 0x2082, 3: 0x2083, 4: 0x2084, 5: 0x2085, 6: 0x2086,
  7: 0x2087, 8: 0x2088, 9: 0x2089,
  a: 0x2090, e: 0x2091, h: 0x2095, i: 0x1d62, j: 0x2c7c, k: 0x2096, l: 0x2097,
  m: 0x2098, n: 0x2099, o: 0x2092, p: 0x209a, r: 0x1d63, s: 0x209b, t: 0x209c,
  u: 0x1d64, v: 0x1d65, x: 0x2093,
  '+': 0x208a, '-': 0x208b, '=': 0x208c, '(': 0x208d, ')': 0x208e,
};
function lookupMap(table) {
  return (str) =>
    Array.from(str)
      .map((ch) => {
        const key = ch >= 'A' && ch <= 'Z' ? ch.toLowerCase() : ch;
        return table[key] != null ? cp(table[key]) : ch;
      })
      .join('');
}
const superscript = lookupMap(SUP);
const subscript = lookupMap(SUB);

const FLIP = {
  a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ',
  k: 'ʞ', l: 'ʅ', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ',
  u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
  A: '∀', B: 'Ᏸ', C: 'Ɔ', D: '◖', E: 'Ǝ', F: 'Ⅎ', G: '⅁', H: 'H', I: 'I', J: 'ſ',
  K: '⋊', L: '˥', M: 'W', N: 'N', O: 'O', P: 'Ԁ', Q: 'Ò', R: 'ᴚ', S: 'S', T: '⊥',
  U: '∩', V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z',
  0: '0', 1: 'Ɩ', 2: 'ᄅ', 3: 'Ɛ', 4: 'ㄣ', 5: 'ϛ', 6: '9', 7: 'ㄥ', 8: '8', 9: '6',
  '.': '˙', ',': "'", "'": ',', '?': '¿', '!': '¡', '"': '„', '(': ')', ')': '(',
  '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '&': '⅋', '_': '‾',
};
function upsideDown(str) {
  return Array.from(str)
    .reverse()
    .map((ch) => FLIP[ch] ?? ch)
    .join('');
}

// Reverse the string and swap direction-sensitive characters so it reads as a
// left-right mirror image.
const MIRROR = {
  b: 'd', d: 'b', p: 'q', q: 'p', c: 'ɔ', e: 'ɘ', s: 'ƨ', z: 'ƹ',
  '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<',
  '/': '\\', '\\': '/',
};
function mirror(str) {
  return Array.from(str)
    .reverse()
    .map((ch) => MIRROR[ch] ?? ch)
    .join('');
}

function combiner(mark) {
  return (str) =>
    Array.from(str)
      .map((ch) => (ch === '\n' ? ch : ch + mark))
      .join('');
}
const strikethrough = combiner('̶');
const underline = combiner('̲');

// Combining marks for the "Zalgo" glitch effect, grouped by where they render.
const ZALGO_UP = [];
for (const n of [0x0300, 0x0301, 0x0302, 0x0303, 0x0304, 0x0305, 0x0306, 0x0307, 0x0308, 0x0309, 0x030a, 0x030b, 0x030c, 0x030d, 0x030e, 0x0311, 0x0312, 0x033d, 0x033e, 0x033f, 0x0342, 0x0346, 0x0350, 0x0351, 0x0352, 0x0357, 0x035b]) ZALGO_UP.push(cp(n));
const ZALGO_MID = [];
for (const n of [0x0315, 0x031b, 0x0340, 0x0341, 0x0358, 0x0321, 0x0322, 0x0327, 0x0328, 0x0334, 0x0335, 0x0336, 0x034f]) ZALGO_MID.push(cp(n));
const ZALGO_DOWN = [];
for (const n of [0x0316, 0x0317, 0x0318, 0x0319, 0x031c, 0x031d, 0x031e, 0x031f, 0x0320, 0x0324, 0x0325, 0x0326, 0x0329, 0x032a, 0x032b, 0x032c, 0x032d, 0x032e, 0x032f, 0x0330, 0x0331, 0x0332, 0x0333, 0x0339, 0x033a, 0x033b, 0x033c, 0x0345]) ZALGO_DOWN.push(cp(n));

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function zalgo(str, intensity = 5) {
  return Array.from(str)
    .map((ch) => {
      if (ch === '\n' || ch === ' ') return ch;
      let out = ch;
      const up = Math.floor(Math.random() * intensity);
      const mid = Math.floor(Math.random() * (intensity / 2));
      const down = Math.floor(Math.random() * intensity);
      for (let i = 0; i < up; i++) out += pick(ZALGO_UP);
      for (let i = 0; i < mid; i++) out += pick(ZALGO_MID);
      for (let i = 0; i < down; i++) out += pick(ZALGO_DOWN);
      return out;
    })
    .join('');
}

// Exported for unit tests; the UI uses these via the actions below.
export const _fancy = {
  bold, italic, boldItalic, script, fraktur, doubleStruck, monospace,
  fullwidth, circled, squared, bubble, smallCaps, superscript, subscript,
  upsideDown, mirror, strikethrough, underline, zalgo,
};

const apply = (fn) => ({ getValue, setValue }) => setValue(fn(getValue()));

const ACTIONS = [
  { section: 'Math alphabets' },
  { label: 'Bold', className: 'tw-btn tw-btn-primary', onClick: apply(bold) },
  { label: 'Italic', onClick: apply(italic) },
  { label: 'Bold Italic', onClick: apply(boldItalic) },
  { label: 'Script', onClick: apply(script) },
  { label: 'Fraktur', onClick: apply(fraktur) },
  { label: 'Double-struck', onClick: apply(doubleStruck) },
  { label: 'Monospace', onClick: apply(monospace) },

  { section: 'Enclosed & wide' },
  { label: 'Circled', onClick: apply(circled) },
  { label: 'Squared', onClick: apply(squared) },
  { label: 'Bubble', onClick: apply(bubble) },
  { label: 'Fullwidth', onClick: apply(fullwidth) },
  { label: 'Small caps', onClick: apply(smallCaps) },

  { section: 'Position' },
  { label: 'Superscript', onClick: apply(superscript) },
  { label: 'Subscript', onClick: apply(subscript) },

  { section: 'Flip & lines' },
  { label: 'Upside down', onClick: apply(upsideDown) },
  { label: 'Mirror', onClick: apply(mirror) },
  { label: 'Strikethrough', onClick: apply(strikethrough) },
  { label: 'Underline', onClick: apply(underline) },

  { section: 'Chaos' },
  { label: 'Zalgo', onClick: apply((s) => zalgo(s)) },
];

export const fancyText = {
  id: 'fancy-text',
  navLabel: 'Fancy Text',
  navIcon: 'Ａ',
  title: 'Fancy Text',
  subtitle: 'Restyle text with Unicode: bold, script, circled, upside down, and more.',
  actions: ACTIONS,
  render(container) {
    // Each style outputs non-ASCII characters, so restyling an already-styled
    // result is a no-op. We keep the plain `source` text and always transform
    // *that*, so you can click through every style and see each applied to your
    // original text (not stack onto the previous style).
    const SRC_KEY = 'tw::fancy-text::source';
    let source = '';
    try { source = localStorage.getItem(SRC_KEY) || ''; } catch {}
    const persistSource = (v) => { source = v; try { localStorage.setItem(SRC_KEY, v); } catch {} };

    const editor = createEditor({
      container,
      storageKey: 'tw::fancy-text',
      placeholderText: PLACEHOLDER,
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
        { label: 'Clear', className: 'tw-btn tw-btn-ghost', onClick: ({ setValue }) => { setValue(''); persistSource(''); } },
      ],
    });

    // Adopt any restored text as the source, and keep it in step with edits.
    if (!source && editor.getValue()) persistSource(editor.getValue());
    editor.textarea.addEventListener('input', () => persistSource(editor.textarea.value));

    // Style buttons read the preserved source and write the styled result.
    // Copy/Clear stay on the editor's own handle (Copy grabs what's displayed).
    return {
      ...editor,
      getValue: () => source,
      setValue: (v) => editor.setValue(v),
    };
  },
};
