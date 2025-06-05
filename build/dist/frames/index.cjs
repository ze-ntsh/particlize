'use strict';

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const THREE = require('three');
const Particle = require('../Particle-C3EIfUgz.cjs');

function _interopNamespaceDefault(e) {
    const n = Object.create(null, { [Symbol.toStringTag]: { value: 'Module' } });
    if (e) {
        for (const k in e) {
            if (k !== 'default') {
                const d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: () => e[k]
                });
            }
        }
    }
    n.default = e;
    return Object.freeze(n);
}

const THREE__namespace = /*#__PURE__*/_interopNamespaceDefault(THREE);

class Frame extends EventTarget {
    uuid = crypto.randomUUID();
    particles = [];
    data = {};
    count = 0;
    map = {};
    constructor({ particles = [] } = {
        particles: [],
    }) {
        super();
        if (!Array.isArray(particles)) {
            throw new Error("Particles must be an array of Particle instances.");
        }
        this.particles = particles;
        this.count = particles.length;
    }
    build(propertyManager) {
        const properties = propertyManager.properties;
        for (const property of properties.values()) {
            this.data[property.fbo.name] = new Float32Array(this.count * property.fbo.channels);
        }
        // Loop over particles to set properties
        for (let i = 0; i < this.count; i++) {
            const particle = this.particles[i];
            for (const property of properties.values()) {
                const offset = i * property.fbo.channels;
                const { name, fbo, channelOffset, defaultValue } = property;
                const value = particle[name] || defaultValue || new Float32Array(property.size);
                this.data[fbo.name].set(value, offset + channelOffset);
            }
        }
    }
    dispose() {
        this.data = {};
    }
}

const checkIfSampler = (sampler) => {
    return typeof sampler === "object" && typeof sampler.sample === "function" && typeof sampler.build === "function";
};

class SamplerFrame extends Frame {
    sampler;
    constructor({ sampler, count = 0 }) {
        super();
        if (!checkIfSampler(sampler)) {
            throw new Error("Invalid sampler provided to SamplerFrame");
        }
        this.sampler = sampler;
        this.count = count;
    }
    build(propertyManager) {
        this.sampler?.build();
        // Generate particles using the sampler
        const position = new THREE__namespace.Vector3(0, 0, 0);
        for (let i = 0; i < this.count; i++) {
            this.sampler.sample(position, null, null, null);
            this.particles.push(new Particle.Particle({
                origin: Float32Array.from(position.toArray()),
                position: Float32Array.from(position.toArray()),
            }));
        }
        super.build(propertyManager);
    }
    dispose() {
        this.particles = [];
        super.dispose();
    }
}

exports.Frame = Frame;
exports.SamplerFrame = SamplerFrame;
