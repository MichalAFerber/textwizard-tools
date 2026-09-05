/**
 * TGWAB — the XSS rule's own control. DEV-STANDARDS §15.
 *
 * Place at:  test/xss-lint-fixture.test.js
 * Fixture:   test/fixtures/xss-lint-fixture.js
 *
 * WHERE THIS RUNS. In the ADOPTING repo, against that repo's own installed
 * ESLint and its own eslint.config.js — not in tgwab-standards, which has no
 * package.json and whose CI runs one shell script. Adopting the rule means
 * adopting its control; a rule with no failing case has not been shown to work.
 *
 * WHY `lintText` WITH A SYNTHETIC PATH, AND NOT `lintFiles`.
 * The fixture is named in the config's global ignores (it must be, or its five
 * deliberate hazards fail every `npm run lint`), and flat-config scoping is by
 * path — so linting the fixture where it actually lives applies NO rule and the
 * run comes back clean.
 *
 * THE SYNTHETIC NAME'S UNDERSCORES MATTER IN ONE ADOPTION SHAPE AND NOT THE
 * OTHER, AND THIS FILE USED TO CLAIM OTHERWISE. Read which shape you are in
 * before concluding anything from a rename.
 *
 *   WHOLE ADOPTION — the repo takes this kit's `eslint.config.js` entire, so
 *   the global `'**\/xss-lint-fixture.js'` ignore is present. Here the
 *   underscores ARE load-bearing: `src/__xss-lint-fixture__.js` does not match
 *   that ignore, and renaming to `src/xss-lint-fixture.js` makes the fixture
 *   invisible, so `flaggedCases()` returns []. The run then reports zero
 *   findings and FAILS — `toEqual([...five cases])` catches it.
 *
 *   PARTIAL ADOPTION — the repo merged the §15 blocks into its own config,
 *   scoping the rule `files: ['src/**\/*.js']` and keeping its own `ignores`,
 *   which name no fixture because the fixture lives under `test/`.
 *   `resizewizard-api` is the live example. Here the disguise is protecting
 *   against an ignore that does not exist: renaming changes nothing, the run
 *   still reports 5 findings, and it still passes.
 *
 * This paragraph previously said the rename "makes this whole test report zero
 * findings AND PASS" — which described the first draft of this file, before the
 * `toEqual` existed. It was then wrong in every repo: it fails under whole
 * adoption and is inert under partial adoption. A warning about the failure
 * this fixture exists to prevent must not itself be stale, or a reader
 * restructures the test to close a hole that is already closed.
 *
 * `lintText` with `filePath` under src/ makes the repo's REAL config apply — the
 * same rule, the same scope, the same opt-out blocks — without putting a file
 * full of deliberate hazards where `npm run lint` would fail on it.
 *
 * WHAT IT ASSERTS, in three directions:
 *   - the five hazards flag (the rule can fire),
 *   - the two negative controls do not (the rule is not just shouting), and
 *   - the rule resolves for every file this repo NAMES as covered product
 *     source, in `fixtures/xss-lint-covers.json` (it is not merely wired).
 *
 * WHY THE THIRD EXISTS, AND WHY THE FIRST TWO CANNOT STAND IN FOR IT.
 * Everything above is measured through `lintText` at the SYNTHETIC path
 * `src/__xss-lint-fixture__.js`. That path is a string in this file, not a file
 * in the repo, and it matches the rule's glob no matter what the repo contains.
 * So the first two tests pass 5-of-5 with both controls clean in a repo where
 * the rule covers NOTHING — measured in `uploadwizard-app` and `cert-viewer.us`,
 * which ship zero `.js` files and were therefore fully inert under the earlier
 * `**\/*.js` scope while this fixture reported success.
 *
 * A fixture is a control on whether the rule is WIRED. It was never a control on
 * whether the rule REACHES anything, and it was being read as one.
 *
 * HOW THE THIRD IS BUILT, because the obvious versions are all wrong, AND THIS
 * PARAGRAPH HAS ALREADY BEEN WRONG ONCE — it described a count long after the
 * count stopped being the assertion. Read the code below before trusting it.
 *   - A hardcoded source path in THIS file breaks in the next repo laid out
 *     differently. The path is named by the ADOPTER, in a sidecar this file
 *     reads, precisely so the kit itself can stay byte-identical everywhere.
 *   - Asserting a count equals the repo's file count re-fails whenever somebody
 *     adds a file, so it gets deleted within the month.
 *   - Asserting "more than zero files are covered" was the assertion here until
 *     2026-09-05, and it is the original bug in new clothing. It passed at 7 of
 *     29 in `resizewizard-api`, over the scope defect that repo's own #62
 *     documents; and at 3 of 3 in `uploadwizard-app`, where all three files are
 *     build tooling and the 141 .astro/.ts files that render the HTML are
 *     invisible. A proportion is worse still: uploadwizard-app scores 100%.
 *
 * So the count is REPORTED and the ADOPTER'S NAMED FILES are asserted. It asks
 * ESLint itself, per file, whether THIS rule resolves for it. `isPathIgnored`
 * drops what the config excludes — and also drops `package.json`, `README.md`,
 * and everything else ESLint would not lint, so the reported denominator needs
 * no extension list of its own to maintain. `calculateConfigForFile` then says
 * whether `no-restricted-syntax` resolves to an error carrying the
 * JSON.stringify selector, rather than merely to some rule of that name the repo
 * configured for its own reasons.
 *
 * THE THREE EXCLUDED FILENAMES ARE THE POINT. `eslint.config.js`,
 * `xss-lint-fixture.js`, and `xss-lint-fixture.test.js` are the files a repo
 * GAINS BY ADOPTING THIS KIT. Measured: in a repo with no `.js` source at all,
 * `eslint.config.js` and this very test file both resolve the rule — so without
 * the exclusion the assertion passes by proving the kit lints itself, which is
 * not coverage. Do not "simplify" it by dropping them.
 *
 * WHAT IT STILL DOES NOT PROVE: that the rule reaches the source that renders
 * HTML. `.ts`, `.tsx`, and `.astro` are not linted by the shipped config, so in
 * an Astro or TypeScript repo this passes on a `.mjs` build script while the
 * pages stay invisible. That gap is declared in `eslint.config.js`. This test
 * raises the bar from "wired" to "not inert" — not to "covered".
 */
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, relative, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(here, 'fixtures/xss-lint-fixture.js');

/** Case numbers the rule fired on, read back from the fixture's own markers. */
async function flaggedCases() {
  const code = readFileSync(FIXTURE, 'utf8');
  const eslint = new ESLint();
  // Linted AS IF it lived in src/, so the repo's own scoping applies.
  const [result] = await eslint.lintText(code, {
    filePath: resolve(process.cwd(), 'src/__xss-lint-fixture__.js'),
  });
  const lines = code.split('\n');
  const cases = new Set();
  for (const m of result.messages) {
    if (m.ruleId !== 'no-restricted-syntax') continue;
    for (let i = m.line - 1; i >= 0; i--) {
      const name = /function (case\d)/.exec(lines[i]);
      if (name) {
        cases.add(name[1]);
        break;
      }
    }
  }
  return [...cases].sort();
}

describe('the interpolated-JSON XSS rule (DS §15)', () => {
  it('flags all five hazards, including the three a direct-child selector misses', async () => {
    const flagged = await flaggedCases();
    // case3 conditional, case4 wrapper call, case5 arrow in .map() — each a
    // GRANDCHILD of the TemplateLiteral. A `TemplateLiteral > CallExpression`
    // selector returns only case1 and case2, which is what this pins against.
    expect(flagged).toEqual(['case1', 'case2', 'case3', 'case4', 'case5']);
  });

  it('leaves the two negative controls alone', async () => {
    const flagged = await flaggedCases();
    // THIS ASSERTION COMES FIRST BECAUSE THE TWO BELOW CANNOT STAND WITHOUT IT.
    // A rule that is switched off flags nothing, and nothing contains neither
    // control — so `not.toContain` x2 passes green on a wholly INERT rule.
    // Measured with `no-restricted-syntax: 'off'`: the test above goes red,
    // this one stayed green and reported success. Conjoined with that test the
    // pair was always sound, but this file's own framing — "a run proves the
    // rule can both fire and stay silent" — reads as if each half stands
    // alone, and half of it did not. Establishing that the rule fired at all is
    // what makes the silence below evidence rather than an absence.
    expect(flagged).toContain('case1');
    // case6 is the literal TEXT "JSON.stringify" in a script template; case7 is
    // an ordinary call nowhere near a template. A rule that flagged either would
    // be unusable, and this is what says it does not.
    expect(flagged).not.toContain('case6');
    expect(flagged).not.toContain('case7');
  });
});

/**
 * Filenames a repo GAINS BY ADOPTING THIS KIT, excluded from the count below:
 * a rule that resolves only for these proves the kit lints itself.
 */
const KIT_FILES = new Set([
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'xss-lint-fixture.js',
  'xss-lint-fixture.test.js',
]);

/** Every path in the working tree, minus VCS metadata and installed deps. */
function* shippedFiles(dir, root) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* shippedFiles(full, root);
    else if (entry.isFile()) yield relative(root, full);
  }
}

/**
 * Whether a RESOLVED config carries this rule as an error. Severity is checked
 * against the number 2 because `calculateConfigForFile` normalises it; the
 * selector is checked so a repo's own unrelated `no-restricted-syntax` cannot
 * satisfy this by name alone.
 */
function carriesTheRule(config) {
  const entry = config?.rules?.['no-restricted-syntax'];
  if (!Array.isArray(entry) || entry[0] !== 2) return false;
  return entry
    .slice(1)
    .some(
      (o) =>
        typeof o?.selector === 'string' &&
        o.selector.includes('JSON') &&
        o.selector.includes('stringify'),
    );
}

async function ruleCoverage(root = process.cwd()) {
  const eslint = new ESLint();
  const covered = [];
  let linted = 0;
  for (const rel of shippedFiles(root, root)) {
    if (KIT_FILES.has(basename(rel))) continue;
    if (await eslint.isPathIgnored(rel)) continue;
    linted++;
    if (carriesTheRule(await eslint.calculateConfigForFile(rel))) covered.push(rel);
  }
  return { covered, linted };
}

/**
 * The adopter's own declaration of what the rule covers. Sits beside the
 * fixture, resolved from THIS file rather than from `process.cwd()`, so it is
 * found identically whether CI runs at the repo root or inside a workspace
 * package.
 */
const COVERS = resolve(here, 'fixtures/xss-lint-covers.json');

/**
 * WHY A NAMED FILE AND NOT A COUNT. Read this before replacing it with a
 * number, because a number is what it replaced.
 *
 * This assertion used to be `expect(covered.length).toBeGreaterThan(0)` — "the
 * rule reaches at least one file this repo ships." That is not the claim
 * anybody read it as, and both failure directions were measured on 2026-09-05:
 *
 *   resizewizard-api    passes at 7 of 29, sailing straight over the scope
 *                       defect its own issue #62 documents.
 *   uploadwizard-app    passes at 3 of 3 — a PERFECT proportion — where all
 *                       three files are `astro.config.mjs`, a migrations
 *                       runner, and a version stamper. None renders HTML. The
 *                       141 .astro/.ts files that do, 49 of them containing
 *                       JSON.stringify, are invisible to the rule.
 *
 * A FLOOR PROPORTION WOULD HAVE BEEN WORSE, WHICH IS WHY THIS IS NOT ONE.
 * uploadwizard-app scores 100%. It is the worst-covered repo in the estate and
 * the only one a proportion would have called perfect. Any threshold is
 * satisfiable by a repo whose linted set is entirely build tooling, because the
 * denominator is "files ESLint lints" and build tooling is the part of a
 * TypeScript repo that ESLint can still parse.
 *
 * So the adopter NAMES the files instead, in `fixtures/xss-lint-covers.json`,
 * and this asserts the rule actually resolves for each one. The gain is not
 * arithmetic — it is that the claim becomes FALSIFIABLE BY A REVIEWER. A count
 * cannot be wrong in an interesting way. "src/portal.js is product source this
 * repo ships" can be wrong, and a human can say so in review.
 *
 * BE HONEST ABOUT WHAT THIS IS. Nothing here can check that a named file is
 * genuinely product source rather than a build script — that judgement is the
 * adopter's and the reviewer's. This is a REVIEWABLE DECLARATION, not a
 * measurement. Recording that plainly is the point: the reason the `> 0`
 * version failed was that it was read as a measurement of coverage when it was
 * only ever a measurement of non-inertness, and replacing one overclaiming
 * control with another would be the same mistake wearing a different number.
 *
 * THE EMPTY DECLARATION IS A FEATURE, NOT AN ESCAPE HATCH. A repo whose product
 * source this kit cannot parse (.ts/.tsx/.astro) declares `covers: []` and
 * writes `declaredGap`. It stays green — the gap is an estate-level decision
 * that no single repo can fix by editing a glob — but it now says so IN THE
 * REPO, where a reviewer meets it, instead of reporting a confident 3 of 3.
 * That converts a silence into a claim, which is the same move as §15's rule
 * opt-out.
 */
/**
 * Shapes that are NOT product source. Deliberately short and evidence-led: each
 * entry is a file that was actually named as coverage by a repo covering
 * nothing real, not a guess at what build tooling looks like.
 *
 * Measured 2026-09-05 in `uploadwizard-app`, whose coverage check passed 3 of 3
 * on exactly these three shapes — `astro.config.mjs`, `migrations/run.mjs`,
 * `scripts/stamp-version.mjs` — while 141 .astro/.ts files rendered the HTML.
 * Blocking them turns the one case that actually happened from "a reviewer
 * might notice" into "CI says so."
 *
 * A repo whose genuine product source lives under one of these paths raises it
 * in tgwab-standards rather than editing this vendored file — that is §15's
 * rule for any change to the kit, not a special case here. It is expected to be
 * rare: these are the directories a repo puts things in BECAUSE they do not
 * ship.
 */
const NOT_PRODUCT_SOURCE = [
  /(^|\/)[^/]*\.config\.(js|mjs|cjs)$/,
  /(^|\/)(scripts|migrations|tests?|__tests__|e2e|loadtest|test-kit)\//,
];

function readDeclaration() {
  let raw;
  try {
    raw = readFileSync(COVERS, 'utf8');
  } catch {
    throw new Error(
      `DS §15: ${relative(process.cwd(), COVERS)} is missing. Create it naming ` +
        'the product source this repo ships that the rule must cover, e.g. ' +
        '{"covers": ["src/index.js"], "why": "renders the portal HTML"}. If this ' +
        'kit cannot parse this repo\'s product source (.ts/.tsx/.astro), use ' +
        '{"covers": [], "declaredGap": "<reason, and where it is tracked>"}.',
    );
  }
  const d = JSON.parse(raw);
  if (!Array.isArray(d.covers)) throw new Error('DS §15: `covers` must be an array.');
  return d;
}

describe('the rule reaches this repo (DS §15)', () => {
  it('resolves for every file this repo NAMES as covered product source', async () => {
    const d = readDeclaration();
    const { covered, linted } = await ruleCoverage();

    // REPORTED, NOT ASSERTED. The shape is worth seeing — 7 of 29 and 3 of 3
    // are very different repos — but neither number is the gate, because both
    // of those passed the gate that WAS a number.
    console.log(
      `DS §15 coverage: the rule resolves for ${covered.length} of ${linted} ` +
        `linted files; ${d.covers.length} named as product source.`,
    );

    if (d.covers.length === 0) {
      expect(
        typeof d.declaredGap === 'string' && d.declaredGap.trim().length > 0,
        'DS §15: `covers` is empty, so `declaredGap` MUST say why this kit ' +
          'reaches none of this repo\'s product source, and where that is ' +
          'tracked. An empty declaration with no reason is the silence this ' +
          'file exists to prevent.',
      ).toBe(true);
      return;
    }

    const eslint = new ESLint();
    for (const named of d.covers) {
      expect(
        KIT_FILES.has(basename(named)),
        `DS §15: \`${named}\` is a file this repo GAINS by adopting the kit. ` +
          'Naming it proves the kit lints itself, which is not coverage.',
      ).toBe(false);
      expect(
        NOT_PRODUCT_SOURCE.some((re) => re.test(named)),
        `DS §15: \`${named}\` is build tooling, not product source. A repo ` +
          'passed this check 3 of 3 on a config file, a migrations runner and a ' +
          'version stamper while every file that rendered HTML was invisible — ' +
          'which is why naming one fails here. If this repo genuinely ships ' +
          'product source from that path, raise it in tgwab-standards; do not ' +
          'edit this vendored file.',
      ).toBe(false);
      expect(
        existsSync(named),
        `DS §15: \`${named}\` is named in xss-lint-covers.json but does not ` +
          `exist (resolved from ${process.cwd()}). If it moved, update the ` +
          'declaration — this failing is the declaration doing its job.',
      ).toBe(true);
      expect(
        carriesTheRule(await eslint.calculateConfigForFile(named)),
        `DS §15: the rule does NOT resolve for \`${named}\`, which this repo ` +
          'names as covered product source. Widen the rule block\'s `files` ' +
          'glob, or correct the declaration. Do not delete this test to go ' +
          'green.',
      ).toBe(true);
    }
  });
});
