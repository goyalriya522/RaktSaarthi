import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Minus, 
  Building2, 
  Package, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  RefreshCw, 
  XCircle, 
  Filter, 
  Search, 
  Calendar, 
  MapPin, 
  Edit, 
  Trash2, 
  AlertOctagon,
  Info,
  TrendingUp,
  BarChart3,
  PieChart as PieIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid 
} from 'recharts';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const BloodBankDashboard = () => {
  const [bankData, setBankData] = useState(null);
  const [inventories, setInventories] = useState([]);
  const [units, setUnits] = useState([]);
  const [stats, setStats] = useState({
    totalBloodUnits: 0,
    availableUnits: 0,
    expiringSoon: 0,
    expiredUnits: 0
  });
  const [alerts, setAlerts] = useState({
    expiringSoonAlerts: [],
    expiredAlerts: []
  });
  const [requests, setRequests] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [componentFilter, setComponentFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [formData, setFormData] = useState({
    unitId: '',
    bloodGroup: 'O+',
    componentType: 'Whole Blood',
    collectionDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    quantity: 1,
    storageLocation: 'Main Cold Room - Rack A',
    notes: ''
  });

  const fetchBankData = async () => {
    setLoading(true);
    try {
      const invRes = await API.get('/inventory/my-bank');
      if (invRes.data.success) {
        setBankData(invRes.data.bloodBank);
        setInventories(invRes.data.inventories || []);
        setUnits(invRes.data.units || []);
        if (invRes.data.stats) setStats(invRes.data.stats);
        if (invRes.data.alerts) setAlerts(invRes.data.alerts);
      }

      const reqRes = await API.get('/requests');
      if (reqRes.data.success) {
        setRequests(reqRes.data.requests);
      }

      const txRes = await API.get('/inventory/transactions');
      if (txRes.data.success) {
        setTransactions(txRes.data.transactions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankData();
  }, []);

  const handleOpenModal = (unit = null) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        unitId: unit.unitId || '',
        bloodGroup: unit.bloodGroup || 'O+',
        componentType: unit.componentType || 'Whole Blood',
        collectionDate: unit.collectionDate ? new Date(unit.collectionDate).toISOString().split('T')[0] : '',
        expiryDate: unit.expiryDate ? new Date(unit.expiryDate).toISOString().split('T')[0] : '',
        quantity: unit.quantity || 1,
        storageLocation: unit.storageLocation || 'Main Cold Room - Rack A',
        notes: unit.notes || ''
      });
    } else {
      setEditingUnit(null);
      setFormData({
        unitId: `UNIT-${Math.floor(1000 + Math.random() * 9000)}`,
        bloodGroup: 'O+',
        componentType: 'Whole Blood',
        collectionDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        quantity: 1,
        storageLocation: 'Main Cold Room - Rack A',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const handleSaveUnit = async (e) => {
    e.preventDefault();
    try {
      if (editingUnit) {
        const res = await API.put(`/inventory/units/${editingUnit._id}`, formData);
        if (res.data.success) {
          setShowModal(false);
          fetchBankData();
        }
      } else {
        const res = await API.post('/inventory/units', formData);
        if (res.data.success) {
          setShowModal(false);
          fetchBankData();
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save blood unit');
    }
  };

  const handleDeleteUnit = async (unitId) => {
    if (!window.confirm('Are you sure you want to discard/remove this blood unit?')) return;
    try {
      const res = await API.delete(`/inventory/units/${unitId}`);
      if (res.data.success) {
        fetchBankData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete blood unit');
    }
  };

  const handleUpdateStock = async (bloodGroup, currentUnits, delta) => {
    const newUnits = Math.max(0, currentUnits + delta);
    try {
      const res = await API.post('/inventory/update', {
        bloodGroup,
        availableUnits: newUnits,
        note: `Manual stock adjustment of ${delta > 0 ? '+' : ''}${delta} units`
      });
      if (res.data.success) {
        fetchBankData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Stock update failed');
    }
  };

  const handleReserve = async (reqId) => {
    try {
      const res = await API.put(`/requests/${reqId}/reserve`);
      if (res.data.success) {
        alert('Non-expired blood stock reserved successfully!');
        fetchBankData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Reservation failed');
    }
  };

  // Filtering Logic
  const filteredUnits = units.filter(unit => {
    if (statusFilter === 'AVAILABLE' && unit.computedStatus !== 'Safe / Available') return false;
    if (statusFilter === 'EXPIRING_SOON' && unit.computedStatus !== 'Expiring Soon') return false;
    if (statusFilter === 'EXPIRED' && unit.computedStatus !== 'Expired') return false;

    if (groupFilter !== 'ALL' && unit.bloodGroup !== groupFilter) return false;
    if (componentFilter !== 'ALL' && unit.componentType !== componentFilter) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchId = unit.unitId ? unit.unitId.toLowerCase().includes(term) : false;
      const matchLoc = unit.storageLocation ? unit.storageLocation.toLowerCase().includes(term) : false;
      const matchGroup = unit.bloodGroup.toLowerCase().includes(term);
      if (!matchId && !matchLoc && !matchGroup) return false;
    }

    return true;
  });

  const pendingRequests = requests.filter(r => r.status === 'Verified' || r.status === 'Submitted' || r.status === 'Searching');

  // Dynamic Chart Datasets computed directly from real units array
  const statusBreakdownData = [
    { name: 'Safe / Available', value: 0, color: '#10b981' },
    { name: 'Expiring Soon', value: 0, color: '#f59e0b' },
    { name: 'Expired', value: 0, color: '#f43f5e' },
    { name: 'Reserved', value: 0, color: '#a855f7' }
  ];

  const GROUPS_LIST = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const groupWiseData = GROUPS_LIST.map(g => ({
    bloodGroup: g,
    Safe: 0,
    ExpiringSoon: 0,
    Expired: 0,
    Reserved: 0
  }));

  const timelineCategories = [
    { range: 'Expired', label: 'Expired (<0d)', count: 0, color: '#f43f5e' },
    { range: '0-3d', label: 'Critical (0-3d)', count: 0, color: '#ef4444' },
    { range: '4-7d', label: 'Expiring (4-7d)', count: 0, color: '#f59e0b' },
    { range: '8-15d', label: 'Moderate (8-15d)', count: 0, color: '#3b82f6' },
    { range: '>15d', label: 'Safe (>15d)', count: 0, color: '#10b981' }
  ];

  units.forEach(u => {
    const qty = u.quantity || 1;
    const days = u.daysRemaining;

    // 1. Status breakdown
    if (u.computedStatus === 'Safe / Available') statusBreakdownData[0].value += qty;
    else if (u.computedStatus === 'Expiring Soon') statusBreakdownData[1].value += qty;
    else if (u.computedStatus === 'Expired') statusBreakdownData[2].value += qty;
    else if (u.computedStatus === 'Reserved') statusBreakdownData[3].value += qty;

    // 2. Group wise distribution
    const grp = groupWiseData.find(d => d.bloodGroup === u.bloodGroup);
    if (grp) {
      if (u.computedStatus === 'Safe / Available') grp.Safe += qty;
      else if (u.computedStatus === 'Expiring Soon') grp.ExpiringSoon += qty;
      else if (u.computedStatus === 'Expired') grp.Expired += qty;
      else if (u.computedStatus === 'Reserved') grp.Reserved += qty;
    }

    // 3. Timeline categories
    if (u.computedStatus === 'Expired' || days < 0) {
      timelineCategories[0].count += qty;
    } else if (days <= 3) {
      timelineCategories[1].count += qty;
    } else if (days <= 7) {
      timelineCategories[2].count += qty;
    } else if (days <= 15) {
      timelineCategories[3].count += qty;
    } else {
      timelineCategories[4].count += qty;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 p-8 rounded-3xl text-white space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">
                <Building2 className="w-4 h-4" /> AUTHORIZED BLOOD BANK CONTROL PORTAL
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                {bankData ? bankData.name : 'Regional Blood Bank Control Center'}
              </h1>
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-3 bg-blood-600 hover:bg-blood-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blood-900/50 transition-all hover:scale-105 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Blood Unit
          </button>
        </div>
      </div>

      {/* 1. Dashboard Expiry Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Units */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Blood Units</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.totalBloodUnits}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Tracked units in system</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Available Units */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Available Units</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.availableUnits}</h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">🟢 Ready for Dispatch</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Expiring Soon</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.expiringSoon}</h3>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">🟡 Within 7 Days Expiry</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Expired Units */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Expired Units</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.expiredUnits}</h3>
            <p className="text-[11px] text-rose-600 font-semibold mt-0.5">🔴 Quarantine / Do Not Use</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertOctagon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 2. Interactive Expiry Analytics & Visual Indicators Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blood-600" /> Blood Expiry Analytics & Stock Overview
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live visual distribution and timeline breakdown automatically computed from real-time database stock.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card 1: Expiry Status Breakdown (Pie/Donut Chart) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-blood-600" /> Stock Expiry Breakdown
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                {stats.totalBloodUnits} Total Units
              </span>
            </div>

            <div className="h-56 w-full relative">
              {stats.totalBloodUnits === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  No inventory units available for breakdown
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusBreakdownData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusBreakdownData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [`${val} units`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-bold">
              {statusBreakdownData.map((item) => (
                <div key={item.name} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="text-[11px] text-slate-700">{item.name}</span>
                  </div>
                  <span className="font-mono text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Blood-Group-Wise Expiry Distribution (Stacked Bar Chart) */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blood-600" /> Blood-Group-Wise Expiry Distribution
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-blood-50 text-blood-700 rounded-full border border-blood-200">
                8 Groups Matrix
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupWiseData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="bloodGroup" tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Safe" name="Safe / Valid" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="ExpiringSoon" name="Expiring Soon (≤7d)" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Expired" name="Expired" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 3: Expiry Timeline Trend (Days Remaining Overview) */}
          <div className="lg:col-span-12 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blood-600" /> Expiry Timeline & Days Remaining Overview
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Categorized inventory countdown breakdown for proactive dispatch planning.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {timelineCategories.map((cat) => (
                <div key={cat.range} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/80 space-y-1.5 transition-all hover:bg-slate-100/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">{cat.label}</span>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                  </div>
                  <p className="text-2xl font-black text-slate-900">{cat.count}</p>
                  <p className="text-[10px] text-slate-400 font-semibold">units in range</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Expiry Alerts Section */}
      {(alerts.expiringSoonAlerts.length > 0 || alerts.expiredAlerts.length > 0) && (
        <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400 animate-pulse" />
              <h2 className="text-base font-extrabold tracking-tight">Blood Inventory Expiry Alert Center</h2>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              {alerts.expiringSoonAlerts.length + alerts.expiredAlerts.length} Action Items Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expiring Soon Alert Box */}
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <Clock className="w-4 h-4" /> UNITS EXPIRING WITHIN 7 DAYS ({alerts.expiringSoonAlerts.length})
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                {alerts.expiringSoonAlerts.length === 0 ? (
                  <p className="text-slate-400 italic">No units expiring within 7 days.</p>
                ) : (
                  alerts.expiringSoonAlerts.map(unit => (
                    <div key={unit._id} className="bg-slate-900/90 p-3 rounded-xl border border-amber-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-black flex items-center justify-center text-xs border border-amber-500/30">
                          {unit.bloodGroup}
                        </span>
                        <div>
                          <p className="font-bold text-slate-100">
                            {unit.bloodGroup} | {unit.componentType} | Unit #{unit.unitId}
                          </p>
                          <p className="text-[11px] text-amber-300/80">
                            Expires: {new Date(unit.expiryDate).toLocaleDateString()} ({unit.daysRemaining} days left)
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] border border-amber-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Expiring Soon
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Expired Alert Box */}
            <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <XCircle className="w-4 h-4" /> EXPIRED UNITS - REMOVED FROM AVAILABLE ({alerts.expiredAlerts.length})
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                {alerts.expiredAlerts.length === 0 ? (
                  <p className="text-slate-400 italic">No expired units currently in system.</p>
                ) : (
                  alerts.expiredAlerts.map(unit => (
                    <div key={unit._id} className="bg-slate-900/90 p-3 rounded-xl border border-rose-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 font-black flex items-center justify-center text-xs border border-rose-500/30">
                          {unit.bloodGroup}
                        </span>
                        <div>
                          <p className="font-bold text-slate-100">
                            {unit.bloodGroup} | {unit.componentType} | Unit #{unit.unitId}
                          </p>
                          <p className="text-[11px] text-rose-300/80">
                            Expired Date: {new Date(unit.expiryDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 font-extrabold text-[10px] border border-rose-500/30 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Do Not Use
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Blood Unit Inventory Manager & Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blood-600" /> Blood Expiry Tracking & Inventory Table
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live tracking of collection dates, automatic expiry countdowns, storage locations, and readiness statuses.
            </p>
          </div>
          <button
            onClick={fetchBankData}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          {/* Search */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Unit ID, location..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blood-600"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blood-600 font-semibold"
            >
              <option value="ALL">All Expiry Statuses</option>
              <option value="AVAILABLE">🟢 Safe / Available</option>
              <option value="EXPIRING_SOON">🟡 Expiring Soon (≤ 7 Days)</option>
              <option value="EXPIRED">🔴 Expired</option>
            </select>
          </div>

          {/* Blood Group Filter */}
          <div className="sm:col-span-2">
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blood-600 font-semibold"
            >
              <option value="ALL">All Groups</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Component Type Filter */}
          <div className="sm:col-span-3">
            <select
              value={componentFilter}
              onChange={(e) => setComponentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blood-600 font-semibold"
            >
              <option value="ALL">All Components</option>
              {['Whole Blood', 'RBC', 'Platelets', 'Plasma'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Units Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-900 font-extrabold uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Blood Unit ID</th>
                <th className="py-3.5 px-4">Group</th>
                <th className="py-3.5 px-4">Component</th>
                <th className="py-3.5 px-4">Collection Date</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-4">Days Remaining</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Storage Location</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400 italic">
                    No matching blood units found in inventory.
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit) => {
                  const isExpired = unit.computedStatus === 'Expired';
                  const isExpiringSoon = unit.computedStatus === 'Expiring Soon';

                  return (
                    <tr key={unit._id} className={`hover:bg-slate-50 transition-colors ${
                      isExpired ? 'bg-rose-50/50' : isExpiringSoon ? 'bg-amber-50/50' : ''
                    }`}>
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          #{unit.unitId}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="w-8 h-8 rounded-lg bg-blood-100 text-blood-800 font-black text-xs flex items-center justify-center border border-blood-200">
                          {unit.bloodGroup}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-800">
                        {unit.componentType}
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {new Date(unit.collectionDate).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {new Date(unit.expiryDate).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 font-black">
                        <span className={`${
                          isExpired 
                            ? 'text-rose-600' 
                            : isExpiringSoon 
                              ? 'text-amber-600' 
                              : 'text-emerald-700'
                        }`}>
                          {unit.daysRemaining < 0 
                            ? `${Math.abs(unit.daysRemaining)} days ago` 
                            : `${unit.daysRemaining} days remaining`}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {unit.computedStatus === 'Safe / Available' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Safe / Available
                          </span>
                        )}
                        {unit.computedStatus === 'Expiring Soon' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Expiring Soon
                          </span>
                        )}
                        {unit.computedStatus === 'Expired' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Expired (Do Not Use)
                          </span>
                        )}
                        {unit.computedStatus === 'Reserved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                            <ShieldCheck className="w-3 h-3 text-purple-600" /> Reserved
                          </span>
                        )}
                        {unit.computedStatus === 'Discarded' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                            Discarded
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {unit.storageLocation || 'Main Cold Room'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(unit)}
                            title="Edit Unit Details / Set Dates"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUnit(unit._id)}
                            title="Discard Blood Unit"
                            className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Grid Summary Manager */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blood-600" /> Live Blood Group Summary Stock
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {inventories.map((inv) => (
            <div key={inv.bloodGroup} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl bg-blood-100 text-blood-700 font-extrabold text-lg flex items-center justify-center border border-blood-200">
                  {inv.bloodGroup}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Reserved: {inv.reservedUnits || 0}
                </span>
              </div>

              <div>
                <p className="text-3xl font-black text-slate-900">{inv.availableUnits || 0} <span className="text-xs text-slate-400 font-normal">available</span></p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => handleUpdateStock(inv.bloodGroup, inv.availableUnits || 0, -1)}
                  className="w-1/2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center justify-center"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleUpdateStock(inv.bloodGroup, inv.availableUnits || 0, +1)}
                  className="w-1/2 py-1.5 bg-blood-600 hover:bg-blood-700 text-white font-bold rounded-lg text-xs flex items-center justify-center"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incoming Requests Queue */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blood-600" /> Incoming Emergency Blood Requests
        </h2>

        {pendingRequests.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 text-xs text-slate-400">
            No pending incoming blood requests currently
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
            {pendingRequests.map((req) => (
              <div key={req._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-blood-100 text-blood-700 font-black text-xl flex items-center justify-center border border-blood-200">
                    {req.bloodGroup}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-slate-900 text-sm">{req.requestNumber}</h4>
                      <StatusBadge status={req.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Hospital: <strong>{req.hospitalName}</strong> • Required: <strong>{req.unitsRequired} Units</strong>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleReserve(req._id)}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-200 flex items-center gap-1.5 shrink-0 transition-all"
                >
                  <ShieldCheck className="w-4 h-4" /> Reserve Valid Non-Expired Stock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction History Log */}
      <div className="space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-blood-600" /> Inventory Audit Log
        </h2>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {transactions.map((tx) => (
              <div key={tx._id} className="p-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                    tx.type === 'ADD' ? 'bg-emerald-100 text-emerald-800' : tx.type === 'RESERVE' ? 'bg-purple-100 text-purple-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {tx.type}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">{tx.bloodGroup} • {tx.units} Units</p>
                    <p className="text-slate-400 text-[11px]">{tx.notes}</p>
                  </div>
                </div>
                <span className="text-slate-400 text-[11px]">
                  {new Date(tx.timestamp || tx.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Add / Edit Blood Unit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blood-600" />
                {editingUnit ? 'Edit Blood Unit Details' : 'Add New Blood Unit'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Blood Unit ID</label>
                  <input
                    type="text"
                    required
                    value={formData.unitId}
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                    placeholder="e.g. RB1024"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:border-blood-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blood-600"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Component Type</label>
                  <select
                    value={formData.componentType}
                    onChange={(e) => setFormData({ ...formData, componentType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blood-600"
                  >
                    {['Whole Blood', 'RBC', 'Platelets', 'Plasma'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity / Units</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-blood-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Collection Date</label>
                  <input
                    type="date"
                    required
                    value={formData.collectionDate}
                    onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blood-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blood-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Storage Location</label>
                <input
                  type="text"
                  value={formData.storageLocation}
                  onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                  placeholder="e.g. Fridge B2 - Rack 1"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blood-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Remarks</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional unit comments or special processing info"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-blood-600"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-blood-600 hover:bg-blood-700 text-white font-extrabold rounded-xl shadow-lg shadow-blood-200"
                >
                  Save Blood Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BloodBankDashboard;
