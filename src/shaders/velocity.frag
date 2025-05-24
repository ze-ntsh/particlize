uniform sampler2D uVelocityTexture;
uniform sampler2D uAccelerationTexture;
varying vec2 vUv;
uniform float uDelta;

void main() {
  vec4 velocity = texture2D(uVelocityTexture, vUv);
  vec4 acceleration = texture2D(uAccelerationTexture, vUv);
  velocity += acceleration * uDelta;

  gl_FragColor = velocity;
}