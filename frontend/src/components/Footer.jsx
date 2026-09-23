import React from 'react';
import { HeartPulse, ShieldCheck, Lock, PhoneCall } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blood-600 flex items-center justify-center text-white font-bold">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                Rakt<span className="text-blood-500">Saarthi</span>
              </span>
            </div>
            <p className="text-xs font-semibold text-blood-400">
              Connecting hope when it matters most
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bridging the emergency blood coordination gap across patients, hospitals, blood banks, and donors with AI intelligence and real-time transparency.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Portals</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/availability" className="hover:text-white transition-colors">Live Stock Search</Link></li>
              <li><Link to="/patient/create-request" className="hover:text-white transition-colors">Emergency Blood Request</Link></li>
              <li><Link to="/patient/thalassemia" className="hover:text-white transition-colors">Thalassemia Transfusion Schedule</Link></li>
              <li><Link to="/donor/dashboard" className="hover:text-white transition-colors">Donor Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Authorized Access</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/login" className="hover:text-white transition-colors">Hospital Staff Portal</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Blood Bank Portal</Link></li>
              <li><Link to="/admin/login" className="hover:text-white transition-colors text-amber-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> System Admin (/admin)
              </Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Emergency Support</h4>
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                <PhoneCall className="w-4 h-4" /> 24/7 Helpline: 1800-RAKT-SAARTHI
              </div>
              <p className="text-[11px] text-slate-400">
                Central emergency hotline for urgent hospital blood dispatches.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
          <p>© 2026 RaktSaarthi Smart Blood Coordination System. All rights reserved. Powered by MongoDB Atlas & AI Decision Support.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
