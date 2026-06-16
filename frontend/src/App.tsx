import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import type { AuthUser } from './types';
import { ToastContainer, useToast } from './components/Toast';
import Login from './pages/Login';
import PlayerDashboard from './pages/Player/Dashboard';
import AdminDashboard from './pages/Admin/Dashboard';

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('ps_user');
    return saved ? JSON.parse(saved) : null;
  });
  const { toasts, show } = useToast();

  const handleLogin = (u: AuthUser) => {
    localStorage.setItem('ps_user', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('ps_user');
    setUser(null);
  };

  return (
    <>
      <ToastContainer toasts={toasts} />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} showToast={show} />}
        />
        <Route
          path="/*"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : user.is_admin ? (
              <AdminDashboard user={user} onLogout={handleLogout} showToast={show} />
            ) : (
              <PlayerDashboard user={user} onLogout={handleLogout} showToast={show} />
            )
          }
        />
      </Routes>
    </>
  );
}

export default App;
