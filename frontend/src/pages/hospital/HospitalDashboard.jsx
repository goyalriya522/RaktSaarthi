import React, { useState, useEffect } from 'react';
import { Building2, ShieldCheck, Clock, AlertTriangle, CheckCircle2, Search, BrainCircuit, Activity, PackageCheck, Eye } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const HospitalDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedReq, setSelectedReq] = useState(null);

  const fetchRequests = async () => {
    try {
      const res = await API.get('/requests');
      if (res.data.success) {
        setRequests(res.data.requests);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleVerify = async (reqId) => {
    try {
      const res = await API.put(`/requests/${reqId}/verify`, { note: 'ER Hospital Staff verified diagnosis & blood requirement.' });
      if (res.data.success) {
        alert('Request verified successfully! AI source matching activated.');
        fetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleFulfill = async (reqId) => {
    try {
      const res = await API.put(`/requests/${reqId}/fulfill`, { note: 'Blood received at hospital. Transfusion completed.' });
      if (res.data.success) {
        alert('Request marked as Fulfilled! Inventory updated.');
        fetchRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Fulfillment failed');
    }
  };

  // Metrics
  const pendingCount = requests.filter(r => r.status === 'Submitted' || r.status === 'Under Verification').length;
  const urgentCount = requests.filter(r => r.emergencyLevel === 'CRITICAL').length;
  const reservedCount = requests.filter(r => r.status === 'Reserved').length;
  const fulfilledCount = requests.filter(r => r.status === 'Fulfilled').length;

  const filtered = requests.filter(r => {
    if (activeTab === 'PENDING') return r.status === 'Submitted' || r.status === 'Under Verification';
    if (activeTab === 'URGENT') return r.emergencyLevel === 'CRITICAL';
    if (activeTab === 'RESERVED') return r.status === 'Reserved';
    if (activeTab === 'FULFILLED') return r.status === 'Fulfilled';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Dashboard Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 p-8 rounded-3xl text-white space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" /> AUTHORIZED HOSPITAL STAFF COMMAND PORTAL
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Hospital Emergency Blood Dispatch</h1>
          </div>
        </div>

        {/* 6 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
            <p className="text-xs text-slate-400 font-semibold uppercase">Pending Verification</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{pendingCount}</p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
            <p className="text-xs text-slate-400 font-semibold uppercase">Critical Emergency</p>
            <p className="text-2xl font-black text-rose-500 mt-1">{urgentCount}</p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
            <p className="text-xs text-slate-400 font-semibold uppercase">Blood Reserved</p>
            <p className="text-2xl font-black text-teal-400 mt-1">{reservedCount}</p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
            <p className="text-xs text-slate-400 font-semibold uppercase">Completed Fulfilled</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">{fulfilledCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { key: 'ALL', label: 'All Requests' },
          { key: 'PENDING', label: 'Awaiting Verification' },
          { key: 'URGENT', label: 'Critical ICU' },
          { key: 'RESERVED', label: 'Reserved / In-Transit' },
          { key: 'FULFILLED', label: 'Completed' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === t.key ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-600 border-t-transparent"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <Clock className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No requests in this view</h3>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {filtered.map((req) => (
            <div key={req._id} className="p-6 hover:bg-slate-50/80 transition-colors space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-blood-100 text-blood-700 font-black text-xl flex items-center justify-center border border-blood-200">
                    {req.bloodGroup}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base">{req.requestNumber}</h3>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Patient: <strong>{req.patientName}</strong> ({req.age} yrs) • Required Units: <strong>{req.unitsRequired} Units</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {req.status === 'Submitted' && (
                    <button
                      onClick={() => handleVerify(req._id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 flex items-center gap-1.5 transition-all"
                    >
                      <ShieldCheck className="w-4 h-4" /> Verify Requirement
                    </button>
                  )}

                  {req.status === 'Reserved' && (
                    <button
                      onClick={() => handleFulfill(req._id)}
                      className="px-4 py-2 bg-blood-600 hover:bg-blood-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blood-200 flex items-center gap-1.5 transition-all"
                    >
                      <PackageCheck className="w-4 h-4" /> Confirm Received & Fulfill
                    </button>
                  )}
                </div>
              </div>

              {/* AI Prediction Bar */}
              {req.aiAnalysis && (
                <div className="bg-slate-900 p-3 rounded-xl text-white text-xs flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-blood-400 shrink-0" />
                    <span><strong>AI Urgency Score:</strong> {req.aiAnalysis.priorityScore}/100</span>
                  </div>
                  <span className="text-slate-300 text-[11px] truncate max-w-xl">{req.aiAnalysis.recommendations}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;
