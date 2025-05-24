export type ParticleSystemProperties = {
  canvas: HTMLCanvasElement;
  maxParticles: number;
};

export type ParticleProperties = {
  origin: [number, number, number];
  position: [number, number, number];
  color: [number, number, number, number];
  size: number;
  velocity: [number, number, number];
  acceleration: [number, number, number];
};
