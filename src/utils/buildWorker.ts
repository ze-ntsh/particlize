import { Particle } from "@/Particle";
import { PropertyManager } from "@/PropertyManager";

self.onmessage = (e) => {
  const {
    particles,
    properties,
  }: {
    particles: Particle[];
    properties: PropertyManager["properties"];
  } = e.data;
  const result: Record<string, Float32Array> = {};
  const count = particles.length;

  for (const propertyName in properties) {
    const property = properties[propertyName];

    if (!property.fbo) {
      throw new Error(`Please build the property manager before building the frame.`);
    }

    result[property.fbo.name] = new Float32Array(count * 4);
  }

  // Loop over particles to set properties
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    const offset = i * 4;
    for (const propName in properties) {
      const { fbo, channelOffset, defaultValue } = properties[propName];
      const value = particle[propName] || defaultValue || new Float32Array(4);
      result[fbo.name].set(value, offset + channelOffset);
    }
  }

  postMessage(result);
};
