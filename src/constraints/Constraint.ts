import { getGLSLValue } from "@/utils";
import * as THREE from "three";

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

  protected build(params: Record<string, { value: number | number[]; hardcode?: boolean }>) {
    let glsl = this.glsl;
    for (const [key, param] of Object.entries(params)) {
      // The key is #uppercase<key> in the GLSL code
      const glslKey = `#${key.toUpperCase()}`;
      if (param.hardcode == true || param.hardcode === undefined) {
        // Replace the placeholder with the actual value
        glsl = glsl.replace(new RegExp(glslKey, "g"), getGLSLValue(param.value));
      } else {
        // Use a uniform variable instead
        const uniformName = `u_${this.name}_${key}`;
        this.uniforms[uniformName] = param.value;
        glsl = glsl.replace(new RegExp(glslKey, "g"), uniformName);
      }
    }
    this.glsl = glsl;
  }
}
