/**
 * Modo concentración.
 *
 * Estado de UI compartido entre el shell y la sesión de repaso: mientras hay
 * una sesión activa, la cabecera deja de ser fija y el pie desaparece, para que
 * el contenido tenga el máximo espacio.
 *
 * Deliberadamente NO oculta la navegación: quitarla dejaría al usuario sin vía
 * de salida y a quien navega con teclado sin referencia.
 */

import { create } from 'zustand';

export interface FocusModeState {
  active: boolean;
  setActive: (active: boolean) => void;
}

export const useFocusMode = create<FocusModeState>((set) => ({
  active: false,
  setActive(active) {
    set({ active });
  },
}));
