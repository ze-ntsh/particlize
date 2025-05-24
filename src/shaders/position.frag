uniform sampler2D uPositionTexture;
uniform sampler2D uVelocityTexture;
varying vec2 vUv;
uniform float uDelta;

void main() {
  vec4 position = texture2D(uPositionTexture, vUv);
  vec4 velocity = texture2D(uVelocityTexture, vUv);
  position += velocity * uDelta;

  gl_FragColor = position;
}