/**
 * Corrección de las PBQ de terminal.
 *
 * Módulo PURO. Se ejecuta el transcript del usuario contra el estado simulado y
 * se comprueba qué objetivos del enunciado quedaron satisfechos. Un objetivo se
 * cumple si ALGUNA de las líneas ejecutadas lo satisface: da igual el orden ni
 * los intentos fallidos.
 */

import type {
  CommandMatcher,
  HostState,
  TerminalObjectiveResult,
  TerminalPbq,
  TranscriptEntry,
} from '@/domain/pbq';
import { isPassed, scorePercent } from './scoring';
import { executeCommand } from './shell/commands';
import { hasFlag, parseCommand } from './shell/parse';

export interface TerminalEvaluation {
  objectiveResults: TerminalObjectiveResult[];
  metCount: number;
  total: number;
  scorePercent: number;
  passed: boolean;
  /** Objetivos que quedaron sin cumplir, para la explicación. */
  missing: TerminalObjectiveResult[];
}

/** Ejecuta una lista de líneas contra el estado simulado. */
export function runTranscript(
  lines: readonly string[],
  state: HostState,
): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];

  for (const line of lines) {
    const result = executeCommand(line, state);
    if (result === null) continue;
    entries.push({ line: line.trim(), output: result.lines, exitCode: result.exitCode });
  }

  return entries;
}

export function matchesObjective(entry: TranscriptEntry, matcher: CommandMatcher): boolean {
  const invocation = parseCommand(entry.line);
  if (invocation === null) return false;
  if (invocation.program !== matcher.program.toLowerCase()) return false;

  for (const flag of matcher.flags ?? []) {
    if (!hasFlag(invocation, flag)) return false;
  }

  const joinedArgs = invocation.args.join(' ');
  for (const arg of matcher.args ?? []) {
    if (!joinedArgs.includes(arg)) return false;
  }

  if (matcher.outputContains !== undefined) {
    const output = entry.output.join('\n');
    if (!output.includes(matcher.outputContains)) return false;
  }

  return true;
}

export function evaluateTerminal(
  pbq: TerminalPbq,
  transcript: readonly TranscriptEntry[],
): TerminalEvaluation {
  const objectiveResults: TerminalObjectiveResult[] = pbq.tasks.map((objective) => ({
    objectiveId: objective.id,
    description: objective.description,
    met: transcript.some((entry) => matchesObjective(entry, objective.matcher)),
  }));

  const metCount = objectiveResults.filter((result) => result.met).length;
  const total = objectiveResults.length;
  const score = scorePercent(metCount, total);

  return {
    objectiveResults,
    metCount,
    total,
    scorePercent: score,
    passed: isPassed(score),
    missing: objectiveResults.filter((result) => !result.met),
  };
}

/** Ejecuta y corrige en un solo paso: es lo que hará el servicio. */
export function runAndEvaluateTerminal(
  pbq: TerminalPbq,
  lines: readonly string[],
): { transcript: TranscriptEntry[]; evaluation: TerminalEvaluation } {
  const transcript = runTranscript(lines, pbq.state);
  return { transcript, evaluation: evaluateTerminal(pbq, transcript) };
}
