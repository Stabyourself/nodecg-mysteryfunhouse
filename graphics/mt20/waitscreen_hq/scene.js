import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { createCrtScreenMaterial } from './crtScreen.js';
import { createSkyMaterial, createCityMaterial, prepareCityGeometry, createRoofBeacons } from './outside.js';
import { MoonDepth, createDust, LAYER_NO_OCCLUDE } from './volumetrics.js';
import { createPost } from './post.js';
import { createCardSwap } from './cardSwap.js';

// High-quality version of the MT20 wait screen room
// (src/js/components/roomghostscene/scene.js).
// Same room.glb, same ghost, same TV, but relit for a late-night look: moonlight
// shafts through the window (shadow-mapped volumetrics), the TV as the key light
// with its colour sampled from the video, practical lamps with real shadows, lit city
// outside, dust in the air, AO and a filmic post chain.

const MODEL_URL = '/bundles/nodecg-mysteryfunhouse/dist/model/20/room.glb';
const STATIC_URL = '/bundles/nodecg-mysteryfunhouse/dist/model/20/tv_1.mov';
const SKATEBOARD_URL = '/bundles/nodecg-mysteryfunhouse/dist/model/20/skateboard.gltf';
const WIDTH = 1920;
const HEIGHT = 1080;

// Minimum time the static stays up on a channel change, even if the next video is
// ready sooner, so it reads as a deliberate channel flip.
const MIN_STATIC_MS = 1400;

// The switch-in sequence when a new clip comes on (static -> picture), as a function of
// seconds since it started:
//   collapse: the static squashes into a bright horizontal line
//   hold:     the line lingers and flickers while the new channel comes in behind it
//   expand:   the line opens up into the new picture, overshooting a touch
//   roll:     the picture rolls vertically (with the black blanking bar between frames),
//             sheared and torn by lost horizontal hold, colours split, noise bands
//   lock:     it catches sync with a little bounce and a brightness flash
const SWITCH_DURATION = 1.25;
function switchState(t) {
  const idle = { scaleY: 1, roll: 0, glitch: 0, flash: 0, newChannel: true };
  if (!(t < SWITCH_DURATION)) return idle;
  const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
  const easeIn = (x) => x * x * x;
  const easeOut = (x) => 1 - (1 - x) ** 3;
  const backOut = (x) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2; // overshoots ~4%

  const COLLAPSE = 0.1, HOLD = 0.14, EXPAND = 0.16, LOCK_AT = 0.95;
  const tHold = COLLAPSE, tExpand = COLLAPSE + HOLD, tRoll = tExpand + EXPAND * 0.4;

  let scaleY;
  if (t < tHold) scaleY = 1 - 0.995 * easeIn(t / COLLAPSE);
  else if (t < tExpand) scaleY = 0.005 * (1 + 0.6 * Math.sin(t * 90)); // flickering line
  else scaleY = Math.max(0.005, backOut(clamp01((t - tExpand) / EXPAND)));

  // roll: fast at first, decelerating onto the frame, then a damped bounce at lock
  let roll = 0;
  if (t >= tRoll && t < LOCK_AT) roll = 1.4 * (1 - easeOut((t - tRoll) / (LOCK_AT - tRoll)));
  else if (t >= LOCK_AT) roll = -0.035 * Math.exp(-(t - LOCK_AT) * 14) * Math.sin((t - LOCK_AT) * 40);

  const glitch = t < tExpand ? 0 : clamp01(1 - (t - tExpand) / (LOCK_AT + 0.1 - tExpand)) ** 0.7;
  const flash = t < LOCK_AT ? 0 : 0.35 * Math.exp(-(t - LOCK_AT) * 9);
  return { scaleY, roll, glitch, flash, newChannel: t >= tExpand - 0.06 };
}

// direction the moonlight travels (from outside the window, down into the room)
const MOON_DIR = new THREE.Vector3(-0.83, -0.47, 0.3).normalize();

// Most materials came out of the exporter at roughness 0.5 (semi-gloss), which makes
// painted walls, paper and fabric pick up shiny lamp hot spots. Plastics, metals and
// the toys keep their authored gloss.
const MATTE = {
  'WALLS': 0.9,
  'CEILING': 0.92,
  'PAPER': 0.85,
  'POSTER ITALIAN': 0.8,
  'POSTER SPLASH': 0.8,
  'POSTER LAWN': 0.8,
  'POSTER HANABI': 0.8,
  'POSTER BOX': 0.8,
  'POSTER CAROL': 0.8,
  'POSTER DEATH': 0.8,
  'POSTER FFAO': 0.8,
  'POSTER ARROWS': 0.8,
  'CardInfo1': 0.85,
  'CardInfo2': 0.85,
  'cork': 0.95,
  'FABRIC': 0.85,
  'FABRIC DESK': 0.85,
  'FABRIC MAT': 0.95,
  'FABRIC MAT2.001': 0.95,
  'FABRIC WHITE': 0.85,
  'MOLE FABRIC': 0.85,
  'MOLE FABRIC SKIN': 0.8,
  'hook rope': 0.95,
  'POT CLAY': 0.85,
  'books': 0.6,
  'FAN FLAP': 0.7,
};

// colour of a CRT showing nothing much in particular
const TV_NEUTRAL = new THREE.Color(0.72, 0.8, 1.0);

function getNamed(root, name) {
  const obj = root.getObjectByName(name);
  if (!obj) {
    console.warn(`[RoomBackgroundHq] room.glb is missing expected object "${name}"`);
  }
  return obj;
}

function worldBox(obj) {
  obj.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(obj);
}

function findMeshWithMaterial(root, materialName) {
  let found = null;
  root.traverse((c) => {
    if (!found && c.isMesh && c.material && c.material.name === materialName) found = c;
  });
  return found;
}

// Layout change vs. room.glb: the torchiere sits snugly and symmetrically in its
// corner, the same distance (centre to wall) from the window wall and the TV wall.
// It's a direct child of the scene root, so its position is a world position.
const LAMP_WALL_DISTANCE = 0.35;

// The shadow-casting "light bouncing off the ceiling above the corner lamp" that lights
// the wall shelf and gives it its soft downward shadows. (A second, direct light at
// lamp height was tried with it, and on its own, and dropped: it didn't look good.)
const SHELF_CEILING_LIGHT = true;

function rearrangeRoom(room) {
  const lamp = getNamed(room, 'TALL_LAMP');
  if (!lamp) return;
  room.updateMatrixWorld(true);

  const walls = [];
  room.traverse((o) => {
    if (o.isMesh && o.material && o.material.name === 'WALLS') walls.push(o);
  });
  // find both walls of the corner from the lamp's authored spot, at mid height
  const from = new THREE.Vector3(lamp.position.x, lamp.position.y + 1.2, lamp.position.z);
  const wallAt = (dir) => new THREE.Raycaster(from, dir).intersectObjects(walls, false)[0];
  const windowWall = wallAt(new THREE.Vector3(1, 0, 0));
  const tvWall = wallAt(new THREE.Vector3(0, 0, -1));
  if (!windowWall || !tvWall) return;

  lamp.position.x = windowWall.point.x - LAMP_WALL_DISTANCE;
  lamp.position.z = tvWall.point.z + LAMP_WALL_DISTANCE;
  room.updateMatrixWorld(true);
}

// Stands the skateboard in the corner between the TV wall and the left side of the TV
// table: on its tail, leaning back against the wall, turned toward the table so its
// right edge rests against the table's side. The deck art faces the room, and from the
// camera (off to the left) the wheels show past its left edge.
// The model's axes: +Y is the deck's top, -Z the nose, wheels below the deck.
const SKATEBOARD_YAW = THREE.MathUtils.degToRad(28); // how far it's turned toward the table
const SKATEBOARD_LEAN = THREE.MathUtils.degToRad(12); // how far it leans back from upright

function placeSkateboard(room, board) {
  const table = getNamed(room, 'TV_TABLE');
  if (!table) return false;
  room.updateMatrixWorld(true);

  const up = new THREE.Vector3(0, 1, 0);
  const meshes = [];
  const walls = [];
  room.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh) return;
    meshes.push(o);
    if (o.material && o.material.name === 'WALLS') walls.push(o);
  });
  const hitNormal = (hit) => hit.face.normal.clone().transformDirection(hit.object.matrixWorld);

  // the wall behind the table, just left of it
  const box = worldBox(table);
  const wallHit = new THREE.Raycaster(
    new THREE.Vector3(box.min.x - 0.15, box.min.y + 0.4, box.max.z),
    new THREE.Vector3(0, 0, -1),
  ).intersectObjects(walls, false)[0];
  if (!wallHit) return false;
  const wallNormal = hitNormal(wallHit).setY(0).normalize(); // into the room
  if (wallNormal.z < 0) wallNormal.negate();

  // the table's left side, a little out from the wall
  const sideHit = new THREE.Raycaster(
    wallHit.point.clone().addScaledVector(wallNormal, 0.3).add(new THREE.Vector3(-0.4, 0, 0)),
    new THREE.Vector3(1, 0, 0),
  ).intersectObject(table, true)[0];
  if (!sideHit) return false;
  const sideNormal = hitNormal(sideHit).setY(0).normalize(); // away from the table
  if (sideNormal.x > 0) sideNormal.negate();

  const floorHit = new THREE.Raycaster(
    wallHit.point.clone().addScaledVector(wallNormal, 0.3).addScaledVector(sideNormal, 0.2),
    new THREE.Vector3(0, -1, 0),
  ).intersectObjects(meshes, false)[0];
  const floorY = floorHit ? floorHit.point.y : box.min.y;

  // orientation: deck facing the room, turned toward the table, leaning back
  const facing = wallNormal.clone().multiplyScalar(Math.cos(SKATEBOARD_YAW)).addScaledVector(sideNormal, -Math.sin(SKATEBOARD_YAW));
  const toNose = up.clone().multiplyScalar(Math.cos(SKATEBOARD_LEAN)).addScaledVector(facing, -Math.sin(SKATEBOARD_LEAN));
  const deckTop = up.clone().multiplyScalar(Math.sin(SKATEBOARD_LEAN)).addScaledVector(facing, Math.cos(SKATEBOARD_LEAN));
  const toTail = toNose.clone().negate();
  const right = new THREE.Vector3().crossVectors(deckTop, toTail);
  board.position.set(0, 0, 0);
  board.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, deckTop, toTail));
  board.updateMatrixWorld(true);

  // position: slide it until it just touches the floor, the wall and the table's side
  let minFloor = Infinity;
  let minWall = Infinity;
  let minSide = Infinity;
  const v = new THREE.Vector3();
  board.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      minFloor = Math.min(minFloor, v.y);
      minWall = Math.min(minWall, v.clone().sub(wallHit.point).dot(wallNormal));
      minSide = Math.min(minSide, v.clone().sub(sideHit.point).dot(sideNormal));
    }
  });
  board.position
    .addScaledVector(up, floorY - minFloor)
    .addScaledVector(wallNormal, 0.003 - minWall)
    .addScaledVector(sideNormal, 0.004 - minSide);
  board.updateMatrixWorld(true);
  return true;
}

// The TV screen's four corners in world space, in order around it: the two widest
// axes of its local bounding box, at the middle of the thin (depth) axis.
function screenCorners(mesh) {
  mesh.geometry.computeBoundingBox();
  const { min, max } = mesh.geometry.boundingBox;
  const size = max.clone().sub(min);
  const axes = ['x', 'y', 'z'].sort((p, q) => size[q] - size[p]);
  const [a, b, thin] = axes;
  mesh.updateWorldMatrix(true, false);
  return [[0, 0], [1, 0], [1, 1], [0, 1]].map(([i, j]) => {
    const v = new THREE.Vector3();
    v[a] = i ? max[a] : min[a];
    v[b] = j ? max[b] : min[b];
    v[thin] = (min[thin] + max[thin]) / 2;
    return v.applyMatrix4(mesh.matrixWorld);
  });
}

function makeVideo(src, loop) {
  const v = document.createElement('video');
  v.muted = true;
  v.loop = loop;
  v.playsInline = true;
  v.preload = 'auto';
  if (src) v.src = src;
  // The element has to be in the page and actually drawn for the browser to present
  // its frames in step with the display. Detached (or display:none) it advances on a
  // sloppier background schedule: a 60fps clip measured ~48 frames/s presented. So it
  // sits in the corner, a few pixels big and all but transparent.
  v.style.cssText = 'position:fixed;left:0;top:0;width:8px;height:6px;opacity:0.01;pointer-events:none;z-index:1;';
  document.body.appendChild(v);
  return v;
}

function videoTexture(video) {
  const t = new THREE.VideoTexture(video);
  // three.js refreshes video textures from requestVideoFrameCallback, so a frame only
  // reaches the GPU on the render after the browser announces it. With 60fps clips on a
  // 60Hz output that drifts in and out of step, repeating and skipping frames (constant
  // judder). Turn that off; the render loop uploads the current frame every frame
  // instead (see refreshVideoTextures).
  if (t._requestVideoFrameCallbackId && 'cancelVideoFrameCallback' in video) {
    video.cancelVideoFrameCallback(t._requestVideoFrameCallbackId);
    t._requestVideoFrameCallbackId = 0;
  }
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

// Adds a fresnel rim glow to the ghost so it reads as slightly spectral against the
// dark room.
function addGhostRim(material, rimColor) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: rimColor };
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform vec3 uRimColor;\nvoid main() {')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float rimF = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
        totalEmissiveRadiance += uRimColor * pow(rimF, 2.5);`,
      );
  };
  material.needsUpdate = true;
}

export function createRoomScene(container, options = {}) {
  // cardCanvases: up to two canvases drawn onto the corkboard cards (call cardsUpdated()
  // after redrawing them)
  const { initialState = 'ghost', quality = 'high', onVideoEnded = null, cardCanvases = null } = options;
  const cardTextures = [];
  const high = quality !== 'low';

  let disposed = false;
  let rafId = 0;
  let cameraAt = initialState && initialState !== 'ghost' ? 'corkboard' : 'idle';
  const onReady = [];

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({
    powerPreference: 'high-performance',
    antialias: false, // MSAA happens in the composer
    stencil: false,
  });
  renderer.setPixelRatio(1);
  renderer.setSize(WIDTH, HEIGHT);
  renderer.toneMapping = THREE.NoToneMapping; // done in post
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Checking every shader for errors forces each compile to finish synchronously, which
  // defeats parallel compiling and lengthens the startup freeze. ?debug turns it back on.
  renderer.debug.checkShaderErrors = new URLSearchParams(location.search).has('debug');
  container.appendChild(renderer.domElement);
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.environmentIntensity = 0.45;

  // ---------- TV video (game footage + static for channel changes) ----------
  const gameVideo = makeVideo(null, false);
  const staticVideo = makeVideo(STATIC_URL, true);
  staticVideo.play().catch(() => {});
  const gameTex = videoTexture(gameVideo);
  const staticTex = videoTexture(staticVideo);
  const crt = createCrtScreenMaterial(gameTex, staticTex);

  // 'static' -> (new clip playing, minimum static time passed) -> 'switching' -> 'playing'
  const channel = {
    state: 'static',
    staticValue: 1,
    switchStart: 0,
    switchT: 0,
    ready: false,
  };

  // every render shows the newest frame of whichever clips are running
  function refreshVideoTextures() {
    if (!gameVideo.paused && gameVideo.readyState >= gameVideo.HAVE_CURRENT_DATA) gameTex.needsUpdate = true;
    if (!staticVideo.paused && staticVideo.readyState >= staticVideo.HAVE_CURRENT_DATA) staticTex.needsUpdate = true;
  }
  // a clip that isn't running still has to show the frame it is on: the first one once
  // it has loaded, and the one landed on when scrubbing while paused
  for (const [video, tex] of [[gameVideo, gameTex], [staticVideo, staticTex]]) {
    for (const ev of ['loadeddata', 'seeked']) video.addEventListener(ev, () => { tex.needsUpdate = true; });
  }

  gameVideo.addEventListener('playing', () => { channel.ready = true; });
  gameVideo.addEventListener('ended', () => {
    if (onVideoEnded) onVideoEnded();
  });

  function playVideo(url) {
    // hard cut to static - the effect is saved for the new channel coming in
    channel.state = 'static';
    channel.staticValue = 1;
    channel.switchStart = performance.now();
    channel.ready = false;
    staticVideo.play().catch(() => {});
    gameVideo.src = url;
    gameVideo.load();
    gameVideo.play().catch((e) => console.warn('[RoomBackgroundHq] video play failed', e));
  }

  // The TV light takes its colour from the picture's average colour. The picture is
  // drawn into a tiny render target on the GPU and read back asynchronously: copying
  // the video into a 2D canvas and reading that (the obvious way) is a synchronous
  // GPU->CPU readback of the video frame, which stalls the video pipeline every time
  // and makes the clip visibly hitch.
  const GLOW_SIZE = 32;
  const glowTarget = new THREE.WebGLRenderTarget(GLOW_SIZE, GLOW_SIZE, { depthBuffer: false });
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: { map: { value: staticTex } },
    depthTest: false,
    depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    // written back out as sRGB so the 8-bit average keeps precision in the darks
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main() { gl_FragColor = vec4(pow(texture2D(map, vUv).rgb, vec3(1.0 / 2.2)), 1.0); }',
  });
  const glowScene = new THREE.Scene();
  glowScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), glowMaterial));
  const glowCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const glowPixels = new Uint8Array(GLOW_SIZE * GLOW_SIZE * 4);
  let glowReadPending = false;
  let glowReadBroken = false; // gave up after an error (the light just stays neutral)

  const tvSampleColor = new THREE.Color(0.6, 0.65, 0.8);
  const tvColor = new THREE.Color(0.6, 0.65, 0.8);
  let tvLum = 0.4;
  let tvLumSmoothed = 0.4;
  let lastSample = 0;

  function applyTvSample(data) {
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const n = (data.length / 4) * 255;
    tvSampleColor.setRGB(r / n, g / n, b / n, THREE.SRGBColorSpace);
    tvLum = 0.2126 * tvSampleColor.r + 0.7152 * tvSampleColor.g + 0.0722 * tvSampleColor.b;
    // normalise to a chroma (brightness is carried separately by tvLum), pushed well
    // past the picture's own saturation so the room clearly takes on its colour -
    // only near-black frames fall back to the tube's neutral blue-white, since their
    // hue is just noise
    const hsl = {};
    tvSampleColor.getHSL(hsl);
    // How coloured the average is for its brightness. Not HSL's own saturation: that
    // shoots up towards white, so a nearly white picture with a few coloured details
    // lit the room in the colour of those details at almost full strength.
    const max = Math.max(tvSampleColor.r, tvSampleColor.g, tvSampleColor.b);
    const min = Math.min(tvSampleColor.r, tvSampleColor.g, tvSampleColor.b);
    const sat = max > 0 ? (max - min) / (max + min) : 0;
    tvSampleColor.setHSL(hsl.h, Math.min(1, sat * 2.2), 0.5);
    tvSampleColor.lerp(TV_NEUTRAL, 0.08 + 0.92 * (1 - THREE.MathUtils.smoothstep(tvLum, 0.02, 0.1)));
  }

  function sampleTv(now, dt) {
    const showingStatic = channel.staticValue > 0.5;
    const src = showingStatic ? staticVideo : gameVideo;
    if (!glowReadPending && !glowReadBroken && now - lastSample > 80 && src.readyState >= src.HAVE_CURRENT_DATA) {
      lastSample = now;
      glowMaterial.uniforms.map.value = showingStatic ? staticTex : gameTex;
      const prevTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(glowTarget);
      renderer.render(glowScene, glowCamera);
      renderer.setRenderTarget(prevTarget);
      glowReadPending = true;
      renderer.readRenderTargetPixelsAsync(glowTarget, 0, 0, GLOW_SIZE, GLOW_SIZE, glowPixels)
        .then(() => applyTvSample(glowPixels))
        .catch((e) => {
          glowReadBroken = true;
          console.warn('[RoomBackgroundHq] cannot sample TV colour, TV light stays neutral', e);
        })
        .finally(() => { glowReadPending = false; });
    }
    const k = 1 - Math.exp(-8 * dt);
    tvColor.lerp(tvSampleColor, k);
    tvLumSmoothed += (tvLum - tvLumSmoothed) * (1 - Math.exp(-6 * dt));
  }

  // ---------- lights that don't depend on the model ----------
  const hemi = new THREE.HemisphereLight(0x223066, 0x1a0d0a, 0.35);
  scene.add(hemi);

  const moon = new THREE.DirectionalLight(0x8ea6ff, 3);
  const moonTarget = new THREE.Object3D();
  moonTarget.position.set(3.5, 1.8, -0.5);
  moon.position.copy(moonTarget.position).addScaledVector(MOON_DIR, -12);
  moon.target = moonTarget;
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  Object.assign(moon.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 30 });
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.02;
  moon.shadow.radius = 2;
  moon.shadow.autoUpdate = false;
  scene.add(moon, moonTarget);

  const moonDepth = new MoonDepth(MOON_DIR, new THREE.Vector3(4.2, 2.2, -0.5), 4.5, high ? 1024 : 512);

  // ---------- camera (replaced by the glb camera once loaded) ----------
  let camera = new THREE.PerspectiveCamera(39.76, WIDTH / HEIGHT, 0.05, 60);
  camera.layers.enable(LAYER_NO_OCCLUDE);
  const camBase = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };

  let post = null;
  let fan = null;
  let mixer = null;
  let dust = null;
  let beacons = null;
  let sky = null;
  let city = null;
  let tvRect = null;
  let tvSpot = null;
  let screenMesh = null;
  let cardSwap = null;
  let deskLampFloor = -Infinity; // the desktop the lamp stands on: its light stops there
  let deskLamp = null;
  let tallLamp = null;
  const lampShadows = [];
  const shelfSpills = [];
  let ghostHeadBone = null;
  let ghostRimLight = null;
  let beziers = null;
  let cameraMove = null;
  const tvPos = new THREE.Vector3();
  const tvNormal = new THREE.Vector3(0, 0, 1);
  const deskLampColor = new THREE.Color(0xffa860);
  const tallLampColor = new THREE.Color(0xffb870);

  // The skateboard loads with the room (not after it) so it is there for the one-off
  // shadow maps and the reflection capture; the room still comes up without it.
  const loader = new GLTFLoader();
  Promise.all([
    loader.loadAsync(MODEL_URL),
    loader.loadAsync(SKATEBOARD_URL).catch((e) => {
      console.warn('[RoomBackgroundHq] skateboard.gltf not loaded, leaving it out', e);
      return null;
    }),
  ]).then(([glb, skateboard]) => {
    if (disposed) return;
    const room = glb.scene;
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    rearrangeRoom(room);

    room.traverse((c) => {
      if (!c.isMesh) return;
      c.castShadow = true;
      c.receiveShadow = true;
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      for (const m of mats) {
        if (!m) continue;
        // transmission forces an extra full-scene render; the glass is handled below
        if (m.transmission > 0) m.transmission = 0;
        // several materials (all the brown wood) come with sheen roughness 0, which
        // blows up into bright dotted lines along every silhouette edge
        if (m.sheen > 0) m.sheenRoughness = Math.max(m.sheenRoughness, 0.4);
        if (MATTE[m.name] !== undefined) m.roughness = MATTE[m.name];
        for (const key of ['map', 'emissiveMap', 'normalMap', 'roughnessMap']) {
          if (m[key]) m[key].anisotropy = maxAniso;
        }
      }
    });

    // ghost: same sitting pose as the original, body hidden
    const sitting = glb.animations.find((a) => a.name.toLowerCase().includes('sitting'));
    if (sitting) {
      mixer = new THREE.AnimationMixer(room);
      mixer.clipAction(sitting).play();
    }
    const ghostBody = getNamed(room, 'GHOST_BODY');
    if (ghostBody) ghostBody.visible = false;
    const ghostRim = new THREE.Color(0.25, 0.55, 1.0).multiplyScalar(0.35);
    const ghostMats = new Set();
    room.traverse((c) => {
      if (c.isMesh && c.material && c.material.name === 'GHOSTY') ghostMats.add(c.material);
    });
    ghostMats.forEach((m) => addGhostRim(m, ghostRim));

    // "VOID" is the glowing white used for the ghost's eyes and every console/radio
    // LED; at its authored strength the LEDs bloom into huge blobs, so keep those
    // subtle and give the eyes their own brighter copy.
    const voidMesh = findMeshWithMaterial(room, 'VOID');
    if (voidMesh) {
      voidMesh.material.emissiveIntensity = 1.2;
      const ghostHead = room.getObjectByName('GHOST_HEAD');
      ghostHead?.traverse((c) => {
        if (c.isMesh && c.material && c.material.name === 'VOID') {
          c.material = c.material.clone();
          c.material.emissive.setRGB(0.85, 0.95, 1.0);
          c.material.emissiveIntensity = 3.0;
        }
      });
    }

    // cool back light so the ghost's silhouette separates from the dark sofa; it
    // follows the head bone since the sitting animation moves the whole rig
    ghostHeadBone = room.getObjectByName('head');
    ghostRimLight = new THREE.SpotLight(0x9fb8ff, 10, 0, 0.32, 1, 2);
    ghostRimLight.position.set(4.6, 3.0, 0.9);
    scene.add(ghostRimLight, ghostRimLight.target);

    fan = room.getObjectByName('Ceiling_fan_flaps');

    // ---------- outside ----------
    const skyMesh = getNamed(room, 'SKY');
    if (skyMesh) {
      sky = createSkyMaterial();
      sky.uniforms.uMoonDir.value.copy(MOON_DIR).negate();
      skyMesh.material = sky;
      skyMesh.castShadow = false;
      skyMesh.receiveShadow = false;
      skyMesh.layers.set(LAYER_NO_OCCLUDE);
    }
    const cityMesh = getNamed(room, 'CITY');
    if (cityMesh) {
      city = createCityMaterial();
      prepareCityGeometry(cityMesh);
      cityMesh.material = city;
      cityMesh.castShadow = false;
      cityMesh.receiveShadow = false;
      cityMesh.layers.set(LAYER_NO_OCCLUDE);
      beacons = createRoofBeacons(cityMesh);
      beacons.layers.set(LAYER_NO_OCCLUDE);
      scene.add(beacons);
    }

    // Window glass: an unlit, barely-there cool tint, instead of the model's (expensive)
    // transmission material. Unlit on purpose - as real reflective glass it mirrored the
    // room's lamps and TV as highlights and laid a milky veil over the night sky.
    const glass = new THREE.MeshBasicMaterial({
      color: 0x6f86c8,
      transparent: true,
      opacity: 0.03,
      depthWrite: false,
    });
    // the panes are also the only way moonlight gets in: the light shafts are only
    // looked for in the air behind them
    const moonOpening = new THREE.Box3();
    room.traverse((c) => {
      if (c.isMesh && c.material && c.material.name === 'GLASS') {
        c.material = glass;
        c.castShadow = false;
        c.layers.set(LAYER_NO_OCCLUDE);
        moonOpening.expandByObject(c);
      }
    });

    // ---------- practical lamps ----------
    const shadeMat = findMeshWithMaterial(room, 'LAMP SHADE')?.material;
    if (shadeMat) {
      shadeMat.emissiveIntensity = 3.5;
      shadeMat.side = THREE.DoubleSide;
    }
    // fan light glass: faintly lit so the ceiling fixture isn't a dead shape
    const fanLight = findMeshWithMaterial(room, 'FAN LIGHT');
    if (fanLight) {
      fanLight.material.emissive = new THREE.Color(0xffd9a0);
      fanLight.material.emissiveIntensity = 0.04;
    }

    const lamp = getNamed(room, 'LAMP');
    if (lamp) {
      const shade = lamp.children.find((c) => c.material && c.material.name === 'LAMP SHADE') || lamp;
      const b = worldBox(shade);
      const p = b.getCenter(new THREE.Vector3());
      p.y = b.min.y + (b.max.y - b.min.y) * 0.45;
      // Point-light shadows cost 6 scene renders each; both lamps are shaded so their
      // light is directional anyway: a shadowed spot through the shade opening, plus
      // an unshadowed point for the soft glow through the shade.
      deskLamp = new THREE.SpotLight(deskLampColor, 3.5, 0, 1.15, 0.7, 2);
      deskLamp.position.copy(p);
      deskLamp.target.position.copy(p).add(new THREE.Vector3(-0.15, -1, 0));
      deskLamp.castShadow = true;
      deskLamp.shadow.mapSize.set(1024, 1024);
      deskLamp.shadow.bias = -0.001;
      deskLamp.shadow.normalBias = 0.02;
      deskLamp.shadow.radius = 5;
      deskLamp.shadow.camera.near = 0.03;
      deskLamp.shadow.autoUpdate = false;
      // Soft glow through the shade, unshadowed - so it only shines into the half-space
      // above the lamp (a spot opened up to a hemisphere). As a point light it lit the
      // books under the desk straight through the desktop.
      const deskGlow = new THREE.SpotLight(deskLampColor, 0.5, 0, Math.PI / 2 * 0.98, 0.5, 2);
      deskGlow.position.copy(p);
      deskGlow.target.position.copy(p).add(new THREE.Vector3(0, 1, 0));
      scene.add(deskLamp, deskLamp.target, deskGlow, deskGlow.target);
      const desk = room.getObjectByName('DESK');
      deskLampFloor = desk ? worldBox(desk).max.y : -Infinity;
      lampShadows.push(deskLamp);
    }

    const tall = getNamed(room, 'TALL_LAMP');
    if (tall) {
      // the lamp shouldn't shadow itself or throw its own pole/shade onto the walls
      tall.traverse((c) => { if (c.isMesh) c.castShadow = false; });
      const shade = tall.children.find((c) => c.material && c.material.name === 'LAMP SHADE') || tall;
      const b = worldBox(shade);
      const p = b.getCenter(new THREE.Vector3());
      p.y = b.max.y - 0.08;
      // torchiere: throws its light up at the ceiling
      tallLamp = new THREE.SpotLight(tallLampColor, 6, 0, 1.3, 0.5, 2);
      tallLamp.position.copy(p);
      tallLamp.target.position.copy(p).add(new THREE.Vector3(0, 1, 0));
      tallLamp.castShadow = true;
      tallLamp.shadow.mapSize.set(high ? 1024 : 512, high ? 1024 : 512);
      tallLamp.shadow.bias = -0.001;
      tallLamp.shadow.normalBias = 0.02;
      tallLamp.shadow.radius = 5;
      tallLamp.shadow.camera.near = 0.03;
      // rendered once, without the fan (see step): nothing else it sees moves
      tallLamp.shadow.autoUpdate = false;
      lampShadows.push(tallLamp);
      scene.add(tallLamp, tallLamp.target);

      // No GI, so fake the warm light bouncing back down off the ceiling hot spot.
      const bounce = new THREE.PointLight(tallLampColor, 0.35, 0, 2);
      bounce.position.set(p.x - 0.8, 3.4, p.z + 0.55);
      scene.add(bounce);

      // Warm light from the lamp's glowing top onto the wall shelf next to it, so the
      // shelf and its toys cast soft shadows down onto the wall. It floats above the
      // shade and a bit out into the room: level with the toys and flat against the
      // wall, the shadows smear upward into long streaks. It only sees static things,
      // so its shadow is rendered once and kept (see lampShadows), and a shadowed point light
      // would have seen the ceiling fan.
      //
      // Don't add more shadow-casting lights: every shadow map takes a texture slot in
      // every lit material's shader, and the textured sheen materials here are already
      // near the common 16-slot limit - past it, all standard materials stop drawing.
      const shelf = room.getObjectByName('SHELF');
      if (shelf) {
        const aim = worldBox(shelf).getCenter(new THREE.Vector3());
        if (SHELF_CEILING_LIGHT) {
          const spill = new THREE.SpotLight(tallLampColor, 4, 0, 0.95, 0.8, 2);
          spill.position.copy(p).add(new THREE.Vector3(-0.25, 0.52, 0.79));
          spill.target.position.copy(aim);
          spill.castShadow = true;
          spill.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
          spill.shadow.bias = -0.0005;
          spill.shadow.normalBias = 0.02;
          spill.shadow.radius = 7;
          spill.shadow.camera.near = 0.05;
          spill.shadow.autoUpdate = false;
          scene.add(spill, spill.target);
          lampShadows.push(spill);
          shelfSpills.push(spill);
        }
      }
    }

    // ---------- TV ----------
    const tv = getNamed(room, 'TELEVISION');
    const screen = tv && tv.children[0];
    if (screen) {
      screen.material = crt;
      screenMesh = screen;
      screen.castShadow = false;
      const sb = worldBox(screen);
      sb.getCenter(tvPos);
      // screen normal: TV's local "front" (-Z in the model) in world space
      const q = tv.getWorldQuaternion(new THREE.Quaternion());
      tvNormal.set(0, 0, -1).applyQuaternion(q).normalize();
      // make sure it points into the room (toward the sofa)
      if (tvNormal.dot(new THREE.Vector3(2.5, 1.5, 1.4).sub(tvPos)) < 0) tvNormal.negate();

      const size = sb.getSize(new THREE.Vector3());
      tvRect = new THREE.RectAreaLight(0xffffff, 6, Math.max(size.x, size.z) * 0.95, size.y * 0.95);
      tvRect.position.copy(tvPos).addScaledVector(tvNormal, 0.02);
      tvRect.lookAt(tvPos.clone().addScaledVector(tvNormal, 2));
      scene.add(tvRect);

      tvSpot = new THREE.SpotLight(0xffffff, 8, 0, 1.25, 1, 2);
      tvSpot.position.copy(tvPos).addScaledVector(tvNormal, 0.05);
      tvSpot.target.position.copy(tvPos).addScaledVector(tvNormal, 3);
      tvSpot.castShadow = true;
      tvSpot.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
      tvSpot.shadow.bias = -0.0008;
      tvSpot.shadow.normalBias = 0.02;
      // Small on purpose. This shadow map covers a ~140 degree cone, so a texel is about
      // 5mm out at the coffee table, and the soft-shadow filter only takes 5 samples: a
      // big radius doesn't blur, it scatters them into a speckled, dithered patch.
      tvSpot.shadow.radius = 2;
      tvSpot.shadow.camera.near = 0.1;
      tvSpot.shadow.autoUpdate = false;
      scene.add(tvSpot, tvSpot.target);
    }

    // Player cards on the corkboard: each card mesh shows a canvas the page draws the
    // card on (see playerCard.js). Lit like everything else, so they sit in the room's
    // light, with a little self-illumination so they stay readable in the dim corner.
    // Without canvases the placeholder art baked into room.glb stays.
    ['CARD1', 'CARD2'].forEach((name, i) => {
      const card = room.getObjectByName(name);
      if (!card) return;
      card.castShadow = false;
      const canvas = cardCanvases && cardCanvases[i];
      if (!canvas) return;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = maxAniso;
      cardTextures[i] = texture;
      card.material = new THREE.MeshStandardMaterial({
        map: texture,
        emissiveMap: texture,
        emissive: 0xffffff,
        emissiveIntensity: 0.12,
        roughness: 0.85,
        metalness: 0,
        transparent: true,
      });
    });
    // flat things stuck to walls/floor can't shadow anything, skip their shadow draws
    room.traverse((c) => {
      if (c.isMesh && /^(POSTER|MAIN_MAT|SIDE_MAT|MOUSEPAD|Pin)/.test(c.name)) c.castShadow = false;
    });

    scene.add(room);

    if (skateboard) {
      const board = skateboard.scene;
      board.traverse((c) => {
        if (!c.isMesh) return;
        c.castShadow = true;
        c.receiveShadow = true;
        const map = c.material.map;
        if (map && map.minFilter !== THREE.LinearMipmapLinearFilter) {
          // The file asks for nearest-pixel sampling with no mipmaps. The deck art is
          // fine black-and-white line work drawn only a few dozen pixels wide here, so
          // that skips most of its texels and the lines break up into aliasing.
          map.minFilter = THREE.LinearMipmapLinearFilter;
          map.magFilter = THREE.LinearFilter;
          map.generateMipmaps = true;
          map.anisotropy = maxAniso;
          map.needsUpdate = true;
        }
      });
      if (placeSkateboard(room, board)) scene.add(board);
    }

    // ---------- camera ----------
    const glbCam = glb.cameras[0];
    if (glbCam) {
      camera = glbCam;
      camera.near = 0.05;
      camera.far = 60;
      camera.aspect = WIDTH / HEIGHT;
      camera.updateProjectionMatrix();
      camera.layers.enable(LAYER_NO_OCCLUDE);
    }

    const cameraStart = getNamed(room, 'CAMERA_START');
    const cameraStartHandle = getNamed(room, 'CAMERA_START_HANDLE');
    const cameraEnd = getNamed(room, 'CAMERA_END');
    const cameraEndHandle = getNamed(room, 'CAMERA_END_HANDLE');
    camBase.position.copy(camera.position);
    camBase.quaternion.copy(camera.quaternion);
    if (cameraStart && cameraStartHandle && cameraEnd && cameraEndHandle) {
      const qStart = cameraStart.quaternion.clone();
      const qEnd = cameraEnd.quaternion.clone();
      beziers = {
        idleToCards: {
          curve: new THREE.CubicBezierCurve3(cameraStart.position, cameraStartHandle.position, cameraEndHandle.position, cameraEnd.position),
          from: qStart, to: qEnd,
        },
        cardsToIdle: {
          curve: new THREE.CubicBezierCurve3(cameraEnd.position, cameraEndHandle.position, cameraStartHandle.position, cameraStart.position),
          from: qEnd, to: qStart,
        },
      };
      for (const o of [cameraStart, cameraStartHandle, cameraEnd, cameraEndHandle]) o.visible = false;
      if (cameraAt === 'corkboard') {
        camBase.position.copy(cameraEnd.position);
        camBase.quaternion.copy(qEnd);
      }

      // card swap animation, laid out for the corkboard camera's view
      const cardMeshes = ['CARD1', 'CARD2'].map((n) => room.getObjectByName(n)).filter(Boolean);
      if (cardMeshes.length === 2) {
        room.updateMatrixWorld(true);
        const endQuat = cameraEnd.getWorldQuaternion(new THREE.Quaternion());
        const endPos = cameraEnd.getWorldPosition(new THREE.Vector3());
        const card = cardMeshes[0];
        const normal = new THREE.Vector3().fromBufferAttribute(card.geometry.attributes.normal, 0)
          .transformDirection(card.matrixWorld);
        // facing the camera
        if (normal.dot(endPos.clone().sub(card.getWorldPosition(new THREE.Vector3()))) < 0) normal.negate();
        cardSwap = createCardSwap({
          cards: cardMeshes,
          viewRight: new THREE.Vector3(1, 0, 0).applyQuaternion(endQuat),
          viewUp: new THREE.Vector3(0, 1, 0).applyQuaternion(endQuat),
          normal,
        });
      }
    }

    // ---------- air ----------
    dust = createDust(moonDepth, high ? 1600 : 700);
    dust.layers.set(LAYER_NO_OCCLUDE);
    scene.add(dust);

    post = createPost(renderer, scene, camera, moonDepth, { width: WIDTH, height: HEIGHT, quality });
    if (screenMesh) post.toneMapping.screenCorners = screenCorners(screenMesh);
    if (!moonOpening.isEmpty()) post.volumetric.setBeamOpening(moonOpening.expandByScalar(0.05));
    const vu = post.volumetric.uniforms;
    vu.get('uTvPos').value.copy(tvPos).addScaledVector(tvNormal, 0.08);
    vu.get('uTvNormal').value.copy(tvNormal);
    if (deskLamp) vu.get('uLamp1Pos').value.copy(deskLamp.position);
    vu.get('uLamp1Floor').value = deskLampFloor;
    if (tallLamp) vu.get('uLamp2Pos').value.copy(tallLamp.position);
    const du = dust.material.uniforms;
    du.uTvPos.value.copy(tvPos);
    du.uTvNormal.value.copy(tvNormal);
    du.uLamp1Floor.value = deskLampFloor;
    if (deskLamp) du.uLamp1Pos.value.copy(deskLamp.position);
    if (tallLamp) du.uLamp2Pos.value.copy(tallLamp.position);

    warmUpAndStart();
  }).catch((err) => console.error('[RoomBackgroundHq] Failed to set up the room', err));

  // ---------- environment capture (reflections/fill from the lit room itself) ----------
  let pmrem = null;
  let envRT = null;
  function captureEnvironment() {
    const cubeRT = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
    const cubeCam = new THREE.CubeCamera(0.05, 30, cubeRT);
    cubeCam.layers.enable(LAYER_NO_OCCLUDE);
    cubeCam.position.set(3.2, 2.3, -0.4);
    if (dust) dust.visible = false;
    cubeCam.update(renderer, scene);
    if (dust) dust.visible = true;
    pmrem = new THREE.PMREMGenerator(renderer);
    envRT = pmrem.fromCubemap(cubeRT.texture);
    scene.environment = envRT.texture;
    cubeRT.dispose();
  }

  // ---------- camera moves ----------
  function moveCamera(path, duration) {
    cameraMove = { path, duration, start: performance.now() };
  }

  // the camera only moves for the idle <-> corkboard transitions
  function updateCamera(now) {
    if (cameraMove) {
      let k = Math.min((now - cameraMove.start) / cameraMove.duration, 1);
      k = k * k * k * (k * (k * 6 - 15) + 10); // smootherstep
      camBase.position.copy(cameraMove.path.curve.getPoint(k));
      camBase.quaternion.slerpQuaternions(cameraMove.path.from, cameraMove.path.to, k);
      if (k >= 1) cameraMove = null;
    }
    camera.position.copy(camBase.position);
    camera.quaternion.copy(camBase.quaternion);
  }

  // ---------- loop ----------
  let last = performance.now();
  const t0 = last;
  let frame = 0;
  function loop(now) {
    if (disposed) return;
    rafId = requestAnimationFrame(loop);
    step(now);
  }

  // one frame: animation, lights, shadows, render
  function step(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    const t = (now - t0) / 1000;
    frame++;

    if (fan) fan.rotation.y += dt * 1.5;
    if (mixer) mixer.update(dt);
    if (ghostHeadBone && ghostRimLight) {
      ghostHeadBone.getWorldPosition(ghostRimLight.target.position);
      ghostRimLight.target.position.y += 0.45;
    }
    updateCamera(now);
    if (cardSwap) cardSwap.update(now);

    // channel change: hold static until the new video is playing and the minimum
    // time has passed, then play the switch-in sequence once
    if (channel.state === 'static' && channel.ready && now - channel.switchStart > MIN_STATIC_MS) {
      channel.state = 'switching';
      channel.switchT = 0;
    }
    // (channel.freezeT, set from the console, holds the effect at that moment)
    const frozen = channel.freezeT !== undefined;
    const sw = switchState(frozen ? channel.freezeT : channel.state === 'switching' ? channel.switchT : Infinity);
    if (channel.state === 'switching') {
      channel.switchT += dt;
      if (channel.switchT >= SWITCH_DURATION) {
        channel.state = 'playing';
        // Nothing shows the static now. Left running, the 1080p clip keeps decoding
        // and uploading a frame to the GPU every tick, competing with the game clip.
        staticVideo.pause();
      }
    }
    // the static stays up until the tube has collapsed to a line; the new channel is
    // behind it when it opens back up
    channel.staticValue = frozen
      ? (sw.newChannel ? 0 : 1)
      : channel.state === 'static' || (channel.state === 'switching' && !sw.newChannel) ? 1 : 0;
    const cu = crt.uniforms;
    cu.uStatic.value = channel.staticValue;
    cu.uScaleY.value = sw.scaleY;
    cu.uRollPhase.value = sw.roll;
    cu.uRoll.value = sw.glitch;
    cu.uFlash.value = sw.flash;
    cu.uTime.value = t;

    refreshVideoTextures();
    sampleTv(now, dt);
    // the static is bright and flat; the game footage varies a lot, so its light
    // tracks the picture's brightness
    let tvBright = THREE.MathUtils.lerp(0.15 + tvLumSmoothed * 2.2, 0.9, channel.staticValue);
    // the room dims while the picture is collapsed to a line, and surges as it locks
    tvBright *= (0.2 + 0.8 * Math.min(sw.scaleY, 1)) * (1 + sw.flash);
    if (tvRect) {
      tvRect.color.copy(tvColor);
      tvRect.intensity = 45 * tvBright;
    }
    if (tvSpot) {
      tvSpot.color.copy(tvColor);
      tvSpot.intensity = 60 * tvBright;
    }

    // lamps: warm with the faintest filament wobble
    const flick = 1 + Math.sin(t * 13.1) * 0.006 + Math.sin(t * 7.3 + 1.0) * 0.008;
    if (deskLamp) deskLamp.intensity = 3.5 * flick;

    if (sky) sky.uniforms.uTime.value = t;
    if (city) city.uniforms.uTime.value = t;
    if (beacons) beacons.material.uniforms.uTime.value = t;

    // Shadow maps are the most expensive part of the frame (CPU-bound draw calls), and
    // only the ghost's idle sway and the ceiling fan actually move; those are staggered.
    // The torchiere's shadow is rendered once, with the fan hidden: it needn't cast there.
    if (frame === 1 && tallLamp) {
      if (fan) fan.visible = false;
      tallLamp.shadow.needsUpdate = true;
      renderer.render(scene, camera);
      if (fan) fan.visible = true;
    }
    if (frame % 2 === 0) {
      tvSpot && (tvSpot.shadow.needsUpdate = true);
    } else {
      moonDepth.render(renderer, scene);
      if (frame % 4 === 1) moon.shadow.needsUpdate = true;
    }
    // The lamp lights (lampShadows) only see things that never move, so their shadow
    // maps are rendered once and kept; refreshing them made a small periodic hitch.
    // Every shadow map has to exist before the first draw, or lit materials render
    // nothing, so the first frame renders them all.
    if (frame === 1) {
      for (const l of [moon, tvSpot, ...lampShadows]) if (l && l !== tallLamp) l.shadow.needsUpdate = true;
    }

    const tvAir = post.volumetric.uniforms.get('uTvColor').value.copy(tvColor).multiplyScalar(0.012 * tvBright);
    post.volumetric.uniforms.get('uLamp1Color').value.copy(deskLampColor).multiplyScalar(0.012 * flick);
    post.volumetric.uniforms.get('uLamp2Color').value.copy(tallLampColor).multiplyScalar(0.02);
    post.volumetric.update();

    const du = dust.material.uniforms;
    du.uTime.value = t;
    du.uTvColor.value.copy(tvAir).multiplyScalar(20);
    du.uLamp1Color.value.copy(deskLampColor);
    du.uLamp2Color.value.copy(tallLampColor);

    post.composer.render(dt);
  }

  // The first frames compile ~30 GPU programs (materials and their shadow / depth
  // variants, the post effects, the reflection capture), and every compile blocks the
  // page, so rendering straight away freezes the graphic for a moment. Instead, do all
  // of that while the canvas is still invisible - capture the reflections, compile the
  // final material variants in parallel, render full frames - then fade in and run.
  async function warmUpAndStart() {
    const canvas = renderer.domElement;
    canvas.style.opacity = '0';
    const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
    const warmUpStart = performance.now();

    step(performance.now()); // every shadow map + post pass (frame 1 forces all shadows)
    await nextFrame();
    captureEnvironment(); // needs the lit room; changes the materials' env variant
    try {
      await renderer.compileAsync(scene, camera); // parallel where supported
    } catch (e) {
      console.warn('[RoomBackgroundHq] compileAsync failed, compiling on first render', e);
    }
    if (disposed) return;
    step(performance.now());
    await nextFrame();
    step(performance.now());
    await nextFrame();
    if (disposed) return;

    console.info(`[RoomBackgroundHq] warm-up took ${Math.round(performance.now() - warmUpStart)}ms`);
    last = performance.now();
    canvas.style.transition = 'opacity 0.6s ease-out';
    canvas.style.opacity = '1';
    onReady.forEach((f) => f());
    rafId = requestAnimationFrame(loop);
  }

  function toCorkboard() {
    if (beziers && cameraAt === 'idle') {
      moveCamera(beziers.idleToCards, 2200);
      cameraAt = 'corkboard';
    }
  }

  function toIdle() {
    if (beziers && cameraAt === 'corkboard') {
      moveCamera(beziers.cardsToIdle, 2200);
      cameraAt = 'idle';
    }
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(rafId);
    gameVideo.pause();
    gameVideo.removeAttribute('src');
    gameVideo.remove();
    staticVideo.remove();
    staticVideo.pause();
    staticVideo.removeAttribute('src');
    gameTex.dispose();
    staticTex.dispose();
    moonDepth.dispose();
    glowTarget.dispose();
    glowMaterial.dispose();
    for (const t of cardTextures) if (t) t.dispose();
    if (post) post.composer.dispose();
    if (envRT) envRT.dispose();
    if (pmrem) pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }

  function cardsUpdated() {
    for (const t of cardTextures) if (t) t.needsUpdate = true;
  }

  // Whether the corkboard is what's on screen right now (camera there and not moving).
  function cardsInView() {
    return cameraAt === 'corkboard' && !cameraMove;
  }

  // Plays the pins-out / cards-off / cards-in / pins-in animation. applyFn redraws the
  // card canvases with the new players; it is called while the cards are out of frame
  // and may return a promise to wait for (avatars loading).
  function swapCards(applyFn) {
    if (cardSwap) cardSwap.start(applyFn);
    else applyFn();
  }

  const handle = {
    playVideo,
    toCorkboard,
    toIdle,
    cardsUpdated,
    cardsInView,
    swapCards,
    dispose,
    whenReady(f) { if (post) f(); else onReady.push(f); },
    // the <video> the TV plays (for seeking / pausing)
    video: gameVideo,
    // exposed for live tuning from the console
    get debug() {
      return { scene, camera, camBase, cardSwap, renderer, post, moon, hemi, tvRect, tvSpot, deskLamp, tallLamp, shelfSpills, crt, dust, moonDepth, channel, gameVideo };
    },
  };
  return handle;
}
