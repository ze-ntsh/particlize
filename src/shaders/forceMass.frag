uniform sampler2D uOriginTexture;
uniform sampler2D uPositionSizeTexture;
uniform sampler2D uVelocityLifetimeTexture;
uniform sampler2D uForceMassTexture;
varying vec2 vUv;

void main() {
  vec4 positionSize = texture2D(uPositionSizeTexture, vUv);
  vec4 velocityLifetime = texture2D(uVelocityLifetimeTexture, vUv);
  vec4 forceMass = texture2D(uForceMassTexture, vUv);
  
  if(velocityLifetime.w <= 0.0 && velocityLifetime.w >= -0.999) {
    discard; // Skip particles with lifetime between 0 and -1. -1 is infinite lifetime
    return;
  }

  vec3 origin = texture2D(uOriginTexture, vUv).xyz;
  vec3 position = positionSize.xyz;
  vec3 velocity = velocityLifetime.xyz;
  float mass = forceMass.w;

  // Origin restoring force
  float k = 25.0;   // strong spring for snappiness
  float d = 2.0 * sqrt(k); // critical damping

  vec3 restoring = (origin - position) * k;
  vec3 damping = -velocity * d;

  vec3 acceleration = restoring + damping;
  vec3 force = acceleration * mass;

  gl_FragColor = vec4(force, mass); 
}