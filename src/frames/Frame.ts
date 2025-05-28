import { Particle } from "@/Particle";
import { FBO } from "@/FBO";
import { PropertyManager } from "@/PropertyManager";

export class Frame {
  particles: Particle[] = [];
  data: Record<string, Float32Array> = {};
  count: number = 0;

  constructor(
    { particles = [] }: { particles: Particle[] } = {
      particles: [],
    }
  ) {
    if (!Array.isArray(particles)) {
      throw new Error("Particles must be an array of Particle instances.");
    }

    this.particles = particles;
    this.count = particles.length;
  }

  build(propertyManager: PropertyManager): void {
    const properties = propertyManager.properties;

    for (const propertyName in properties) {
      const property = propertyManager.properties[propertyName];

      if (!property.fbo) {
        throw new Error(`Please build the property manager before building the frame.`);
      }

      this.data[property.fbo.name] = new Float32Array(this.count * 4);
    }

    // Loop over particles to set properties
    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i];
      propertyManager.validate(particle);
      const offset = i * 4;
      for (const property in properties) {
        const { fbo, channelOffset } = properties[property];
        const value = particle[property];
        this.data[(fbo as FBO).name].set(value, offset + channelOffset);
      }
    }
  }

  dispose(): void {
    this.data = {};
  }
}
