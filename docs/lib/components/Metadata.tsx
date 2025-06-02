const libMetadata = {
  name: "particlize",
  libName: "particlize-js",
  version: "0.1.0",
};
export const Metadata = ({ type = "name" }: { type: keyof typeof libMetadata }) => {
  return libMetadata[type];
};
