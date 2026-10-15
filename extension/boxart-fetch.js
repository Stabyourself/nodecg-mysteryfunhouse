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

const DIR = path.join(process.cwd(), "assets", nodecg.bundleName, "boxarts");

// downloads url into the boxarts as `${name}.<its type>`, gives the file name
async function saveBoxart(url, name) {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("only http(s) urls are supported");
  }

  const res = await fetch(parsed, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`server responded with status ${res.status}`);

  const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = EXTENSIONS[type];
  if (!ext) throw new Error(`that url is not a supported image (got ${type || "unknown type"} from ${parsed.href})`);

  if (Number(res.headers.get("content-length")) > MAX_BYTES) throw new Error("image is too large");

  // the header can be missing or wrong, so count while reading too (and stop reading)
  const chunks = [];
  let size = 0;
  for await (const chunk of res.body) {
    size += chunk.length;
    if (size > MAX_BYTES) throw new Error("image is too large");
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);

  const filename = `${name}.${ext}`;
  await fs.promises.mkdir(DIR, { recursive: true });
  await fs.promises.writeFile(path.join(DIR, filename), buffer);

  return filename;
}

// a boxart saved earlier as `${name}.<type>`, or null
async function findBoxart(name) {
  const files = await fs.promises.readdir(DIR).catch(() => []);
  return files.find((file) => file.slice(0, file.lastIndexOf(".")) == name) ?? null;
}

nodecg.listenFor("fetchBoxartFromUrl", async (url, ack) => {
  try {
    ack(null, await saveBoxart(url, `paste-${Date.now()}`));
  } catch (err) {
    nodecg.log.warn("fetchBoxartFromUrl failed:", err.message);
    ack(new Error(err.message));
  }
});

exports.saveBoxart = saveBoxart;
exports.findBoxart = findBoxart;
