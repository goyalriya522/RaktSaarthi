import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HeartPulse, PlusCircle, BrainCircuit, AlertTriangle, FileText, Upload, CheckCircle2, Clock, WifiOff } from 'lucide-react';
import API from '../../services/api';
import { useOffline } from '../../context/OfflineContext';

const CreateRequestPage = () => {
  const [searchParams] = useSearchParams();
  const prefilledBg = searchParams.get('bloodGroup') || 'O+';

  const { isOnline, addOfflineRequest } = useOffline();

  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('35');
  const [gender, setGender] = useState('Male');
  const [bloodGroup, setBloodGroup] = useState(prefilledBg);
  const [unitsRequired, setUnitsRequired] = useState('2');
  const [hospitalName, setHospitalName] = useState('Metro Apex Super-Specialty Hospital');
  const [hospitalAddress, setHospitalAddress] = useState('Sector 62, Medical Hub, Delhi-NCR');
  const [emergencyLevel, setEmergencyLevel] = useState('CRITICAL');
  const [contactPhone, setContactPhone] = useState('+91 9876543210');
  const [contactName, setContactName] = useState('');
  const [reason, setReason] = useState('Emergency ICU Trauma Surgery post road accident.');
  const [requiredByDate, setRequiredByDate] = useState('');
  const [supportingDocs, setSupportingDocs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSupportingDocs(prev => [
          ...prev,
          {
            name: file.name,
            type: file.type || 'application/pdf',
            url: reader.result
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeDoc = (index) => {
    setSupportingDocs(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const clientRequestId = `CLIENT-REQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payload = {
      clientRequestId,
      patientName,
      age: parseInt(age),
      gender,
      bloodGroup,
      unitsRequired: parseInt(unitsRequired),
      hospitalName,
      hospitalAddress,
      emergencyLevel,
      contactPhone,
      contactName: contactName || patientName,
      reason,
      supportingDocs,
      requiredByDate: requiredByDate ? new Date(requiredByDate) : new Date(Date.now() + 12 * 3600 * 1000)
    };

    if (!navigator.onLine) {
      try {
        await addOfflineRequest(payload);
        setLoading(false);
        navigate('/patient/requests?offlineCreated=true');
        return;
      } catch (err) {
        setError('Failed to save request locally in offline queue.');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await API.post('/requests', payload);
      if (res.data.success) {
        navigate(`/patient/requests/${res.data.request._id}`);
      }
    } catch (err) {
      if (!err.response) {
        // Network error during send - fallback to offline queue
        await addOfflineRequest(payload);
        navigate('/patient/requests?offlineCreated=true');
      } else {
        setError(err.response?.data?.message || 'Failed to submit request.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blood-600 text-white flex items-center justify-center shadow-lg shadow-blood-200">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blood-600 bg-blood-50 px-2 py-0.5 rounded">
                <BrainCircuit className="w-3.5 h-3.5" /> AI Priority Assisted
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900">Create Emergency Blood Request</h1>
            </div>
          </div>

          {!isOnline && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-extrabold flex items-center gap-1.5 animate-pulse">
              <WifiOff className="w-4 h-4 text-amber-600" /> Offline Creation Mode
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Details */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blood-600" /> 1. Patient & Medical Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Patient Name"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                <input
                  type="number"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Blood Requirement */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-blood-600" /> 2. Blood Requirement & Urgency
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group Required</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-blood-600 focus:ring-2 focus:ring-blood-600 focus:outline-none"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Required Units</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={unitsRequired}
                  onChange={(e) => setUnitsRequired(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Level</label>
                <select
                  value={emergencyLevel}
                  onChange={(e) => setEmergencyLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-rose-600 focus:ring-2 focus:ring-blood-600 focus:outline-none"
                >
                  <option value="CRITICAL">CRITICAL (Immediate Dispatch)</option>
                  <option value="URGENT">URGENT (Within 12 Hours)</option>
                  <option value="ROUTINE">ROUTINE (Planned Transfusion)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Hospital & Contact */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blood-600" /> 3. Hospital Location & Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Name</label>
                <input
                  type="text"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="Metro Apex Hospital"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Phone</label>
                <input
                  type="text"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital Address / Room No</label>
                <input
                  type="text"
                  required
                  value={hospitalAddress}
                  onChange={(e) => setHospitalAddress(e.target.value)}
                  placeholder="Sector 62, ICU Ward Bed #4"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Diagnosis & Reason</label>
                <textarea
                  rows="3"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide diagnosis, surgery schedule, Hb count..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blood-600 focus:outline-none"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Supporting Medical Documentation Upload */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-blood-600" /> 4. Medical Prescription & Document Attachments
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">Optional but speeds up ER Verification</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="px-4 py-2.5 bg-white border border-slate-300 hover:border-blood-500 rounded-xl text-xs font-extrabold text-slate-700 cursor-pointer shadow-sm flex items-center gap-2 transition-colors">
                <Upload className="w-4 h-4 text-blood-600" /> Choose Prescription File(s)
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-400">PDF, JPG, PNG accepted</span>
            </div>

            {supportingDocs.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {supportingDocs.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-slate-800 truncate max-w-xs">{doc.name}</span>
                    <button
                      type="button"
                      onClick={() => removeDoc(idx)}
                      className="text-rose-500 hover:text-rose-700 font-bold ml-1 text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 text-white font-extrabold rounded-2xl text-sm shadow-xl transition-all disabled:opacity-50 ${
              isOnline 
                ? 'bg-blood-600 hover:bg-blood-700 shadow-blood-200' 
                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
            }`}
          >
            {loading 
              ? (isOnline ? 'Submitting & Running AI Matching...' : 'Saving to Local Queue...') 
              : (isOnline ? 'Submit Emergency Blood Request' : 'Save Offline Request (Pending Sync)')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRequestPage;

