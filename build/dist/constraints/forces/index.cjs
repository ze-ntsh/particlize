'use strict';

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const Constraint = require('../../Constraint-BbpLMJOx.cjs');
const OriginRestoringForce = require('../../OriginRestoringForce-DSz25qe3.cjs');

class RadialForce extends Constraint.Constraint {
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

class DirectionalForce extends Constraint.Constraint {
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

exports.OriginRestoringForce = OriginRestoringForce.OriginRestoringForce;
exports.DirectionalForce = DirectionalForce;
exports.RadialForce = RadialForce;
