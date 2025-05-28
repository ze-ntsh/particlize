import * as THREE from "three";
import { Property } from "@/Property";
import { Constraint } from "@/constraints/Constraint";

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
  constraints: Constraint[] = [];

  material: THREE.ShaderMaterial = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {},
  });
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;

  // Scene
  scene: THREE.Scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;

  constructor(props: {
    name: string;
    width: number;
    height: number;
    renderer: THREE.WebGLRenderer;
    camera: THREE.OrthographicCamera;
    properties?: Property[];
  }) {
    // Constructor properties
    this.name = props.name;
    this.textureName = `u${this.name.charAt(0).toUpperCase() + this.name.slice(1)}Texture`;
    this.height = props.height;
    this.width = props.width;
    this.renderer = props.renderer;
    this.camera = props.camera;

    this.read = new THREE.WebGLRenderTarget(this.width, this.height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      depthBuffer: false,
      stencilBuffer: false,
    });
    this.write = this.read.clone();
    this.renderer.initRenderTarget(this.read);
    this.renderer.initRenderTarget(this.write);

    // Initialize properties
    if (props.properties) {
      this.properties = props.properties;
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

      for (const property of dependancyFBO.properties) {
        let type = property.size > 1 ? `vec${property.size}` : "float";
        let channels = "xyzw".slice(property.channelOffset, property.channelOffset + property.size);
        propertyUnpacking += `${type} ${property.name} = texture(${dependancyFBO.textureName}, vUv).${channels};\n`;
      }
    }

    for (const uniformName in this.material.uniforms) {
      let type = "";
      const uniformValue = this.material.uniforms[uniformName].value;
      if (uniformValue instanceof THREE.Texture) {
        type = "sampler2D";
      } else if (uniformValue instanceof THREE.Vector2) {
        type = "vec2";
      } else if (uniformValue instanceof THREE.Vector3) {
        type = "vec3";
      } else if (uniformValue instanceof THREE.Vector4) {
        type = "vec4";
      } else if (typeof uniformValue === "number") {
        type = "float";
      }

      if (type) {
        uniformString += `uniform ${type} ${uniformName};\n`;
      } else {
        console.warn(`Unsupported uniform type for ${uniformName}:`, uniformValue);
      }
    }

    for (const constraint of this.constraints) {
      constraints += constraint.toGLSL() + "\n";
    }

    let returnMap: Record<string, string | null> = {
      "#X": null,
      "#Y": null,
      "#Z": null,
      "#W": null,
    };
    for (const property of this.properties) {
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
    if (data.length % 4 !== 0) {
      throw new Error("Data length must be a multiple of 4 for RGBA format.");
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
    this.scene.removeFromParent();
  }
}
