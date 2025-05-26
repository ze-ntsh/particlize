"use strict";
import { Particle } from "@/Particle";
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// GLSL
import particleVertex from "@/shaders/particle.vert?raw";
import particleFragment from "@/shaders/particle.frag?raw";

import originFragment from "@/shaders/origin.frag?raw";
import positionSizeFragment from "@/shaders/positionSize.frag?raw";
import forceMassFragment from "@/shaders/forceMass.frag?raw";
import velocityLifetimeFragment from "@/shaders/velocityLifetime.frag?raw";
import colorFragment from "@/shaders/color.frag?raw";

import * as THREE from "three";
import { FBOManager } from "@/FBOManager";
import { RenderTargetVisualizer } from "@/RenderTargetVisualizer";
import { Particlizer } from "./Particlizer";

/**
 * @class ParticleSystem
 *
 * ParticleSystem class that manages particles, their rendering, and transitions.
 * This class is responsible for creating particles, updating their state, and drawing them on a canvas.
 *
 */
export class ParticleSystem {
  // Renderer properties
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock = new THREE.Clock();
  stats: Stats;
  controls: OrbitControls;

  // Data
  uvs: Float32Array;

  // FBOs
  FBOs: FBOManager;
  maxParticles: number;
  renderTargetVisualizer: RenderTargetVisualizer | null = null;

  // Points
  renderGeometry: THREE.BufferGeometry;
  renderMaterial: THREE.ShaderMaterial;

  // Particles
  particles: THREE.Points;
  particleCount: number = 0;

  // Mouse
  mouse: THREE.Vector2 = new THREE.Vector2(0, 0);
  raycaster: THREE.Raycaster;
  raycastPlane: THREE.Plane;
  intersectionPoint: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(properties: { canvas: HTMLCanvasElement }) {
    const { canvas } = properties;

    // Constructor properties
    this.canvas = canvas;
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(this.canvas.width, this.canvas.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene = new THREE.Scene();
    const aspect = this.canvas.width / this.canvas.height;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // FBO Manager
    this.FBOs = new FBOManager(this.renderer, 512, 512);
    this.maxParticles = this.FBOs.max;
    // this.renderTargetVisualizer = new RenderTargetVisualizer(this.renderer);

    // Data
    this.uvs = new Float32Array(this.maxParticles * 2);

    for (let i = 0; i < this.maxParticles; i++) {
      const x = (i % this.FBOs.height) / this.FBOs.width;
      const y = Math.floor(i / this.FBOs.width) / this.FBOs.height;
      this.uvs[i * 2 + 0] = x; // u
      this.uvs[i * 2 + 1] = y; // v
    }

    // FBOs
    this.FBOs.addFBO({
      name: "origin",
      fragmentShader: originFragment,
    });
    this.FBOs.addFBO({
      name: "positionSize",
      fragmentShader: positionSizeFragment,
    });
    this.FBOs.addFBO({
      name: "velocityLifetime",
      fragmentShader: velocityLifetimeFragment,
      uniforms: {
        uMouse: { value: this.intersectionPoint },
        uMouseRadius: { value: 0.2 },
        uMouseForce: { value: 100.0 },
      },
    });
    this.FBOs.addFBO({
      name: "forceMass",
      fragmentShader: forceMassFragment,
    });
    this.FBOs.addFBO({
      name: "color",
      fragmentShader: colorFragment,
    });

    for (const [name, fbo] of this.FBOs.fbos) {
      console.log(fbo.textureName);
      console.log(`Uniforms for FBO "${name}":`, fbo.material.uniforms);
      if (fbo.read.texture && fbo.read.texture.image && fbo.read.texture.image.data) {
        console.log(`Data length for FBO "${name}":`, fbo.read.texture.image.data.length);
      }
    }

    this.renderMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: {
        uMouse: { value: this.intersectionPoint },
        uResolution: { value: new THREE.Vector2(this.canvas.width, this.canvas.height) },
        [this.FBOs.get("positionLifetime")?.textureName as string]: { value: this.FBOs.fbos.get("positionLifetime")?.read.texture },
      },
      transparent: true,
      depthWrite: false,
    });

    // Particles
    this.renderGeometry = new THREE.BufferGeometry();
    this.renderGeometry.setAttribute("uv", new THREE.BufferAttribute(this.uvs, 2));
    this.renderGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.maxParticles * 3), 4)); // Placeholder for positions (dummy but required)
    this.renderer.compile(this.scene, this.camera);

    // Only render particle count particles
    // this.renderGeometry.setDrawRange(0, this.particleCount);

    this.particles = new THREE.Points(this.renderGeometry, this.renderMaterial);
    this.scene.add(this.particles);

    // Stats
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);

    // Raycaster
    this.raycaster = new THREE.Raycaster();
    this.raycastPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    // Event listeners
    window.addEventListener("mousemove", (event) => {
      this.mouse.x = (event.clientX / this.canvas.width) * 2 - 1;
      this.mouse.y = -(event.clientY / this.canvas.height) * 2 + 1;
    });
  }

  addParticles(particlizer: Particlizer) {
    if (this.particleCount + particlizer.count > this.maxParticles) {
      console.warn("Max particle count will be reached, cannot add more particles");
      return;
    }

    this.FBOs.inject(particlizer.data, this.particleCount);
    this.particleCount += particlizer.count;
    // this.renderGeometry.setDrawRange(0, this.particleCount);
  }

  // Morph
  morph(target: Particle[]) {
    // Check if we can add more particles
    if (target.length > this.maxParticles) {
      console.warn("Max particle count reached");
      return;
    }

    if (target.length < this.particleCount) {
      // Create a new array with the same size as the particle count
      const originData = new Float32Array(this.particleCount * 4);

      // Repeat the target origins to fill the particle count
      for (let i = 0; i < this.particleCount; i++) {
        const particle = target[i % target.length];
        originData.set([particle.position[0], particle.position[1], particle.position[2], 1.0], i * 4);
      }

      // Inject the data into the FBOs
      this.FBOs.get("origin")?.inject(originData, 0);
      this.FBOs.update(["origin"]);

      // Prune the extra particles
      setTimeout(() => {
        const prunedData = new Float32Array((this.particleCount - target.length) * 4).fill(0);
        this.FBOs.inject(
          {
            origin: prunedData,
            position: prunedData,
            velocity: prunedData,
            acceleration: prunedData,
          },
          target.length
        );

        this.particleCount = target.length;
      }, 10000);
    } else {
      // Create a new array with the same size as the target
      const originData = new Float32Array(target.length * 4);

      // Copy the target origins to the new array
      for (let i = 0; i < target.length; i++) {
        const particle = target[i];
        originData.set([particle.position[0], particle.position[1], particle.position[2], 1.0], i * 4);
      }

      // Inject the data into the FBOs
      this.FBOs.get("origin")?.inject(originData, 0);
      this.FBOs.update(["origin"]);
    }
  }

  // Stubs
  addForce() {}
  addConstraint() {}

  update() {
    // Update logic
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.ray.intersectPlane(this.raycastPlane, this.intersectionPoint);

    this.FBOs.setUniformsAll({
      uTime: { value: time },
      uDelta: { value: delta },
    });
    this.FBOs.setUniforms("velocityLifetime", {
      uMouse: { value: this.intersectionPoint },
    });
    this.FBOs.update(["positionSize", "velocityLifetime", "forceMass"]);

    // Render
    this.renderMaterial.uniforms[this.FBOs.get("positionSize")?.textureName as string] = {
      value: this.FBOs.get("positionSize")?.read.texture,
    };
    this.renderMaterial.uniforms.uMouse.value = this.intersectionPoint;

    // Render the scene
    this.renderer.render(this.scene, this.camera);
    this.stats.update();
    this.controls.update();
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
