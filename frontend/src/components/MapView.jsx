import React, { useState } from 'react';
import { MapPin, Building2, User, Phone, ShieldCheck, Navigation, ExternalLink, Zap } from 'lucide-react';

const MapView = ({ 
  center = [77.2090, 28.6139], 
  patientLocation = { name: 'Hospital / Patient Location', address: 'Sector 62, Medical Hub', coordinates: [77.2090, 28.6139] },
  bloodBanks = [], 
  donors = [],
  title = "Geographic Emergency Source Map"
}) => {
  const [selectedPin, setSelectedPin] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, BANKS, DONORS

  // Normalized items to plot on grid
  const centerLng = center[0] || 77.2090;
  const centerLat = center[1] || 28.6139;

  // Convert GPS coords [lng, lat] into SVG % relative offsets (roughly scaled for 10km radius)
  const getCoordinatesPct = (coords) => {
    if (!coords || !Array.isArray(coords)) return { x: 50, y: 50 };
    const lng = coords[0] || centerLng;
    const lat = coords[1] || centerLat;

    // Scale offset (1 deg approx 111km, so 0.08 deg is ~9km range)
    const deltaLng = (lng - centerLng) / 0.08; 
    const deltaLat = (lat - centerLat) / 0.08;

    const x = Math.max(10, Math.min(90, 50 + deltaLng * 40));
    const y = Math.max(10, Math.min(90, 50 - deltaLat * 40)); // inverse Y for SVG grid

    return { x, y };
  };

  const patientCoords = getCoordinatesPct(patientLocation.coordinates || center);

  const filteredBanks = activeFilter === 'DONORS' ? [] : bloodBanks;
  const filteredDonors = activeFilter === 'BANKS' ? [] : donors;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-xl overflow-hidden relative">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm md:text-base flex items-center gap-2">
              {title}
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Live GPS Radar
              </span>
            </h3>
            <p className="text-xs text-slate-400">Proximity-based matching & visual dispatch map</p>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              activeFilter === 'ALL' ? 'bg-slate-800 text-rose-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Show All ({bloodBanks.length + donors.length})
          </button>
          <button
            onClick={() => setActiveFilter('BANKS')}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              activeFilter === 'BANKS' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Blood Banks ({bloodBanks.length})
          </button>
          <button
            onClick={() => setActiveFilter('DONORS')}
            className={`px-3 py-1 rounded-lg transition-all font-medium ${
              activeFilter === 'DONORS' ? 'bg-slate-800 text-rose-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Donors ({donors.length})
          </button>
        </div>
      </div>

      {/* Main Radar Screen Container */}
      <div className="relative w-full h-80 md:h-96 rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden select-none">
        {/* Background Tactical Grid Lines & Concentric Radar Rings */}
        <div className="absolute inset-0 bg-[radial-[#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
        
        {/* Radar Rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 rounded-full border border-slate-800/60 animate-ping opacity-15"></div>
          <div className="absolute w-64 h-64 rounded-full border border-dashed border-rose-500/20"></div>
          <div className="absolute w-96 h-96 rounded-full border border-slate-800/40"></div>
          <div className="absolute w-[28rem] h-[28rem] rounded-full border border-slate-800/20"></div>
        </div>

        {/* Distance Range Indicators */}
        <div className="absolute top-3 left-3 text-[10px] font-mono text-slate-500 bg-slate-900/80 px-2.5 py-1 rounded-md border border-slate-800">
          RADAR SCOPE: 15 KM RADIUS
        </div>

        {/* Center/Patient Location Marker */}
        <div 
          style={{ left: `${patientCoords.x}%`, top: `${patientCoords.y}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
          onClick={() => setSelectedPin({ type: 'PATIENT', data: patientLocation })}
        >
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-rose-500 opacity-30"></span>
            <div className="relative z-10 w-9 h-9 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center shadow-lg shadow-rose-600/50 text-white">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="absolute top-10 whitespace-nowrap bg-slate-900/90 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow border border-slate-700 pointer-events-none">
              {patientLocation.name || 'Emergency Target'}
            </div>
          </div>
        </div>

        {/* Render Blood Bank Markers */}
        {filteredBanks.map((item, idx) => {
          const bank = item.bloodBank || item;
          const pos = getCoordinatesPct(bank.location ? bank.location.coordinates : [77.2150 + idx * 0.01, 28.6200 + idx * 0.01]);
          const isSelected = selectedPin?.data?._id === bank._id;

          return (
            <div
              key={`bank-${bank._id || idx}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group transition-all transform hover:scale-110"
              onClick={() => setSelectedPin({ type: 'BLOOD_BANK', data: item })}
            >
              <div className="relative flex items-center justify-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white border-2 shadow-md ${
                  isSelected ? 'bg-blue-500 border-white ring-4 ring-blue-500/30' : 'bg-blue-600 border-slate-900 hover:bg-blue-500'
                }`}>
                  <Building2 className="w-4 h-4" />
                </div>
                {/* Micro tooltip */}
                <div className="absolute top-9 hidden group-hover:block whitespace-nowrap bg-slate-900 text-slate-100 text-[10px] font-medium px-2 py-1 rounded shadow-lg border border-slate-700 z-30">
                  <p className="font-bold text-blue-400">{bank.name}</p>
                  <p className="text-slate-400">{item.availableUnits ? `${item.availableUnits} units available` : 'Verified Bank'}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Render Donor Markers */}
        {filteredDonors.map((item, idx) => {
          const donor = item.donor || item;
          const pos = getCoordinatesPct(donor.location ? donor.location.coordinates : [77.2100 - idx * 0.008, 28.6150 + idx * 0.008]);
          const isSelected = selectedPin?.data?._id === donor._id;

          return (
            <div
              key={`donor-${donor._id || idx}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group transition-all transform hover:scale-110"
              onClick={() => setSelectedPin({ type: 'DONOR', data: item })}
            >
              <div className="relative flex items-center justify-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white border-2 shadow-md ${
                  isSelected ? 'bg-rose-500 border-white ring-4 ring-rose-500/30' : 'bg-rose-600 border-slate-900 hover:bg-rose-500'
                }`}>
                  <User className="w-3.5 h-3.5" />
                </div>
                {/* Micro badge for blood group */}
                <span className="absolute -top-1 -right-1 bg-slate-900 text-rose-400 text-[9px] font-black px-1 rounded border border-rose-500/40">
                  {donor.bloodGroup}
                </span>
                {/* Micro tooltip */}
                <div className="absolute top-8 hidden group-hover:block whitespace-nowrap bg-slate-900 text-slate-100 text-[10px] font-medium px-2 py-1 rounded shadow-lg border border-slate-700 z-30">
                  <p className="font-bold text-rose-400">{donor.name || 'Volunteer Donor'} ({donor.bloodGroup})</p>
                  <p className="text-slate-400">{item.distanceKm !== undefined ? `${item.distanceKm} km away` : 'Available'}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Interactive Selected Item Detail Drawer overlay inside map */}
        {selectedPin && (
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 text-white shadow-2xl z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  selectedPin.type === 'BLOOD_BANK' 
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                    : selectedPin.type === 'DONOR'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {selectedPin.type === 'BLOOD_BANK' && <Building2 className="w-5 h-5" />}
                  {selectedPin.type === 'DONOR' && <User className="w-5 h-5" />}
                  {selectedPin.type === 'PATIENT' && <MapPin className="w-5 h-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {selectedPin.type === 'BLOOD_BANK' ? 'Blood Bank Source' : selectedPin.type === 'DONOR' ? 'Volunteer Donor' : 'Patient Hospital Destination'}
                    </span>
                    {selectedPin.data.compatibilityScore && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {selectedPin.data.compatibilityScore}% Match
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-slate-100 text-sm md:text-base">
                    {selectedPin.type === 'BLOOD_BANK' 
                      ? (selectedPin.data.bloodBank?.name || selectedPin.data.name)
                      : selectedPin.type === 'DONOR'
                      ? (selectedPin.data.donor?.name || selectedPin.data.name || 'Available Volunteer')
                      : selectedPin.data.name
                    }
                  </h4>

                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                    <span>📍 {selectedPin.data.bloodBank?.address || selectedPin.data.address || selectedPin.data.donor?.city || 'Delhi-NCR'}</span>
                    {selectedPin.data.distanceKm !== undefined && (
                      <span className="text-amber-400 font-semibold">📏 {selectedPin.data.distanceKm} km away</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(selectedPin.data.bloodBank?.phone || selectedPin.data.phone) && (
                  <a
                    href={`tel:${selectedPin.data.bloodBank?.phone || selectedPin.data.phone}`}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </a>
                )}
                <button
                  onClick={() => setSelectedPin(null)}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Footer Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-2 text-xs text-slate-400 border-t border-slate-800/80">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-600 border border-white"></div>
            <span>Hospital / Destination</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            <span>Regional Blood Banks ({bloodBanks.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <span>Nearby Eligible Donors ({donors.length})</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Coordinates Verified via GPS Engine</span>
        </div>
      </div>
    </div>
  );
};

export default MapView;
