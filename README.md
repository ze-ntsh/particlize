# Particlize.js

A powerful, flexible, and high-performance particle system library for Three.js applications. Create stunning visual effects with GPU-accelerated particle simulations, extensive constraint systems, and intuitive APIs.

> The library is in active early development, and the API is subject to change. Please check back often for updates and new features! A comprehensive documentation is coming soon. Plan to have a stable release by end of July 2025.

## ✨ Features

- **GPU-Accelerated**: Leverages WebGL compute shaders for high-performance particle simulation
- **Flexible Constraint System**: Rich collection of forces, constraints, and modifiers
- **Three.js Integration**: Seamless integration with existing Three.js projects
- **TypeScript Support**: Full TypeScript definitions for enhanced developer experience
- **Extensible Architecture**: Plugin system for custom behaviors and effects

## 🚀 Quick Start

### Installation

You can install Particlize.js via npm:

```bash
npm install particlize-js
```

### Basic Usage

```typescript
import * as THREE from "three";
import { ParticleSystem, Particle } from "particlize-js";
import { BasicConstraintsPlugin } from "particlize-js/plugins/templates";
import { RaycasterPlugin } from "./src/plugins/utils";
import { MouseRadialConstraint } from "particlize-js/constraints/interactions";
import { Frame } from "particlize-js/frames";

// Create a basic particle system
const canvas = document.getElementById("particle-canvas");
const partilceSystem = new ParticleSystem({
  canvas: canvas,
  fboHeight: 512,
  fboWidth: 512,
  backgroundColor: [0.001, 0.001, 0.01, 1],
  plugins: [new BasicConstraintsPlugin(), new RaycasterPlugin()],
});

// Create grid of particles
ps.manager.constrain(
  "velocity",
  new MouseRadialConstraint("mouseRepelConstraint", {
    strength: 100,
    radius: 0.1,
  })
);

const particles: Particle[] = [];

const particles = [];

for (let i = 0; i < 100000; i++) {
  x = Math.random() - 1;
  y = Math.random() - 1;
  z = Math.random() - 1;

  const p = new Particle({
    position: new Float32Array([x, y, z]),
    origin: new Float32Array([x, y, z]),
    color: new Float32Array([
      Math.random() * 0.5 + 0.5, // R
      Math.random() * 0.5 + 0.5, // G
      Math.random() * 0.5 + 0.5, // B
      1,
    ]),
  });

  particles.push(p);
}

ps.addParticles(
  new Frame({
    particles: particles,
  })
);

// Update in your render loop
function animate() {
  particleSystem.update(deltaTime);
  requestAnimationFrame(animate);
}
```

## 📚 Documentation

Comprehensive documentation and examples along with an interactive playground will be soon available.

### Performance Optimization

- Automatic LOD (Level of Detail) based on distance
- Frustum culling for off-screen particles
- Adaptive quality settings for different devices
- Memory pool management for zero-garbage collection

### TODOs

- [ ] Complete documentation for all APIs and plugins

## 🤝 Contributing

Contributions are welcome ! I will be setting up a contribution guide soon. In the meantime, feel free to submit issues or pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
