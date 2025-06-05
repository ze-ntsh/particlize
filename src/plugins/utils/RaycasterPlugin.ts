import { ParticleSystem } from "@/ParticleSystem";
import { PluginInterface } from "../PluginInterface";
import * as THREE from "three";

export class RaycasterPlugin implements PluginInterface {
  name = "RaycasterPlugin";
  description?: string = "Plugin to handle raycasting for mouse interactions with particles.";

  onInit(system: ParticleSystem) {
    // Setup raycaster for mouse interaction
    system.raycaster = new THREE.Raycaster();
    system.raycastPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    system.intersectionPoint = new THREE.Vector3(0, 0, 0);
    system.mouse = new THREE.Vector2(10, 10);

    // Event listeners
    window.addEventListener("mousemove", (event) => {
      system.mouse.x = (event.clientX / system.canvas.width) * 2 - 1;
      system.mouse.y = -(event.clientY / system.canvas.height) * 2 + 1;
    });

    // Add a mouse uniform to the velocity FBO
    system.manager.setUniformsAll({
      u_mouse: system.intersectionPoint,
    });

    system.particleMaterial.uniforms["u_mouse"] = {
      value: system.intersectionPoint,
    };
  }

  onUpdate(system: ParticleSystem): void {
    // Update the raycaster based on mouse position
    system.raycaster.setFromCamera(system.mouse, system.camera);
    system.raycaster.ray.intersectPlane(system.raycastPlane, system.intersectionPoint);

    system.manager.setUniformsAll({
      u_mouse: system.intersectionPoint,
    });

    system.particleMaterial.uniforms["u_mouse"].value = system.intersectionPoint;
  }

  onDispose(system: ParticleSystem): void {
    // Clean up event listeners
    window.removeEventListener("mousemove", (event) => {
      system.mouse.x = (event.clientX / system.canvas.width) * 2 - 1;
      system.mouse.y = -(event.clientY / system.canvas.height) * 2 + 1;
    });
  }
}
