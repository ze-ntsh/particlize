uniform sampler2D uPositionTexture;
uniform vec2 uResolution;
varying vec3 vColor;
varying vec2 vUv;

void main() {
  vec3 pos = texture2D(uPositionTexture, uv).xyz;
  vColor = vec3(1.0, 0.0, 0.0);
  vUv = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = 1.0;
}