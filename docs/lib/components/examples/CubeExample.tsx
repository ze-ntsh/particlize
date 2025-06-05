"use client";
import { useLayoutEffect, useRef } from "react";
import { ParticleSystem, Particle } from "particlize-js";
import { SamplerFrame } from "particlize-js/frames";
import { MeshSurfaceSampler } from "particlize-js/samplers";
import { Frame } from "particlize-js/frames";
import * as THREE from "three";
import { BasicConstraintsPlugin } from "particlize-js/plugins/templates";

export const CubeExample = ({ type = "math" }: { type: "mesh" | "math" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    if (canvasRef.current) {
      const system = new ParticleSystem({
        canvas: canvasRef.current,
        fboHeight: 128,
        fboWidth: 128,
        plugins: [new BasicConstraintsPlugin()],
      });

      // Create 1000 random particles in -1,1 space
      let frame: Frame | null = null;

      if (type === "math") {
        const particles: Particle[] = [];
        for (let i = 0; i < 10000; i++) {
          const x = Math.random() - 0.5; // Random between -0.5 and 0.5
          const y = Math.random() - 0.5; // Random between -0.5 and 0.5
          const z = Math.random() - 0.5; // Random between -0.5 and 0.5

          particles.push(
            new Particle({
              position: new Float32Array([x, y, z]),
              origin: new Float32Array([x, y, z]),
              color: new Float32Array([
                Math.random(),
                Math.random(),
                Math.random(),
                1.0, // Alpha channel
              ]),
            })
          );

          frame = new Frame({
            particles: particles,
          });
        }
      } else {
        // Create a cube mesh sampler
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        frame = new SamplerFrame({
          sampler: new MeshSurfaceSampler(new THREE.Mesh(geometry)),
          count: 10000,
        });
      }
      if (frame) {
        system.addParticles(frame);

        // Start the particle system
        let animationId: number;
        const animate = () => {
          system.update();
          animationId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
          if (animationId) {
            cancelAnimationFrame(animationId);
          }
        };
      }
    }
  }, []);

  return (
    <div className="w-full max-h-[500px] h-full">
      <canvas ref={canvasRef}></canvas>
    </div>
  );
};
