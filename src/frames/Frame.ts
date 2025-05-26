import { Particle } from "@/Particle";

export abstract class Frame {
  particles: Particle[] = [];
  data: Record<string, Float32Array> = {};
  count: number = 0;

  build(propertyToFBOMap: Record<string, [string, number]>): void {
    for (const [_, [fboName]] of Object.entries(propertyToFBOMap)) {
      if (!this.data[fboName]) {
        this.data[fboName] = new Float32Array(this.count * 4); // 4 channels per particle
      }
    }

    // Loop over particles to set properties
    for (let i = 0; i < this.count; i++) {
      const particle = this.particles[i];
      const offset = i * 4;
      for (const property in propertyToFBOMap) {
        const [fboName, channelOffset] = propertyToFBOMap[property];
        const value = particle[property];
        if (Array.isArray(value)) {
          this.data[fboName].set(value, offset + channelOffset);
        } else {
          this.data[fboName][offset + channelOffset] = value;
        }
      }
    }
  }

  dispose(): void {
    this.data = {};
  }
}
