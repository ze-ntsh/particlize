import { deepMerge } from "@/utils";
import { Constraint } from "../Constraint";

// Types
export type OriginRestoringForceParams = {
  strength?: {
    value: number;
    hardcode?: boolean;
  };
};

export class OriginRestoringForce extends Constraint {
  // Default parameters
  static readonly defaultParams: OriginRestoringForceParams = {
    strength: { value: 10, hardcode: false },
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
    this.params = deepMerge(OriginRestoringForce.defaultParams, params) as OriginRestoringForceParams;
    this.build();
  }
}
