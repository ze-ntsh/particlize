"use client";

import { Particle, ParticleSystem } from "particlize-js";
import { BasicConstraintsPlugin } from "particlize-js/plugins/templates";
import { RaycasterPlugin } from "particlize-js/plugins/utils";
import * as THREE from "three";
import { useLayoutEffect, useRef } from "react";
import { Frame } from "particlize-js/frames";
import { EffectComposer, EffectPass, RenderPass, ScanlineEffect } from "postprocessing";
import { Constraint } from "particlize-js/constraints";
import { MouseRadialConstraint } from "particlize-js/constraints/interactions";
import { CurlNoiseConstraint } from "particlize-js/constraints/noise";

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    if (!canvasRef.current) return;

    const ps = new ParticleSystem({
      canvas: canvasRef.current,
      fboHeight: 512,
      fboWidth: 512,
      backgroundColor: [0, 0, 0, 1], // Darker space-like background
      plugins: [new BasicConstraintsPlugin(), new RaycasterPlugin()],
    }); // Create grid of particles

    // Create grid of particles
    ps.manager.constrain(
      "velocity",
      new MouseRadialConstraint("mouseRepelConstraint", {
        strength: 50,
        radius: 0.1,
        axis: "xy",
      })
    );
    // Add curl noise constraint for flowing motion
    ps.manager.constrain(
      "velocity",
      new CurlNoiseConstraint("curlFlow", {
        strength: 0.5,
        scale: 3.0,
        timeScale: 0.5,
      })
    );

    const createVortexCables = (particleCount = 250000, axis = "y") => {
      const particles = [];

      // Vortex parameters
      const numCables = 120; // Balanced cable count
      const numLayers = 5; // Clean layer structure
      const particlesPerCable = Math.floor(particleCount / (numCables * numLayers));

      // Positioning based on axis
      const isVertical = axis === "y";
      const start = isVertical ? 1.1 : -1.8;
      const end = isVertical ? -1.0 : 1.8;
      const bundleRadius = 0.35; // Smoother bundle

      // More controlled spread
      const startSpread = 2.0;
      const endSpread = 2.5;

      for (let layer = 0; layer < numLayers; layer++) {
        const layerZ = (layer - numLayers / 2) * 0.15; // Even layer spacing

        for (let cableIndex = 0; cableIndex < numCables; cableIndex++) {
          // Uniform cable positioning with subtle variation
          const baseAngle = (cableIndex / numCables) * Math.PI * 2;
          const angleVariation = Math.sin(cableIndex * 0.5) * 0.2; // Smooth variation
          const cableAngle = baseAngle + angleVariation;

          // More controlled spread with gentle randomness
          const startRadius = startSpread * (0.8 + Math.sin(cableIndex * 0.3) * 0.2);
          const endRadius = endSpread * (0.8 + Math.cos(cableIndex * 0.4) * 0.2);

          // Smoother start and end positions
          const startX = Math.cos(cableAngle) * startRadius;
          const startY = Math.sin(cableAngle) * startRadius;
          const rotationOffset = Math.PI * 0.6 + Math.sin(cableIndex * 0.1) * 0.3; // Controlled rotation
          const endX = Math.cos(cableAngle + rotationOffset) * endRadius;
          const endY = Math.sin(cableAngle + rotationOffset) * endRadius;

          for (let i = 0; i < particlesPerCable; i++) {
            const particle = new Particle({});

            // Normalized position along cable
            const t = i / (particlesPerCable - 1);

            // Smoother bundling curve
            const distanceFromMiddle = Math.abs(t - 0.5) * 2;
            const bundleFactor = 1 - Math.pow(distanceFromMiddle, 2); // Smoother curve

            // Gentler spiral effect
            const spiralAngle = cableAngle + t * Math.PI * 3 * bundleFactor;
            const spiralRadius = bundleRadius * (1 + Math.sin(t * Math.PI * 6) * 0.2);

            let x, y, primaryAxis;

            if (isVertical) {
              primaryAxis = start + (end - start) * t;

              const unbundledX = startX + (endX - startX) * t;
              const unbundledZ = startY + (endY - startY) * t;

              const bundleTargetX = Math.cos(spiralAngle) * spiralRadius;
              const bundleTargetZ = Math.sin(spiralAngle) * spiralRadius;

              x = unbundledX + (bundleTargetX - unbundledX) * bundleFactor;
              y = primaryAxis;
              var z = unbundledZ + (bundleTargetZ - unbundledZ) * bundleFactor + layerZ;
            } else {
              primaryAxis = start + (end - start) * t;

              const unbundledY = startX + (endX - startX) * t;
              const unbundledZ = startY + (endY - startY) * t;

              const bundleTargetY = Math.cos(spiralAngle) * spiralRadius;
              const bundleTargetZ = Math.sin(spiralAngle) * spiralRadius;

              x = primaryAxis;
              y = unbundledY + (bundleTargetY - unbundledY) * bundleFactor;
              var z = unbundledZ + (bundleTargetZ - unbundledZ) * bundleFactor + layerZ;
            }

            // Minimal, consistent cable thickness
            const cableThickness = 0.01;
            const offsetX = Math.sin(i * 0.1) * cableThickness;
            const offsetZ = Math.cos(i * 0.1) * cableThickness;

            const finalX = x + offsetX;
            const finalZ = layerZ + offsetZ;

            particle.position = new Float32Array([finalX, y, finalZ]);
            particle.origin = new Float32Array([finalX, y, finalZ]);

            // Smoother color gradients
            const cableHue = (cableIndex / numCables) * 0.7;
            const layerHue = (layer / numLayers) * 0.15;
            const positionHue = t * 0.25;

            const hue = (cableHue + layerHue + positionHue) % 1;
            const saturation = 0.75 + bundleFactor * 0.25;
            const value = 0.6 + bundleFactor * 0.4;

            // HSV to RGB conversion
            const c = value * saturation;
            const x_val = c * (1 - Math.abs(((hue * 6) % 2) - 1));
            const m = value - c;

            let r = 0,
              g = 0,
              b = 0;
            const hueSection = Math.floor(hue * 6);

            switch (hueSection) {
              case 0:
                r = c;
                g = x_val;
                b = 0;
                break;
              case 1:
                r = x_val;
                g = c;
                b = 0;
                break;
              case 2:
                r = 0;
                g = c;
                b = x_val;
                break;
              case 3:
                r = 0;
                g = x_val;
                b = c;
                break;
              case 4:
                r = x_val;
                g = 0;
                b = c;
                break;
              default:
                r = c;
                g = 0;
                b = x_val;
                break;
            }

            particle.color = new Float32Array([r + m, g + m, b + m, 1.0]);
            particles.push(particle);
          }
        }
      }

      console.log(`Created vortex cables: ${particles.length} particles`);
      return particles;
    };

    const gridFrame = new Frame({
      particles: createVortexCables(250000),
    });

    ps.addParticles(gridFrame);

    // Initialize with the particle grid
    const animate = () => {
      ps.update();
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      ps.dispose();
    };
  }, []);

  return (
    <main className="flex flex-1 flex-col justify-center text-center relative">
      <canvas className="w-full h-full absolute inset-0" ref={canvasRef}></canvas>
      <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        <div className="bg-black/20 backdrop-blur-sm border border-white/10 rounded-xl px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 shadow-2xl pointer-events-none max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-4">
          <div className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-1 sm:mb-2 tracking-tight">Particlize</div>
          <div className="text-white/80 text-sm sm:text-base md:text-lg lg:text-xl font-light mb-3 sm:mb-4">A modern particle system for the web</div>
          <div className="text-white/60 text-xs sm:text-sm font-medium bg-white/5 border border-white/10 rounded-lg px-3 py-2 mb-2">
            🚧 Documentation & Playground Coming Soon
          </div>
        </div>
      </div>
    </main>
  );
}
