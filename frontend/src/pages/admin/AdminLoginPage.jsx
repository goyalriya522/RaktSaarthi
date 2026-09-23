import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, Mail, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminLoginPage = () => {
  const [email, setEmail] = useState('admin@bloodlink.org');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await adminLogin(email, password);
      if (res.success) {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blood-600 to-rose-900 text-white flex items-center justify-center mx-auto shadow-xl shadow-blood-950">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase">
            <Sparkles className="w-3 h-3" /> Dedicated Admin Route (/admin)
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">RaktSaarthi System Control Console</h2>
          <p className="text-xs text-blood-400 font-semibold">Connecting hope when it matters most</p>
          <p className="text-[11px] text-slate-400">Authenticated administrative personnel authorization</p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blood-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Passphrase</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blood-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blood-600 hover:bg-blood-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blood-950 transition-all"
          >
            {loading ? 'Authenticating System Access...' : 'Authorize Admin Console'}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-500">
          Demo Admin Credentials: <code className="text-amber-400">admin@bloodlink.org / Admin@123</code>
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
