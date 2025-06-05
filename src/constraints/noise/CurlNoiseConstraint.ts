import { Constraint } from "@/constraints";

// Type
export type CurlNoiseConstraintParams = {
  strength?: number;
  scale?: number;
  timeScale?: number;
  property?: "velocity" | "position" | "force";
};

export class CurlNoiseConstraint extends Constraint {
  // Default parameters
  static readonly defaultParams: CurlNoiseConstraintParams = {
    strength: 0.1,
    scale: 1.0,
    timeScale: 1.0,
    property: "velocity",
  };

  constructor(name: string, params: CurlNoiseConstraintParams = {}) {
    params = { ...CurlNoiseConstraint.defaultParams, ...params };    super(
      name,
      /*glsl*/ `
      // Simple noise-based curl approximation using built-in functions
      vec3 timePos@ = position * #SCALE + u_time * #TIMESCALE;
      
      // Generate pseudo-curl using sine and cosine for fluid-like motion
      float noise1@ = sin(timePos@.x * 2.0 + timePos@.y * 1.5 + u_time * 0.5);
      float noise2@ = cos(timePos@.y * 2.0 + timePos@.z * 1.5 + u_time * 0.7);
      float noise3@ = sin(timePos@.z * 2.0 + timePos@.x * 1.5 + u_time * 0.3);
      
      vec3 curl@;
      curl@.x = noise2@ - noise3@;
      curl@.y = noise3@ - noise1@;
      curl@.z = noise1@ - noise2@;
      
      // Normalize and apply
      curl@ = normalize(curl@) * length(curl@) * 0.5;
      ${params.property}.xyz += curl@ * #STRENGTH * u_delta;
      `
    );

    this.params = params;
    this.build();
  }
}
