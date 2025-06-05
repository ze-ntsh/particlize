import { checkIfSampler, SamplerInterface } from "@/samplers/SamplerInterface";
import { Frame } from "./Frame";
import * as THREE from "three";
import { Particle } from "@/Particle";
import { PropertyManager } from "@/PropertyManager";

export class SamplerFrame extends Frame {
  sampler: SamplerInterface;
  constructor({ sampler, count = 0 }: { sampler: SamplerInterface; count?: number }) {
    super();
    if (!checkIfSampler(sampler)) {
      throw new Error("Invalid sampler provided to SamplerFrame");
    }

    this.sampler = sampler;
    this.count = count;
  }

  build(propertyManager: PropertyManager) {
    this.sampler?.build();

    // Generate particles using the sampler
    const position = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < this.count; i++) {
      this.sampler.sample(position, null, null, null);

      this.particles.push(
        new Particle({
          origin: Float32Array.from(position.toArray()),
          position: Float32Array.from(position.toArray()),
        })
      );
    }

    super.build(propertyManager);
  }

  dispose(): void {
    this.particles = [];
    super.dispose();
  }
}
