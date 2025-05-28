import { Constraint } from "@/constraints/Constraint";
import { FBO } from "@/FBO";
import * as THREE from "three";
import { Particle } from "@/Particle";
import { Property } from "@/Property";

export class PropertyManager {
  // Properties
  properties: Record<string, Property> = {};

  // FBOs
  scene: THREE.Scene = new THREE.Scene();
  camera: THREE.OrthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  renderer: THREE.WebGLRenderer;
  height: number = 512;
  width: number = 512;
  max: number = 0;
  fbos: Record<string, FBO> = {};

  // Basic shader
  basicShader: THREE.ShaderMaterial = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: /*glsl */ `
      varying vec2 vUv;
      //UNIFORMS
      void main() {
        //PROPERTY_UNPACKING
        //CONSTRAINTS
        //REPACKING_RETURN
      }
    `,
  });

  constructor(renderer: THREE.WebGLRenderer, width: number = 512, height: number = 512) {
    this.renderer = renderer;
    this.width = width;
    this.height = height;
    this.max = width * height;

    // Initialize camera
    this.camera.position.set(0, 0, 1);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.camera.updateProjectionMatrix();
  }

  add(name: string, size: number, defaultValue?: Float32Array): this {
    if (this.properties[name]) {
      console.warn(`Property "${name}" already exists. Overwriting.`);
      // delete this.properties[name];
      // delete this.fbos[name];
    }

    const fbo = new FBO({
      name,
      width: this.width,
      height: this.height,
      renderer: this.renderer,
      camera: this.camera,
    });

    const property = new Property({
      name,
      size,
      defaultValue: defaultValue,
      fbo: fbo,
    });

    this.fbos[name] = fbo;
    this.properties[name] = property;

    return this;
  }

  constrain(name: string, constraint: Constraint): this {
    if (!this.properties[name]) {
      throw new Error(`Property "${name}" does not exist.`);
    }

    const property = this.properties[name];
    if (!property.fbo) {
      throw new Error(`FBO for property "${name}" has not been built yet.`);
    }

    property.fbo.constraints.push(constraint);

    return this;
  }

  group(names: string[]): this {
    if (names.length < 2) {
      throw new Error("Group must contain at least two properties.");
    }
    let fboName = "";
    let channelOffset = 0;
    const properties = names.map((name, index) => {
      if (!this.properties[name]) {
        throw new Error(`Property "${name}" does not exist.`);
      }
      const property = this.properties[name];
      if (property.fbo.properties.length > 1) {
        throw new Error(`Property "${name}" is already grouped.`);
      }
      if (property.size + channelOffset > 4) {
        throw new Error(`Cannot group property "${name}" with size ${property.size} at offset ${channelOffset}. Total exceeds 4.`);
      }

      property.channelOffset = channelOffset;
      channelOffset += property.size;

      // For the first name, just use it as is; for others, capitalize first letter
      fboName += index === 0 ? name : name.charAt(0).toUpperCase() + name.slice(1);
      return this.properties[name];
    });

    // Create a new FBO for the group
    const groupFBO = new FBO({
      name: fboName,
      width: this.width,
      height: this.height,
      renderer: this.renderer,
      camera: this.camera,
      properties: properties,
    });

    // Remove existing FBOs for these properties
    for (const name of names) {
      if (this.fbos[name]) {
        delete this.fbos[name];
      }
    }

    // Add the new FBO to the manager
    this.fbos[fboName] = groupFBO;
    for (const property of properties) {
      property.fbo = groupFBO;
    }

    return this;
  }

  link(source: string, target: string, bidirectional: Boolean = false): this {
    if (!this.properties[source] || !this.properties[target]) {
      throw new Error(`One or both properties "${source}" and "${target}" do not exist.`);
    }

    const sourceFBO = this.properties[source].fbo;
    const targetFBO = this.properties[target].fbo;

    if (!sourceFBO || !targetFBO) {
      throw new Error(`One or both FBOs for "${source}" and "${target}" do not exist.`);
    }

    // We can remove the dependencies and directly link the FBO uniforms (if needed in the future)
    sourceFBO.dependencies.add(targetFBO);
    if (bidirectional) {
      targetFBO.dependencies.add(sourceFBO);
    }

    return this;
  }

  linkAll(): this {
    for (const fbo of Object.values(this.fbos)) {
      fbo.dependencies = new Set(Object.values(this.fbos));
    }

    return this;
  }

  build(): this {
    for (const fboName in this.fbos) {
      this.fbos[fboName].build();
    }
    return this;
  }

  get(name: string): FBO {
    if (!this.properties[name]) {
      throw new Error(`FBO "${name}" does not exist.`);
    }
    return this.properties[name].fbo;
  }

  validate(particle: Particle) {
    for (const name in this.properties) {
      const property = this.properties[name];
      if (!(name in particle)) {
        particle[name] = property.defaultValue.slice();
      }
      const value = particle[name];
      if (value.length !== property.size) {
        throw new Error(`Property "${name}" has incorrect size in particle instance. Expected ${property.size}, got ${value.length}.`);
      }
    }
    return this;
  }

  setUniforms(name: string, uniforms: Record<string, any>): this {
    if (!this.properties[name]) {
      throw new Error(`Property "${name}" does not exist.`);
    }

    const property = this.properties[name];
    for (const [key, value] of Object.entries(uniforms)) {
      if (!property.fbo) {
        throw new Error(`Build the property manager before setting uniforms for "${name}".`);
      }

      if (property.fbo.material.uniforms[key]) {
        property.fbo.material.uniforms[key].value = value;
      } else {
        property.fbo.material.uniforms[key] = { value: value };
      }
    }
    return this;
  }

  setUniformsAll(uniforms: Record<string, any>): this {
    for (const name in this.properties) {
      this.setUniforms(name, uniforms);
    }
    return this;
  }

  update(names: string[] = []): this {
    if (names.length === 0) {
      // Update all FBOs if no specific names are provided
      return this.updateAll();
    }

    const fbosToUpdate: Set<FBO> = new Set();
    for (const name of names) {
      if (!this.properties[name]) {
        console.warn(`Property "${name}" does not exist. Skipping update.`);
      }

      fbosToUpdate.add(this.properties[name].fbo);
    }

    for (const fbo of fbosToUpdate) {
      fbo.update();
    }

    return this;
  }

  updateAll(): this {
    for (const fboName in this.fbos) {
      this.fbos[fboName].update();
    }
    return this;
  }

  inject(data: Record<string, Float32Array>, offset: number = 0): this {
    for (const fboName in data) {
      const fbo = this.fbos[fboName];
      if (!fbo) {
        throw new Error(`FBO "${fboName}" does not exist.`);
      }

      fbo.inject(data[fbo.name], offset);
    }

    return this;
  }
}
