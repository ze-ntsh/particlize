export class Particle {
  // Properties
  origin: [number, number, number] = [0, 0, 0]; // Default origin at the origin of the world
  position: [number, number, number] = [0, 0, 0]; // Default position at the origin of the world
  velocity: [number, number, number] = [0, 0, 0]; // Default velocity is zero
  force: [number, number, number] = [0, 0, 0]; // Default force is zero
  color: [number, number, number, number] = [0, 0, 0, 1]; // Default color is black with full opacity
  size: number = 1; // Default size of the particle
  mass: number = 1; // Default mass of the particle
  lifetime: number = -1; // Default lifetime is infinite (-1 means it never expires)

  constructor(
    properties: Partial<{
      // Vector properties
      origin: [number, number, number];
      position: [number, number, number];
      velocity: [number, number, number];
      force: [number, number, number];

      // Scalar properties
      size: number;
      mass: number;
      color: [number, number, number, number];
      lifetime: number;
    }>
  ) {
    let { origin, position, velocity, force, mass, size, color, lifetime } = properties;

    if (position && position.length === 3) {
      this.position = position;
    }

    if (origin && origin.length === 3) {
      this.origin = origin;
    } else {
      // If origin is not provided, set it to the position
      this.origin = this.position;
    }

    if (size) {
      this.size = size;
    }

    if (color && color.length === 4) {
      this.color = color;
    }

    if (velocity && velocity.length === 3) {
      this.velocity = velocity;
    }

    if (force && force.length === 3) {
      this.force = force;
    }

    if (mass) {
      this.mass = mass;
    }

    if (lifetime) {
      this.lifetime = lifetime;
    }
  }
}
