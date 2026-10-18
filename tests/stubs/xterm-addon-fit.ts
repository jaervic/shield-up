/** Stub de `@xterm/addon-fit` para tests (no hay geometría real que ajustar). */

export class FitAddon {
  fit(): void {
    // Sin efecto: el doble de xterm no tiene dimensiones.
  }

  dispose(): void {
    // Sin recursos que liberar.
  }
}
