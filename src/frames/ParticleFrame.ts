import { Particle } from "@/Particle";
import { Frame } from "./Frame";

export class ParticleFrame extends Frame {
  constructor({ particles = [] }: { particles: Particle[] }) {
    super();
    this.particles = particles;
    this.count = particles.length;
  }
}
