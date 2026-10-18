import type {
  CommandMatcher,
  HostState,
  Pbq,
  TerminalPbq,
  TopologyPbq,
} from '@/domain/pbq';

export function makeTopologyPbq(overrides: Partial<TopologyPbq> = {}): TopologyPbq {
  return {
    kind: 'topology',
    id: overrides.id ?? 'pbq-test',
    domain: overrides.domain ?? 3,
    blueprintObjectives: overrides.blueprintObjectives ?? ['3.2'],
    title: overrides.title ?? 'PBQ de prueba',
    summary: overrides.summary ?? 'Resumen de la PBQ de prueba.',
    instructions: overrides.instructions ?? 'Coloca cada activo en su zona.',
    estimatedMinutes: overrides.estimatedMinutes ?? 5,
    difficulty: overrides.difficulty ?? 'medium',
    tags: overrides.tags ?? [],
    explanation: overrides.explanation ?? 'Explicación de la corrección de la PBQ de prueba.',
    zones: overrides.zones ?? [
      { id: 'dmz', label: 'DMZ' },
      { id: 'interna', label: 'Red interna' },
    ],
    nodes: overrides.nodes ?? [{ id: 'web', label: 'Servidor web', correctZoneId: 'dmz' }],
  };
}

export function makeHostState(overrides: Partial<HostState> = {}): HostState {
  return {
    hostname: overrides.hostname ?? 'lab-wks',
    interfaces: overrides.interfaces ?? [
      { name: 'eth0', ip: '10.0.0.9/24', mac: '52:54:00:00:00:09', state: 'UP' },
    ],
    routes: overrides.routes ?? [
      { destination: '10.0.0.0/24', gateway: '0.0.0.0', iface: 'eth0' },
    ],
    arp: overrides.arp ?? [{ ip: '10.0.0.1', mac: '52:54:00:00:00:01' }],
    listening: overrides.listening ?? [
      { port: 22, protocol: 'tcp', process: 'sshd', pid: 812, address: '0.0.0.0' },
    ],
    processes: overrides.processes ?? [
      { pid: 812, user: 'root', command: '/usr/sbin/sshd -D' },
    ],
    dns: overrides.dns ?? { 'web.corp.local': '10.0.0.20' },
    hosts: overrides.hosts ?? [
      {
        ip: '10.0.0.20',
        hostname: 'web.corp.local',
        up: true,
        ports: [{ port: 443, protocol: 'tcp', service: 'ssl/https', version: 'nginx 1.24.0' }],
      },
    ],
    packets: overrides.packets ?? [],
    files: overrides.files ?? { '/etc/hosts': '127.0.0.1 localhost' },
  };
}

export function makeTerminalPbq(overrides: Partial<TerminalPbq> = {}): TerminalPbq {
  return {
    kind: 'terminal',
    id: overrides.id ?? 'pbq-terminal-test',
    domain: overrides.domain ?? 4,
    blueprintObjectives: overrides.blueprintObjectives ?? ['4.4'],
    title: overrides.title ?? 'PBQ de terminal de prueba',
    summary: overrides.summary ?? 'Resumen de la PBQ de terminal de prueba.',
    instructions: overrides.instructions ?? 'Consigue los objetivos usando la terminal.',
    estimatedMinutes: overrides.estimatedMinutes ?? 5,
    difficulty: overrides.difficulty ?? 'medium',
    tags: overrides.tags ?? [],
    explanation: overrides.explanation ?? 'Explicación de la corrección de la PBQ de terminal.',
    state: overrides.state ?? makeHostState(),
    tasks: overrides.tasks ?? [
      {
        id: 't1',
        description: 'Comprueba si el host responde.',
        matcher: { program: 'ping', args: ['10.0.0.20'] },
      },
    ],
  };
}

/**
 * Construye una línea de comando que satisface un matcher.
 * Se usa para demostrar que cada PBQ del contenido es resoluble.
 */
export function commandFor(matcher: CommandMatcher): string {
  const flags = (matcher.flags ?? []).map((flag) => `-${flag}`).join(' ');
  const args = (matcher.args ?? []).join(' ');
  return [matcher.program, flags, args].filter((part) => part.length > 0).join(' ');
}

export function isTopology(pbq: Pbq): pbq is TopologyPbq {
  return pbq.kind === 'topology';
}

export function isTerminal(pbq: Pbq): pbq is TerminalPbq {
  return pbq.kind === 'terminal';
}
