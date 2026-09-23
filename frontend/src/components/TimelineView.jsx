import React from 'react';
import { CheckCircle2, Clock, ShieldCheck, Search, Building2, PackageCheck, CheckCircle } from 'lucide-react';

const STEPS = [
  { key: 'Submitted', label: 'Request Submitted', icon: Clock },
  { key: 'Verified', label: 'Hospital Verified', icon: ShieldCheck },
  { key: 'Searching', label: 'AI Matching', icon: Search },
  { key: 'Reserved', label: 'Blood Bank Reserved', icon: Building2 },
  { key: 'Blood Received', label: 'Blood Received', icon: PackageCheck },
  { key: 'Fulfilled', label: 'Fulfilled', icon: CheckCircle },
];

const TimelineView = ({ status, history = [] }) => {
  const getStepIndex = (currentStatus) => {
    switch (currentStatus) {
      case 'Submitted': return 0;
      case 'Under Verification': return 0;
      case 'Verified': return 1;
      case 'Searching': return 2;
      case 'Matched': return 2;
      case 'Reserved': return 3;
      case 'Blood Received': return 4;
      case 'Fulfilled': return 5;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(status);

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
        <div 
          className="absolute top-1/2 left-0 h-1 bg-blood-600 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
        ></div>

        {STEPS.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center group">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isDone 
                    ? 'bg-blood-600 border-blood-600 text-white shadow-md shadow-blood-200' 
                    : 'bg-white border-slate-300 text-slate-400'
                } ${isCurrent ? 'ring-4 ring-blood-100 scale-110' : ''}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={`mt-2 text-xs font-medium text-center ${isDone ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* History Log Timeline */}
      {history.length > 0 && (
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Lifecycle Event Log</h4>
          <div className="space-y-3">
            {history.map((item, idx) => (
              <div key={idx} className="flex items-start text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <CheckCircle2 className="w-4 h-4 text-blood-600 mt-0.5 mr-2 shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between font-medium text-slate-900">
                    <span>{item.status} ({item.role || 'User'})</span>
                    <span className="text-slate-400">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {item.note && <p className="text-slate-500 mt-0.5">{item.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineView;
