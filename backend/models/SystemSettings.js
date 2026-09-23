const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  platformName: { type: String, default: 'RaktSaarthi Smart System' },
  allowPublicDonorSearch: { type: Boolean, default: true },
  autoMatchRadiusKm: { type: Number, default: 25 },
  emergencyAlertRadiusKm: { type: Number, default: 50 },
  maintenanceMode: { type: Boolean, default: false },
  thalassemiaReminderAdvanceDays: { type: Number, default: 3 },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
