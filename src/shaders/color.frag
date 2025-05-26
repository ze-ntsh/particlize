uniform sampler2D uColorTexture;
uniform sampler2D uVelocityLifetimeTexture;
varying vec2 vUv;

void main() {
  vec4 velocityLifetime = texture2D(uVelocityLifetimeTexture, vUv);
  float lifetime = velocityLifetime.w;
  if(lifetime <= 0.0 && lifetime >= -0.999) {
    discard; // Skip particles with lifetime between 0 and -1. -1 is infinite lifetime
    return;
  }
  
  vec4 color = texture2D(uColorTexture, vUv);

  // Fade out when lifetime is between 0 and 1
  if(lifetime > 0.0 && lifetime < 1.0) {
    float fadeAlpha = smoothstep(0.0, 1.0, lifetime);
    color.a *= fadeAlpha;
  }

  // Output the color directly
  gl_FragColor = color;
}