import { deepMerge } from "@/utils";
import { Constraint } from "../Constraint";

// Types
export type DirectionalForceParams = {
  strength: {
    value: [number, number, number];
    hardcode?: boolean;
  };
};

export class DirectionalForce extends Constraint {
  // Default parameters
  static readonly defaultParams: DirectionalForceParams = {
    strength: { value: [0, 0, 0], hardcode: false },
  };

  constructor(name: string, params: DirectionalForceParams) {
    params = deepMerge(DirectionalForce.defaultParams, params) as DirectionalForceParams;

    super(
      name,
      /*glsl*/ `
        force = #STRENGTH * mass;
      `
    );

    this.params = params;
    this.build();
  }
}
