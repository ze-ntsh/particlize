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
    strength: { value: 10, hardcode: true },
  };

  constructor(name: string, params: OriginRestoringForceParams = {}) {
    params = deepMerge(OriginRestoringForce.defaultParams, params) as OriginRestoringForceParams;

    super(
      name,
      /*glsl*/ `
        float d_${name} = 2.0 * sqrt(#STRENGTH);

        vec3 restoring_${name} = (origin - position) * #STRENGTH;
        vec3 damping_${name} = -velocity * d_${name};

        vec3 acceleration_${name} = restoring_${name} + damping_${name};
        force = acceleration_${name} * mass;
      `
    );

    this.build(params);
  }
}
