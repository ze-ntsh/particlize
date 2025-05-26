import * as THREE from "three";

export class FBO {
  // FBO properties
  name: string;
  textureName: string;
  height: number;
  width: number;
  renderer: THREE.WebGLRenderer;
  material: THREE.ShaderMaterial;
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;

  // Scene
  scene: THREE.Scene = new THREE.Scene();
  camera: THREE.OrthographicCamera;

  constructor(
    name: string,
    width: number,
    height: number,
    renderer: THREE.WebGLRenderer,
    camera: THREE.OrthographicCamera,
    material: THREE.ShaderMaterial
  ) {
    // Constructor properties
    this.name = name;
    this.textureName = `u${this.name.charAt(0).toUpperCase() + this.name.slice(1)}Texture`;
    this.height = height;
    this.width = width;
    this.renderer = renderer;
    this.material = material;
    this.camera = camera;

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

    // Add a bi-unit quad to the scene with the simulation material
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    const quadMesh = new THREE.Mesh(quadGeometry, this.material);
    this.scene.add(quadMesh);
  }

  update() {
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
  inject(data: Float32Array, startIndex: number = 0) {
    const totalPixels = data.length / 4; // Total number of RGBA pixels
    const textureWidth = this.width;
    const textureHeight = this.height;

    // Ensure the data fits within the texture dimensions
    if (startIndex + totalPixels > textureWidth * textureHeight) {
      console.warn("Data exceeds texture capacity. Some data will not be added.");
      return;
    }

    // Inject data row by row
    let remainingPixels = totalPixels;
    let currentIndex = startIndex;

    while (remainingPixels > 0) {
      const x = currentIndex % textureWidth; // Column
      const y = Math.floor(currentIndex / textureWidth); // Row

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
      this.read.texture.needsUpdate = true;

      // Update counters
      remainingPixels -= pixelsInRow;
      currentIndex += pixelsInRow;
    }

    // // Console log the read texture data for debugging
    // const buffer = new Float32Array(this.width * this.height * 4);
    // this.renderer.readRenderTargetPixels(this.read, 0, 0, this.width, this.height, buffer);
    // console.log(this.name, this.textureName, this.material.uniforms, "Read Texture Data:", buffer);
  }

  remove(index: number) {
    // Set the pixel to zero
    const data = new Float32Array(4);

    const x = index % this.width; // Column
    const y = Math.floor(index / this.width); // Row
    const dataTexture = new THREE.DataTexture(
      data,
      1, // Width of the chunk
      1, // Height of 1 pixel (single row)
      THREE.RGBAFormat,
      THREE.FloatType
    );
    dataTexture.needsUpdate = true;

    this.renderer.copyTextureToTexture(dataTexture, this.read.texture, null, new THREE.Vector2(x, y));
    this.read.texture.needsUpdate = true;
  }

  dispose() {
    this.read.dispose();
    this.write.dispose();
    this.material.dispose();
    this.scene.removeFromParent();
  }
}
