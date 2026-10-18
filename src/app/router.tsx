import { createBrowserRouter } from 'react-router-dom';
import { DashboardPage } from '@/features/dashboard/ui/DashboardPage';
import { DiagnosticPage } from '@/features/diagnostic/ui/DiagnosticPage';
import { LessonPage } from '@/features/microlearning/ui/LessonPage';
import { LessonsPage } from '@/features/microlearning/ui/LessonsPage';
import { PbqListPage } from '@/features/pbq/ui/PbqListPage';
import { PbqPage } from '@/features/pbq/ui/PbqPage';
import { ReviewPage } from '@/features/srs/ui/ReviewPage';
import { AppShell } from './layout/AppShell';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'diagnostic', element: <DiagnosticPage /> },
      { path: 'lessons', element: <LessonsPage /> },
      { path: 'lessons/:lessonId', element: <LessonPage /> },
      { path: 'pbq', element: <PbqListPage /> },
      { path: 'pbq/:pbqId', element: <PbqPage /> },
      { path: 'review', element: <ReviewPage /> },
    ],
  },
]);
