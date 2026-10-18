/**
 * Validación del contenido de PBQ con Zod.
 *
 * El esquema comprueba la ESTRUCTURA; las invariantes que cruzan campos
 * (zonas existentes, ids únicos, tareas no vacías) se validan a nivel de lista,
 * porque `discriminatedUnion` exige miembros que sean objetos puros.
 */

import { z } from 'zod';
import { domainIdSchema } from './cardSeedSchema';

const portSchema = z.object({
  port: z.number().int().min(1).max(65_535),
  protocol: z.enum(['tcp', 'udp']),
  service: z.string().min(1),
  version: z.string().min(1).optional(),
});

const remoteHostSchema = z.object({
  ip: z.string().min(7),
  hostname: z.string().min(1),
  up: z.boolean(),
  ports: z.array(portSchema).default([]),
});

const interfaceSchema = z.object({
  name: z.string().min(1),
  ip: z.string().min(7),
  mac: z.string().min(11),
  state: z.enum(['UP', 'DOWN']),
});

const routeSchema = z.object({
  destination: z.string().min(1),
  gateway: z.string().min(7),
  iface: z.string().min(1),
});

const arpSchema = z.object({ ip: z.string().min(7), mac: z.string().min(11) });

const listeningSchema = z.object({
  port: z.number().int().min(1).max(65_535),
  protocol: z.enum(['tcp', 'udp']),
  process: z.string().min(1),
  pid: z.number().int().positive(),
  address: z.string().min(1),
});

const processSchema = z.object({
  pid: z.number().int().positive(),
  user: z.string().min(1),
  command: z.string().min(1),
});

const packetSchema = z.object({
  time: z.number().min(0),
  src: z.string().min(1),
  dst: z.string().min(1),
  protocol: z.enum(['TCP', 'UDP', 'ICMP']),
  srcPort: z.number().int().min(1).max(65_535).optional(),
  dstPort: z.number().int().min(1).max(65_535).optional(),
  flags: z.string().min(1).optional(),
  length: z.number().int().min(0),
});

const hostStateSchema = z.object({
  hostname: z.string().min(1),
  interfaces: z.array(interfaceSchema).min(1),
  routes: z.array(routeSchema),
  defaultGateway: z
    .object({ gateway: z.string().min(7), iface: z.string().min(1) })
    .optional(),
  arp: z.array(arpSchema),
  listening: z.array(listeningSchema),
  processes: z.array(processSchema),
  dns: z.record(z.string()),
  hosts: z.array(remoteHostSchema),
  packets: z.array(packetSchema),
  files: z.record(z.string()),
});

const baseFields = {
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'El id debe ser kebab-case en minúsculas (ej. "pbq-topologia-dmz").'),
  domain: domainIdSchema,
  blueprintObjectives: z.array(z.string().regex(/^\d+\.\d+$/)).min(1),
  title: z.string().min(1),
  summary: z.string().min(20),
  instructions: z.string().min(20),
  estimatedMinutes: z.number().int().positive().max(30),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string()).default([]),
  explanation: z.string().min(40),
};

export const topologyPbqSchema = z.object({
  kind: z.literal('topology'),
  ...baseFields,
  zones: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        description: z.string().min(1).optional(),
      }),
    )
    .min(2),
  nodes: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        hint: z.string().min(1).optional(),
        correctZoneId: z.string().min(1),
      }),
    )
    .min(3),
});

export const terminalPbqSchema = z.object({
  kind: z.literal('terminal'),
  ...baseFields,
  state: hostStateSchema,
  tasks: z
    .array(
      z.object({
        id: z.string().min(1),
        description: z.string().min(10),
        matcher: z.object({
          program: z.string().min(1),
          flags: z.array(z.string().min(1)).optional(),
          args: z.array(z.string().min(1)).optional(),
          outputContains: z.string().min(1).optional(),
        }),
      }),
    )
    .min(2),
});

export const pbqSchema = z.discriminatedUnion('kind', [topologyPbqSchema, terminalPbqSchema]);

export const pbqListSchema = z.array(pbqSchema).superRefine((items, ctx) => {
  const seenIds = new Set<string>();

  for (const [index, pbq] of items.entries()) {
    if (seenIds.has(pbq.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'id'],
        message: `ID de PBQ duplicado: "${pbq.id}".`,
      });
    }
    seenIds.add(pbq.id);

    if (pbq.kind === 'topology') {
      const zoneIds = new Set(pbq.zones.map((zone) => zone.id));
      if (zoneIds.size !== pbq.zones.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'zones'],
          message: 'Los ids de zona deben ser únicos.',
        });
      }

      const nodeIds = new Set(pbq.nodes.map((node) => node.id));
      if (nodeIds.size !== pbq.nodes.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'nodes'],
          message: 'Los ids de activo deben ser únicos.',
        });
      }

      for (const [nodeIndex, node] of pbq.nodes.entries()) {
        if (!zoneIds.has(node.correctZoneId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, 'nodes', nodeIndex, 'correctZoneId'],
            message: `La zona "${node.correctZoneId}" no existe entre las zonas declaradas.`,
          });
        }
      }

      // Cada zona debe recibir al menos un activo: si no, sobra.
      for (const [zoneIndex, zone] of pbq.zones.entries()) {
        if (!pbq.nodes.some((node) => node.correctZoneId === zone.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, 'zones', zoneIndex],
            message: `La zona "${zone.id}" no tiene ningún activo correcto: es ruido.`,
          });
        }
      }
      continue;
    }

    const taskIds = new Set(pbq.tasks.map((task) => task.id));
    if (taskIds.size !== pbq.tasks.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'tasks'],
        message: 'Los ids de tarea deben ser únicos.',
      });
    }
  }
});
