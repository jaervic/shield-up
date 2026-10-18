/**
 * Comandos del host simulado.
 *
 * Cada comando es una función PURA `(invocación, estado) => salida`. No hay
 * shell real ni efectos: el mismo comando sobre el mismo estado devuelve
 * siempre lo mismo, lo que hace las PBQ reproducibles y testeables.
 */

import type { HostState, RemoteHost, SimulatedPacket } from '@/domain/pbq';
import {
  getFlagValue,
  hasFlag,
  lastPositional,
  parseCommand,
  parsePortSpec,
  positionalArgs,
  type CommandInvocation,
} from './parse';

export interface CommandResult {
  lines: string[];
  exitCode: number;
  /** El comando pide limpiar la pantalla. */
  clear?: boolean;
}

export interface CommandContext {
  invocation: CommandInvocation;
  state: HostState;
}

type CommandHandler = (context: CommandContext) => CommandResult;

/* --------------------------------- Ayudas --------------------------------- */

/** Hora base de la captura simulada: 14:32:00. */
const CAPTURE_BASE_SECONDS = 14 * 3600 + 32 * 60;

function pad(value: number, size = 2): string {
  return String(value).padStart(size, '0');
}

function formatCaptureTime(offsetSeconds: number): string {
  const total = CAPTURE_BASE_SECONDS + offsetSeconds;
  const hours = Math.floor(total / 3600) % 24;
  const minutes = Math.floor(total / 60) % 60;
  const seconds = Math.floor(total % 60);
  const micros = Math.round((total % 1) * 1_000_000);

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(micros, 6)}`;
}

function failure(message: string): CommandResult {
  return { lines: [message], exitCode: 1 };
}

/** Resuelve un objetivo por IP, nombre o red (CIDR). */
function resolveHosts(target: string, state: HostState): RemoteHost[] {
  const resolved = state.dns[target] ?? target;

  if (resolved.includes('/')) {
    const prefix = resolved.split('/')[0]?.split('.').slice(0, 3).join('.') ?? '';
    return state.hosts.filter((host) => host.ip.startsWith(`${prefix}.`));
  }

  const host = state.hosts.find(
    (candidate) => candidate.ip === resolved || candidate.hostname === resolved,
  );
  return host ? [host] : [];
}

function parsePacketFilter(args: readonly string[]): (packet: SimulatedPacket) => boolean {
  const filters: Array<(packet: SimulatedPacket) => boolean> = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index]?.toLowerCase();
    const value = args[index + 1];

    if (token === 'port' && value !== undefined) {
      const port = Number(value);
      filters.push((packet) => packet.srcPort === port || packet.dstPort === port);
      index += 1;
      continue;
    }
    if (token === 'host' && value !== undefined) {
      filters.push((packet) => packet.src === value || packet.dst === value);
      index += 1;
      continue;
    }
    if (token === 'tcp') filters.push((packet) => packet.protocol === 'TCP');
    if (token === 'udp') filters.push((packet) => packet.protocol === 'UDP');
    if (token === 'icmp') filters.push((packet) => packet.protocol === 'ICMP');
  }

  return (packet) => filters.every((filter) => filter(packet));
}

function formatPacket(packet: SimulatedPacket): string {
  const time = formatCaptureTime(packet.time);

  if (packet.protocol === 'ICMP') {
    return `${time} IP ${packet.src} > ${packet.dst}: ICMP echo request, length ${packet.length}`;
  }

  const src = packet.srcPort === undefined ? packet.src : `${packet.src}.${packet.srcPort}`;
  const dst = packet.dstPort === undefined ? packet.dst : `${packet.dst}.${packet.dstPort}`;

  if (packet.protocol === 'UDP') {
    return `${time} IP ${src} > ${dst}: UDP, length ${packet.length}`;
  }

  return `${time} IP ${src} > ${dst}: Flags [${packet.flags ?? 'S'}], length ${packet.length}`;
}

/* -------------------------------- Comandos -------------------------------- */

const help: CommandHandler = () => ({
  exitCode: 0,
  lines: [
    'Comandos disponibles:',
    '  help     muestra esta ayuda',
    '  nmap     escaneo de puertos y servicios',
    '  tcpdump  captura y filtrado de tráfico',
    '  ss       sockets y puertos en escucha (alias: netstat)',
    '  ip       interfaces, rutas y vecinos',
    '  ping     comprobación de conectividad',
    '  cat      muestra un archivo',
    '  grep     filtra las líneas de un archivo',
    '  clear    limpia la pantalla',
  ],
});

const nmap: CommandHandler = ({ invocation, state }) => {
  const target = lastPositional(invocation, ['p']);
  if (target === null) return failure('nmap: se requiere un objetivo (IP, nombre o red)');

  const hosts = resolveHosts(target, state);
  if (hosts.length === 0) {
    return {
      exitCode: 1,
      lines: [
        'Starting Nmap 7.94 ( https://nmap.org )',
        `Note: Host seems down. If it is really up, but blocking our ping probes, try -Pn`,
        'Nmap done: 0 IP addresses (0 hosts up) scanned',
      ],
    };
  }

  const requested = parsePortSpec(getFlagValue(invocation, 'p'));
  const lines = ['Starting Nmap 7.94 ( https://nmap.org )'];
  let openCount = 0;

  for (const host of hosts) {
    lines.push(`Nmap scan report for ${host.hostname} (${host.ip})`);

    if (!host.up) {
      lines.push('Host is down.');
      continue;
    }

    lines.push('Host is up (0.0021s latency).');
    const open = requested === null
      ? host.ports
      : host.ports.filter((port) => requested.includes(port.port));

    for (const port of open) {
      openCount += 1;
      const service =
        hasFlag(invocation, 'sV') && port.version !== undefined
          ? `${port.service} ${port.version}`
          : port.service;
      lines.push(`${port.port}/${port.protocol}  open  ${service}`);
    }

    if (open.length === 0) lines.push('All scanned ports are closed or filtered.');
  }

  lines.push(`Nmap done: ${hosts.length} IP address(es) scanned, ${openCount} open port(s) found`);
  return { lines, exitCode: 0 };
};

const tcpdump: CommandHandler = ({ invocation, state }) => {
  const iface = getFlagValue(invocation, 'i') ?? state.interfaces[0]?.name ?? 'eth0';
  const countValue = getFlagValue(invocation, 'c');
  const limit = countValue === null ? Number.POSITIVE_INFINITY : Number(countValue);

  const filter = parsePacketFilter(positionalArgs(invocation, ['i', 'c', 'w', 's']));
  const matched = state.packets.filter(filter).slice(0, limit);

  const lines = [
    'tcpdump: verbose output suppressed, use -v[v]... for full protocol decode',
    `listening on ${iface}, link-type EN10MB (Ethernet), snapshot length 262144 bytes`,
  ];

  for (const packet of matched) lines.push(formatPacket(packet));

  lines.push(`${matched.length} packet(s) captured`);
  return { lines, exitCode: 0 };
};

function listeningLines(state: HostState, invocation: CommandInvocation, style: 'ss' | 'netstat') {
  const wantTcp = hasFlag(invocation, 't') || (!hasFlag(invocation, 'u') && !hasFlag(invocation, 't'));
  const wantUdp = hasFlag(invocation, 'u') || (!hasFlag(invocation, 'u') && !hasFlag(invocation, 't'));
  const showProcess = hasFlag(invocation, 'p');

  const rows = state.listening.filter(
    (entry) =>
      (entry.protocol === 'tcp' && wantTcp) || (entry.protocol === 'udp' && wantUdp),
  );

  if (style === 'netstat') {
    const lines = [
      'Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name',
    ];
    for (const row of rows) {
      const local = `${row.address}:${row.port}`.padEnd(23);
      const foreign = '0.0.0.0:*'.padEnd(23);
      const process = showProcess ? `${row.pid}/${row.process}` : '-';
      lines.push(
        `${row.protocol.padEnd(5)} 0      0      ${local} ${foreign} LISTEN      ${process}`,
      );
    }
    return lines;
  }

  const lines = ['State  Recv-Q Send-Q Local Address:Port  Peer Address:Port  Process'];
  for (const row of rows) {
    const local = `${row.address}:${row.port}`.padEnd(21);
    const peer = '0.0.0.0:*'.padEnd(17);
    const process = showProcess ? `users:(("${row.process}",pid=${row.pid},fd=3))` : '';
    lines.push(`LISTEN 0      128    ${local} ${peer} ${process}`.trimEnd());
  }
  return lines;
}

const ss: CommandHandler = ({ invocation, state }) => ({
  exitCode: 0,
  lines: listeningLines(state, invocation, 'ss'),
});

const netstat: CommandHandler = ({ invocation, state }) => ({
  exitCode: 0,
  lines: listeningLines(state, invocation, 'netstat'),
});

const ip: CommandHandler = ({ invocation, state }) => {
  const args = positionalArgs(invocation);
  const subcommand = (args[0] ?? '').toLowerCase();

  if (subcommand.startsWith('r')) {
    return {
      exitCode: 0,
      lines: [
        'default via 10.0.0.1 dev eth0 proto static',
        ...state.routes.map(
          (route) => `${route.destination} via ${route.gateway} dev ${route.iface}`,
        ),
      ],
    };
  }

  if (subcommand.startsWith('n')) {
    return {
      exitCode: 0,
      lines: state.arp.map((entry) => `${entry.ip} dev eth0 lladdr ${entry.mac} REACHABLE`),
    };
  }

  const lines: string[] = [];
  let index = 1;
  for (const iface of state.interfaces) {
    lines.push(`${index}: ${iface.name}: <BROADCAST,MULTICAST,${iface.state}> mtu 1500`);
    lines.push(`    link/ether ${iface.mac} brd ff:ff:ff:ff:ff:ff`);
    lines.push(`    inet ${iface.ip} brd 10.0.0.255 scope global ${iface.name}`);
    index += 1;
  }
  return { exitCode: 0, lines };
};

const ping: CommandHandler = ({ invocation, state }) => {
  const target = lastPositional(invocation, ['c', 'i', 'W', 's']);
  if (target === null) return failure('ping: usage error: Destination address required');

  const count = Number(getFlagValue(invocation, 'c') ?? 4);
  const hosts = resolveHosts(target, state);
  const host = hosts[0];

  if (host === undefined || !host.up) {
    return {
      exitCode: 1,
      lines: [
        `PING ${target} (${target}) 56(84) bytes of data.`,
        `--- ${target} ping statistics ---`,
        `${count} packets transmitted, 0 received, 100% packet loss, time ${count * 1000}ms`,
      ],
    };
  }

  const lines = [`PING ${host.hostname} (${host.ip}) 56(84) bytes of data.`];
  for (let sequence = 1; sequence <= count; sequence += 1) {
    lines.push(
      `64 bytes from ${host.ip}: icmp_seq=${sequence} ttl=64 time=${(0.04 + sequence * 0.003).toFixed(3)} ms`,
    );
  }
  lines.push(`--- ${host.hostname} ping statistics ---`);
  lines.push(
    `${count} packets transmitted, ${count} received, 0% packet loss, time ${count * 1000}ms`,
  );
  return { lines, exitCode: 0 };
};

const cat: CommandHandler = ({ invocation, state }) => {
  const path = lastPositional(invocation);
  if (path === null) return failure('cat: falta un operando');

  const content = state.files[path];
  if (content === undefined) return failure(`cat: ${path}: No such file or directory`);

  return { exitCode: 0, lines: content.split('\n') };
};

const grep: CommandHandler = ({ invocation, state }) => {
  const args = positionalArgs(invocation);
  const pattern = args[0];
  const path = args[1];

  if (pattern === undefined || path === undefined) {
    return failure('grep: uso: grep PATRÓN ARCHIVO');
  }

  const content = state.files[path];
  if (content === undefined) return failure(`grep: ${path}: No such file or directory`);

  const matched = content
    .split('\n')
    .filter((line) => line.toLowerCase().includes(pattern.toLowerCase()));

  return { lines: matched, exitCode: matched.length > 0 ? 0 : 1 };
};

const clear: CommandHandler = () => ({ lines: [], exitCode: 0, clear: true });

/* ------------------------------- Registro --------------------------------- */

export const COMMANDS: Readonly<Record<string, CommandHandler>> = {
  help: help,
  nmap: nmap,
  tcpdump: tcpdump,
  ss: ss,
  netstat: netstat,
  ip: ip,
  ping: ping,
  cat: cat,
  grep: grep,
  clear: clear,
};

export const COMMAND_NAMES: readonly string[] = Object.keys(COMMANDS).sort();

/** Ejecuta una línea. Devuelve null si la línea está vacía. */
export function executeCommand(line: string, state: HostState): CommandResult | null {
  const invocation = parseCommand(line);
  if (invocation === null) return null;

  const handler = COMMANDS[invocation.program];
  if (handler === undefined) {
    return { lines: [`${invocation.program}: command not found`], exitCode: 127 };
  }

  return handler({ invocation, state });
}
