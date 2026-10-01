import * as THREE from 'three';

const noiseGlsl = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x),
               mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return s;
  }
`;

// Night sky drawn on the SKY box as if it were infinitely far away (everything is a
// function of the view direction, not the box surface), so it doesn't parallax.
export function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMoonDir: { value: new THREE.Vector3(0.8, 0.45, -0.3).normalize() },
      uSkyBrightness: { value: 0.12 },
    },
    side: THREE.DoubleSide,
    depthWrite: true,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uMoonDir;
      uniform float uSkyBrightness;
      varying vec3 vWorld;
      ${noiseGlsl}
      void main() {
        vec3 d = normalize(vWorld - cameraPosition);
        float h = d.y;

        vec3 zenith = vec3(0.003, 0.005, 0.022);
        vec3 mid = vec3(0.020, 0.018, 0.070);
        vec3 horizon = vec3(0.16, 0.055, 0.15);
        vec3 col = mix(horizon, mid, smoothstep(-0.03, 0.12, h));
        col = mix(col, zenith, smoothstep(0.10, 0.5, h));
        // sodium light pollution hugging the horizon
        col += vec3(0.35, 0.12, 0.05) * exp(-max(h + 0.02, 0.0) * 28.0);
        col *= uSkyBrightness;

        // stars (not dimmed with the rest, so they still read against a darker sky)
        vec2 sp = vec2(atan(d.z, d.x), asin(clamp(h, -1.0, 1.0))) * 220.0;
        vec2 cell = floor(sp);
        float r = hash12(cell);
        if (r > 0.975) {
          vec2 c = vec2(hash12(cell + 3.1), hash12(cell + 7.7)) * 0.6 + 0.2;
          float dd = length(fract(sp) - c);
          float tw = 0.6 + 0.4 * sin(uTime * (1.5 + r * 4.0) + r * 60.0);
          col += vec3(0.9, 0.95, 1.2) * smoothstep(0.12, 0.0, dd) * tw * (r - 0.975) * 120.0 * smoothstep(0.02, 0.2, h);
        }

        // moon glow (the moon itself sits above the window, only its halo shows)
        float mo = max(dot(d, uMoonDir), 0.0);
        col += (vec3(0.25, 0.32, 0.55) * pow(mo, 12.0) * 0.6 + vec3(0.6, 0.7, 1.0) * pow(mo, 400.0) * 4.0) * uSkyBrightness;

        // drifting clouds, lit purple from the city below and blue-silver toward the moon
        vec2 cp = d.xz / max(h + 0.12, 0.05) * 0.9 + vec2(uTime * 0.008, uTime * 0.003);
        float cl = fbm(cp);
        float cov = smoothstep(0.48, 0.78, cl) * smoothstep(-0.05, 0.08, h);
        vec3 cloudCol = mix(vec3(0.18, 0.07, 0.16), vec3(0.05, 0.06, 0.12), smoothstep(0.0, 0.35, h));
        cloudCol += vec3(0.20, 0.24, 0.40) * pow(mo, 6.0) * smoothstep(0.55, 0.85, cl);
        col = mix(col, cloudCol * uSkyBrightness, cov * 0.85);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// The CITY mesh is one merged skyline where every face is an axis-aligned rectangle
// split into two triangles (each triangle's bounding box is its whole rectangle).
// Store that world-space rectangle on every vertex so the shader can fit a whole
// number of windows inside each facade, instead of a world grid that would get cut
// off by rooflines and building edges.
export function prepareCityGeometry(cityMesh) {
  cityMesh.updateWorldMatrix(true, false);
  const geo = cityMesh.geometry.index ? cityMesh.geometry.toNonIndexed() : cityMesh.geometry;
  const pos = geo.attributes.position;
  const rectMin = new Float32Array(pos.count * 3);
  const rectMax = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const box = new THREE.Box3();
  for (let tri = 0; tri < pos.count; tri += 3) {
    box.makeEmpty();
    for (let k = 0; k < 3; k++) {
      box.expandByPoint(v.fromBufferAttribute(pos, tri + k).applyMatrix4(cityMesh.matrixWorld));
    }
    for (let k = 0; k < 3; k++) {
      box.min.toArray(rectMin, (tri + k) * 3);
      box.max.toArray(rectMax, (tri + k) * 3);
    }
  }
  geo.setAttribute('rectMin', new THREE.BufferAttribute(rectMin, 3));
  geo.setAttribute('rectMax', new THREE.BufferAttribute(rectMax, 3));
  cityMesh.geometry = geo;
}

// City silhouette with procedurally lit office windows. A few windows slowly switch
// on/off and a couple flicker with TV-blue light. Needs prepareCityGeometry().
export function createCityMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: /* glsl */ `
      attribute vec3 rectMin;
      attribute vec3 rectMax;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vRectMin;
      varying vec3 vRectMax;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vRectMin = rectMin;
        vRectMax = rectMax;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vRectMin;
      varying vec3 vRectMax;
      ${noiseGlsl}

      const vec2 CELL = vec2(0.055, 0.075);
      const float SIDE_MARGIN = 0.012;
      const float ROOF_MARGIN = 0.03;

      void main() {
        vec3 n = normalize(vNormalW);
        // near-black walls, so the skyline reads as a silhouette against the sky
        vec3 base = vec3(0.0012, 0.0009, 0.0025);
        // haze: lower floors dissolve into the light pollution
        float haze = smoothstep(2.4, 0.9, vWorld.y);
        base = mix(base, vec3(0.004, 0.0018, 0.0035), haze * 0.6);
        // roofs catch a bit of sky
        base += vec3(0.004, 0.004, 0.01) * max(n.y, 0.0);

        // fit a whole number of window columns into this facade, centred, and count
        // rows down from just under its roof, so no window ever crosses an edge
        bool alongZ = abs(n.x) > 0.5;
        float h = alongZ ? vWorld.z : vWorld.x;
        float hMin = alongZ ? vRectMin.z : vRectMin.x;
        float hMax = alongZ ? vRectMax.z : vRectMax.x;
        float cols = max(floor((hMax - hMin - 2.0 * SIDE_MARGIN) / CELL.x), 0.0);
        float u = (h - (hMin + hMax - cols * CELL.x) * 0.5) / CELL.x;
        float v = (vRectMax.y - ROOF_MARGIN - vWorld.y) / CELL.y;
        float inside = step(0.0, u) * step(u, cols) * step(0.0, v) * step(abs(n.y), 0.5);

        // per-building seed so neighbouring facades don't share a lighting pattern
        vec2 id = vec2(floor(u) + floor(hMin * 97.0) * 17.0, floor(v));
        vec2 f = vec2(fract(u), 1.0 - fract(v));
        float pane = smoothstep(0.18, 0.26, f.x) * smoothstep(0.82, 0.74, f.x) *
                     smoothstep(0.25, 0.33, f.y) * smoothstep(0.85, 0.77, f.y);
        pane *= inside;

        float r = hash12(id);
        float period = 12.0 + r * 40.0;
        float on = step(0.66, hash12(id + floor((uTime + r * period) / period) * 13.7));
        vec3 warm = mix(vec3(1.0, 0.55, 0.22), vec3(1.0, 0.78, 0.45), hash12(id + 5.0));
        vec3 cool = vec3(0.55, 0.75, 1.0);
        vec3 wc = mix(warm, cool, step(0.8, hash12(id + 9.0)));
        // the odd window with a TV flickering in it
        float tvw = step(0.985, hash12(id + 21.0));
        wc = mix(wc, vec3(0.35, 0.55, 1.0) * (0.6 + 0.4 * vnoise(vec2(uTime * 6.0, r * 50.0))), tvw);
        on = max(on, tvw);
        // dim interior variation so lit windows aren't flat
        float inner = 0.55 + 0.45 * vnoise(f * 2.0 + id);

        vec3 col = base + wc * pane * on * inner * 1.6 * (1.0 - haze * 0.5);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// Blinking red aircraft warning lights on the tallest rooftops of the CITY mesh.
export function createRoofBeacons(cityMesh) {
  cityMesh.updateWorldMatrix(true, false);
  const pos = cityMesh.geometry.attributes.position;
  const v = new THREE.Vector3();
  // highest vertex per 0.5m slice along the skyline
  const tops = new Map();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(cityMesh.matrixWorld);
    const key = Math.round(v.z / 0.5);
    const cur = tops.get(key);
    if (!cur || v.y > cur.y) tops.set(key, v.clone());
  }
  const picked = [...tops.values()].sort((a, b) => b.y - a.y).slice(0, 4);

  const geo = new THREE.BufferGeometry().setFromPoints(picked.map((p) => p.clone().add(new THREE.Vector3(-0.02, 0.03, 0))));
  geo.setAttribute('phase', new THREE.Float32BufferAttribute(picked.map((_, i) => i * 0.37), 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute float phase;
      varying float vOn;
      void main() {
        float t = fract(uTime * 0.5 + phase);
        vOn = smoothstep(0.0, 0.05, t) * smoothstep(0.35, 0.2, t);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = 90.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vOn;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = exp(-d * d * 6.0) + smoothstep(0.25, 0.0, d) * 2.0;
        gl_FragColor = vec4(vec3(3.0, 0.15, 0.08) * a * vOn, 1.0);
      }
    `,
  });
  return new THREE.Points(geo, mat);
}
