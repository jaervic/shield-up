import { describe, expect, it } from 'vitest';
import { loadPbq } from '@/data/content/loadPbq';
import { evaluateTopology } from '@/features/pbq/engine/topology';
import {
  evaluateTerminal,
  matchesObjective,
  runAndEvaluateTerminal,
  runTranscript,
} from '@/features/pbq/engine/terminal';
import { executeCommand } from '@/features/pbq/engine/shell/commands';
import {
  commandFor,
  isTerminal,
  isTopology,
  makeHostState,
  makeTerminalPbq,
} from '../../helpers/pbq';

const PBQ = makeTerminalPbq({
  tasks: [
    {
      id: 'escuchas',
      description: 'Lista los puertos en escucha con su proceso.',
      matcher: { program: 'ss', flags: ['l', 'p'] },
    },
    {
      id: 'captura',
      description: 'Captura el tráfico del puerto 443.',
      matcher: { program: 'tcpdump', args: ['443'] },
    },
    {
      id: 'log',
      description: 'Busca los accesos fallidos.',
      matcher: { program: 'grep', args: ['Failed', '/var/log/auth.log'], outputContains: 'Failed password' },
    },
  ],
  state: makeHostState({
    packets: [
      {
        time: 0.5,
        src: '10.0.0.9',
        dst: '10.0.0.20',
        protocol: 'TCP',
        srcPort: 51000,
        dstPort: 443,
        flags: 'S',
        length: 0,
      },
    ],
    files: { '/var/log/auth.log': 'Failed password for root\nAccepted password for analista' },
  }),
});

describe('runTranscript', () => {
  it('ejecuta cada línea y guarda su salida', () => {
    const transcript = runTranscript(['ss -tlp', 'comando-inventado'], PBQ.state);

    expect(transcript).toHaveLength(2);
    expect(transcript[0]?.line).toBe('ss -tlp');
    expect(transcript[0]?.output.join('\n')).toContain(':22');
    expect(transcript[1]?.exitCode).toBe(127);
  });

  it('ignora las líneas vacías', () => {
    expect(runTranscript(['', '   ', 'help'], PBQ.state)).toHaveLength(1);
  });
});

describe('matchesObjective', () => {
  const entry = (line: string) => runTranscript([line], PBQ.state)[0]!;

  it('exige el programa correcto', () => {
    expect(matchesObjective(entry('nmap 10.0.0.20'), { program: 'ss' })).toBe(false);
  });

  it('comprueba las banderas, incluidas las combinadas', () => {
    expect(matchesObjective(entry('ss -tlp'), { program: 'ss', flags: ['l', 'p'] })).toBe(true);
    expect(matchesObjective(entry('ss -tl'), { program: 'ss', flags: ['l', 'p'] })).toBe(false);
  });

  it('comprueba los argumentos por inclusión', () => {
    expect(matchesObjective(entry('nmap -p 8080 10.0.0.20'), { program: 'nmap', args: ['10.0.0.20'] })).toBe(true);
    expect(matchesObjective(entry('nmap 10.0.0.21'), { program: 'nmap', args: ['10.0.0.20'] })).toBe(false);
  });

  it('puede exigir contenido en la salida', () => {
    const matcher = { program: 'grep', args: ['Failed'], outputContains: 'Failed password' };
    expect(matchesObjective(entry('grep Failed /var/log/auth.log'), matcher)).toBe(true);
    expect(
      matchesObjective(entry('grep Accepted /var/log/auth.log'), matcher),
    ).toBe(false);
  });
});

describe('evaluateTerminal', () => {
  it('sin comandos, ningún objetivo cumplido', () => {
    const evaluation = evaluateTerminal(PBQ, []);

    expect(evaluation.metCount).toBe(0);
    expect(evaluation.scorePercent).toBe(0);
    expect(evaluation.passed).toBe(false);
    expect(evaluation.missing).toHaveLength(3);
  });

  it('con los tres comandos correctos, supera con el 100%', () => {
    const { evaluation } = runAndEvaluateTerminal(PBQ, [
      'ss -tulnp',
      'tcpdump -n port 443',
      'grep Failed /var/log/auth.log',
    ]);

    expect(evaluation.metCount).toBe(3);
    expect(evaluation.scorePercent).toBe(100);
    expect(evaluation.passed).toBe(true);
    expect(evaluation.missing).toHaveLength(0);
  });

  it('el orden y los intentos fallidos no importan', () => {
    const { evaluation } = runAndEvaluateTerminal(PBQ, [
      'ls',
      'nmap 1.2.3.4',
      'grep Failed /var/log/auth.log',
      'tcpdump port 443',
      'ss -tlp',
    ]);

    expect(evaluation.metCount).toBe(3);
    expect(evaluation.passed).toBe(true);
  });

  it('con 2 de 3 (66%) no supera el umbral', () => {
    const { evaluation } = runAndEvaluateTerminal(PBQ, [
      'ss -tulnp',
      'tcpdump port 443',
    ]);

    expect(evaluation.scorePercent).toBe(67);
    expect(evaluation.passed).toBe(false);
    expect(evaluation.missing.map((result) => result.objectiveId)).toEqual(['log']);
  });

  it('devuelve el detalle de cada objetivo', () => {
    const { evaluation } = runAndEvaluateTerminal(PBQ, ['ss -tulnp']);

    expect(evaluation.objectiveResults).toHaveLength(3);
    expect(evaluation.objectiveResults[0]).toMatchObject({ objectiveId: 'escuchas', met: true });
    expect(evaluation.objectiveResults[0]?.description.length).toBeGreaterThan(10);
  });
});

describe('banco de PBQ del contenido', () => {
  const bank = loadPbq();

  it('carga sin errores de validación', () => {
    expect(bank.length).toBeGreaterThanOrEqual(5);
  });

  it('incluye las dos familias', () => {
    expect(bank.some(isTopology)).toBe(true);
    expect(bank.some(isTerminal)).toBe(true);
  });

  it('cada PBQ declara dominio, objetivos y explicación útiles', () => {
    for (const pbq of bank) {
      expect(pbq.blueprintObjectives.length).toBeGreaterThanOrEqual(1);
      expect(pbq.explanation.length).toBeGreaterThan(40);
      expect(pbq.instructions.length).toBeGreaterThan(20);
      expect(pbq.estimatedMinutes).toBeLessThanOrEqual(30);
    }
  });

  it('todas las PBQ de topología son resolubles al 100%', () => {
    for (const pbq of bank.filter(isTopology)) {
      const placement = Object.fromEntries(
        pbq.nodes.map((node) => [node.id, node.correctZoneId]),
      );
      const evaluation = evaluateTopology(pbq, placement);

      expect(evaluation.scorePercent, `${pbq.id} debería poder resolverse`).toBe(100);
    }
  });

  it('todas las PBQ de terminal son resolubles al 100%', () => {
    for (const pbq of bank.filter(isTerminal)) {
      const commands = pbq.tasks.map((task) => commandFor(task.matcher));
      const { evaluation } = runAndEvaluateTerminal(pbq, commands);

      expect(
        evaluation.metCount,
        `${pbq.id} deja sin cumplir: ${evaluation.missing.map((result) => result.objectiveId).join(', ')}`,
      ).toBe(pbq.tasks.length);
    }
  });

  it('los comandos de la solución existen en el registro', () => {
    for (const pbq of bank.filter(isTerminal)) {
      for (const task of pbq.tasks) {
        expect(executeCommand(commandFor(task.matcher), pbq.state)).not.toBeNull();
      }
    }
  });
});
