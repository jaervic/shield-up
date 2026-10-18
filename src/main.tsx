import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './styles/global.css';
import { initTheme } from '@/app/theme/themeStore';
import { ensureContentSeeded } from '@/features/srs/data/seedService';
import { ErrorBoundary } from './app/ErrorBoundary';
import { AppProviders } from './app/providers';
import { router } from './app/router';

async function bootstrap(): Promise<void> {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('No se encontró el elemento #root en index.html');
  }

  // Tema antes de pintar la app (el script inline ya evitó el FOUC).
  initTheme();

  // Primer arranque: carga el contenido seed en IndexedDB (no bloquea si falla).
  try {
    await ensureContentSeeded();
  } catch (error) {
    console.error('No se pudo inicializar el contenido:', error);
  }

  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <AppProviders>
          <RouterProvider router={router} />
        </AppProviders>
      </ErrorBoundary>
    </StrictMode>,
  );
}

void bootstrap();
