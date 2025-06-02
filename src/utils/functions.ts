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

export const getGLSLType = (value: any): string | null => {
  if (value instanceof THREE.Texture) {
    return "sampler2D";
  } else if (value instanceof THREE.Vector2) {
    return "vec2";
  } else if (value instanceof THREE.Vector3) {
    return "vec3";
  } else if (value instanceof THREE.Vector4) {
    return "vec4";
  } else if (typeof value === "number") {
    return "float";
  }
  return null;
};

export const getGLSLValue = (value: any): string => {
  if (value instanceof THREE.Vector2) {
    return `vec2(${value.x}, ${value.y})`;
  } else if (value instanceof THREE.Vector3) {
    return `vec3(${value.x}, ${value.y}, ${value.z})`;
  } else if (value instanceof THREE.Vector4) {
    return `vec4(${value.x}, ${value.y}, ${value.z}, ${value.w})`;
  } else if (typeof value === "number") {
    return `${value.toFixed(6)}`;
  } else if (Array.isArray(value)) {
    if (value.every((v) => typeof v === "number")) {
      return `vec${value.length}(${value.map((v) => v.toFixed(6)).join(", ")})`;
    } else {
      console.warn("Array contains non-number values:", value);
      return "";
    }
  }

  return "";
};

function isObject(item: any): boolean {
  return item !== null && typeof item === "object" && !Array.isArray(item);
}

export const deepMerge = (target: any, source: any, visited = new Map<any, any>()) => {
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          target[key] = {};
        }
        // Check if the source object has already been visited
        if (!visited.has(source[key])) {
          visited.set(source[key], {});
          deepMerge(target[key], source[key], visited);
        } else {
          target[key] = visited.get(source[key]);
        }
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
};
