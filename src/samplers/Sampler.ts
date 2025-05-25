import * as THREE from "three";

export abstract class Sampler {
  abstract sample(targetPosition: THREE.Vector3, targetNormal: THREE.Vector3, targetColor: THREE.Color, targetUV: THREE.Vector2): this;
}
