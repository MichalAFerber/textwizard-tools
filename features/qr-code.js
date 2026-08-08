// QR code generator.
//
// Uses the vendored node-qrcode browser build (public/vendor/qrcode.min.js) —
// the same library ipcow.com's "Send a Secret" QR uses — via QRCode.toCanvas,
// then overlays an optional centered logo and offers a PNG download, mirroring
// that implementation. The library is loaded lazily the first time this page is
// opened so the other tools don't pay for it.

const LIB_SRC = '/vendor/qrcode.min.js';
const LOGO_SRC = '/favicon.svg';
const STORAGE_KEY = 'tw::qr-code';

let libPromise = null;
function loadLib() {
  if (window.QRCode) return Promise.resolve(window.QRCode);
  if (libPromise) return libPromise;
  libPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = LIB_SRC;
    s.onload = () => (window.QRCode ? resolve(window.QRCode) : reject(new Error('QR library did not initialize')));
    s.onerror = () => reject(new Error('Could not load the QR library'));
    document.head.appendChild(s);
  });
  return libPromise;
}

let logoImg = null;
let logoPromise = null;
function loadLogo() {
  if (logoPromise) return logoPromise;
  logoImg = new Image();
  logoImg.src = LOGO_SRC;
  logoPromise = new Promise((resolve) => {
    logoImg.onload = () => resolve(true);
    logoImg.onerror = () => resolve(false);
  });
  return logoPromise;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const qrCode = {
  id: 'qr-code',
  navLabel: 'QR Code',
  navIcon: '▦',
  title: 'QR Code',
  subtitle: 'Turn a URL or text into a scannable QR code, then download it as a PNG.',
  render(container) {
    container.innerHTML = `
      <div class="editor">
        <textarea class="tw-textarea" data-qr-input spellcheck="false"
          placeholder="Enter a URL or text to turn into a QR code."></textarea>
        <div class="toolbar">
          <div class="toolbar-left">
            <button class="btn btn-primary" data-qr-generate>Generate QR</button>
            <button class="btn" data-qr-download disabled>Download PNG</button>
          </div>
          <div class="toolbar-right">
            <label class="option"><input type="checkbox" data-qr-logo checked /> Center logo</label>
            <label class="option">Error correction
              <select class="tw-select" data-qr-ecl>
                <option value="L">L</option>
                <option value="M">M</option>
                <option value="Q">Q</option>
                <option value="H" selected>H</option>
              </select>
            </label>
          </div>
        </div>
        <div class="qr-block" data-qr-block style="margin-top:20px;display:flex;justify-content:center;">
          <canvas class="qr-canvas" data-qr-canvas width="288" height="288"
            style="border-radius:12px;max-width:100%;height:auto;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.18);"
            aria-label="QR code output"></canvas>
        </div>
        <div class="stats" data-qr-stats></div>
      </div>
    `;

    const input = container.querySelector('[data-qr-input]');
    const genBtn = container.querySelector('[data-qr-generate]');
    const dlBtn = container.querySelector('[data-qr-download]');
    const eclSel = container.querySelector('[data-qr-ecl]');
    const logoChk = container.querySelector('[data-qr-logo]');
    const canvas = container.querySelector('[data-qr-canvas]');
    const stats = container.querySelector('[data-qr-stats]');

    input.value = localStorage.getItem(STORAGE_KEY) || '';
    input.addEventListener('input', () => localStorage.setItem(STORAGE_KEY, input.value));

    async function generate() {
      const text = input.value;
      if (!text.trim()) { window.tw.toast('Enter some text or a URL first'); return; }

      let QRCode;
      try { QRCode = await loadLib(); }
      catch (e) { window.tw.toast(e.message); return; }

      const ecl = eclSel.value || 'H';
      try {
        await QRCode.toCanvas(canvas, text, {
          errorCorrectionLevel: ecl,
          width: 288,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
      } catch (e) {
        dlBtn.disabled = true;
        window.tw.toast(`Could not encode: ${e.message}`);
        return;
      }

      if (logoChk.checked) {
        const ok = await loadLogo();
        if (ok && logoImg.complete && logoImg.naturalWidth) {
          const ctx = canvas.getContext('2d');
          const n = Math.round(canvas.width * 0.24);
          const x = (canvas.width - n) / 2;
          const y = (canvas.height - n) / 2;
          const pad = Math.round(n * 0.16);
          ctx.fillStyle = '#ffffff';
          roundRectPath(ctx, x - pad, y - pad, n + pad * 2, n + pad * 2, Math.round(n * 0.2));
          ctx.fill();
          ctx.drawImage(logoImg, x, y, n, n);
        }
      }

      dlBtn.disabled = false;
      stats.textContent = `${text.length.toLocaleString()} characters · error correction ${ecl}`;
      window.tw.toast('QR code generated');
    }

    function download() {
      if (dlBtn.disabled) return;
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'textwizard-qr.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    genBtn.addEventListener('click', generate);
    dlBtn.addEventListener('click', download);
    // Re-render when the options change, but only once there's something to encode.
    eclSel.addEventListener('change', () => { if (input.value.trim()) generate(); });
    logoChk.addEventListener('change', () => { if (input.value.trim()) generate(); });

    // Regenerate any saved content when the page is reopened.
    if (input.value.trim()) generate();

    return null;
  },
};
