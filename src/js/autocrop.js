// finds the game in a frame by eating away flat borders (black bars, frames, panels)

const SAMPLE_STEP = 4; // only look at every nth pixel along a line
const UNIFORM_TOLERANCE = 14; // luminance spread below this counts as a flat line
const MAX_EAT = 0.45; // never eat more than this fraction from one side

function lineSpread(data, width, index, horizontal) {
  let min = 255;
  let max = 0;

  const length = horizontal ? width : data.length / 4 / width;

  for (let i = 0; i < length; i += SAMPLE_STEP) {
    const p = horizontal ? (index * width + i) * 4 : (i * width + index) * 4;
    // rough brightness
    const l = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;

    if (l < min) min = l;
    if (l > max) max = l;

    if (max - min > UNIFORM_TOLERANCE) return max - min;
  }

  return max - min;
}

function eat(data, width, height, horizontal, fromEnd) {
  const length = horizontal ? height : width;
  const limit = Math.floor(length * MAX_EAT);

  for (let i = 0; i < limit; i++) {
    const index = fromEnd ? length - 1 - i : i;
    if (lineSpread(data, width, index, horizontal) > UNIFORM_TOLERANCE) return i;
  }

  return 0;
}

// returns [left, right, top, bottom] in pixels
export function detectContentBox(imageData) {
  const { data, width, height } = imageData;

  const left = eat(data, width, height, false, false);
  const right = eat(data, width, height, false, true);
  const top = eat(data, width, height, true, false);
  const bottom = eat(data, width, height, true, true);

  // cropping everything away is worse than not cropping
  if (width - left - right < width * 0.1 || height - top - bottom < height * 0.1) {
    return [0, 0, 0, 0];
  }

  return [left, right, top, bottom];
}

export function imageDataFromImage(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// --- snap lines ---
// long straight borders show up as columns/rows where the brightness steps the same way
// all along them. summing signed means game noise cancels out and real edges add up

const LINE_SAMPLE_STEP = 2;
const MIN_PEAK_SCORE = 0.28; // fraction of the strongest line
const MIN_PEAK_DISTANCE = 0.012; // as a fraction of the axis, so peaks aren't clustered

function gradientProfiles(imageData) {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);

  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
  }

  const columns = new Float32Array(width);
  const rows = new Float32Array(height);

  for (let y = LINE_SAMPLE_STEP; y < height - LINE_SAMPLE_STEP; y += LINE_SAMPLE_STEP) {
    const row = y * width;

    for (let x = 1; x < width - 1; x++) {
      columns[x] += gray[row + x + 1] - gray[row + x - 1];
    }
  }

  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    const prev = (y - 1) * width;
    const next = (y + 1) * width;

    for (let x = LINE_SAMPLE_STEP; x < width - LINE_SAMPLE_STEP; x += LINE_SAMPLE_STEP) {
      rows[y] += gray[next + x] - gray[prev + x];
    }
  }

  for (let i = 0; i < columns.length; i++) columns[i] = Math.abs(columns[i]);
  for (let i = 0; i < rows.length; i++) rows[i] = Math.abs(rows[i]);

  return { columns, rows };
}

function peaks(profile, axisLength, maxLines) {
  let strongest = 0;
  for (const value of profile) if (value > strongest) strongest = value;
  if (!strongest) return [];

  const minDistance = Math.max(4, Math.round(axisLength * MIN_PEAK_DISTANCE));
  const found = [];

  for (let i = 1; i < profile.length - 1; i++) {
    const score = profile[i] / strongest;
    if (score < MIN_PEAK_SCORE) continue;
    if (profile[i] < profile[i - 1] || profile[i] < profile[i + 1]) continue;

    found.push({ pos: i, score });
  }

  // lines too close together would overlap, keep the innermost one
  // (you almost always want the inside of a border)
  found.sort((a, b) => a.pos - b.pos);

  const center = axisLength / 2;
  const clusters = [];

  for (const candidate of found) {
    const cluster = clusters[clusters.length - 1];

    if (cluster && candidate.pos - cluster[cluster.length - 1].pos < minDistance) {
      cluster.push(candidate);
    } else {
      clusters.push([candidate]);
    }
  }

  const kept = clusters.map((cluster) => {
    const best = cluster.reduce((winner, candidate) => {
      const winnerDistance = Math.abs(winner.pos - center);
      const candidateDistance = Math.abs(candidate.pos - center);

      if (candidateDistance < winnerDistance) return candidate;
      if (candidateDistance > winnerDistance) return winner;

      return candidate.score > winner.score ? candidate : winner;
    });

    return { pos: best.pos, score: Math.max(...cluster.map((c) => c.score)) };
  });

  // too many, keep the strongest
  kept.sort((a, b) => b.score - a.score);

  return kept.slice(0, maxLines).sort((a, b) => a.pos - b.pos);
}

export function detectEdgeLines(imageData, maxLines = 14) {
  const { columns, rows } = gradientProfiles(imageData);

  return {
    vertical: peaks(columns, imageData.width, maxLines),
    horizontal: peaks(rows, imageData.height, maxLines),
  };
}

// --- game inside a layout ---
// with an overlay around the game the flat border scan finds nothing, so use the snap
// lines to find the box the game is in and trim the black inside it

const FRAME_EDGE_MARGIN = 0.015; // lines this close to the frame edge are the layout itself
const MIN_PANEL_FRACTION = 0.12; // a panel smaller than this is not the game

function spreadWithin(data, width, index, horizontal, from, to) {
  let min = 255;
  let max = 0;

  for (let i = from; i < to; i += SAMPLE_STEP) {
    const p = horizontal ? (index * width + i) * 4 : (i * width + index) * 4;
    const l = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;

    if (l < min) min = l;
    if (l > max) max = l;

    if (max - min > UNIFORM_TOLERANCE) return max - min;
  }

  return max - min;
}

// trim flat rows/columns inside the box. repeat because trimming one side can make
// the next row flat
function trimUniform(imageData, box, passes = 3) {
  let trimmed = Object.assign({}, box);

  for (let pass = 0; pass < passes; pass++) {
    const before = trimmed;
    trimmed = trimUniformOnce(imageData, trimmed);

    if (
      trimmed.left === before.left &&
      trimmed.right === before.right &&
      trimmed.top === before.top &&
      trimmed.bottom === before.bottom
    ) {
      break;
    }
  }

  return trimmed;
}

function trimUniformOnce(imageData, box) {
  const { data, width } = imageData;
  const trimmed = Object.assign({}, box);

  while (trimmed.left < trimmed.right - 1 && spreadWithin(data, width, trimmed.left, false, trimmed.top, trimmed.bottom) <= UNIFORM_TOLERANCE) {
    trimmed.left++;
  }

  while (trimmed.right > trimmed.left + 1 && spreadWithin(data, width, trimmed.right - 1, false, trimmed.top, trimmed.bottom) <= UNIFORM_TOLERANCE) {
    trimmed.right--;
  }

  while (trimmed.top < trimmed.bottom - 1 && spreadWithin(data, width, trimmed.top, true, trimmed.left, trimmed.right) <= UNIFORM_TOLERANCE) {
    trimmed.top++;
  }

  while (trimmed.bottom > trimmed.top + 1 && spreadWithin(data, width, trimmed.bottom - 1, true, trimmed.left, trimmed.right) <= UNIFORM_TOLERANCE) {
    trimmed.bottom--;
  }

  return trimmed;
}

function largestInsetBox(lines, width, height) {
  const inner = (list, size) => {
    const margin = size * FRAME_EDGE_MARGIN;
    return list.filter((line) => line.pos > margin && line.pos < size - margin);
  };

  const verticals = inner(lines.vertical, width);
  const horizontals = inner(lines.horizontal, height);
  if (verticals.length < 2 || horizontals.length < 2) return null;

  let best = null;

  for (let a = 0; a < verticals.length - 1; a++) {
    for (let b = a + 1; b < verticals.length; b++) {
      for (let c = 0; c < horizontals.length - 1; c++) {
        for (let d = c + 1; d < horizontals.length; d++) {
          const box = {
            left: verticals[a].pos,
            right: verticals[b].pos,
            top: horizontals[c].pos,
            bottom: horizontals[d].pos,
          };

          const area = (box.right - box.left) * (box.bottom - box.top);
          if (area < width * height * MIN_PANEL_FRACTION) continue;
          if (!best || area > best.area) best = { box, area };
        }
      }
    }
  }

  return best && best.box;
}

// returns [left, right, top, bottom] in pixels
export function suggestCrop(imageData) {
  const { width, height } = imageData;

  // a box inside the frame beats trimming the edges (on a layout the edges are overlay)
  const panel = largestInsetBox(detectEdgeLines(imageData, 20), width, height);

  if (panel) {
    const box = trimUniform(imageData, panel);
    return [box.left, width - box.right, box.top, height - box.bottom];
  }

  // no box, plain capture: just trim the flat borders
  return detectContentBox(imageData);
}
