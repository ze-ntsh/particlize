uniform sampler2D uColorTexture;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(uColorTexture, vUv);
}