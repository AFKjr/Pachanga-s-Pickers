import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import HomePage from './components/HomePage';
import LandingPage from './components/LandingPage';
import AdminLayout from './layouts/AdminLayout';

// Lazy load all admin pages
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const GeneratePicksPage = lazy(() => import('./pages/admin/GeneratePicksPage'));
const ManagePicksPage = lazy(() => import('./pages/admin/ManagePicksPage'));
const UpdateResultsPage = lazy(() => import('./pages/admin/UpdateResultsPage'));
const TeamStatsPage = lazy(() => import('./pages/admin/TeamStatsPage'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-gray-400">Loading...</div>
  </div>
);

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route
          path="/"
          element={user ? <HomePage /> : <LandingPage />}
        />
        
        {/* Admin Routes with Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="generate" element={<GeneratePicksPage />} />
          <Route path="manage" element={<ManagePicksPage />} />
          <Route path="results" element={<UpdateResultsPage />} />
          <Route path="team-stats" element={<TeamStatsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        {/* Only show Header on non-admin routes */}
        {!isAdminRoute && <Header />}
        
        {/* Render routes with or without container based on route type */}
        {!isAdminRoute ? (
          <main className="container mx-auto px-4 py-8">
            <AppRoutes />
          </main>
        ) : (
          <AppRoutes />
        )}
      </div>
    </AuthProvider>
  );
}

export default App;