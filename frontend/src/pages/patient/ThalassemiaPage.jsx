import React, { useState, useEffect } from 'react';
import { Calendar, PlusCircle, Clock, AlertTriangle, CheckCircle2, ArrowRight, HeartPulse, Building2, User } from 'lucide-react';
import API from '../../services/api';

const ThalassemiaPage = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('12');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [hospitalName, setHospitalName] = useState('City Children Specialty Clinic');
  const [transfusionIntervalDays, setTransfusionIntervalDays] = useState('21');
  const [lastTransfusionDate, setLastTransfusionDate] = useState('');
  const [contactPhone, setContactPhone] = useState('+91 9876543210');

  const fetchProfiles = async () => {
    try {
      const res = await API.get('/thalassemia/my-profiles');
      if (res.data.success) {
        setProfiles(res.data.profiles);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/thalassemia/profile', {
        patientName,
        age: parseInt(age),
        gender,
        bloodGroup,
        hospitalName,
        transfusionIntervalDays: parseInt(transfusionIntervalDays),
        lastTransfusionDate: lastTransfusionDate ? new Date(lastTransfusionDate) : new Date(Date.now() - 18 * 24 * 3600 * 1000),
        contactPhone
      });

      if (res.data.success) {
        setShowModal(false);
        fetchProfiles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertRequest = async (profileId) => {
    try {
      const res = await API.post(`/thalassemia/${profileId}/convert-request`);
      if (res.data.success) {
        alert(`Success! Created Blood Request ${res.data.request.requestNumber}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error converting schedule.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 via-slate-900 to-slate-900 p-8 rounded-3xl text-white space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold text-purple-200 mb-2">
              <Calendar className="w-3.5 h-3.5 text-purple-400" /> DEDICATED RECURRING BLOOD TRANSFUSION CARE
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Thalassemia Recurring Transfusion Support</h1>
            <p className="text-xs text-slate-300 max-w-xl mt-1">
              Automated interval analysis & advance coordination alerts so families never face last-minute emergency shortages.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shrink-0 shadow-lg transition-all hover:scale-105"
          >
            <PlusCircle className="w-4 h-4" /> Add Thalassemia Profile
          </button>
        </div>
      </div>

      {/* Profiles Grid */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      ) : profiles.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Thalassemia Profiles Configured</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create a recurring profile to receive automated countdown reminders before each scheduled transfusion.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-bold text-xs rounded-xl shadow-md"
          >
            <PlusCircle className="w-4 h-4" /> Create Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profiles.map((p) => {
            const reminder = p.reminder || {};
            const daysLeft = reminder.daysUntilNext || 3;

            return (
              <div key={p._id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 font-black text-xl flex items-center justify-center border border-purple-200">
                      {p.bloodGroup}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">{p.patientName}</h3>
                      <p className="text-xs text-slate-500">Interval: Every <strong>{p.transfusionIntervalDays} days</strong></p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    daysLeft <= 3 ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {daysLeft <= 3 ? '🚨 Transfusion Due Soon' : 'On Schedule'}
                  </span>
                </div>

                {/* AI Reminder Banner */}
                <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-purple-600" /> Next Transfusion Countdown</span>
                    <span className="text-purple-700 font-mono text-sm">{daysLeft} Days Left</span>
                  </div>
                  <p className="text-xs text-purple-800 leading-normal">
                    {reminder.message || `Next transfusion scheduled for ${new Date(p.nextExpectedDate).toLocaleDateString()}`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Preferred Hospital</span>
                    <p className="font-bold text-slate-900 mt-0.5">{p.hospitalName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Last Transfusion</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{new Date(p.lastTransfusionDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleConvertRequest(p._id)}
                  className="w-full py-3 bg-blood-600 hover:bg-blood-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blood-200 transition-all"
                >
                  <HeartPulse className="w-4 h-4" /> Convert Next Schedule to Active Request
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating Profile */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-slate-900 text-lg">Add Thalassemia Transfusion Profile</h3>
            <form onSubmit={handleCreateProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Name</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-bold text-blood-600"
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interval (Days)</label>
                  <input
                    type="number"
                    required
                    value={transfusionIntervalDays}
                    onChange={(e) => setTransfusionIntervalDays(e.target.value)}
                    placeholder="21"
                    className="w-full px-3 py-2 border rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Name</label>
                <input
                  type="text"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="Children Specialty Clinic"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Last Transfusion Date</label>
                <input
                  type="date"
                  required
                  value={lastTransfusionDate}
                  onChange={(e) => setLastTransfusionDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-purple-600 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThalassemiaPage;
