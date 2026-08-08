import { createEditor } from './_editor.js';

const PLACEHOLDER = 'Type or paste text to translate.';

const NATO = {
  a: 'Alpha', b: 'Bravo', c: 'Charlie', d: 'Delta', e: 'Echo',
  f: 'Foxtrot', g: 'Golf', h: 'Hotel', i: 'India', j: 'Juliet',
  k: 'Kilo', l: 'Lima', m: 'Mike', n: 'November', o: 'Oscar',
  p: 'Papa', q: 'Quebec', r: 'Romeo', s: 'Sierra', t: 'Tango',
  u: 'Uniform', v: 'Victor', w: 'Whiskey', x: 'X-ray', y: 'Yankee', z: 'Zulu',
  0: 'Zero', 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four',
  5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine',
};

const SPELL = {
  a: 'Apple', b: 'Boy', c: 'Cat', d: 'Dog', e: 'Egg',
  f: 'Frog', g: 'Goat', h: 'House', i: 'Ice', j: 'Jam',
  k: 'Kite', l: 'Lion', m: 'Moon', n: 'Nut', o: 'Orange',
  p: 'Pig', q: 'Queen', r: 'Rain', s: 'Sun', t: 'Tree',
  u: 'Umbrella', v: 'Van', w: 'Water', x: 'Xylophone', y: 'Yarn', z: 'Zebra',
};

function natoTranslate(s) {
  return s
    .split('\n')
    .map((line) =>
      Array.from(line)
        .map((ch) => {
          const lower = ch.toLowerCase();
          return NATO[lower] || ch;
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .join('\n');
}

function spellTranslate(s) {
  return s
    .split('\n')
    .map((line) =>
      Array.from(line)
        .map((ch) => {
          const lower = ch.toLowerCase();
          if (SPELL[lower]) return `${ch.toUpperCase()} as in ${SPELL[lower]}`;
          if (/[0-9]/.test(ch)) return `${ch} (number ${ch})`;
          return ch;
        })
        .join(', ')
    )
    .join('\n');
}

// Classic Pig Latin: words starting with a vowel get "way" appended,
// otherwise move the leading consonant cluster to the end and add "ay".
// Preserves capitalization of the first letter and surrounding punctuation.
function pigLatinWord(word) {
  if (!word) return word;
  const m = word.match(/^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/);
  if (!m) return word;
  const [, lead, core, trail] = m;
  const wasCapitalized = /^[A-Z]/.test(core);
  const lower = core.toLowerCase();
  let translated;
  if (/^[aeiou]/.test(lower)) {
    translated = lower + 'way';
  } else {
    const cluster = lower.match(/^[^aeiou]+/)[0];
    translated = lower.slice(cluster.length) + cluster + 'ay';
  }
  if (wasCapitalized) translated = translated.charAt(0).toUpperCase() + translated.slice(1);
  return lead + translated + trail;
}

function pigLatin(s) {
  return s.replace(/\S+/g, pigLatinWord);
}

// Phone keypad: each digit maps to a letter group; each letter maps to a digit.
const PHONE_KEYS = {
  2: 'ABC', 3: 'DEF', 4: 'GHI', 5: 'JKL',
  6: 'MNO', 7: 'PQRS', 8: 'TUV', 9: 'WXYZ',
};
const LETTER_TO_DIGIT = {};
for (const [d, letters] of Object.entries(PHONE_KEYS)) {
  for (const ch of letters) LETTER_TO_DIGIT[ch] = d;
}

// Convert vanity letters to dialable digits, e.g. "1-800-FLOWERS" → "1-800-3569377".
function lettersToPhone(s) {
  return s.replace(/[A-Za-z]/g, (c) => LETTER_TO_DIGIT[c.toUpperCase()] || c);
}

// Show the letter options for each digit, line by line.
// Non-digit characters pass through; 0/1 show as "(no letters)".
function phoneToLetters(s) {
  return s
    .split('\n')
    .map((line) => {
      const out = [];
      for (const ch of line) {
        if (PHONE_KEYS[ch]) out.push(`${ch} → ${PHONE_KEYS[ch]}`);
        else if (ch === '0' || ch === '1') out.push(`${ch} → (no letters)`);
        else if (/\S/.test(ch)) out.push(`${ch}`);
      }
      return out.join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

const ACTIONS = [
  {
    label: 'NATO Phonetic',
    className: 'tw-btn tw-btn-primary',
    onClick: ({ getValue, setValue }) => setValue(natoTranslate(getValue())),
  },
  {
    label: '"A as in Apple"',
    onClick: ({ getValue, setValue }) => setValue(spellTranslate(getValue())),
  },
  {
    label: 'Pig Latin',
    onClick: ({ getValue, setValue }) => setValue(pigLatin(getValue())),
  },
  {
    label: 'Letters → phone digits',
    onClick: ({ getValue, setValue }) => setValue(lettersToPhone(getValue())),
    title: 'Convert vanity letters to dialable digits (FLOWERS → 3569377)',
  },
  {
    label: 'Phone digits → letters',
    onClick: ({ getValue, setValue }) => setValue(phoneToLetters(getValue())),
    title: 'Show the letter options for each digit',
  },
];

export const translators = {
  id: 'translators',
  navLabel: 'Translators',
  navIcon: '⇄',
  title: 'Translators',
  subtitle: 'Convert text into phonetic alphabets and word games.',
  actions: ACTIONS,
  render(container) {
    return createEditor({
      container,
      storageKey: 'tw::translators',
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
