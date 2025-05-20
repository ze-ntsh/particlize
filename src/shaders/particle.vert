attribute vec3 velocity;
attribute float size;
attribute vec4 color;

uniform float uTime;
uniform vec2 uResolution;
uniform float uMouseActive;
uniform vec3 uMouse;

varying vec4 vColor;

vec3 ndc(vec3 position) {
  vec3 ndcPosition = vec3((position.xy / uResolution) * 2.0 - 1.0, position.z);
  ndcPosition.y = -ndcPosition.y; // Invert y-axis for WebGL
  return ndcPosition;
}

void main() {
  // Set color for the vertex to be accessed in the fragment shader
  vColor = color;

  // Convert position from pixel space to normalized device coordinates (-1 to 1)
  vec3 ndcPosition = ndc(position);

  // Mouse over effect
  if(uMouseActive > 0.0) {
    float dist = distance(ndcPosition, uMouse);

    if(dist < 0.1) {
      // Move the particle away from the mouse
      vec3 direction = normalize(ndcPosition - uMouse);
      ndcPosition += direction * (0.1 - dist) * 0.3;
    }
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(ndcPosition, 1.0);
  gl_PointSize = size;
}