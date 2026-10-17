/**
 * Comparación de respuestas por conjuntos de IDs.
 *
 * Regla única para todo el proyecto: una respuesta es correcta solo si el
 * conjunto seleccionado coincide **exactamente** con el correcto. En preguntas
 * de respuesta múltiple no vale acertar una parte, y no se premia marcar todo.
 */

export function matchesCorrectSet(
  correctOptionIds: readonly string[],
  selectedOptionIds: readonly string[],
): boolean {
  const correct = new Set(correctOptionIds);
  if (correct.size === 0) return false;
  if (selectedOptionIds.length !== correct.size) return false;
  return selectedOptionIds.every((id) => correct.has(id));
}
