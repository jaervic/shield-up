/**
 * Estado de la sesión de repaso (Zustand).
 *
 * El store NO calcula intervalos: delega en `reviewService` → `engine`.
 * Solo mantiene el estado efímero de la sesión (cola, posición, si está
 * revelada) y los contadores del resumen final.
 */

import { create } from 'zustand';
import type { Card, Confidence, Grade, Review } from '@/domain/card';
import { buildDailyQueue, DEFAULT_NEW_LIMIT, type QueueOptions } from '../engine/queue';
import { getSrsRepository } from '../data/repository';
import { reviewCard } from '../data/reviewService';

export type SessionStatus = 'idle' | 'loading' | 'reviewing' | 'finished' | 'error';

export interface SrsState {
  status: SessionStatus;
  error: string | null;
  queue: Card[];
  index: number;
  revealed: boolean;
  /** Confianza declarada antes de revelar (opcional). */
  confidence: Confidence | null;
  /** Última tarjeta programada, para anunciar el próximo intervalo (aria-live). */
  lastScheduledCard: Card | null;
  /** Repasos de ESTA sesión: alimentan la calibración del resumen final. */
  sessionReviews: Review[];
  sessionReviewed: number;
  sessionCorrect: number;

  start: (options?: QueueOptions) => Promise<void>;
  reveal: () => void;
  /** Declara la confianza y revela en un solo gesto. */
  declareConfidence: (confidence: Confidence) => void;
  grade: (grade: Grade) => Promise<void>;
  skip: () => void;
  reset: () => void;
}

const initialState = {
  status: 'idle' as SessionStatus,
  error: null,
  queue: [],
  index: 0,
  revealed: false,
  confidence: null,
  lastScheduledCard: null,
  sessionReviews: [] as Review[],
  sessionReviewed: 0,
  sessionCorrect: 0,
};

export const useSrsStore = create<SrsState>((set, get) => ({
  ...initialState,

  async start(options = {}) {
    set({ status: 'loading', error: null });
    try {
      const cards = await getSrsRepository().getCards();
      const queue = buildDailyQueue(cards, new Date(), {
        newLimit: DEFAULT_NEW_LIMIT,
        ...options,
      });

      set({
        status: queue.cards.length > 0 ? 'reviewing' : 'finished',
        queue: queue.cards,
        index: 0,
        revealed: false,
        confidence: null,
        lastScheduledCard: null,
        sessionReviews: [],
        sessionReviewed: 0,
        sessionCorrect: 0,
      });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido al iniciar la sesión.',
      });
    }
  },

  reveal() {
    if (get().status !== 'reviewing') return;
    set({ revealed: true });
  },

  declareConfidence(confidence) {
    if (get().status !== 'reviewing') return;
    set({ confidence, revealed: true });
  },

  async grade(grade) {
    const { queue, index, confidence } = get();
    const current = queue[index];
    if (!current) return;

    try {
      const { card, review } = await reviewCard(
        current.id,
        grade,
        new Date(),
        confidence ?? undefined,
      );
      const nextQueue = [...queue];
      nextQueue[index] = card;
      const nextIndex = index + 1;

      set({
        queue: nextQueue,
        index: nextIndex,
        revealed: false,
        confidence: null,
        lastScheduledCard: card,
        sessionReviews: [...get().sessionReviews, review],
        sessionReviewed: get().sessionReviewed + 1,
        sessionCorrect: get().sessionCorrect + (grade === 'again' ? 0 : 1),
        status: nextIndex >= nextQueue.length ? 'finished' : 'reviewing',
      });
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Error desconocido al calificar.',
      });
    }
  },

  skip() {
    const { queue, index, status } = get();
    if (status !== 'reviewing') return;
    const nextIndex = index + 1;
    set({
      index: nextIndex,
      revealed: false,
      confidence: null,
      status: nextIndex >= queue.length ? 'finished' : 'reviewing',
    });
  },

  reset() {
    set({ ...initialState });
  },
}));

/** Selector derivado: devuelve la tarjeta actual (referencia estable). */
export function selectCurrentCard(state: SrsState): Card | null {
  return state.queue[state.index] ?? null;
}
