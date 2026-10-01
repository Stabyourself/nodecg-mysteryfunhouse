// 2D overlays on top of the room: the dashboard's "top text" as a VCR on-screen display,
// and the telestrator. The VCR look is the same CSS as in
// src/js/components/mt20/MT20WaitScreen.vue (plain CSS here, since this page has no build).

const DIST = '/bundles/nodecg-mysteryfunhouse/dist';
const MARKDOWN_IT = '/bundles/nodecg-mysteryfunhouse/node_modules/markdown-it/dist/browser/markdown-it.umd.min.js';
const TELESTRATOR = '/bundles/nodecg-mysteryfunhouse/graphics/telestrator.html';

const BAND_GAP = 'linear-gradient(to bottom, #000 0%, #000 45%, transparent 47%, transparent 53%, #000 55%, #000 100%)';
const BAND = 'linear-gradient(to bottom, transparent 0%, transparent 45%, #000 47%, #000 53%, transparent 55%, transparent 100%)';
const SCANLINES = 'repeating-linear-gradient(to bottom, #000 0px, #000 3px, rgba(0, 0, 0, 0.6) 3px, rgba(0, 0, 0, 0.6) 5px)';

const CSS = `
  @font-face {
    font-family: 'VCR_OSD_MONO_1.001';
    src: url('${DIST}/font/VCR_OSD_MONO_1.001.woff2') format('woff2');
    font-weight: normal;
    font-style: normal;
  }

  .vcr-osd {
    position: absolute; top: 48px; left: 48px; right: 48px; padding: 10px 24px;
    z-index: 5; pointer-events: none;
    font-family: 'VCR_OSD_MONO_1.001', monospace; font-size: 64px; line-height: 1.05;
    color: #f4f4f4; text-transform: uppercase; text-align: left;
    /* faint scanlines, masked so they only affect the glyphs (not the scene behind) */
    -webkit-mask-image: ${SCANLINES}; mask-image: ${SCANLINES};
    opacity: 0; transition: opacity 0.15s steps(3);
  }
  .vcr-osd.shown { opacity: 1; }
  .vcr-osd p { margin: 0; }

  /* Both layers share the same tall mask that slides downward; the base layer has a
     gap where the band is and the glitch layer is only visible inside it, so the band
     looks like a slice of the text being pulled sideways as it rolls down. */
  .vcr-osd-layer {
    display: flex; align-items: flex-start; justify-content: flex-start; gap: 28px;
    padding: 10px 24px;
    -webkit-mask-size: 100% 300%; mask-size: 100% 300%;
    -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
    animation: vcr-osd-roll 4s linear infinite;
  }
  .vcr-osd-base {
    /* chromatic split + phosphor bloom */
    text-shadow: -3px 0 rgba(255, 30, 90, 0.65), 3px 0 rgba(0, 210, 255, 0.65), 0 0 12px rgba(255, 255, 255, 0.45);
    filter: drop-shadow(0 3px 0 rgba(0, 0, 0, 0.55));
    -webkit-mask-image: ${BAND_GAP}; mask-image: ${BAND_GAP};
  }
  .vcr-osd-glitch {
    position: absolute; inset: 10px 24px; color: #fff;
    text-shadow: -6px 0 rgba(255, 30, 90, 0.8), 6px 0 rgba(0, 210, 255, 0.8), 0 0 16px rgba(255, 255, 255, 0.7);
    -webkit-mask-image: ${BAND}; mask-image: ${BAND};
  }
  /* skewed per line (around each line's own center) rather than the whole block, so
     the offset doesn't grow with every additional line */
  .vcr-osd-glitch .vcr-osd-line, .vcr-osd-glitch .vcr-osd-play { transform: translateX(6px) skewX(-16deg); }
  .vcr-osd-glitch .vcr-osd-play { border-left-color: #fff; }
  .vcr-osd-text { flex: 1; min-width: 0; }
  /* keep blank lines from the dashboard as empty rows */
  .vcr-osd-line { min-height: 1.05em; }

  /* band travels from above the text to below it, then rests off-screen for a bit */
  @keyframes vcr-osd-roll {
    0% { -webkit-mask-position: 0 100%; mask-position: 0 100%; }
    60%, 100% { -webkit-mask-position: 0 0%; mask-position: 0 0%; }
  }
  .vcr-osd-play {
    flex: none; width: 0; height: 0; margin-top: 8px;
    border-top: 24px solid transparent; border-bottom: 24px solid transparent;
    border-left: 40px solid #f4f4f4;
    filter: drop-shadow(-3px 0 rgba(255, 30, 90, 0.65)) drop-shadow(3px 0 rgba(0, 210, 255, 0.65)) drop-shadow(0 0 8px rgba(255, 255, 255, 0.45));
    animation: vcr-osd-blink 1.2s steps(1) infinite;
  }
  @keyframes vcr-osd-blink { 0% { opacity: 1; } 60% { opacity: 0; } }

  .hq-telestrator {
    position: absolute; left: 0; top: 0; width: 1920px; height: 1080px;
    border: 0; background: transparent; z-index: 6;
  }
`;

let cssAdded = false;
function addCss() {
  if (cssAdded) return;
  cssAdded = true;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`could not load ${src}`));
    document.head.appendChild(s);
  });
}

// VCR-style OSD. setText() takes the dashboard's top text: every line is its own row,
// rendered as markdown; empty text hides the overlay.
export function createTopText(container) {
  addCss();
  const root = document.createElement('div');
  root.className = 'vcr-osd';
  // base text + a copy that is only visible inside the rolling distortion band
  root.innerHTML = `
    <div class="vcr-osd-layer vcr-osd-base"><div class="vcr-osd-play"></div><div class="vcr-osd-text"></div></div>
    <div class="vcr-osd-layer vcr-osd-glitch" aria-hidden="true"><div class="vcr-osd-play"></div><div class="vcr-osd-text"></div></div>
  `;
  container.appendChild(root);
  const targets = root.querySelectorAll('.vcr-osd-text');

  let md = null;
  let text = '';
  const escape = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

  function render() {
    const trimmed = (text || '').trim();
    root.classList.toggle('shown', trimmed !== '');
    if (!trimmed) return; // keep the old text while it fades out
    const html = trimmed
      .split('\n')
      .map((line) => `<div class="vcr-osd-line">${md ? md.render(line) : escape(line)}</div>`)
      .join('');
    targets.forEach((t) => { t.innerHTML = html; });
  }

  // same settings as the MarkdownText component used by the Vue version
  loadScript(MARKDOWN_IT)
    .then(() => { md = window.markdownit({ linkify: true }); render(); })
    .catch((e) => console.warn('[overlays] markdown unavailable, top text shown as plain text', e));

  return {
    setText(newText) {
      text = newText;
      render();
    },
  };
}

// The telestrator is its own graphic (and its own source in OBS); outside OBS it is
// laid over the scene so it can be drawn on here too.
export function createTelestrator(container) {
  addCss();
  const frame = document.createElement('iframe');
  frame.className = 'hq-telestrator';
  frame.src = TELESTRATOR;
  frame.setAttribute('allowtransparency', 'true');
  container.appendChild(frame);
  return frame;
}
