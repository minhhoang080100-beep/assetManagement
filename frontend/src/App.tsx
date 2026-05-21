import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EquipmentList from './pages/EquipmentList';
import EquipmentDetail from './pages/EquipmentDetail';
import RepairRequest from './pages/RepairRequest';
import ProcurementRequest from './pages/ProcurementRequest';
import AuditLogPage from './pages/AuditLogPage';
import MaintenancePlanPage from './pages/MaintenancePlanPage';
import InventoryDisposalPage from './pages/InventoryDisposalPage';
import LoginPage from './pages/LoginPage';
import type { AuthUser } from './lib/types';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        return JSON.parse(savedUser) as AuthUser;
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return null;
  });

  // Lắng nghe event logout từ api.ts khi token hết hạn (401)
  useEffect(() => {
    const onForceLogout = () => {
      setUser(null);
      queryClient.clear();
    };
    window.addEventListener('auth:logout', onForceLogout);
    return () => window.removeEventListener('auth:logout', onForceLogout);
  }, []);

  const handleLogin = (userData: AuthUser, jwtToken: string) => {
    setUser(userData);
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    queryClient.clear();
  };

  // Chưa đăng nhập → hiển thị trang Login
  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<LoginPage onLogin={handleLogin} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Đã đăng nhập → hiển thị ứng dụng chính
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout user={user} onLogout={handleLogout} />}>
            <Route index element={<Dashboard />} />
            <Route path="equipment" element={<EquipmentList />} />
            <Route path="equipment/:id" element={<EquipmentDetail />} />
            <Route path="maintenance" element={<RepairRequest />} />
            <Route path="procurement" element={<ProcurementRequest />} />
            <Route path="maintenance-plan" element={<MaintenancePlanPage />} />
            <Route path="inventory" element={<InventoryDisposalPage />} />
            <Route path="audit" element={<AuditLogPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
