/**
 * Métricas del SRS para el dashboard de diagnóstico.
 *
 * Definiciones (coherentes con Anki, para que las cifras sean familiares):
 *  - new:     nunca repasada (lastReviewedAt === null)
 *  - young:   repasada, intervalo < 21 días
 *  - mature:  repasada, intervalo >= 21 días (memoria consolidada)
 *  - retentionRate: proporción de repasos con score >= 3 (acierto)
 *
 * Todo puro y derivado: no se guarda estado agregado, se recalcula.
 */

import type { Card, Review } from '@/domain/card';
import { DOMAIN_IDS, type DomainId } from '@/domain/domain';
import { addDays, fullDaysBetween, isDue, toDateKey } from '@/shared/utils/date';

export const MATURE_INTERVAL_DAYS = 21;

export interface DomainStats {
  domain: DomainId;
  total: number;
  newCards: number;
  young: number;
  mature: number;
  dueToday: number;
  avgEaseFactor: number;
}

export interface SrsStats {
  total: number;
  newCards: number;
  young: number;
  mature: number;
  suspended: number;
  dueToday: number;
  dueNext7Days: number;
  avgEaseFactor: number;
  totalReviews: number;
  totalLapses: number;
  /** null cuando todavía no hay repasos registrados. */
  retentionRate: number | null;
  /** Retención de los últimos 30 días. */
  retentionRateLast30Days: number | null;
  byDomain: Record<DomainId, DomainStats>;
}

export interface ReviewLoadPoint {
  date: string;
  count: number;
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function retention(reviews: readonly Review[]): number | null {
  if (reviews.length === 0) return null;
  const passed = reviews.filter((review) => review.score >= 3).length;
  return passed / reviews.length;
}

function classify(card: Card): 'new' | 'young' | 'mature' {
  if (card.lastReviewedAt === null) return 'new';
  return card.intervalDays >= MATURE_INTERVAL_DAYS ? 'mature' : 'young';
}

export function computeStats(
  cards: readonly Card[],
  reviews: readonly Review[] = [],
  now: Date = new Date(),
): SrsStats {
  const inSevenDays = addDays(now, 7);
  const thirtyDaysAgo = addDays(now, -30);

  const byDomain = {} as Record<DomainId, DomainStats>;
  for (const id of DOMAIN_IDS) {
    byDomain[id] = {
      domain: id,
      total: 0,
      newCards: 0,
      young: 0,
      mature: 0,
      dueToday: 0,
      avgEaseFactor: 0,
    };
  }

  let newCards = 0;
  let young = 0;
  let mature = 0;
  let suspended = 0;
  let dueToday = 0;
  let dueNext7Days = 0;

  const easeByDomain = new Map<DomainId, number[]>();

  for (const card of cards) {
    const bucket = classify(card);
    const isActive = !card.suspended;

    if (card.suspended) suspended += 1;
    if (bucket === 'new') newCards += 1;
    if (bucket === 'young') young += 1;
    if (bucket === 'mature') mature += 1;

    if (isActive && card.repetitions > 0 && isDue(card.dueAt, now)) {
      dueToday += 1;
    }
    if (isActive && new Date(card.dueAt).getTime() <= inSevenDays.getTime()) {
      dueNext7Days += 1;
    }

    const domain = byDomain[card.domain];
    domain.total += 1;
    if (bucket === 'new') domain.newCards += 1;
    if (bucket === 'young') domain.young += 1;
    if (bucket === 'mature') domain.mature += 1;
    if (isActive && card.repetitions > 0 && isDue(card.dueAt, now)) domain.dueToday += 1;

    const easeValues = easeByDomain.get(card.domain) ?? [];
    easeValues.push(card.easeFactor);
    easeByDomain.set(card.domain, easeValues);
  }

  for (const id of DOMAIN_IDS) {
    const values = easeByDomain.get(id) ?? [];
    byDomain[id].avgEaseFactor = values.length > 0 ? Math.round(average(values) * 100) / 100 : 0;
  }

  const recentReviews = reviews.filter((review) => new Date(review.reviewedAt) >= thirtyDaysAgo);

  return {
    total: cards.length,
    newCards,
    young,
    mature,
    suspended,
    dueToday,
    dueNext7Days,
    avgEaseFactor: cards.length > 0 ? Math.round(average(cards.map((c) => c.easeFactor)) * 100) / 100 : 0,
    totalReviews: reviews.length,
    totalLapses: cards.reduce((sum, card) => sum + card.lapses, 0),
    retentionRate: retention(reviews),
    retentionRateLast30Days: retention(recentReviews),
    byDomain,
  };
}

/** Carga proyectada de repasos por día, útil para el gráfico del dashboard. */
export function projectReviewLoad(
  cards: readonly Card[],
  now: Date = new Date(),
  days = 30,
): ReviewLoadPoint[] {
  const buckets = new Map<string, number>();
  for (let offset = 0; offset < days; offset += 1) {
    buckets.set(toDateKey(addDays(now, offset)), 0);
  }

  for (const card of cards) {
    if (card.suspended) continue;
    const due = new Date(card.dueAt);
    const offset = fullDaysBetween(now, due);
    const key = toDateKey(addDays(now, Math.min(offset, days - 1)));
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}
