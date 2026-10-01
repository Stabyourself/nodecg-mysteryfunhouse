import * as THREE from 'three';

// Emissive CRT screen: barrel curvature, scanlines and aperture grille (faded out when
// they're too fine to show), a rolling hum bar, and a "channel change" mode that
// blends to static and slips vertical hold while the next video loads.
//
// The post chain skips tone mapping for this screen (see ScreenToneMappingEffect in
// post.js), so the output here is display-referred: 1.0 is the video's own white, and
// the gameplay keeps its real colours and black level.
export function createCrtScreenMaterial(videoTexture, staticTexture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      tVideo: { value: videoTexture },
      tStatic: { value: staticTexture },
      uStatic: { value: 1 },
      // channel-switch effect, driven by switchState() in scene.js
      uRoll: { value: 0 }, // 0..1 how unstable the sync is (tearing, shear, colour split)
      uRollPhase: { value: 0 }, // vertical roll, in frames
      uScaleY: { value: 1 }, // vertical deflection; ~0 = collapsed to a line
      uFlash: { value: 0 }, // brightness surge as the picture locks
      // hum bar: screen heights per second it travels, and how much it darkens
      uHumSpeed: { value: 0.3 },
      uHumStrength: { value: 0.1 },
      uTime: { value: 0 },
      uBrightness: { value: 1.0 },
      // how much of the tube the picture fills (the rest is a black border, like a
      // real CRT) - below 1 so the whole frame, HUD included, is visible
      uPictureSize: { value: 0.95 },
      uPower: { value: 1 },
    },
    toneMapped: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tVideo;
      uniform sampler2D tStatic;
      uniform float uStatic;
      uniform float uRoll;
      uniform float uRollPhase;
      uniform float uScaleY;
      uniform float uFlash;
      uniform float uHumSpeed;
      uniform float uHumStrength;
      uniform float uTime;
      uniform float uBrightness;
      uniform float uPictureSize;
      uniform float uPower;
      varying vec2 vUv;

      float hash(float n) { return fract(sin(n) * 43758.5453123); }

      // gentle barrel distortion of the whole tube
      vec2 curve(vec2 uv) {
        uv = uv * 2.0 - 1.0;
        vec2 o = abs(uv.yx) / vec2(6.5, 5.5);
        uv += uv * o * o;
        return uv * 0.5 + 0.5;
      }

      vec3 sampleSignal(vec2 uv) {
        // horizontal convergence error between the guns, much worse while sync is lost
        vec2 ca = vec2(0.0008 + uRoll * 0.014, uRoll * 0.006);
        vec3 v;
        v.r = texture2D(tVideo, uv + ca).r;
        v.g = texture2D(tVideo, uv).g;
        v.b = texture2D(tVideo, uv - ca).b;
        vec3 s = texture2D(tStatic, uv).rgb;
        return mix(v, s, uStatic);
      }

      // 1 inside a rounded rectangle covering [0,1]^2, antialiased
      float roundedRect(vec2 p, float radius) {
        vec2 q = abs(p * 2.0 - 1.0) - (1.0 - radius);
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
        float aa = fwidth(d) + 1e-5;
        return 1.0 - smoothstep(-aa, aa, d);
      }

      void main() {
        // picture coordinates: curved, then shrunk into the tube so nothing is cropped
        vec2 tube = curve(vUv);
        vec2 uv = (tube - 0.5) / uPictureSize + 0.5;
        float inPicture = roundedRect(uv, 0.06);

        // vertical deflection: squashing the picture toward a line in the middle. The
        // same beam energy in less height makes it brighter, so the line glows.
        float scaleY = max(uScaleY, 0.004);
        float sy = (uv.y - 0.5) / scaleY + 0.5;
        float inDeflection = step(0.0, sy) * step(sy, 1.0);
        float squashGlow = min(1.0 / scaleY, 6.0);
        // soft glow around the collapsed line (its own falloff, since the picture is gone)
        float lineGlow = exp(-pow((uv.y - 0.5) / (0.012 + scaleY * 0.5), 2.0)) * smoothstep(0.2, 0.0, scaleY);

        // lost sync: the picture rolls vertically (black blanking bar between frames),
        // lines are sheared and torn, and noise bands roll through
        float rolled = sy + uRollPhase;
        float frameY = fract(rolled);
        float line = floor(frameY * 240.0);
        float tear = (hash(line + floor(uTime * 45.0)) - 0.5) * 0.06 * uRoll * uRoll;
        float shear = (frameY - 0.5) * 0.18 * uRoll * sin(uTime * 23.0);
        float wobble = sin(frameY * 26.0 + uTime * 17.0) * 0.012 * uRoll;
        vec2 suv = vec2(uv.x + tear + shear + wobble, frameY);

        vec3 col = sampleSignal(suv);

        // blanking bar at the frame seam, only while the picture is rolling
        float bar = smoothstep(0.0, 0.015, frameY) * smoothstep(1.0, 0.93, frameY);
        col *= mix(1.0, bar, smoothstep(0.02, 0.15, uRoll));
        // rolling bands of snow while the tuner hunts
        float band = smoothstep(0.75, 1.0, sin(rolled * 9.0 - uTime * 11.0) * 0.5 + 0.5);
        col = mix(col, texture2D(tStatic, suv * vec2(1.0, 0.5)).rgb, band * uRoll * 0.7);

        col *= inDeflection * mix(1.0, squashGlow, smoothstep(0.6, 0.05, scaleY));
        col += vec3(0.85, 0.9, 1.0) * lineGlow * 2.5;
        col *= 1.0 + uFlash;

        // Scanlines (240p) and aperture grille, faded out by how many of them fall in a
        // single screen pixel: finer than that they can't be seen, only alias into
        // thick moire bands and darken the picture.
        float lines = uv.y * 240.0;
        float lineVis = 1.0 - smoothstep(0.25, 0.5, fwidth(lines));
        float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
        float sl = sin(lines * 3.14159265);
        col *= mix(1.0, 0.6 + 0.4 * pow(abs(sl), 0.6), (0.35 - lum * 0.2) * lineVis);

        float stripes = uv.x * 640.0;
        float maskVis = 1.0 - smoothstep(0.25, 0.5, fwidth(stripes));
        vec3 mask = vec3(0.8);
        float m = mod(floor(stripes), 3.0);
        if (m < 0.5) mask.r = 1.2; else if (m < 1.5) mask.g = 1.2; else mask.b = 1.2;
        col *= mix(vec3(1.0), mask, maskVis);

        // hum bar: a soft darker band (mains interference) rolling up the picture. A
        // darker band rather than a brighter one, since the picture can't go above
        // full white, so a brighter band vanishes on pale games.
        float humPos = abs(fract(uv.y - uTime * uHumSpeed) - 0.5);
        float hum = smoothstep(0.16, 0.05, humPos);
        col *= 1.0 - uHumStrength * hum;

        // slight falloff toward the picture edges
        vec2 vg = clamp(uv, 0.0, 1.0);
        vg = vg * (1.0 - vg.yx);
        col *= mix(0.82, 1.0, clamp(vg.x * vg.y * 30.0, 0.0, 1.0));

        col *= uBrightness * uPower * inPicture;

        // faint reflection on the glass, strongest where the picture is dark
        float refl = 0.02 * smoothstep(1.0, 0.0, length(tube - vec2(0.25, 0.8)));
        col += vec3(0.8, 0.85, 1.0) * refl * (1.0 - min(dot(col, vec3(0.33)), 1.0));

        // outside the tube's curved glass: black
        float inTube = step(0.0, tube.x) * step(tube.x, 1.0) * step(0.0, tube.y) * step(tube.y, 1.0);
        gl_FragColor = vec4(col * inTube, 1.0);
      }
    `,
  });
}
