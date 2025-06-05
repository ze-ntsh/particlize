import { Constraint } from "@/constraints";

// Types
export type DirectionalForceParams = {
  strength: [number, number, number];
};

export class DirectionalForce extends Constraint {
  // Default parameters
  static readonly defaultParams: DirectionalForceParams = {
    strength: [0, 0, 0],
  };

  constructor(name: string, params: DirectionalForceParams) {
    super(
      name,
      /*glsl*/ `
        force = #STRENGTH * mass;
      `
    );

    this.params = { ...DirectionalForce.defaultParams, ...params };
    this.build();
  }
}
