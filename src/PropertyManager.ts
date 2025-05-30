import { Constraint } from "@/constraints/Constraint";
import { FBO } from "@/FBO";
import * as THREE from "three";
import { Particle } from "@/Particle";
import { Property } from "@/Property";

// Types
export type PropertyManagerParams = {
  width?: number;
  height?: number;
  renderer?: THREE.WebGLRenderer;
};

export class PropertyManager {
  uuid: string = crypto.randomUUID();

  // Properties
  properties: Map<string, Property> = new Map<string, Property>();

  // FBOs
  scene: THREE.Scene = new THREE.Scene();
  camera: THREE.OrthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  renderer: THREE.WebGLRenderer;
  height: number = 512;
  width: number = 512;
  fbos: Map<string, FBO> = new Map();

  constructor({ renderer = new THREE.WebGLRenderer(), width = 512, height = 512 }: PropertyManagerParams) {
    if (!renderer || !(renderer instanceof THREE.WebGLRenderer)) {
      throw new Error("Invalid renderer provided. Must be an instance of THREE.WebGLRenderer.");
    }
    if (width <= 0 || height <= 0) {
      throw new Error("Width and height must be positive numbers.");
    }

    this.renderer = renderer;
    this.width = width;
    this.height = height;

    // Initialize camera
    this.camera.position.set(0, 0, 1);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.camera.updateProjectionMatrix();
  }

  add(name: string, size: number, defaultValue?: Float32Array): this {
    if (this.properties.has(name)) {
      console.warn(`Property "${name}" already exists. Overwriting.`);
    }

    const fbo = new FBO({
      name,
      width: this.width,
      height: this.height,
      renderer: this.renderer,
      camera: this.camera,
      channels: size,
    });

    const property = new Property({
      name,
      size,
      defaultValue: defaultValue,
      fbo: fbo,
    });

    this.fbos.set(name, fbo);
    this.properties.set(name, property);

    console.log(this.properties, this.fbos);

    return this;
  }

  constrain(name: string, constraint: Constraint): this {
    if (!(constraint instanceof Constraint)) {
      throw new Error("Constraint must be an instance of the Constraint class.");
    }

    const property = this.properties.get(name);

    if (!property) {
      throw new Error(`Property "${name}" does not exist.`);
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
    const properties: Property[] = [];

    for (let i = 0; i < names.length; i++) {
      const name = names[i];

      const property = this.properties.get(name);
      if (!property) {
        throw new Error(`Property "${name}" does not exist.`);
      }

      if (property.fbo.properties.length > 1) {
        throw new Error(`Property "${name}" is already grouped.`);
      }

      if (property.size + channelOffset > 4) {
        throw new Error(`Cannot group property "${name}" with size ${property.size} at offset ${channelOffset}. Total exceeds 4.`);
      }

      property.channelOffset = channelOffset;
      channelOffset += property.size;

      // Delete the exsiting FBO for this property
      this.fbos.get(name)?.dispose();
      this.fbos.delete(name);

      // For the first name, just use it as is; for others, capitalize first letter
      fboName += name.charAt(0).toUpperCase() + name.slice(1);

      properties.push(property);
    }

    // Create a new FBO for the group
    const groupFBO = new FBO({
      name: fboName,
      width: this.width,
      height: this.height,
      renderer: this.renderer,
      camera: this.camera,
      properties: properties,
      channels: channelOffset,
    });

    // Add the new FBO to the manager
    this.fbos.set(fboName, groupFBO);
    for (const property of properties) {
      property.fbo = groupFBO;
    }

    return this;
  }

  link(source: string, target: string, bidirectional: Boolean = false): this {
    const sourceProperty = this.properties.get(source);
    const targetProperty = this.properties.get(target);

    if (!sourceProperty || !targetProperty) {
      throw new Error(`One or both properties "${source}" and "${target}" do not exist.`);
    }

    const sourceFBO = sourceProperty.fbo;
    const targetFBO = targetProperty.fbo;

    // We can remove the dependencies and directly link the FBO uniforms (if needed in the future)
    sourceFBO.dependencies.add(targetFBO);
    if (bidirectional) {
      targetFBO.dependencies.add(sourceFBO);
    }

    return this;
  }

  linkAll(): this {
    let fboSet = new Set(this.fbos.values());
    for (const fbo of fboSet) {
      fbo.dependencies = new Set(fboSet);
    }

    return this;
  }

  build(): this {
    this.fbos.values().forEach((fbo) => {
      fbo.build();
    });
    return this;
  }

  getFBO(name: string): FBO {
    const property = this.properties.get(name);
    if (!property) {
      throw new Error(`FBO "${name}" does not exist.`);
    }
    return property.fbo;
  }

  setUniforms(name: string, uniforms: Record<string, any>): this {
    const property = this.properties.get(name);

    if (!property) {
      throw new Error(`Property "${name}" does not exist.`);
    }

    for (const [key, value] of Object.entries(uniforms)) {
      if (property.fbo.material.uniforms[key]) {
        property.fbo.material.uniforms[key].value = value;
      } else {
        property.fbo.material.uniforms[key] = { value: value };
      }
    }
    return this;
  }

  setUniformsAll(uniforms: Record<string, any>): this {
    for (const property of this.properties.values()) {
      for (const [key, value] of Object.entries(uniforms)) {
        if (property.fbo.material.uniforms[key]) {
          property.fbo.material.uniforms[key].value = value;
        } else {
          property.fbo.material.uniforms[key] = { value: value };
        }
      }
    }
    return this;
  }

  update(names: string[] = []): this {
    // TODO: Maybe switch to needUpdate flag for each FBO / Property

    if (names.length === 0) {
      // Update all FBOs if no specific names are provided
      return this.updateAll();
    }

    const fbosToUpdate: Set<FBO> = new Set();
    for (const name of names) {
      const property = this.properties.get(name);
      if (!property) {
        console.warn(`Property "${name}" does not exist. Skipping update.`);
        continue;
      }

      fbosToUpdate.add(property.fbo);
    }

    for (const fbo of fbosToUpdate) {
      fbo.update();
    }

    return this;
  }

  updateAll(): this {
    for (const fbo of this.fbos.values()) {
      fbo.update();
    }
    return this;
  }

  injectFBOs(data: Record<string, Float32Array>, offset: number = 0): this {
    for (const fboName in data) {
      const fbo = this.fbos.get(fboName);
      if (!fbo) {
        throw new Error(`FBO "${fboName}" does not exist.`);
      }

      fbo.inject(data[fbo.name], offset);
    }

    return this;
  }

  injectFBO(name: string, data: Float32Array, offset: number = 0): this {
    const fbo = this.fbos.get(name);
    if (!fbo) {
      throw new Error(`FBO "${name}" does not exist.`);
    }
    fbo.inject(data, offset);
    return this;
  }

  inject(name: string, data: Float32Array, offset: number = 0): this {
    const property = this.properties.get(name);
    if (!property) {
      throw new Error(`Property "${name}" does not exist.`);
    }

    const fbo = property.fbo;
    fbo.inject(data, offset);

    return this;
  }

  dispose(): void {
    this.fbos.forEach((fbo) => {
      fbo.dispose();
    });
    this.fbos.clear();
    this.properties.clear();
    this.scene.clear();
  }
}
