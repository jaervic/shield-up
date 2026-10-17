import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlashcardView } from '@/features/srs/ui/FlashcardView';
import { makeCard } from '../../helpers/card';

describe('FlashcardView', () => {
  const card = makeCard({
    id: 'port-ssh',
    front: '¿Qué puerto usa SSH?',
    back: 'TCP 22.',
  });

  it('muestra la pregunta y oculta la respuesta hasta revelar', async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();

    render(<FlashcardView card={card} revealed={false} onReveal={onReveal} />);

    expect(screen.getByText('¿Qué puerto usa SSH?')).toBeInTheDocument();
    expect(screen.queryByText('TCP 22.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /mostrar respuesta/i }));
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it('muestra la respuesta cuando revealed es true', () => {
    render(<FlashcardView card={card} revealed onReveal={() => undefined} />);

    expect(screen.getByText('TCP 22.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mostrar respuesta/i })).not.toBeInTheDocument();
  });

  it('expone el dominio como encabezado accesible', () => {
    render(<FlashcardView card={card} revealed={false} onReveal={() => undefined} />);

    expect(screen.getByRole('heading', { name: '¿Qué puerto usa SSH?' })).toBeInTheDocument();
    expect(screen.getByText(/Dominio 3/)).toBeInTheDocument();
  });
});
