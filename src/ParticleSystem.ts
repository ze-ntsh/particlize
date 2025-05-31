"use strict";
import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// GLSL
import particleVertex from "@/shaders/particle.vert?raw";
import particleFragment from "@/shaders/particle.frag?raw";
import lineVertex from "@/shaders/line.vert?raw";
import lineFragment from "@/shaders/line.frag?raw";

import { PropertyManager } from "@/PropertyManager";
import { RenderTargetVisualizer } from "@/RenderTargetVisualizer";
import { Frame } from "@/frames/Frame";
import { Constraint } from "@/constraints/Constraint";
import { OriginRestoringForce } from "./constraints/forces";

// Types
export interface ParticleSystemParams {
  canvas: HTMLCanvasElement;
  backgroundColor?: [number, number, number, number];
  fboHeight?: number;
  fboWidth?: number;
  maxLines?: number;
}

/**
 * @class ParticleSystem
 *
 * ParticleSystem class that manages particles, their rendering, and transitions.
 * This class is responsible for creating particles, updating their state, and drawing them on a canvas.
 *
 */
export class ParticleSystem extends EventTarget {
  uuid: string = crypto.randomUUID();

  // Renderer properties
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
  properties: PropertyManager;
  renderTargetVisualizer: RenderTargetVisualizer | null = null;

  // Particles
  particleGeometry: THREE.BufferGeometry;
  particleMaterial: THREE.ShaderMaterial;
  particles: THREE.Points;
  particleCount: number = 0;
  maxParticles: number;

  // Lines
  lineGeometry: THREE.BufferGeometry | null = null;
  lineMaterial: THREE.ShaderMaterial | null = null;
  lines: THREE.LineSegments | null = null;
  lineCount: number = 0;
  maxLines: number = 1000;

  // Mouse
  mouse: THREE.Vector2 = new THREE.Vector2(0, 0);
  raycaster: THREE.Raycaster;
  raycastPlane: THREE.Plane;
  intersectionPoint: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor({ canvas, backgroundColor = [0, 0, 0, 1], fboHeight = 512, fboWidth = 512 }: ParticleSystemParams) {
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

    // Constructor properties
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
    this.properties = new PropertyManager({
      renderer: this.renderer,
      width: fboWidth,
      height: fboHeight,
    });
    // Max particles based on FBO size
    this.maxParticles = fboWidth * fboHeight;

    // Default behavior

    // Lifetime management
    const lifetimeConstraint = new Constraint(
      "lifetimeUpdateConstraint",
      /*glsl*/ `
      lifetime -= u_delta;
    `
    );

    // Fade out particles based on lifetime
    const colorConstraint = new Constraint(
      "colorLifetimeConstraint",
      /*glsl*/ `
      // Fade out when lifetime is between 0 and 1
      if(lifetime > 0.0 && lifetime < 1.0) {
        float fadeAlpha = smoothstep(0.0, 1.0, lifetime);
        color.a *= fadeAlpha;
      }
    `
    );

    // Velocity update based on force and mouse interaction
    const velocityConstraint = new Constraint(
      "velocityUpdateConstraint",
      /*glsl*/ `
      vec3 acceleration = force / mass;
      // Apply acceleration to velocity
      velocity += acceleration * u_delta;

      // Mouse repulsion (radial, only within radius)
      vec2 toParticle = position.xy - u_mouse.xy;
      float dist = length(toParticle);

      if(dist < 0.2 && dist > 0.0) {
        vec2 dir = normalize(toParticle);
        float strength = (1.0 - (dist / 0.2)) * 100.0;
        velocity.xy += dir * strength * u_delta;
      }
    `
    );

    // Position updates based on velocity
    const positionConstraint = new Constraint(
      "positionUpdateConstraint",
      /*glsl*/ `
      // Update position based on velocity
      position += velocity * u_delta;
    `
    );

    // Origin restoring force
    const originRestoringForce = new OriginRestoringForce("originRestoringForce", {
      strength: {
        value: 10,
        hardcode: true,
      },
    });

    this.properties
      .add("origin", 3)
      .add("position", 3)
      .add("velocity", 3)
      .add("force", 3)
      .add("size", 1, new Float32Array([1]))
      .add("mass", 1, new Float32Array([1]))
      .add("lifetime", 1, new Float32Array([-1]))
      .group(["position", "size"])
      .group(["velocity", "lifetime"])
      .group(["force", "mass"])
      .add("color", 4, new Float32Array([1, 0, 1, 1]))
      .linkAll()
      .setUniformsAll({
        u_time: 0,
        u_delta: 0,
        u_resolution: new THREE.Vector2(this.canvas.width, this.canvas.height),
        u_texture_resolution: new THREE.Vector2(this.properties.width, this.properties.height),
        u_mouse: this.intersectionPoint,
      })
      .constrain("velocity", velocityConstraint)
      .constrain("position", positionConstraint)
      .constrain("force", originRestoringForce)
      .constrain("lifetime", lifetimeConstraint)
      .constrain("color", colorConstraint)
      .build();

    // Particles
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
        uPositionSizeTexture: { value: this.properties.getFBO("position")?.read.texture },
        uVelocityLifetimeTexture: { value: this.properties.getFBO("velocity")?.read.texture },
        uColorTexture: { value: this.properties.getFBO("color")?.read.texture },
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

    // // Lines
    // const positions = new Float32Array(this.maxLines * 2 * 3); // 2 vertices per line, 3 coords each
    // const lineUVs = new Float32Array(this.maxLines * 2 * 2); // 2 vertices per line * 2 floats

    // for (let i = 0; i < this.maxLines; i++) {
    //   const idxA = Math.floor(Math.random() * this.maxParticles);
    //   const idxB = Math.floor(Math.random() * this.maxParticles);

    //   // Vertex 0 (start)
    //   lineUVs[i * 4 + 0] = this.uvs[idxA * 2 + 0];
    //   lineUVs[i * 4 + 1] = this.uvs[idxA * 2 + 1];

    //   // Vertex 1 (end)
    //   lineUVs[i * 4 + 2] = this.uvs[idxB * 2 + 0];
    //   lineUVs[i * 4 + 3] = this.uvs[idxB * 2 + 1];
    // }

    // this.lineGeometry = new THREE.BufferGeometry();
    // this.lineGeometry.setAttribute("uv", new THREE.BufferAttribute(lineUVs, 2));
    // this.lineGeometry.setAttribute("uv", new THREE.BufferAttribute(lineUVs, 2));
    // this.lineGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3)); // dummy

    // this.lineMaterial = new THREE.ShaderMaterial({
    //   vertexShader: lineVertex,
    //   fragmentShader: lineFragment,
    //   glslVersion: THREE.GLSL3,
    //   transparent: true,
    //   uniforms: {
    //     uPositionSizeTexture: { value: this.properties.get("position")?.read.texture }, // set in render loop
    //   },
    // });

    // this.lines = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);
    if (this.lines) {
      this.scene.add(this.lines);
    }

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

    window.addEventListener("resize", () => {
      this.resize();
    });
  }

  resize() {
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.renderer.setSize(this.canvas.width, this.canvas.height);
    this.camera.aspect = this.canvas.width / this.canvas.height;
    this.camera.updateProjectionMatrix();
    this.properties.setUniformsAll({
      u_Resolution: new THREE.Vector2(this.canvas.width, this.canvas.height),
    });
    this.particleMaterial.uniforms.uResolution.value.set(this.canvas.width, this.canvas.height);
  }

  addParticles(frame: Frame) {
    if (this.particleCount + frame.count > this.maxParticles) {
      console.warn("Max particle count will be reached, cannot add more particles");
      return;
    }

    frame.build(this.properties);
    this.properties.injectFBOs(frame.data, this.particleCount);
    this.particleCount += frame.count;
    this.particleGeometry.setDrawRange(0, this.particleCount);
    frame.dispose();
  }

  morphTo(frame: Frame) {
    if (frame.count > this.maxParticles) {
      console.warn("Frame has more particles than the maximum allowed, cannot morph");
      return;
    }

    frame.build(this.properties);
    if (frame.count < this.particleCount) {
      const originData = new Float32Array(this.particleCount * 4);
      // Repeat the target origins to fill the particle count
      for (let i = 0; i < this.particleCount; i++) {
        const particle = frame.particles[i % frame.count];
        originData.set([particle.position[0], particle.position[1], particle.position[2], 1.0], i * 4);
      }

      this.properties.inject("origin", originData);
      this.properties.update(["origin"]);
    } else {
      // Create a new array with the same size as the target
      const originData = new Float32Array(frame.count * 4);

      // Copy the target origins to the new array
      for (let i = 0; i < frame.count; i++) {
        const particle = frame.particles[i];
        originData.set([particle.position[0], particle.position[1], particle.position[2], 1.0], i * 4);
      }

      // Inject the data into the FBOs
      this.properties.inject("origin", originData);
      this.properties.update(["origin"]);
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
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.ray.intersectPlane(this.raycastPlane, this.intersectionPoint);

    this.properties.setUniformsAll({
      u_time: time,
      u_delta: delta,
      u_mouse: this.intersectionPoint,
    });
    this.properties.update(["position", "velocity", "force", "lifetime", "color"]);

    // Render
    this.particleMaterial.uniforms.uPositionSizeTexture.value = this.properties.getFBO("position")?.read.texture;
    this.particleMaterial.uniforms.uColorTexture.value = this.properties.getFBO("color")?.read.texture;
    this.particleMaterial.uniforms.uVelocityLifetimeTexture.value = this.properties.getFBO("velocity")?.read.texture;

    if (this.lineMaterial) {
      this.lineMaterial.uniforms.uPositionSizeTexture.value = this.properties.getFBO("position")?.read.texture;
    }

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
    if (this.lines) {
      this.lineGeometry?.dispose();
      this.lineMaterial?.dispose();
      this.lines.geometry.dispose();
    }
    this.properties.dispose();

    // Remove event listeners
    window.removeEventListener("mousemove", () => {});
    window.removeEventListener("resize", () => {});
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
