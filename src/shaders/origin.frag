uniform sampler2D uOriginTexture;
varying vec2 vUv;

void main() {
  vec4 origin = texture2D(uOriginTexture, vUv);

  // Output the origin directly
  gl_FragColor = origin;
}