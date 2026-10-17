import { describe, expect, it } from 'vitest';
import { DOMAIN_WEIGHTS, type DomainId } from '@/domain/domain';
import {
  DEFAULT_DIAGNOSTIC_LENGTH,
  allocateQuotas,
  selectDiagnosticQuestions,
} from '@/features/diagnostic/engine/selection';
import { makeQuestion } from '../../helpers/question';

function pool(count: number, domain: DomainId) {
  return Array.from({ length: count }, (_, i) => makeQuestion({ id: `d${domain}-q${i}`, domain }));
}

describe('allocateQuotas', () => {
  it('reparte exactamente `count` preguntas cuando hay pool suficiente', () => {
    const poolSizes = { 1: 100, 2: 100, 3: 100, 4: 100, 5: 100 } as Record<DomainId, number>;

    const quotas = allocateQuotas(poolSizes, 25, DOMAIN_WEIGHTS);
    const total = Object.values(quotas).reduce((sum, value) => sum + value, 0);

    expect(total).toBe(25);
    // El dominio con más peso (4, 28%) recibe más preguntas que el de menos (1, 12%).
    expect(quotas[4]).toBeGreaterThan(quotas[1]);
  });

  it('no supera el tamaño del pool y reparte el sobrante', () => {
    const poolSizes = { 1: 100, 2: 100, 3: 100, 4: 2, 5: 100 } as Record<DomainId, number>;

    const quotas = allocateQuotas(poolSizes, 25, DOMAIN_WEIGHTS);
    const total = Object.values(quotas).reduce((sum, value) => sum + value, 0);

    expect(quotas[4]).toBeLessThanOrEqual(2);
    expect(total).toBe(25);
  });

  it('se limita al total disponible si el pool es pequeño', () => {
    const poolSizes = { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<DomainId, number>;

    const quotas = allocateQuotas(poolSizes, 25, DOMAIN_WEIGHTS);
    const total = Object.values(quotas).reduce((sum, value) => sum + value, 0);

    expect(total).toBe(3);
  });
});

describe('selectDiagnosticQuestions', () => {
  const bank = [...pool(60, 1), ...pool(60, 2), ...pool(60, 3), ...pool(60, 4), ...pool(60, 5)];

  it('devuelve la longitud pedida', () => {
    expect(selectDiagnosticQuestions(bank, { count: 25 })).toHaveLength(25);
  });

  it('usa 25 preguntas por defecto', () => {
    expect(selectDiagnosticQuestions(bank)).toHaveLength(DEFAULT_DIAGNOSTIC_LENGTH);
  });

  it('no repite preguntas', () => {
    const selected = selectDiagnosticQuestions(bank, { count: 25 });
    expect(new Set(selected.map((question) => question.id)).size).toBe(25);
  });

  it('es determinista con la misma semilla y cambia con otra', () => {
    const a = selectDiagnosticQuestions(bank, { count: 20, seed: 5 });
    const b = selectDiagnosticQuestions(bank, { count: 20, seed: 5 });
    const c = selectDiagnosticQuestions(bank, { count: 20, seed: 6 });

    expect(a.map((question) => question.id)).toEqual(b.map((question) => question.id));
    expect(a.map((question) => question.id)).not.toEqual(c.map((question) => question.id));
  });

  it('pondera la selección según el peso de los dominios', () => {
    const selected = selectDiagnosticQuestions(bank, { count: 50 });
    const countByDomain = selected.reduce<Record<number, number>>((acc, question) => {
      acc[question.domain] = (acc[question.domain] ?? 0) + 1;
      return acc;
    }, {});

    expect(countByDomain[4]).toBeGreaterThan(countByDomain[1] ?? 0);
    expect(countByDomain[2]).toBeGreaterThan(countByDomain[1] ?? 0);
  });

  it('se limita al tamaño del banco disponible', () => {
    const small = pool(3, 1);
    expect(selectDiagnosticQuestions(small, { count: 25 })).toHaveLength(3);
  });

  it('intercala dominios en lugar de agruparlos', () => {
    const selected = selectDiagnosticQuestions(bank, { count: 25 });
    const firstFive = selected.slice(0, 5).map((question) => question.domain);
    expect(new Set(firstFive).size).toBeGreaterThan(1);
  });
});
