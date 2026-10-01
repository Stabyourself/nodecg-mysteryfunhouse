// Reloads the page when the page itself or any of its modules changes on disk.
// NodeCG has no dev server for static graphics, so this just polls the files (HEAD
// requests compared by ETag / Last-Modified, as NodeCG sends; falls back to hashing
// the body on servers that send neither).

const INTERVAL_MS = 1000;

async function signature(url) {
  let res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
  const etag = res.headers.get('etag');
  const modified = res.headers.get('last-modified');
  // size alone would miss same-length edits, so it's only used alongside the others
  if (etag || modified) return [etag, modified, res.headers.get('content-length')].join('|');
  res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return String(h);
}

export function startLiveReload(urls) {
  const known = new Map();

  async function check() {
    for (const url of urls) {
      let sig;
      try {
        sig = await signature(url);
      } catch (e) {
        continue; // server briefly unreachable (e.g. NodeCG restarting)
      }
      if (!known.has(url)) {
        known.set(url, sig);
      } else if (known.get(url) !== sig) {
        console.log('[liveReload]', url, 'changed, reloading');
        location.reload();
        return;
      }
    }
    setTimeout(check, INTERVAL_MS);
  }

  check();
}
