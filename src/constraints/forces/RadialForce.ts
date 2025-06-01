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
    center: { value: [0, 0, 0], hardcode: false },
    strength: { value: [0, 0, 0], hardcode: false },
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
    this.params = deepMerge(RadialForce.defaultParams, params) as RadialForceParams;
    this.build();
  }
}
