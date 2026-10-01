import * as THREE from 'three';
import { Effect, EffectAttribute, BlendFunction } from 'postprocessing';

export const LAYER_NO_OCCLUDE = 1; // visible, but not part of the moon's depth map

// Depth map of the room as seen from the moon (an orthographic, directional view),
// used by the volumetric pass and the dust so light shafts are shaped by the actual
// window frame, desk, lamp, ghost... rather than hand-placed geometry.
export class MoonDepth {
  constructor(direction, target, halfSize = 5, size = 1024) {
    this.direction = direction.clone().normalize();
    this.camera = new THREE.OrthographicCamera(-halfSize, halfSize, halfSize, -halfSize, 0.1, 40);
    this.camera.position.copy(target).addScaledVector(this.direction, -20);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld(true);
    this.camera.layers.set(0);

    this.target = new THREE.WebGLRenderTarget(size, size, {
      depthTexture: new THREE.DepthTexture(size, size, THREE.FloatType),
      depthBuffer: true,
    });
    this.target.depthTexture.minFilter = THREE.NearestFilter;
    this.target.depthTexture.magFilter = THREE.NearestFilter;

    this.material = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
    this.span = halfSize * 2; // metres covered by the depth map, edge to edge
    this.matrix = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
  }

  // Where a world-space box lands in the depth map, as a uv rectangle.
  uvBounds(box) {
    const min = new THREE.Vector2(Infinity, Infinity);
    const max = new THREE.Vector2(-Infinity, -Infinity);
    const v = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)
        .applyMatrix4(this.matrix);
      min.x = Math.min(min.x, v.x * 0.5 + 0.5);
      min.y = Math.min(min.y, v.y * 0.5 + 0.5);
      max.x = Math.max(max.x, v.x * 0.5 + 0.5);
      max.y = Math.max(max.y, v.y * 0.5 + 0.5);
    }
    return { min, max };
  }

  render(renderer, scene) {
    const prevTarget = renderer.getRenderTarget();
    const prevOverride = scene.overrideMaterial;
    const prevBg = scene.background;
    scene.overrideMaterial = this.material;
    scene.background = null;
    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, this.camera);
    renderer.setRenderTarget(prevTarget);
    scene.overrideMaterial = prevOverride;
    scene.background = prevBg;
    this.matrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
  }

  dispose() {
    this.target.dispose();
    this.material.dispose();
  }
}

const fragmentShader = /* glsl */ `
  uniform mat4 uProjInv;
  uniform mat4 uCamWorld;
  uniform vec3 uCamPos;

  uniform sampler2D tMoonDepth;
  uniform mat4 uMoonMatrix;
  uniform vec3 uMoonDir;
  uniform vec3 uMoonColor;
  uniform vec3 uBoxMin;
  uniform vec3 uBoxMax;

  uniform vec3 uTvPos;
  uniform vec3 uTvNormal;
  uniform vec3 uTvColor;
  uniform vec3 uLamp1Pos;
  uniform float uLamp1Floor;
  uniform vec3 uLamp1Color;
  uniform vec3 uLamp2Pos;
  uniform vec3 uLamp2Color;
  uniform float uHaze;
  uniform float uSteps;
  uniform float uStepLength;
  uniform vec2 uBeamMin;
  uniform vec2 uBeamMax;
  uniform float uMoonSpan;

  float ign(vec2 p) {
    return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
  }
  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  float noise3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash13(i), hash13(i + vec3(1,0,0)), u.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), u.x), u.y),
               mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), u.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), u.x), u.y), u.z);
  }

  vec2 boxHit(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax) {
    vec3 inv = 1.0 / rd;
    vec3 t0 = (bmin - ro) * inv, t1 = (bmax - ro) * inv;
    vec3 tmin = min(t0, t1), tmax = max(t0, t1);
    return vec2(max(max(tmin.x, tmin.y), tmin.z), min(min(tmax.x, tmax.y), tmax.z));
  }

  // Closed form of the single-scattering integral of an inverse-square point light
  // along a ray segment [0, T] (a.k.a. "airlight").
  float airlight(vec3 ro, vec3 rd, float T, vec3 P, float minH) {
    vec3 q = ro - P;
    float b = dot(rd, q);
    float h = max(sqrt(max(dot(q, q) - b * b, 0.0)), minH);
    return (atan((T + b) / h) - atan(b / h)) / h;
  }

  float phaseHG(float c, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * 3.14159265 * pow(1.0 + g2 - 2.0 * g * c, 1.5));
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
    vec4 v = uProjInv * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
    vec3 viewDir = normalize(v.xyz / v.w);
    float viewZ = getViewZ(depth);
    float tSurf = viewZ / viewDir.z;
    vec3 rd = normalize(mat3(uCamWorld) * viewDir);
    vec3 ro = uCamPos;
    float T = min(tSurf, 14.0);

    vec3 acc = vec3(0.0);

    // --- moon shafts: raymarch through the room against the moon depth map ---
    vec2 tb = boxHit(ro, rd, uBoxMin, uBoxMax);
    float t0 = max(tb.x, 0.0);
    float t1 = min(tb.y, T);
    // The moon's view is orthographic, so the ray is a straight line in its depth map
    // too: s(t) = s0 + t * ds, with xy the map's uv and z the depth to compare.
    vec3 s0 = (uMoonMatrix * vec4(ro, 1.0)).xyz * 0.5 + 0.5;
    vec3 ds = (uMoonMatrix * vec4(rd, 0.0)).xyz * 0.5;
    // Moonlight only gets in through the window, so the only air it can light is the
    // slanted column behind the window's outline in that map. March just the stretch
    // of the ray inside it: most of the screen never enters it and costs nothing, and
    // the rest spends its steps where there is something to find.
    vec2 dsxy = mix(vec2(1e-6), ds.xy, step(vec2(1e-6), abs(ds.xy)));
    vec2 ta = (uBeamMin - s0.xy) / dsxy, tc = (uBeamMax - s0.xy) / dsxy;
    vec2 tn = min(ta, tc), tf = max(ta, tc);
    t0 = max(t0, max(tn.x, tn.y));
    t1 = min(t1, min(tf.x, tf.y));
    if (t1 > t0) {
      float steps = clamp(ceil((t1 - t0) / uStepLength), 4.0, uSteps);
      float dt = (t1 - t0) / steps;
      // static dither: an animated one would shimmer and eat stream bitrate
      float j = ign(gl_FragCoord.xy);
      vec3 sum = vec3(0.0);
      // The beams dance: their streaks sway from side to side, on two periods that
      // never line up, so the movement doesn't visibly loop.
      float sway = 1.1 * sin(time * 0.61) + 0.7 * sin(time * 0.37 + 1.7);
      for (int i = 0; i < 64; i++) {
        if (float(i) >= steps) break;
        float t = t0 + (float(i) + j) * dt;
        vec3 s = s0 + ds * t;
        if (s.z - 0.0015 <= texture2D(tMoonDepth, s.xy).r) {
          float n = noise3((ro + rd * t) * 2.2 + vec3(time * 0.05, time * 0.015, time * 0.03));
          // Streaks run the length of the beams, a few of them across the window. The
          // map's uv is already a pair of axes square to the moon's direction: x across
          // the streaks, y up them.
          vec2 bp = s.xy * uMoonSpan;
          // a ripple travelling up each streak, so it bends as it sways instead of
          // sliding rigidly, and a slow wave across them, so neighbours close up and part
          float bend = sin(bp.y * 2.6 - time * 0.45);
          float part = sin(bp.x * 1.7 - time * 0.29);
          float band = 0.5 + 0.5 * sin(bp.x * 9.0 + sway + 0.9 * bend + 1.2 * part);
          // the colour (teal to violet) follows the movement, so it shifts as they sway
          float hue = 0.5 + 0.5 * sin(bp.x * 3.1 - 0.8 * sway + 1.4 * bend + time * 0.13);
          vec3 tint = mix(vec3(0.5, 1.1, 1.15), vec3(1.6, 0.8, 1.0), hue) * (0.4 + 1.2 * band);
          sum += tint * (0.35 + 0.9 * n * n);
        }
      }
      acc += uMoonColor * sum * dt * phaseHG(dot(uMoonDir, -rd), 0.45);
    }

    // --- TV: forward-lobed glow in the air in front of the screen ---
    {
      vec3 q = ro - uTvPos;
      float tc = clamp(-dot(rd, q), 0.0, T);
      vec3 dirToP = normalize(ro + rd * tc - uTvPos);
      float lobe = pow(max(dot(dirToP, uTvNormal), 0.0), 1.5);
      // Looking at the TV itself, the camera sees through the densest part of this
      // glow, which lays a milky veil over the picture. Keep it around the set, but
      // clear over the screen and casing so the gameplay stays legible.
      float clearOverTv = smoothstep(0.55, 1.0, length(ro + rd * T - uTvPos));
      acc += uTvColor * airlight(ro, rd, T, uTvPos, 0.12) * lobe * 0.9 * clearOverTv;
    }
    // --- desk lamp (open at the bottom) and torchiere (open at the top) ---
    {
      vec3 q = ro - uLamp1Pos;
      float tc = clamp(-dot(rd, q), 0.0, T);
      vec3 cp = ro + rd * tc;
      vec3 dp = normalize(cp - uLamp1Pos);
      float lobe = 0.2 + 0.8 * smoothstep(0.1, -0.6, dp.y);
      // the desktop it stands on blocks it: no glow in the air below that
      lobe *= smoothstep(uLamp1Floor - 0.04, uLamp1Floor + 0.02, cp.y);
      acc += uLamp1Color * airlight(ro, rd, T, uLamp1Pos, 0.05) * lobe;
    }
    {
      vec3 q = ro - uLamp2Pos;
      float tc = clamp(-dot(rd, q), 0.0, T);
      vec3 dp = normalize(ro + rd * tc - uLamp2Pos);
      float lobe = 0.12 + 0.88 * smoothstep(0.0, 0.7, dp.y);
      acc += uLamp2Color * airlight(ro, rd, T, uLamp2Pos, 0.05) * lobe;
    }

    // This pass runs right before bloom: scrub NaN/Inf and extreme fireflies (e.g. tiny
    // specular hits of the TV area light) so the mip blur can't spread them into blobs.
    vec3 base = inputColor.rgb;
    bvec3 bad = bvec3(!(base.r >= 0.0 && base.r < 1e4), !(base.g >= 0.0 && base.g < 1e4), !(base.b >= 0.0 && base.b < 1e4));
    if (any(bad)) base = vec3(0.0);
    base = min(base, vec3(24.0));
    outputColor = vec4(base + acc * uHaze, inputColor.a);
  }
`;

export class VolumetricEffect extends Effect {
  constructor(camera, moonDepth) {
    super('VolumetricEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map([
        ['uProjInv', new THREE.Uniform(new THREE.Matrix4())],
        ['uCamWorld', new THREE.Uniform(new THREE.Matrix4())],
        ['uCamPos', new THREE.Uniform(new THREE.Vector3())],
        ['tMoonDepth', new THREE.Uniform(moonDepth.target.depthTexture)],
        ['uMoonMatrix', new THREE.Uniform(moonDepth.matrix)],
        ['uMoonDir', new THREE.Uniform(moonDepth.direction)],
        ['uMoonColor', new THREE.Uniform(new THREE.Color(0.11, 0.14, 0.28))],
        ['uBoxMin', new THREE.Uniform(new THREE.Vector3(-0.1, 0.99, -4.8))],
        ['uBoxMax', new THREE.Uniform(new THREE.Vector3(6.3, 4.1, 3.8))],
        ['uTvPos', new THREE.Uniform(new THREE.Vector3())],
        ['uTvNormal', new THREE.Uniform(new THREE.Vector3(0, 0, 1))],
        ['uTvColor', new THREE.Uniform(new THREE.Color())],
        ['uLamp1Pos', new THREE.Uniform(new THREE.Vector3())],
        ['uLamp1Floor', new THREE.Uniform(-1e4)],
        ['uLamp1Color', new THREE.Uniform(new THREE.Color())],
        ['uLamp2Pos', new THREE.Uniform(new THREE.Vector3())],
        ['uLamp2Color', new THREE.Uniform(new THREE.Color())],
        ['uHaze', new THREE.Uniform(1)],
        ['uSteps', new THREE.Uniform(40)], // most steps a ray may take
        ['uStepLength', new THREE.Uniform(0.1)], // metres between steps, when that needs fewer
        // uv rectangle of the depth map the moonlight comes in through (whole map: no clipping)
        ['uBeamMin', new THREE.Uniform(new THREE.Vector2(0, 0))],
        ['uBeamMax', new THREE.Uniform(new THREE.Vector2(1, 1))],
        ['uMoonSpan', new THREE.Uniform(moonDepth.span)],
      ]),
    });
    this.camera = camera;
    this.moonDepth = moonDepth;
  }

  // box: world-space bounds of the opening (the window) the moonlight enters through
  setBeamOpening(box) {
    const { min, max } = this.moonDepth.uvBounds(box);
    this.uniforms.get('uBeamMin').value.copy(min).max(new THREE.Vector2(0, 0));
    this.uniforms.get('uBeamMax').value.copy(max).min(new THREE.Vector2(1, 1));
  }

  update() {
    const u = this.uniforms;
    u.get('uProjInv').value.copy(this.camera.projectionMatrixInverse);
    u.get('uCamWorld').value.copy(this.camera.matrixWorld);
    this.camera.getWorldPosition(u.get('uCamPos').value);
  }
}

// Floating dust motes. They're only really visible where light hits them: in the moon
// shafts (same depth map as the volumetrics), in front of the TV and near the lamps.
export function createDust(moonDepth, count = 1400) {
  const box = { min: new THREE.Vector3(0.6, 1.02, -2.6), max: new THREE.Vector3(6.2, 3.7, 1.9) };
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = THREE.MathUtils.lerp(box.min.x, box.max.x, Math.random());
    positions[i * 3 + 1] = THREE.MathUtils.lerp(box.min.y, box.max.y, Math.random());
    positions[i * 3 + 2] = THREE.MathUtils.lerp(box.min.z, box.max.z, Math.random());
    seeds[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(3.4, 2.3, -0.3), 6);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      tMoonDepth: { value: moonDepth.target.depthTexture },
      uMoonMatrix: { value: moonDepth.matrix },
      uMoonDir: { value: moonDepth.direction },
      uMoonColor: { value: new THREE.Color(0.6, 0.72, 1.0) },
      uTvPos: { value: new THREE.Vector3() },
      uTvNormal: { value: new THREE.Vector3(0, 0, 1) },
      uTvColor: { value: new THREE.Color() },
      uLamp1Pos: { value: new THREE.Vector3() },
      uLamp1Color: { value: new THREE.Color() },
      uLamp1Floor: { value: -1e4 },
      uLamp2Pos: { value: new THREE.Vector3() },
      uLamp2Color: { value: new THREE.Color() },
      uBoxMin: { value: box.min },
      uBoxMax: { value: box.max },
      uScale: { value: 1080 / (2 * Math.tan(THREE.MathUtils.degToRad(39.76 / 2))) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform sampler2D tMoonDepth;
      uniform mat4 uMoonMatrix;
      uniform vec3 uMoonDir;
      uniform vec3 uMoonColor;
      uniform vec3 uTvPos, uTvNormal, uTvColor;
      uniform vec3 uLamp1Pos, uLamp1Color, uLamp2Pos, uLamp2Color;
      uniform float uLamp1Floor;
      uniform vec3 uBoxMin, uBoxMax;
      uniform float uScale;
      attribute float seed;
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float s = seed * 6.2831;
        vec3 size = uBoxMax - uBoxMin;
        vec3 p = position + vec3(
          sin(uTime * 0.11 + s * 3.0) * 0.25 + sin(uTime * 0.37 + s * 7.0) * 0.05,
          -uTime * (0.004 + seed * 0.01) + sin(uTime * 0.23 + s * 5.0) * 0.08,
          cos(uTime * 0.09 + s * 2.0) * 0.25 + cos(uTime * 0.31 + s * 11.0) * 0.05);
        p = uBoxMin + mod(p - uBoxMin, size);

        vec4 c = uMoonMatrix * vec4(p, 1.0);
        vec3 sc = c.xyz / c.w * 0.5 + 0.5;
        float moon = 0.0;
        if (all(greaterThan(sc.xy, vec2(0.0))) && all(lessThan(sc.xy, vec2(1.0)))) {
          moon = step(sc.z - 0.002, texture2D(tMoonDepth, sc.xy).r);
        }

        vec3 tvd = p - uTvPos;
        float tvl = pow(max(dot(normalize(tvd), uTvNormal), 0.0), 2.0) / (dot(tvd, tvd) + 0.1);
        vec3 l1 = p - uLamp1Pos;
        vec3 l2 = p - uLamp2Pos;

        vColor = uMoonColor * moon * 1.4
               + uTvColor * tvl * 0.25
               + uLamp1Color * 0.04 / (dot(l1, l1) + 0.05) * step(uLamp1Floor, p.y)
               + uLamp2Color * 0.04 / (dot(l2, l2) + 0.05);

        // twinkle as the flecks tumble and catch the light
        vColor *= 0.4 + 0.6 * pow(0.5 + 0.5 * sin(uTime * (1.0 + seed * 3.0) + s * 20.0), 3.0);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float px = (0.004 + seed * 0.004) * uScale / -mv.z;
        // sub-pixel motes fade instead of popping
        vAlpha = clamp(px / 1.5, 0.0, 1.0);
        // and ones right in front of the lens would just be big out-of-focus smudges
        vAlpha *= smoothstep(0.5, 1.5, -mv.z);
        px = min(px, 6.0);
        gl_PointSize = max(px, 1.5);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.0, d);
        gl_FragColor = vec4(vColor * a * a * vAlpha, 1.0);
      }
    `,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return points;
}
