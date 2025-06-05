"use client";

import { Particle, ParticleSystem } from "particlize-js";
import { BasicConstraintsPlugin } from "particlize-js/plugins/templates";
import { RaycasterPlugin } from "particlize-js/plugins/utils";
import * as THREE from "three";
import { useLayoutEffect, useRef } from "react";
import { Frame } from "particlize-js/frames";
import { Constraint } from "particlize-js/constraints";
import { MouseRadialConstraint } from "particlize-js/constraints/interactions";
import { CurlNoiseConstraint } from "particlize-js/constraints/noise";
import { Tweakpane } from "@/lib/components/Tweakpane";

export default function PlaygroundPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // useLayoutEffect(() => {
  //   if (!canvasRef.current) return;

  //   const ps = new ParticleSystem({
  //     canvas: canvasRef.current,
  //     fboHeight: 512,
  //     fboWidth: 512,
  //     backgroundColor: [0, 0, 0, 1], // Darker space-like background
  //     plugins: [new BasicConstraintsPlugin(), new RaycasterPlugin()],
  //   }); // Create grid of particles

  //   const animate = () => {
  //     requestAnimationFrame(animate);
  //     ps.update();
  //   };

  //   animate();

  //   return () => {
  //     ps.dispose();
  //   };
  // }, []);

  return (
    <main className="flex flex-1 flex-col justify-center text-center relative">
      <canvas className="w-full h-full absolute inset-0" ref={canvasRef}></canvas>
    </main>
  );
}
