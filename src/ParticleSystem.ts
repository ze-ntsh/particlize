"use strict";
import { Particle } from "@/Particle";
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// GLSL
import particleVertex from "@/shaders/particle.vert?raw";
import particleFragment from "@/shaders/particle.frag?raw";

import * as THREE from "three";
import { PropertyManager } from "@/PropertyManager";
import { RenderTargetVisualizer } from "@/RenderTargetVisualizer";
import { Frame } from "./frames/Frame";
import { Constraint } from "./constraints/Constraint";

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
  properties: PropertyManager;
  maxParticles: number;
  renderTargetVisualizer: RenderTargetVisualizer | null = null;

  // Particles
  particleGeometry: THREE.BufferGeometry;
  particleMaterial: THREE.ShaderMaterial;
  particles: THREE.Points;
  particleCount: number = 0;

  // Lines
  // lineGeometry: THREE.BufferGeometry | null = null;
  // lineMaterial: THREE.LineBasicMaterial | null = null;
  // lines: THREE.LineSegments | null = null;
  // lineCount: number = 0;

  // Mouse
  mouse: THREE.Vector2 = new THREE.Vector2(0, 0);
  raycaster: THREE.Raycaster;
  raycastPlane: THREE.Plane;
  intersectionPoint: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(props: { canvas: HTMLCanvasElement; backgroundColor?: [number, number, number, number] }) {
    const { canvas, backgroundColor = [0.1, 0.1, 0.1, 1] } = props;

    // Constructor properties
    this.canvas = canvas;
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setClearColor(new THREE.Color(...backgroundColor.slice(0, 3)), backgroundColor[3]);
    this.renderer.setSize(this.canvas.width, this.canvas.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.scene = new THREE.Scene();
    const aspect = this.canvas.width / this.canvas.height;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // FBO Manager
    this.properties = new PropertyManager(this.renderer, 512, 512);
    this.maxParticles = this.properties.max;

    // Default behavior

    // Lifetime management
    const lifetimeConstraint = new Constraint(/*glsl*/ `
      lifetime -= uDelta;
    `);

    // Fade out particles based on lifetime
    const colorConstraint = new Constraint(/*glsl*/ `
      // Fade out when lifetime is between 0 and 1
      if(lifetime > 0.0 && lifetime < 1.0) {
        float fadeAlpha = smoothstep(0.0, 1.0, lifetime);
        color.a *= fadeAlpha;
      }
    `);

    // Velocity update based on force and mouse interaction
    const velocityConstraint = new Constraint(/*glsl*/ `
      // Hover effect based on mouse position
      vec3 acceleration = force / mass;
      // Apply restoring force (from acceleration FBO)
      velocity += acceleration * uDelta;

      // Mouse repulsion (radial, only within radius)
      vec2 toParticle = position.xy - uMouse.xy;
      float dist = length(toParticle);

      if(dist < 0.2 && dist > 0.0) {
        vec2 dir = normalize(toParticle);
        float strength = (1.0 - (dist / 0.2)) * 100.0;
        velocity.xy += dir * strength * uDelta;
      }
    `);

    // Position updates based on velocity
    const positionConstraint = new Constraint(/*glsl*/ `
      // Update position based on velocity
      position += velocity * uDelta;
    `);

    // Origin restoring force
    const forceConstraint = new Constraint(/*glsl*/ `
      // Origin restoring force
      float k = 25.0;   // strong spring for snappiness
      float d = 2.0 * sqrt(k); // critical damping

      vec3 restoring = (origin - position) * k;
      vec3 damping = -velocity * d;

      vec3 acceleration = restoring + damping;
      force = acceleration * mass;
    `);

    this.properties
      .add("origin", 3, new Float32Array([0, 0, 0]))
      .add("position", 3, new Float32Array([0, 0, 0]))
      .add("velocity", 3, new Float32Array([0, 0, 0]))
      .add("force", 3, new Float32Array([0, 0, 0]))
      .add("size", 1, new Float32Array([1]))
      .add("mass", 1, new Float32Array([1]))
      .add("lifetime", 1, new Float32Array([0]))
      .group(["position", "size"])
      .group(["velocity", "lifetime"])
      .group(["force", "mass"])
      .add("color", 4, new Float32Array([1, 0, 1, 1]))
      .linkAll()
      .setUniformsAll({
        uTime: 0,
        uDelta: 0,
        uResolution: new THREE.Vector2(this.canvas.width, this.canvas.height),
        uTextureResolution: new THREE.Vector2(this.properties.width, this.properties.height),
      })
      .setUniforms("velocity", {
        uMouse: this.intersectionPoint,
      })
      .constrain("color", colorConstraint)
      .constrain("lifetime", lifetimeConstraint)
      .constrain("velocity", velocityConstraint)
      .constrain("position", positionConstraint)
      .constrain("force", forceConstraint)
      .build();

    // Data
    this.uvs = new Float32Array(this.maxParticles * 2);

    for (let i = 0; i < this.maxParticles; i++) {
      const x = (i % this.properties.height) / this.properties.width;
      const y = Math.floor(i / this.properties.width) / this.properties.height;
      this.uvs[i * 2 + 0] = x; // u
      this.uvs[i * 2 + 1] = y; // v
    }

    this.particleMaterial = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: {
        uMouse: { value: this.intersectionPoint },
        uResolution: { value: new THREE.Vector2(this.canvas.width, this.canvas.height) },
        uPositionSizeTexture: { value: this.properties.get("position")?.read.texture },
        uVelocityLifetimeTexture: { value: this.properties.get("velocity")?.read.texture },
        uColorTexture: { value: this.properties.get("color")?.read.texture },
      },
      transparent: true,
      depthWrite: false,
    });

    // Particles
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute("uv", new THREE.BufferAttribute(this.uvs, 2));
    this.particleGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.maxParticles * 3), 4)); // Placeholder for positions (dummy but required)
    this.renderer.compile(this.scene, this.camera);

    // Only render particle count particles
    this.particleGeometry.setDrawRange(0, this.particleCount);

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
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

  addParticles(frame: Frame) {
    if (this.particleCount + frame.count > this.maxParticles) {
      console.warn("Max particle count will be reached, cannot add more particles");
      return;
    }

    frame.build(this.properties);
    this.properties.inject(frame.data, this.particleCount);
    this.particleCount += frame.count;
    this.particleGeometry.setDrawRange(0, this.particleCount);
    frame.dispose();
  }

  // updateParticle(index: number, property: string, value: number | number[]) {
  //   if (index < 0 || index > this.particleCount) {
  //     throw new Error(`Index ${index} is out of bounds for particle count ${this.particleCount}`);
  //   }
  //   if (!Array.isArray(value) && typeof value == "number") {
  //     value = [value];
  //   }
  //   this.FBOs.updateProperty(property, new Float32Array(value), index);
  // }

  // morph(target: Particle[]) {
  //   // Check if we can add more particles
  //   if (target.length > this.maxParticles) {
  //     console.warn("Max particle count reached");
  //     return;
  //   }

  //   if (target.length < this.particleCount) {
  //     // Create a new array with the same size as the particle count
  //     const originData = new Float32Array(this.particleCount * 4);

  //     // Repeat the target origins to fill the particle count
  //     for (let i = 0; i < this.particleCount; i++) {
  //       const particle = target[i % target.length];
  //       originData.set([particle.position[0], particle.position[1], particle.position[2], 1.0], i * 4);
  //     }

  //     // Inject the data into the FBOs
  //     this.FBOs.get("origin")?.inject(originData, 0);
  //     this.FBOs.update(["origin"]);

  //     // Prune the extra particles
  //     setTimeout(() => {
  //       const prunedData = new Float32Array((this.particleCount - target.length) * 4).fill(0);
  //       this.FBOs.inject(
  //         {
  //           origin: prunedData,
  //           position: prunedData,
  //           velocity: prunedData,
  //           acceleration: prunedData,
  //         },
  //         target.length
  //       );

  //       this.particleCount = target.length;
  //     }, 10000);
  //   } else {
  //     // Create a new array with the same size as the target
  //     const originData = new Float32Array(target.length * 4);

  //     // Copy the target origins to the new array
  //     for (let i = 0; i < target.length; i++) {
  //       const particle = target[i];
  //       originData.set([particle.position[0], particle.position[1], particle.position[2], 1.0], i * 4);
  //     }

  //     // Inject the data into the FBOs
  //     this.FBOs.get("origin")?.inject(originData, 0);
  //     this.FBOs.update(["origin"]);
  //   }
  // }

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

    this.properties.setUniformsAll({
      uTime: time,
      uDelta: delta,
    });
    this.properties.setUniforms("velocity", {
      uMouse: this.intersectionPoint,
    });
    this.properties.update(["force", "mass", "color", "position", "size", "velocity", "lifetime"]);

    // // Render
    this.particleMaterial.uniforms.uPositionSizeTexture.value = this.properties.get("position")?.read.texture;
    this.particleMaterial.uniforms.uColorTexture.value = this.properties.get("color")?.read.texture;
    this.particleMaterial.uniforms.uVelocityLifetimeTexture.value = this.properties.get("velocity")?.read.texture;

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
