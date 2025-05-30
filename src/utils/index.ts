import * as THREE from "three";
import { TextGeometry, TextGeometryParameters } from "three/examples/jsm/geometries/TextGeometry";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";

export const textToMesh = async (
  props: Partial<
    {
      text: string;
      fontURL: string;
      color: [number, number, number];
    } & TextGeometryParameters
  >
) => {
  const {
    text = "Hello World",
    fontURL = "https://components.ai/api/v1/typefaces/montserrat/normal/500",
    color = [0.0, 0.0, 0.0],
    ...geometryProps
  } = props;

  const loader = new FontLoader();

  const font = await new Promise<any>((resolve, reject) => {
    loader.load(fontURL, resolve, undefined, reject);
  });

  // Set default properties
  geometryProps.size = geometryProps?.size || 1;
  geometryProps.depth = geometryProps.depth || 0.2;
  geometryProps.curveSegments = geometryProps?.curveSegments || 12;
  geometryProps.bevelEnabled = geometryProps?.bevelEnabled || false;
  geometryProps.bevelThickness = geometryProps?.bevelThickness || 0.1;
  geometryProps.bevelSize = geometryProps?.bevelSize || 0.1;
  geometryProps.bevelOffset = geometryProps?.bevelOffset || 0;
  geometryProps.bevelSegments = geometryProps?.bevelSegments || 5;

  const geometry = new TextGeometry(text, {
    font: font,
    ...geometryProps,
  });
  geometry.center();

  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color().fromArray(color) });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
};

export const getUniformType = (uniformValue: any): string | null => {
  if (uniformValue instanceof THREE.Texture) {
    return "sampler2D";
  } else if (uniformValue instanceof THREE.Vector2) {
    return "vec2";
  } else if (uniformValue instanceof THREE.Vector3) {
    return "vec3";
  } else if (uniformValue instanceof THREE.Vector4) {
    return "vec4";
  } else if (typeof uniformValue === "number") {
    return "float";
  } else if (Array.isArray(uniformValue)) {
    // Check if all elements are numbers
    if (uniformValue.every((v) => typeof v === "number")) {
      if (uniformValue.length === 1) {
        return "float";
      } else if (uniformValue.length === 2) {
        return "vec2";
      } else if (uniformValue.length === 3) {
        return "vec3";
      } else if (uniformValue.length === 4) {
        return "vec4";
      }
    }
  }
  return null;
};
