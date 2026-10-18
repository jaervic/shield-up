import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import type { Review } from '@/domain/card';
import { DashboardPage } from '@/features/dashboard/ui/DashboardPage';
import {
  resetDiagnosticRepository,
  setDiagnosticRepository,
} from '@/features/diagnostic/data/repository';
import {
  resetLessonRepository,
  setLessonRepository,
} from '@/features/microlearning/data/repository';
import { resetSrsRepository, setSrsRepository } from '@/features/srs/data/repository';
import { makeCard } from '../../helpers/card';
import { createMemoryDiagnosticRepository } from '../../helpers/memoryDiagnosticRepository';
import { createMemoryLessonRepository } from '../../helpers/memoryLessonRepository';
import { createMemoryRepository } from '../../helpers/memoryRepository';
import { renderWithProviders, settleUntil } from '../../helpers/render';

/**
 * Humo del panel principal. Se inyectan repositorios en memoria en lugar de
 * IndexedDB: esperar a IndexedDB dentro de `act()` no resuelve en jsdom (en el
 * navegador no ocurre, pero aquí bloquearía el test).
 */

/** Repaso hecho AHORA: es lo que alimenta el objetivo diario y la racha. */
function reviewToday(): Review {
  return {
    id: 'rev-1',
    cardId: 'port-ssh',
    reviewedAt: new Date().toISOString(),
    grade: 'good',
    score: 4,
    prevIntervalDays: 0,
    nextIntervalDays: 1,
    prevEaseFactor: 2.5,
    nextEaseFactor: 2.5,
    elapsedDays: 0,
  };
}

function setup(options: { reviews?: Review[] } = {}): void {
  setSrsRepository(createMemoryRepository([makeCard({ id: 'port-ssh' })], options.reviews ?? []));
  setDiagnosticRepository(createMemoryDiagnosticRepository());
  setLessonRepository(createMemoryLessonRepository());
}

/** Espera a que el panel salga del estado de carga. */
async function renderDashboard(): Promise<void> {
  renderWithProviders(<DashboardPage />);
  await settleUntil(() => screen.queryByRole('heading', { name: 'Panel de estudio' }) !== null);
}

afterEach(() => {
  resetSrsRepository();
  resetDiagnosticRepository();
  resetLessonRepository();
});

describe('DashboardPage', () => {
  it('muestra el título, el objetivo diario y el método de estudio', async () => {
    setup();
    await renderDashboard();

    expect(screen.getByRole('heading', { name: 'Tu sesión de hoy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cómo aprovechar ShieldUp' })).toBeInTheDocument();
  });

  it('invita a empezar la racha cuando no hay actividad', async () => {
    setup();
    await renderDashboard();

    expect(screen.getByText(/empezar tu racha/i)).toBeInTheDocument();
    expect(screen.getByText('0 / 20')).toBeInTheDocument();
  });

  it('reconoce el progreso del día y calcula lo que queda', async () => {
    setup({ reviews: [reviewToday()] });
    await renderDashboard();

    expect(screen.getByText(/te quedan 19 repasos/i)).toBeInTheDocument();
    expect(screen.getByText('1 / 20')).toBeInTheDocument();
    expect(screen.getByText('1 día')).toBeInTheDocument();
  });

  it('ofrece un acceso directo al repaso', async () => {
    setup();
    await renderDashboard();

    expect(screen.getByRole('link', { name: /repaso/i })).toHaveAttribute('href', '/review');
  });

  it('explica el método con sus tres pasos', async () => {
    setup();
    await renderDashboard();

    expect(screen.getByRole('heading', { name: 'Mide tu punto de partida' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entiende resolviendo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Consolida cada día' })).toBeInTheDocument();
  });

  it('muestra el avance por dominio y los hitos', async () => {
    setup();
    await renderDashboard();

    expect(screen.getByRole('heading', { name: 'Dominio por dominio' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hitos' })).toBeInTheDocument();
    expect(screen.getByText(/0 de 5 conseguidos/)).toBeInTheDocument();
    expect(screen.getByText('Primer repaso')).toBeInTheDocument();
    // Los cinco dominios exponen su porcentaje de dominio en texto (accesible).
    expect(screen.getAllByText(/dominado$/)).toHaveLength(5);
  });
});
