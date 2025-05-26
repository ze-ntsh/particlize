uniform sampler2D uPositionSizeTexture;
varying vec2 vUv;

void main() {
  vec4 positionSize = texture2D(uPositionSizeTexture, uv);
  vUv = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(positionSize.xyz, 1.0);
  gl_PointSize = positionSize.w;
}