uniform sampler2D uOriginTexture;
uniform sampler2D uPositionTexture;
uniform sampler2D uVelocityTexture;
varying vec2 vUv;

void main() {
  vec3 origin = texture2D(uOriginTexture, vUv).xyz;
  vec3 position = texture2D(uPositionTexture, vUv).xyz;
  vec3 velocity = texture2D(uVelocityTexture, vUv).xyz;

  float k = 25.0;   // strong spring for snappiness
  float d = 2.0 * sqrt(k); // critical damping

  vec3 restoring = (origin - position) * k;
  vec3 damping = -velocity * d;

  vec3 acceleration = restoring + damping;

  gl_FragColor = vec4(acceleration, 0.0);
}