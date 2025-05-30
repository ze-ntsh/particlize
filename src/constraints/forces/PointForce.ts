import { Constraint } from "../Constraint";

export class PointForce extends Constraint {
  constructor(center: [number, number, number], strength: [number, number, number] = [0, 0, 0]) {
    const glsl = /**glsl**/ `
      vec3 toPoint = vec3(${center.join(", ")}) - position;
      float dist = length(toPoint) + 1e-5;
      vec3 dir = normalize(toPoint);
      force = dir * u_strength * mass / (dist * dist);
    `;

    super(glsl);
    this.uniforms = {
      u_strength: strength,
    };
  }
}
