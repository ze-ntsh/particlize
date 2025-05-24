uniform sampler2D uAccelerationTexture;
varying vec2 vUv;

void main() {
  vec4 acceleration = texture2D(uAccelerationTexture, vUv);

  gl_FragColor = acceleration;
}