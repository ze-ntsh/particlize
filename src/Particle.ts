export class Particle {
  // Properties
  origin: Float32Array = new Float32Array(4);
  position: Float32Array = new Float32Array(4);
  velocity: Float32Array = new Float32Array(4);
  acceleration: Float32Array = new Float32Array(4);
  color: Float32Array = new Float32Array(4);
  size: number = 1;

  constructor(
    properties: Partial<{
      origin: number[];
      position: number[];
      size: number;
      color: number[];
      velocity: number[];
      acceleration: number[];
    }>
  ) {
    let { origin, position, size, color, velocity, acceleration } = properties;

    if (position && position.length === 3) {
      this.position.set(position);
      this.position[3] = 1.0;
    }

    if (origin && origin.length === 3) {
      this.origin.set(origin);
      this.origin[3] = 1.0;
    } else {
      this.origin.set(this.position);
    }

    if (size) {
      this.size = size;
    }

    if (color && color.length === 4) {
      this.color.set(color);
    }

    if (velocity && velocity.length === 3) {
      this.velocity.set(velocity);
    }

    if (acceleration && acceleration.length === 3) {
      this.acceleration.set(acceleration);
    }
  }
}
