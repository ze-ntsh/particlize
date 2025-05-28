export class Particle {
  [key: string]: Float32Array;

  constructor(properties: { [key: string]: Float32Array }) {
    for (const key in properties) {
      const value = properties[key];
      if (value instanceof Float32Array) {
        this[key] = value; // Store Float32Array directly
      } else {
        throw new Error(`Invalid property type for ${key}: ${typeof value}. Expected a Float32Array`);
      }
    }
  }
}
