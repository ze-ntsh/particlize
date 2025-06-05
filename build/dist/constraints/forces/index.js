import { C as Constraint } from '../../Constraint-CzMlKNzW.js';
export { O as OriginRestoringForce } from '../../OriginRestoringForce-D-KMxY5y.js';

class RadialForce extends Constraint {
    // Default parameters
    static defaultParams = {
        center: [0, 0, 0],
        strength: [0, 0, 0],
    };
    constructor(name, params) {
        super(name, 
        /*glsl*/ `
      vec3 toParticle@ = position - #CENTER;
      float dist@ = length(toParticle@);
      vec3 dir@ = normalize(toParticle@);
      force += dir@ * #STRENGTH * mass / (dist@ * dist@);
      `);
        this.params = { ...RadialForce.defaultParams, ...params };
        this.build();
    }
}

class DirectionalForce extends Constraint {
    // Default parameters
    static defaultParams = {
        strength: [0, 0, 0],
    };
    constructor(name, params) {
        super(name, 
        /*glsl*/ `
        force = #STRENGTH * mass;
      `);
        this.params = { ...DirectionalForce.defaultParams, ...params };
        this.build();
    }
}

export { DirectionalForce, RadialForce };
