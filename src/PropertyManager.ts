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

/*
 * PropertyManager is responsible for managing properties, their FBOs, and constraints.
 * It allows adding, constraining, grouping, linking, and updating properties.
 */
export class PropertyManager {
  uuid: string = crypto.randomUUID();

  // Properties
  properties: Map<string, Property> = new Map<string, Property>();

  // Basic scene setup
  scene: THREE.Scene = new THREE.Scene();
  camera: THREE.OrthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  renderer: THREE.WebGLRenderer;
  height: number = 512;
  width: number = 512;

  // The framebuffer objects (FBOs) for each property
  fbos: Map<string, FBO> = new Map();

  /**
   * Constructor for PropertyManager
   * @param {PropertyManagerParams} params - Parameters for the PropertyManager
   * @param {THREE.WebGLRenderer} params.renderer - The WebGL renderer to use
   * @param {number} params.width - Width of the Framebuffer Objects (FBOs)
   * @param {number} params.height - Height of the Framebuffer Objects (FBOs)
   */
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

  /**
   * Adds a new property to the PropertyManager.
   * @param {string} name - The name of the property.
   * @param {number} size - The size of the property (number of channels).
   * @param {Float32Array} [defaultValue] - Optional default value for the property.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
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

    return this;
  }

  /**
   * Adds a constraint to a specific property's FBO. When properties are grouped, the FBO is the same for all properties.
   * @param {string} name - The name of the property to constrain.
   * @param {Constraint} constraint - The constraint to add.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
  constrain(name: string, constraint: Constraint): this {
    if (!(constraint instanceof Constraint)) {
      throw new Error("Constraint must be an instance of the Constraint class.");
    }

    const property = this.properties.get(name);

    if (!property) {
      throw new Error(`Property "${name}" does not exist.`);
    }

    property.fbo.constraints.set(constraint.name, constraint);
    property.fbo.needsRebuild = true;

    return this;
  }

  /**
   * Adds a constraint to all properties' FBOs.
   * @param {Constraint} constraint - The constraint to add.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
  constrainAll(constraint: Constraint): this {
    if (!(constraint instanceof Constraint)) {
      throw new Error("Constraint must be an instance of the Constraint class.");
    }

    for (const fbo of this.fbos.values()) {
      fbo.constraints.set(constraint.name, constraint);
      fbo.needsRebuild = true;
    }

    return this;
  }

  /**
   * Activates a constraint for a specific property and marks the FBO for rebuild.
   * @param {string} name - The name of the property.
   * @param {string} constraintName - The name of the constraint to activate.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
  activateConstraint(name: string, constraintName: string): this {
    const property = this.properties.get(name);
    if (!property) {
      throw new Error(`Property "${name}" does not exist.`);
    }

    const constraint = property.fbo.constraints.get(constraintName);
    if (!constraint) {
      throw new Error(`Constraint "${constraintName}" does not exist for property "${name}".`);
    }

    console.log(`Activating constraint "${constraintName}" for property "${name}".`, constraint.active);
    if (!constraint.active) {
      constraint.active = true;
      property.fbo.needsRebuild = true;
    }

    return this;
  }

  /**
   * Deactivates a constraint for a specific property and marks the FBO for rebuild.
   * @param {string} name - The name of the property.
   * @param {string} constraintName - The name of the constraint to deactivate.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
  deactivateConstraint(name: string, constraintName: string): this {
    const property = this.properties.get(name);
    if (!property) {
      throw new Error(`Property "${name}" does not exist.`);
    }
    const constraint = property.fbo.constraints.get(constraintName);
    if (!constraint) {
      throw new Error(`Constraint "${constraintName}" does not exist for property "${name}".`);
    }

    if (constraint.active) {
      constraint.active = false;
      property.fbo.needsRebuild = true;
    }

    return this;
  }

  /**
   * Deletes a constraint from a specific property's FBO and marks the FBO for rebuild.
   * @param {string} name - The name of the property.
   * @param {string} constraintName - The name of the constraint to delete.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
  deleteConstraint(name: string, constraintName: string): this {
    const property = this.properties.get(name);

    if (!property) {
      throw new Error(`Property "${name}" does not exist.`);
    }

    const constraint = property.fbo.constraints.get(constraintName);
    if (!constraint) {
      throw new Error(`Constraint "${constraintName}" does not exist for property "${name}".`);
    }
    property.fbo.constraints.delete(constraintName);
    return this;
  }

  /**
   * Groups (packs) multiple properties into a single FBO. Grouped properties must have sizes that fit within 4 channels.
   * Grouping must be done before linking, adding constraints or uniforms as original FBOs will be deleted and replaced with the new grouped FBO.
   *
   * Eg: If you group properties "a" (size 1), "b" (size 2), and "c" (size 1), the new FBO will have a total of 4 channels.
   * This means you can access them as a single texture with 4 channels, where:
   * - "a" will be in channel 0 (red),
   * - "b" will occupy channels 1 and 2 (green and blue),
   * - "c" will be in channel 3 (alpha).
   * This allows for efficient packing of properties into a single FBO, reducing the number of textures and draw calls needed.
   *
   * Properties that are already grouped cannot be grouped again.
   *
   * @param {string[]} names - An array of property names to group.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
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

      // underscore between names
      fboName += (i > 0 ? "_" : "") + name;

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

  /**
   * Links two properties' FBOs together, allowing one to read from the other.
   * A uniform in the source FBO will be set to the target FBO's texture.
   * @param {string} source - The name of the source property.
   * @param {string} target - The name of the target property.
   * @param {boolean} [bidirectional=false] - If true, links both properties bidirectionally.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
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

  /**
   * Links all properties' FBOs together, allowing each to read from all others.
   * This is useful for creating a fully connected graph of FBOs.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   **/
  linkAll(): this {
    let fboSet = new Set(this.fbos.values());
    for (const fbo of fboSet) {
      fbo.dependencies = new Set(fboSet);
    }

    return this;
  }

  /**
   * Builds all FBOs, applying constraints and preparing them for rendering.
   * This should be called in the end after all properties have been added, grouped, linked, and constrained.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
  build(): this {
    this.fbos.values().forEach((fbo) => {
      fbo.needsRebuild = true;
    });
    return this;
  }

  /**
   * Sets uniforms for a specific property by name.
   * Groups of properties will share the same FBO, so this will set uniforms for all properties in the group.
   * @param {string} name - The name of the property to set uniforms for.
   * @param {Record<string, any>} uniforms - An object containing uniform names and their values.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
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

  /**
   * Sets uniforms for all properties' FBOs.
   * This will apply the same uniforms to all FBOs, which is useful for global settings.
   * @param {Record<string, any>} uniforms - An object containing uniform names and their values.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   * */
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

  /**
   * Updates the FBOs for specific properties or all properties if no names are provided.
   * This will mark the FBOs as needing an update and rebuild them if necessary.
   * @param {string[]} [names=[]] - An array of property names to update. If empty, updates all properties.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
  update(names: string[] = []): this {
    // TODO: Maybe switch to needUpdate flag for each FBO / Property

    if (names.length === 0) {
      // Update all FBOs if no specific names are provided
      for (const fbos of this.fbos.values()) {
        fbos.needsUpdate = true;
      }
    } else {
      for (const name of names) {
        const property = this.properties.get(name);
        if (!property) {
          console.warn(`Property "${name}" does not exist. Skipping update.`);
          continue;
        }
        property.fbo.needsUpdate = true;
      }
    }

    this.updateHelper();

    return this;
  }

  private updateHelper(): void {
    this.fbos.forEach((fbo) => {
      if (fbo.needsUpdate) {
        fbo.update();
      }
    });
  }

  /**
   * Injects data into multiple FBOs from an object of Float32Arrays.
   * The keys of the object should match the FBO names (note: different from property names).
   * @param {Record<string, Float32Array>} data - An object containing FBO names as keys and Float32Arrays as values.
   * @param {number} [offset=0] - Optional offset to start injecting data from.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
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

  /**
   * Injects data into a specific FBO by name.
   * @param {string} name - The name of the FBO to inject data into (should match the FBO name, not the property name).
   * @param {Float32Array} data - The Float32Array data to inject.
   * @param {number} [offset=0] - Optional offset to start injecting data from.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
  injectFBO(name: string, data: Float32Array, offset: number = 0): this {
    const fbo = this.fbos.get(name);
    if (!fbo) {
      throw new Error(`FBO "${name}" does not exist.`);
    }
    fbo.inject(data, offset);
    return this;
  }

  /**
   * Injects data into a specific property by name.
   * This will inject the data into the FBO associated with the property.
   * @param {string} name - The name of the property to inject data into.
   * @param {Float32Array} data - The Float32Array data to inject.
   * @param {number} [offset=0] - Optional offset to start injecting data from.
   * @return {PropertyManager} Returns the PropertyManager instance for chaining.
   */
  inject(name: string, data: Float32Array, offset: number = 0): this {
    const property = this.properties.get(name);
    if (!property) {
      throw new Error(`Property "${name}" does not exist.`);
    }

    const fbo = property.fbo;
    fbo.inject(data, offset);

    return this;
  }

  /**
   * Disposes of all resources used by the PropertyManager.
   * This includes disposing of all FBOs, clearing properties, and clearing the scene.
   * @return {this} Returns the PropertyManager instance for chaining.
   * */
  dispose(): this {
    this.fbos.forEach((fbo) => {
      fbo.dispose();
    });
    this.fbos.clear();
    this.properties.clear();
    this.scene.clear();

    return this;
  }
}
