import { Frame } from "@/frames";
import { ParticleSystem } from "@/ParticleSystem";

export interface ParticlePlugin {
  name?: string;
  description?: string;
  onInit?(system: ParticleSystem): void;
  onUpdate?(system: ParticleSystem): void;
  onDispose?(system: ParticleSystem): void;
  onAddParticles?(system: ParticleSystem, frame: Frame): void;
  onMorph?(system: ParticleSystem, frame: Frame): void;
}
