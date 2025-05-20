import { TransitionProperties } from "@/types";

export class Transition {
  duration: number = 1000; // Default duration in milliseconds

  constructor(properties: Partial<TransitionProperties> = {}) {
    this.duration = properties?.duration ?? this.duration;
  }
}
