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

  let reference = null;

  for (let i = 0; i < limit; i++) {
    const index = fromEnd ? length - 1 - i : i;
    if (lineSpread(data, width, index, horizontal) > UNIFORM_TOLERANCE) return i;

    // a border has to be one solid color, a gradient is content
    const across = horizontal ? width : data.length / 4 / width;
    const mean = meanWithin(data, width, index, horizontal, 0, across);

    if (reference === null) reference = mean;
    else if (Math.abs(mean - reference) > UNIFORM_TOLERANCE) return i;
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

  // columns[x] is the step between pixel x-1 and x, so a line's pos is exactly the crop value
  // that cuts there (as an inset from the left/top, or as the right/bottom edge's coordinate)
  for (let y = LINE_SAMPLE_STEP; y < height - LINE_SAMPLE_STEP; y += LINE_SAMPLE_STEP) {
    const row = y * width;

    for (let x = 1; x < width; x++) {
      columns[x] += gray[row + x] - gray[row + x - 1];
    }
  }

  for (let y = 1; y < height; y++) {
    const row = y * width;
    const prev = (y - 1) * width;

    for (let x = LINE_SAMPLE_STEP; x < width - LINE_SAMPLE_STEP; x += LINE_SAMPLE_STEP) {
      rows[y] += gray[row + x] - gray[prev + x];
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

function meanWithin(data, width, index, horizontal, from, to) {
  let sum = 0;
  let count = 0;

  for (let i = from; i < to; i += SAMPLE_STEP) {
    const p = horizontal ? (index * width + i) * 4 : (i * width + index) * 4;
    sum += (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
    count++;
  }

  return count ? sum / count : 0;
}

// only a solid border gets cropped: if the outside isn't one flat color it is part of the
// picture (or a layout), so nothing is cut
export function suggestCrop(imageData) {
  return detectContentBox(imageData);
}
