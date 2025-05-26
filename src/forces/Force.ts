abstract class Force {
  abstract getGLSL(): string;
  abstract getUniforms(): Record<string, any>;
}
