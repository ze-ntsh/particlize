import { Sampler } from "@/samplers/Sampler";
import { Frame } from "./Frame";
import * as THREE from "three";
import { Particle } from "@/Particle";

export class SamplerFrame extends Frame {
  sampler: Sampler;
  constructor({ sampler, count = 0 }: { sampler: Sampler; count?: number }) {
    super();
    if (!(sampler instanceof Sampler)) {
      throw new Error("Invalid sampler provided. Must be an instance of Sampler.");
    }

    this.sampler = sampler;
    this.count = count;
    this.sampler?.build();

    // Generate particles using the sampler
    const postion = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < this.count; i++) {
      this.sampler.sample(postion, null, null, null);

      this.particles.push(
        new Particle({
          origin: Float32Array.from(postion.toArray()),
          position: Float32Array.from(postion.toArray()),
        })
      );
    }
  }

  dispose(): void {
    this.particles = [];
    super.dispose();
  }
}
