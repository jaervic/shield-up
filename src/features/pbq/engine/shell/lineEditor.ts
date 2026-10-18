/**
 * Editor de línea de la terminal simulada.
 *
 * Módulo PURO: recibe las pulsaciones como texto y devuelve el estado de la
 * línea. Al estar separado de xterm, se puede testear sin navegador.
 */

export interface LineEditorState {
  /** Lo que hay escrito ahora mismo. */
  buffer: string;
  /** Comandos ya enviados, del más reciente al más antiguo. */
  history: string[];
}

export const INITIAL_LINE_EDITOR: LineEditorState = { buffer: '', history: [] };

export interface InputResult {
  state: LineEditorState;
  /** Línea enviada con Enter, si la hubo. */
  submitted?: string;
}

const BACKSPACE = '\u007f';
const BACKSPACE_ALT = '\b';
const ENTER = '\r';
const ENTER_ALT = '\n';
const MAX_HISTORY = 50;

/**
 * Aplica una pulsación.
 *
 * Solo se interpretan caracteres imprimibles, borrado y Enter: el resto
 * (flechas, atajos) se ignora, porque el simulador no tiene cursor ni edición
 * a mitad de línea.
 */
export function reduceInput(state: LineEditorState, input: string): InputResult {
  if (input === ENTER || input === ENTER_ALT) {
    const line = state.buffer;
    if (line.trim().length === 0) {
      return { state: { ...state, buffer: '' } };
    }
    return {
      state: {
        buffer: '',
        history: [line, ...state.history].slice(0, MAX_HISTORY),
      },
      submitted: line,
    };
  }

  if (input === BACKSPACE || input === BACKSPACE_ALT) {
    return { state: { ...state, buffer: state.buffer.slice(0, -1) } };
  }

  // Se descartan las secuencias de control (flechas, Ctrl+C, etc.) comparando
  // el código del primer carácter, sin expresiones regulares.
  const code = input.codePointAt(0) ?? 0;
  if (input.length === 0 || code < 0x20) {
    return { state };
  }

  return { state: { ...state, buffer: state.buffer + input } };
}

/** Último comando enviado, para el historial. */
export function lastCommand(state: LineEditorState): string | null {
  return state.history[0] ?? null;
}
