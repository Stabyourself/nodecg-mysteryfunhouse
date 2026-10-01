// Operator panel on the right edge of the page: the stats readout, then pick which clip
// the TV plays, skip to a random one, pause, and seek. It sits on top of the 1920x1080
// graphic, so it hides itself inside OBS (and with ?controls=0); H toggles it.

const CSS = `
  .hq-controls {
    position: fixed; top: 0; right: 0; bottom: 0; width: 340px; z-index: 10;
    display: flex; flex-direction: column; gap: 10px; padding: 14px;
    box-sizing: border-box;
    background: rgba(12, 12, 18, 0.88); color: #e8e8ee;
    font: 14px/1.35 system-ui, sans-serif;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }
  .hq-controls.hidden { display: none; }
  .hq-controls h2 { margin: 0; font-size: 13px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #9a9aac; }
  .hq-controls .now { font-weight: 600; min-height: 1.35em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hq-controls .row { display: flex; gap: 8px; align-items: center; }
  .hq-controls button {
    background: #2a2a38; color: inherit; border: 1px solid #3a3a4c; border-radius: 6px;
    padding: 6px 10px; font: inherit; cursor: pointer;
  }
  .hq-controls button:hover { background: #34344a; }
  .hq-controls input[type=range] { flex: 1; accent-color: #7aa2ff; }
  .hq-controls .time { font-variant-numeric: tabular-nums; color: #9a9aac; font-size: 12px; min-width: 88px; text-align: right; }
  .hq-controls input[type=search] {
    background: #1b1b26; color: inherit; border: 1px solid #3a3a4c; border-radius: 6px;
    padding: 6px 8px; font: inherit;
  }
  .hq-controls ul { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; border-top: 1px solid rgba(255, 255, 255, 0.08); }
  .hq-controls li { padding: 5px 8px; border-radius: 5px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hq-controls li:hover { background: #262634; }
  .hq-controls li.current { background: #2d3d66; color: #fff; }
  .hq-controls .hint { color: #6d6d80; font-size: 12px; }
  .hq-controls .stats-host:empty { display: none; }
`;

// "AladdinSNES-Final.mp4" -> "AladdinSNES"
function label(file) {
  return file.replace(/\.[^.]+$/, '').replace(/-Final$/i, '');
}

function formatTime(s) {
  if (!Number.isFinite(s)) return '--:--';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

// videos: [{ name, url }]. onPlay gets one of those entries.
export function createControls({ videos, video, onPlay, onNext }) {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.className = 'hq-controls';
  panel.innerHTML = `
    <div class="stats-host"></div>
    <h2>Now playing</h2>
    <div class="now">-</div>
    <div class="row">
      <button data-act="toggle">Pause</button>
      <button data-act="next">Random next</button>
    </div>
    <div class="row">
      <input type="range" class="seek" min="0" max="1" step="0.1" value="0">
      <span class="time">--:-- / --:--</span>
    </div>
    <input type="search" class="filter">
    <ul></ul>
    <div class="hint">H hides this panel. It never shows in OBS.</div>
  `;
  document.body.appendChild(panel);

  const now = panel.querySelector('.now');
  const toggle = panel.querySelector('[data-act=toggle]');
  const seek = panel.querySelector('.seek');
  const time = panel.querySelector('.time');
  const filter = panel.querySelector('.filter');
  const list = panel.querySelector('ul');

  const items = new Map(); // url -> <li>
  let currentUrl = null;

  function applyFilter() {
    const q = filter.value.trim().toLowerCase();
    for (const li of items.values()) li.style.display = li.title.toLowerCase().includes(q) ? '' : 'none';
  }
  filter.addEventListener('input', applyFilter);

  function setVideos(newVideos) {
    list.textContent = '';
    items.clear();
    for (const entry of newVideos) {
      const li = document.createElement('li');
      li.textContent = label(entry.name);
      li.title = entry.name;
      li.classList.toggle('current', entry.url === currentUrl);
      li.addEventListener('click', () => onPlay(entry));
      list.appendChild(li);
      items.set(entry.url, li);
    }
    filter.placeholder = `Filter ${newVideos.length} clips...`;
    applyFilter();
  }
  setVideos(videos);

  toggle.addEventListener('click', () => {
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  });
  panel.querySelector('[data-act=next]').addEventListener('click', () => onNext());

  // seeking: don't let playback updates fight the handle while it's being dragged
  let dragging = false;
  seek.addEventListener('pointerdown', () => { dragging = true; });
  seek.addEventListener('pointerup', () => { dragging = false; });
  seek.addEventListener('input', () => {
    if (Number.isFinite(video.duration)) video.currentTime = Number(seek.value);
    updateTime();
  });

  function updateTime() {
    const d = video.duration;
    if (Number.isFinite(d)) {
      seek.max = String(d);
      if (!dragging) seek.value = String(video.currentTime);
    }
    seek.disabled = !Number.isFinite(d);
    time.textContent = `${formatTime(Number(seek.value))} / ${formatTime(d)}`;
    toggle.textContent = video.paused ? 'Play' : 'Pause';
  }
  for (const ev of ['timeupdate', 'loadedmetadata', 'durationchange', 'play', 'pause', 'emptied']) {
    video.addEventListener(ev, updateTime);
  }
  updateTime();

  const params = new URLSearchParams(location.search);
  if (window.obsstudio || params.get('controls') === '0') panel.classList.add('hidden');
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement && e.target.type !== 'range') return;
    if (e.key === 'h' || e.key === 'H') panel.classList.toggle('hidden');
  });

  return {
    // where the stats readout goes (top of the panel, above the player controls)
    statsHost: panel.querySelector('.stats-host'),
    setVideos,
    setCurrent(entry) {
      currentUrl = entry.url;
      now.textContent = label(entry.name);
      now.title = entry.name;
      for (const [url, li] of items) li.classList.toggle('current', url === currentUrl);
      items.get(currentUrl)?.scrollIntoView({ block: 'nearest' });
    },
  };
}
