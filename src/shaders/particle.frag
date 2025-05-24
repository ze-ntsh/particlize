varying vec3 vColor;

void main() {
    // Centered point coords
  vec2 coord = gl_PointCoord - 0.5;
  float r = length(coord);

  // Discard outside circle
  if(r > 0.5)
    discard;

  // Fake spherical surface (z component of unit hemisphere)
  float z = sqrt(0.25 - r * r);
  vec3 normal = normalize(vec3(coord, z));

  // Fake lighting: dot product of surface normal and light dir
  float light = dot(normal, normalize(vec3(0.577, 0.577, 0.577))); // light direction

  // Soft glow: fade alpha toward edges
  float alpha = smoothstep(0.5, 0.3, r); // tweak for softness

    // Combine color, lighting, and glow
  vec3 finalColor = mix(vec3(1.0, 0.69, 0.37), vColor, light);
  gl_FragColor = vec4(finalColor, alpha);
}