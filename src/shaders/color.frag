uniform sampler2D uColorTexture;
varying vec2 vUv;

void main() {
  vec4 color = texture2D(uColorTexture, vUv);
  
  // Output the color directly
  gl_FragColor = color;
}