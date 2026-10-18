import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/app/ErrorBoundary';

function Boom(): never {
  throw new Error('explosión de prueba');
}

function Fine() {
  return <p>contenido intacto</p>;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('muestra el contenido cuando no hay fallo', () => {
    render(
      <ErrorBoundary>
        <Fine />
      </ErrorBoundary>,
    );

    expect(screen.getByText('contenido intacto')).toBeInTheDocument();
  });

  it('muestra un mensaje en lugar de una pantalla en blanco', () => {
    // React escribe el error en consola; aquí solo genera ruido.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    act(() => {
      render(
        <ErrorBoundary scope="esta sección">
          <Boom />
        </ErrorBoundary>,
      );
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/algo se ha roto en esta sección/i);
    expect(alert).toHaveTextContent('explosión de prueba');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recargar/i })).toBeInTheDocument();
  });

  it('menciona la aplicación si no se indica el ámbito', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    act(() => {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      );
    });

    expect(screen.getByRole('alert')).toHaveTextContent(/en la aplicación/i);
  });
});
