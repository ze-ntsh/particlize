export class Constraint {
  name: string = "";
  active: boolean = true;
  glsl: string = "";
  uniforms: Record<string, any> = {};

  constructor(name: string, glsl: string = "", uniforms: Record<string, any> = {}) {
    this.name = name;
    this.glsl = glsl;
    this.uniforms = uniforms;
  }
}
