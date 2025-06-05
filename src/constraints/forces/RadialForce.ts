import { deepMerge } from "@/utils";
import { Constraint } from "@/constraints";

// Types
type RadialForceParams = {
  center?: [number, number, number];
  strength?: [number, number, number];
};

export class RadialForce extends Constraint {
  // Default parameters
  static readonly defaultParams: RadialForceParams = {
    center: [0, 0, 0],
    strength: [0, 0, 0],
  };

  constructor(name: string, params: RadialForceParams) {
    super(
      name,
      /*glsl*/ `
      vec3 toParticle@ = position - #CENTER;
      float dist@ = length(toParticle@);
      vec3 dir@ = normalize(toParticle@);
      force += dir@ * #STRENGTH * mass / (dist@ * dist@);
      `
    );
    this.params = { ...RadialForce.defaultParams, ...params };
    this.build();
  }
}
