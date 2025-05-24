"use strict";
import { Particle } from "@/Particle";
import { Frame } from "@/Frame";
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import type { ParticleSystemProperties } from "@/types";

// GLSL
import particleVertex from "@/shaders/particle.vert?raw";
import particleFragment from "@/shaders/particle.frag?raw";
import positionVertex from "@/shaders/position.vert?raw";
import positionFragment from "@/shaders/position.frag?raw";
import velocityVertex from "@/shaders/velocity.vert?raw";
import velocityFragment from "@/shaders/velocity.frag?raw";
import accelerationVertex from "@/shaders/acceleration.vert?raw";
import accelerationFragment from "@/shaders/acceleration.frag?raw";

import * as THREE from "three";
import { FBO } from "./FBO";

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
  fboHeight: number = 512;
  fboWidth: number = 512;
  maxParticles: number = this.fboHeight * this.fboWidth;
  particleCount: number = 0;
  positionFBO: FBO;
  velocityFBO: FBO;
  accelerationFBO: FBO;

  // Materials
  renderMaterial: THREE.ShaderMaterial;
  positionMaterial: THREE.ShaderMaterial;
  velocityMaterial: THREE.ShaderMaterial;
  accelerationMaterial: THREE.ShaderMaterial;

  // Geometries
  renderGeometry: THREE.BufferGeometry;

  // Particles
  particles: THREE.Points;

  constructor(properties: ParticleSystemProperties) {
    const { canvas } = properties;

    // Constructor properties
    this.canvas = canvas;
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setSize(this.canvas.width, this.canvas.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene = new THREE.Scene();
    const aspect = this.canvas.width / this.canvas.height;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Data
    this.uvs = new Float32Array(this.maxParticles * 2);

    for (let i = 0; i < this.maxParticles; i++) {
      const x = (i % this.fboWidth) / this.fboWidth;
      const y = Math.floor(i / this.fboWidth) / this.fboHeight;
      this.uvs[i * 2 + 0] = x; // u
      this.uvs[i * 2 + 1] = y; // v
    }

    // Materials
    this.positionMaterial = new THREE.ShaderMaterial({
      vertexShader: positionVertex,
      fragmentShader: positionFragment,
      uniforms: {
        uPositionTexture: { value: null },
        uVelocityTexture: { value: null },
        uTextureResolution: { value: new THREE.Vector2(this.fboWidth, this.fboHeight) },
        uDelta: { value: 0 },
      },
    });
    this.velocityMaterial = new THREE.ShaderMaterial({
      vertexShader: velocityVertex,
      fragmentShader: velocityFragment,
      uniforms: {
        uPositionTexture: { value: null },
        uVelocityTexture: { value: null },
        uTextureResolution: { value: new THREE.Vector2(this.fboWidth, this.fboHeight) },
        uDelta: { value: 0 },
      },
    });
    this.accelerationMaterial = new THREE.ShaderMaterial({
      vertexShader: accelerationVertex,
      fragmentShader: accelerationFragment,
      uniforms: {
        uPositionTexture: { value: null },
        uVelocityTexture: { value: null },
        uTextureResolution: { value: new THREE.Vector2(this.fboWidth, this.fboHeight) },
        uDelta: { value: 0 },
      },
    });

    // FBO
    this.positionFBO = new FBO(this.fboHeight, this.fboWidth, this.renderer, this.positionMaterial);
    this.velocityFBO = new FBO(this.fboHeight, this.fboWidth, this.renderer, this.velocityMaterial);
    this.accelerationFBO = new FBO(this.fboHeight, this.fboWidth, this.renderer, this.accelerationMaterial);

    this.renderMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: {
        uPositionTexture: { value: this.positionFBO.read.texture },
        uResolution: { value: new THREE.Vector2(this.canvas.width, this.canvas.height) },
      },
      transparent: true,
      depthWrite: false,
    });

    // Particles
    this.renderGeometry = new THREE.BufferGeometry();
    this.renderGeometry.setAttribute("uv", new THREE.BufferAttribute(this.uvs, 2));
    this.renderGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.maxParticles * 3), 3)); // Placeholder for positions (dummy but required)

    this.particles = new THREE.Points(this.renderGeometry, this.renderMaterial);
    this.scene.add(this.particles);

    // Stats
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
  }

  addParticle(particle: Particle) {
    // Check if we can add more particles
    if (this.particleCount >= this.maxParticles) {
      console.warn("Max particle count reached");
      return;
    }

    this.positionFBO.inject(particle.position, this.particleCount);
    this.velocityFBO.inject(particle.velocity, this.particleCount);
    this.accelerationFBO.inject(particle.acceleration, this.particleCount);

    this.particleCount++;
  }

  addParticles(particles: Particle[]) {
    if (this.particleCount + particles.length > this.maxParticles) {
      console.warn("Max particle count reached");
      return;
    }

    // Add the particles to the data array
    let positionData = new Float32Array(particles.length * 4);
    let velocityData = new Float32Array(particles.length * 4);
    let accelerationData = new Float32Array(particles.length * 4);

    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      positionData.set(particle.position, i * 4);
      velocityData.set(particle.velocity, i * 4);
      accelerationData.set(particle.acceleration, i * 4);
    }

    // Inject the data into the FBOs
    this.positionFBO.inject(positionData, this.particleCount);
    this.velocityFBO.inject(velocityData, this.particleCount);
    this.accelerationFBO.inject(accelerationData, this.particleCount);

    this.particleCount += particles.length;
  }

  removeParticle(index: number) {
    // Check if the index is valid
    if (index < 0 || index >= this.particleCount) {
      console.warn("Invalid particle index");
      return;
    }

    // Remove the particle from the FBOs
    this.positionFBO.remove(index);
    this.velocityFBO.remove(index);
    this.accelerationFBO.remove(index);

    this.particleCount--;
  }

  async addFrame(frame: Frame) {
    const particles = await frame.generateParticles({
      width: this.canvas.clientWidth,
      height: this.canvas.clientHeight,
    });

    this.addParticles(particles);
    console.log(this.particleCount);
  }

  update() {
    // Update logic
    const delta = this.clock.getDelta();
    // const time = this.clock.getElapsedTime();

    // FBO
    this.positionFBO.update({
      uPositionTexture: { value: this.positionFBO.read.texture },
      uVelocityTexture: { value: this.velocityFBO.read.texture },
      uDelta: { value: delta },
    });
    this.velocityFBO.update({
      uVelocityTexture: { value: this.velocityFBO.read.texture },
      uAccelerationTexture: { value: this.accelerationFBO.read.texture },
      uDelta: { value: delta },
    });
    this.accelerationFBO.update({
      uAccelerationTexture: { value: this.accelerationFBO.read.texture },
      uDelta: { value: delta },
    });

    // Render
    this.renderMaterial.uniforms.uPositionTexture.value = this.positionFBO.read.texture;

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
