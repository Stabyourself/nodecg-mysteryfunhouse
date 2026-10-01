import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  Effect,
  EffectAttribute,
  BloomEffect,
  VignetteEffect,
  ChromaticAberrationEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { VolumetricEffect } from './volumetrics.js';

// AgX tone mapping plus the colour grade for the room - but NOT for the TV screen.
// AgX squeezes bright colours toward white (that's its filmic look), and the TV is the
// brightest thing in the room, so tone mapped the gameplay turns pastel with grey
// blacks. The screen's four corners are projected each frame, and pixels inside that
// quad at the screen's depth pass through untouched, since the CRT shader already
// outputs display-ready colours. The grade: cool, slightly lifted shadows, warm
// highlights and some saturation back (AgX desaturates), for a late-night-TV look.
class ScreenAwareToneMappingEffect extends Effect {
  constructor(camera) {
    super('ScreenAwareToneMappingEffect', /* glsl */ `
      uniform vec2 uQuad[4];
      uniform vec2 uScreenDepth; // view distance range of the screen
      uniform float uScreenOn;
      uniform float uSaturation;
      uniform vec3 uShadowTint;
      uniform vec3 uHighlightTint;

      // three.js AgXToneMapping (tonemapping_pars_fragment), exposure 1
      const mat3 LINEAR_REC2020_TO_LINEAR_SRGB_ = mat3(
        vec3(1.6605, -0.1246, -0.0182), vec3(-0.5876, 1.1329, -0.1006), vec3(-0.0728, -0.0083, 1.1187));
      const mat3 LINEAR_SRGB_TO_LINEAR_REC2020_ = mat3(
        vec3(0.6274, 0.0691, 0.0164), vec3(0.3293, 0.9195, 0.0880), vec3(0.0433, 0.0113, 0.8956));
      vec3 agxContrast(vec3 x) {
        vec3 x2 = x * x;
        vec3 x4 = x2 * x2;
        return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
      }
      vec3 agx(vec3 color) {
        const mat3 inset = mat3(
          vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
          vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
          vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
        const mat3 outset = mat3(
          vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
          vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
          vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
        const float minEv = -12.47393;
        const float maxEv = 4.026069;
        color = inset * (LINEAR_SRGB_TO_LINEAR_REC2020_ * color);
        color = clamp((log2(max(color, 1e-10)) - minEv) / (maxEv - minEv), 0.0, 1.0);
        color = outset * agxContrast(color);
        color = pow(max(vec3(0.0), color), vec3(2.2));
        return clamp(LINEAR_REC2020_TO_LINEAR_SRGB_ * color, 0.0, 1.0);
      }

      float cross2(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }
      bool onScreen(vec2 p, float depth) {
        if (uScreenOn < 0.5) return false;
        float d = -getViewZ(depth);
        if (d < uScreenDepth.x || d > uScreenDepth.y) return false;
        float s0 = cross2(uQuad[1] - uQuad[0], p - uQuad[0]);
        float s1 = cross2(uQuad[2] - uQuad[1], p - uQuad[1]);
        float s2 = cross2(uQuad[3] - uQuad[2], p - uQuad[2]);
        float s3 = cross2(uQuad[0] - uQuad[3], p - uQuad[3]);
        return (s0 >= 0.0 && s1 >= 0.0 && s2 >= 0.0 && s3 >= 0.0) || (s0 <= 0.0 && s1 <= 0.0 && s2 <= 0.0 && s3 <= 0.0);
      }

      void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
        if (onScreen(uv, depth)) {
          outputColor = vec4(clamp(inputColor.rgb, 0.0, 1.0), inputColor.a);
          return;
        }
        vec3 c = agx(inputColor.rgb);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c *= mix(vec3(1.0), uHighlightTint, smoothstep(0.25, 0.85, l));
        c += uShadowTint * (1.0 - smoothstep(0.0, 0.25, l));
        c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, uSaturation);
        outputColor = vec4(max(c, 0.0), inputColor.a);
      }
    `, {
      attributes: EffectAttribute.DEPTH,
      uniforms: new Map([
        ['uQuad', new THREE.Uniform([new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()])],
        ['uScreenDepth', new THREE.Uniform(new THREE.Vector2())],
        ['uScreenOn', new THREE.Uniform(0)],
        ['uSaturation', new THREE.Uniform(1.18)],
        ['uShadowTint', new THREE.Uniform(new THREE.Vector3(0.002, 0.006, 0.016))],
        ['uHighlightTint', new THREE.Uniform(new THREE.Vector3(1.03, 1.0, 0.95))],
      ]),
    });
    this.camera = camera;
    this.screenCorners = null; // 4 world-space points, in order around the screen
    this._v = new THREE.Vector3();
  }

  update() {
    const on = this.uniforms.get('uScreenOn');
    on.value = 0;
    if (!this.screenCorners) return;
    const quad = this.uniforms.get('uQuad').value;
    const range = this.uniforms.get('uScreenDepth').value.set(Infinity, -Infinity);
    for (let i = 0; i < 4; i++) {
      const v = this._v.copy(this.screenCorners[i]).applyMatrix4(this.camera.matrixWorldInverse);
      if (-v.z <= this.camera.near) return; // a corner behind the camera: skip the exemption
      range.x = Math.min(range.x, -v.z);
      range.y = Math.max(range.y, -v.z);
      v.applyMatrix4(this.camera.projectionMatrix);
      quad[i].set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
    }
    // a little slack for the glass curvature / depth precision
    range.x -= 0.05;
    range.y += 0.05;
    on.value = 1;
  }
}

export function createPost(renderer, scene, camera, moonDepth, { width, height, quality }) {
  const high = quality !== 'low';
  const composer = new EffectComposer(renderer, {
    frameBufferType: THREE.HalfFloatType,
    multisampling: high ? 4 : 0,
  });
  composer.addPass(new RenderPass(scene, camera));

  let ao = null;
  if (high) {
    ao = new N8AOPostPass(scene, camera, width, height);
    Object.assign(ao.configuration, {
      aoRadius: 0.7,
      distanceFalloff: 0.5,
      intensity: 2.5,
      aoSamples: 16,
      denoiseSamples: 8,
      denoiseRadius: 10,
      color: new THREE.Color(0, 0, 0),
    });
    composer.addPass(ao);
  }

  const volumetric = new VolumetricEffect(camera, moonDepth);
  volumetric.uniforms.get('uSteps').value = high ? 40 : 20;
  volumetric.uniforms.get('uStepLength').value = high ? 0.1 : 0.2;
  composer.addPass(new EffectPass(camera, volumetric));

  const bloom = new BloomEffect({
    mipmapBlur: true,
    luminanceThreshold: 1.2,
    luminanceSmoothing: 0.3,
    intensity: 0.4,
    radius: 0.75,
  });
  const toneMapping = new ScreenAwareToneMappingEffect(camera);
  const grade = toneMapping; // the grade lives in the same effect
  const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.6 });
  composer.addPass(new EffectPass(camera, bloom, toneMapping, vignette));

  const chroma = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.0007, 0.0005),
    radialModulation: true,
    modulationOffset: 0.35,
  });
  composer.addPass(new EffectPass(camera, chroma));

  composer.setSize(width, height);

  return { composer, ao, volumetric, bloom, toneMapping, grade, vignette, chroma };
}
