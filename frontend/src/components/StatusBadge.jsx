import React from 'react';

const StatusBadge = ({ status }) => {
  const getStyle = () => {
    switch (status) {
      case 'Pending Sync':
        return 'bg-amber-100 text-amber-900 border-amber-300 font-bold shadow-sm animate-pulse';
      case 'Syncing':
        return 'bg-purple-100 text-purple-900 border-purple-300 font-bold shadow-sm animate-pulse';
      case 'Synced':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
      case 'Sync Failed':
        return 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
      case 'Conflict':
        return 'bg-orange-100 text-orange-900 border-orange-300 font-bold';
      case 'Submitted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Under Verification':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Verified':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Searching':
        return 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse';
      case 'Matched':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Reserved':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Blood Received':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Fulfilled':
        return 'bg-green-100 text-green-800 border-green-300 font-semibold';
      case 'Rejected':
      case 'Cancelled':
      case 'Expired':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyle()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></span>
      {status}
    </span>
  );
};

export default StatusBadge;

