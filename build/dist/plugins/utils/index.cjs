'use strict';

Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const THREE = require('three');

function _interopNamespaceDefault(e) {
    const n = Object.create(null, { [Symbol.toStringTag]: { value: 'Module' } });
    if (e) {
        for (const k in e) {
            if (k !== 'default') {
                const d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: () => e[k]
                });
            }
        }
    }
    n.default = e;
    return Object.freeze(n);
}

const THREE__namespace = /*#__PURE__*/_interopNamespaceDefault(THREE);

class RaycasterPlugin {
    name = "RaycasterPlugin";
    description = "Plugin to handle raycasting for mouse interactions with particles.";
    onInit(system) {
        // Setup raycaster for mouse interaction
        system.raycaster = new THREE__namespace.Raycaster();
        system.raycastPlane = new THREE__namespace.Plane(new THREE__namespace.Vector3(0, 0, 1), 0);
        system.intersectionPoint = new THREE__namespace.Vector3(0, 0, 0);
        system.mouse = new THREE__namespace.Vector2(10, 10);
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
    onUpdate(system) {
        // Update the raycaster based on mouse position
        system.raycaster.setFromCamera(system.mouse, system.camera);
        system.raycaster.ray.intersectPlane(system.raycastPlane, system.intersectionPoint);
        system.manager.setUniformsAll({
            u_mouse: system.intersectionPoint,
        });
        system.particleMaterial.uniforms["u_mouse"].value = system.intersectionPoint;
    }
    onDispose(system) {
        // Clean up event listeners
        window.removeEventListener("mousemove", (event) => {
            system.mouse.x = (event.clientX / system.canvas.width) * 2 - 1;
            system.mouse.y = -(event.clientY / system.canvas.height) * 2 + 1;
        });
    }
}

exports.RaycasterPlugin = RaycasterPlugin;
