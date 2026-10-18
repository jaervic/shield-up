/**
 * Modelo de las PBQ (Performance-Based Questions).
 *
 * Una PBQ no se responde eligiendo: se RESUELVE. Hay dos familias:
 *  - `topology`: colocar activos en el segmento correcto.
 *  - `terminal`: conseguir un objetivo ejecutando comandos en un host simulado.
 *
 * Módulo PURO. La simulación de comandos vive en `features/pbq/engine/shell`.
 */

import type { Difficulty } from './question';
import type { DomainId } from './domain';

export type PbqKind = 'topology' | 'terminal';

interface PbqBase {
  id: string;
  domain: DomainId;
  /** Sub-objetivos del blueprint que cubre la PBQ. */
  blueprintObjectives: string[];
  title: string;
  summary: string;
  /** Enunciado: qué hay que conseguir. */
  instructions: string;
  estimatedMinutes: number;
  difficulty: Difficulty;
  tags: string[];
  /** Explicación que se muestra al corregir. */
  explanation: string;
}

/* ------------------------------- Topología -------------------------------- */

export interface TopologyZone {
  id: string;
  label: string;
  description?: string;
}

export interface TopologyNode {
  id: string;
  label: string;
  hint?: string;
  /** Zona correcta para este activo. */
  correctZoneId: string;
}

export interface TopologyPbq extends PbqBase {
  kind: 'topology';
  zones: TopologyZone[];
  nodes: TopologyNode[];
}

/* -------------------------------- Terminal -------------------------------- */

/** Un activo remoto que el host simulado puede descubrir. */
export interface RemoteHost {
  ip: string;
  hostname: string;
  up: boolean;
  ports: Array<{
    port: number;
    protocol: 'tcp' | 'udp';
    service: string;
    version?: string;
  }>;
}

export interface NetworkInterface {
  name: string;
  ip: string;
  mac: string;
  state: 'UP' | 'DOWN';
}

export interface RouteEntry {
  destination: string;
  gateway: string;
  iface: string;
}

export interface ArpEntry {
  ip: string;
  mac: string;
}

export interface ListeningPort {
  port: number;
  protocol: 'tcp' | 'udp';
  process: string;
  pid: number;
  /** Dirección de escucha; `0.0.0.0` significa expuesto en todas. */
  address: string;
}

export interface SimulatedProcess {
  pid: number;
  user: string;
  command: string;
}

export interface SimulatedPacket {
  /** Segundos desde el inicio de la captura. */
  time: number;
  src: string;
  dst: string;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  srcPort?: number;
  dstPort?: number;
  flags?: string;
  length: number;
}

/** Estado del host simulado. Es inmutable: los comandos no lo modifican. */
export interface HostState {
  hostname: string;
  interfaces: NetworkInterface[];
  routes: RouteEntry[];
  /**
   * Ruta por defecto configurada en el host.
   *
   * Es opcional para no obligar a repetirla en los estados que ya la incluyen
   * como una entrada `0.0.0.0/0` en `routes`.
   */
  defaultGateway?: { gateway: string; iface: string };
  arp: ArpEntry[];
  listening: ListeningPort[];
  processes: SimulatedProcess[];
  /** hostname → IP, para resolver nombres. */
  dns: Record<string, string>;
  hosts: RemoteHost[];
  packets: SimulatedPacket[];
  files: Record<string, string>;
}

/**
 * Condición que cumple un objetivo del enunciado.
 *
 * Se satisface si ALGUNA línea del transcript invoca `program`, incluye todas
 * las `flags` y `args` indicadas, y (si se pide) su salida contiene
 * `outputContains`.
 */
export interface CommandMatcher {
  program: string;
  flags?: string[];
  args?: string[];
  outputContains?: string;
}

export interface TerminalObjective {
  id: string;
  /** Qué se le pide al usuario, en lenguaje natural. */
  description: string;
  matcher: CommandMatcher;
}

export interface TerminalPbq extends PbqBase {
  kind: 'terminal';
  state: HostState;
  /** Tareas del enunciado que el usuario debe conseguir. */
  tasks: TerminalObjective[];
}

export type Pbq = TopologyPbq | TerminalPbq;

/** Colocación del usuario: nodeId → zoneId (null si no se ha colocado). */
export type TopologyPlacement = Record<string, string | null>;

/** Una línea ejecutada y su salida, que es lo que se corrige. */
export interface TranscriptEntry {
  line: string;
  output: string[];
  exitCode: number;
}

export function isTopologyPbq(pbq: Pbq): pbq is TopologyPbq {
  return pbq.kind === 'topology';
}

export function isTerminalPbq(pbq: Pbq): pbq is TerminalPbq {
  return pbq.kind === 'terminal';
}

/* -------------------------------- Intentos -------------------------------- */

export interface TopologyNodeResult {
  nodeId: string;
  placedZoneId: string | null;
  correct: boolean;
}

export interface TerminalObjectiveResult {
  objectiveId: string;
  description: string;
  met: boolean;
}

/** Resultado de una PBQ, ya corregida. */
export interface PbqAttempt {
  id: string;
  pbqId: string;
  kind: PbqKind;
  domain: DomainId;
  startedAt: string;
  completedAt: string;
  scorePercent: number;
  passed: boolean;
  /** Detalle por activo (topología) u objetivo (terminal). */
  nodeResults?: TopologyNodeResult[];
  objectiveResults?: TerminalObjectiveResult[];
  /** Número de comandos ejecutados, en las PBQ de terminal. */
  commandsRun?: number;
}
