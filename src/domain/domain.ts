/**
 * Dominios oficiales del examen CompTIA Security+ SY0-701.
 *
 * Los pesos son los publicados en el blueprint del examen y se usan para:
 *  - ponderar la generación de preguntas y el interleaving del SRS
 *  - calcular el "peso" de cada dominio en el dashboard de diagnóstico
 *
 * Este módulo es PURO: sin React, sin Dexie, sin efectos secundarios.
 */

export type DomainId = 1 | 2 | 3 | 4 | 5;

export interface DomainMeta {
  readonly id: DomainId;
  /** Código corto usado en logs y claves de almacenamiento. */
  readonly code: string;
  readonly name: string;
  readonly nameEs: string;
  /** Peso oficial del examen, en el rango 0..1. La suma de todos es 1. */
  readonly weight: number;
}

export const DOMAIN_IDS: readonly DomainId[] = [1, 2, 3, 4, 5] as const;

export const DOMAINS: readonly DomainMeta[] = [
  {
    id: 1,
    code: 'general-security',
    name: 'General Security Concepts',
    nameEs: 'Conceptos generales de seguridad',
    weight: 0.12,
  },
  {
    id: 2,
    code: 'threats-vulns',
    name: 'Threats, Vulnerabilities, and Mitigations',
    nameEs: 'Amenazas, vulnerabilidades y mitigaciones',
    weight: 0.22,
  },
  {
    id: 3,
    code: 'security-architecture',
    name: 'Security Architecture',
    nameEs: 'Arquitectura de seguridad',
    weight: 0.18,
  },
  {
    id: 4,
    code: 'security-operations',
    name: 'Security Operations',
    nameEs: 'Operaciones de seguridad',
    weight: 0.28,
  },
  {
    id: 5,
    code: 'program-management',
    name: 'Security Program Management and Oversight',
    nameEs: 'Gestión y supervisión del programa de seguridad',
    weight: 0.2,
  },
] as const;

/** Mapa de pesos para consultas O(1) desde el motor de repaso. */
export const DOMAIN_WEIGHTS: Readonly<Record<DomainId, number>> = DOMAINS.reduce(
  (acc, domain) => {
    acc[domain.id] = domain.weight;
    return acc;
  },
  {} as Record<DomainId, number>,
);

const DOMAIN_BY_ID = new Map<DomainId, DomainMeta>(DOMAINS.map((d) => [d.id, d]));

export function getDomain(id: DomainId): DomainMeta {
  const domain = DOMAIN_BY_ID.get(id);
  if (!domain) {
    throw new Error(`Dominio desconocido: ${String(id)}`);
  }
  return domain;
}

export function isDomainId(value: unknown): value is DomainId {
  return typeof value === 'number' && DOMAIN_IDS.includes(value as DomainId);
}
