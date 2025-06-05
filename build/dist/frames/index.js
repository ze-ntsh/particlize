import * as THREE from 'three';
import { P as Particle } from '../Particle-DG6Mm0Qd.js';

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
        const position = new THREE.Vector3(0, 0, 0);
        for (let i = 0; i < this.count; i++) {
            this.sampler.sample(position, null, null, null);
            this.particles.push(new Particle({
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

export { Frame, SamplerFrame };
