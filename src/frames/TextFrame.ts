import { Frame } from "@/Frame";
import { Particle } from "@/Particle";
import { TextFrameProperties } from "@/types";

export class TextFrame extends Frame {
  content: string = "";
  font: {
    family: string;
    size: number;
    style: "normal" | "italic" | "oblique" | "bold";
  } = {
    family: "Arial",
    size: 16,
    style: "normal",
  };

  constructor(properties: Partial<TextFrameProperties>) {
    super(properties);
    this.content = properties?.content ?? this.content;
    this.font.family = properties?.font?.family ?? this.font.family;
    this.font.size = properties?.font?.size ?? this.font.size;
    this.font.style = properties?.font?.style ?? this.font.style;
  }

  generateParticles(dimensions: { width: number; height: number }): Promise<Particle[]> {
    return this.generateParticles_2DCanvas(dimensions, (ctx: OffscreenCanvasRenderingContext2D) => {
      ctx.font = `${this.font.style} ${this.font.size}px ${this.font.family}`;
      ctx.fillStyle = "#000000";
      const textMetrics = ctx.measureText(this.content);

      let x = 0;
      let y = 0;

      switch (this.position[0]) {
        case "left":
          x = 0;
          break;
        case "center":
          x = (dimensions.width - textMetrics.width) / 2;
          break;
        case "right":
          x = dimensions.width - textMetrics.width;
          break;
        default:
          if (typeof this.position[0] === "number") {
            x = this.position[0];
          }
          break;
      }

      switch (this.position[1]) {
        case "top":
          y = this.font.size;
          break;
        case "middle":
          y = dimensions.height / 2 + this.font.size / 2;
          break;
        case "bottom":
          y = dimensions.height - this.font.size / 2;
          break;
        default:
          if (typeof this.position[1] === "number") {
            y = this.position[1];
          }
          break;
      }

      ctx.fillText(this.content, x, y);
    });
  }
}
