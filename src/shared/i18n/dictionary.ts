/**
 * Diccionario de la interfaz.
 *
 * El español es la fuente de verdad: `TranslationKey` se deriva de él, así que
 * **el inglés debe tener exactamente las mismas claves** o el proyecto no
 * compila. Es la garantía de que no se queda una cadena sin traducir por
 * descuido.
 *
 * Alcance: solo la INTERFAZ. El contenido de estudio (preguntas, tarjetas,
 * lecciones y PBQ) está redactado en español y se traduce como trabajo de
 * contenido, no de código.
 */

export type Language = 'es' | 'en';

export const LANGUAGES: readonly Language[] = ['es', 'en'] as const;

export const LANGUAGE_LABELS: Readonly<Record<Language, string>> = {
  es: 'Español',
  en: 'English',
};

export const LANGUAGE_STORAGE_KEY = 'shieldup.language';

const es = {
  // Marca y navegación
  'brand.tagline': 'Security+ SY0-701',
  'brand.unofficial': 'No oficial',
  'brand.unofficialTitle':
    'Material de estudio independiente. No está afiliado ni respaldado por CompTIA.',
  'nav.label': 'Navegación principal',
  'nav.dashboard': 'Panel',
  'nav.evaluation': 'Evaluación',
  'nav.diagnostic': 'Diagnóstico',
  'nav.lessons': 'Lecciones',
  'nav.pbq': 'Simulaciones',
  'nav.review': 'Repaso',

  // Hub de evaluación
  'evaluation.title': 'Evaluación',
  'evaluation.lead':
    'Mide tu punto de partida y pon a prueba lo aprendido. Estas tres actividades no se leen: se resuelven.',
  'evaluation.diagnostic.title': 'Test de diagnóstico',
  'evaluation.diagnostic.text':
    'Reparte las preguntas según el peso real de cada dominio y ordena tu ruta de estudio por impacto.',
  'evaluation.diagnostic.cta': 'Hacer el diagnóstico',
  'evaluation.exam.title': 'Simulacro de examen',
  'evaluation.exam.text':
    'Condiciones reales: cuenta atrás, preguntas marcadas y puntuación escalada sobre 900.',
  'evaluation.exam.cta': 'Hacer un simulacro',
  'evaluation.pbq.title': 'Simulaciones (PBQ)',
  'evaluation.pbq.text':
    'Coloca activos en su segmento o consigue el objetivo desde la terminal, con comandos reales.',
  'evaluation.pbq.cta': 'Ver simulaciones',

  'shell.skip': 'Saltar al contenido principal',
  'shell.loading': 'Cargando…',
  'shell.footer':
    'ShieldUp es un proyecto de estudio independiente y no está afiliado ni respaldado por CompTIA. CompTIA® y Security+® son marcas registradas de CompTIA, Inc. Verifica siempre el contenido contra las fuentes oficiales del examen.',
  'shell.footerSettings': 'Ajustes, copia de seguridad y reinicio',
  'shell.errorScope': 'esta sección',
  'shell.errorApp': 'la aplicación',
  'shell.errorTitle': 'Algo se ha roto en {scope}',
  'shell.errorText':
    'El progreso guardado no se ha tocado. Puedes intentar continuar o recargar la página.',
  'shell.retry': 'Reintentar',
  'shell.reload': 'Recargar la página',

  // Tema
  'theme.toggleToLight': 'Activar tema claro',
  'theme.toggleToDark': 'Activar tema oscuro',
  'theme.legend': 'Tema',
  'theme.light': 'Claro',
  'theme.dark': 'Oscuro',
  'theme.system': 'Sistema',
  'theme.systemHint':
    'Con «Sistema», la aplicación sigue el tema del dispositivo y cambia con él.',

  // Idioma
  'language.legend': 'Idioma',
  'language.hint': 'Solo cambia la interfaz. El contenido de estudio está en español.',

  // Simulacro de examen (avisos del cronómetro; el resto de la página sigue en español)
  'exam.timeTen': 'Quedan 10 minutos.',
  'exam.timeFive': 'Quedan 5 minutos.',
  'exam.timeOne': 'Queda 1 minuto.',

  // Ajustes
  'settings.title': 'Ajustes',
  'settings.lead':
    'Tu progreso se guarda solo en este navegador. Descárgalo de vez en cuando: es la única forma de recuperarlo si se borran los datos del dispositivo.',
  'settings.appearance': 'Apariencia',
  'settings.backup': 'Copia de seguridad',
  'settings.calculating': 'Calculando…',
  'settings.cards': '{count} tarjetas',
  'settings.reviews': '{count} repasos',
  'settings.diagnostics': '{count} diagnósticos',
  'settings.lessons': '{count} lecciones con progreso',
  'settings.pbq': '{count} intentos de PBQ',
  'settings.exams': '{count} simulacros',
  'settings.download': 'Descargar copia',
  'settings.import': 'Importar copia',
  'settings.downloaded': 'Copia descargada.',
  'settings.restored': 'Copia restaurada.',
  'settings.resetDone': 'Progreso reiniciado.',
  'settings.importTitle': 'Confirmar importación',
  'settings.importFrom': 'La copia es del {date} y tiene {count} registros.',
  'settings.importWarning': 'Al restaurarla se sustituye todo tu progreso actual.',
  'settings.importWarningExtra':
    'Si no has descargado una copia antes, hazlo ahora.',
  'settings.importConfirm': 'Sustituir mi progreso',
  'settings.importing': 'Restaurando…',
  'settings.cancel': 'Cancelar',
  'settings.danger': 'Zona de peligro',
  'settings.dangerText':
    'Reiniciar borra los repasos, el diagnóstico, el progreso de las lecciones, las PBQ y los simulacros. El mazo de tarjetas vuelve a su estado inicial.',
  'settings.resetLabel': 'Escribe {word} para confirmar',
  'settings.resetAction': 'Reiniciar todo el progreso',
  'settings.formatVersion': 'Formato de copia: v{version}',

  // Errores
  'error.download': 'No se pudo descargar la copia.',
  'error.read': 'No se pudo leer la copia.',
  'error.restore': 'No se pudo restaurar la copia.',
  'error.reset': 'No se pudo reiniciar el progreso.',
} as const;

export type TranslationKey = keyof typeof es;

/** El inglés debe cubrir TODAS las claves del español (lo comprueba el tipo). */
const en: Record<TranslationKey, string> = {
  'brand.tagline': 'Security+ SY0-701',
  'brand.unofficial': 'Unofficial',
  'brand.unofficialTitle':
    'Independent study material. Not affiliated with or endorsed by CompTIA.',
  'nav.label': 'Main navigation',
  'nav.dashboard': 'Dashboard',
  'nav.evaluation': 'Evaluation',
  'nav.diagnostic': 'Assessment',
  'nav.lessons': 'Lessons',
  'nav.pbq': 'Simulations',
  'nav.review': 'Review',

  'evaluation.title': 'Evaluation',
  'evaluation.lead':
    'Measure your starting point and test what you have learned. These three activities are not read: they are solved.',
  'evaluation.diagnostic.title': 'Diagnostic test',
  'evaluation.diagnostic.text':
    'Spreads the questions by each domain’s real exam weight and orders your study route by impact.',
  'evaluation.diagnostic.cta': 'Take the diagnostic',
  'evaluation.exam.title': 'Mock exam',
  'evaluation.exam.text':
    'Real conditions: countdown, flagged questions and a scaled score out of 900.',
  'evaluation.exam.cta': 'Take a mock exam',
  'evaluation.pbq.title': 'Simulations (PBQ)',
  'evaluation.pbq.text':
    'Place assets in their segment or reach the goal from the terminal, using real commands.',
  'evaluation.pbq.cta': 'View simulations',

  'shell.skip': 'Skip to main content',
  'shell.loading': 'Loading…',
  'shell.footer':
    'ShieldUp is an independent study project and is not affiliated with or endorsed by CompTIA. CompTIA® and Security+® are registered trademarks of CompTIA, Inc. Always check the content against the official exam sources.',
  'shell.footerSettings': 'Settings, backup and reset',
  'shell.errorScope': 'this section',
  'shell.errorApp': 'the application',
  'shell.errorTitle': 'Something broke in {scope}',
  'shell.errorText':
    'Your saved progress has not been touched. You can try to continue or reload the page.',
  'shell.retry': 'Try again',
  'shell.reload': 'Reload the page',

  'theme.toggleToLight': 'Switch to light theme',
  'theme.toggleToDark': 'Switch to dark theme',
  'theme.legend': 'Theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',
  'theme.systemHint': 'With “System”, the app follows your device theme and changes with it.',

  'language.legend': 'Language',
  'language.hint': 'Only the interface changes. The study content is in Spanish.',

  'exam.timeTen': 'Ten minutes left.',
  'exam.timeFive': 'Five minutes left.',
  'exam.timeOne': 'One minute left.',

  'settings.title': 'Settings',
  'settings.lead':
    'Your progress is stored only in this browser. Download it from time to time: it is the only way to recover it if the device data is cleared.',
  'settings.appearance': 'Appearance',
  'settings.backup': 'Backup',
  'settings.calculating': 'Calculating…',
  'settings.cards': '{count} cards',
  'settings.reviews': '{count} reviews',
  'settings.diagnostics': '{count} assessments',
  'settings.lessons': '{count} lessons in progress',
  'settings.pbq': '{count} simulation attempts',
  'settings.exams': '{count} mock exams',
  'settings.download': 'Download backup',
  'settings.import': 'Import backup',
  'settings.downloaded': 'Backup downloaded.',
  'settings.restored': 'Backup restored.',
  'settings.resetDone': 'Progress reset.',
  'settings.importTitle': 'Confirm import',
  'settings.importFrom': 'The backup is from {date} and holds {count} records.',
  'settings.importWarning': 'Restoring it replaces all of your current progress.',
  'settings.importWarningExtra': 'If you have not downloaded a backup yet, do it now.',
  'settings.importConfirm': 'Replace my progress',
  'settings.importing': 'Restoring…',
  'settings.cancel': 'Cancel',
  'settings.danger': 'Danger zone',
  'settings.dangerText':
    'Resetting erases reviews, the assessment, lesson progress, simulations and mock exams. The card deck returns to its initial state.',
  'settings.resetLabel': 'Type {word} to confirm',
  'settings.resetAction': 'Reset all progress',
  'settings.formatVersion': 'Backup format: v{version}',

  'error.download': 'The backup could not be downloaded.',
  'error.read': 'The backup could not be read.',
  'error.restore': 'The backup could not be restored.',
  'error.reset': 'Progress could not be reset.',
};

export const TRANSLATIONS: Readonly<Record<Language, Record<TranslationKey, string>>> = {
  es,
  en,
};
