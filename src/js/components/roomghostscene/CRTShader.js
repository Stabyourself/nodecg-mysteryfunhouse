// CRT Shader for Three.js
// Converted from LÖVE2D shader to standard GLSL

export const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    scanlineIntensity: { value: 0.4 },
    scanlineCount: { value: 128.0 },
    yOffset: { value: 0.0 },
    brightness: { value: 1.1 },
    contrast: { value: 1.05 },
    saturation: { value: 1.1 },
    bloomIntensity: { value: 2 },
    bloomThreshold: { value: 0.5 },
    adaptiveIntensity: { value: 0.5 },
    vignetteStrength: { value: 0.3 }
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    uniform sampler2D tDiffuse;
    uniform float scanlineIntensity;
    uniform float scanlineCount;
    uniform float yOffset;
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    uniform float bloomIntensity;
    uniform float bloomThreshold;
    uniform float adaptiveIntensity;
    uniform float vignetteStrength;

    varying vec2 vUv;

    // Precomputed constants
    const float PI = 3.14159265;
    const vec3 LUMA = vec3(0.299, 0.587, 0.114);
    const float BLOOM_THRESHOLD_FACTOR = 0.5;
    const float BLOOM_FACTOR_MULT = 1.5;

    // Low-cost symmetric bloom sampling (cross + center, normalized)
    vec4 sampleBloom(sampler2D tex, vec2 uv, float radius, vec4 centerSample) {
      vec2 o = vec2(radius);
      vec4 c = centerSample * 0.4;
      vec4 cross = (
        texture2D(tex, uv + vec2(o.x, 0.0)) +
        texture2D(tex, uv - vec2(o.x, 0.0)) +
        texture2D(tex, uv + vec2(0.0, o.y)) +
        texture2D(tex, uv - vec2(0.0, o.y))
      ) * 0.15;
      return c + cross;
    }

    // Approximates vignette using Chebyshev distance squared instead of pow()
    float vignetteApprox(vec2 uv, float strength) {
      vec2 vigCoord = uv * 2.0 - 1.0;
      float dist = max(abs(vigCoord.x), abs(vigCoord.y));
      return 1.0 - dist * dist * strength; // Use squared distance instead of pow
    }

    void main() {
      vec2 uv = vUv;

      // Get the original pixel color
      vec4 pixel = texture2D(tDiffuse, uv);

      // Apply bloom effect with threshold-based sampling (skip if disabled)
      if (bloomIntensity > 0.001) {
        float pixelLum = dot(pixel.rgb, LUMA);
        // Only sample bloom if pixel is above threshold
        float bloomThresholdHalf = bloomThreshold * BLOOM_THRESHOLD_FACTOR;
        if (pixelLum > bloomThresholdHalf) {
          vec4 bloomSample = sampleBloom(tDiffuse, uv, 0.005, pixel);
          bloomSample.rgb *= brightness;
          float bloomLum = dot(bloomSample.rgb, LUMA);
          float bloomFactor = bloomIntensity * max(0.0, (bloomLum - bloomThreshold) * BLOOM_FACTOR_MULT);
          pixel.rgb += bloomSample.rgb * bloomFactor;
        }
      }

      // Apply brightness
      pixel.rgb *= brightness;

      // Apply contrast and saturation in one pass
      float luminance = dot(pixel.rgb, LUMA);
      pixel.rgb = (pixel.rgb - 0.5) * contrast + 0.5;
      pixel.rgb = mix(vec3(luminance), pixel.rgb, saturation);

      // Calculate combined lighting mask (scanlines, vignette)
      float lightingMask = 1.0;

      // Calculate scanlines (skip if disabled)
      if (scanlineIntensity > 0.001) {
        float scanlineY = (uv.y + yOffset) * scanlineCount;
        float scanlinePattern = abs(sin(scanlineY * PI));

        // Apply adaptive intensity if enabled
        float adaptiveFactor = 1.0;
        if (adaptiveIntensity > 0.001) {
          float yPattern = sin(uv.y * 30.0) * 0.5 + 0.5;
          adaptiveFactor = 1.0 - yPattern * adaptiveIntensity * 0.2;
        }

        lightingMask *= 1.0 - scanlinePattern * scanlineIntensity * adaptiveFactor;
      }

      // Apply vignette (skip if disabled)
      if (vignetteStrength > 0.001) {
        lightingMask *= vignetteApprox(uv, vignetteStrength);
      }

      // Apply combined lighting effects in single multiplication
      pixel.rgb *= lightingMask;

      gl_FragColor = pixel;
    }
  `
};
