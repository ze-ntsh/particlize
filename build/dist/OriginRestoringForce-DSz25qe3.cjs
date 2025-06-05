'use strict';

const Constraint = require('./Constraint-BbpLMJOx.cjs');

class OriginRestoringForce extends Constraint.Constraint {
    // Default parameters
    static defaultParams = {
        strength: 10,
    };
    constructor(name, params = {}) {
        super(name, 
        /*glsl*/ `
      float d@ = 2.0 * sqrt(#STRENGTH);
      
      vec3 restoring@ = (origin - position) * #STRENGTH;
      vec3 damping@ = -velocity * d@;
      
      vec3 acceleration@ = restoring@ + damping@;
      force = acceleration@ * mass;
      `);
        this.params = { ...OriginRestoringForce.defaultParams, ...params };
        this.build();
    }
}

exports.OriginRestoringForce = OriginRestoringForce;
