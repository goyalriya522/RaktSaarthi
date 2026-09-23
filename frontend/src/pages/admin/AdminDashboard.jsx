import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Building2, ShieldCheck, Heart, Activity, FileText, Bell, LogOut, Search, Radio, CheckCircle2, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { logout } = useAuth();
  const [statsData, setStatsData] = useState(null);
  const [users, setUsers] = useState([]);
  const [entities, setEntities] = useState({ hospitals: [], bloodBanks: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ANALYTICS');

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastRole, setBroadcastRole] = useState('all');

  const fetchAdminData = async () => {
    try {
      const statsRes = await API.get('/admin/stats');
      if (statsRes.data.success) {
        setStatsData(statsRes.data);
      }

      const usersRes = await API.get('/admin/users');
      if (usersRes.data.success) {
        setUsers(usersRes.data.users);
      }

      const entRes = await API.get('/admin/entities');
      if (entRes.data.success) {
        setEntities({
          hospitals: entRes.data.hospitals || [],
          bloodBanks: entRes.data.bloodBanks || []
        });
      }

      const logsRes = await API.get('/admin/audit-logs');
      if (logsRes.data.success) {
        setAuditLogs(logsRes.data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleUser = async (userId) => {
    try {
      const res = await API.put(`/admin/users/${userId}/toggle-status`);
      if (res.data.success) {
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Toggle failed');
    }
  };

  const handleVerifyEntity = async (entityType, entityId) => {
    try {
      const res = await API.put('/admin/verify-entity', { entityType, entityId });
      if (res.data.success) {
        alert('Facility verified and granted authorized access!');
        fetchAdminData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/admin/broadcast', {
        title: broadcastTitle,
        message: broadcastMessage,
        recipientRole: broadcastRole
      });
      if (res.data.success) {
        alert('Broadcast notification sent successfully!');
        setBroadcastTitle('');
        setBroadcastMessage('');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Broadcast failed');
    }
  };

  const stats = statsData?.stats || {};
  const demandMap = statsData?.demandForecast || {};

  const chartData = Object.keys(demandMap).map(g => ({
    group: g,
    demand: demandMap[g].predictedNext7Days || 0,
    requested: demandMap[g].requestedUnits || 0
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Admin Navbar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blood-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-blood-950">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white flex items-center gap-2">
              RaktSaarthi <span className="text-blood-500 text-xs px-2 py-0.5 bg-blood-950 border border-blood-800 rounded">ADMIN PANEL</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">Route: /admin • System Control Center</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={logout}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4 text-rose-400" /> Sign Out Admin
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          {[
            { key: 'ANALYTICS', label: 'Executive Analytics' },
            { key: 'ENTITIES', label: 'Facility Verifications' },
            { key: 'USERS', label: 'User Directory' },
            { key: 'BROADCAST', label: 'Push Broadcaster' },
            { key: 'AUDIT', label: 'System Audit Logs' }
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t.key ? 'bg-blood-600 text-white shadow-lg shadow-blood-950' : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blood-600 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* ANALYTICS TAB */}
            {tab === 'ANALYTICS' && (
              <div className="space-y-8">
                {/* 4 Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Total Users</p>
                    <p className="text-3xl font-black text-white">{stats.totalUsers || 0}</p>
                    <p className="text-[11px] text-slate-500">{stats.activeDonors || 0} Active Donors</p>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Total Requests</p>
                    <p className="text-3xl font-black text-blood-400">{stats.totalRequests || 0}</p>
                    <p className="text-[11px] text-slate-500">{stats.fulfilledRequests || 0} Fulfilled ({stats.fulfilmentRate || 100}%)</p>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Avg Fulfilment Time</p>
                    <p className="text-3xl font-black text-amber-400">{stats.avgFulfilmentHours || 2.4} <span className="text-xs font-normal text-slate-400">hrs</span></p>
                    <p className="text-[11px] text-slate-500">Emergency SLA Target: &lt; 3.0h</p>
                  </div>

                  <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Hospitals & Banks</p>
                    <p className="text-3xl font-black text-emerald-400">{(stats.registeredHospitals || 0) + (stats.registeredBloodBanks || 0)}</p>
                    <p className="text-[11px] text-slate-500">Verified Medical Partners</p>
                  </div>
                </div>

                {/* Recharts Chart Section */}
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    7-Day Forecasted Blood Demand Matrix (Units)
                  </h3>
                  <div className="h-72 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="group" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} />
                        <Bar dataKey="demand" fill="#dc2626" radius={[6, 6, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.group === 'O-' ? '#ef4444' : '#b91c1c'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* ENTITIES VERIFICATION TAB */}
            {tab === 'ENTITIES' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-white text-lg flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" /> Facility Verification & Compliance Audit
                    </h3>
                    <p className="text-xs text-slate-400">Review medical registration credentials for Hospitals and Regional Blood Banks</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Hospitals List */}
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-400" /> Registered Hospitals ({entities.hospitals.length})
                      </h4>
                      <span className="text-xs text-amber-400 font-bold">
                        {entities.hospitals.filter(h => !h.isVerified).length} Pending
                      </span>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {entities.hospitals.map((h) => (
                        <div key={h._id} className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2 text-xs">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-bold text-white text-sm">{h.hospitalName}</h5>
                              <p className="text-slate-400">Reg No: <span className="font-mono text-slate-200">{h.registrationNo}</span></p>
                            </div>
                            <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${h.isVerified ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                              {h.isVerified ? 'Verified' : 'Pending Verification'}
                            </span>
                          </div>

                          <p className="text-slate-400">{h.address}, {h.city} • Phone: {h.contactPhone}</p>

                          {!h.isVerified && (
                            <button
                              onClick={() => handleVerifyEntity('hospital', h._id)}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1 mt-2"
                            >
                              <ShieldCheck className="w-4 h-4" /> Approve & Verify Hospital License
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Blood Banks List */}
                  <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h4 className="font-bold text-white text-sm flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-purple-400" /> Regional Blood Banks ({entities.bloodBanks.length})
                      </h4>
                      <span className="text-xs text-amber-400 font-bold">
                        {entities.bloodBanks.filter(b => !b.isVerified).length} Pending
                      </span>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {entities.bloodBanks.map((b) => (
                        <div key={b._id} className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2 text-xs">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-bold text-white text-sm">{b.name}</h5>
                              <p className="text-slate-400">License No: <span className="font-mono text-slate-200">{b.licenseNo}</span></p>
                            </div>
                            <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${b.isVerified ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                              {b.isVerified ? 'Verified' : 'Pending Verification'}
                            </span>
                          </div>

                          <p className="text-slate-400">{b.address}, {b.city} • Phone: {b.phone}</p>

                          {!b.isVerified && (
                            <button
                              onClick={() => handleVerifyEntity('bloodbank', b._id)}
                              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1 mt-2"
                            >
                              <ShieldCheck className="w-4 h-4" /> Approve & Verify Blood Bank License
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {tab === 'USERS' && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-800">
                  <h3 className="font-bold text-white text-base">Platform Registered Users Directory</h3>
                </div>
                <div className="divide-y divide-slate-800 overflow-x-auto">
                  {users.map((u) => (
                    <div key={u._id} className="p-4 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <p className="font-bold text-white">{u.name}</p>
                        <p className="text-slate-400">{u.email} • {u.phone}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded font-extrabold uppercase bg-slate-800 text-blood-400 border border-slate-700">
                          {u.role}
                        </span>
                        <button
                          onClick={() => handleToggleUser(u._id)}
                          className={`px-3 py-1 rounded-lg font-bold ${u.isActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}
                        >
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BROADCAST TAB */}
            {tab === 'BROADCAST' && (
              <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 max-w-2xl space-y-6 shadow-xl">
                <div className="flex items-center gap-3">
                  <Radio className="w-6 h-6 text-blood-500 animate-pulse" />
                  <div>
                    <h3 className="font-extrabold text-white text-lg">Broadcast Real-Time System Notification</h3>
                    <p className="text-xs text-slate-400">Pushes immediate WebSocket alert to online user panels</p>
                  </div>
                </div>

                <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Target Role</label>
                    <select
                      value={broadcastRole}
                      onChange={(e) => setBroadcastRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                    >
                      <option value="all">All Registered Users</option>
                      <option value="patient">Patients & Donors Only</option>
                      <option value="hospital">Hospital Staff Only</option>
                      <option value="bloodbank">Blood Bank Staff Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Notification Title</label>
                    <input
                      type="text"
                      required
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="CRITICAL BLOOD ALERT: Urgent O- Negative Units Required"
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Broadcast Message Body</label>
                    <textarea
                      rows="3"
                      required
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Please check the emergency coordination portal..."
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-blood-600 hover:bg-blood-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blood-950 transition-all"
                  >
                    Broadcast System Push Alert
                  </button>
                </form>
              </div>
            )}

            {/* AUDIT TAB */}
            {tab === 'AUDIT' && (
              <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-800">
                  <h3 className="font-bold text-white text-base">System Audit Trail Logs</h3>
                </div>
                <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div key={log._id} className="p-4 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">{log.action} • <span className="text-slate-400">{log.resource}</span></p>
                        <p className="text-slate-500">By: {log.userName} ({log.userRole}) • IP: {log.ipAddress}</p>
                      </div>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
