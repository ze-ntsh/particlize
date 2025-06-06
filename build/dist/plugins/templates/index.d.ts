// Generated by dts-bundle-generator v9.5.1

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

declare class Constraint {
	name: string;
	active: boolean;
	glsl: string;
	params?: Record<string, any>;
	uniforms: Record<string, any>;
	constructor(name: string, glsl?: string, uniforms?: Record<string, any>);
	build(): void;
}
declare class Particle {
	[key: string]: Float32Array;
	constructor(properties: {
		[key: string]: Float32Array;
	});
}
type PropertyParams = {
	name: string;
	size: number;
	defaultValue?: Float32Array;
	fbo: FBO;
};
declare class Property {
	uuid: string;
	name: string;
	size: number;
	defaultValue: Float32Array;
	fbo: FBO;
	channelOffset: number;
	constructor({ name, size, defaultValue, fbo }: PropertyParams);
}
type FBOParams = {
	name: string;
	width: number;
	height: number;
	renderer: THREE.WebGLRenderer;
	camera: THREE.OrthographicCamera;
	properties?: Property[];
	channels?: number;
};
declare class FBO {
	uuid: string;
	name: string;
	textureName: string;
	height: number;
	width: number;
	renderer: THREE.WebGLRenderer;
	properties: Property[];
	dependencies: Set<FBO>;
	constraints: Map<string, Constraint>;
	channels: number;
	material: THREE.ShaderMaterial;
	read: THREE.WebGLRenderTarget;
	write: THREE.WebGLRenderTarget;
	injectBuffer: Map<string, Float32Array>;
	needsUpdate: boolean;
	needsRebuild: boolean;
	scene: THREE.Scene;
	camera: THREE.OrthographicCamera;
	constructor({ name, width, height, renderer, camera, properties, channels, }: FBOParams);
	build(): void;
	update(): void;
	swap(): void;
	inject(data: Float32Array, offset?: number): void;
	dispose(): void;
}
type PropertyManagerParams = {
	width?: number;
	height?: number;
	renderer?: THREE.WebGLRenderer;
};
declare class PropertyManager {
	uuid: string;
	properties: Map<string, Property>;
	scene: THREE.Scene;
	camera: THREE.OrthographicCamera;
	renderer: THREE.WebGLRenderer;
	height: number;
	width: number;
	fbos: Map<string, FBO>;
	/**
	 * Constructor for PropertyManager
	 * @param {PropertyManagerParams} params - Parameters for the PropertyManager
	 * @param {THREE.WebGLRenderer} params.renderer - The WebGL renderer to use
	 * @param {number} params.width - Width of the Framebuffer Objects (FBOs)
	 * @param {number} params.height - Height of the Framebuffer Objects (FBOs)
	 */
	constructor({ renderer, width, height }: PropertyManagerParams);
	/**
	 * Adds a new property to the PropertyManager.
	 * @param {string} name - The name of the property.
	 * @param {number} size - The size of the property (number of channels).
	 * @param {Float32Array} [defaultValue] - Optional default value for the property.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	add(name: string, size: number, defaultValue?: Float32Array): this;
	/**
	 * Adds a constraint to a specific property's FBO. When properties are grouped, the FBO is the same for all properties.
	 * @param {string} name - The name of the property to constrain.
	 * @param {Constraint} constraint - The constraint to add.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	constrain(name: string, constraint: Constraint): this;
	/**
	 * Adds a constraint to all properties' FBOs.
	 * @param {Constraint} constraint - The constraint to add.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	constrainAll(constraint: Constraint): this;
	/**
	 * Activates a constraint for a specific property and marks the FBO for rebuild.
	 * @param {string} name - The name of the property.
	 * @param {string} constraintName - The name of the constraint to activate.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	activateConstraint(name: string, constraintName: string): this;
	/**
	 * Deactivates a constraint for a specific property and marks the FBO for rebuild.
	 * @param {string} name - The name of the property.
	 * @param {string} constraintName - The name of the constraint to deactivate.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	deactivateConstraint(name: string, constraintName: string): this;
	/**
	 * Deletes a constraint from a specific property's FBO and marks the FBO for rebuild.
	 * @param {string} name - The name of the property.
	 * @param {string} constraintName - The name of the constraint to delete.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	deleteConstraint(name: string, constraintName: string): this;
	/**
	 * Groups (packs) multiple properties into a single FBO. Grouped properties must have sizes that fit within 4 channels.
	 * Grouping must be done before linking, adding constraints or uniforms as original FBOs will be deleted and replaced with the new grouped FBO.
	 *
	 * Eg: If you group properties "a" (size 1), "b" (size 2), and "c" (size 1), the new FBO will have a total of 4 channels.
	 * This means you can access them as a single texture with 4 channels, where:
	 * - "a" will be in channel 0 (red),
	 * - "b" will occupy channels 1 and 2 (green and blue),
	 * - "c" will be in channel 3 (alpha).
	 * This allows for efficient packing of properties into a single FBO, reducing the number of textures and draw calls needed.
	 *
	 * Properties that are already grouped cannot be grouped again.
	 *
	 * @param {string[]} names - An array of property names to group.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	group(names: string[]): this;
	/**
	 * Links two properties' FBOs together, allowing one to read from the other.
	 * A uniform in the source FBO will be set to the target FBO's texture.
	 * @param {string} source - The name of the source property.
	 * @param {string} target - The name of the target property.
	 * @param {boolean} [bidirectional=false] - If true, links both properties bidirectionally.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	link(source: string, target: string, bidirectional?: Boolean): this;
	/**
	 * Links all properties' FBOs together, allowing each to read from all others.
	 * This is useful for creating a fully connected graph of FBOs.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 **/
	linkAll(): this;
	/**
	 * Builds all FBOs, applying constraints and preparing them for rendering.
	 * This should be called in the end after all properties have been added, grouped, linked, and constrained.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	build(): this;
	/**
	 * Sets uniforms for a specific property by name.
	 * Groups of properties will share the same FBO, so this will set uniforms for all properties in the group.
	 * @param {string} name - The name of the property to set uniforms for.
	 * @param {Record<string, any>} uniforms - An object containing uniform names and their values.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	setUniforms(name: string, uniforms: Record<string, any>): this;
	/**
	 * Sets uniforms for all properties' FBOs.
	 * This will apply the same uniforms to all FBOs, which is useful for global settings.
	 * @param {Record<string, any>} uniforms - An object containing uniform names and their values.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 * */
	setUniformsAll(uniforms: Record<string, any>): this;
	/**
	 * Updates the FBOs for specific properties or all properties if no names are provided.
	 * This will mark the FBOs as needing an update and rebuild them if necessary.
	 * @param {string[]} [names=[]] - An array of property names to update. If empty, updates all properties.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	update(names?: string[]): this;
	private updateHelper;
	/**
	 * Injects data into multiple FBOs from an object of Float32Arrays.
	 * The keys of the object should match the FBO names (note: different from property names).
	 * @param {Record<string, Float32Array>} data - An object containing FBO names as keys and Float32Arrays as values.
	 * @param {number} [offset=0] - Optional offset to start injecting data from.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	injectFBOs(data: Record<string, Float32Array>, offset?: number): this;
	/**
	 * Injects data into a specific FBO by name.
	 * @param {string} name - The name of the FBO to inject data into (should match the FBO name, not the property name).
	 * @param {Float32Array} data - The Float32Array data to inject.
	 * @param {number} [offset=0] - Optional offset to start injecting data from.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	injectFBO(name: string, data: Float32Array, offset?: number): this;
	/**
	 * Injects data into a specific property by name.
	 * This will inject the data into the FBO associated with the property.
	 * @param {string} name - The name of the property to inject data into.
	 * @param {Float32Array} data - The Float32Array data to inject.
	 * @param {number} [offset=0] - Optional offset to start injecting data from.
	 * @return {PropertyManager} Returns the PropertyManager instance for chaining.
	 */
	inject(name: string, data: Float32Array, offset?: number): this;
	/**
	 * Disposes of all resources used by the PropertyManager.
	 * This includes disposing of all FBOs, clearing properties, and clearing the scene.
	 * @return {this} Returns the PropertyManager instance for chaining.
	 * */
	dispose(): this;
}
declare class Frame extends EventTarget {
	uuid: string;
	particles: Particle[];
	data: Record<string, Float32Array>;
	count: number;
	map: {
		[key: string]: Float32Array;
	};
	constructor({ particles }?: {
		particles: Particle[];
	});
	build(propertyManager: PropertyManager): void;
	dispose(): void;
}
declare class RenderTargetVisualizer {
	uuid: string;
	scene: THREE.Scene;
	camera: THREE.OrthographicCamera;
	canvas: HTMLCanvasElement;
	renderer: THREE.WebGLRenderer;
	labelCanvas: OffscreenCanvas;
	labelTexture: THREE.Texture;
	constructor(renderer: THREE.WebGLRenderer);
	resize(): void;
	/**
	 * Generate a grid of quads for each FBO texture.
	 */
	update(fbos: Map<string, any>): void;
	/**
	 * Render the current visualizer grid to screen.
	 */
	render(): void;
	/**
	 * Generate a text label as a sprite.
	 */
	makeLabelSprite(text: string): THREE.Sprite;
	dispose(): void;
}
interface PluginInterface {
	name?: string;
	description?: string;
	onInit?(system: ParticleSystem): void;
	onUpdate?(system: ParticleSystem): void;
	onDispose?(system: ParticleSystem): void;
	onAddParticles?(system: ParticleSystem, frame: Frame): void;
	onMorph?(system: ParticleSystem, frame: Frame): void;
}
interface ParticleSystemParams {
	canvas: HTMLCanvasElement;
	renderer?: THREE.WebGLRenderer;
	camera?: THREE.PerspectiveCamera;
	scene?: THREE.Scene;
	backgroundColor?: [
		number,
		number,
		number,
		number
	];
	fboHeight?: number;
	fboWidth?: number;
	plugins?: PluginInterface[];
}
declare class ParticleSystem extends EventTarget {
	[string: string]: any;
	uuid: string;
	canvas: HTMLCanvasElement;
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	renderer: THREE.WebGLRenderer;
	clock: THREE.Clock;
	controls: OrbitControls;
	uvs: Float32Array;
	manager: PropertyManager;
	renderTargetVisualizer: RenderTargetVisualizer | null;
	plugins: PluginInterface[];
	particleGeometry: THREE.BufferGeometry;
	particleMaterial: THREE.ShaderMaterial;
	particles: THREE.Points;
	particleCount: number;
	maxParticles: number;
	intersectionObserver: IntersectionObserver;
	inView: boolean;
	constructor({ canvas, renderer, camera, scene, backgroundColor, fboHeight, fboWidth, plugins, }: ParticleSystemParams);
	linkProperty(propertyName: string): void;
	resize(): void;
	addParticles(frame: Frame): void;
	update(): void;
	dispose(): void;
	start(): void;
	stop(): void;
}
export declare class BasicConstraintsPlugin implements PluginInterface {
	name: string;
	description?: string;
	onInit(system: ParticleSystem): void;
	onUpdate(system: ParticleSystem): void;
}

export {};
