uniform sampler2D uVelocityLifetimeTexture;
uniform sampler2D uForceMassTexture;
uniform sampler2D uPositionSizeTexture;
varying vec2 vUv;
uniform float uDelta;
uniform vec3 uMouse;           // Mouse position in NDC or world space
uniform float uMouseRadius;    // Radius of influence (same space as position)
uniform float uMouseForce;

void main() {
  vec4 positionSize = texture2D(uPositionSizeTexture, vUv);
  vec4 velocityLifetime = texture2D(uVelocityLifetimeTexture, vUv);
  vec4 forceMass = texture2D(uForceMassTexture, vUv);

  if(forceMass.w < 0.0) {
    discard; // Skip particles with zero mass
    return;
  }

  vec3 acceleration = forceMass.xyz / forceMass.w; // Acceleration from force/mass
  vec3 position = positionSize.xyz; // Current position
  vec3 velocity = velocityLifetime.xyz; // Current velocity
  float lifetime = velocityLifetime.w; // Current lifetime

  if(lifetime <= 0.0 && lifetime >= -0.999) {
    discard; // Skip particles with lifetime between 0 and -1. -1 is infinite lifetime
    return;
  }
  
  lifetime -= uDelta;

  // Apply restoring force (from acceleration FBO)
  velocity += acceleration * uDelta;

  // Mouse repulsion (radial, only within radius)
  vec2 toParticle = position.xy - uMouse.xy;
  float dist = length(toParticle);

  if(dist < uMouseRadius && dist > 0.0) {
    vec2 dir = normalize(toParticle);
    float strength = (1.0 - (dist / uMouseRadius)) * uMouseForce;
    velocity.xy += dir * strength * uDelta;
  }

  gl_FragColor = vec4(velocity, lifetime);
}