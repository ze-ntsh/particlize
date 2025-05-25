import * as THREE from "three";
import { FBO } from "./FBO";

type FBOConfig = {
  name: string;
  vertexShader?: string;
  fragmentShader?: string;
  uniforms?: Record<string, THREE.IUniform>;
};

export class FBOManager {
  fbos: Map<string, FBO> = new Map();
  height: number;
  width: number;
  max: number = 0;
  renderer: THREE.WebGLRenderer;
  fboRenderer: THREE.WebGLRenderer | undefined;
  camera: THREE.OrthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);

  // Visualization
  gridCols: number = 0;
  gridRows: number = 0;
  tileSize: number = 0;
  visScene: THREE.Scene | null = null;
  visCamera: THREE.OrthographicCamera | null = null;

  constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
    this.renderer = renderer;
    this.width = width;
    this.height = height;
    this.max = height * width;
  }

  addFBO(config: FBOConfig) {
    if (this.fbos.has(config.name)) {
      console.warn(`FBO with name ${config.name} already exists.`);
      return;
    }

    const fbo = new FBO(
      config.name,
      this.width,
      this.height,
      this.renderer,
      this.camera,
      new THREE.ShaderMaterial({
        vertexShader: config.vertexShader,
        fragmentShader: config.fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uDelta: { value: 0 },
          uTextureResolution: { value: new THREE.Vector2(this.width, this.height) },
        },
      })
    );
    this.fbos.set(config.name, fbo);

    // Set up inter-FBO uniforms by reference
    for (const [otherName, otherFBO] of this.fbos) {
      const uniformName = `u${otherName.charAt(0).toUpperCase() + otherName.slice(1)}Texture`;
      fbo.material.uniforms[uniformName] = { value: otherFBO.read.texture };
      // Also add this FBO's texture as a uniform to the others
      if (otherName !== fbo.name) {
        const thisUniformName = `u${fbo.name.charAt(0).toUpperCase() + fbo.name.slice(1)}Texture`;
        otherFBO.material.uniforms[thisUniformName] = { value: fbo.read.texture };
      }
    }

    // Set initial uniforms
    if (config.uniforms) {
      Object.assign(fbo.material.uniforms, config.uniforms);
    }
  }

  getFBO(name: string): FBO | undefined {
    return this.fbos.get(name);
  }

  setUniforms(name: string, uniforms: Record<string, THREE.IUniform>) {
    const fbo = this.fbos.get(name);
    if (!fbo) return;
    // Update the FBO's uniforms
    Object.assign(fbo.material.uniforms, uniforms);
  }

  setUniformsAll(uniformsMap: Record<string, THREE.IUniform>) {
    for (const [name, _] of this.fbos) {
      this.setUniforms(name, uniformsMap);
    }
  }

  update(names: string[]) {
    for (const name of names) {
      const fbo = this.fbos.get(name);
      if (!fbo) return;

      // Inter FBO uniforms
      for (const [otherName, otherFBO] of this.fbos) {
        const uniformName = `u${otherName.charAt(0).toUpperCase() + otherName.slice(1)}Texture`;
        fbo.material.uniforms[uniformName].value = otherFBO.read.texture;
      }

      fbo.update();
    }
  }

  inject(data: Record<string, Float32Array>, offset: number = 0) {
    for (const [name, fbo] of this.fbos) {
      const dataArray = data[name];
      if (dataArray) {
        fbo.inject(dataArray, offset);
      }
    }
  }

  updateAll() {
    this.update(Array.from(this.fbos.keys()));
  }

  removeFBO(name: string) {
    const fbo = this.fbos.get(name);
    if (fbo) {
      this.fbos.delete(name);
      fbo.dispose();
    }
  }
}
