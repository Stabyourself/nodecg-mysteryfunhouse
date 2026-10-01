// A small readout (updated once a second) for chasing stutter; ?stats=0 hides it.
//   render      frames drawn per second, and the longest gap between two of them
//   video       frames the browser decoded/presented per second for the TV clip, and
//               how many different ones were actually on the TV when a frame was drawn
//   dropped     frames the video decoder gave up on since the clip started
// A smooth 60fps clip on a 60Hz output reads about 60 / 60 with a worst gap near 17ms.
// host: element to put the readout in (the control panel); without one it floats in
// the top right corner.
export function createStats(room, host = null) {
  const el = document.createElement('pre');
  el.className = 'hq-stats';
  el.style.cssText = 'margin:0;padding:8px 10px;background:rgba(0,0,0,0.75);color:#7dff9a;'
    + 'font:12px/1.4 ui-monospace,Consolas,monospace;pointer-events:none;white-space:pre;overflow:hidden;'
    + (host ? 'border-radius:6px;' : 'position:fixed;top:8px;right:8px;z-index:20;');
  el.textContent = 'measuring...';
  (host || document.body).appendChild(el);

  const video = room.video;
  let presented = 0;
  let mediaTime = -1;
  function onVideoFrame(now, meta) {
    presented++;
    mediaTime = meta.mediaTime;
    video.requestVideoFrameCallback(onVideoFrame);
  }
  if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(onVideoFrame);

  let frames = 0;
  let worst = 0;
  let shown = 0;
  let lastMediaTime = -1;
  let lastFrame = performance.now();
  let windowStart = lastFrame;
  function tick(now) {
    requestAnimationFrame(tick);
    frames++;
    worst = Math.max(worst, now - lastFrame);
    lastFrame = now;
    if (mediaTime !== lastMediaTime) {
      shown++;
      lastMediaTime = mediaTime;
    }
    const elapsed = now - windowStart;
    if (elapsed >= 1000) {
      const perSec = (n) => Math.round((n * 1000) / elapsed);
      const q = video.getVideoPlaybackQuality ? video.getVideoPlaybackQuality() : null;
      el.textContent = [
        `render   ${perSec(frames)} fps  worst gap ${worst.toFixed(1)} ms`,
        `video    ${perSec(presented)} decoded/s  ${perSec(shown)} on TV/s`,
        `dropped  ${q ? `${q.droppedVideoFrames} of ${q.totalVideoFrames}` : 'n/a'}`,
      ].join('\n');
      frames = 0;
      worst = 0;
      presented = 0;
      shown = 0;
      windowStart = now;
    }
  }
  requestAnimationFrame(tick);
}
