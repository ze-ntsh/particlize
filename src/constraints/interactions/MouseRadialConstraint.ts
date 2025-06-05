import { Constraint } from "../Constraint";

// Type
export type MouseRadialConstraintParams = {
  strength?: number;
  radius?: number;
  property?: "velocity" | "position";
  falloff?: "smooth" | "linear";
  axis?: "xy" | "xz" | "yz" | "xyz";
};

export class MouseRadialConstraint extends Constraint {
  // Default parameters
  static readonly defaultParams: MouseRadialConstraintParams = {
    strength: 0.1,
    radius: 100,
    property: "velocity",
    falloff: "smooth",
    axis: "xyz",
  };

  constructor(name: string, params: MouseRadialConstraintParams = {}) {
    params = { ...MouseRadialConstraint.defaultParams, ...params };

    super(
      name,
      /*glsl*/ `
      vec${params.axis?.length} toParticle@ = position.${params.axis} - u_mouse.${params.axis};
      float dist@ = length(toParticle@);

      if(dist@ < 0.2 && dist@ > 0.0) {
        vec${params.axis?.length} dir@ = normalize(toParticle@);
        float strength@ = (1.0 - (dist@ / 0.2)) * #STRENGTH;
        ${params.property}.${params.axis} += dir@ * strength@ * u_delta;
      }
      `
    );

    this.params = params;
    this.build();
  }
}
