uniform sampler2D uColorTexture;
uniform sampler2D uVelocityLifetimeTexture;
varying vec2 vUv;

void main() {
  vec4 velocityLifetime = texture2D(uVelocityLifetimeTexture, vUv);
  if(velocityLifetime.w <= 0.0 && velocityLifetime.w >= -0.999) {
    discard;
    return;
  }

  gl_FragColor = texture2D(uColorTexture, vUv);
}