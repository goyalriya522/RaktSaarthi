import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, PlusCircle, Search, ShieldCheck, Activity, BrainCircuit, Users, Building2, Clock, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

const HomePage = () => {
  const [availability, setAvailability] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState({ totalExpiringSoon: 0, criticalWarning: false, groupedAlerts: [], items: [] });
  const [stats, setStats] = useState({ totalUnits: 145, activeBanks: 12, hospitals: 24, fulfilled: 189 });
  const { user } = useAuth();

  useEffect(() => {
    const fetchQuickData = async () => {
      try {
        const res = await API.get('/inventory/availability');
        if (res.data.success) {
          setAvailability(res.data.inventories.slice(0, 6));
          if (res.data.expiryAlerts) {
            setExpiryAlerts(res.data.expiryAlerts);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchQuickData();
  }, []);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 bg-gradient-to-b from-blood-50/60 via-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 bg-blood-100/80 border border-blood-200 px-3.5 py-1.5 rounded-full text-xs font-bold text-blood-700">
                <BrainCircuit className="w-4 h-4 text-blood-600 animate-pulse" />
                Connecting hope when it matters most
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Bridging the Gap Between <span className="gradient-text">Blood Availability</span> & Patient Emergency.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                When seconds count, RaktSaarthi replaces fragmented phone calls with a single transparent digital coordination layer connecting <strong>Patients, Hospitals, Blood Banks, and Donors</strong> in real time.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  to="/patient/create-request"
                  className="px-6 py-3.5 bg-blood-600 hover:bg-blood-700 text-white font-bold rounded-xl shadow-xl shadow-blood-200 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                >
                  <PlusCircle className="w-5 h-5" /> Request Emergency Blood
                </Link>
                <Link
                  to="/availability"
                  className="px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-900 font-bold rounded-xl border border-slate-200 shadow-sm flex items-center justify-center gap-2 transition-all"
                >
                  <Search className="w-5 h-5 text-slate-500" /> Search Live Inventory
                </Link>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/80">
                <div>
                  <p className="text-2xl font-black text-slate-900">140+ Units</p>
                  <p className="text-xs text-slate-500 font-medium">Real-time Available Stock</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-blood-600">&lt; 2.4 Hours</p>
                  <p className="text-xs text-slate-500 font-medium">Avg Fulfilment Time</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-900">100%</p>
                  <p className="text-xs text-slate-500 font-medium">Transparent Verification</p>
                </div>
              </div>
            </div>

            {/* Right Card Graphics */}
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blood-500 to-amber-500 rounded-3xl blur-xl opacity-30 animate-pulse"></div>
                <div className="relative bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blood-100 text-blood-600 flex items-center justify-center font-bold">
                        O-
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">Universal Match Active</h3>
                        <p className="text-xs text-slate-500">Metro Apex Hospital • ER Room 4</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                      MATCHED
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                      <span className="font-medium flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-slate-500" /> Central Blood Bank
                      </span>
                      <span className="font-bold text-slate-900">2 Units Reserved</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
                      <span className="font-medium flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-500" /> Nearby Donors
                      </span>
                      <span className="font-bold text-emerald-600">3 Donors Responded</span>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-blood-600 to-blood-800 rounded-2xl text-white space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5"><BrainCircuit className="w-4 h-4" /> AI Coordination Advice</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">High Priority</span>
                    </div>
                    <p className="text-xs text-blood-100 leading-normal">
                      Stock reserved at Central Red Cross Blood Bank. ETA dispatch to Metro Hospital: 18 minutes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Blood Expiry Alert Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-10 relative z-20">
        {expiryAlerts.totalExpiringSoon > 0 ? (
          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-rose-950 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-amber-500/30 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                    <Clock className="w-3.5 h-3.5" /> Blood Expiry Alert
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {expiryAlerts.totalExpiringSoon} unit{expiryAlerts.totalExpiringSoon > 1 ? 's are' : ' is'} expiring within 7 days
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {expiryAlerts.criticalWarning && (
                  <span className="px-3 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-extrabold flex items-center gap-1.5 shrink-0 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Critical Expiry Warning (≤ 3 days)
                  </span>
                )}
                <Link
                  to={user?.role === 'bloodbank' || user?.role === 'admin' ? '/blood-bank/dashboard' : '/availability'}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/50 transition-all hover:scale-105 shrink-0"
                >
                  View Expiry Status <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {expiryAlerts.groupedAlerts.map((group) => {
                const isUrgent = group.minDaysRemaining <= 3;
                return (
                  <div
                    key={group.bloodGroup}
                    className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                      isUrgent
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-100 shadow-lg shadow-rose-950/30'
                        : 'bg-slate-900/90 border-amber-500/30 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center border shrink-0 ${
                        isUrgent
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {group.bloodGroup}
                      </span>
                      <div>
                        <p className="font-extrabold text-sm">{group.bloodGroup} • {group.units} unit{group.units > 1 ? 's' : ''}</p>
                        <p className={`text-xs font-semibold ${isUrgent ? 'text-rose-300 font-bold' : 'text-amber-300/90'}`}>
                          {group.minDaysRemaining <= 0
                            ? 'expires today'
                            : `${group.minDaysRemaining} day${group.minDaysRemaining > 1 ? 's' : ''} left`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Blood Expiry Status</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">No critical blood expiry alerts.</h3>
                <p className="text-xs text-slate-500 mt-0.5">All monitored blood inventory across verified banks currently has safe, valid expiration dates.</p>
              </div>
            </div>

            <Link
              to={user?.role === 'bloodbank' || user?.role === 'admin' ? '/blood-bank/dashboard' : '/availability'}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
            >
              View Expiry Status <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </section>

      {/* AI Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Smart AI Healthcare Coordination Features
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            AI integrated directly into critical workflow decision steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blood-50 text-blood-600 flex items-center justify-center font-bold">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Smart Source Matching</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Analyzes blood group compatibility matrix, proximity distance, available stock levels, and donor response likelihood to present ranked sources.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Emergency Priority Classifier</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Classifies submitted requirements into Critical, Urgent, and Routine urgency levels to help hospital triage emergency surgical cases faster.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Smart Thalassemia Reminders</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Calculates expected transfusion dates based on patient transfusion cycles and triggers advance reminders to arrange blood prior to due date.
            </p>
          </div>
        </div>
      </section>

      {/* Central Availability Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold">Central Blood Stock Dashboard</h2>
              <p className="text-xs text-slate-400 mt-1">Live stock levels across connected regional blood banks</p>
            </div>
            <Link 
              to="/availability"
              className="px-4 py-2 bg-blood-600 hover:bg-blood-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              View Full Availability Grid <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {['O-', 'O+', 'A+', 'B+', 'A-', 'AB+'].map((group) => {
              const item = availability.find(i => i.bloodGroup === group);
              const units = item ? item.availableUnits : 12;

              return (
                <div key={group} className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-lg bg-blood-600/30 text-blood-400 font-extrabold flex items-center justify-center text-sm border border-blood-500/30">
                      {group}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${units > 10 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {units > 10 ? 'Available' : 'Low Stock'}
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-black text-white">{units} <span className="text-xs font-normal text-slate-400">units</span></p>
                    <p className="text-[11px] text-slate-400 truncate">Central Blood Bank</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
