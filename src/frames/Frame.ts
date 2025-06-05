import { Particle } from "@/Particle";
import { FBO } from "@/FBO";
import { PropertyManager } from "@/PropertyManager";

export class Frame extends EventTarget {
  uuid: string = crypto.randomUUID();
  particles: Particle[] = [];
  data: Record<string, Float32Array> = {};
  count: number = 0;
  map: { [key: string]: Float32Array } = {};

  constructor(
    { particles = [] }: { particles: Particle[] } = {
      particles: [],
    }
  ) {
    super();
    if (!Array.isArray(particles)) {
      throw new Error("Particles must be an array of Particle instances.");
    }

    this.particles = particles;
    this.count = particles.length;
  }

  build(propertyManager: PropertyManager) {
    const properties = propertyManager.properties;

    for (const property of properties.values()) {
      this.data[property.fbo.name] = new Float32Array(this.count * property.fbo.channels);
    }

    // Loop over particles to set properties
    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i];
      for (const property of properties.values()) {
        const offset = i * property.fbo.channels;
        const { name, fbo, channelOffset, defaultValue } = property;
        const value = particle[name] || defaultValue || new Float32Array(property.size);
        this.data[(fbo as FBO).name].set(value, offset + channelOffset);
      }
    }
  }

  dispose(): void {
    this.data = {};
  }
}
