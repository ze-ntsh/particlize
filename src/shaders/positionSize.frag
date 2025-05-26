uniform sampler2D uPositionSizeTexture;
uniform sampler2D uVelocityLifetimeTexture;
varying vec2 vUv;
uniform float uTime;
uniform float uDelta;

void main() {
  vec4 positionSize = texture2D(uPositionSizeTexture, vUv);
  vec4 velocityLifetime = texture2D(uVelocityLifetimeTexture, vUv);

  vec3 position = positionSize.xyz;
  vec3 velocity = velocityLifetime.xyz;

  position += velocity * uDelta;

  gl_FragColor = vec4(position, positionSize.w);
}