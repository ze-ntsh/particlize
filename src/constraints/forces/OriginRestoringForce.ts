import { Constraint } from "../Constraint";

// Types
export type OriginRestoringForceParams = {
  strength?: {
    value: number;
    hardcode?: boolean;
  };
};

export class OriginRestoringForce extends Constraint {
  static paramNames: Array<keyof OriginRestoringForceParams> = ["strength"];

  constructor(name: string, params: OriginRestoringForceParams = {}) {
    const { strength = { value: 10.0, hardcode: false } } = params;

    super(name);
    let strengthUniform = "";
    if (strength.hardcode) {
      strengthUniform = strength.value.toFixed(2);
    } else {
      strengthUniform = `u_strength_${name}`;
      this.uniforms = {
        [strengthUniform]: strength.value,
      };
    }

    this.glsl = /**glsl**/ `
      float d = 2.0 * sqrt(${strengthUniform});

      vec3 restoring = (origin - position) * ${strengthUniform};
      vec3 damping = -velocity * d;

      vec3 acceleration = restoring + damping;
      force = acceleration * mass;
    `;
  }
}
