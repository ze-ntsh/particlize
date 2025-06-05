'use strict';

class Constraint {
    name = "";
    active = true;
    glsl = "";
    params;
    uniforms = {};
    constructor(name, glsl = "", uniforms = {}) {
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

exports.Constraint = Constraint;
