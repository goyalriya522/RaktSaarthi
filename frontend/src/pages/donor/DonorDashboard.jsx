import React, { useState, useEffect } from 'react';
import { Heart, ShieldCheck, MapPin, CheckCircle2, AlertTriangle, PhoneCall, Activity, Clock, User, Settings, Award, Calendar, FileText, CheckCircle, XCircle, Lock, EyeOff, Printer, Download } from 'lucide-react';
import API from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

const DonorDashboard = () => {
  const [donorProfile, setDonorProfile] = useState(null);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [eligibleRequests, setEligibleRequests] = useState([]);
  const [myResponses, setMyResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('REQUESTS');

  // Health Assessment Form State
  const [weightKg, setWeightKg] = useState(65);
  const [hasChronicConditions, setHasChronicConditions] = useState(false);
  const [lastDonationDate, setLastDonationDate] = useState('');
  const [totalDonations, setTotalDonations] = useState(0);

  // Profile Settings Form State
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [gender, setGender] = useState('Male');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [hidePhonePublicly, setHidePhonePublicly] = useState(true);

  const fetchDonorData = async () => {
    try {
      setLoading(true);
      const pRes = await API.get('/donors/me');
      if (pRes.data.success && pRes.data.donor) {
        const d = pRes.data.donor;
        setDonorProfile(d);
        setBloodGroup(d.bloodGroup || 'O+');
        setGender(d.gender || 'Male');
        setCity(d.city || '');
        setState(d.state || '');
        setWeightKg(d.healthDeclaration?.weightKg || 65);
        setHasChronicConditions(d.healthDeclaration?.hasChronicConditions || false);
        setTotalDonations(d.totalDonations || 0);
        if (d.lastDonationDate) {
          setLastDonationDate(new Date(d.lastDonationDate).toISOString().split('T')[0]);
        }
        if (d.privacySettings) {
          setHidePhonePublicly(Boolean(d.privacySettings.hidePhonePublicly));
        }
      }

      // Fetch Centralized Donor Eligibility Status
      try {
        const eligRes = await API.get('/donors/me/eligibility');
        if (eligRes.data.success) {
          setEligibilityData(eligRes.data);
        }
      } catch (e) {
        console.error('Eligibility endpoint fetch error:', e);
      }

      const rRes = await API.get('/donors/eligible-requests');
      if (rRes.data.success) {
        setEligibleRequests(rRes.data.requests);
      }

      const respRes = await API.get('/donors/my-responses');
      if (respRes.data.success) {
        setMyResponses(respRes.data.matches);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonorData();
  }, []);

  const handleToggleAvailability = async () => {
    try {
      const res = await API.put('/donors/availability');
      if (res.data.success) {
        setDonorProfile(prev => ({ ...prev, isAvailable: res.data.isAvailable }));
        fetchDonorData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Toggle failed');
    }
  };

  const handleRespond = async (requestId, response) => {
    try {
      const res = await API.post('/donors/respond', { requestId, response });
      if (res.data.success) {
        alert(response === 'ACCEPTED' ? 'Thank you! Your volunteer commitment has been dispatched to the patient and hospital.' : 'Response updated.');
        fetchDonorData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    }
  };

  const handleSaveHealthAssessment = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/donors/profile', {
        healthDeclaration: {
          weightKg: Number(weightKg),
          hasChronicConditions: Boolean(hasChronicConditions)
        },
        lastDonationDate: lastDonationDate ? new Date(lastDonationDate) : undefined,
        totalDonations: Number(totalDonations)
      });
      if (res.data.success) {
        alert('Health & eligibility assessment saved successfully!');
        setDonorProfile(res.data.donor);
        fetchDonorData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update health declaration');
    }
  };

  const handleSaveProfileSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/donors/profile', {
        bloodGroup,
        gender,
        city,
        state,
        privacySettings: {
          hidePhonePublicly: Boolean(hidePhonePublicly),
          shareOnlyOnAcceptedMatch: true
        }
      });
      if (res.data.success) {
        alert('Profile & privacy settings updated successfully!');
        setDonorProfile(res.data.donor);
        fetchDonorData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile settings');
    }
  };

  // Cooldown & Eligibility Calculation fallback
  const calculateCooldownDays = () => {
    if (!lastDonationDate) return 0;
    const lastDate = new Date(lastDonationDate);
    const cooldownPeriod = 90 * 24 * 60 * 60 * 1000; // 90 days
    const nextEligibleDate = new Date(lastDate.getTime() + cooldownPeriod);
    const diffMs = nextEligibleDate.getTime() - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  };

  const cooldownDays = calculateCooldownDays();
  const isMedicallyEligible = donorProfile?.healthDeclaration?.isEligible !== false && weightKg >= 45 && !hasChronicConditions;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Donor Hero Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 p-8 rounded-3xl text-white space-y-6 shadow-xl border border-rose-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold shadow-inner">
              <Heart className="w-7 h-7 fill-rose-500" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" /> VOLUNTEER DONOR HUB
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                {donorProfile ? `${donorProfile.userId?.name || 'Volunteer Donor'}` : 'Donor Portal'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Blood Group: <span className="font-extrabold text-rose-400">{donorProfile?.bloodGroup || 'O+'}</span> • Location: <span className="font-semibold text-slate-300">{donorProfile?.city || 'City'}, {donorProfile?.state || 'State'}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {donorProfile && (
              <button
                onClick={handleToggleAvailability}
                className={`px-5 py-3 rounded-2xl font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg ${
                  donorProfile.isAvailable 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-950' 
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <Activity className="w-4 h-4" /> {donorProfile.isAvailable ? 'Available To Donate' : 'Currently Unavailable'}
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
            <p className="text-xs text-slate-400 font-semibold uppercase">Eligibility Status</p>
            {eligibilityData ? (
              eligibilityData.eligible ? (
                <div className="mt-1">
                  <p className="text-sm font-black text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> Eligible to Donate
                  </p>
                </div>
              ) : (
                <div className="mt-1">
                  <p className="text-xs font-black text-amber-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Not Currently Eligible
                  </p>
                  {eligibilityData.nextEligibleDate && (
                    <p className="text-[10px] text-slate-300 mt-0.5 font-medium">
                      Next eligible date: <strong className="text-amber-300">{new Date(eligibilityData.nextEligibleDate).toLocaleDateString()}</strong>
                    </p>
                  )}
                </div>
              )
            ) : (
              <p className={`text-base font-black mt-1 flex items-center gap-1.5 ${isMedicallyEligible && cooldownDays === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isMedicallyEligible && cooldownDays === 0 ? (
                  <><CheckCircle className="w-4 h-4" /> Eligible to Donate</>
                ) : (
                  <><Clock className="w-4 h-4" /> Not Currently Eligible</>
                )}
              </p>
            )}
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
            <p className="text-xs text-slate-400 font-semibold uppercase">Total Donations</p>
            <p className="text-2xl font-black text-rose-400 mt-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-rose-500" /> {donorProfile?.totalDonations || 0}
            </p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
            <p className="text-xs text-slate-400 font-semibold uppercase">Nearby Requests</p>
            <p className="text-2xl font-black text-white mt-1">{eligibleRequests.length}</p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
            <p className="text-xs text-slate-400 font-semibold uppercase">My Commitments</p>
            <p className="text-2xl font-black text-teal-400 mt-1">{myResponses.filter(m => m.status === 'ACCEPTED').length}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { key: 'REQUESTS', label: 'Emergency Feed', icon: AlertTriangle },
          { key: 'HEALTH', label: 'Health & Eligibility', icon: ShieldCheck },
          { key: 'PROFILE', label: 'Profile & Privacy', icon: Settings },
          { key: 'HISTORY', label: 'Volunteer Commitments', icon: FileText },
          { key: 'CERTIFICATE', label: 'Recognition & Badges', icon: Award }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeTab === t.key 
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-200' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-rose-600 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* TAB 1: EMERGENCY REQUESTS FEED */}
          {activeTab === 'REQUESTS' && (
            <div className="space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" /> Compatible Emergency Requests Nearby
              </h2>

              {eligibleRequests.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-xs text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="font-bold text-slate-700">No active emergency requests matching your donor group right now</p>
                  <p className="text-slate-400">You will receive push notifications when an urgent match is registered nearby.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {eligibleRequests.map((req) => (
                    <div key={req._id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 hover:border-rose-200 transition-colors">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="w-11 h-11 rounded-2xl bg-blood-100 text-blood-700 font-black text-xl flex items-center justify-center border border-blood-200">
                            {req.bloodGroup}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">{req.requestNumber}</h4>
                            <p className="text-xs text-slate-500">{req.hospitalName}</p>
                          </div>
                        </div>

                        <span className="px-2.5 py-0.5 rounded font-extrabold text-[10px] bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                          {req.emergencyLevel}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                        <p><strong>Patient:</strong> {req.patientName} ({req.age} yrs)</p>
                        <p><strong>Required Units:</strong> {req.unitsRequired} Units</p>
                        <p className="italic text-slate-500">"{req.reason || 'Urgent transfusion requirement'}"</p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleRespond(req._id, 'DECLINED')}
                          className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleRespond(req._id, 'ACCEPTED')}
                          className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-200 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Heart className="w-4 h-4 fill-white" /> Accept & Volunteer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HEALTH & ELIGIBILITY ASSESSMENT */}
          {activeTab === 'HEALTH' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6 shadow-sm">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-rose-600" /> Donor Health & Medical Eligibility Assessment
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ensure safe blood donation by keeping your medical declaration up to date according to WHO & NBC guidelines.
                </p>
              </div>

              <form onSubmit={handleSaveHealthAssessment} className="space-y-6 max-w-2xl">
                {/* Status Indicator Banner */}
                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                  eligibilityData?.eligible || (isMedicallyEligible && cooldownDays === 0)
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <ShieldCheck className={`w-6 h-6 shrink-0 ${eligibilityData?.eligible || (isMedicallyEligible && cooldownDays === 0) ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <div className="text-xs">
                    <p className="font-extrabold text-sm">
                      {eligibilityData?.eligible || (isMedicallyEligible && cooldownDays === 0)
                        ? 'Eligible to Donate' 
                        : 'Not Currently Eligible'}
                    </p>
                    {eligibilityData?.nextEligibleDate ? (
                      <p className="mt-0.5 font-medium">
                        Next eligible date: <strong>{new Date(eligibilityData.nextEligibleDate).toLocaleDateString()}</strong>
                      </p>
                    ) : (
                      <p className="mt-0.5">
                        {!isMedicallyEligible 
                          ? 'Minimum weight of 45kg and absence of severe chronic conditions required for donor safety.' 
                          : 'Your health parameters are within safe operational limits.'}
                      </p>
                    )}
                  </div>
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Body Weight (kg)</label>
                    <input
                      type="number"
                      min="35"
                      max="150"
                      required
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                      className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:border-rose-500"
                    />
                    <span className="text-[11px] text-slate-400">Minimum threshold: 45 kg</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Total Past Donations Count</label>
                    <input
                      type="number"
                      min="0"
                      value={totalDonations}
                      onChange={(e) => setTotalDonations(e.target.value)}
                      className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Last Blood Donation Date</label>
                  <input
                    type="date"
                    value={lastDonationDate}
                    onChange={(e) => setLastDonationDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-[11px] text-slate-400">Used to compute mandatory 90-day cooldown interval</span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasChronicConditions}
                      onChange={(e) => setHasChronicConditions(e.target.checked)}
                      className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      I have pre-existing chronic conditions (Heart disease, Hepatitis, Severe anemia, Diabetes on insulin)
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-rose-200 transition-all"
                >
                  Save Health Assessment & Eligibility
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: PROFILE & PRIVACY SETTINGS */}
          {activeTab === 'PROFILE' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 space-y-6 shadow-sm">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-rose-600" /> Donor Profile & Privacy Preferences
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Manage your location details and configure phone number masking preferences.
                </p>
              </div>

              <form onSubmit={handleSaveProfileSettings} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-extrabold text-rose-600 focus:outline-none"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="New Delhi"
                      className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Delhi"
                      className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Privacy Setting Card */}
                <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <Lock className="w-4 h-4" /> Phone Number Privacy Settings
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hidePhonePublicly}
                      onChange={(e) => setHidePhonePublicly(e.target.checked)}
                      className="w-4 h-4 text-rose-500 rounded border-slate-700 focus:ring-rose-400"
                    />
                    <span className="text-xs text-slate-300">
                      Mask phone number on public donor directory search (Visible only to authorized hospital staff and accepted matches)
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs shadow-md shadow-rose-200 transition-all"
                >
                  Update Profile & Privacy Settings
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: VOLUNTEER COMMITMENTS HISTORY */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-600" /> My Volunteer Response Commitments
              </h2>

              {myResponses.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-xs text-slate-400">
                  You haven't responded to any emergency blood requests yet.
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                  {myResponses.map((match) => {
                    const req = match.requestId || {};
                    return (
                      <div key={match._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="w-11 h-11 rounded-2xl bg-blood-100 text-blood-700 font-black text-xl flex items-center justify-center border border-blood-200">
                            {req.bloodGroup || donorProfile?.bloodGroup}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-slate-900 text-sm">{req.requestNumber || 'Emergency Request'}</h4>
                              <StatusBadge status={match.status} />
                            </div>
                            <p className="text-xs text-slate-500">
                              Hospital: <strong>{req.hospitalName || 'General Hospital'}</strong> • Required: <strong>{req.unitsRequired || 1} Units</strong>
                            </p>
                          </div>
                        </div>

                        <div className="text-right text-xs text-slate-400 font-mono">
                          <p>Responded on:</p>
                          <p className="font-semibold text-slate-600">{new Date(match.responseTimestamp || match.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: RECOGNITION & DIGITAL CERTIFICATE */}
          {activeTab === 'CERTIFICATE' && (
            <div className="space-y-8">
              {/* Badges Overview */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                    <Award className="w-6 h-6 text-rose-600" /> Life Saver Milestone Badges
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Every donation can save up to 3 lives. Track your volunteer achievements.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className={`p-5 rounded-2xl border ${ (donorProfile?.totalDonations || 0) >= 1 ? 'bg-amber-50/80 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 opacity-50' } space-y-2`}>
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white font-black text-xl flex items-center justify-center shadow-md">
                      🥉
                    </div>
                    <h4 className="font-extrabold text-sm">Bronze Hero Donor</h4>
                    <p className="text-xs text-slate-600">Achieved after 1st successful blood donation.</p>
                    <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                      {(donorProfile?.totalDonations || 0) >= 1 ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>

                  <div className={`p-5 rounded-2xl border ${ (donorProfile?.totalDonations || 0) >= 4 ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-slate-50 border-slate-200 opacity-50' } space-y-2`}>
                    <div className="w-10 h-10 rounded-xl bg-slate-400 text-white font-black text-xl flex items-center justify-center shadow-md">
                      🥈
                    </div>
                    <h4 className="font-extrabold text-sm">Silver Life Saver</h4>
                    <p className="text-xs text-slate-600">Achieved after 4+ blood donations.</p>
                    <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                      {(donorProfile?.totalDonations || 0) >= 4 ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>

                  <div className={`p-5 rounded-2xl border ${ (donorProfile?.totalDonations || 0) >= 8 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 opacity-50' } space-y-2`}>
                    <div className="w-10 h-10 rounded-xl bg-rose-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                      🥇
                    </div>
                    <h4 className="font-extrabold text-sm">Gold Blood Champion</h4>
                    <p className="text-xs text-slate-600">Achieved after 8+ blood donations.</p>
                    <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                      {(donorProfile?.totalDonations || 0) >= 8 ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Digital Certificate Card */}
              <div className="bg-gradient-to-br from-slate-900 via-rose-950 to-slate-950 p-8 sm:p-12 rounded-3xl border-4 border-rose-800/40 text-white space-y-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Heart className="w-96 h-96 fill-white" />
                </div>

                <div className="flex items-center justify-between border-b border-rose-900/60 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-rose-950">
                      <Heart className="w-7 h-7 fill-white" />
                    </div>
                    <div>
                      <h3 className="font-black text-2xl tracking-wider">RaktSaarthi</h3>
                      <p className="text-[10px] text-rose-300 font-mono uppercase tracking-widest">Connecting hope when it matters most • National Smart Emergency Blood Coordination System</p>
                    </div>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all print:hidden"
                  >
                    <Printer className="w-4 h-4 text-rose-600" /> Print / Download Certificate
                  </button>
                </div>

                <div className="text-center space-y-4 py-6">
                  <span className="px-4 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full text-xs font-bold uppercase tracking-widest">
                    CERTIFICATE OF APPRECIATION
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {donorProfile?.userId?.name || 'Honored Volunteer Donor'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
                    In recognition of your selflessness, dedication, and vital contribution as a registered <span className="font-extrabold text-rose-400">{donorProfile?.bloodGroup || 'O+'}</span> volunteer blood donor. Your contributions have helped safeguard patient lives during critical medical emergencies.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-rose-900/60 text-xs">
                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Donations</span>
                    <p className="font-black text-xl text-rose-400 mt-1">{donorProfile?.totalDonations || 0} Times</p>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Estimated Lives Impacted</span>
                    <p className="font-black text-xl text-emerald-400 mt-1">{(donorProfile?.totalDonations || 0) * 3} Lives</p>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Verification Code</span>
                    <p className="font-mono font-bold text-slate-200 mt-1">BL-CERT-{donorProfile?._id?.slice(-8) || '2026-HERO'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DonorDashboard;
