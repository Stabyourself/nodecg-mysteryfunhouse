const fs = require("fs");
const path = require("path");
const ctx = require("./nodecg");
const nodecg = ctx.get();

// downloads an image for the boxart drop zone when the browser can't (CORS)
const MAX_BYTES = 25 * 1024 * 1024;
const TIMEOUT = 15000;

const EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/bmp": "bmp",
};

nodecg.listenFor("fetchBoxartFromUrl", async (url, ack) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("only http(s) urls are supported");
    }

    const res = await fetch(parsed, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) throw new Error(`server responded with status ${res.status}`);

    const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const ext = EXTENSIONS[type];
    if (!ext) throw new Error(`that url is not a supported image (got ${type || "unknown type"} from ${parsed.href})`);

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_BYTES) throw new Error("image is too large");

    const filename = `paste-${Date.now()}.${ext}`;
    const dir = path.join(process.cwd(), "assets", nodecg.bundleName, "boxarts");
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, filename), buffer);

    ack(null, filename);
  } catch (err) {
    nodecg.log.warn("fetchBoxartFromUrl failed:", err.message);
    ack(new Error(err.message));
  }
});
