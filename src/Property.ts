import { Constraint } from "@/constraints/Constraint";
import { FBO } from "@/FBO";

export class Property {
  uuid: string = crypto.randomUUID();
  name: string;
  size: number;
  defaultValue: Float32Array;
  fbo: FBO;
  channelOffset: number = 0;

  constructor(props: { name: string; size: number; defaultValue?: Float32Array; fbo: FBO }) {
    if (typeof props.name !== "string" || props.name.trim() === "") {
      throw new Error(`Invalid property name: "${props.name}". It must be a non-empty string.`);
    }
    this.name = props.name;

    if (props.size <= 0 || props.size > 4) {
      throw new Error(`Size for property "${props.name}" must be between 1 and 4.`);
    }
    this.size = props.size;

    if (!props.defaultValue) {
      props.defaultValue = new Float32Array(this.size);
    }
    if (!(props.defaultValue instanceof Float32Array)) {
      throw new Error(`Default value for property "${props.name}" must be a Float32Array.`);
    }
    if (props.defaultValue.length !== this.size) {
      throw new Error(`Default value for property "${props.name}" must have a length of ${this.size}.`);
    }
    this.defaultValue = props.defaultValue || new Float32Array(this.size);

    if (!(props.fbo instanceof FBO)) {
      throw new Error(`FBO for property "${props.name}" must be an instance of FBO.`);
    }
    this.fbo = props.fbo;
    this.fbo.properties.push(this);
  }
}
