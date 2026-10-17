import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetSrsRepository, setSrsRepository } from '@/features/srs/data/repository';
import { ReviewSession } from '@/features/srs/ui/ReviewSession';
import { makeCard } from '../../helpers/card';
import { createMemoryRepository } from '../../helpers/memoryRepository';

afterEach(() => {
  resetSrsRepository();
});

describe('ReviewSession (integración store + servicio + UI)', () => {
  it('permite revelar y calificar una tarjeta, y persiste el repaso', async () => {
    const user = userEvent.setup();
    const repository = createMemoryRepository([
      makeCard({ id: 'port-ssh', front: '¿Qué puerto usa SSH?', back: 'TCP 22.' }),
    ]);
    setSrsRepository(repository);

    render(<ReviewSession />);

    // La tarjeta aparece y la respuesta está oculta.
    expect(await screen.findByText('¿Qué puerto usa SSH?')).toBeInTheDocument();
    expect(screen.queryByText('TCP 22.')).not.toBeInTheDocument();

    // Revelar y calificar como "Bien".
    await user.click(screen.getByRole('button', { name: /mostrar respuesta/i }));
    expect(await screen.findByText('TCP 22.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /bien/i }));

    // Al ser la única tarjeta, la sesión termina con el resumen.
    expect(await screen.findByText('Sesión completada')).toBeInTheDocument();

    // El repaso quedó registrado y la tarjeta reprogramada a 1 día.
    expect(repository.reviews).toHaveLength(1);
    expect(repository.reviews[0]?.grade).toBe('good');
    expect(repository.cards[0]?.repetitions).toBe(1);
    expect(repository.cards[0]?.intervalDays).toBe(1);
  });

  it('muestra un mensaje cuando no hay tarjetas pendientes', async () => {
    setSrsRepository(createMemoryRepository([]));

    render(<ReviewSession />);

    expect(await screen.findByText('Sesión completada')).toBeInTheDocument();
    expect(screen.getByText(/no hay tarjetas pendientes/i)).toBeInTheDocument();
  });
});
