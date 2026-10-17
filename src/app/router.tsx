import { createBrowserRouter } from 'react-router-dom';
import { DashboardPage } from '@/features/dashboard/ui/DashboardPage';
import { ReviewPage } from '@/features/srs/ui/ReviewPage';
import { AppShell } from './layout/AppShell';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'review', element: <ReviewPage /> },
    ],
  },
]);
