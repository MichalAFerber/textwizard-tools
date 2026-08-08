// Side-by-side text diff. Doesn't use the shared editor because it needs two
// textareas plus an output pane.

const LEFT_KEY = 'tw::diff::left';
const RIGHT_KEY = 'tw::diff::right';

// LCS-based line diff. Returns an array of { op: ' '|'+'|'-', line }.
function diffLines(a, b) {
  const al = a.replace(/\r\n?/g, '\n').split('\n');
  const bl = b.replace(/\r\n?/g, '\n').split('\n');
  const m = al.length, n = bl.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = al[i] === bl[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (al[i] === bl[j]) { out.push({ op: ' ', line: al[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ op: '-', line: al[i] }); i++; }
    else { out.push({ op: '+', line: bl[j] }); j++; }
  }
  while (i < m) out.push({ op: '-', line: al[i++] });
  while (j < n) out.push({ op: '+', line: bl[j++] });
  return out;
}

function renderDiff(parts) {
  if (!parts.length) return '<span class="diff-empty">No diff.</span>';
  return parts
    .map((p) => {
      const cls = p.op === '+' ? 'diff-add' : p.op === '-' ? 'diff-del' : 'diff-same';
      const text = p.line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<span class="${cls}">${p.op} ${text || ''}</span>`;
    })
    .join('\n');
}

export const diff = {
  id: 'diff',
  navLabel: 'Diff',
  navIcon: 'Δ',
  title: 'Diff',
  subtitle: 'Compare two texts line by line.',
  render(container) {
    container.innerHTML = `
      <div class="diff-layout">
        <div class="diff-panes">
          <div class="diff-pane">
            <div class="diff-pane-label">Original</div>
            <textarea class="tw-textarea" data-left spellcheck="false" placeholder="Original text…"></textarea>
          </div>
          <div class="diff-pane">
            <div class="diff-pane-label">Modified</div>
            <textarea class="tw-textarea" data-right spellcheck="false" placeholder="Modified text…"></textarea>
          </div>
        </div>
        <div class="diff-toolbar">
          <div class="toolbar-left">
            <button class="btn btn-primary" data-diff>Diff</button>
            <button class="btn" data-swap>Swap</button>
            <button class="btn" data-copy>Copy diff</button>
          </div>
          <div class="toolbar-right">
            <button class="btn btn-ghost" data-clear>Clear both</button>
          </div>
        </div>
        <pre class="diff-output" data-output><span class="diff-empty">Press “Diff” to compare.</span></pre>
        <div class="stats" data-stats></div>
      </div>
    `;

    const left = container.querySelector('[data-left]');
    const right = container.querySelector('[data-right]');
    const output = container.querySelector('[data-output]');
    const stats = container.querySelector('[data-stats]');

    left.value = localStorage.getItem(LEFT_KEY) || '';
    right.value = localStorage.getItem(RIGHT_KEY) || '';

    left.addEventListener('input', () => localStorage.setItem(LEFT_KEY, left.value));
    right.addEventListener('input', () => localStorage.setItem(RIGHT_KEY, right.value));

    function runDiff() {
      const parts = diffLines(left.value, right.value);
      output.innerHTML = renderDiff(parts);
      const adds = parts.filter((p) => p.op === '+').length;
      const dels = parts.filter((p) => p.op === '-').length;
      const same = parts.filter((p) => p.op === ' ').length;
      stats.textContent = `${adds} added · ${dels} removed · ${same} unchanged`;
    }

    container.querySelector('[data-diff]').addEventListener('click', runDiff);

    container.querySelector('[data-swap]').addEventListener('click', () => {
      const tmp = left.value;
      left.value = right.value;
      right.value = tmp;
      localStorage.setItem(LEFT_KEY, left.value);
      localStorage.setItem(RIGHT_KEY, right.value);
      runDiff();
    });

    container.querySelector('[data-copy]').addEventListener('click', async () => {
      const parts = diffLines(left.value, right.value);
      const text = parts.map((p) => `${p.op} ${p.line}`).join('\n');
      try { await navigator.clipboard.writeText(text); window.tw.toast('Copied diff'); }
      catch { window.tw.toast('Copy failed'); }
    });

    container.querySelector('[data-clear]').addEventListener('click', () => {
      left.value = '';
      right.value = '';
      localStorage.setItem(LEFT_KEY, '');
      localStorage.setItem(RIGHT_KEY, '');
      output.innerHTML = '<span class="diff-empty">Press “Diff” to compare.</span>';
      stats.textContent = '';
    });

    runDiff();
  },
};
