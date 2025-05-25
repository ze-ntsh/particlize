uniform sampler2D uOriginTexture;
varying vec2 vUv;

void main() {
  vec3 origin = texture2D(uOriginTexture, vUv).xyz;

  gl_FragColor = vec4(origin, 1.0);
}