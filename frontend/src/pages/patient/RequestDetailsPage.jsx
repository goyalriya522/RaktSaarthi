import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HeartPulse, Building2, ShieldCheck, BrainCircuit, PhoneCall, MapPin, CheckCircle2, User, FileText, Printer, ArrowLeft, Paperclip, FileCheck } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import TimelineView from '../../components/TimelineView';
import MapView from '../../components/MapView';

const RequestDetailsPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRequestDetails = async () => {
    try {
      const res = await API.get(`/requests/${id}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blood-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!data || !data.request) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Request Not Found</h2>
        <Link to="/patient/requests" className="text-blood-600 font-semibold hover:underline">
          Return to My Requests
        </Link>
      </div>
    );
  }

  const handleCancelRequest = async () => {
    if (!window.confirm('Are you sure you want to cancel this emergency request? Any reserved blood units will be automatically returned to the blood bank inventory.')) {
      return;
    }
    try {
      const res = await API.put(`/requests/${id}/status`, {
        status: 'Cancelled',
        note: 'Request cancelled by user.'
      });
      if (res.data.success) {
        alert('Blood request has been cancelled and stock released.');
        fetchRequestDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Cancellation failed');
    }
  };

  const { request, matches, aiSources } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link to="/patient/requests" className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to My Requests
        </Link>
        
        <div className="flex items-center gap-2 print:hidden">
          {request.status !== 'Fulfilled' && request.status !== 'Cancelled' && (
            <button
              onClick={handleCancelRequest}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-1.5 transition-colors"
            >
              Cancel Request
            </button>
          )}

          <button 
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" /> Print Summary Receipt
          </button>
        </div>
      </div>

      {/* Main Request Card */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <span className="w-16 h-16 rounded-3xl bg-blood-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-blood-200">
              {request.bloodGroup}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900">{request.requestNumber}</h1>
                <StatusBadge status={request.status} />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Patient: <strong>{request.patientName}</strong> ({request.age} yrs, {request.gender}) • Hospital: {request.hospitalName}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="inline-block px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-extrabold uppercase">
              {request.emergencyLevel} PRIORITY
            </span>
            <p className="text-xs text-slate-400">Required By: {new Date(request.requiredByDate).toLocaleString()}</p>
          </div>
        </div>

        {/* Timeline Stepper Component */}
        <TimelineView status={request.status} history={request.statusHistory} />

        {/* Interactive Tactical Radar Map */}
        <MapView 
          center={request.hospitalLocation?.coordinates || [77.2090, 28.6139]}
          patientLocation={{
            name: request.hospitalName,
            address: request.hospitalAddress,
            coordinates: request.hospitalLocation?.coordinates || [77.2090, 28.6139]
          }}
          bloodBanks={aiSources?.bloodBanks || []}
          donors={aiSources?.donors || []}
          title={`Dispatch Radar: ${request.patientName} (${request.bloodGroup})`}
        />

        {/* AI Decision Support Insights Box */}
        {request.aiAnalysis && (
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blood-400 text-xs font-bold uppercase tracking-wider">
                <BrainCircuit className="w-4 h-4 animate-pulse" /> AI Smart Coordination Recommendation
              </div>
              <span className="text-xs bg-white/10 px-2.5 py-0.5 rounded font-mono text-emerald-300">
                Confidence Score: {request.aiAnalysis.confidence}%
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {request.aiAnalysis.recommendations}
            </p>
          </div>
        )}

        {/* Clinical Info, Attachments & Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 text-xs text-slate-700">
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Patient & Hospital Information</h4>
            <p><strong>Hospital Address:</strong> {request.hospitalAddress}</p>
            <p><strong>Clinical Reason:</strong> {request.reason}</p>
            <p><strong>Required Units:</strong> {request.unitsRequired} Units</p>

            {/* Uploaded Supporting Medical Documentation */}
            {request.supportingDocs && request.supportingDocs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <h5 className="font-bold text-slate-900 text-[11px] flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5 text-blood-600" /> Uploaded Prescription & Docs
                </h5>
                <div className="mt-2 space-y-1.5">
                  {request.supportingDocs.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-slate-800">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        {doc.name || `Medical_Requisition_${i+1}.pdf`}
                      </span>
                      <a 
                        href={doc.url || '#'} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blood-600 font-bold hover:underline"
                      >
                        View Doc
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Emergency Contact</h4>
            <p><strong>Contact Person:</strong> {request.contactName}</p>
            <p className="flex items-center gap-1 text-blood-600 font-semibold">
              <PhoneCall className="w-3.5 h-3.5" /> {request.contactPhone}
            </p>
            {request.verifiedByHospital && (
              <p className="text-emerald-700 font-medium flex items-center gap-1 mt-2">
                <ShieldCheck className="w-4 h-4" /> Verified by Hospital ER Staff
              </p>
            )}
          </div>
        </div>

        {/* AI Matched Sources Section */}
        <div className="space-y-4">
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blood-600" /> Matched Regional Blood Banks
          </h3>

          {aiSources && aiSources.bloodBanks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {aiSources.bloodBanks.map((match, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">{match.bloodBank.name}</h4>
                    <span className="px-2 py-0.5 bg-blood-50 text-blood-700 font-extrabold rounded">
                      Score: {match.compatibilityScore}%
                    </span>
                  </div>
                  <p className="text-slate-500">{match.bloodBank.address}, {match.bloodBank.city}</p>
                  <div className="flex items-center justify-between text-slate-700 font-semibold pt-1 border-t border-slate-100">
                    <span>Available Stock: <strong>{match.availableUnits} units</strong></span>
                    <span className="text-slate-400">~{match.distanceKm} km away</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">No compatible blood banks matched currently.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDetailsPage;

