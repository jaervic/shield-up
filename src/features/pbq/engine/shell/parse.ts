/**
 * Parser de líneas de comando.
 *
 * Módulo PURO y determinista: nada de `eval`, nada de shell real. Se tokeniza
 * respetando comillas simples y dobles, y se separan banderas de argumentos.
 */

export interface CommandInvocation {
  /** Línea original, ya recortada. */
  raw: string;
  /** Programa en minúsculas. */
  program: string;
  /** Todos los tokens tras el programa, sin tocar. */
  tokens: string[];
  /** Banderas sin guiones: `-sV` → `sV`, `--top-ports=100` → `top-ports=100`. */
  flags: string[];
  /** Tokens que no son banderas. */
  args: string[];
}

export function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (const char of line.trim()) {
    if (quote !== null) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) tokens.push(current);
  return tokens;
}

export function parseCommand(line: string): CommandInvocation | null {
  const tokens = tokenize(line);
  const [program, ...rest] = tokens;
  if (program === undefined || program.length === 0) return null;

  const flags: string[] = [];
  const args: string[] = [];

  for (const token of rest) {
    if (token.startsWith('--') && token.length > 2) {
      flags.push(token.slice(2));
    } else if (token.startsWith('-') && token.length > 1) {
      flags.push(token.slice(1));
    } else {
      args.push(token);
    }
  }

  return { raw: line.trim(), program: program.toLowerCase(), tokens: rest, flags, args };
}

/**
 * ¿Está presente la bandera?
 *
 * Las banderas de una letra se comprueban por inclusión, porque en la práctica
 * se combinan (`-tulnp` es una sola palabra que activa `t`, `u`, `l`, `n` y
 * `p`). Las de varias letras exigen coincidencia exacta (`-sV` ≠ `-sv`).
 *
 * La heurística puede dar un falso positivo (buscar `s` encuentra `-sS`), pero
 * para el vocabulario de esta simulación no hay ambigüedad real.
 */
export function hasFlag(invocation: CommandInvocation, flag: string): boolean {
  if (flag.length === 1) {
    return invocation.flags.some((entry) => entry.includes(flag));
  }
  return invocation.flags.includes(flag);
}

/** Valor de una bandera con argumento: `-p 80` o `--port=80`. */
export function getFlagValue(invocation: CommandInvocation, flag: string): string | null {
  const tokens = invocation.tokens;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined) continue;

    if (token === `-${flag}` || token === `--${flag}`) {
      return tokens[index + 1] ?? null;
    }
    if (token.startsWith(`--${flag}=`)) {
      return token.slice(flag.length + 3);
    }
    if (token.startsWith(`-${flag}=`)) {
      return token.slice(flag.length + 2);
    }
  }

  return null;
}

/**
 * Argumentos que no son banderas ni valores de bandera.
 *
 * `valueFlags` indica qué banderas consumen el token siguiente (`-p 80`), de
 * modo que `80` no se confunda con el objetivo del comando.
 */
export function positionalArgs(
  invocation: CommandInvocation,
  valueFlags: readonly string[] = [],
): string[] {
  const result: string[] = [];
  const tokens = invocation.tokens;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined) continue;

    if (token.startsWith('-')) {
      const name = token.replace(/^--?/, '');
      const consumesNext =
        !name.includes('=') &&
        valueFlags.some((valueFlag) => name === valueFlag || name.startsWith(valueFlag));
      if (consumesNext) index += 1;
      continue;
    }

    result.push(token);
  }

  return result;
}

/** Último argumento posicional: el objetivo en la mayoría de comandos. */
export function lastPositional(
  invocation: CommandInvocation,
  valueFlags: readonly string[] = [],
): string | null {
  const args = positionalArgs(invocation, valueFlags);
  return args[args.length - 1] ?? null;
}

/** Rango de puertos: `22`, `22,80`, `1-1024`. Devuelve null si no es válido. */
export function parsePortSpec(spec: string | null): number[] | null {
  if (spec === null || spec.trim().length === 0) return null;

  const ports = new Set<number>();

  for (const part of spec.split(',')) {
    const trimmed = part.trim();

    const range = /^(\d+)-(\d+)$/.exec(trimmed);
    if (range?.[1] !== undefined && range[2] !== undefined) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      for (let port = start; port <= end && port - start < 1000; port += 1) {
        ports.add(port);
      }
      continue;
    }

    const single = Number(trimmed);
    if (Number.isInteger(single) && single > 0 && single <= 65_535) ports.add(single);
  }

  return ports.size > 0 ? [...ports].sort((a, b) => a - b) : null;
}
