"use strict";
import { Particle } from "@/Particle";
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// GLSL
import originVertex from "@/shaders/origin.vert?raw";
import originFragment from "@/shaders/origin.frag?raw";
import particleVertex from "@/shaders/particle.vert?raw";
import particleFragment from "@/shaders/particle.frag?raw";
import positionVertex from "@/shaders/position.vert?raw";
import positionFragment from "@/shaders/position.frag?raw";
import velocityVertex from "@/shaders/velocity.vert?raw";
import velocityFragment from "@/shaders/velocity.frag?raw";
import accelerationVertex from "@/shaders/acceleration.vert?raw";
import accelerationFragment from "@/shaders/acceleration.frag?raw";
import { Sampler } from "@/samplers/Sampler";

import * as THREE from "three";
import { FBOManager } from "@/FBOManager";
import { RenderTargetVisualizer } from "@/RenderTargetVisualizer";

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
      vertexShader: originVertex,
      fragmentShader: originFragment,
    });
    this.FBOs.addFBO({
      name: "position",
      vertexShader: positionVertex,
      fragmentShader: positionFragment,
    });
    this.FBOs.addFBO({
      name: "velocity",
      vertexShader: velocityVertex,
      fragmentShader: velocityFragment,
      uniforms: {
        uMouse: { value: this.intersectionPoint },
        uMouseRadius: { value: 0.2 },
        uMouseForce: { value: 10.0 },
      },
    });
    this.FBOs.addFBO({
      name: "acceleration",
      vertexShader: accelerationVertex,
      fragmentShader: accelerationFragment,
    });

    this.renderMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: {
        uMouse: { value: this.intersectionPoint },
        uPositionTexture: { value: this.FBOs.fbos.get("position")?.read.texture },
        uResolution: { value: new THREE.Vector2(this.canvas.width, this.canvas.height) },
      },
      transparent: true,
      depthWrite: false,
    });

    // Particles
    this.renderGeometry = new THREE.BufferGeometry();
    this.renderGeometry.setAttribute("uv", new THREE.BufferAttribute(this.uvs, 2));
    this.renderGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.maxParticles * 3), 4)); // Placeholder for positions (dummy but required)

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

  addParticle(particle: Particle) {
    // Check if we can add more particles
    if (this.particleCount >= this.maxParticles) {
      console.warn("Max particle count reached");
      return;
    }

    this.FBOs.getFBO("origin")?.inject(particle.position, this.particleCount);
    this.FBOs.getFBO("position")?.inject(particle.position, this.particleCount);
    this.FBOs.getFBO("velocity")?.inject(particle.velocity, this.particleCount);
    this.FBOs.getFBO("acceleration")?.inject(particle.acceleration, this.particleCount);

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
    this.FBOs.getFBO("origin")?.inject(positionData, this.particleCount);
    this.FBOs.getFBO("position")?.inject(positionData, this.particleCount);
    this.FBOs.getFBO("velocity")?.inject(velocityData, this.particleCount);
    this.FBOs.getFBO("acceleration")?.inject(accelerationData, this.particleCount);

    this.particleCount += particles.length;
  }

  removeParticle(index: number) {
    // Check if the index is valid
    if (index < 0 || index >= this.particleCount) {
      console.warn("Invalid particle index");
      return;
    }

    // Remove the particle from the FBOs

    this.particleCount--;
  }

  addMesh(sampler: Sampler, samples: number = 100000, offset: [number, number, number] = [0, 0, 0]) {
    if (!sampler) {
      console.warn("No sampler provided");
      return;
    }

    // @ts-expect-error: sampler may not have build method in some implementations
    sampler.build();

    const positionData = new Float32Array(samples * 4);

    const targetPosition = new THREE.Vector3();
    const targetNormal = new THREE.Vector3();
    const targetColor = new THREE.Color();
    const targetUV = new THREE.Vector2();

    for (let i = 0; i < samples; i++) {
      sampler.sample(targetPosition, targetNormal, targetColor, targetUV);

      positionData.set([targetPosition.x + offset[0], targetPosition.y + offset[1], targetPosition.z + offset[2], 1.0], i * 4);
    }

    // Inject the data into the FBOs
    this.FBOs.getFBO("origin")?.inject(positionData, this.particleCount);
    this.FBOs.getFBO("position")?.inject(positionData, this.particleCount);
    this.particleCount += samples;
  }

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
    this.FBOs.setUniforms("velocity", {
      uMouse: { value: this.intersectionPoint },
    });
    this.FBOs.update(["position", "velocity", "acceleration"]);

    // Render
    this.renderMaterial.uniforms.uPositionTexture.value = this.FBOs.getFBO("position")?.read.texture;
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
