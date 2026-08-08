// Single source of truth for the TextWizard tool catalog: drives the site's
// landing-page cards, per-tool pages, SEO metadata, and sitemap. The behavior
// for each tool lives in the matching features/<id>.js module (see `repoPath`
// for exceptions), mounted client-side by the consuming site (textwizard.us).

export const tools = [
  {
    id: 'text-tools',
    name: 'Text Tools',
    icon: 'T',
    color: '#6366f1',
    category: 'Text',
    tagline: 'Clean, reshape, sort, and transform text.',
    description: 'Trim whitespace, dedupe and sort lines, change case, wrap or de-wrap, strip HTML/ANSI, find & replace, and more.',
    keywords: ['whitespace remover', 'sort lines', 'remove duplicate lines', 'strip html', 'find and replace'],
  },
  {
    id: 'case-converter',
    name: 'Case Converter',
    icon: 'Aa',
    color: '#8b5cf6',
    category: 'Text',
    tagline: 'Switch between UPPER, lower, Title, camelCase, snake_case, and more.',
    description: 'Convert text between UPPERCASE, lowercase, Title Case, Sentence case, camelCase, snake_case, and kebab-case.',
    keywords: ['case converter', 'uppercase', 'lowercase', 'title case', 'camelcase', 'snake case'],
  },
  {
    id: 'fancy-text',
    name: 'Fancy Text',
    icon: '✨',
    color: '#ec4899',
    category: 'Text',
    tagline: 'Restyle text with Unicode: bold, script, circled, upside down.',
    description: 'Turn plain text into Unicode styles — bold, italic, script, fraktur, monospace, circled, small caps, upside down, strikethrough, and Zalgo.',
    keywords: ['fancy text', 'unicode text', 'bold text generator', 'italic text', 'zalgo', 'upside down text'],
  },
  {
    id: 'code-data',
    name: 'Code & Data',
    icon: '{ }',
    color: '#3b82f6',
    category: 'Code & Data',
    tagline: 'Encode, decode, format, hash, and convert data.',
    description: 'Base64 and URL encode/decode, hex/binary, JSON format & convert, CSV ↔ JSON, XML pretty-print, regex tester, SHA hashes, timestamps, and color conversion.',
    keywords: ['base64', 'json formatter', 'csv to json', 'sha256', 'regex tester', 'url encode'],
  },
  {
    id: 'translators',
    name: 'Translators',
    icon: '⇄',
    color: '#06b6d4',
    category: 'Code & Data',
    tagline: 'Phonetic alphabets and text word games.',
    description: 'Convert text to the NATO phonetic alphabet, "A as in Apple" spelling, Pig Latin, and phone keypad digits.',
    keywords: ['nato phonetic alphabet', 'pig latin', 'phonetic spelling', 'phone keypad'],
  },
  {
    id: 'analyzers',
    name: 'Analyzers',
    icon: '#',
    color: '#14b8a6',
    category: 'Inspect',
    tagline: 'Count characters, words, and lines; analyze frequency.',
    description: 'Character, word, and line counts plus character-frequency analysis for any text you paste in.',
    keywords: ['character counter', 'word counter', 'line counter', 'letter frequency'],
  },
  {
    id: 'diff',
    name: 'Diff',
    icon: '±',
    color: '#f59e0b',
    category: 'Inspect',
    tagline: 'Compare two texts line by line.',
    description: 'Paste two versions of a text and see a line-by-line diff with additions and deletions highlighted.',
    keywords: ['text diff', 'compare text', 'diff checker', 'line diff'],
  },
  {
    id: 'generators',
    name: 'Generators',
    icon: '⚄',
    color: '#22c55e',
    category: 'Generate',
    tagline: 'UUIDs, passwords, Base64, phone numbers, colors, dates, and sample data.',
    description: 'Generate UUIDs, secure passwords, Base64, phone numbers, random numbers, dates, IPs, hex colors, Lorem ipsum, sample JSON/XML/CSV/Markdown tables, and random picks from your lines.',
    keywords: ['uuid generator', 'password generator', 'base64 generator', 'phone number generator', 'random number', 'lorem ipsum', 'sample json', 'markdown table generator'],
  },
  {
    id: 'qr-code',
    name: 'QR Code',
    icon: '▦',
    color: '#ef4444',
    category: 'Generate',
    tagline: 'Turn a URL or text into a scannable, downloadable QR code.',
    description: 'Generate a QR code from any URL or text, with an optional centered logo, and download it as a PNG — all in your browser.',
    keywords: ['qr code generator', 'qr code from url', 'download qr code', 'qr png'],
  },
  {
    id: 'emoji',
    name: 'Emoji Copy',
    icon: '😀',
    color: '#f97316',
    category: 'Text',
    standalone: true,
    repoPath: null,
    tagline: 'Click any emoji to copy it to your clipboard.',
    description: 'Browse every Unicode emoji by category and click to copy — search by name, no hunting through a keyboard.',
    keywords: ['emoji picker', 'copy emoji', 'emoji list', 'emoji keyboard', 'unicode emoji'],
  },
];

// Category display order for the landing page.
export const categories = ['Text', 'Code & Data', 'Inspect', 'Generate'];

export const toolsById = Object.fromEntries(tools.map((t) => [t.id, t]));

// Where each tool's source lives in the repo (open-source discoverability).
export const REPO = 'https://github.com/MichalAFerber/textwizard-tools';
const REPO_BLOB = `${REPO}/blob/main/`;
// repoPath: null → the tool's UI lives in the consuming site, so link the repo root.
export const repoUrlFor = (tool) =>
  tool.repoPath === null ? REPO : REPO_BLOB + (tool.repoPath || `features/${tool.id}.js`);
