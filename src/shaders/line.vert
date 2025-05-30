uniform sampler2D uPositionSizeTexture;

void main() {
  vec3 pos = texture(uPositionSizeTexture, uv).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}