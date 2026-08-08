// Shared editor scaffold for features: textarea + button row(s) + stats,
// with placeholder-on-load behavior and per-feature localStorage persistence.

export function createEditor({
  container,
  storageKey,
  placeholderText,
  toolbarLeft = [],
  toolbarRight = [],
  buttons = [],
  options = [],
  optionDefaults = {},
}) {
  container.innerHTML = `
    <div class="editor">
      ${options.length ? `<div class="options" data-options></div>` : ''}
      <div class="textarea-wrap" data-textarea-wrap>
        <textarea class="tw-textarea" spellcheck="false" data-textarea></textarea>
        <div class="drop-hint">Drop file to load its text</div>
        <input type="file" hidden data-file-input />
      </div>
      <div class="toolbar">
        <div class="toolbar-left" data-toolbar-left></div>
        <div class="toolbar-right" data-toolbar-right></div>
      </div>
      <div class="stats" data-stats></div>
    </div>
  `;

  const textarea = container.querySelector('[data-textarea]');
  const textareaWrap = container.querySelector('[data-textarea-wrap]');
  const fileInput = container.querySelector('[data-file-input]');
  const toolbarLeftEl = container.querySelector('[data-toolbar-left]');
  const toolbarRightEl = container.querySelector('[data-toolbar-right]');
  const statsEl = container.querySelector('[data-stats]');
  const optionsEl = container.querySelector('[data-options]');

  const optionState = { ...optionDefaults };
  // Persisted option state.
  const optStorageKey = `${storageKey}::options`;
  try {
    const saved = JSON.parse(localStorage.getItem(optStorageKey) || 'null');
    if (saved && typeof saved === 'object') Object.assign(optionState, saved);
  } catch {}

  // Render options
  if (options.length) {
    for (const o of options) {
      const label = document.createElement('label');
      label.className = 'option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!optionState[o.key];
      checkbox.addEventListener('change', () => {
        optionState[o.key] = checkbox.checked;
        localStorage.setItem(optStorageKey, JSON.stringify(optionState));
        if (o.onChange) o.onChange(optionState);
      });
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + o.label));
      optionsEl.appendChild(label);
    }
  }

  // Initial content from localStorage; placeholder is the native HTML hint.
  textarea.value = localStorage.getItem(storageKey) || '';
  if (placeholderText) textarea.placeholder = placeholderText;

  textarea.addEventListener('input', () => {
    localStorage.setItem(storageKey, textarea.value);
    updateStats();
  });

  function updateStats() {
    const v = textarea.value;
    const chars = v.length;
    const words = v.trim() ? v.trim().split(/\s+/).length : 0;
    const lines = v ? v.split('\n').length : 0;
    statsEl.textContent = `${chars.toLocaleString()} chars · ${words.toLocaleString()} words · ${lines.toLocaleString()} lines`;
  }
  updateStats();

  function getValue() {
    return textarea.value;
  }

  // Undo history for programmatic setValue calls (button-driven transforms).
  // Free typing isn't tracked here — the textarea's own undo handles that.
  const history = [];
  const HISTORY_MAX = 50;
  let undoBtn = null;

  function refreshUndoBtn() {
    if (undoBtn) undoBtn.disabled = history.length === 0;
  }

  function setValue(v, { record = true } = {}) {
    if (record) {
      const prev = textarea.value;
      if (prev !== v) {
        history.push(prev);
        if (history.length > HISTORY_MAX) history.shift();
      }
    }
    textarea.value = v;
    localStorage.setItem(storageKey, v);
    updateStats();
    refreshUndoBtn();
  }

  function undo() {
    if (!history.length) return;
    const prev = history.pop();
    setValue(prev, { record: false });
  }

  function makeBtn({ label, className = 'tw-btn', onClick, title }) {
    const b = document.createElement('button');
    b.className = className;
    b.textContent = label;
    if (title) b.title = title;
    b.addEventListener('click', () => onClick({ getValue, setValue, optionState }));
    return b;
  }

  function loadFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setValue(String(reader.result ?? ''));
      window.tw?.toast(`Loaded ${file.name}`);
    };
    reader.onerror = () => window.tw?.toast(`Could not read ${file.name}`);
    reader.readAsText(file);
  }

  // Import-from-file button (always present).
  toolbarLeftEl.appendChild(
    makeBtn({
      label: 'Import file',
      onClick: () => fileInput.click(),
      title: 'Load text from a file on your computer',
    })
  );
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) loadFile(fileInput.files[0]);
    fileInput.value = ''; // allow re-selecting the same file
  });

  // Save-to-file button (always present).
  toolbarLeftEl.appendChild(
    makeBtn({
      label: 'Save file',
      onClick: () => openSaveDialog(),
      title: 'Save the textarea contents to a file',
    })
  );

  function openSaveDialog() {
    const saveKey = `${storageKey}::save`;
    let last = { name: 'textwizard', ext: 'txt' };
    try {
      const parsed = JSON.parse(localStorage.getItem(saveKey) || 'null');
      if (parsed && parsed.name && parsed.ext) last = parsed;
    } catch {}

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="Save file">
        <h2>Save file</h2>
        <div class="modal-row">
          <input type="text" class="tw-input" data-name placeholder="filename" />
          <select class="tw-select" data-ext>
            <option value="txt">.txt</option>
            <option value="md">.md</option>
            <option value="rtf">.rtf</option>
            <option value="csv">.csv</option>
            <option value="me">.me</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-cancel>Cancel</button>
          <button class="btn btn-primary" data-save>Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('show'));

    const nameInput = backdrop.querySelector('[data-name]');
    const extSelect = backdrop.querySelector('[data-ext]');
    nameInput.value = last.name;
    extSelect.value = last.ext;

    function close() {
      backdrop.classList.remove('show');
      setTimeout(() => backdrop.remove(), 120);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'Enter' && document.activeElement === nameInput) save();
    }
    function save() {
      const name = (nameInput.value || 'textwizard').trim() || 'textwizard';
      const ext = extSelect.value;
      localStorage.setItem(saveKey, JSON.stringify({ name, ext }));
      downloadAs(name, ext, getValue());
      window.tw?.toast(`Saved ${name}.${ext}`);
      close();
    }
    backdrop.querySelector('[data-cancel]').addEventListener('click', close);
    backdrop.querySelector('[data-save]').addEventListener('click', save);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    document.addEventListener('keydown', onKey);
    setTimeout(() => {
      nameInput.focus();
      nameInput.select();
    }, 0);
  }

  // Drag-and-drop onto the textarea. Use a counter because dragenter/leave
  // fire on child elements as the pointer moves over them.
  let dragDepth = 0;
  const isFileDrag = (e) =>
    e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');

  textareaWrap.addEventListener('dragenter', (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragDepth++;
    textareaWrap.classList.add('is-drag-over');
  });
  textareaWrap.addEventListener('dragover', (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  textareaWrap.addEventListener('dragleave', (e) => {
    if (!isFileDrag(e)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) textareaWrap.classList.remove('is-drag-over');
  });
  textareaWrap.addEventListener('drop', (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragDepth = 0;
    textareaWrap.classList.remove('is-drag-over');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadFile(file);
  });

  // Undo button (toolbar-right, disabled when no history).
  undoBtn = makeBtn({
    label: 'Undo',
    onClick: () => undo(),
    title: 'Revert the last button-driven change',
  });
  undoBtn.disabled = true;
  toolbarRightEl.appendChild(undoBtn);

  for (const b of toolbarLeft) toolbarLeftEl.appendChild(makeBtn(b));
  for (const b of toolbarRight) toolbarRightEl.appendChild(makeBtn(b));

  return { textarea, getValue, setValue, optionState };
}

// Small inline prompt for tools that need user inputs (Find/Replace, Repeat,
// Remove characters). Returns a promise that resolves to a values object or
// null if cancelled. Uses the same modal styling as the Save dialog.
export function askInputs({ title, fields, submitLabel = 'OK' }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    const fieldsHtml = fields
      .map(
        (f, i) => `
        <label class="modal-field">
          <span class="modal-field-label">${f.label}</span>
          <input type="${f.type || 'text'}"
                 class="tw-input"
                 data-field="${f.key}"
                 placeholder="${f.placeholder || ''}"
                 value="${f.default ?? ''}"
                 ${i === 0 ? 'autofocus' : ''} />
        </label>`
      )
      .join('');
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-label="${title}">
        <h2>${title}</h2>
        <div class="modal-fields">${fieldsHtml}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-cancel>Cancel</button>
          <button class="btn btn-primary" data-ok>${submitLabel}</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('show'));

    const inputs = Array.from(backdrop.querySelectorAll('[data-field]'));
    function close(result) {
      backdrop.classList.remove('show');
      setTimeout(() => backdrop.remove(), 120);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    }
    function onKey(e) {
      if (e.key === 'Escape') close(null);
      else if (e.key === 'Enter' && inputs.includes(document.activeElement)) submit();
    }
    function submit() {
      const values = {};
      for (const inp of inputs) values[inp.dataset.field] = inp.value;
      close(values);
    }
    backdrop.querySelector('[data-cancel]').addEventListener('click', () => close(null));
    backdrop.querySelector('[data-ok]').addEventListener('click', submit);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(null); });
    document.addEventListener('keydown', onKey);
    setTimeout(() => inputs[0]?.focus(), 0);
  });
}

const MIME_BY_EXT = {
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  rtf: 'application/rtf',
  me: 'text/plain',
};

// Minimal RTF wrapper so .rtf files actually open as rich text in
// TextEdit/Word. Non-ASCII characters are emitted as \uN? escapes per the
// RTF spec; codes above 32767 use the signed-16-bit form.
function textToRtf(s) {
  let body = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (ch === '\\') body += '\\\\';
    else if (ch === '{') body += '\\{';
    else if (ch === '}') body += '\\}';
    else if (ch === '\n') body += '\\par\n';
    else if (ch === '\r') continue;
    else if (ch === '\t') body += '\\tab ';
    else if (cp < 128) body += ch;
    else {
      const signed = cp > 32767 ? cp - 65536 : cp;
      body += `\\u${signed}?`;
    }
  }
  return `{\\rtf1\\ansi\\ansicpg1252\\deff0\n{\\fonttbl{\\f0\\fmodern Courier;}}\n\\f0\\fs22 ${body}\n}`;
}

function downloadAs(name, ext, text) {
  const mime = MIME_BY_EXT[ext] || 'text/plain';
  const body = ext === 'rtf' ? textToRtf(text) : text;
  const blob = new Blob([body], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
