import { Particle } from "@/Particle";
import { FBO } from "@/FBO";
import { PropertyManager } from "@/PropertyManager";

export class Frame extends EventTarget {
  uuid: string = crypto.randomUUID();
  particles: Particle[] = [];
  data: Record<string, Float32Array> = {};
  count: number = 0;
  worker: Worker | null = null;

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
    // const mininalPropertyObject: Record<string, { fbo: {name: string}; channelOffset: number; defaultValue: Float32Array }> = {};

    // const properties = propertyManager.properties;
    // for (const propertyName in properties) {
    //   const property = properties[propertyName];
    //   mininalPropertyObject[propertyName] = {
    //     fbo: {
    //       name: property.fbo.name,
    //     },
    //     channelOffset: property.channelOffset,
    //     defaultValue: property.defaultValue,
    //   };
    // }

    // this.worker = new Worker(new URL("@/utils/buildWorker.ts", import.meta.url));
    // this.worker.postMessage({
    //   particles: this.particles,
    //   properties: mininalPropertyObject,
    // });
    // this.worker.onmessage = (e) => {
    //   console.log("Worker finished processing particles.", e.data);

    //   this.data = e.data as Record<string, Float32Array>;
    //   this.worker?.terminate();
    //   this.worker = null;

    //   this.dispatchEvent(new Event("buildComplete"));
    // };

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
