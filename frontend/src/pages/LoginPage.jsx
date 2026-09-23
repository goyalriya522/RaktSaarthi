import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HeartPulse, Lock, Mail, AlertCircle, Building2, ShieldCheck, User, Heart, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        const role = res.user.role;
        if (role === 'hospital') navigate('/hospital/dashboard');
        else if (role === 'bloodbank') navigate('/blood-bank/dashboard');
        else if (role === 'admin') navigate('/admin');
        else navigate('/patient/requests');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blood-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blood-200">
            <HeartPulse className="w-7 h-7 animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Sign In to RaktSaarthi</h2>
          <p className="text-xs font-semibold text-blood-600">Connecting hope when it matters most</p>
          <p className="text-[11px] text-slate-500">Access your role-specific dashboard & coordination controls</p>
        </div>

        {/* Quick Demo Credentials Bar */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <HeartPulse className="w-3.5 h-3.5 text-blood-600" /> Quick Demo 1-Click Login
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickDemo('patient@bloodlink.org', 'Patient@123')}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-700 text-left flex items-center gap-1.5 transition-colors"
            >
              <User className="w-3.5 h-3.5 text-blue-600" /> Patient / Family
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('cityhospital@bloodlink.org', 'Hospital@123')}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-700 text-left flex items-center gap-1.5 transition-colors"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Hospital Staff
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('centralbank@bloodlink.org', 'Bank@123')}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-700 text-left flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Blood Bank
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('donor1@bloodlink.org', 'Donor@123')}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-700 text-left flex items-center gap-1.5 transition-colors"
            >
              <Heart className="w-3.5 h-3.5 text-rose-600" /> Volunteer Donor
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.org"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blood-600 hover:bg-blood-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blood-200 transition-all disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-100">
          <Link to="/register" className="hover:text-blood-600 font-medium">Create new account</Link>
          <Link to="/admin/login" className="text-amber-600 font-bold hover:underline flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Admin Route (/admin)
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
