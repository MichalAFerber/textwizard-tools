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
 * The synthetic name MUST keep its underscores. `src/__xss-lint-fixture__.js`
 * does not match the config's `'**\/xss-lint-fixture.js'` ignore; renaming it to
 * `src/xss-lint-fixture.js` makes this whole test report zero findings and pass. The first draft of this file did exactly
 * that and reported zero findings, which is the failure mode this fixture exists
 * to prevent, one level up: a green control that checks nothing.
 *
 * `lintText` with `filePath` under src/ makes the repo's REAL config apply — the
 * same rule, the same scope, the same opt-out blocks — without putting a file
 * full of deliberate hazards where `npm run lint` would fail on it.
 *
 * WHAT IT ASSERTS, in both directions:
 *   - the five hazards flag (the rule can fire), and
 *   - the two negative controls do not (the rule is not just shouting).
 */
import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

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
    // case6 is the literal TEXT "JSON.stringify" in a script template; case7 is
    // an ordinary call nowhere near a template. A rule that flagged either would
    // be unusable, and this is what says it does not.
    expect(flagged).not.toContain('case6');
    expect(flagged).not.toContain('case7');
  });
});
