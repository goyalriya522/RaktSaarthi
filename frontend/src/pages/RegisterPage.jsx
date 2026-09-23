import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HeartPulse, User, Building2, ShieldCheck, Heart, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const [role, setRole] = useState('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Extra profile fields
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [hospitalName, setHospitalName] = useState('');
  const [bloodBankName, setBloodBankName] = useState('');
  const [city, setCity] = useState('Delhi-NCR');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        password,
        phone,
        role,
        profileData: {
          bloodGroup,
          hospitalName: role === 'hospital' ? hospitalName : name,
          name: role === 'bloodbank' ? bloodBankName : name,
          city,
          isDonor: role === 'patient'
        }
      };

      const res = await register(payload);
      if (res.success) {
        if (role === 'hospital') navigate('/hospital/dashboard');
        else if (role === 'bloodbank') navigate('/blood-bank/dashboard');
        else navigate('/patient/requests');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-6 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blood-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blood-200">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Join RaktSaarthi Platform</h2>
          <p className="text-xs font-semibold text-blood-600">Connecting hope when it matters most</p>
          <p className="text-[11px] text-slate-500">Select your role to configure your operational account</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole('patient')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${role === 'patient' ? 'bg-white text-blood-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Patient / Donor
          </button>
          <button
            type="button"
            onClick={() => setRole('hospital')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${role === 'hospital' ? 'bg-white text-blood-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Hospital Staff
          </button>
          <button
            type="button"
            onClick={() => setRole('bloodbank')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${role === 'bloodbank' ? 'bg-white text-blood-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Blood Bank
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name / Contact Person</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. John Doe"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@hospital.org"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
            />
          </div>

          {/* Conditional Role Inputs */}
          {role === 'patient' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City / Region</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Delhi-NCR"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          {role === 'hospital' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Official Name</label>
              <input
                type="text"
                required
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="Metro Apex Super-Specialty Hospital"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
              />
            </div>
          )}

          {role === 'bloodbank' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Bank Facility Name</label>
              <input
                type="text"
                required
                value={bloodBankName}
                onChange={(e) => setBloodBankName(e.target.value)}
                placeholder="Regional Red Cross Blood Transfusion Bank"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blood-600 hover:bg-blood-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blood-200 transition-all disabled:opacity-50 mt-4"
          >
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already registered? <Link to="/login" className="text-blood-600 font-bold hover:underline">Sign In here</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
