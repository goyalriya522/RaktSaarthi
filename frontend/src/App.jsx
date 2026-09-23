import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { OfflineProvider } from './context/OfflineContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import OfflineBanner from './components/OfflineBanner';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AvailabilityPage from './pages/AvailabilityPage';

// Patient Pages
import CreateRequestPage from './pages/patient/CreateRequestPage';
import MyRequestsPage from './pages/patient/MyRequestsPage';
import RequestDetailsPage from './pages/patient/RequestDetailsPage';
import ThalassemiaPage from './pages/patient/ThalassemiaPage';

// Role Dashboards
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import BloodBankDashboard from './pages/bloodbank/BloodBankDashboard';
import DonorDashboard from './pages/donor/DonorDashboard';

// Admin Pages (/admin)
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';

import AIAssistantWidget from './components/AIAssistantWidget';

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-['Plus_Jakarta_Sans',sans-serif]">
      <OfflineBanner />
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/availability" element={<AvailabilityPage />} />

          {/* Patient / User Routes */}
          <Route 
            path="/patient/create-request" 
            element={
              <ProtectedRoute allowedRoles={['patient', 'hospital', 'admin']}>
                <CreateRequestPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/patient/requests" 
            element={
              <ProtectedRoute allowedRoles={['patient', 'hospital', 'admin']}>
                <MyRequestsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/patient/requests/:id" 
            element={
              <ProtectedRoute allowedRoles={['patient', 'hospital', 'bloodbank', 'admin']}>
                <RequestDetailsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/patient/thalassemia" 
            element={
              <ProtectedRoute allowedRoles={['patient', 'hospital', 'admin']}>
                <ThalassemiaPage />
              </ProtectedRoute>
            } 
          />

          {/* Hospital Staff Portal */}
          <Route 
            path="/hospital/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['hospital', 'admin']}>
                <HospitalDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Blood Bank Staff Portal */}
          <Route 
            path="/blood-bank/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['bloodbank', 'admin']}>
                <BloodBankDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Volunteer Donor Portal */}
          <Route 
            path="/donor/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['patient', 'hospital', 'admin']}>
                <DonorDashboard />
              </ProtectedRoute>
            } 
          />

          {/* DEDICATED ADMIN SYSTEM ROUTES (/admin) */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <AIAssistantWidget />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <SocketProvider>
          <Router>
            <AppContent />
          </Router>
        </SocketProvider>
      </OfflineProvider>
    </AuthProvider>
  );
}

export default App;

