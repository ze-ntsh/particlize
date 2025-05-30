import { Constraint } from "../Constraint";

// Types
type RadialForceParams = {
  center?: {
    value: [number, number, number];
    hardcoded?: boolean;
  };
  strength?: {
    value: [number, number, number];
    hardcoded?: boolean;
  };
};

export class RadialForce extends Constraint {
  constructor(name: string, params: RadialForceParams) {
    const { center, strength } = params;
    
    const glsl = /**glsl**/ `
      vec3 toParticle = position - ${name}_center;
      float dist = length(toParticle) + 1e-5;
      vec3 dir = normalize(toParticle);
      force += dir * ${name}_strength * mass / (dist * dist);
    `;

    super(glsl);
    this.uniforms = {
      [`u_${name}_center`]: center,
      [`${name}_strength`]: strength,
    };
  }
}
