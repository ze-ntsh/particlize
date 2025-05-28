export class Constraint {
  glsl: string = "";
  uniforms: Record<string, any> = {};

  constructor(glsl: string) {
    this.glsl = glsl;
  }

  toGLSL(): string {
    return this.glsl;
  }
}
