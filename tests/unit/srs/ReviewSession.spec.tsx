import { afterEach, describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { resetSrsRepository, setSrsRepository } from '@/features/srs/data/repository';
import { useSrsStore } from '@/features/srs/state/srsStore';
import { ReviewSession } from '@/features/srs/ui/ReviewSession';
import { makeCard } from '../../helpers/card';
import { createMemoryRepository } from '../../helpers/memoryRepository';
import { renderWithProviders, settle, settleUntil } from '../../helpers/render';

afterEach(() => {
  act(() => {
    resetSrsRepository();
    useSrsStore.getState().reset();
  });
});

/** Espera a la pantalla de plan y arranca la sesión. */
async function startSession(): Promise<void> {
  renderWithProviders(<ReviewSession />);
  await settleUntil(() => screen.queryByRole('button', { name: /empezar sesión/i }) !== null);
  fireEvent.click(screen.getByRole('button', { name: /empezar sesión/i }));
  await settle();
}

/** Texto del titular del plan ("N tarjetas · ~M min"). */
function headlineText(): string {
  const node = screen.getByText(/tarjetas · ~\d+ min/).closest('p');
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('ReviewSession (integración store + servicio + UI)', () => {
  it('presenta el plan de la sesión antes de empezar', async () => {
    setSrsRepository(
      createMemoryRepository([
        makeCard({ id: 'port-ssh' }),
        makeCard({ id: 'port-dns', domain: 3 }),
      ]),
    );

    renderWithProviders(<ReviewSession />);
    await settleUntil(() => screen.queryByRole('button', { name: /empezar sesión/i }) !== null);

    expect(screen.getByRole('heading', { name: 'Antes de empezar' })).toBeInTheDocument();
    expect(screen.getByText(/tarjetas · ~1 min/)).toBeInTheDocument();
    expect(screen.getByText('Nuevas').parentElement).toHaveTextContent('2');
    expect(screen.getByText('Vencidas').parentElement).toHaveTextContent('0');
  });

  it('declara la confianza, revela, califica y persiste el repaso', async () => {
    const repository = createMemoryRepository([
      makeCard({ id: 'port-ssh', front: '¿Qué puerto usa SSH?', back: 'TCP 22.' }),
    ]);
    setSrsRepository(repository);

    await startSession();

    expect(screen.getByText('¿Qué puerto usa SSH?')).toBeInTheDocument();
    expect(screen.queryByText('TCP 22.')).not.toBeInTheDocument();
    expect(screen.getByText(/antes de ver la respuesta/i)).toBeInTheDocument();

    // Declarar la confianza revela en el mismo gesto.
    fireEvent.click(screen.getByRole('button', { name: 'Lo tenía seguro' }));
    await settle();

    expect(screen.getByText('TCP 22.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /bien/i }));
    await settle();

    // Al ser la única tarjeta, la sesión termina con el resumen y la calibración.
    expect(screen.getByRole('heading', { name: 'Sesión completada' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /calibración/i })).toBeInTheDocument();

    expect(repository.reviews).toHaveLength(1);
    expect(repository.reviews[0]?.grade).toBe('good');
    expect(repository.reviews[0]?.confidence).toBe('sure');
    expect(repository.cards[0]?.repetitions).toBe(1);
    expect(repository.cards[0]?.intervalDays).toBe(1);
  });

  it('permite revelar sin valorar la confianza', async () => {
    const repository = createMemoryRepository([
      makeCard({ id: 'port-ssh', back: 'TCP 22.' }),
    ]);
    setSrsRepository(repository);

    await startSession();

    fireEvent.click(screen.getByRole('button', { name: /revelar sin valorar/i }));
    await settle();

    expect(screen.getByText('TCP 22.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /bien/i }));
    await settle();

    expect(screen.getByRole('heading', { name: 'Sesión completada' })).toBeInTheDocument();
    // Sin confianza declarada no se registra el campo ni se muestra calibración.
    expect(repository.reviews[0]?.confidence).toBeUndefined();
    expect(screen.queryByRole('heading', { name: /calibración/i })).not.toBeInTheDocument();
  });

  it('avisa cuando no hay tarjetas pendientes', async () => {
    setSrsRepository(createMemoryRepository());

    renderWithProviders(<ReviewSession />);
    await settleUntil(() => screen.queryByText(/no hay nada pendiente/i) !== null);

    expect(screen.getByRole('heading', { name: 'No hay nada pendiente' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver lecciones/i })).toHaveAttribute('href', '/lessons');
  });

  it('permite la práctica dirigida por dominio', async () => {
    setSrsRepository(
      createMemoryRepository([
        makeCard({ id: 'd4-a', domain: 4 }),
        makeCard({ id: 'd4-b', domain: 4 }),
        makeCard({ id: 'd1-a', domain: 1 }),
      ]),
    );

    renderWithProviders(<ReviewSession />);
    await settleUntil(() => screen.queryByRole('button', { name: /empezar sesión/i }) !== null);

    // Sin filtro: las tres tarjetas.
    expect(headlineText()).toBe('3 tarjetas · ~1 min');

    const domainChip = screen.getByRole('button', { name: /^D4/ });
    expect(domainChip).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(domainChip);
    await settleUntil(() => screen.queryByText(/práctica dirigida/i) !== null);

    expect(screen.getByRole('button', { name: /^D4/ })).toHaveAttribute('aria-pressed', 'true');
    expect(headlineText()).toBe('2 tarjetas · ~1 min · práctica dirigida');

    fireEvent.click(screen.getByRole('button', { name: /empezar sesión/i }));
    await settle();

    // La sesión arranca solo con tarjetas del dominio elegido.
    expect(screen.getByText(/Dominio 4/)).toBeInTheDocument();
  });
});
