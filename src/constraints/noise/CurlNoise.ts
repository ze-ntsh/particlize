import { Constraint } from "../Constraint";

export class CurlNoiseForce extends Constraint {
  constructor(scale: number, strength: number) {
    const glsl = /**glsl**/ `
      vec3 curl = curlNoise(position * u_scale + u_Time);
      force += curl * u_strength * mass;
    `;

    super(glsl);
    this.uniforms = {
      u_strength: strength,
      u_scale: scale,
    };
  }
}
