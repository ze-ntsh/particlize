import { FrameProperties } from "@/types";
import { Particle } from "@/Particle";

export abstract class Frame {
  size: number = 1;
  color: [number, number, number, number] = [255, 0, 0, 1];
  position: ["left" | "center" | "right" | number, "top" | "middle" | "bottom" | number] = ["left", "top"];

  constructor(properties: Partial<FrameProperties>) {
    this.size = properties?.size ?? this.size;
    this.color = properties?.color ?? this.color;
    this.position = properties?.position ?? this.position;
  }

  abstract generateParticles(dimensions: { width: number; height: number }): Promise<Particle[]>;

  async generateParticles_2DCanvas(
    dimensions: { width: number; height: number },
    setup: { (ctx: OffscreenCanvasRenderingContext2D): void }
  ): Promise<Particle[]> {
    const offscreenCanvas = new OffscreenCanvas(dimensions.width, dimensions.height);
    const ctx = offscreenCanvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D context");
    }

    // Setup the canvas (text, image, etc.)
    await setup(ctx);

    const particles: Particle[] = [];
    const imageData = ctx.getImageData(0, 0, dimensions.width, dimensions.height);
    for (let y = 0; y < imageData.height; y += 3) {
      for (let x = 0; x < imageData.width; x += 3) {
        const index = (y * imageData.width + x) * 4;
        const alpha = imageData.data[index + 3];
        if (alpha > 0) {
          particles.push(
            new Particle({
              position: [x/dimensions.width, -y/dimensions.height, 0],
              color: this.color,
              size: this.size,
            })
          );
        }
      }
    }

    return particles;
  }
}
