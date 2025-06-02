"use client";
import { useState, useLayoutEffect, useRef, useEffect } from "react";
import { ParticleSystem } from "particlize-js";
import { Tweakpane } from "@/lib/components/Tweakpane";

const Home = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleSystem = useRef<ParticleSystem | null>(null);
  const [systemReady, setSystemReady] = useState(false);

  // Setup the particle system
  useLayoutEffect(() => {
    if (!canvasRef.current) return;

    particleSystem.current = new ParticleSystem({
      canvas: canvasRef.current,
      backgroundColor: [0, 0, 0, 1], // RGBA format
    });

    // Animation loop
    const animate = () => {
      particleSystem.current?.update();
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    animate();

    setSystemReady(true);

    return () => {
      cancelAnimationFrame(animationId);
      particleSystem.current?.dispose();
    };
  }, []);

  // Update when particles change
  useEffect(() => {
    if (!particleSystem.current) return;
  }, []);

  return (
    <div className="w-screen h-screen">
      <canvas className="w-full h-full" ref={canvasRef} id="particle-canvas"></canvas>
      {systemReady && particleSystem.current && <Tweakpane system={particleSystem.current} />}
    </div>
  );
};

export default Home;
