import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import HomePage from './components/HomePage';
import AdminPanel from './components/AdminPanel';
import LandingPage from './components/LandingPage';

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
    <Routes>
      <Route
        path="/"
        element={user ? <HomePage /> : <LandingPage />}
      />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <AppRoutes />
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;