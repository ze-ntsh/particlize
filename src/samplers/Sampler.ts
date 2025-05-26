import * as THREE from "three";

export abstract class Sampler {
  abstract sample(
    targetPosition: THREE.Vector3,
    targetNormal: THREE.Vector3 | null,
    targetColor: THREE.Color | null,
    targetUV: THREE.Vector2 | null
  ): this;
  abstract build(): this;
}
