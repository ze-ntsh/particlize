import * as THREE from "three";

export abstract class Sampler {
  constructor(mesh: THREE.Mesh) {}
  abstract sample(targetPosition: THREE.Vector3, targetNormal: THREE.Vector3, targetColor: THREE.Color, targetUV: THREE.Vector2): this;
}
