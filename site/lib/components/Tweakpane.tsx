import { ParticleSystem } from "particlize-js";
import { useEffect, useRef, useState } from "react";
import { FolderApi, Pane } from "tweakpane";
import * as TextareaPlugin from "@pangenerator/tweakpane-textarea-plugin";
import * as THREE from "three";
import { Frame, SamplerFrame } from "particlize-js/frames";
import { textToMesh } from "particlize-js/utils";
import { MeshSurfaceSampler } from "particlize-js/samplers";

const addUniformBinding = (pane: Pane | FolderApi, uniform: THREE.IUniform, uniformName: string) => {
  // Skip uniforms that are not defined
  if (!uniform.value) {
    return;
  }

  if (typeof uniform.value === "number" || typeof uniform.value === "boolean") {
    pane.addBinding(uniform, "value", {
      label: uniformName,
    });
  } else if (uniform.value instanceof Object) {
    const valueType = uniform.value.constructor.name;

    // Skip textures and other non-numeric objects
    if (valueType === "Texture" || valueType === "WebGLRenderTarget" || valueType === "DataTexture") {
      return;
    }

    if (valueType === "Vector2" || valueType === "Vector3" || valueType === "Vector4") {
      pane.addBinding(uniform, "value", {
        label: uniformName,
        x: {},
        y: {},
        z: valueType === "Vector3" ? undefined : {},
        w: valueType === "Vector4" ? undefined : {},
      });
    } else if (valueType === "Color") {
    }
  } else if (uniform.value === null) {
    console.warn(`Null uniform value for ${uniformName}`);
  } else {
    console.warn(`Unsupported uniform type for ${uniformName}: ${typeof uniform.value}`);
  }
};

export const Tweakpane = ({ system }: { system: ParticleSystem }) => {
  const paneRef = useRef<Pane>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const exampleFrames = useRef<Record<string, Frame>>({});
  const [examplesReady, setExamplesReady] = useState(false);

  (async () => {
    exampleFrames.current = {
      particlize: new SamplerFrame({
        sampler: new MeshSurfaceSampler(
          await textToMesh({
            text: "Particlize",
            size: 0.5,
          })
        ),
        count: 100000,
      }),
      sphere: new SamplerFrame({
        sampler: new MeshSurfaceSampler(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32))),
        count: 100000,
      }),
      torusKnot: new SamplerFrame({
        sampler: new MeshSurfaceSampler(new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.3, 128, 32))),
        count: 100000,
      }),
    };

    setExamplesReady(true);
  })();

  useEffect(() => {
    if (!system) {
      console.warn("Particle system is not initialized.");
      return;
    }

    if (!examplesReady) {
      return;
    }

    system.addParticles(exampleFrames.current.particlize);

    if (!paneRef.current) {
      paneRef.current = new Pane({
        title: "Particle System Controls",
        container: containerRef.current || undefined,
      });
    }

    const pane = paneRef.current;
    pane.registerPlugin(TextareaPlugin);

    // General settings
    const generalFolder = pane.addFolder({ title: "General" });
    const generalParams = {
      example: "particlize",
      fboHeight: system.manager.height,
      fboWidth: system.manager.width,
      maxParticles: system.maxParticles,
    };

    generalFolder
      .addBinding(generalParams, "example", {
        options: {
          Particlize: "particlize",
          Sphere: "sphere",
          TorusKnot: "torusKnot",
        },
      })
      .on("change", (ev) => {
        const exampleName = ev.value;
        const exampleFrame = exampleFrames.current[exampleName];
        if (exampleFrame) {
          system.morphTo(exampleFrame);
        } else {
          console.warn(`No example frame found for ${exampleName}`);
        }
      });

    generalFolder.addBinding(generalParams, "fboWidth", { readonly: true });
    generalFolder.addBinding(generalParams, "fboHeight", { readonly: true });
    generalFolder.addBinding(generalParams, "maxParticles", { readonly: true });

    // Particle settings (e.g. particle count, generation code)
    const particles = pane.addFolder({ title: "Particles" });
    const particleParams = {
      count: system.particleCount,
    };
    particles.addBinding(particleParams, "count", {});
    // Setup to generate particles

    // Properties
    for (const property of system.manager.properties.values()) {
      const propertyFolder = pane.addFolder({ title: `Property: ${property.name}`, expanded: false });

      property.fbo.constraints.forEach((constraint) => {
        // Clean up the GLSL code ie. remove comments and unnecessary whitespace
        const cleanedGlsl = constraint.glsl
          .replace(/\/\/.*$/gm, "") // Remove single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, "") // Remove multi-line comments
          .replace(/\n\s*\n+/g, "\n") // Replace multiple blank lines with a single newline
          .replace(/^\s+|\s+$/gm, ""); // Remove leading/trailing whitespace on each line
        constraint.glsl = cleanedGlsl;
        const constraintFolder = propertyFolder.addFolder({ title: `Constraint: ${constraint.name}`, expanded: true });

        constraintFolder.addBinding(constraint, "active").on("change", () => {
          property.fbo.needsRebuild = true;
          pane.refresh();
        });

        // Show params
        for (const [paramName, paramsObject] of Object.entries(constraint.params || {})) {
          constraintFolder
            .addBinding(paramsObject, "value", {
              label: paramName,
            })
            .on("change", () => {
              system.manager.setUniforms(property.name, {
                [`u_${constraint.name}_${paramName}`]: paramsObject.value,
              });
              pane.refresh();
            });
        }

        let glslVisible = false;
        const glslButton = constraintFolder
          .addButton({
            title: "Show GLSL code",
          })
          .on("click", () => {
            glslVisible = !glslVisible;
            glslEditor.hidden = !glslVisible;
            glslButton.title = glslVisible ? "Hide GLSL code" : "Show GLSL code";
          });

        const glslEditor = constraintFolder
          .addBinding(constraint, "glsl", {
            view: "textarea",
            multiline: true,
            rows: constraint.glsl.split("\n").length + 1,
            hidden: true,
          })
          .on("change", () => {
            property.fbo.needsRebuild = true;
          });
      });
    }

    return () => {
      pane.dispose();
      paneRef.current = null;
    };
  }, [system, examplesReady]);

  return (
    <div
      ref={containerRef}
      className="tweakpane"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        maxHeight: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        padding: "8px",
      }}
    ></div>
  );
};
