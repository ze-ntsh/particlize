'use strict';

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const Constraint = require('../../Constraint-BbpLMJOx.cjs');
const OriginRestoringForce = require('../../OriginRestoringForce-DSz25qe3.cjs');
const THREE = require('three');

function _interopNamespaceDefault(e) {
    const n = Object.create(null, { [Symbol.toStringTag]: { value: 'Module' } });
    if (e) {
        for (const k in e) {
            if (k !== 'default') {
                const d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: () => e[k]
                });
            }
        }
    }
    n.default = e;
    return Object.freeze(n);
}

const THREE__namespace = /*#__PURE__*/_interopNamespaceDefault(THREE);

class BasicConstraintsPlugin {
    name = "BasicConstraintsPlugin";
    description = "A plugin that adds basic constraints and forces to particles, including lifetime management, velocity updates, and mouse interaction.";
    onInit(system) {
        // Lifetime update
        const lifetimeUpdate = new Constraint.Constraint("lifetimeUpdateConstraint", 
        /*glsl*/ `
      if (lifetime > 0.0) {
        lifetime -= u_delta;
      }
    `);
        // Lifetime discard
        const lifetimeDiscard = new Constraint.Constraint("lifetimeDiscardConstraint", 
        /*glsl*/ `
      // Discard particles with lifetime <= 0 but not -1 (-1 means infinite lifetime)
      if (lifetime > -1.0 && lifetime <= 0.0) {
        discard;
      }
    `);
        // Fade out particles based on lifetime
        const colorFadeOnLifetime = new Constraint.Constraint("colorLifetimeConstraint", 
        /*glsl*/ `
      // Fade out when lifetime is between 0 and 1
      if(lifetime > 0.0 && lifetime < 1.0) {
        float fadeAlpha = smoothstep(0.0, 1.0, lifetime);
        color.a *= fadeAlpha;
      }
    `);
        // Velocity update based on force and mass
        const velocityUpdate = new Constraint.Constraint("velocityUpdateConstraint", 
        /*glsl*/ `
      vec3 acceleration = force / mass;
      // Apply acceleration to velocity
      velocity += acceleration * u_delta;

      // // Mouse repulsion (radial, only within radius)
      // vec2 toParticle = position.xy - u_mouse.xy;
      // float dist = length(toParticle);

      // if(dist < 0.2 && dist > 0.0) {
      //   vec2 dir = normalize(toParticle);
      //   float strength = (1.0 - (dist / 0.2)) * 100.0;
      //   velocity.xy += dir * strength * u_delta;
      // }
    `);
        // Position update based on velocity
        const positionUpdate = new Constraint.Constraint("positionUpdateConstraint", 
        /*glsl*/ `
      position += velocity * u_delta;
    `);
        // Origin restoring force
        const originRestoringForce = new OriginRestoringForce.OriginRestoringForce("originRestoringForce", {
            strength: 10,
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
            u_resolution: new THREE__namespace.Vector2(system.canvas.width, system.canvas.height),
            u_texture_resolution: new THREE__namespace.Vector2(system.canvas.width, system.canvas.height),
        })
            .constrainAll(lifetimeDiscard)
            .constrain("velocity", velocityUpdate)
            .constrain("position", positionUpdate)
            .constrain("force", originRestoringForce)
            .constrain("lifetime", lifetimeUpdate)
            .constrain("color", colorFadeOnLifetime);
        // Link the FBOs to the particle material
        const positionFBO = system.manager.properties.get("position")?.fbo;
        const lifetimeFBO = system.manager.properties.get("velocity")?.fbo;
        const colorFBO = system.manager.properties.get("color")?.fbo;
        system.particleMaterial.uniforms[positionFBO.textureName] = {
            value: positionFBO.read.texture,
        };
        system.particleMaterial.uniforms[lifetimeFBO.textureName] = {
            value: lifetimeFBO.read.texture,
        };
        system.particleMaterial.uniforms[colorFBO.textureName] = {
            value: colorFBO.read.texture,
        };
        // Add a morph function to the system
        system.morphTo = (target) => {
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
            }
            else {
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
    onUpdate(system) {
        const positionFBO = system.manager.properties.get("position")?.fbo;
        const lifetimeFBO = system.manager.properties.get("velocity")?.fbo;
        const colorFBO = system.manager.properties.get("color")?.fbo;
        system.particleMaterial.uniforms[positionFBO.textureName].value = positionFBO.read.texture;
        system.particleMaterial.uniforms[lifetimeFBO.textureName].value = lifetimeFBO.read.texture;
        system.particleMaterial.uniforms[colorFBO.textureName].value = colorFBO.read.texture;
    }
}

exports.BasicConstraintsPlugin = BasicConstraintsPlugin;
