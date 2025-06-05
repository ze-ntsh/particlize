export class Constraint {
  name: string = "";
  active: boolean = true;
  glsl: string = "";
  params?: Record<string, any>;
  uniforms: Record<string, any> = {};

  constructor(name: string, glsl: string = "", uniforms: Record<string, any> = {}) {
    this.name = name;
    this.glsl = glsl;
    this.uniforms = uniforms;
  }

  build() {
    if (!this.params) {
      return;
    }

    let glsl = this.glsl;
    for (const [key, param] of Object.entries(this.params)) {
      // The key is #uppercase<key> in the GLSL code
      const glslKey = `#${key.toUpperCase()}`;

      // Use a namescoped uniform name for the parameter
      if (glsl.includes(glslKey)) {
        const uniformName = `u_${this.name}_${key}`;
        this.uniforms[uniformName] = param;
        glsl = glsl.replace(new RegExp(glslKey, "g"), uniformName);
      }

      // Namescope the variable in the GLSL code: @ is replaced with the name of the constraint
      glsl = glsl.replace(new RegExp("@", "g"), `_${this.name}`);
    }
    this.glsl = glsl;
  }
}
