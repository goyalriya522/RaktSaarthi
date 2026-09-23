import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Clock, MapPin, ChevronRight, Activity, Building2, WifiOff, CloudUpload } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { useOffline } from '../../context/OfflineContext';

const MyRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOnline, getCachedData, setCachedData, getPendingOfflineRequests, syncStatus, triggerSync } = useOffline();

  const loadRequests = async () => {
    setLoading(true);
    let serverReqs = [];

    if (navigator.onLine) {
      try {
        const res = await API.get('/requests', { params: { mineOnly: 'true' } });
        if (res.data.success) {
          serverReqs = res.data.requests || [];
          await setCachedData('my_requests', serverReqs);
        }
      } catch (err) {
        console.error('Fetch requests network error:', err);
        // Fallback to cached requests
        const cached = await getCachedData('my_requests');
        serverReqs = cached || [];
      }
    } else {
      // Offline mode: Load cached requests
      const cached = await getCachedData('my_requests');
      serverReqs = cached || [];
    }

    // Retrieve offline created requests from local IndexedDB sync queue
    const offlineReqs = await getPendingOfflineRequests();

    // Merge offline requests (filtering out duplicates if already synced on server)
    const syncedClientReqIds = new Set(serverReqs.map(r => r.clientRequestId).filter(Boolean));
    const pendingOfflineOnly = offlineReqs.filter(o => !syncedClientReqIds.has(o.clientRequestId) && o.status !== 'Synced');

    const combined = [...pendingOfflineOnly, ...serverReqs];
    setRequests(combined);
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, [isOnline, syncStatus]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">My Emergency Blood Requests</h1>
            {!isOnline && (
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-300 flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> Offline View
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Track real-time status, matched blood banks, and fulfillment timeline</p>
        </div>

        <div className="flex items-center gap-2">
          {isOnline && (
            <button
              onClick={triggerSync}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-300"
            >
              <CloudUpload className="w-4 h-4 text-blood-600" /> Trigger Sync
            </button>
          )}
          <Link
            to="/patient/create-request"
            className="px-4 py-2.5 bg-blood-600 hover:bg-blood-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shrink-0 shadow-md shadow-blood-200"
          >
            <PlusCircle className="w-4 h-4" /> Create New Request
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blood-600 border-t-transparent"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <Clock className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No requests submitted yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Need emergency blood for yourself or a family member? Submit a request to initiate immediate AI matching.
          </p>
          <Link
            to="/patient/create-request"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blood-600 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <PlusCircle className="w-4 h-4" /> Create Blood Request Now
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req._id || req.clientRequestId} className={`bg-white rounded-3xl p-6 border shadow-sm hover:shadow-md transition-shadow space-y-4 ${
              req.isOfflineRecord ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-blood-100 text-blood-700 font-black text-xl flex items-center justify-center border border-blood-200">
                    {req.bloodGroup}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-base">{req.requestNumber}</h3>
                      <StatusBadge status={req.status} />
                      {req.isOfflineRecord && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                          Saved Offline
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">Patient: <strong>{req.patientName}</strong> ({req.age} yrs, {req.gender})</p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs">
                  <span className="inline-block px-2.5 py-0.5 rounded font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200 mb-1">
                    {req.emergencyLevel} PRIORITY
                  </span>
                  <p className="text-slate-400">Created: {new Date(req.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Hospital & Location</span>
                  <p className="font-semibold text-slate-900 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" /> {req.hospitalName}
                  </p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Required Units</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{req.unitsRequired} Units</p>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Reserved Source</span>
                  <p className="font-semibold text-emerald-700 mt-0.5">
                    {req.isOfflineRecord 
                      ? 'Waiting for network connection to sync...' 
                      : req.reservedBloodBank 
                        ? (req.reservedBloodBank.name || 'Blood Bank Reserved') 
                        : 'Matching in progress...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500 italic truncate max-w-md">Reason: "{req.reason}"</span>
                {!req.isOfflineRecord ? (
                  <Link
                    to={`/patient/requests/${req._id}`}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl flex items-center gap-1 transition-colors shrink-0"
                  >
                    View Details & Timeline <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="text-amber-700 font-extrabold text-[11px]">
                    Pending Sync to Backend
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyRequestsPage;

