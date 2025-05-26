uniform sampler2D uOriginTexture;
uniform sampler2D uPositionSizeTexture;
uniform sampler2D uVelocityLifetimeTexture;
varying vec2 vUv;

void main() {
  vec4 positionSize = texture2D(uPositionSizeTexture, vUv);
  vec4 velocityLifetime = texture2D(uVelocityLifetimeTexture, vUv);

  vec3 origin = texture2D(uOriginTexture, vUv).xyz;
  vec3 position = positionSize.xyz;
  vec3 velocity = velocityLifetime.xyz;

  // Origin restoring force
  float k = 25.0;   // strong spring for snappiness
  float d = 2.0 * sqrt(k); // critical damping

  vec3 restoring = (origin - position) * k;
  vec3 damping = -velocity * d;

  vec3 acceleration = restoring + damping;

  gl_FragColor = vec4(acceleration, 0.0);
}