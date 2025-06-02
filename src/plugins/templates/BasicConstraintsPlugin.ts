import { ParticleSystem } from "@/ParticleSystem";
import { ParticlePlugin } from "../Plugin";
import { Constraint } from "@/constraints";
import { OriginRestoringForce } from "@/constraints/forces";
import * as THREE from "three";
import { FBO } from "@/FBO";
import { Frame } from "@/frames";

export class BasicConstraintsPlugin implements ParticlePlugin {
  name = "BasicConstraintsPlugin";
  description?: string =
    "A plugin that adds basic constraints and forces to particles, including lifetime management, velocity updates, and mouse interaction.";

  onInit(system: ParticleSystem) {
    // Setup raycaster for mouse interaction
    system.raycaster = new THREE.Raycaster();
    system.raycastPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    system.intersectionPoint = new THREE.Vector3(0, 0, 0);
    system.mouse = new THREE.Vector2(0, 0);

    // Event listeners
    window.addEventListener("mousemove", (event) => {
      system.mouse.x = (event.clientX / system.canvas.width) * 2 - 1;
      system.mouse.y = -(event.clientY / system.canvas.height) * 2 + 1;
    });

    // Lifetime management
    const lifetimeConstraint = new Constraint(
      "lifetimeUpdateConstraint",
      /*glsl*/ `
      if (lifetime > 0.0) {
        lifetime -= u_delta;
      }
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
        hardcode: false, // Use uniform for strength
      },
    });

    system.manager
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
        u_resolution: new THREE.Vector2(system.canvas.width, system.canvas.height),
        u_texture_resolution: new THREE.Vector2(system.canvas.width, system.canvas.height),
        u_mouse: system.intersectionPoint,
      })
      .constrain("velocity", velocityConstraint)
      .constrain("position", positionConstraint)
      .constrain("force", originRestoringForce)
      .constrain("lifetime", lifetimeConstraint)
      .constrain("color", colorConstraint);

    // Link the FBOs to the particle material
    const positionFBO = system.manager.properties.get("position")?.fbo as FBO;
    const lifetimeFBO = system.manager.properties.get("velocity")?.fbo as FBO;
    const colorFBO = system.manager.properties.get("color")?.fbo as FBO;

    system.particleMaterial.uniforms[positionFBO.textureName] = {
      value: positionFBO.read.texture,
    };

    system.particleMaterial.uniforms[lifetimeFBO.textureName] = {
      value: lifetimeFBO.read.texture,
    };

    system.particleMaterial.uniforms[colorFBO.textureName] = {
      value: colorFBO.read.texture,
    };

    // Add a mouse uniform to the velocity FBO
    system.manager.setUniforms("velocity", {
      u_mouse: null,
    });

    // Add a morph function to the system
    system.morphTo = (target: Frame) => {
      if (target.count > system.maxParticles) {
        console.warn("Frame has more particles than the maximum allowed, cannot morph");
        return;
      }

      target.build(system.manager);
      if (target.count < system.particleCount) {
        const originData = new Float32Array(system.particleCount * 4);
        // Repeat the target origins to fill the particle count
        for (let i = 0; i < system.particleCount; i++) {
          const particle = target.particles[i % target.count];
          originData.set([particle.position[0], particle.position[1], particle.position[2], 1.0], i * 4);
        }

        system.manager.inject("origin", originData);
        system.manager.update(["origin"]);
      } else {
        // Create a new array with the same size as the target
        const originData = new Float32Array(target.count * 4);

        // Copy the target origins to the new array
        for (let i = 0; i < target.count; i++) {
          const particle = target.particles[i];
          originData.set([particle.position[0], particle.position[1], particle.position[2], 1.0], i * 4);
        }

        // Inject the data into the FBOs
        system.manager.inject("origin", originData);
        system.manager.update(["origin"]);
      }

      // Update particle count
      system.particleCount = target.count;
      system.particleGeometry.setDrawRange(0, system.particleCount);
    };
  }

  onUpdate(system: ParticleSystem): void {
    // Update the raycaster based on mouse position
    system.raycaster.setFromCamera(system.mouse, system.camera);
    system.raycaster.ray.intersectPlane(system.raycastPlane, system.intersectionPoint);

    const positionFBO = system.manager.properties.get("position")?.fbo as FBO;
    const lifetimeFBO = system.manager.properties.get("velocity")?.fbo as FBO;
    const colorFBO = system.manager.properties.get("color")?.fbo as FBO;

    system.particleMaterial.uniforms[positionFBO.textureName].value = positionFBO.read.texture;
    system.particleMaterial.uniforms[lifetimeFBO.textureName].value = lifetimeFBO.read.texture;
    system.particleMaterial.uniforms[colorFBO.textureName].value = colorFBO.read.texture;

    system.manager.setUniforms("velocity", {
      u_mouse: system.intersectionPoint,
    });
  }
}
