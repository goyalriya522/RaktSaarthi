import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blood-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    if (allowedRoles.includes('admin')) {
      return <Navigate to="/admin/login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-600 max-w-md mb-6">
          Your account role ({user.role}) does not have permission to view this panel.
        </p>
        <a href="/" className="px-5 py-2.5 bg-blood-600 text-white font-semibold rounded-xl text-sm">
          Return to Home
        </a>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
