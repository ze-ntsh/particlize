uniform sampler2D uOriginTexture;
uniform sampler2D uPositionSizeTexture;
uniform sampler2D uVelocityLifetimeTexture;
uniform sampler2D uForceMassTexture;
uniform sampler2D uColorTexture;
uniform float uDelta;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec4 velocityLifetime = texture2D(uVelocityLifetimeTexture, vUv);
  float lifetime = velocityLifetime.w;
  if(lifetime <= 0.0 && lifetime >= -0.999) {
    discard;
    return;
  }

  gl_FragColor = texture2D(uColorTexture, vUv);
}