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

// ---------- tournament paths ----------
// Plain DOM/CSS copy of src/js/components/PlayerPath.vue (+ the Vuetify 2 timeline subset
// from src/scss/graphics-legacy.css) - keep in step with it. Four panels (a pair per
// match); the one pair matching the state ("paths1"/"paths2") slides in.
const PATH_CSS = `
  .player-path {
    position: absolute; top: 100px; left: 100px; width: 830px; height: 880px; box-sizing: border-box;
    z-index: 4; padding: 20px; text-align: center; color: #fff;
    font-family: 'Roboto', sans-serif; background: rgba(0, 0, 0, 0.7); border-radius: 20px; overflow: hidden;
    opacity: 0; transform: translateY(200px); pointer-events: none;
    transition: transform 0.6s, opacity 0.6s;
  }
  .player-path.right { left: 990px; }
  .player-path.active { opacity: 1; transform: translateY(0); transition-delay: 1s; }
  .player-path h1 { font-size: 2.5em; font-weight: 400; margin: 0.67em 0; }
  .player-path { display: flex; flex-direction: column; }
  .player-path h1 { flex: none; }
  /* fills exactly what is left under the heading, so the last match isn't cut off */
  .player-path .timeline-wrap { flex: 1 1 0; min-height: 0; overflow: hidden; }
  .player-path .none { font-size: 1.5em; margin-top: 40px; }

  .player-path .v-avatar {
    border: 2px solid #fff; border-radius: 50%; display: inline-flex; align-items: center;
    justify-content: center; overflow: hidden; position: relative; vertical-align: middle;
    height: 48px; min-width: 48px; width: 48px;
  }
  .player-path .v-avatar img { border-radius: inherit; height: inherit; width: inherit; }

  .player-path .v-timeline { padding-top: 24px; position: relative; }
  .player-path .v-timeline::before {
    content: ''; position: absolute; left: 47px; width: 2px;
    top: 55px; height: calc(100% - 110px); background: rgba(255, 255, 255, 0.24);
  }
  .player-path .v-timeline-item { display: flex; flex-direction: row-reverse; align-items: center; padding-bottom: 24px; }
  .player-path .v-timeline-item__body { position: relative; flex: 1 1 auto; max-width: calc(100% - 96px); }
  .player-path .v-timeline-item__divider { position: relative; min-width: 96px; display: flex; align-items: center; justify-content: center; }
  .player-path .v-timeline-item__dot {
    z-index: 2; border-radius: 50%; height: 52px; width: 52px; background: #111;
    box-shadow: 0 2px 1px -1px rgba(0,0,0,.2), 0 1px 1px 0 rgba(0,0,0,.14), 0 1px 3px 0 rgba(0,0,0,.12);
  }
  .player-path .v-timeline-item__inner-dot { border-radius: 50%; display: flex; justify-content: center; align-items: center; height: 42px; width: 42px; margin: 5px; }

  .player-path .match { display: flex; text-align: left; font-size: 2em; align-items: center; margin-top: 0.7em; }
  .player-path .round { font-size: 0.8em; font-weight: 200; min-width: 150px; }
  .player-path .opponent { font-weight: 700; flex-grow: 1; }
  .player-path .score { font-size: 1.5em; font-weight: 300; line-height: 0; margin-right: 15px; white-space: nowrap; }
  .player-path .score.green { color: #4caf50; }
  .player-path .score.red { color: #f44336; }
  .player-path .game { width: 100%; text-align: left; }
  .player-path .platform { background: #fff; padding: 2px 6px; border-radius: 5px; margin-right: 3px; color: #111; }
`;

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const apostrophe = (s) => (s.slice(-1) === 's' ? `${s}’` : `${s}’s`);

function pathHtml(info) {
  const matches = info.matches || [];
  const body = matches.length
    ? `<div class="v-timeline">${matches.map((m) => {
      const opponent = m.players && m.players[1] ? m.players[1] : { name: '', avatar: '' };
      return `
        <div class="v-timeline-item">
          <div class="v-timeline-item__body">
            <div class="match">
              <div class="round">${escapeHtml(m.round)}</div>
              <div class="opponent">${escapeHtml(opponent.name)}</div>
              <div class="score ${m.winner === 0 ? 'green' : 'red'}">${escapeHtml(m.score)}</div>
            </div>
            <div class="game"><span class="platform">${escapeHtml(m.platform)}</span> ${escapeHtml(m.game || 'Unknown')}</div>
          </div>
          <div class="v-timeline-item__divider"><div class="v-timeline-item__dot"><div class="v-timeline-item__inner-dot">
            <div class="v-avatar"><img src="${escapeHtml(opponent.avatar)}" /></div>
          </div></div></div>
        </div>`;
    }).join('')}</div>`
    : '<div class="none">No matches yet!</div>';
  return `<h1>${escapeHtml(apostrophe(info.name || ''))} matches</h1><div class="timeline-wrap">${body}</div>`;
}

// Scrolling is always automatic: while a panel is showing, it rests at the top, scrolls
// down at a steady pace, rests at the bottom, and scrolls back up, over and over. It is
// driven by time (not by counting frames/ticks) and re-measures the content every frame,
// so late-loading avatars or a hidden/throttled page can't leave it stuck or off-pace.
const SCROLL_SPEED = 45; // px per second
const SCROLL_REST = 2.5; // seconds waiting at the top / bottom

export function createPlayerPaths(container) {
  addCss();
  if (!document.getElementById('hq-path-css')) {
    const style = document.createElement('style');
    style.id = 'hq-path-css';
    style.textContent = PATH_CSS;
    document.head.appendChild(style);
  }

  const panels = [0, 1, 2, 3].map((i) => {
    const el = document.createElement('div');
    el.className = `player-path${i % 2 ? ' right' : ''}`;
    el.style.display = 'none';
    container.appendChild(el);
    return { el, key: null, wrap: null, active: false, t: 0 };
  });

  function setInfo(infos) {
    panels.forEach((panel, i) => {
      const info = (infos && infos[i]) || null;
      const key = JSON.stringify(info);
      if (key === panel.key) return;
      panel.key = key;
      panel.el.style.display = info ? '' : 'none';
      panel.el.innerHTML = info ? pathHtml(info) : '';
      panel.wrap = panel.el.querySelector('.timeline-wrap');
      panel.t = 0; // new content starts from the top
    });
  }

  function setState(state) {
    panels.forEach((panel, i) => {
      const active = state === (i < 2 ? 'paths1' : 'paths2');
      if (active && !panel.active) panel.t = 0; // slides in again: start from the top
      panel.active = active;
      panel.el.classList.toggle('active', active);
    });
  }

  let last = performance.now();
  function tick(now) {
    // clamp so a throttled/background tab doesn't jump the scroll by a huge step
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    for (const panel of panels) {
      const wrap = panel.wrap;
      if (!wrap) continue;
      const max = wrap.scrollHeight - wrap.clientHeight;
      if (!panel.active || max <= 0) {
        wrap.scrollTop = 0;
        continue;
      }
      // one cycle: rest, down, rest, up
      const travel = max / SCROLL_SPEED;
      panel.t += dt;
      const cycle = 2 * (SCROLL_REST + travel);
      const p = panel.t % cycle;
      let y;
      if (p < SCROLL_REST) y = 0;
      else if (p < SCROLL_REST + travel) y = (p - SCROLL_REST) * SCROLL_SPEED;
      else if (p < 2 * SCROLL_REST + travel) y = max;
      else y = max - (p - 2 * SCROLL_REST - travel) * SCROLL_SPEED;
      wrap.scrollTop = Math.min(Math.max(y, 0), max);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return { setInfo, setState };
}
