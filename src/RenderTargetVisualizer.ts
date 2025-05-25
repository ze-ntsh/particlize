import * as THREE from "three";

export class RenderTargetVisualizer {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  labelCanvas: OffscreenCanvas;
  labelTexture: THREE.Texture;

  constructor(renderer: THREE.WebGLRenderer) {
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
  update(fbos: Map<string, any>) {
    this.scene.clear();
    this.scene = new THREE.Scene();

    const entries = Array.from(fbos.entries());
    const count = entries.length;

    if (count === 0) return;

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
  makeLabelSprite(text: string): THREE.Sprite {
    const canvas = new OffscreenCanvas(256, 64);
    const ctx = canvas.getContext("2d")!;
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
