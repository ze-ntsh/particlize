uniform sampler2D uVelocityTexture;
uniform sampler2D uAccelerationTexture;
uniform sampler2D uPositionTexture;
varying vec2 vUv;
uniform float uDelta;
uniform vec3 uMouse;           // Mouse position in NDC or world space
uniform float uMouseRadius;    // Radius of influence (same space as position)
uniform float uMouseForce;

void main() {
  vec3 position = texture2D(uPositionTexture, vUv).xyz;
  vec3 velocity = texture2D(uVelocityTexture, vUv).xyz;
  vec3 acceleration = texture2D(uAccelerationTexture, vUv).xyz;

  // Apply restoring force (from acceleration FBO)
  velocity += acceleration * uDelta;

  // Mouse repulsion (radial, only within radius)
  vec2 toParticle = position.xy - uMouse.xy;
  float dist = length(toParticle);

  if(dist < uMouseRadius && dist > 0.0001) {
    vec2 dir = normalize(toParticle);
    float strength = (1.0 - (dist / uMouseRadius)) * uMouseForce;
    velocity.xy += dir * strength * uDelta;
  }

  gl_FragColor = vec4(velocity, 1.0);
}