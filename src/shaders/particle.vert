uniform sampler2D uPositionTexture;
uniform vec2 uResolution;
varying vec3 vColor;

void main() {
  vec4 pos = texture2D(uPositionTexture, uv);
  vColor = vec3(1.0, 0.0, 0.0);

  gl_Position = projectionMatrix * modelViewMatrix * pos;
  gl_PointSize = 10.0;
}