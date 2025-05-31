import * as THREE from "three";
import { Property } from "@/Property";
import { Constraint } from "@/constraints/Constraint";
import { getGLSLType } from "./utils";

// Types
export type FBOParams = {
  name: string;
  width: number;
  height: number;
  renderer: THREE.WebGLRenderer;
  camera: THREE.OrthographicCamera;
  properties?: Property[];
  channels?: number;
};

const formats = [THREE.RedFormat, THREE.RGFormat, THREE.RGBFormat, THREE.RGBAFormat];

export class FBO {
  // FBO properties
  uuid: string = crypto.randomUUID();
  name: string;
  textureName: string;
  height: number;
  width: number;
  renderer: THREE.WebGLRenderer;

  properties: Property[] = [];
  dependencies: Set<FBO> = new Set();
  constraints: Map<string, Constraint> = new Map<string, Constraint>();
  channels: number = 4; // Default to RGBA

  material: THREE.ShaderMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {},
  });
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;

  injectBuffer: Map<string, Float32Array> = new Map<string, Float32Array>();
  needsUpdate: boolean = false;

  // Scene
  scene: THREE.Scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;

  constructor({
    name,
    width,
    height,
    renderer,
    camera,
    properties = [],
    channels = 4, // Default to RGBA
  }: FBOParams) {
    // Constructor properties
    this.name = name;
    this.textureName = `u_${this.name}_texture`;
    this.height = height;
    this.width = width;
    this.renderer = renderer;
    this.camera = camera;

    // Set channels
    if (channels) {
      // clamp channels to 1-4
      this.channels = Math.max(1, Math.min(channels, 4));
      // if channels is 3, set it to 4 (THREE.js does not support RGB textures in WebGL2)
      if (this.channels === 3) {
        this.channels = 4;
      }
    }
    this.read = new THREE.WebGLRenderTarget(this.width, this.height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: formats[this.channels - 1] || THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.write = this.read.clone();
    this.renderer.initRenderTarget(this.read);
    this.renderer.initRenderTarget(this.write);

    // Initialize properties
    if (properties) {
      this.properties = properties;
    }

    // Self-dependency
    this.dependencies.add(this);
  }

  build() {
    // Dynamic shader material creation
    let vertex = /* glsl */ `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;

    let fragment = /* glsl */ `
      in vec2 vUv;
      #UNIFORMS
      out vec4 fragColor;
      void main() {
        #PROPERTY_UNPACKING
        #CONSTRAINTS
        #REPACKING_RETURN
      }
    `;
    let uniformString = "";
    let propertyUnpacking = "";
    let constraints = "";
    let repackingReturn = "fragColor = vec4(#X, #Y, #Z, #W);";

    for (const dependancyFBO of this.dependencies) {
      // Add uniform for the FBO texture
      this.material.uniforms[dependancyFBO.textureName] = { value: dependancyFBO.read.texture };

      for (const property of dependancyFBO.properties.values()) {
        let type = property.size > 1 ? `vec${property.size}` : "float";
        let channels = "xyzw".slice(property.channelOffset, property.channelOffset + property.size);
        propertyUnpacking += `${type} ${property.name} = texture(${dependancyFBO.textureName}, vUv).${channels};\n`;
      }
    }

    console.log(this.material.uniforms);
    for (const uniformName in this.material.uniforms) {
      const uniformValue = this.material.uniforms[uniformName].value;
      let type = getGLSLType(uniformValue);

      if (type) {
        uniformString += `uniform ${type} ${uniformName};\n`;
      } else {
        console.warn(`Unsupported uniform type for ${uniformName}:`, uniformValue);
      }
    }

    for (const constraint of this.constraints.values()) {
      for (const uniformName in constraint.uniforms) {
        const uniformValue = constraint.uniforms[uniformName];
        let type = getGLSLType(uniformValue);

        if (type) {
          this.material.uniforms[uniformName] = { value: uniformValue };
          uniformString += `uniform ${type} ${uniformName};\n`;
        } else {
          console.warn(`Unsupported uniform type for ${uniformName}:`, uniformValue);
        }
      }

      constraints += constraint.glsl + "\n";
    }

    let returnMap: Record<string, string | null> = {
      "#X": null,
      "#Y": null,
      "#Z": null,
      "#W": null,
    };
    for (const property of this.properties.values()) {
      for (let i = 0; i < property.size; i++) {
        let returnChannel = "xyzw".charAt(property.channelOffset + i);
        let propertyChannel = property.size > 1 ? "." + "xyzw".charAt(i) : "";
        if (returnMap[`#${returnChannel.toUpperCase()}`] === null) {
          returnMap[`#${returnChannel.toUpperCase()}`] = `${property.name}${propertyChannel}`;
        }
      }
    }
    for (const channel in returnMap) {
      repackingReturn = repackingReturn.replace(channel, returnMap[channel] || "0.0");
    }

    fragment = fragment
      .replace("#UNIFORMS", uniformString)
      .replace("#PROPERTY_UNPACKING", propertyUnpacking)
      .replace("#CONSTRAINTS", constraints)
      .replace("#REPACKING_RETURN", repackingReturn);

    this.material.vertexShader = vertex;
    this.material.fragmentShader = fragment;
    this.material.needsUpdate = true;

    // Add a bi-unit quad to the scene with the simulation material
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quadMesh = new THREE.Mesh(quadGeometry, this.material);
    this.scene.add(quadMesh);

    console.log(`FBO ${this.name} built with shader:\n${this.material.fragmentShader}`);
  }

  update() {
    // Update texture uniforms
    for (const dependancyFBO of this.dependencies) {
      this.material.uniforms[dependancyFBO.textureName].value = dependancyFBO.read.texture;
    }

    // Render the scene to write target
    this.renderer.setRenderTarget(this.write);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);

    // Swap the read and write targets
    const temp = this.read;
    this.read = this.write;
    this.write = temp;
  }

  // Method to add value(s) to the FBO
  inject(data: Float32Array, offset: number = 0) {
    if (data.length % this.channels !== 0) {
      throw new Error(`Data length must be a multiple of ${this.channels}.`);
    }

    if (offset < 0 || offset + data.length / 4 > this.width * this.height) {
      throw new Error("Offset + data length exceeds texture capacity.");
    }

    // if (!overwrite) {
    //   let startX = offset % this.width; // Column
    //   let startY = Math.floor(offset / this.width); // Row

    //   let endX = startX + ((data.length / 4) % this.width); // End column
    //   let endY = startY + Math.floor(data.length / 4 / this.width); // End row

    //   let height = endY - startY + 1; // Number of rows to write
    //   let width = endX - startX; // Number of columns to write

    //   // If not overwriting, read the current data from the read target
    //   let currentData = new Float32Array(this.width * this.height * 4);
    //   this.renderer.readRenderTargetPixels(this.read, startX, startY, width, height, currentData);
    // }

    // if (offset == 0 && data.length === this.width * this.height * this.channels) {
    //   console.warn("Data is exactly the size of the texture. Directly setting it.");
    //   // If the data is exactly the size of the texture, we can directly set it
    //   this.read.texture.image.data = data;
    //   this.read.texture.needsUpdate = true;
    //   return;
    // }

    //TODO: Move this to a web worker ?
    const totalPixels = data.length / 4; // Total number of RGBA pixels
    const textureWidth = this.width;
    const textureHeight = this.height;

    // Ensure the data fits within the texture dimensions
    if (offset + totalPixels > textureWidth * textureHeight) {
      console.warn("Data exceeds texture capacity. Some data will not be added.");
      return;
    }

    // Inject data row by row
    let remainingPixels = totalPixels;
    let currentOffset = offset;

    while (remainingPixels > 0) {
      const x = currentOffset % textureWidth; // Column
      const y = Math.floor(currentOffset / textureWidth); // Row

      // Calculate how many pixels can fit in the current row
      const pixelsInRow = Math.min(remainingPixels, textureWidth - x);

      // Create a DataTexture for the current chunk of data
      const chunkData = data.subarray((totalPixels - remainingPixels) * 4, (totalPixels - remainingPixels + pixelsInRow) * 4);

      const dataTexture = new THREE.DataTexture(
        chunkData,
        pixelsInRow, // Width of the chunk
        1, // Height of 1 pixel (single row)
        THREE.RGBAFormat,
        THREE.FloatType
      );
      dataTexture.needsUpdate = true;

      this.renderer.copyTextureToTexture(dataTexture, this.read.texture, null, new THREE.Vector2(x, y));

      // Update counters
      remainingPixels -= pixelsInRow;
      currentOffset += pixelsInRow;
    }

    this.read.texture.needsUpdate = true;
  }

  dispose() {
    this.read.dispose();
    this.write.dispose();
    this.material.dispose();
  }
}
