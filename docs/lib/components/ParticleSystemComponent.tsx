"use client";
import { useLayoutEffect, useRef } from "react";
import { ParticleSystem } from "particlize-js";

export const ParticleSystemComponent = ({ system }: { system: ParticleSystem }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    if (canvasRef.current) {
      // Initialize the particle system with the canvas
      system.canvas = canvasRef.current;

      // Start the particle system
      system.start();

      // Cleanup on unmount
      return () => {
        system.stop();
      };
    }
  });

  return <canvas ref={canvasRef}></canvas>;
};
