import * as THREE from "three";
import { Sampler } from "@/samplers/Sampler";
import { Particle } from "@/Particle";

export class Particlizer {
  sampler: Sampler | null = null;
  count: number = 1000;
  particles: Particle[] = [];

  data: {
    origin: Float32Array;
    positionSize: Float32Array;
    velocityLifetime: Float32Array;
    forceMass: Float32Array;
    color: Float32Array;
  };

  constructor({ particles = undefined, count = 0, sampler = null }: { particles?: Particle[]; count?: number; sampler?: Sampler | null }) {
    if (sampler && particles) {
      console.warn("Both sampler and particles provided. Using particles array and ignoring ignoring.");
    }

    if (particles && Array.isArray(particles) && particles.length > 0) {
      this.particles = particles;
      this.count = particles.length;
      this.sampler = null;
    } else if (sampler && sampler instanceof Sampler) {
      this.particles = [];
      this.count = count || this.count;
      this.sampler = sampler;
    } else {
      console.error("You must provide either a non-empty array of Particles or a valid THREE.Mesh with geometry.");
    }

    this.data = {
      origin: new Float32Array(this.count * 4),
      velocityLifetime: new Float32Array(this.count * 4),
      positionSize: new Float32Array(this.count * 4),
      forceMass: new Float32Array(this.count * 4),
      color: new Float32Array(this.count * 4),
    };

    if (this.particles.length > 0) {
      this.initializeFromParticles();
    } else if (this.sampler) {
      this.initializeFromSampler();
    } else {
      console.error("No valid particles or sampler provided for initialization.");
    }
  }

  private initializeFromParticles() {
    this.particles.forEach((particle, index) => {
      const offset = index * 4;
      this.data.origin.set(particle.origin, offset);

      this.data.velocityLifetime.set(particle.position, offset);
      this.data.velocityLifetime[offset + 3] = particle.lifetime;

      this.data.positionSize.set(particle.velocity, offset);
      this.data.positionSize[offset + 3] = particle.size;

      this.data.forceMass.set(particle.force, offset);
      this.data.forceMass[offset + 3] = particle.mass;

      this.data.color.set(particle.color, offset);
    });
  }

  private initializeFromSampler() {
    if (this.sampler === null) {
      console.warn("Sampler is not provided for initialization");
      return;
    }

    const position = new THREE.Vector3();
    const color = new THREE.Color();

    this.sampler?.build();
    for (let i = 0; i < this.count; i++) {
      this.sampler.sample(position, null, color, null);
      const offset = i * 4;
      this.data.positionSize.set([position.x, position.y, position.z, 1.0], offset);
      this.data.origin.set([position.x, position.y, position.z, 1.0], offset);
      this.data.color.set([color.r, color.g, color.b, 1.0], offset);
      this.data.velocityLifetime.set([0, 0, 0, -1.0], offset); // Default velocity and lifetime
      this.data.forceMass.set([0, 0, 0, 1.0], offset); // Default force and mass
    }
  }
}
