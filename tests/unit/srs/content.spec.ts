import { describe, expect, it } from 'vitest';
import { DOMAIN_IDS } from '@/domain/domain';
import { CARD_TYPES } from '@/domain/card';
import { loadCardSeeds } from '@/data/content/loadContent';

describe('contenido seed', () => {
  const seeds = loadCardSeeds();

  it('carga sin errores de validación', () => {
    expect(seeds.length).toBeGreaterThanOrEqual(180);
  });

  it('no contiene IDs duplicados', () => {
    const ids = seeds.map((seed) => seed.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('usa dominios y tipos válidos', () => {
    for (const seed of seeds) {
      expect(DOMAIN_IDS).toContain(seed.domain);
      expect(CARD_TYPES).toContain(seed.type);
      expect(seed.front.length).toBeGreaterThan(0);
      expect(seed.back.length).toBeGreaterThan(0);
    }
  });

  it('cubre los cinco dominios del examen', () => {
    const covered = new Set(seeds.map((seed) => seed.domain));
    for (const domain of DOMAIN_IDS) {
      expect(covered.has(domain)).toBe(true);
    }
  });
});
