import * as THREE from "three";
import { FBO } from "./FBO";

type FBOProps = {
  name: string;
  propertyOffsets: Map<string, number>;
  vertexShader?: string;
  fragmentShader: string;
  uniforms?: Record<string, THREE.IUniform>;
};

export class FBOManager {
  fbos: Map<string, FBO> = new Map();
  propertyToFBOMap: Record<string, [string, number]> = {};
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

  addFBO(props: FBOProps) {
    if (this.fbos.has(props.name)) {
      console.warn(`FBO with name ${props.name} already exists.`);
      return;
    }

    props.vertexShader =
      props.vertexShader ||
      /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `;

    const fbo = new FBO({
      name: props.name,
      width: this.width,
      height: this.height,
      renderer: this.renderer,
      camera: this.camera,
      propertyOffsets: props.propertyOffsets,
      material: new THREE.ShaderMaterial({
        vertexShader: props.vertexShader,
        fragmentShader: props.fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uDelta: { value: 0 },
          uTextureResolution: { value: new THREE.Vector2(this.width, this.height) },
        },
      }),
    });
    this.fbos.set(props.name, fbo);

    // Set up inter-FBO uniforms by reference
    for (const [otherName, otherFBO] of this.fbos) {
      fbo.material.uniforms[otherFBO.textureName] = { value: otherFBO.read.texture };
      // Also add this FBO's texture as a uniform to the others
      if (otherName !== fbo.name) {
        otherFBO.material.uniforms[fbo.textureName] = { value: fbo.read.texture };
      }
    }
    // Set initial uniforms
    if (props.uniforms) {
      Object.assign(fbo.material.uniforms, props.uniforms);
    }

    // Update the property to FBO map
    for (const [property, offset] of props.propertyOffsets.entries()) {
      if (this.propertyToFBOMap[property]) {
        console.warn(`Property ${property} is already mapped to ${this.propertyToFBOMap[property][0]}.`);
      } else {
        this.propertyToFBOMap[property] = [props.name, offset];
      }
    }
  }

  get(name: string): FBO | undefined {
    return this.fbos.get(name);
  }

  setUniforms(name: string, uniforms: Record<string, any>) {
    const fbo = this.fbos.get(name);
    if (!fbo) return;

    // Update the FBO's uniforms
    for (const [key, value] of Object.entries(uniforms)) {
      if (fbo.material.uniforms[key]) {
        fbo.material.uniforms[key].value = value;
      } else {
        fbo.material.uniforms[key] = { value: value };
      }
    }
  }

  setUniformsAll(uniformsMap: Record<string, any>) {
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
        fbo.material.uniforms[otherFBO.textureName].value = otherFBO.read.texture;
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
