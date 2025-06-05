import * as THREE from 'three';
import { Controls, Vector3, MOUSE, TOUCH, Quaternion, Spherical, Vector2, Ray, Plane, MathUtils } from 'three';
import { C as Constraint } from './Constraint-CzMlKNzW.js';
import { g as getGLSLType } from './RenderTargetVisualizer-BFP-EIHP.js';
export { R as RenderTargetVisualizer } from './RenderTargetVisualizer-BFP-EIHP.js';
export { P as Particle } from './Particle-DG6Mm0Qd.js';

/**
 * Fires when the camera has been transformed by the controls.
 *
 * @event OrbitControls#change
 * @type {Object}
 */
const _changeEvent = { type: 'change' };

/**
 * Fires when an interaction was initiated.
 *
 * @event OrbitControls#start
 * @type {Object}
 */
const _startEvent = { type: 'start' };

/**
 * Fires when an interaction has finished.
 *
 * @event OrbitControls#end
 * @type {Object}
 */
const _endEvent = { type: 'end' };

const _ray = new Ray();
const _plane = new Plane();
const _TILT_LIMIT = Math.cos( 70 * MathUtils.DEG2RAD );

const _v = new Vector3();
const _twoPI = 2 * Math.PI;

const _STATE = {
	NONE: -1,
	ROTATE: 0,
	DOLLY: 1,
	PAN: 2,
	TOUCH_ROTATE: 3,
	TOUCH_PAN: 4,
	TOUCH_DOLLY_PAN: 5,
	TOUCH_DOLLY_ROTATE: 6
};
const _EPS = 0.000001;


/**
 * Orbit controls allow the camera to orbit around a target.
 *
 * OrbitControls performs orbiting, dollying (zooming), and panning. Unlike {@link TrackballControls},
 * it maintains the "up" direction `object.up` (+Y by default).
 *
 * - Orbit: Left mouse / touch: one-finger move.
 * - Zoom: Middle mouse, or mousewheel / touch: two-finger spread or squish.
 * - Pan: Right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move.
 *
 * ```js
 * const controls = new OrbitControls( camera, renderer.domElement );
 *
 * // controls.update() must be called after any manual changes to the camera's transform
 * camera.position.set( 0, 20, 100 );
 * controls.update();
 *
 * function animate() {
 *
 * 	// required if controls.enableDamping or controls.autoRotate are set to true
 * 	controls.update();
 *
 * 	renderer.render( scene, camera );
 *
 * }
 * ```
 *
 * @augments Controls
 * @three_import import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
 */
class OrbitControls extends Controls {

	/**
	 * Constructs a new controls instance.
	 *
	 * @param {Object3D} object - The object that is managed by the controls.
	 * @param {?HTMLDOMElement} domElement - The HTML element used for event listeners.
	 */
	constructor( object, domElement = null ) {

		super( object, domElement );

		this.state = _STATE.NONE;

		/**
		 * The focus point of the controls, the `object` orbits around this.
		 * It can be updated manually at any point to change the focus of the controls.
		 *
		 * @type {Vector3}
		 */
		this.target = new Vector3();

		/**
		 * The focus point of the `minTargetRadius` and `maxTargetRadius` limits.
		 * It can be updated manually at any point to change the center of interest
		 * for the `target`.
		 *
		 * @type {Vector3}
		 */
		this.cursor = new Vector3();

		/**
		 * How far you can dolly in (perspective camera only).
		 *
		 * @type {number}
		 * @default 0
		 */
		this.minDistance = 0;

		/**
		 * How far you can dolly out (perspective camera only).
		 *
		 * @type {number}
		 * @default Infinity
		 */
		this.maxDistance = Infinity;

		/**
		 * How far you can zoom in (orthographic camera only).
		 *
		 * @type {number}
		 * @default 0
		 */
		this.minZoom = 0;

		/**
		 * How far you can zoom out (orthographic camera only).
		 *
		 * @type {number}
		 * @default Infinity
		 */
		this.maxZoom = Infinity;

		/**
		 * How close you can get the target to the 3D `cursor`.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.minTargetRadius = 0;

		/**
		 * How far you can move the target from the 3D `cursor`.
		 *
		 * @type {number}
		 * @default Infinity
		 */
		this.maxTargetRadius = Infinity;

		/**
		 * How far you can orbit vertically, lower limit. Range is `[0, Math.PI]` radians.
		 *
		 * @type {number}
		 * @default 0
		 */
		this.minPolarAngle = 0;

		/**
		 * How far you can orbit vertically, upper limit. Range is `[0, Math.PI]` radians.
		 *
		 * @type {number}
		 * @default Math.PI
		 */
		this.maxPolarAngle = Math.PI;

		/**
		 * How far you can orbit horizontally, lower limit. If set, the interval `[ min, max ]`
		 * must be a sub-interval of `[ - 2 PI, 2 PI ]`, with `( max - min < 2 PI )`.
		 *
		 * @type {number}
		 * @default -Infinity
		 */
		this.minAzimuthAngle = - Infinity;

		/**
		 * How far you can orbit horizontally, upper limit. If set, the interval `[ min, max ]`
		 * must be a sub-interval of `[ - 2 PI, 2 PI ]`, with `( max - min < 2 PI )`.
		 *
		 * @type {number}
		 * @default -Infinity
		 */
		this.maxAzimuthAngle = Infinity;

		/**
		 * Set to `true` to enable damping (inertia), which can be used to give a sense of weight
		 * to the controls. Note that if this is enabled, you must call `update()` in your animation
		 * loop.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.enableDamping = false;

		/**
		 * The damping inertia used if `enableDamping` is set to `true`.
		 *
		 * Note that for this to work, you must call `update()` in your animation loop.
		 *
		 * @type {number}
		 * @default 0.05
		 */
		this.dampingFactor = 0.05;

		/**
		 * Enable or disable zooming (dollying) of the camera.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.enableZoom = true;

		/**
		 * Speed of zooming / dollying.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.zoomSpeed = 1.0;

		/**
		 * Enable or disable horizontal and vertical rotation of the camera.
		 *
		 * Note that it is possible to disable a single axis by setting the min and max of the
		 * `minPolarAngle` or `minAzimuthAngle` to the same value, which will cause the vertical
		 * or horizontal rotation to be fixed at that value.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.enableRotate = true;

		/**
		 * Speed of rotation.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.rotateSpeed = 1.0;

		/**
		 * How fast to rotate the camera when the keyboard is used.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.keyRotateSpeed = 1.0;

		/**
		 * Enable or disable camera panning.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.enablePan = true;

		/**
		 * Speed of panning.
		 *
		 * @type {number}
		 * @default 1
		 */
		this.panSpeed = 1.0;

		/**
		 * Defines how the camera's position is translated when panning. If `true`, the camera pans
		 * in screen space. Otherwise, the camera pans in the plane orthogonal to the camera's up
		 * direction.
		 *
		 * @type {boolean}
		 * @default true
		 */
		this.screenSpacePanning = true;

		/**
		 * How fast to pan the camera when the keyboard is used in
		 * pixels per keypress.
		 *
		 * @type {number}
		 * @default 7
		 */
		this.keyPanSpeed = 7.0;

		/**
		 * Setting this property to `true` allows to zoom to the cursor's position.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.zoomToCursor = false;

		/**
		 * Set to true to automatically rotate around the target
		 *
		 * Note that if this is enabled, you must call `update()` in your animation loop.
		 * If you want the auto-rotate speed to be independent of the frame rate (the refresh
		 * rate of the display), you must pass the time `deltaTime`, in seconds, to `update()`.
		 *
		 * @type {boolean}
		 * @default false
		 */
		this.autoRotate = false;

		/**
		 * How fast to rotate around the target if `autoRotate` is `true`. The default  equates to 30 seconds
		 * per orbit at 60fps.
		 *
		 * Note that if `autoRotate` is enabled, you must call `update()` in your animation loop.
		 *
		 * @type {number}
		 * @default 2
		 */
		this.autoRotateSpeed = 2.0;

		/**
		 * This object contains references to the keycodes for controlling camera panning.
		 *
		 * ```js
		 * controls.keys = {
		 * 	LEFT: 'ArrowLeft', //left arrow
		 * 	UP: 'ArrowUp', // up arrow
		 * 	RIGHT: 'ArrowRight', // right arrow
		 * 	BOTTOM: 'ArrowDown' // down arrow
		 * }
		 * ```
		 * @type {Object}
		 */
		this.keys = { LEFT: 'ArrowLeft', UP: 'ArrowUp', RIGHT: 'ArrowRight', BOTTOM: 'ArrowDown' };

		/**
		 * This object contains references to the mouse actions used by the controls.
		 *
		 * ```js
		 * controls.mouseButtons = {
		 * 	LEFT: THREE.MOUSE.ROTATE,
		 * 	MIDDLE: THREE.MOUSE.DOLLY,
		 * 	RIGHT: THREE.MOUSE.PAN
		 * }
		 * ```
		 * @type {Object}
		 */
		this.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };

		/**
		 * This object contains references to the touch actions used by the controls.
		 *
		 * ```js
		 * controls.mouseButtons = {
		 * 	ONE: THREE.TOUCH.ROTATE,
		 * 	TWO: THREE.TOUCH.DOLLY_PAN
		 * }
		 * ```
		 * @type {Object}
		 */
		this.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };

		/**
		 * Used internally by `saveState()` and `reset()`.
		 *
		 * @type {Vector3}
		 */
		this.target0 = this.target.clone();

		/**
		 * Used internally by `saveState()` and `reset()`.
		 *
		 * @type {Vector3}
		 */
		this.position0 = this.object.position.clone();

		/**
		 * Used internally by `saveState()` and `reset()`.
		 *
		 * @type {number}
		 */
		this.zoom0 = this.object.zoom;

		// the target DOM element for key events
		this._domElementKeyEvents = null;

		// internals

		this._lastPosition = new Vector3();
		this._lastQuaternion = new Quaternion();
		this._lastTargetPosition = new Vector3();

		// so camera.up is the orbit axis
		this._quat = new Quaternion().setFromUnitVectors( object.up, new Vector3( 0, 1, 0 ) );
		this._quatInverse = this._quat.clone().invert();

		// current position in spherical coordinates
		this._spherical = new Spherical();
		this._sphericalDelta = new Spherical();

		this._scale = 1;
		this._panOffset = new Vector3();

		this._rotateStart = new Vector2();
		this._rotateEnd = new Vector2();
		this._rotateDelta = new Vector2();

		this._panStart = new Vector2();
		this._panEnd = new Vector2();
		this._panDelta = new Vector2();

		this._dollyStart = new Vector2();
		this._dollyEnd = new Vector2();
		this._dollyDelta = new Vector2();

		this._dollyDirection = new Vector3();
		this._mouse = new Vector2();
		this._performCursorZoom = false;

		this._pointers = [];
		this._pointerPositions = {};

		this._controlActive = false;

		// event listeners

		this._onPointerMove = onPointerMove.bind( this );
		this._onPointerDown = onPointerDown.bind( this );
		this._onPointerUp = onPointerUp.bind( this );
		this._onContextMenu = onContextMenu.bind( this );
		this._onMouseWheel = onMouseWheel.bind( this );
		this._onKeyDown = onKeyDown.bind( this );

		this._onTouchStart = onTouchStart.bind( this );
		this._onTouchMove = onTouchMove.bind( this );

		this._onMouseDown = onMouseDown.bind( this );
		this._onMouseMove = onMouseMove.bind( this );

		this._interceptControlDown = interceptControlDown.bind( this );
		this._interceptControlUp = interceptControlUp.bind( this );

		//

		if ( this.domElement !== null ) {

			this.connect( this.domElement );

		}

		this.update();

	}

	connect( element ) {

		super.connect( element );

		this.domElement.addEventListener( 'pointerdown', this._onPointerDown );
		this.domElement.addEventListener( 'pointercancel', this._onPointerUp );

		this.domElement.addEventListener( 'contextmenu', this._onContextMenu );
		this.domElement.addEventListener( 'wheel', this._onMouseWheel, { passive: false } );

		const document = this.domElement.getRootNode(); // offscreen canvas compatibility
		document.addEventListener( 'keydown', this._interceptControlDown, { passive: true, capture: true } );

		this.domElement.style.touchAction = 'none'; // disable touch scroll

	}

	disconnect() {

		this.domElement.removeEventListener( 'pointerdown', this._onPointerDown );
		this.domElement.removeEventListener( 'pointermove', this._onPointerMove );
		this.domElement.removeEventListener( 'pointerup', this._onPointerUp );
		this.domElement.removeEventListener( 'pointercancel', this._onPointerUp );

		this.domElement.removeEventListener( 'wheel', this._onMouseWheel );
		this.domElement.removeEventListener( 'contextmenu', this._onContextMenu );

		this.stopListenToKeyEvents();

		const document = this.domElement.getRootNode(); // offscreen canvas compatibility
		document.removeEventListener( 'keydown', this._interceptControlDown, { capture: true } );

		this.domElement.style.touchAction = 'auto';

	}

	dispose() {

		this.disconnect();

	}

	/**
	 * Get the current vertical rotation, in radians.
	 *
	 * @return {number} The current vertical rotation, in radians.
	 */
	getPolarAngle() {

		return this._spherical.phi;

	}

	/**
	 * Get the current horizontal rotation, in radians.
	 *
	 * @return {number} The current horizontal rotation, in radians.
	 */
	getAzimuthalAngle() {

		return this._spherical.theta;

	}

	/**
	 * Returns the distance from the camera to the target.
	 *
	 * @return {number} The distance from the camera to the target.
	 */
	getDistance() {

		return this.object.position.distanceTo( this.target );

	}

	/**
	 * Adds key event listeners to the given DOM element.
	 * `window` is a recommended argument for using this method.
	 *
	 * @param {HTMLDOMElement} domElement - The DOM element
	 */
	listenToKeyEvents( domElement ) {

		domElement.addEventListener( 'keydown', this._onKeyDown );
		this._domElementKeyEvents = domElement;

	}

	/**
	 * Removes the key event listener previously defined with `listenToKeyEvents()`.
	 */
	stopListenToKeyEvents() {

		if ( this._domElementKeyEvents !== null ) {

			this._domElementKeyEvents.removeEventListener( 'keydown', this._onKeyDown );
			this._domElementKeyEvents = null;

		}

	}

	/**
	 * Save the current state of the controls. This can later be recovered with `reset()`.
	 */
	saveState() {

		this.target0.copy( this.target );
		this.position0.copy( this.object.position );
		this.zoom0 = this.object.zoom;

	}

	/**
	 * Reset the controls to their state from either the last time the `saveState()`
	 * was called, or the initial state.
	 */
	reset() {

		this.target.copy( this.target0 );
		this.object.position.copy( this.position0 );
		this.object.zoom = this.zoom0;

		this.object.updateProjectionMatrix();
		this.dispatchEvent( _changeEvent );

		this.update();

		this.state = _STATE.NONE;

	}

	update( deltaTime = null ) {

		const position = this.object.position;

		_v.copy( position ).sub( this.target );

		// rotate offset to "y-axis-is-up" space
		_v.applyQuaternion( this._quat );

		// angle from z-axis around y-axis
		this._spherical.setFromVector3( _v );

		if ( this.autoRotate && this.state === _STATE.NONE ) {

			this._rotateLeft( this._getAutoRotationAngle( deltaTime ) );

		}

		if ( this.enableDamping ) {

			this._spherical.theta += this._sphericalDelta.theta * this.dampingFactor;
			this._spherical.phi += this._sphericalDelta.phi * this.dampingFactor;

		} else {

			this._spherical.theta += this._sphericalDelta.theta;
			this._spherical.phi += this._sphericalDelta.phi;

		}

		// restrict theta to be between desired limits

		let min = this.minAzimuthAngle;
		let max = this.maxAzimuthAngle;

		if ( isFinite( min ) && isFinite( max ) ) {

			if ( min < - Math.PI ) min += _twoPI; else if ( min > Math.PI ) min -= _twoPI;

			if ( max < - Math.PI ) max += _twoPI; else if ( max > Math.PI ) max -= _twoPI;

			if ( min <= max ) {

				this._spherical.theta = Math.max( min, Math.min( max, this._spherical.theta ) );

			} else {

				this._spherical.theta = ( this._spherical.theta > ( min + max ) / 2 ) ?
					Math.max( min, this._spherical.theta ) :
					Math.min( max, this._spherical.theta );

			}

		}

		// restrict phi to be between desired limits
		this._spherical.phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, this._spherical.phi ) );

		this._spherical.makeSafe();


		// move target to panned location

		if ( this.enableDamping === true ) {

			this.target.addScaledVector( this._panOffset, this.dampingFactor );

		} else {

			this.target.add( this._panOffset );

		}

		// Limit the target distance from the cursor to create a sphere around the center of interest
		this.target.sub( this.cursor );
		this.target.clampLength( this.minTargetRadius, this.maxTargetRadius );
		this.target.add( this.cursor );

		let zoomChanged = false;
		// adjust the camera position based on zoom only if we're not zooming to the cursor or if it's an ortho camera
		// we adjust zoom later in these cases
		if ( this.zoomToCursor && this._performCursorZoom || this.object.isOrthographicCamera ) {

			this._spherical.radius = this._clampDistance( this._spherical.radius );

		} else {

			const prevRadius = this._spherical.radius;
			this._spherical.radius = this._clampDistance( this._spherical.radius * this._scale );
			zoomChanged = prevRadius != this._spherical.radius;

		}

		_v.setFromSpherical( this._spherical );

		// rotate offset back to "camera-up-vector-is-up" space
		_v.applyQuaternion( this._quatInverse );

		position.copy( this.target ).add( _v );

		this.object.lookAt( this.target );

		if ( this.enableDamping === true ) {

			this._sphericalDelta.theta *= ( 1 - this.dampingFactor );
			this._sphericalDelta.phi *= ( 1 - this.dampingFactor );

			this._panOffset.multiplyScalar( 1 - this.dampingFactor );

		} else {

			this._sphericalDelta.set( 0, 0, 0 );

			this._panOffset.set( 0, 0, 0 );

		}

		// adjust camera position
		if ( this.zoomToCursor && this._performCursorZoom ) {

			let newRadius = null;
			if ( this.object.isPerspectiveCamera ) {

				// move the camera down the pointer ray
				// this method avoids floating point error
				const prevRadius = _v.length();
				newRadius = this._clampDistance( prevRadius * this._scale );

				const radiusDelta = prevRadius - newRadius;
				this.object.position.addScaledVector( this._dollyDirection, radiusDelta );
				this.object.updateMatrixWorld();

				zoomChanged = !! radiusDelta;

			} else if ( this.object.isOrthographicCamera ) {

				// adjust the ortho camera position based on zoom changes
				const mouseBefore = new Vector3( this._mouse.x, this._mouse.y, 0 );
				mouseBefore.unproject( this.object );

				const prevZoom = this.object.zoom;
				this.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom / this._scale ) );
				this.object.updateProjectionMatrix();

				zoomChanged = prevZoom !== this.object.zoom;

				const mouseAfter = new Vector3( this._mouse.x, this._mouse.y, 0 );
				mouseAfter.unproject( this.object );

				this.object.position.sub( mouseAfter ).add( mouseBefore );
				this.object.updateMatrixWorld();

				newRadius = _v.length();

			} else {

				console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled.' );
				this.zoomToCursor = false;

			}

			// handle the placement of the target
			if ( newRadius !== null ) {

				if ( this.screenSpacePanning ) {

					// position the orbit target in front of the new camera position
					this.target.set( 0, 0, -1 )
						.transformDirection( this.object.matrix )
						.multiplyScalar( newRadius )
						.add( this.object.position );

				} else {

					// get the ray and translation plane to compute target
					_ray.origin.copy( this.object.position );
					_ray.direction.set( 0, 0, -1 ).transformDirection( this.object.matrix );

					// if the camera is 20 degrees above the horizon then don't adjust the focus target to avoid
					// extremely large values
					if ( Math.abs( this.object.up.dot( _ray.direction ) ) < _TILT_LIMIT ) {

						this.object.lookAt( this.target );

					} else {

						_plane.setFromNormalAndCoplanarPoint( this.object.up, this.target );
						_ray.intersectPlane( _plane, this.target );

					}

				}

			}

		} else if ( this.object.isOrthographicCamera ) {

			const prevZoom = this.object.zoom;
			this.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom / this._scale ) );

			if ( prevZoom !== this.object.zoom ) {

				this.object.updateProjectionMatrix();
				zoomChanged = true;

			}

		}

		this._scale = 1;
		this._performCursorZoom = false;

		// update condition is:
		// min(camera displacement, camera rotation in radians)^2 > EPS
		// using small-angle approximation cos(x/2) = 1 - x^2 / 8

		if ( zoomChanged ||
			this._lastPosition.distanceToSquared( this.object.position ) > _EPS ||
			8 * ( 1 - this._lastQuaternion.dot( this.object.quaternion ) ) > _EPS ||
			this._lastTargetPosition.distanceToSquared( this.target ) > _EPS ) {

			this.dispatchEvent( _changeEvent );

			this._lastPosition.copy( this.object.position );
			this._lastQuaternion.copy( this.object.quaternion );
			this._lastTargetPosition.copy( this.target );

			return true;

		}

		return false;

	}

	_getAutoRotationAngle( deltaTime ) {

		if ( deltaTime !== null ) {

			return ( _twoPI / 60 * this.autoRotateSpeed ) * deltaTime;

		} else {

			return _twoPI / 60 / 60 * this.autoRotateSpeed;

		}

	}

	_getZoomScale( delta ) {

		const normalizedDelta = Math.abs( delta * 0.01 );
		return Math.pow( 0.95, this.zoomSpeed * normalizedDelta );

	}

	_rotateLeft( angle ) {

		this._sphericalDelta.theta -= angle;

	}

	_rotateUp( angle ) {

		this._sphericalDelta.phi -= angle;

	}

	_panLeft( distance, objectMatrix ) {

		_v.setFromMatrixColumn( objectMatrix, 0 ); // get X column of objectMatrix
		_v.multiplyScalar( - distance );

		this._panOffset.add( _v );

	}

	_panUp( distance, objectMatrix ) {

		if ( this.screenSpacePanning === true ) {

			_v.setFromMatrixColumn( objectMatrix, 1 );

		} else {

			_v.setFromMatrixColumn( objectMatrix, 0 );
			_v.crossVectors( this.object.up, _v );

		}

		_v.multiplyScalar( distance );

		this._panOffset.add( _v );

	}

	// deltaX and deltaY are in pixels; right and down are positive
	_pan( deltaX, deltaY ) {

		const element = this.domElement;

		if ( this.object.isPerspectiveCamera ) {

			// perspective
			const position = this.object.position;
			_v.copy( position ).sub( this.target );
			let targetDistance = _v.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan( ( this.object.fov / 2 ) * Math.PI / 180.0 );

			// we use only clientHeight here so aspect ratio does not distort speed
			this._panLeft( 2 * deltaX * targetDistance / element.clientHeight, this.object.matrix );
			this._panUp( 2 * deltaY * targetDistance / element.clientHeight, this.object.matrix );

		} else if ( this.object.isOrthographicCamera ) {

			// orthographic
			this._panLeft( deltaX * ( this.object.right - this.object.left ) / this.object.zoom / element.clientWidth, this.object.matrix );
			this._panUp( deltaY * ( this.object.top - this.object.bottom ) / this.object.zoom / element.clientHeight, this.object.matrix );

		} else {

			// camera neither orthographic nor perspective
			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );
			this.enablePan = false;

		}

	}

	_dollyOut( dollyScale ) {

		if ( this.object.isPerspectiveCamera || this.object.isOrthographicCamera ) {

			this._scale /= dollyScale;

		} else {

			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
			this.enableZoom = false;

		}

	}

	_dollyIn( dollyScale ) {

		if ( this.object.isPerspectiveCamera || this.object.isOrthographicCamera ) {

			this._scale *= dollyScale;

		} else {

			console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );
			this.enableZoom = false;

		}

	}

	_updateZoomParameters( x, y ) {

		if ( ! this.zoomToCursor ) {

			return;

		}

		this._performCursorZoom = true;

		const rect = this.domElement.getBoundingClientRect();
		const dx = x - rect.left;
		const dy = y - rect.top;
		const w = rect.width;
		const h = rect.height;

		this._mouse.x = ( dx / w ) * 2 - 1;
		this._mouse.y = - ( dy / h ) * 2 + 1;

		this._dollyDirection.set( this._mouse.x, this._mouse.y, 1 ).unproject( this.object ).sub( this.object.position ).normalize();

	}

	_clampDistance( dist ) {

		return Math.max( this.minDistance, Math.min( this.maxDistance, dist ) );

	}

	//
	// event callbacks - update the object state
	//

	_handleMouseDownRotate( event ) {

		this._rotateStart.set( event.clientX, event.clientY );

	}

	_handleMouseDownDolly( event ) {

		this._updateZoomParameters( event.clientX, event.clientX );
		this._dollyStart.set( event.clientX, event.clientY );

	}

	_handleMouseDownPan( event ) {

		this._panStart.set( event.clientX, event.clientY );

	}

	_handleMouseMoveRotate( event ) {

		this._rotateEnd.set( event.clientX, event.clientY );

		this._rotateDelta.subVectors( this._rotateEnd, this._rotateStart ).multiplyScalar( this.rotateSpeed );

		const element = this.domElement;

		this._rotateLeft( _twoPI * this._rotateDelta.x / element.clientHeight ); // yes, height

		this._rotateUp( _twoPI * this._rotateDelta.y / element.clientHeight );

		this._rotateStart.copy( this._rotateEnd );

		this.update();

	}

	_handleMouseMoveDolly( event ) {

		this._dollyEnd.set( event.clientX, event.clientY );

		this._dollyDelta.subVectors( this._dollyEnd, this._dollyStart );

		if ( this._dollyDelta.y > 0 ) {

			this._dollyOut( this._getZoomScale( this._dollyDelta.y ) );

		} else if ( this._dollyDelta.y < 0 ) {

			this._dollyIn( this._getZoomScale( this._dollyDelta.y ) );

		}

		this._dollyStart.copy( this._dollyEnd );

		this.update();

	}

	_handleMouseMovePan( event ) {

		this._panEnd.set( event.clientX, event.clientY );

		this._panDelta.subVectors( this._panEnd, this._panStart ).multiplyScalar( this.panSpeed );

		this._pan( this._panDelta.x, this._panDelta.y );

		this._panStart.copy( this._panEnd );

		this.update();

	}

	_handleMouseWheel( event ) {

		this._updateZoomParameters( event.clientX, event.clientY );

		if ( event.deltaY < 0 ) {

			this._dollyIn( this._getZoomScale( event.deltaY ) );

		} else if ( event.deltaY > 0 ) {

			this._dollyOut( this._getZoomScale( event.deltaY ) );

		}

		this.update();

	}

	_handleKeyDown( event ) {

		let needsUpdate = false;

		switch ( event.code ) {

			case this.keys.UP:

				if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

					if ( this.enableRotate ) {

						this._rotateUp( _twoPI * this.keyRotateSpeed / this.domElement.clientHeight );

					}

				} else {

					if ( this.enablePan ) {

						this._pan( 0, this.keyPanSpeed );

					}

				}

				needsUpdate = true;
				break;

			case this.keys.BOTTOM:

				if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

					if ( this.enableRotate ) {

						this._rotateUp( - _twoPI * this.keyRotateSpeed / this.domElement.clientHeight );

					}

				} else {

					if ( this.enablePan ) {

						this._pan( 0, - this.keyPanSpeed );

					}

				}

				needsUpdate = true;
				break;

			case this.keys.LEFT:

				if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

					if ( this.enableRotate ) {

						this._rotateLeft( _twoPI * this.keyRotateSpeed / this.domElement.clientHeight );

					}

				} else {

					if ( this.enablePan ) {

						this._pan( this.keyPanSpeed, 0 );

					}

				}

				needsUpdate = true;
				break;

			case this.keys.RIGHT:

				if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

					if ( this.enableRotate ) {

						this._rotateLeft( - _twoPI * this.keyRotateSpeed / this.domElement.clientHeight );

					}

				} else {

					if ( this.enablePan ) {

						this._pan( - this.keyPanSpeed, 0 );

					}

				}

				needsUpdate = true;
				break;

		}

		if ( needsUpdate ) {

			// prevent the browser from scrolling on cursor keys
			event.preventDefault();

			this.update();

		}


	}

	_handleTouchStartRotate( event ) {

		if ( this._pointers.length === 1 ) {

			this._rotateStart.set( event.pageX, event.pageY );

		} else {

			const position = this._getSecondPointerPosition( event );

			const x = 0.5 * ( event.pageX + position.x );
			const y = 0.5 * ( event.pageY + position.y );

			this._rotateStart.set( x, y );

		}

	}

	_handleTouchStartPan( event ) {

		if ( this._pointers.length === 1 ) {

			this._panStart.set( event.pageX, event.pageY );

		} else {

			const position = this._getSecondPointerPosition( event );

			const x = 0.5 * ( event.pageX + position.x );
			const y = 0.5 * ( event.pageY + position.y );

			this._panStart.set( x, y );

		}

	}

	_handleTouchStartDolly( event ) {

		const position = this._getSecondPointerPosition( event );

		const dx = event.pageX - position.x;
		const dy = event.pageY - position.y;

		const distance = Math.sqrt( dx * dx + dy * dy );

		this._dollyStart.set( 0, distance );

	}

	_handleTouchStartDollyPan( event ) {

		if ( this.enableZoom ) this._handleTouchStartDolly( event );

		if ( this.enablePan ) this._handleTouchStartPan( event );

	}

	_handleTouchStartDollyRotate( event ) {

		if ( this.enableZoom ) this._handleTouchStartDolly( event );

		if ( this.enableRotate ) this._handleTouchStartRotate( event );

	}

	_handleTouchMoveRotate( event ) {

		if ( this._pointers.length == 1 ) {

			this._rotateEnd.set( event.pageX, event.pageY );

		} else {

			const position = this._getSecondPointerPosition( event );

			const x = 0.5 * ( event.pageX + position.x );
			const y = 0.5 * ( event.pageY + position.y );

			this._rotateEnd.set( x, y );

		}

		this._rotateDelta.subVectors( this._rotateEnd, this._rotateStart ).multiplyScalar( this.rotateSpeed );

		const element = this.domElement;

		this._rotateLeft( _twoPI * this._rotateDelta.x / element.clientHeight ); // yes, height

		this._rotateUp( _twoPI * this._rotateDelta.y / element.clientHeight );

		this._rotateStart.copy( this._rotateEnd );

	}

	_handleTouchMovePan( event ) {

		if ( this._pointers.length === 1 ) {

			this._panEnd.set( event.pageX, event.pageY );

		} else {

			const position = this._getSecondPointerPosition( event );

			const x = 0.5 * ( event.pageX + position.x );
			const y = 0.5 * ( event.pageY + position.y );

			this._panEnd.set( x, y );

		}

		this._panDelta.subVectors( this._panEnd, this._panStart ).multiplyScalar( this.panSpeed );

		this._pan( this._panDelta.x, this._panDelta.y );

		this._panStart.copy( this._panEnd );

	}

	_handleTouchMoveDolly( event ) {

		const position = this._getSecondPointerPosition( event );

		const dx = event.pageX - position.x;
		const dy = event.pageY - position.y;

		const distance = Math.sqrt( dx * dx + dy * dy );

		this._dollyEnd.set( 0, distance );

		this._dollyDelta.set( 0, Math.pow( this._dollyEnd.y / this._dollyStart.y, this.zoomSpeed ) );

		this._dollyOut( this._dollyDelta.y );

		this._dollyStart.copy( this._dollyEnd );

		const centerX = ( event.pageX + position.x ) * 0.5;
		const centerY = ( event.pageY + position.y ) * 0.5;

		this._updateZoomParameters( centerX, centerY );

	}

	_handleTouchMoveDollyPan( event ) {

		if ( this.enableZoom ) this._handleTouchMoveDolly( event );

		if ( this.enablePan ) this._handleTouchMovePan( event );

	}

	_handleTouchMoveDollyRotate( event ) {

		if ( this.enableZoom ) this._handleTouchMoveDolly( event );

		if ( this.enableRotate ) this._handleTouchMoveRotate( event );

	}

	// pointers

	_addPointer( event ) {

		this._pointers.push( event.pointerId );

	}

	_removePointer( event ) {

		delete this._pointerPositions[ event.pointerId ];

		for ( let i = 0; i < this._pointers.length; i ++ ) {

			if ( this._pointers[ i ] == event.pointerId ) {

				this._pointers.splice( i, 1 );
				return;

			}

		}

	}

	_isTrackingPointer( event ) {

		for ( let i = 0; i < this._pointers.length; i ++ ) {

			if ( this._pointers[ i ] == event.pointerId ) return true;

		}

		return false;

	}

	_trackPointer( event ) {

		let position = this._pointerPositions[ event.pointerId ];

		if ( position === undefined ) {

			position = new Vector2();
			this._pointerPositions[ event.pointerId ] = position;

		}

		position.set( event.pageX, event.pageY );

	}

	_getSecondPointerPosition( event ) {

		const pointerId = ( event.pointerId === this._pointers[ 0 ] ) ? this._pointers[ 1 ] : this._pointers[ 0 ];

		return this._pointerPositions[ pointerId ];

	}

	//

	_customWheelEvent( event ) {

		const mode = event.deltaMode;

		// minimal wheel event altered to meet delta-zoom demand
		const newEvent = {
			clientX: event.clientX,
			clientY: event.clientY,
			deltaY: event.deltaY,
		};

		switch ( mode ) {

			case 1: // LINE_MODE
				newEvent.deltaY *= 16;
				break;

			case 2: // PAGE_MODE
				newEvent.deltaY *= 100;
				break;

		}

		// detect if event was triggered by pinching
		if ( event.ctrlKey && ! this._controlActive ) {

			newEvent.deltaY *= 10;

		}

		return newEvent;

	}

}

function onPointerDown( event ) {

	if ( this.enabled === false ) return;

	if ( this._pointers.length === 0 ) {

		this.domElement.setPointerCapture( event.pointerId );

		this.domElement.addEventListener( 'pointermove', this._onPointerMove );
		this.domElement.addEventListener( 'pointerup', this._onPointerUp );

	}

	//

	if ( this._isTrackingPointer( event ) ) return;

	//

	this._addPointer( event );

	if ( event.pointerType === 'touch' ) {

		this._onTouchStart( event );

	} else {

		this._onMouseDown( event );

	}

}

function onPointerMove( event ) {

	if ( this.enabled === false ) return;

	if ( event.pointerType === 'touch' ) {

		this._onTouchMove( event );

	} else {

		this._onMouseMove( event );

	}

}

function onPointerUp( event ) {

	this._removePointer( event );

	switch ( this._pointers.length ) {

		case 0:

			this.domElement.releasePointerCapture( event.pointerId );

			this.domElement.removeEventListener( 'pointermove', this._onPointerMove );
			this.domElement.removeEventListener( 'pointerup', this._onPointerUp );

			this.dispatchEvent( _endEvent );

			this.state = _STATE.NONE;

			break;

		case 1:

			const pointerId = this._pointers[ 0 ];
			const position = this._pointerPositions[ pointerId ];

			// minimal placeholder event - allows state correction on pointer-up
			this._onTouchStart( { pointerId: pointerId, pageX: position.x, pageY: position.y } );

			break;

	}

}

function onMouseDown( event ) {

	let mouseAction;

	switch ( event.button ) {

		case 0:

			mouseAction = this.mouseButtons.LEFT;
			break;

		case 1:

			mouseAction = this.mouseButtons.MIDDLE;
			break;

		case 2:

			mouseAction = this.mouseButtons.RIGHT;
			break;

		default:

			mouseAction = -1;

	}

	switch ( mouseAction ) {

		case MOUSE.DOLLY:

			if ( this.enableZoom === false ) return;

			this._handleMouseDownDolly( event );

			this.state = _STATE.DOLLY;

			break;

		case MOUSE.ROTATE:

			if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

				if ( this.enablePan === false ) return;

				this._handleMouseDownPan( event );

				this.state = _STATE.PAN;

			} else {

				if ( this.enableRotate === false ) return;

				this._handleMouseDownRotate( event );

				this.state = _STATE.ROTATE;

			}

			break;

		case MOUSE.PAN:

			if ( event.ctrlKey || event.metaKey || event.shiftKey ) {

				if ( this.enableRotate === false ) return;

				this._handleMouseDownRotate( event );

				this.state = _STATE.ROTATE;

			} else {

				if ( this.enablePan === false ) return;

				this._handleMouseDownPan( event );

				this.state = _STATE.PAN;

			}

			break;

		default:

			this.state = _STATE.NONE;

	}

	if ( this.state !== _STATE.NONE ) {

		this.dispatchEvent( _startEvent );

	}

}

function onMouseMove( event ) {

	switch ( this.state ) {

		case _STATE.ROTATE:

			if ( this.enableRotate === false ) return;

			this._handleMouseMoveRotate( event );

			break;

		case _STATE.DOLLY:

			if ( this.enableZoom === false ) return;

			this._handleMouseMoveDolly( event );

			break;

		case _STATE.PAN:

			if ( this.enablePan === false ) return;

			this._handleMouseMovePan( event );

			break;

	}

}

function onMouseWheel( event ) {

	if ( this.enabled === false || this.enableZoom === false || this.state !== _STATE.NONE ) return;

	event.preventDefault();

	this.dispatchEvent( _startEvent );

	this._handleMouseWheel( this._customWheelEvent( event ) );

	this.dispatchEvent( _endEvent );

}

function onKeyDown( event ) {

	if ( this.enabled === false ) return;

	this._handleKeyDown( event );

}

function onTouchStart( event ) {

	this._trackPointer( event );

	switch ( this._pointers.length ) {

		case 1:

			switch ( this.touches.ONE ) {

				case TOUCH.ROTATE:

					if ( this.enableRotate === false ) return;

					this._handleTouchStartRotate( event );

					this.state = _STATE.TOUCH_ROTATE;

					break;

				case TOUCH.PAN:

					if ( this.enablePan === false ) return;

					this._handleTouchStartPan( event );

					this.state = _STATE.TOUCH_PAN;

					break;

				default:

					this.state = _STATE.NONE;

			}

			break;

		case 2:

			switch ( this.touches.TWO ) {

				case TOUCH.DOLLY_PAN:

					if ( this.enableZoom === false && this.enablePan === false ) return;

					this._handleTouchStartDollyPan( event );

					this.state = _STATE.TOUCH_DOLLY_PAN;

					break;

				case TOUCH.DOLLY_ROTATE:

					if ( this.enableZoom === false && this.enableRotate === false ) return;

					this._handleTouchStartDollyRotate( event );

					this.state = _STATE.TOUCH_DOLLY_ROTATE;

					break;

				default:

					this.state = _STATE.NONE;

			}

			break;

		default:

			this.state = _STATE.NONE;

	}

	if ( this.state !== _STATE.NONE ) {

		this.dispatchEvent( _startEvent );

	}

}

function onTouchMove( event ) {

	this._trackPointer( event );

	switch ( this.state ) {

		case _STATE.TOUCH_ROTATE:

			if ( this.enableRotate === false ) return;

			this._handleTouchMoveRotate( event );

			this.update();

			break;

		case _STATE.TOUCH_PAN:

			if ( this.enablePan === false ) return;

			this._handleTouchMovePan( event );

			this.update();

			break;

		case _STATE.TOUCH_DOLLY_PAN:

			if ( this.enableZoom === false && this.enablePan === false ) return;

			this._handleTouchMoveDollyPan( event );

			this.update();

			break;

		case _STATE.TOUCH_DOLLY_ROTATE:

			if ( this.enableZoom === false && this.enableRotate === false ) return;

			this._handleTouchMoveDollyRotate( event );

			this.update();

			break;

		default:

			this.state = _STATE.NONE;

	}

}

function onContextMenu( event ) {

	if ( this.enabled === false ) return;

	event.preventDefault();

}

function interceptControlDown( event ) {

	if ( event.key === 'Control' ) {

		this._controlActive = true;

		const document = this.domElement.getRootNode(); // offscreen canvas compatibility

		document.addEventListener( 'keyup', this._interceptControlUp, { passive: true, capture: true } );

	}

}

function interceptControlUp( event ) {

	if ( event.key === 'Control' ) {

		this._controlActive = false;

		const document = this.domElement.getRootNode(); // offscreen canvas compatibility

		document.removeEventListener( 'keyup', this._interceptControlUp, { passive: true, capture: true } );

	}

}

const particleVertex = "uniform sampler2D u_position_size_texture;\r\nvarying vec2 vUv;\r\n\r\nvoid main() {\r\n  vec4 positionSize = texture2D(u_position_size_texture, uv);\r\n  vUv = uv;\r\n\r\n  gl_Position = projectionMatrix * modelViewMatrix * vec4(positionSize.xyz, 1.0);\r\n  gl_PointSize = positionSize.w;\r\n}";

const particleFragment = "uniform sampler2D u_velocity_lifetime_texture;\r\nuniform sampler2D u_color_texture;\r\nvarying vec2 vUv;\r\n\r\nvoid main() {\r\n  vec4 velocityLifetime = texture2D(u_velocity_lifetime_texture, vUv);\r\n  float lifetime = velocityLifetime.w;\r\n  if(lifetime <= 0.0 && lifetime >= -0.999) {\r\n    discard;\r\n    return;\r\n  }\r\n\r\n  gl_FragColor = texture2D(u_color_texture, vUv);\r\n}";

const formats = [THREE.RedFormat, THREE.RGFormat, THREE.RGBFormat, THREE.RGBAFormat];
class FBO {
    // FBO properties
    uuid = crypto.randomUUID();
    name;
    textureName;
    height;
    width;
    renderer;
    properties = [];
    dependencies = new Set();
    constraints = new Map();
    channels = 4; // Default to RGBA
    material = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        uniforms: {},
    });
    read;
    write;
    // TODO: Store injected data in a buffer then batch inject it to the FBO or
    //      use a web worker to handle the injection in the background or
    //      use a framebuffer object to handle the injection (patch the FBO with a texture ?)
    injectBuffer = new Map();
    needsUpdate = false;
    needsRebuild = false;
    // Scene
    scene = new THREE.Scene();
    camera;
    constructor({ name, width, height, renderer, camera, properties = [], channels = 4, // Default to RGBA
     }) {
        // Constructor properties
        this.name = name;
        this.textureName = `u_${this.name}_texture`;
        this.height = height;
        this.width = width;
        this.renderer = renderer;
        this.camera = camera;
        // Set channels
        if (channels) {
            // clamp channels to 1-4
            this.channels = Math.max(1, Math.min(channels, 4));
            // if channels is 3, set it to 4 (THREE.js does not support RGB textures in WebGL2)
            if (this.channels === 3) {
                this.channels = 4;
            }
        }
        this.read = new THREE.WebGLRenderTarget(this.width, this.height, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: formats[this.channels - 1] || THREE.RGBAFormat,
            type: THREE.FloatType,
            depthBuffer: false,
            stencilBuffer: false,
        });
        this.write = this.read.clone();
        this.renderer.initRenderTarget(this.read);
        this.renderer.initRenderTarget(this.write);
        // Initialize properties
        if (properties) {
            this.properties = properties;
        }
        // Self-dependency
        this.dependencies.add(this);
    }
    build() {
        // Dynamic shader material creation
        let vertex = /* glsl */ `
      out vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `;
        let fragment = /* glsl */ `
      in vec2 vUv;
      #UNIFORMS
      out vec4 fragColor;
      void main() {
        #PROPERTY_UNPACKING
        #CONSTRAINTS
        #REPACKING_RETURN
      }
    `;
        let uniformString = "";
        let propertyUnpacking = "";
        let constraints = "";
        let repackingReturn = "fragColor = vec4(#X, #Y, #Z, #W);";
        for (const dependancyFBO of this.dependencies) {
            // Add uniform for the FBO texture
            this.material.uniforms[dependancyFBO.textureName] = { value: dependancyFBO.read.texture };
            for (const property of dependancyFBO.properties.values()) {
                let type = property.size > 1 ? `vec${property.size}` : "float";
                let channels = "xyzw".slice(property.channelOffset, property.channelOffset + property.size);
                propertyUnpacking += `${type} ${property.name} = texture(${dependancyFBO.textureName}, vUv).${channels};\n`;
            }
        }
        for (const constraint of this.constraints.values()) {
            if (!constraint.active)
                continue;
            for (const uniformName in constraint.uniforms) {
                const uniformValue = constraint.uniforms[uniformName];
                this.material.uniforms[uniformName] = { value: uniformValue };
            }
            constraints += constraint.glsl + "\n";
        }
        console.log("Building FBO Material:", this.name, constraints);
        for (const uniformName in this.material.uniforms) {
            const uniformValue = this.material.uniforms[uniformName].value;
            let type = getGLSLType(uniformValue);
            if (type) {
                uniformString += `uniform ${type} ${uniformName};\n`;
            }
            else {
                console.warn(`Unsupported uniform type for ${uniformName}:`, uniformValue);
            }
        }
        let returnMap = {
            "#X": null,
            "#Y": null,
            "#Z": null,
            "#W": null,
        };
        for (const property of this.properties.values()) {
            for (let i = 0; i < property.size; i++) {
                let returnChannel = "xyzw".charAt(property.channelOffset + i);
                let propertyChannel = property.size > 1 ? "." + "xyzw".charAt(i) : "";
                if (returnMap[`#${returnChannel.toUpperCase()}`] === null) {
                    returnMap[`#${returnChannel.toUpperCase()}`] = `${property.name}${propertyChannel}`;
                }
            }
        }
        for (const channel in returnMap) {
            repackingReturn = repackingReturn.replace(channel, returnMap[channel] || "0.0");
        }
        fragment = fragment
            .replace("#UNIFORMS", uniformString)
            .replace("#PROPERTY_UNPACKING", propertyUnpacking)
            .replace("#CONSTRAINTS", constraints)
            .replace("#REPACKING_RETURN", repackingReturn);
        this.material.vertexShader = vertex;
        this.material.fragmentShader = fragment;
        this.material.needsUpdate = true;
        console.log("FBO Material built:", this.name, fragment);
        // Add a bi-unit quad to the scene with the simulation material
        const quadGeometry = new THREE.PlaneGeometry(2, 2);
        const quadMesh = new THREE.Mesh(quadGeometry, this.material);
        this.scene.add(quadMesh);
    }
    update() {
        if (this.needsRebuild) {
            this.build();
            this.needsRebuild = false;
        }
        if (!this.needsUpdate)
            return;
        // Update texture uniforms
        for (const dependancyFBO of this.dependencies) {
            this.material.uniforms[dependancyFBO.textureName].value = dependancyFBO.read.texture;
        }
        // Render the scene to write target
        this.renderer.setRenderTarget(this.write);
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);
        // Swap read and write targets
        this.swap();
        this.needsUpdate = false;
    }
    swap() {
        // Swap the read and write targets
        const temp = this.read;
        this.read = this.write;
        this.write = temp;
    }
    // Method to add value(s) to the FBO
    inject(data, offset = 0) {
        if (data.length % this.channels !== 0) {
            throw new Error(`Data length must be a multiple of ${this.channels}.`);
        }
        if (offset < 0 || offset + data.length / 4 > this.width * this.height) {
            throw new Error("Offset + data length exceeds texture capacity.");
        }
        // if (!overwrite) {
        //   let startX = offset % this.width; // Column
        //   let startY = Math.floor(offset / this.width); // Row
        //   let endX = startX + ((data.length / 4) % this.width); // End column
        //   let endY = startY + Math.floor(data.length / 4 / this.width); // End row
        //   let height = endY - startY + 1; // Number of rows to write
        //   let width = endX - startX; // Number of columns to write
        //   // If not overwriting, read the current data from the read target
        //   let currentData = new Float32Array(this.width * this.height * 4);
        //   this.renderer.readRenderTargetPixels(this.read, startX, startY, width, height, currentData);
        // }
        // if (offset == 0 && data.length === this.width * this.height * this.channels) {
        //   console.warn("Data is exactly the size of the texture. Directly setting it.");
        //   // If the data is exactly the size of the texture, we can directly set it
        //   this.read.texture.image.data = data;
        //   this.read.texture.needsUpdate = true;
        //   return;
        // }
        //TODO: Move this to a web worker ?
        const totalPixels = data.length / 4; // Total number of RGBA pixels
        const textureWidth = this.width;
        const textureHeight = this.height;
        // Ensure the data fits within the texture dimensions
        if (offset + totalPixels > textureWidth * textureHeight) {
            console.warn("Data exceeds texture capacity. Some data will not be added.");
            return;
        }
        // Inject data row by row
        let remainingPixels = totalPixels;
        let currentOffset = offset;
        while (remainingPixels > 0) {
            const x = currentOffset % textureWidth; // Column
            const y = Math.floor(currentOffset / textureWidth); // Row
            // Calculate how many pixels can fit in the current row
            const pixelsInRow = Math.min(remainingPixels, textureWidth - x);
            // Create a DataTexture for the current chunk of data
            const chunkData = data.subarray((totalPixels - remainingPixels) * 4, (totalPixels - remainingPixels + pixelsInRow) * 4);
            const dataTexture = new THREE.DataTexture(chunkData, pixelsInRow, // Width of the chunk
            1, // Height of 1 pixel (single row)
            THREE.RGBAFormat, THREE.FloatType);
            dataTexture.needsUpdate = true;
            this.renderer.copyTextureToTexture(dataTexture, this.read.texture, null, new THREE.Vector2(x, y));
            // Update counters
            remainingPixels -= pixelsInRow;
            currentOffset += pixelsInRow;
        }
        this.read.texture.needsUpdate = true;
    }
    dispose() {
        this.read.dispose();
        this.write.dispose();
        this.material.dispose();
    }
}

/**
 * Represents a property in a Frame Buffer Object (FBO).
 * Each property has a unique UUID, a name, a size, a default value,
 * and is associated with an FBO.
 *
 * This is an abstraction layer over FBOs. Properties that are not grouped use
 * their own FBOs, while grouped properties share the same FBO and are packed
 * into a single texture.
 */
class Property {
    uuid = crypto.randomUUID();
    name;
    size;
    defaultValue;
    fbo;
    channelOffset = 0;
    constructor({ name, size, defaultValue, fbo }) {
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

/*
 * PropertyManager is responsible for managing properties, their FBOs, and constraints.
 * It allows adding, constraining, grouping, linking, and updating properties.
 */
class PropertyManager {
    uuid = crypto.randomUUID();
    // Properties
    properties = new Map();
    // Basic scene setup
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    renderer;
    height = 512;
    width = 512;
    // The framebuffer objects (FBOs) for each property
    fbos = new Map();
    /**
     * Constructor for PropertyManager
     * @param {PropertyManagerParams} params - Parameters for the PropertyManager
     * @param {THREE.WebGLRenderer} params.renderer - The WebGL renderer to use
     * @param {number} params.width - Width of the Framebuffer Objects (FBOs)
     * @param {number} params.height - Height of the Framebuffer Objects (FBOs)
     */
    constructor({ renderer = new THREE.WebGLRenderer(), width = 512, height = 512 }) {
        if (!renderer || !(renderer instanceof THREE.WebGLRenderer)) {
            throw new Error("Invalid renderer provided. Must be an instance of THREE.WebGLRenderer.");
        }
        if (width <= 0 || height <= 0) {
            throw new Error("Width and height must be positive numbers.");
        }
        this.renderer = renderer;
        this.width = width;
        this.height = height;
        // Initialize camera
        this.camera.position.set(0, 0, 1);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.camera.updateProjectionMatrix();
    }
    /**
     * Adds a new property to the PropertyManager.
     * @param {string} name - The name of the property.
     * @param {number} size - The size of the property (number of channels).
     * @param {Float32Array} [defaultValue] - Optional default value for the property.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     */
    add(name, size, defaultValue) {
        if (this.properties.has(name)) {
            console.warn(`Property "${name}" already exists. Overwriting.`);
        }
        const fbo = new FBO({
            name,
            width: this.width,
            height: this.height,
            renderer: this.renderer,
            camera: this.camera,
            channels: size,
        });
        const property = new Property({
            name,
            size,
            defaultValue: defaultValue,
            fbo: fbo,
        });
        this.fbos.set(name, fbo);
        this.properties.set(name, property);
        return this;
    }
    /**
     * Adds a constraint to a specific property's FBO. When properties are grouped, the FBO is the same for all properties.
     * @param {string} name - The name of the property to constrain.
     * @param {Constraint} constraint - The constraint to add.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     */
    constrain(name, constraint) {
        if (!(constraint instanceof Constraint)) {
            throw new Error("Constraint must be an instance of the Constraint class.");
        }
        const property = this.properties.get(name);
        if (!property) {
            throw new Error(`Property "${name}" does not exist.`);
        }
        property.fbo.constraints.set(constraint.name, constraint);
        property.fbo.needsRebuild = true;
        return this;
    }
    /**
     * Adds a constraint to all properties' FBOs.
     * @param {Constraint} constraint - The constraint to add.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     */
    constrainAll(constraint) {
        if (!(constraint instanceof Constraint)) {
            throw new Error("Constraint must be an instance of the Constraint class.");
        }
        for (const fbo of this.fbos.values()) {
            fbo.constraints.set(constraint.name, constraint);
            fbo.needsRebuild = true;
        }
        return this;
    }
    /**
     * Activates a constraint for a specific property and marks the FBO for rebuild.
     * @param {string} name - The name of the property.
     * @param {string} constraintName - The name of the constraint to activate.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     */
    activateConstraint(name, constraintName) {
        const property = this.properties.get(name);
        if (!property) {
            throw new Error(`Property "${name}" does not exist.`);
        }
        const constraint = property.fbo.constraints.get(constraintName);
        if (!constraint) {
            throw new Error(`Constraint "${constraintName}" does not exist for property "${name}".`);
        }
        if (!constraint.active) {
            constraint.active = true;
            property.fbo.needsRebuild = true;
        }
        return this;
    }
    /**
     * Deactivates a constraint for a specific property and marks the FBO for rebuild.
     * @param {string} name - The name of the property.
     * @param {string} constraintName - The name of the constraint to deactivate.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     */
    deactivateConstraint(name, constraintName) {
        const property = this.properties.get(name);
        if (!property) {
            throw new Error(`Property "${name}" does not exist.`);
        }
        const constraint = property.fbo.constraints.get(constraintName);
        if (!constraint) {
            throw new Error(`Constraint "${constraintName}" does not exist for property "${name}".`);
        }
        if (constraint.active) {
            constraint.active = false;
            property.fbo.needsRebuild = true;
        }
        return this;
    }
    /**
     * Deletes a constraint from a specific property's FBO and marks the FBO for rebuild.
     * @param {string} name - The name of the property.
     * @param {string} constraintName - The name of the constraint to delete.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     */
    deleteConstraint(name, constraintName) {
        const property = this.properties.get(name);
        if (!property) {
            throw new Error(`Property "${name}" does not exist.`);
        }
        const constraint = property.fbo.constraints.get(constraintName);
        if (!constraint) {
            throw new Error(`Constraint "${constraintName}" does not exist for property "${name}".`);
        }
        property.fbo.constraints.delete(constraintName);
        return this;
    }
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
    group(names) {
        if (names.length < 2) {
            throw new Error("Group must contain at least two properties.");
        }
        let fboName = "";
        let channelOffset = 0;
        const properties = [];
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            const property = this.properties.get(name);
            if (!property) {
                throw new Error(`Property "${name}" does not exist.`);
            }
            if (property.fbo.properties.length > 1) {
                throw new Error(`Property "${name}" is already grouped.`);
            }
            if (property.size + channelOffset > 4) {
                throw new Error(`Cannot group property "${name}" with size ${property.size} at offset ${channelOffset}. Total exceeds 4.`);
            }
            property.channelOffset = channelOffset;
            channelOffset += property.size;
            // Delete the exsiting FBO for this property
            this.fbos.get(name)?.dispose();
            this.fbos.delete(name);
            // underscore between names
            fboName += (i > 0 ? "_" : "") + name;
            properties.push(property);
        }
        // Create a new FBO for the group
        const groupFBO = new FBO({
            name: fboName,
            width: this.width,
            height: this.height,
            renderer: this.renderer,
            camera: this.camera,
            properties: properties,
            channels: channelOffset,
        });
        // Add the new FBO to the manager
        this.fbos.set(fboName, groupFBO);
        for (const property of properties) {
            property.fbo = groupFBO;
        }
        return this;
    }
    /**
     * Links two properties' FBOs together, allowing one to read from the other.
     * A uniform in the source FBO will be set to the target FBO's texture.
     * @param {string} source - The name of the source property.
     * @param {string} target - The name of the target property.
     * @param {boolean} [bidirectional=false] - If true, links both properties bidirectionally.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     */
    link(source, target, bidirectional = false) {
        const sourceProperty = this.properties.get(source);
        const targetProperty = this.properties.get(target);
        if (!sourceProperty || !targetProperty) {
            throw new Error(`One or both properties "${source}" and "${target}" do not exist.`);
        }
        const sourceFBO = sourceProperty.fbo;
        const targetFBO = targetProperty.fbo;
        // We can remove the dependencies and directly link the FBO uniforms (if needed in the future)
        sourceFBO.dependencies.add(targetFBO);
        if (bidirectional) {
            targetFBO.dependencies.add(sourceFBO);
        }
        return this;
    }
    /**
     * Links all properties' FBOs together, allowing each to read from all others.
     * This is useful for creating a fully connected graph of FBOs.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     **/
    linkAll() {
        let fboSet = new Set(this.fbos.values());
        for (const fbo of fboSet) {
            fbo.dependencies = new Set(fboSet);
        }
        return this;
    }
    /**
     * Builds all FBOs, applying constraints and preparing them for rendering.
     * This should be called in the end after all properties have been added, grouped, linked, and constrained.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     */
    build() {
        this.fbos.values().forEach((fbo) => {
            fbo.needsRebuild = true;
        });
        return this;
    }
    /**
     * Sets uniforms for a specific property by name.
     * Groups of properties will share the same FBO, so this will set uniforms for all properties in the group.
     * @param {string} name - The name of the property to set uniforms for.
     * @param {Record<string, any>} uniforms - An object containing uniform names and their values.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     */
    setUniforms(name, uniforms) {
        const property = this.properties.get(name);
        if (!property) {
            throw new Error(`Property "${name}" does not exist.`);
        }
        for (const [key, value] of Object.entries(uniforms)) {
            if (property.fbo.material.uniforms[key]) {
                property.fbo.material.uniforms[key].value = value;
            }
            else {
                property.fbo.material.uniforms[key] = { value: value };
            }
        }
        return this;
    }
    /**
     * Sets uniforms for all properties' FBOs.
     * This will apply the same uniforms to all FBOs, which is useful for global settings.
     * @param {Record<string, any>} uniforms - An object containing uniform names and their values.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     * */
    setUniformsAll(uniforms) {
        for (const property of this.properties.values()) {
            for (const [key, value] of Object.entries(uniforms)) {
                if (property.fbo.material.uniforms[key]) {
                    property.fbo.material.uniforms[key].value = value;
                }
                else {
                    property.fbo.material.uniforms[key] = { value: value };
                }
            }
        }
        return this;
    }
    /**
     * Updates the FBOs for specific properties or all properties if no names are provided.
     * This will mark the FBOs as needing an update and rebuild them if necessary.
     * @param {string[]} [names=[]] - An array of property names to update. If empty, updates all properties.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     */
    update(names = []) {
        // TODO: Maybe switch to needUpdate flag for each FBO / Property
        if (names.length === 0) {
            // Update all FBOs if no specific names are provided
            for (const fbos of this.fbos.values()) {
                fbos.needsUpdate = true;
            }
        }
        else {
            for (const name of names) {
                const property = this.properties.get(name);
                if (!property) {
                    console.warn(`Property "${name}" does not exist. Skipping update.`);
                    continue;
                }
                property.fbo.needsUpdate = true;
            }
        }
        this.updateHelper();
        return this;
    }
    updateHelper() {
        this.fbos.forEach((fbo) => {
            if (fbo.needsUpdate) {
                fbo.update();
            }
        });
    }
    /**
     * Injects data into multiple FBOs from an object of Float32Arrays.
     * The keys of the object should match the FBO names (note: different from property names).
     * @param {Record<string, Float32Array>} data - An object containing FBO names as keys and Float32Arrays as values.
     * @param {number} [offset=0] - Optional offset to start injecting data from.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     */
    injectFBOs(data, offset = 0) {
        for (const fboName in data) {
            const fbo = this.fbos.get(fboName);
            if (!fbo) {
                throw new Error(`FBO "${fboName}" does not exist.`);
            }
            fbo.inject(data[fbo.name], offset);
        }
        return this;
    }
    /**
     * Injects data into a specific FBO by name.
     * @param {string} name - The name of the FBO to inject data into (should match the FBO name, not the property name).
     * @param {Float32Array} data - The Float32Array data to inject.
     * @param {number} [offset=0] - Optional offset to start injecting data from.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     */
    injectFBO(name, data, offset = 0) {
        const fbo = this.fbos.get(name);
        if (!fbo) {
            throw new Error(`FBO "${name}" does not exist.`);
        }
        fbo.inject(data, offset);
        return this;
    }
    /**
     * Injects data into a specific property by name.
     * This will inject the data into the FBO associated with the property.
     * @param {string} name - The name of the property to inject data into.
     * @param {Float32Array} data - The Float32Array data to inject.
     * @param {number} [offset=0] - Optional offset to start injecting data from.
     * @return {PropertyManager} Returns the PropertyManager instance for chaining.
     */
    inject(name, data, offset = 0) {
        const property = this.properties.get(name);
        if (!property) {
            throw new Error(`Property "${name}" does not exist.`);
        }
        const fbo = property.fbo;
        fbo.inject(data, offset);
        return this;
    }
    /**
     * Disposes of all resources used by the PropertyManager.
     * This includes disposing of all FBOs, clearing properties, and clearing the scene.
     * @return {this} Returns the PropertyManager instance for chaining.
     * */
    dispose() {
        this.fbos.forEach((fbo) => {
            fbo.dispose();
        });
        this.fbos.clear();
        this.properties.clear();
        this.scene.clear();
        return this;
    }
}

/**
 * @class ParticleSystem
 *
 * ParticleSystem class that manages particles, their rendering, and transitions.
 * This class is responsible for creating particles, updating their state, and drawing them on a canvas.
 *
 */
class ParticleSystem extends EventTarget {
    uuid = crypto.randomUUID();
    // Renderer manager
    canvas;
    scene;
    camera;
    renderer;
    clock = new THREE.Clock();
    controls;
    // Data
    uvs;
    // FBOs
    manager;
    renderTargetVisualizer = null;
    // Plugins
    plugins = [];
    // Particles
    particleGeometry;
    particleMaterial;
    particles;
    particleCount = 0;
    maxParticles;
    // Intersection observer
    intersectionObserver;
    inView = true;
    constructor({ canvas, renderer, camera, scene, backgroundColor = [0, 0, 0, 1], fboHeight = 512, fboWidth = 512, plugins = [], }) {
        super();
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error("Invalid canvas element provided to ParticleSystem");
        }
        if (fboHeight <= 0 || fboWidth <= 0) {
            throw new Error("FBO dimensions must be greater than zero");
        }
        if (backgroundColor.length !== 4 || backgroundColor.some((c) => typeof c !== "number")) {
            throw new Error("Background color must be an array of four numbers [r, g, b, a]");
        }
        if (backgroundColor.some((c) => c < 0 || c > 1)) {
            console.warn("Background color values should be normalized RGB values (0 to 1). Values outside this range may not render correctly.");
        }
        // Constructor manager
        this.canvas = canvas;
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
        this.renderer.setClearColor(new THREE.Color(...backgroundColor.slice(0, 3)), backgroundColor[3]);
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, this.canvas.width / this.canvas.height, 0.1, 1000);
        this.camera.position.set(0, 0, 2);
        this.camera.lookAt(0, 0, 0);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        // FBO Manager
        this.manager = new PropertyManager({
            renderer: this.renderer,
            width: fboWidth,
            height: fboHeight,
        });
        // Max particles based on FBO size
        this.maxParticles = fboWidth * fboHeight;
        // Particles
        this.uvs = new Float32Array(this.maxParticles * 2);
        for (let i = 0; i < this.maxParticles; i++) {
            const x = (i % this.manager.height) / this.manager.width;
            const y = Math.floor(i / this.manager.width) / this.manager.height;
            this.uvs[i * 2 + 0] = x; // u
            this.uvs[i * 2 + 1] = y; // v
        }
        this.particleMaterial = new THREE.ShaderMaterial({
            vertexShader: particleVertex,
            fragmentShader: particleFragment,
            uniforms: {
                uResolution: { value: new THREE.Vector2(this.canvas.width, this.canvas.height) },
            },
            transparent: true,
            depthWrite: false,
        });
        this.particleGeometry = new THREE.BufferGeometry();
        this.particleGeometry.setAttribute("uv", new THREE.BufferAttribute(this.uvs, 2));
        this.particleGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.maxParticles * 3), 3)); // Placeholder for positions (dummy but required)
        this.renderer.compile(this.scene, this.camera);
        // Only render particle count particles
        this.particleGeometry.setDrawRange(0, this.particleCount);
        this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.scene.add(this.particles);
        window.addEventListener("resize", () => {
            this.resize();
        });
        // Intersection observer for canvas visibility
        this.intersectionObserver = new IntersectionObserver(([entry]) => {
            this.inView = entry.isIntersecting;
        }, { threshold: 0.01 });
        this.intersectionObserver.observe(this.canvas);
        // Plugins
        this.plugins = plugins;
        for (const plugin of this.plugins) {
            plugin.onInit && plugin.onInit(this);
        }
        // Build the property manager
        this.manager.build();
    }
    linkProperty(propertyName) {
        const property = this.manager.properties.get(propertyName);
        if (!property) {
            console.warn(`Property "${propertyName}" does not exist in the PropertyManager.`);
            return;
        }
        // Link the property texture to the shader material
        if (this.particleMaterial.uniforms[property.fbo.textureName]) {
            this.particleMaterial.uniforms[property.fbo.textureName].value = property.fbo.read.texture;
        }
        else {
            this.particleMaterial.uniforms[property.fbo.textureName] = { value: property.fbo.read.texture };
        }
    }
    resize() {
        this.canvas.style.width = "100%";
        this.canvas.style.height = "100%";
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.renderer.setSize(this.canvas.width, this.canvas.height);
        this.camera.aspect = this.canvas.width / this.canvas.height;
        this.camera.updateProjectionMatrix();
        this.manager.setUniformsAll({
            u_Resolution: new THREE.Vector2(this.canvas.width, this.canvas.height),
        });
        this.particleMaterial.uniforms.uResolution.value.set(this.canvas.width, this.canvas.height);
    }
    addParticles(frame) {
        if (this.particleCount + frame.count > this.maxParticles) {
            console.warn("Max particle count will be reached, cannot add more particles");
            return;
        }
        frame.build(this.manager);
        this.manager.injectFBOs(frame.data, this.particleCount);
        this.particleCount += frame.count;
        this.particleGeometry.setDrawRange(0, this.particleCount);
        frame.dispose();
    }
    update() {
        // Check if the canvas is in view
        if (!this.inView)
            return;
        // Update logic
        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();
        // Raycaster
        this.manager.setUniformsAll({
            u_time: time,
            u_delta: delta,
        });
        // Update plugins
        for (const plugin of this.plugins) {
            plugin.onUpdate && plugin.onUpdate(this);
        }
        this.manager.update();
        // Render the scene
        this.renderer.render(this.scene, this.camera);
        this.controls.update();
    }
    dispose() {
        // Clean up resources
        this.stop();
        this.renderer.dispose();
        this.particleGeometry.dispose();
        this.particleMaterial.dispose();
        this.manager.dispose();
        // Remove event listeners
        window.removeEventListener("resize", () => { });
        // Dispose of plugins
        for (const plugin of this.plugins) {
            plugin.onDispose && plugin.onDispose(this);
        }
    }
    start() {
        // Start the animation loop
        const animate = () => {
            this.update();
        };
        this.renderer.setAnimationLoop(animate);
    }
    stop() {
        // Stop the animation loop
        this.renderer.setAnimationLoop(null);
    }
}

console.log("Hello from particlize");

export { ParticleSystem };
