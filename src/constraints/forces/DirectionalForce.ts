import { Constraint } from "../Constraint";

export class DirectionalForce extends Constraint {
  constructor(direction: [number, number, number], strength: number) {
    const glsl = /**glsl**/ `
      vec3 dir = normalize(vec3(${direction.join(", ")}));
      force = dir * u_strength * mass;
    `;

    super(glsl);
    this.uniforms = {
      u_strength: strength,
    };
  }
}