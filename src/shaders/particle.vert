uniform sampler2D u_position_size_texture;
varying vec2 vUv;

void main() {
  vec4 positionSize = texture2D(u_position_size_texture, uv);
  vUv = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(positionSize.xyz, 1.0);
  gl_PointSize = positionSize.w;
}