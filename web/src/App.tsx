import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import OnboardingBinance from './pages/OnboardingBinance';
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import Config from './pages/Config';
import Transactions from './pages/Transactions';
import Stats from './pages/Stats';
import Marketing from './pages/Marketing';

import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminCycles from './pages/admin/AdminCycles';
import AdminPacks from './pages/admin/AdminPacks';
import AdminLogs from './pages/admin/AdminLogs';
import AdminIntegrations from './pages/admin/AdminIntegrations';
import AdminPayments from './pages/admin/AdminPayments';
import AdminDanger from './pages/admin/AdminDanger';
import { AdminGuard } from './components/admin/AdminGuard';
import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Onboarding (precisa estar logado) */}
        <Route
          path="/onboarding/binance"
          element={
            <ProtectedRoute>
              <OnboardingBinance />
            </ProtectedRoute>
          }
        />

        {/* App (precisa estar logado) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stats"
          element={
            <ProtectedRoute>
              <Stats />
            </ProtectedRoute>
          }
        />
        <Route
          path="/finance"
          element={
            <ProtectedRoute>
              <Finance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketing"
          element={
            <ProtectedRoute>
              <Marketing />
            </ProtectedRoute>
          }
        />
        <Route
          path="/config"
          element={
            <ProtectedRoute>
              <Config />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin"              element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        <Route path="/admin/users"        element={<AdminGuard><AdminUsers /></AdminGuard>} />
        <Route path="/admin/transactions" element={<AdminGuard><AdminTransactions /></AdminGuard>} />
        <Route path="/admin/cycles"       element={<AdminGuard><AdminCycles /></AdminGuard>} />
        <Route path="/admin/packs"        element={<AdminGuard><AdminPacks /></AdminGuard>} />
        <Route path="/admin/logs"         element={<AdminGuard><AdminLogs /></AdminGuard>} />
        <Route path="/admin/integrations" element={<AdminGuard><AdminIntegrations /></AdminGuard>} />
        <Route path="/admin/payments"     element={<AdminGuard><AdminPayments /></AdminGuard>} />
        <Route path="/admin/danger"       element={<AdminGuard><AdminDanger /></AdminGuard>} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
