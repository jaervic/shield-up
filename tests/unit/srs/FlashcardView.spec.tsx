import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FlashcardView } from '@/features/srs/ui/FlashcardView';
import { makeCard } from '../../helpers/card';

describe('FlashcardView', () => {
  const card = makeCard({
    id: 'port-ssh',
    front: '¿Qué puerto usa SSH?',
    back: 'TCP 22.',
    hint: 'Piensa en la alternativa segura a Telnet.',
  });

  it('muestra la pregunta y oculta la respuesta hasta revelar', () => {
    render(<FlashcardView card={card} revealed={false} />);

    expect(screen.getByText('¿Qué puerto usa SSH?')).toBeInTheDocument();
    expect(screen.queryByText('TCP 22.')).not.toBeInTheDocument();
  });

  it('muestra la respuesta cuando revealed es true', () => {
    render(<FlashcardView card={card} revealed />);

    expect(screen.getByText('TCP 22.')).toBeInTheDocument();
    expect(screen.getByText('Respuesta')).toBeInTheDocument();
  });

  it('muestra la pista solo mientras la respuesta está oculta', () => {
    const { rerender } = render(<FlashcardView card={card} revealed={false} />);

    expect(screen.getByText(/alternativa segura a Telnet/i)).toBeInTheDocument();

    rerender(<FlashcardView card={card} revealed />);
    expect(screen.queryByText(/alternativa segura a Telnet/i)).not.toBeInTheDocument();
  });

  it('expone el dominio y el tipo de tarjeta', () => {
    render(<FlashcardView card={card} revealed={false} />);

    expect(screen.getByRole('heading', { name: '¿Qué puerto usa SSH?' })).toBeInTheDocument();
    expect(screen.getByText(/Dominio 3/)).toBeInTheDocument();
    expect(screen.getByText('Puertos')).toBeInTheDocument();
  });
});
