"use strict";
import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// GLSL
import particleVertex from "@/shaders/particle.vert?raw";
import particleFragment from "@/shaders/particle.frag?raw";

import { PropertyManager } from "@/PropertyManager";
import { RenderTargetVisualizer } from "@/RenderTargetVisualizer";
import { Frame } from "@/frames/Frame";
import { ParticlePlugin } from "./plugins/Plugin";

// Types
export interface ParticleSystemParams {
  canvas: HTMLCanvasElement;
  backgroundColor?: [number, number, number, number];
  fboHeight?: number;
  fboWidth?: number;
  plugins?: ParticlePlugin[];
}

/**
 * @class ParticleSystem
 *
 * ParticleSystem class that manages particles, their rendering, and transitions.
 * This class is responsible for creating particles, updating their state, and drawing them on a canvas.
 *
 */
export class ParticleSystem extends EventTarget {
  [string: string]: any; // Allow dynamic properties for plugins and other extensions

  uuid: string = crypto.randomUUID();

  // Renderer manager
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock = new THREE.Clock();
  stats: Stats;
  controls: OrbitControls;

  // Data
  uvs: Float32Array;

  // FBOs
  manager: PropertyManager;
  renderTargetVisualizer: RenderTargetVisualizer | null = null;

  // Plugins
  plugins: ParticlePlugin[] = [];

  // Particles
  particleGeometry: THREE.BufferGeometry;
  particleMaterial: THREE.ShaderMaterial;
  particles: THREE.Points;
  particleCount: number = 0;
  maxParticles: number;

  constructor({ canvas, backgroundColor = [0, 0, 0, 1], fboHeight = 512, fboWidth = 512, plugins = [] }: ParticleSystemParams) {
    super();

    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error("Invalid canvas element provided to ParticleSystem");
    }

    if (fboHeight <= 0 || fboWidth <= 0) {
      throw new Error("FBO dimensions must be greater than zero");
    }
    if (backgroundColor.length !== 4 || backgroundColor.some((c) => typeof c !== "number")) {
      throw new Error("Background color must be an array of four numbers [r, g, b, a]");
    }

    if (backgroundColor.some((c) => c < 0 || c > 1)) {
      console.warn("Background color values should be normalized RGB values (0 to 1). Values outside this range may not render correctly.");
    }

    // Constructor manager
    this.canvas = canvas;
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setClearColor(new THREE.Color(...backgroundColor.slice(0, 3)), backgroundColor[3]);
    this.renderer.setSize(this.canvas.width, this.canvas.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, this.canvas.width / this.canvas.height, 0.1, 1000);
    this.camera.position.set(0, 0, 2);
    this.camera.lookAt(0, 0, 0);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // FBO Manager
    this.manager = new PropertyManager({
      renderer: this.renderer,
      width: fboWidth,
      height: fboHeight,
    });
    // Max particles based on FBO size
    this.maxParticles = fboWidth * fboHeight;

    // Particles
    this.uvs = new Float32Array(this.maxParticles * 2);

    for (let i = 0; i < this.maxParticles; i++) {
      const x = (i % this.manager.height) / this.manager.width;
      const y = Math.floor(i / this.manager.width) / this.manager.height;
      this.uvs[i * 2 + 0] = x; // u
      this.uvs[i * 2 + 1] = y; // v
    }

    this.particleMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: {
        uResolution: { value: new THREE.Vector2(this.canvas.width, this.canvas.height) },
      },
      transparent: true,
      depthWrite: false,
    });

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute("uv", new THREE.BufferAttribute(this.uvs, 2));
    this.particleGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.maxParticles * 3), 3)); // Placeholder for positions (dummy but required)
    this.renderer.compile(this.scene, this.camera);
    // Only render particle count particles
    this.particleGeometry.setDrawRange(0, this.particleCount);

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);

    // Stats
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);

    window.addEventListener("resize", () => {
      this.resize();
    });

    // Plugins
    this.plugins = plugins;
    for (const plugin of this.plugins) {
      plugin.onInit && plugin.onInit(this);
    }
  }

  linkProperty(propertyName: string) {
    const property = this.manager.properties.get(propertyName);
    if (!property) {
      console.warn(`Property "${propertyName}" does not exist in the PropertyManager.`);
      return;
    }

    // Link the property texture to the shader material
    if (this.particleMaterial.uniforms[property.fbo.name]) {
      this.particleMaterial.uniforms[property.fbo.name].value = property.fbo.read.texture;
    } else {
      this.particleMaterial.uniforms[property.fbo.name] = { value: property.fbo.read.texture };
    }
  }

  resize() {
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.renderer.setSize(this.canvas.width, this.canvas.height);
    this.camera.aspect = this.canvas.width / this.canvas.height;
    this.camera.updateProjectionMatrix();
    this.manager.setUniformsAll({
      u_Resolution: new THREE.Vector2(this.canvas.width, this.canvas.height),
    });
    this.particleMaterial.uniforms.uResolution.value.set(this.canvas.width, this.canvas.height);
  }

  addParticles(frame: Frame) {
    if (this.particleCount + frame.count > this.maxParticles) {
      console.warn("Max particle count will be reached, cannot add more particles");
      return;
    }

    frame.build(this.manager);
    this.manager.injectFBOs(frame.data, this.particleCount);
    this.particleCount += frame.count;
    this.particleGeometry.setDrawRange(0, this.particleCount);
    frame.dispose();
  }

  morphTo(frame: Frame) {
    if (frame.count > this.maxParticles) {
      console.warn("Frame has more particles than the maximum allowed, cannot morph");
      return;
    }

    frame.build(this.manager);
    if (frame.count < this.particleCount) {
      const originData = new Float32Array(this.particleCount * 4);
      // Repeat the target origins to fill the particle count
      for (let i = 0; i < this.particleCount; i++) {
        const particle = frame.particles[i % frame.count];
        originData.set([particle.position[0], particle.position[1], particle.position[2], 1.0], i * 4);
      }

      this.manager.inject("origin", originData);
      this.manager.update(["origin"]);
    } else {
      // Create a new array with the same size as the target
      const originData = new Float32Array(frame.count * 4);

      // Copy the target origins to the new array
      for (let i = 0; i < frame.count; i++) {
        const particle = frame.particles[i];
        originData.set([particle.position[0], particle.position[1], particle.position[2], 1.0], i * 4);
      }

      // Inject the data into the FBOs
      this.manager.inject("origin", originData);
      this.manager.update(["origin"]);
    }

    // Update particle count
    this.particleCount = frame.count;
    this.particleGeometry.setDrawRange(0, this.particleCount);
  }

  update() {
    // Update logic
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Raycaster

    this.manager.setUniformsAll({
      u_time: time,
      u_delta: delta,
    });

    // Update plugins
    for (const plugin of this.plugins) {
      plugin.onUpdate && plugin.onUpdate(this);
    }

    this.manager.update();

    // Render the scene
    this.renderer.render(this.scene, this.camera);
    this.stats.update();
    this.controls.update();
  }

  dispose() {
    // Clean up resources
    this.stop();
    this.renderer.dispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.manager.dispose();

    // Remove event listeners
    window.removeEventListener("mousemove", () => {});
    window.removeEventListener("resize", () => {});

    // Dispose of plugins
    for (const plugin of this.plugins) {
      plugin.onDispose && plugin.onDispose(this);
    }
  }

  start() {
    // Start the animation loop
    const animate = () => {
      this.update();
    };

    this.renderer.setAnimationLoop(animate);
  }

  stop() {
    // Stop the animation loop
    this.renderer.setAnimationLoop(null);
  }
}
