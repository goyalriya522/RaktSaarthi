import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { HeartPulse, PlusCircle, Building2, ShieldCheck, Heart, LogOut, User as UserIcon, Calendar, Activity, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/OfflineContext';
import NotificationDropdown from './NotificationDropdown';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isOnline, syncStatus } = useOffline();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdminPage = location.pathname.startsWith('/admin');

  if (isAdminPage && user?.role === 'admin') {
    return null; // Admin uses dedicated Admin Navbar inside Admin Dashboard
  }

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blood-600 to-blood-800 flex items-center justify-center text-white shadow-md shadow-blood-200 group-hover:scale-105 transition-transform">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-1">
                Rakt<span className="text-blood-600">Saarthi</span>
              </span>
              <span className="block text-[10px] text-blood-600 font-bold -mt-1 tracking-tight">
                Connecting hope when it matters most
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/availability" className="hover:text-blood-600 transition-colors flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blood-600" /> Live Availability
            </Link>
            
            {user?.role === 'patient' && (
              <>
                <Link to="/patient/create-request" className="hover:text-blood-600 transition-colors flex items-center gap-1.5 text-blood-600 font-semibold">
                  <PlusCircle className="w-4 h-4" /> Request Blood
                </Link>
                <Link to="/patient/requests" className="hover:text-blood-600 transition-colors">
                  My Requests
                </Link>
                <Link to="/patient/thalassemia" className="hover:text-blood-600 transition-colors flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-600" /> Thalassemia Care
                </Link>
              </>
            )}

            {user?.role === 'hospital' && (
              <Link to="/hospital/dashboard" className="text-blood-600 font-semibold flex items-center gap-1.5 bg-blood-50 px-3 py-1.5 rounded-lg border border-blood-200">
                <Building2 className="w-4 h-4" /> Hospital Command Dashboard
              </Link>
            )}

            {user?.role === 'bloodbank' && (
              <Link to="/blood-bank/dashboard" className="text-blood-600 font-semibold flex items-center gap-1.5 bg-blood-50 px-3 py-1.5 rounded-lg border border-blood-200">
                <ShieldCheck className="w-4 h-4" /> Blood Bank Control Portal
              </Link>
            )}

            {user?.role === 'patient' && (
              <Link to="/donor/dashboard" className="hover:text-blood-600 transition-colors flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-rose-500" /> Donor Hub
              </Link>
            )}
          </div>

          {/* User Controls, Network Indicator & Notifications */}
          <div className="flex items-center gap-3">
            {/* ONLINE / OFFLINE Status Indicator */}
            <div className="flex items-center">
              {isOnline ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase flex items-center gap-1.5 border border-emerald-200 shadow-sm" title="Connected to RaktSaarthi Server">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> ONLINE
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black uppercase flex items-center gap-1.5 border border-amber-300 shadow-sm" title="Disconnected - Operating in Offline Storage Mode">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span> OFFLINE
                </span>
              )}
            </div>

            {user ? (
              <>
                <NotificationDropdown />
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
                    <span className="inline-block text-[10px] uppercase font-semibold text-blood-600 bg-blood-50 px-1.5 py-0.5 rounded">
                      {user.role}
                    </span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-blood-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  to="/register"
                  className="px-4 py-2 text-xs font-semibold bg-blood-600 hover:bg-blood-700 text-white rounded-xl shadow-md shadow-blood-200 transition-all hover:shadow-lg"
                >
                  Register Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

