import React, { useState, useEffect } from 'react';
import { Search, Filter, Building2, PhoneCall, MapPin, ShieldCheck, PlusCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import MapView from '../components/MapView';
import { useOffline } from '../context/OfflineContext';

const AvailabilityPage = () => {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const { isOnline, getCachedData, setCachedData } = useOffline();

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      if (navigator.onLine) {
        const res = await API.get('/inventory/availability', {
          params: {
            bloodGroup: selectedGroup || undefined,
            search: search || undefined,
            city: cityFilter || undefined
          }
        });
        if (res.data.success) {
          setInventories(res.data.inventories || []);
          if (!selectedGroup && !search && !cityFilter) {
            await setCachedData('blood_inventory', res.data.inventories || []);
          }
        }
      } else {
        const cached = await getCachedData('blood_inventory');
        if (cached && Array.isArray(cached)) {
          let filtered = cached;
          if (selectedGroup) {
            filtered = filtered.filter(i => i.bloodGroup === selectedGroup);
          }
          if (search) {
            filtered = filtered.filter(i => i.bloodBankId?.name?.toLowerCase().includes(search.toLowerCase()));
          }
          if (cityFilter) {
            filtered = filtered.filter(i => i.bloodBankId?.city?.toLowerCase().includes(cityFilter.toLowerCase()));
          }
          setInventories(filtered);
        } else {
          setInventories([]);
        }
      }
    } catch (err) {
      console.error('Fetch availability error:', err);
      const cached = await getCachedData('blood_inventory');
      if (cached && Array.isArray(cached)) {
        setInventories(cached);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [selectedGroup, search, cityFilter, isOnline]);

  const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  // Map inventories to bank items for MapView
  const mappedBanks = inventories.map(inv => ({
    _id: inv.bloodBankId?._id || inv._id,
    name: inv.bloodBankId?.name || 'Regional Blood Bank',
    address: inv.bloodBankId?.address || 'Medical Complex',
    city: inv.bloodBankId?.city || 'Delhi-NCR',
    phone: inv.bloodBankId?.phone || '+91 9988776655',
    availableUnits: inv.availableUnits,
    location: inv.bloodBankId?.location || { type: 'Point', coordinates: [77.2150, 28.6200] }
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blood-950 p-8 rounded-3xl text-white space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-blood-200 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-blood-400" /> CENTRAL DIGITAL COORDINATION LAYER
              </div>
              {!isOnline && (
                <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-200 border border-amber-400/40 px-3 py-1 rounded-full text-xs font-bold mb-2">
                  <WifiOff className="w-3.5 h-3.5" /> CACHED OFFLINE STOCK
                </div>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Central Blood Availability Dashboard</h1>
            <p className="text-xs text-slate-300 max-w-xl mt-1">
              Transparent, real-time blood stock indicators across verified regional blood banks and medical centers.
            </p>
          </div>
          <Link
            to="/patient/create-request"
            className="px-5 py-3 bg-blood-600 hover:bg-blood-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shrink-0 shadow-lg shadow-blood-900/50 transition-all hover:scale-105"
          >
            <PlusCircle className="w-4 h-4" /> Create Emergency Request
          </Link>
        </div>

        {/* Filter Toolbar */}
        <div className="pt-4 border-t border-slate-700/80 grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Blood Bank facility name..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blood-500"
            />
          </div>

          <div className="sm:col-span-4 relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="Filter by City / Region..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blood-500"
            />
          </div>

          <button
            onClick={fetchAvailability}
            className="sm:col-span-2 px-3 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Interactive Tactical Radar Map */}
      <MapView 
        center={[77.2090, 28.6139]}
        patientLocation={{ name: 'Central Medical Hub', address: 'Delhi-NCR', coordinates: [77.2090, 28.6139] }}
        bloodBanks={mappedBanks}
        donors={[
          { _id: 'd1', bloodGroup: 'O-', name: 'Siddharth Malhotra', distanceKm: 2, location: { coordinates: [77.2100, 28.6150] } },
          { _id: 'd2', bloodGroup: 'A+', name: 'Priya Sundaram', distanceKm: 4, location: { coordinates: [77.2200, 28.6250] } },
          { _id: 'd3', bloodGroup: 'B+', name: 'Rohan Sharma', distanceKm: 6, location: { coordinates: [77.1950, 28.6050] } }
        ]}
        title="Live Regional Blood Stock Map"
      />

      {/* Blood Group Chips Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 shrink-0">Blood Group:</span>
        <button
          onClick={() => setSelectedGroup('')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            selectedGroup === '' ? 'bg-blood-600 text-white shadow-md shadow-blood-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Groups
        </button>
        {GROUPS.map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
              selectedGroup === group ? 'bg-blood-600 text-white shadow-md shadow-blood-200' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Stock Cards Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blood-600 border-t-transparent"></div>
        </div>
      ) : inventories.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No matching stock found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or selecting a different blood group filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventories.map((inv) => {
            const bank = inv.bloodBankId || { name: 'Regional Blood Bank', address: 'Medical Hub', phone: '1800-RAKT-SAARTHI' };
            const isLow = inv.availableUnits <= 5;

            return (
              <div key={inv._id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blood-100 text-blood-700 font-black text-xl flex items-center justify-center border border-blood-200 shadow-inner">
                      {inv.bloodGroup}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{bank.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {bank.city || 'Regional Center'}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                    inv.availableUnits > 10 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : isLow 
                        ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {inv.availableUnits > 10 ? 'High Stock' : isLow ? 'Critical Low' : 'Moderate'}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Available Units</p>
                    <p className="text-3xl font-black text-slate-900">{inv.availableUnits} <span className="text-xs font-normal text-slate-400">units</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Reserved</p>
                    <p className="text-lg font-bold text-slate-700">{inv.reservedUnits || 0} units</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Direct Helpline:</span>
                    <span className="font-semibold text-slate-900 flex items-center gap-1">
                      <PhoneCall className="w-3 h-3 text-blood-600" /> {bank.phone || '+91 9800000000'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Last Updated:</span>
                    <span>{new Date(inv.lastUpdated || inv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <Link
                  to={`/patient/create-request?bloodGroup=${encodeURIComponent(inv.bloodGroup)}`}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-blood-400" /> Initiate Request For {inv.bloodGroup}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AvailabilityPage;

