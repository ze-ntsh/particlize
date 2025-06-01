uniform sampler2D u_velocity_lifetime_texture;
uniform sampler2D u_color_texture;
varying vec2 vUv;

void main() {
  vec4 velocityLifetime = texture2D(u_velocity_lifetime_texture, vUv);
  float lifetime = velocityLifetime.w;
  if(lifetime <= 0.0 && lifetime >= -0.999) {
    discard;
    return;
  }

  gl_FragColor = texture2D(u_color_texture, vUv);
}