import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout.js';
import { LoginPage } from './pages/LoginPage.js';
import { RosterPage } from './pages/RosterPage.js';
import { EmployeesPage } from './pages/setup/EmployeesPage.js';
import { PodsPage } from './pages/setup/PodsPage.js';
import { BrandsPage } from './pages/setup/BrandsPage.js';
import { ProcessesPage } from './pages/setup/ProcessesPage.js';
import { AssignmentsPage } from './pages/setup/AssignmentsPage.js';
import { HolidaysPage } from './pages/setup/HolidaysPage.js';
import { LeavesPage } from './pages/setup/LeavesPage.js';
import { AuditLogsPage } from './pages/setup/AuditLogsPage.js';
import { useAuth } from './context/AuthContext.js';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white font-semibold text-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Loading Smart Roster Operations...
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Layout */}
      <Route
        path="/"
        element={user ? <Layout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to="/roster" replace />} />
        <Route path="roster" element={<RosterPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="pods" element={<PodsPage />} />
        <Route path="brands" element={<BrandsPage />} />
        <Route path="processes" element={<ProcessesPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="holidays" element={<HolidaysPage />} />
        <Route path="leaves" element={<LeavesPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/roster" replace />} />
    </Routes>
  );
};
