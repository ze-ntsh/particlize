import { Frame } from "@/Frame";
import { ImageFrameProperties } from "@/types";


export class ImageFrame extends Frame {
  src: string = "";
  external: boolean = false;
  fit: "contain" | "cover" | number = "contain";

  constructor(properties: Partial<ImageFrameProperties>) {
    super(properties);
    this.src = properties?.src ?? this.src;
    this.external = properties?.external ?? this.external;
    this.fit = properties?.fit ?? this.fit;
  }

  generateParticles(dimensions: { width: number; height: number }) {
    return this.generateParticles_2DCanvas(dimensions, async (ctx: OffscreenCanvasRenderingContext2D) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "/images/nitish.webp";

      await new Promise((resolve) => {
        img.onload = () => {
          resolve(true);
        };
        img.onerror = () => {
          throw new Error("Failed to load image");
        };
      });

      if (this.fit === "contain") {
        const ratio = Math.min(dimensions.width / img.width, dimensions.height / img.height);
        this.fit = ratio;
      } else if (this.fit === "cover") {
        const ratio = Math.max(dimensions.width / img.width, dimensions.height / img.height);
        this.fit = ratio;
      }

      if (typeof this.fit === "number") {
        img.width *= this.fit;
        img.height *= this.fit;
      }

      let x = 0;
      let y = 0;

      switch (this.position[0]) {
        case "left":
          x = 0;
          break;
        case "center":
          x = (dimensions.width - img.width) / 2;
          break;
        case "right":
          x = dimensions.width - img.width;
          break;
        default:
          if (typeof this.position[0] === "number") {
            x = this.position[0];
          }
          break;
      }

      switch (this.position[1]) {
        case "top":
          y = 0;
          break;
        case "middle":
          y = (dimensions.height - img.height) / 2;
          break;
        case "bottom":
          y = dimensions.height - img.height;
          break;
        default:
          if (typeof this.position[1] === "number") {
            y = this.position[1];
          }
          break;
      }

      ctx.drawImage(img, x, y, img.width, img.height);
    });
  }
}
