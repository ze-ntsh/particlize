uniform sampler2D uPositionTexture;
uniform sampler2D uVelocityTexture;
varying vec2 vUv;
uniform float uTime;
uniform float uDelta;

void main() {
  vec3 position = texture2D(uPositionTexture, vUv).xyz;
  vec3 velocity = texture2D(uVelocityTexture, vUv).xyz;

  position += velocity * uDelta;

  gl_FragColor = vec4(position, 1.0);
}