import { describe, expect, it } from 'vitest';
import {
  INITIAL_LINE_EDITOR,
  lastCommand,
  reduceInput,
  type LineEditorState,
} from '@/features/pbq/engine/shell/lineEditor';

/** Escribe una cadena carácter a carácter, como haría el terminal. */
function type(state: LineEditorState, text: string): LineEditorState {
  let current = state;
  for (const char of text) {
    current = reduceInput(current, char).state;
  }
  return current;
}

describe('reduceInput', () => {
  it('acumula los caracteres imprimibles', () => {
    expect(type(INITIAL_LINE_EDITOR, 'nmap').buffer).toBe('nmap');
  });

  it('conserva los espacios', () => {
    expect(type(INITIAL_LINE_EDITOR, 'nmap -sV 10.0.0.5').buffer).toBe('nmap -sV 10.0.0.5');
  });

  it('borra con retroceso', () => {
    const typed = type(INITIAL_LINE_EDITOR, 'nmaX');
    const fixed = reduceInput(typed, '\u007f').state;
    expect(fixed.buffer).toBe('nma');
  });

  it('el retroceso sobre una línea vacía no falla', () => {
    expect(reduceInput(INITIAL_LINE_EDITOR, '\u007f').state.buffer).toBe('');
  });

  it('envía la línea con Enter y la guarda en el historial', () => {
    const typed = type(INITIAL_LINE_EDITOR, 'ss -tulnp');
    const result = reduceInput(typed, '\r');

    expect(result.submitted).toBe('ss -tulnp');
    expect(result.state.buffer).toBe('');
    expect(result.state.history[0]).toBe('ss -tulnp');
    expect(lastCommand(result.state)).toBe('ss -tulnp');
  });

  it('no envía líneas vacías ni solo con espacios', () => {
    expect(reduceInput(INITIAL_LINE_EDITOR, '\r').submitted).toBeUndefined();
    expect(reduceInput(type(INITIAL_LINE_EDITOR, '   '), '\r').submitted).toBeUndefined();
  });

  it('acepta el salto de línea como Enter', () => {
    expect(reduceInput(type(INITIAL_LINE_EDITOR, 'help'), '\n').submitted).toBe('help');
  });

  it('ignora las secuencias de control (flechas, atajos)', () => {
    const typed = type(INITIAL_LINE_EDITOR, 'nmap');
    const afterArrow = reduceInput(typed, '\u001b[A').state;

    expect(afterArrow.buffer).toBe('nmap');
    expect(afterArrow.buffer).not.toContain('\u001b');
  });

  it('acumula el historial del más reciente al más antiguo', () => {
    let state = INITIAL_LINE_EDITOR;
    for (const line of ['help', 'ip a', 'ss -tlp']) {
      state = reduceInput(type(state, line), '\r').state;
    }

    expect(state.history).toEqual(['ss -tlp', 'ip a', 'help']);
  });

  it('limita el historial para no crecer sin fin', () => {
    let state = INITIAL_LINE_EDITOR;
    for (let index = 0; index < 80; index += 1) {
      state = reduceInput(type(state, `comando-${index}`), '\r').state;
    }

    expect(state.history).toHaveLength(50);
    expect(state.history[0]).toBe('comando-79');
  });

  it('no muta el estado anterior', () => {
    const before = type(INITIAL_LINE_EDITOR, 'nmap');
    const snapshot = structuredClone(before);

    reduceInput(before, 'X');

    expect(before).toEqual(snapshot);
  });
});
