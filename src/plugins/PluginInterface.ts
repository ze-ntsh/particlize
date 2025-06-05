import { Frame } from "@/frames";
import { ParticleSystem } from "@/ParticleSystem";

export interface PluginInterface {
  name?: string;
  description?: string;
  onInit?(system: ParticleSystem): void;
  onUpdate?(system: ParticleSystem): void;
  onDispose?(system: ParticleSystem): void;
  onAddParticles?(system: ParticleSystem, frame: Frame): void;
  onMorph?(system: ParticleSystem, frame: Frame): void;
}

export const checkIfPlugin = (plugin: any): plugin is PluginInterface => {
  return (
    typeof plugin === "object" &&
    (typeof plugin.onInit === "function" ||
      typeof plugin.onUpdate === "function" ||
      typeof plugin.onDispose === "function" ||
      typeof plugin.onAddParticles === "function" ||
      typeof plugin.onMorph === "function")
  );
};
