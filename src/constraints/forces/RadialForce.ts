import { deepMerge } from "@/utils";
import { Constraint } from "../Constraint";

// Types
type RadialForceParams = {
  center?: {
    value: [number, number, number];
    hardcode?: boolean;
  };
  strength?: {
    value: [number, number, number];
    hardcode?: boolean;
  };
};

export class RadialForce extends Constraint {
  // Default parameters
  static readonly defaultParams: RadialForceParams = {
    center: { value: [0, 0, 0], hardcode: true },
    strength: { value: [0, 0, 0], hardcode: true },
  };

  constructor(name: string, params: RadialForceParams) {
    params = deepMerge(RadialForce.defaultParams, params) as RadialForceParams;

    super(
      name,
      /*glsl*/ `
        vec3 toParticle_${name} = position - #CENTER;
        float dist_${name} = length(toParticle_${name});
        vec3 dir_${name} = normalize(toParticle_${name});
        force += dir_${name} * #STRENGTH * mass / (dist_${name} * dist_${name});
      `
    );

    this.build(params);
  }
}
