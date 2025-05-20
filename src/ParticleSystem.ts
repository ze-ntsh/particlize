"use strict";
import { Particle } from "@/Particle";
import { Frame } from "@/Frame";
import type { ParticleSystemProperties } from "@/types";
import particleVertex from "@/shaders/particle.vert?raw";
import particleFragment from "@/shaders/particle.frag?raw";
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import * as THREE from "three";

/**
 * @class ParticleSystem
 *
 * ParticleSystem class that manages particles, their rendering, and transitions.
 * This class is responsible for creating particles, updating their state, and drawing them on a canvas.
 *
 */
export class ParticleSystem {
  // Basic properties
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock = new THREE.Clock();

  stats: Stats;
  controls: OrbitControls | null = null;

  // Particle properties
  particleCount: number = 0;
  maxParticles: number = 1000;
  positions: Float32Array; // x, y, z for each particle
  velocities: Float32Array; // vx, vy, vz for each particle
  accelerations: Float32Array; // ax, ay, az for each particle
  colors: Float32Array; // r, g, b, a for each particle
  sizes: Float32Array; // size for each particle
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  points: THREE.Points;

  // Render target textures
  originRTT: THREE.WebGLRenderTarget;
  positionRTT: THREE.WebGLRenderTarget;
  velocityRTT: THREE.WebGLRenderTarget;
  accelerationRTT: THREE.WebGLRenderTarget;

  constructor(properties: ParticleSystemProperties) {
    const { canvas, maxParticles } = properties;

    // Constructor properties
    this.canvas = canvas;
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;

    this.maxParticles = maxParticles || this.maxParticles;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setSize(this.canvas.width, this.canvas.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    const aspect = this.canvas.width / this.canvas.height;

    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
    this.camera.position.set(0, 0, 2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // Render target textures
    this.originRTT = new THREE.WebGLRenderTarget(this.canvas.width, this.canvas.height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });
    this.positionRTT = this.originRTT.clone();
    this.velocityRTT = this.originRTT.clone();
    this.accelerationRTT = this.originRTT.clone();

    // Initialize particles
    this.positions = new Float32Array(this.maxParticles * 3);
    this.velocities = new Float32Array(this.maxParticles * 3);
    this.accelerations = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 4);
    this.sizes = new Float32Array(this.maxParticles);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("velocity", new THREE.BufferAttribute(this.velocities, 3));
    this.geometry.setAttribute("acceleration", new THREE.BufferAttribute(this.accelerations, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 4));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(this.canvas.width, this.canvas.height) },
        uMouse: { value: new THREE.Vector3(0, 0, 0) },
        uMouseActive: { value: 0 },
      },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    // Hover
    this.canvas.addEventListener("mousemove", (event) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.setUniform("uMouse", new THREE.Vector3(x, y, 0));
      this.setUniform("uMouseActive", 1);
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.material.uniforms.uMouseActive.value = 0;
    });

    // Stats
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
  }

  ndc(coords: THREE.Vector3): THREE.Vector3 {
    const x = (coords.x / this.canvas.clientWidth) * 2 - 1;
    const y = (coords.y / this.canvas.clientHeight) * 2 - 1;
    const z = coords.z;
    return new THREE.Vector3(x, -y, z);
  }

  setUniform(name: string, value: any) {
    this.material.uniforms[name].value = value;
  }

  addParticle(particle: Particle) {
    if (this.particleCount > this.maxParticles) {
      console.warn("Max particles reached");
      return;
    }

    this.positions.set(particle.position.toArray(), this.particleCount * 3);
    this.velocities.set(particle.velocity.toArray(), this.particleCount * 3);
    this.accelerations.set(particle.acceleration.toArray(), this.particleCount * 3);
    this.colors.set(particle.color.toArray(), this.particleCount * 4);
    this.sizes[this.particleCount] = particle.size;
    this.particleCount++;

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.velocity.needsUpdate = true;
    this.geometry.attributes.acceleration.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  addParticles(particles: Particle[]) {
    if (particles.length + this.particleCount > this.maxParticles) {
      console.warn("Max particles reached");
      return;
    }

    for (const particle of particles) {
      this.positions.set(particle.position.toArray(), this.particleCount * 3);
      this.velocities.set(particle.velocity.toArray(), this.particleCount * 3);
      this.accelerations.set(particle.acceleration.toArray(), this.particleCount * 3);
      this.colors.set(particle.color.toArray(), this.particleCount * 4);
      this.sizes[this.particleCount] = particle.size;
      this.particleCount++;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.velocity.needsUpdate = true;
    this.geometry.attributes.acceleration.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  async addFrame(frame: Frame) {
    const particles = await frame.generateParticles({
      width: this.canvas.clientWidth,
      height: this.canvas.clientHeight,
    });

    this.addParticles(particles);
    console.log(this.particleCount);
  }

  step() {
    // Update logic
    const delta = this.clock.getDelta();
    this.material.uniforms.uTime.value += delta;

    // Render the scene
    this.renderer.render(this.scene, this.camera);
    this.stats.update();

    if (this.controls) {
      this.controls.update();
    }
  }

  start() {
    // Start the animation loop
    const animate = () => {
      this.step();
    };

    this.renderer.setAnimationLoop(animate);
  }

  stop() {
    // Stop the animation loop
    this.renderer.setAnimationLoop(null);
  }
}
