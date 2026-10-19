import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './layout/AppShell';

/**
 * Rutas cargadas de forma diferida.
 *
 * Sin esto, entrar al panel descargaba también el banco de preguntas, las
 * tarjetas, las lecciones y las PBQ. Cada sección carga lo suyo cuando se abre.
 */
const DashboardPage = lazy(() =>
  import('@/features/dashboard/ui/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);
const DiagnosticPage = lazy(() =>
  import('@/features/diagnostic/ui/DiagnosticPage').then((module) => ({
    default: module.DiagnosticPage,
  })),
);
const ExamPage = lazy(() =>
  import('@/features/exam/ui/ExamPage').then((module) => ({ default: module.ExamPage })),
);
const EvaluationPage = lazy(() =>
  import('@/features/evaluation/ui/EvaluationPage').then((module) => ({
    default: module.EvaluationPage,
  })),
);
const LessonsPage = lazy(() =>
  import('@/features/microlearning/ui/LessonsPage').then((module) => ({
    default: module.LessonsPage,
  })),
);
const LessonPage = lazy(() =>
  import('@/features/microlearning/ui/LessonPage').then((module) => ({
    default: module.LessonPage,
  })),
);
const PbqListPage = lazy(() =>
  import('@/features/pbq/ui/PbqListPage').then((module) => ({ default: module.PbqListPage })),
);
const PbqPage = lazy(() =>
  import('@/features/pbq/ui/PbqPage').then((module) => ({ default: module.PbqPage })),
);
const ReviewPage = lazy(() =>
  import('@/features/srs/ui/ReviewPage').then((module) => ({ default: module.ReviewPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/backup/ui/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'diagnostic', element: <DiagnosticPage /> },
      { path: 'evaluation', element: <EvaluationPage /> },
      { path: 'exam', element: <ExamPage /> },
      { path: 'lessons', element: <LessonsPage /> },
      { path: 'lessons/:lessonId', element: <LessonPage /> },
      { path: 'pbq', element: <PbqListPage /> },
      { path: 'pbq/:pbqId', element: <PbqPage /> },
      { path: 'review', element: <ReviewPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
