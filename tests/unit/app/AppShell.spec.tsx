import { afterEach, describe, expect, it } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/app/layout/AppShell';
import { applyThemeDom, useThemeStore } from '@/app/theme/themeStore';
import { renderWithProviders, settle } from '../../helpers/render';

afterEach(() => {
  act(() => {
    useThemeStore.setState({ mode: 'dark' });
  });
  applyThemeDom('dark');
  window.localStorage.clear();
});

function renderShell() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<AppShell />} />
    </Routes>,
  );
}

describe('AppShell', () => {
  it('expone la navegación principal con sus cuatro secciones', async () => {
    renderShell();
    await settle();

    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(nav).toBeInTheDocument();

    for (const label of ['Panel', 'Diagnóstico', 'Lecciones', 'Repaso']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('marca la sección activa para lectores de pantalla', async () => {
    renderShell();
    await settle();

    expect(screen.getByRole('link', { name: 'Panel' })).toHaveAttribute('aria-current', 'page');
  });

  it('alterna entre tema claro y oscuro', async () => {
    renderShell();
    await settle();

    const before = document.documentElement.getAttribute('data-theme');
    const toggle = screen.getByRole('button', { name: /tema/i });
    const labelBefore = toggle.getAttribute('aria-label');

    fireEvent.click(toggle);

    const after = document.documentElement.getAttribute('data-theme');
    expect(after).not.toBe(before);
    expect(after === 'light' || after === 'dark').toBe(true);

    // El botón describe la ACCIÓN disponible, así que su etiqueta cambia.
    const labelAfter = screen.getByRole('button', { name: /tema/i }).getAttribute('aria-label');
    expect(labelAfter).not.toBe(labelBefore);
  });

  it('incluye el enlace para saltar al contenido principal', async () => {
    renderShell();
    await settle();

    expect(screen.getByRole('link', { name: /saltar al contenido/i })).toHaveAttribute(
      'href',
      '#main-content',
    );
    expect(document.getElementById('main-content')).not.toBeNull();
  });

  it('avisa en la cabecera de que el material no es oficial', async () => {
    renderShell();
    await settle();

    const badge = screen.getByText('No oficial');
    expect(badge).toHaveAttribute('title', expect.stringMatching(/afiliado/i));
  });

  it('identifica la app y su objetivo en la cabecera', async () => {
    renderShell();
    await settle();

    expect(screen.getByText('ShieldUp')).toBeInTheDocument();
    expect(screen.getByText('Security+ SY0-701')).toBeInTheDocument();
  });

  it('deja claro en el pie que no hay afiliación con CompTIA', async () => {
    renderShell();
    await settle();

    expect(screen.getByText(/no está afiliado ni respaldado por CompTIA/i)).toBeInTheDocument();
  });
});
