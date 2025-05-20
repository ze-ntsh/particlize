export type FrameProperties = {
  size: number;
  color: [number, number, number, number];
  position: ["left" | "center" | "right" | number, "top" | "middle" | "bottom" | number];
};

export type ImageFrameProperties = {
  src: string;
  external: boolean;
  fit: "contain" | "cover";
} & FrameProperties;

export type TextFrameProperties = {
  content: string;
  font: {
    family: string;
    size: number;
    style: "normal" | "italic" | "oblique" | "bold";
  };
} & FrameProperties;
