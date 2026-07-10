export const backgroundVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const backgroundFragmentShader = `
  precision highp float;
  uniform float u_time;
  uniform float u_opacity;
  uniform vec3 u_colorA;
  uniform vec3 u_colorB;
  uniform vec3 u_accent;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    float t = u_time * 0.05;
    float n = fbm(vUv * 3.0 + vec2(t, -t * 0.6));
    float n2 = fbm(vUv * 1.5 - vec2(t * 0.4, t * 0.2) + n);
    vec3 col = mix(u_colorA, u_colorB, smoothstep(0.15, 0.85, n2));
    vec2 blobCenter = vec2(0.7 + 0.12 * sin(t), 0.36 + 0.12 * cos(t * 0.8));
    float blob = smoothstep(0.6, 0.0, distance(vUv, blobCenter));
    col = mix(col, u_accent, blob * 0.26);
    gl_FragColor = vec4(col, u_opacity);
  }
`;

export const heroBackgroundFragmentShader = `
  precision highp float;
  uniform float u_opacity;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv - vec2(0.5, 0.66);
    float d = length(vec2(p.x * 0.88, p.y));
    vec3 center = vec3(0.227, 0.102, 0.220);
    vec3 mid = vec3(0.165, 0.071, 0.188);
    vec3 edge = vec3(0.071, 0.039, 0.180);
    vec3 outer = vec3(0.071, 0.039, 0.180);
    vec3 color = mix(center, mid, smoothstep(0.04, 0.35, d));
    color = mix(color, edge, smoothstep(0.34, 0.72, d));
    color = mix(color, outer, smoothstep(0.62, 0.98, d));

    float vignette = smoothstep(0.42, 1.02, length(vUv - 0.5));
    color = mix(color, vec3(0.045, 0.024, 0.090), vignette * 0.34);
    gl_FragColor = vec4(color, u_opacity);
  }
`;

export const confettiVertexShader = `
  attribute vec3 aColor;
  attribute float aPhase;
  attribute float aScale;
  uniform float u_time;
  uniform float u_pixelRatio;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vColor = aColor;
    float twinkle = 0.5 + 0.5 * sin(u_time * 2.0 + aPhase);
    vTwinkle = twinkle;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aScale * 34.0 * u_pixelRatio * (1.0 / max(-mv.z, 0.1)) * (0.6 + 0.4 * twinkle);
    gl_Position = projectionMatrix * mv;
  }
`;

export const confettiFragmentShader = `
  precision highp float;
  uniform float u_opacity;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float a = smoothstep(0.25, 0.0, d) * (0.45 + 0.55 * vTwinkle);
    gl_FragColor = vec4(vColor, a * 0.9 * u_opacity);
  }
`;
