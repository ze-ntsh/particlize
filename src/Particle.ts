import * as THREE from "three";
import { ParticleProperties } from "@/types/particleSystem";

export class Particle {
  // Properties
  origin: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  acceleration: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  size: number = 1;
  color: THREE.Vector4 = new THREE.Vector4(1, 1, 1, 1); // RGBA

  constructor(properties: Partial<ParticleProperties>) {
    const { origin, position, size, color } = properties;
    
    if (position && position.length === 3) {
      // Convert to GL coordinates
      

      this.position.fromArray(position);
    }
    
    if (origin && origin.length === 3) {
      this.origin.fromArray(origin);
    } else {
      this.origin.copy(this.position);
    }

    if (size) {
      this.size = size;
    }

    if (color && color.length === 4) {
      this.color.fromArray(color);
    }
  }
}
