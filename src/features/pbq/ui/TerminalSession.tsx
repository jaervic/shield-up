import { useEffect, useRef } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal, type ITheme } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import type { TerminalPbq, TranscriptEntry } from '@/domain/pbq';
import { useThemeStore } from '@/app/theme/themeStore';
import { executeCommand } from '../engine/shell/commands';
import { INITIAL_LINE_EDITOR, reduceInput, type LineEditorState } from '../engine/shell/lineEditor';
import styles from './TerminalSession.module.css';

const MONO_STACK =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

/**
 * Lee los colores del tema desde las variables CSS.
 *
 * xterm necesita valores concretos (no admite `var()`), así que se leen del DOM
 * en lugar de duplicarlos aquí: `tokens.css` sigue siendo la única fuente.
 */
function readTerminalTheme(): ITheme {
  const computed = getComputedStyle(document.documentElement);
  const read = (name: string) => computed.getPropertyValue(name).trim();

  return {
    background: read('--color-bg'),
    foreground: read('--color-text'),
    cursor: read('--color-primary'),
    cursorAccent: read('--color-bg'),
    selectionBackground: read('--color-primary-soft'),
  };
}

export interface TerminalSessionProps {
  pbq: TerminalPbq;
  disabled?: boolean;
  onTranscriptChange: (transcript: TranscriptEntry[]) => void;
}

/**
 * Terminal simulada sobre xterm.js.
 *
 * El terminal es solo la capa de presentación: quién decide qué pasa al pulsar
 * una tecla es `reduceInput`, y quién produce la salida es `executeCommand`.
 * Ambos son puros y se testean sin navegador.
 */
export function TerminalSession({
  pbq,
  disabled = false,
  onTranscriptChange,
}: TerminalSessionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const editorRef = useRef<LineEditorState>(INITIAL_LINE_EDITOR);
  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const disabledRef = useRef(disabled);
  const changeRef = useRef(onTranscriptChange);

  const themeMode = useThemeStore((state) => state.mode);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    changeRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 13,
      fontFamily: MONO_STACK,
      scrollback: 500,
      theme: readTerminalTheme(),
    });

    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(container);
    fit.fit();
    terminalRef.current = terminal;

    const prompt = () => `\x1b[1;32m${pbq.state.hostname}\x1b[0m:\x1b[1;34m~\x1b[0m$ `;

    terminal.writeln(`Simulación: ${pbq.title}`);
    terminal.writeln('Escribe `help` para ver los comandos disponibles.');
    terminal.writeln('');
    terminal.write(prompt());

    const subscription = terminal.onData((data) => {
      if (disabledRef.current) return;

      const result = reduceInput(editorRef.current, data);
      editorRef.current = result.state;

      if (result.submitted !== undefined) {
        const commandResult = executeCommand(result.submitted, pbq.state);
        terminal.write('\r\n');

        if (commandResult !== null) {
          if (commandResult.clear === true) {
            terminal.clear();
          } else {
            for (const line of commandResult.lines) terminal.writeln(line);
          }

          transcriptRef.current = [
            ...transcriptRef.current,
            {
              line: result.submitted.trim(),
              output: commandResult.lines,
              exitCode: commandResult.exitCode,
            },
          ];
          changeRef.current(transcriptRef.current);
        }

        terminal.write(prompt());
        return;
      }

      if (data === '\u007f' || data === '\b') {
        terminal.write('\b \b');
        return;
      }

      terminal.write(data);
    });

    const observer = new ResizeObserver(() => fit.fit());
    observer.observe(container);

    return () => {
      subscription.dispose();
      observer.disconnect();
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [pbq]);

  // El tema del terminal sigue al de la app.
  useEffect(() => {
    const terminal = terminalRef.current;
    if (terminal !== null) terminal.options.theme = readTerminalTheme();
  }, [themeMode]);

  return (
    <div className={styles.wrapper}>
      <div
        ref={containerRef}
        className={styles.screen}
        role="application"
        aria-label={`Terminal de ${pbq.state.hostname}`}
      />
      <p className={styles.hint}>
        Los comandos se ejecutan en un host simulado: no hay sistema real detrás.
      </p>
    </div>
  );
}
