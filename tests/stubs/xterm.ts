/**
 * Stub de xterm para tests.
 *
 * xterm llama a `canvas.getContext` al importarse, que jsdom no implementa, y
 * cuelga la recolección de tests. Se sustituye por un doble mínimo que registra
 * lo escrito: así la lógica del terminal (que vive en `lineEditor` y
 * `commands`, ambos puros) se sigue ejercitando a través del componente.
 */

export interface StubTerminalOptions {
  theme?: unknown;
  [key: string]: unknown;
}

export class Terminal {
  options: StubTerminalOptions;
  written: string[] = [];
  cleared = false;
  disposed = false;
  private listeners: Array<(data: string) => void> = [];

  constructor(options: StubTerminalOptions = {}) {
    this.options = options;
  }

  loadAddon(): void {
    // Los addons no aportan nada en el doble.
  }

  open(): void {
    // No hay DOM real que abrir.
  }

  write(data: string): void {
    this.written.push(data);
  }

  writeln(data: string): void {
    this.written.push(`${data}\n`);
  }

  clear(): void {
    this.cleared = true;
  }

  dispose(): void {
    this.disposed = true;
    this.listeners = [];
  }

  onData(listener: (data: string) => void): { dispose: () => void } {
    this.listeners.push(listener);
    return {
      dispose: () => {
        this.listeners = this.listeners.filter((candidate) => candidate !== listener);
      },
    };
  }

  /** Simula una pulsación, como haría el usuario. */
  emit(data: string): void {
    for (const listener of this.listeners) listener(data);
  }

  get text(): string {
    return this.written.join('');
  }
}
