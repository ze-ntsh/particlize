import { FBO } from "@/FBO";

// Types
export type PropertyParams = {
  name: string;
  size: number;
  defaultValue?: Float32Array;
  fbo: FBO;
};

export class Property {
  uuid: string = crypto.randomUUID();
  name: string;
  size: number;
  defaultValue: Float32Array;
  fbo: FBO;
  channelOffset: number = 0;

  constructor({ name, size, defaultValue, fbo }: PropertyParams) {
    if (!name || typeof name !== "string" || !/^[a-zA-Z]+$/.test(name)) {
      throw new Error("Invalid property name. Must be a non-empty string containing only letters.");
    }
    this.name = name;

    if (size <= 0 || size > 4) {
      throw new Error(`Size for property "${name}" must be between 1 and 4.`);
    }
    this.size = size;

    if (!defaultValue) {
      defaultValue = new Float32Array(this.size);
    }
    if (!(defaultValue instanceof Float32Array)) {
      throw new Error(`Default value for property "${name}" must be a Float32Array.`);
    }
    if (defaultValue.length !== this.size) {
      throw new Error(`Default value for property "${name}" must have a length of ${this.size}.`);
    }
    this.defaultValue = defaultValue || new Float32Array(this.size);

    if (!(fbo instanceof FBO)) {
      throw new Error(`FBO for property "${name}" must be an instance of FBO.`);
    }
    this.fbo = fbo;

    // Ensure the FBO has this property in its properties array
    this.fbo.properties.push(this);
  }
}
