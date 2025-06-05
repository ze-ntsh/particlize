import * as THREE from "three";

export abstract class SamplerInterface {
  abstract sample(
    targetPosition: THREE.Vector3,
    targetNormal: THREE.Vector3 | null,
    targetColor: THREE.Color | null,
    targetUV: THREE.Vector2 | null
  ): this;
  abstract build(): this;
}

export const checkIfSampler = (sampler: any): sampler is SamplerInterface => {
  return typeof sampler === "object" && typeof sampler.sample === "function" && typeof sampler.build === "function";
};
