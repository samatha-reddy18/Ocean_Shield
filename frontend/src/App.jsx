import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ReportHazard from './pages/ReportHazard.jsx';
import MyReports from './pages/MyReports.jsx';
import ReportDetails from './pages/ReportDetails.jsx';
import OceanMap from './pages/OceanMap.jsx';
import SatelliteMonitoring from './pages/SatelliteMonitoring.jsx';
import AIAnalysis from './pages/AIAnalysis.jsx';
import Notifications from './pages/Notifications.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public + authenticated routes under MainLayout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/map" element={<OceanMap />} />
        <Route path="/reports/:id" element={<ReportDetails />} />
        <Route path="/satellite" element={<SatelliteMonitoring />} />
        <Route path="/ai-analysis" element={<AIAnalysis />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report-hazard"
          element={
            <ProtectedRoute>
              <ReportHazard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-reports"
          element={
            <ProtectedRoute>
              <MyReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
