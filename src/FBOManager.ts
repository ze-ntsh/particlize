import * as THREE from "three";
import { FBOPass } from "./FBO";

class FBOManager {
  materials: Map<string, THREE.MeshStandardMaterial> = new Map();
  fbos: Map<string, FBOPass> = new Map();
  scene: THREE.Scene = new THREE.Scene();
  camera: THREE.OrthographicCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  renderer: THREE.WebGLRenderer;
  uniforms: Record<string, THREE.IUniform> = {};

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
  }

  addFBO(name: string, height: number, width: number) {
    if (this.fbos.has(name)) {
      console.warn(`FBO with name ${name} already exists.`);
      return;
    }

    const fbo = new FBOPass(height, width, this.renderer, material);
    this.fbos.set(name, fbo);
    this.scene.add(fbo.scene);
  }
}
