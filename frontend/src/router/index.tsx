import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '../layouts/AppLayout'
import { DashboardPage } from '../pages/DashboardPage'
import { EvaluateWorkPage } from '../pages/EvaluateWorkPage'
import { HistoryPage } from '../pages/HistoryPage'
import { ProfilePage } from '../pages/ProfilePage'
import { ReviewEvaluationPage } from '../pages/ReviewEvaluationPage'
import { RubricDetailPage } from '../pages/RubricDetailPage'
import { RubricsPage } from '../pages/RubricsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'evaluar', element: <EvaluateWorkPage /> },
      { path: 'evaluaciones/:id/revision', element: <ReviewEvaluationPage /> },
      { path: 'rubricas', element: <RubricsPage /> },
      { path: 'rubricas/:id', element: <RubricDetailPage /> },
      { path: 'historial', element: <HistoryPage /> },
      { path: 'perfil', element: <ProfilePage /> },
    ],
  },
])
