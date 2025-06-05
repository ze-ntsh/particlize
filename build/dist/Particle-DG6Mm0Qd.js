class Particle {
    constructor(properties) {
        for (const key in properties) {
            const value = properties[key];
            if (value instanceof Float32Array) {
                this[key] = value; // Store Float32Array directly
            }
            else {
                throw new Error(`Invalid property type for ${key}: ${typeof value}. Expected a Float32Array`);
            }
        }
    }
}

export { Particle as P };
