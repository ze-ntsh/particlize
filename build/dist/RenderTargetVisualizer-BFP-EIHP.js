import * as THREE from 'three';
import { ExtrudeGeometry, Loader, FileLoader, ShapePath } from 'three';

/**
 * A class for generating text as a single geometry. It is constructed by providing a string of text, and a set of
 * parameters consisting of a loaded font and extrude settings.
 *
 * See the {@link FontLoader} page for additional details.
 *
 * `TextGeometry` uses [typeface.json]{@link http://gero3.github.io/facetype.js/} generated fonts.
 * Some existing fonts can be found located in `/examples/fonts`.
 *
 * ```js
 * const loader = new FontLoader();
 * const font = await loader.loadAsync( 'fonts/helvetiker_regular.typeface.json' );
 * const geometry = new TextGeometry( 'Hello three.js!', {
 * 	font: font,
 * 	size: 80,
 * 	depth: 5,
 * 	curveSegments: 12
 * } );
 * ```
 *
 * @augments ExtrudeGeometry
 * @three_import import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
 */
class TextGeometry extends ExtrudeGeometry {

	/**
	 * Constructs a new text geometry.
	 *
	 * @param {string} text - The text that should be transformed into a geometry.
	 * @param {TextGeometry~Options} [parameters] - The text settings.
	 */
	constructor( text, parameters = {} ) {

		const font = parameters.font;

		if ( font === undefined ) {

			super(); // generate default extrude geometry

		} else {

			const shapes = font.generateShapes( text, parameters.size );

			// defaults

			if ( parameters.depth === undefined ) parameters.depth = 50;
			if ( parameters.bevelThickness === undefined ) parameters.bevelThickness = 10;
			if ( parameters.bevelSize === undefined ) parameters.bevelSize = 8;
			if ( parameters.bevelEnabled === undefined ) parameters.bevelEnabled = false;

			super( shapes, parameters );

		}

		this.type = 'TextGeometry';

	}

}

/**
 * A loader for loading fonts.
 *
 * You can convert fonts online using [facetype.js]{@link https://gero3.github.io/facetype.js/}.
 *
 * ```js
 * const loader = new FontLoader();
 * const font = await loader.loadAsync( 'fonts/helvetiker_regular.typeface.json' );
 * ```
 *
 * @augments Loader
 * @three_import import { FontLoader } from 'three/addons/loaders/FontLoader.js';
 */
class FontLoader extends Loader {

	/**
	 * Constructs a new font loader.
	 *
	 * @param {LoadingManager} [manager] - The loading manager.
	 */
	constructor( manager ) {

		super( manager );

	}

	/**
	 * Starts loading from the given URL and passes the loaded font
	 * to the `onLoad()` callback.
	 *
	 * @param {string} url - The path/URL of the file to be loaded. This can also be a data URI.
	 * @param {function(Font)} onLoad - Executed when the loading process has been finished.
	 * @param {onProgressCallback} onProgress - Executed while the loading is in progress.
	 * @param {onErrorCallback} onError - Executed when errors occur.
	 */
	load( url, onLoad, onProgress, onError ) {

		const scope = this;

		const loader = new FileLoader( this.manager );
		loader.setPath( this.path );
		loader.setRequestHeader( this.requestHeader );
		loader.setWithCredentials( this.withCredentials );
		loader.load( url, function ( text ) {

			const font = scope.parse( JSON.parse( text ) );

			if ( onLoad ) onLoad( font );

		}, onProgress, onError );

	}

	/**
	 * Parses the given font data and returns the resulting font.
	 *
	 * @param {Object} json - The raw font data as a JSON object.
	 * @return {Font} The font.
	 */
	parse( json ) {

		return new Font( json );

	}

}

/**
 * Class representing a font.
 */
class Font {

	/**
	 * Constructs a new font.
	 *
	 * @param {Object} data - The font data as JSON.
	 */
	constructor( data ) {

		/**
		 * This flag can be used for type testing.
		 *
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isFont = true;

		this.type = 'Font';

		/**
		 * The font data as JSON.
		 *
		 * @type {Object}
		 */
		this.data = data;

	}

	/**
	 * Generates geometry shapes from the given text and size. The result of this method
	 * should be used with {@link ShapeGeometry} to generate the actual geometry data.
	 *
	 * @param {string} text - The text.
	 * @param {number} [size=100] - The text size.
	 * @return {Array<Shape>} An array of shapes representing the text.
	 */
	generateShapes( text, size = 100 ) {

		const shapes = [];
		const paths = createPaths( text, size, this.data );

		for ( let p = 0, pl = paths.length; p < pl; p ++ ) {

			shapes.push( ...paths[ p ].toShapes() );

		}

		return shapes;

	}

}

function createPaths( text, size, data ) {

	const chars = Array.from( text );
	const scale = size / data.resolution;
	const line_height = ( data.boundingBox.yMax - data.boundingBox.yMin + data.underlineThickness ) * scale;

	const paths = [];

	let offsetX = 0, offsetY = 0;

	for ( let i = 0; i < chars.length; i ++ ) {

		const char = chars[ i ];

		if ( char === '\n' ) {

			offsetX = 0;
			offsetY -= line_height;

		} else {

			const ret = createPath( char, scale, offsetX, offsetY, data );
			offsetX += ret.offsetX;
			paths.push( ret.path );

		}

	}

	return paths;

}

function createPath( char, scale, offsetX, offsetY, data ) {

	const glyph = data.glyphs[ char ] || data.glyphs[ '?' ];

	if ( ! glyph ) {

		console.error( 'THREE.Font: character "' + char + '" does not exists in font family ' + data.familyName + '.' );

		return;

	}

	const path = new ShapePath();

	let x, y, cpx, cpy, cpx1, cpy1, cpx2, cpy2;

	if ( glyph.o ) {

		const outline = glyph._cachedOutline || ( glyph._cachedOutline = glyph.o.split( ' ' ) );

		for ( let i = 0, l = outline.length; i < l; ) {

			const action = outline[ i ++ ];

			switch ( action ) {

				case 'm': // moveTo

					x = outline[ i ++ ] * scale + offsetX;
					y = outline[ i ++ ] * scale + offsetY;

					path.moveTo( x, y );

					break;

				case 'l': // lineTo

					x = outline[ i ++ ] * scale + offsetX;
					y = outline[ i ++ ] * scale + offsetY;

					path.lineTo( x, y );

					break;

				case 'q': // quadraticCurveTo

					cpx = outline[ i ++ ] * scale + offsetX;
					cpy = outline[ i ++ ] * scale + offsetY;
					cpx1 = outline[ i ++ ] * scale + offsetX;
					cpy1 = outline[ i ++ ] * scale + offsetY;

					path.quadraticCurveTo( cpx1, cpy1, cpx, cpy );

					break;

				case 'b': // bezierCurveTo

					cpx = outline[ i ++ ] * scale + offsetX;
					cpy = outline[ i ++ ] * scale + offsetY;
					cpx1 = outline[ i ++ ] * scale + offsetX;
					cpy1 = outline[ i ++ ] * scale + offsetY;
					cpx2 = outline[ i ++ ] * scale + offsetX;
					cpy2 = outline[ i ++ ] * scale + offsetY;

					path.bezierCurveTo( cpx1, cpy1, cpx2, cpy2, cpx, cpy );

					break;

			}

		}

	}

	return { offsetX: glyph.ha * scale, path: path };

}

const textToMesh = async (props) => {
    const { text = "Hello World", fontURL = "https://components.ai/api/v1/typefaces/montserrat/normal/500", color = [0.0, 0.0, 0.0], ...geometryProps } = props;
    const loader = new FontLoader();
    const font = await new Promise((resolve, reject) => {
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
const getGLSLType = (value) => {
    if (value instanceof THREE.Texture) {
        return "sampler2D";
    }
    else if (value instanceof THREE.Vector2) {
        return "vec2";
    }
    else if (value instanceof THREE.Vector3) {
        return "vec3";
    }
    else if (value instanceof THREE.Vector4) {
        return "vec4";
    }
    else if (typeof value === "number") {
        return "float";
    }
    return null;
};
const getGLSLValue = (value) => {
    if (value instanceof THREE.Vector2) {
        return `vec2(${value.x}, ${value.y})`;
    }
    else if (value instanceof THREE.Vector3) {
        return `vec3(${value.x}, ${value.y}, ${value.z})`;
    }
    else if (value instanceof THREE.Vector4) {
        return `vec4(${value.x}, ${value.y}, ${value.z}, ${value.w})`;
    }
    else if (typeof value === "number") {
        return `${value.toFixed(6)}`;
    }
    else if (Array.isArray(value)) {
        if (value.every((v) => typeof v === "number")) {
            return `vec${value.length}(${value.map((v) => v.toFixed(6)).join(", ")})`;
        }
        else {
            console.warn("Array contains non-number values:", value);
            return "";
        }
    }
    return "";
};
function isObject(item) {
    return item !== null && typeof item === "object" && !Array.isArray(item);
}
const deepMerge = (target, source, visited = new Map()) => {
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
                }
                else {
                    target[key] = visited.get(source[key]);
                }
            }
            else {
                target[key] = source[key];
            }
        }
    }
    return target;
};

class RenderTargetVisualizer {
    uuid = crypto.randomUUID();
    scene;
    camera;
    canvas;
    renderer;
    labelCanvas;
    labelTexture;
    constructor(renderer) {
        this.renderer = renderer;
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
        this.camera.position.z = 1;
        // Create new canvas and attach to DOM
        this.canvas = document.createElement("canvas");
        this.canvas.style.width = "100vw";
        this.canvas.style.height = "100vh";
        document.body.appendChild(this.canvas);
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.labelCanvas = new OffscreenCanvas(256, 64);
        this.labelTexture = new THREE.CanvasTexture(this.labelCanvas);
        // Resize listener
        window.addEventListener("resize", () => this.resize());
    }
    resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.renderer.setSize(width, height);
    }
    /**
     * Generate a grid of quads for each FBO texture.
     */
    update(fbos) {
        this.scene.clear();
        this.scene = new THREE.Scene();
        const entries = Array.from(fbos.entries());
        const count = entries.length;
        if (count === 0)
            return;
        const screenAspect = window.innerWidth / window.innerHeight;
        const gridCols = Math.ceil(Math.sqrt(count * screenAspect));
        const gridRows = Math.ceil(count / gridCols);
        const tileSize = 1.8 / Math.max(gridCols, gridRows); // normalized [-1, 1]
        const spacing = tileSize * 0.1;
        const totalWidth = gridCols * tileSize;
        const totalHeight = gridRows * tileSize;
        const xStart = -totalWidth / 2 + tileSize / 2;
        const yStart = totalHeight / 2 - tileSize / 2;
        for (let i = 0; i < count; i++) {
            const [name, fbo] = entries[i];
            const col = i % gridCols;
            const row = Math.floor(i / gridCols);
            const x = xStart + col * tileSize;
            const y = yStart - row * tileSize;
            const geometry = new THREE.PlaneGeometry(tileSize - spacing, tileSize - spacing);
            const ndcNormalizeMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    uTexture: { value: new THREE.DataTexture(fbo.read.texture.image.data, fbo.width, fbo.height) },
                },
                vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
                fragmentShader: /* glsl */ `
          uniform sampler2D uTexture;
          varying vec2 vUv;
          void main() {
            vec3 color = texture2D(uTexture, vUv).xyz;
            // Normalize from [-1, 1] to [0, 1]
            gl_FragColor = vec4((color + 1.0) * 0.5, 1.0);
          }
        `,
            });
            const mesh = new THREE.Mesh(geometry, ndcNormalizeMaterial);
            mesh.position.set(x, y, 0);
            this.scene.add(mesh);
            const label = this.makeLabelSprite(name);
            label.scale.set(tileSize * 0.5, tileSize * 0.12, 1);
            label.position.set(x, y - tileSize * 0.45, 0.01);
            this.scene.add(label);
        }
    }
    /**
     * Render the current visualizer grid to screen.
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    /**
     * Generate a text label as a sprite.
     */
    makeLabelSprite(text) {
        const canvas = new OffscreenCanvas(256, 64);
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "bold 36px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        const material = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
            transparent: true,
        });
        return new THREE.Sprite(material);
    }
    dispose() {
        this.renderer.dispose();
        this.canvas.remove();
    }
}

export { RenderTargetVisualizer as R, getGLSLValue as a, deepMerge as d, getGLSLType as g, textToMesh as t };
