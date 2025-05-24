uniform sampler2D uPositionTexture;
uniform vec2 uResolution;
varying vec4 vColor;

void main() {
  vec4 pos = texture2D(uPositionTexture, uv);
  vColor = vec4(1.0, 1.0, 1.0, 1.0);

  gl_Position = projectionMatrix * modelViewMatrix * pos;
  gl_PointSize = 1.0;
}