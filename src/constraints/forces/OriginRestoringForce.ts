import { deepMerge } from "@/utils";
import { Constraint } from "@/constraints";

// Types
export type OriginRestoringForceParams = {
  strength?: number;
};

export class OriginRestoringForce extends Constraint {
  // Default parameters
  static readonly defaultParams: OriginRestoringForceParams = {
    strength: 10,
  };

  constructor(name: string, params: OriginRestoringForceParams = {}) {
    super(
      name,
      /*glsl*/ `
      float d@ = 2.0 * sqrt(#STRENGTH);
      
      vec3 restoring@ = (origin - position) * #STRENGTH;
      vec3 damping@ = -velocity * d@;
      
      vec3 acceleration@ = restoring@ + damping@;
      force = acceleration@ * mass;
      `
    );
    this.params = { ...OriginRestoringForce.defaultParams, ...params };
    this.build();
  }
}
