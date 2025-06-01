import { Constraint } from "./Constraint";

class HoverConstraint extends Constraint {
  // Default parameters
  static readonly defaultParams = {
    strength: { value: 0.1, hardcode: false },
    height: { value: 0.5, hardcode: false },
  };

  constructor(name: string, params = {}) {
    super(
      name,
      /*glsl*/ `
      float hover@@ = position.y - #HEIGHT;
      vec3 hoverForce@@ = vec3(0.0, -hover@@ * #STRENGTH, 0.0);
      force += hoverForce@@ * mass;
      `
    );
    this.params = { ...HoverConstraint.defaultParams, ...params };
  }
}
