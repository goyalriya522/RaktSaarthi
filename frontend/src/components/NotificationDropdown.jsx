import React, { useState } from 'react';
import { Bell, CheckCheck, AlertTriangle, Activity, Calendar, ShieldAlert, Heart, ExternalLink } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { Link } from 'react-router-dom';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useSocket();

  const getIcon = (type) => {
    switch (type) {
      case 'DONOR_ELIGIBLE_ALERT':
        return <Heart className="w-4 h-4 text-rose-600 fill-rose-600 animate-pulse" />;
      case 'EMERGENCY_ALERT':
        return <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />;
      case 'THALASSEMIA_REMINDER':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'MATCH_FOUND':
        return <Activity className="w-4 h-4 text-emerald-600" />;
      case 'SYSTEM_ADMIN':
        return <ShieldAlert className="w-4 h-4 text-amber-600" />;
      default:
        return <Bell className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-blood-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-blood-600" /> Notifications
            </h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                className="text-xs text-blood-600 hover:text-blood-800 font-medium flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No notifications right now
              </div>
            ) : (
              notifications.map((n) => {
                const isEmergency = n.type === 'EMERGENCY_ALERT' || n.type === 'DONOR_ELIGIBLE_ALERT';

                return (
                  <div
                    key={n._id}
                    className={`p-3.5 transition-colors ${
                      isEmergency 
                        ? 'bg-rose-50/50 border-l-4 border-rose-600 hover:bg-rose-50' 
                        : !n.isRead 
                          ? 'bg-blood-50/30 hover:bg-slate-50' 
                          : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg border shadow-sm shrink-0 ${
                        isEmergency ? 'bg-rose-100 border-rose-200' : 'bg-white border-slate-200'
                      }`}>
                        {getIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <p className={`text-xs font-bold truncate ${isEmergency ? 'text-rose-900' : 'text-slate-900'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">{n.message}</p>
                        
                        {n.link && (
                          <div className="mt-2 text-right">
                            <Link
                              to={n.link}
                              onClick={() => setIsOpen(false)}
                              className={`inline-flex items-center gap-1 text-[11px] font-extrabold transition-colors px-2.5 py-1 rounded-lg ${
                                isEmergency
                                  ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                                  : 'bg-slate-900 text-white hover:bg-slate-800'
                              }`}
                            >
                              View Request <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;

