"use client";
import { useLayoutEffect, useRef } from "react";
import { ParticleSystem, Particle } from "particlize-js";
import { Frame } from "particlize-js/frames";
import { Pane } from "tweakpane";

const Home = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystem = useRef<ParticleSystem | null>(null);
  const particles = useRef<Particle[]>([]);
  const paneRef = useRef<Pane | null>(null);
  const PARAMS = {
    particleSystem: {
    },
    uniforms: {
    },
    constraints: {
    },
    preprocessing: {
    },
  }

  useLayoutEffect(() => {
    paneRef.current = new Pane();
    const pane = paneRef.current;

    pane.addFolder({
      title: "Particle System",
    });
    pane.addFolder({
      title: "Uniforms",
    });
    pane.addFolder({
      title: "Constraints",
    });
    pane.addFolder({
      title: "Preprocessing",
    });

    particleSystem.current = new ParticleSystem({
      canvas: canvasRef.current as HTMLCanvasElement,
      backgroundColor: [0, 0, 0, 1], // RGBA format
    });

    const particleCount = 100000;
    const radius = 2;

    for (let i = 0; i < particleCount; i++) {
      // Use spherical coordinates with uniform distribution
      const theta = Math.random() * Math.PI * 2; // Azimuthal angle [0, 2π]
      const phi = Math.acos(2 * Math.random() - 1); // Polar angle [0, π]

      // Convert to Cartesian coordinates
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const particle = new Particle({
        origin: Float32Array.from([x, y, z]),
        position: Float32Array.from([0, 0, 0]),
        size: Float32Array.from([1.2]),
        color: Float32Array.from([Math.random(), Math.random(), Math.random(), 1]), // RGBA format
      });

      particles.current.push(particle);
    }

    particleSystem.current.addParticles(
      new Frame({
        particles: particles.current,
      })
    );
    particleSystem.current?.start();

    return () => {
      paneRef.current?.dispose();
      particleSystem.current?.stop();
    };
  }, []);

  // useLayoutEffect(() => {
  //   particleSystem.current = new ParticleSystem({
  //     canvas: canvasRef.current as HTMLCanvasElement,
  //     backgroundColor: [0, 0, 0, 1], // RGBA format
  //   });
  // }, []);

  return (
    <div className="w-screen h-screen">
      <canvas className="w-full h-full" ref={canvasRef} id="particle-canvas"></canvas>
    </div>
  );
};

export default Home;
