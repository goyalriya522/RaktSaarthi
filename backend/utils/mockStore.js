const bcrypt = require('bcryptjs');

// In-Memory dataset for instant offline execution
const mockStore = {
  users: [
    {
      _id: '507f1f77bcf86cd799439011',
      name: 'System Administrator',
      email: 'admin@bloodlink.org',
      passwordHash: '$2a$10$wE.6481oE2iQx1E5K.O3ueo09X4n59o6w0w4g.3p.81O.68652O6y', // Admin@123
      phone: '+1 800-555-0199',
      role: 'admin',
      isActive: true,
      isVerified: true
    },
    {
      _id: '507f1f77bcf86cd799439012',
      name: 'Rahul Verma',
      email: 'patient@bloodlink.org',
      passwordHash: '$2a$10$wE.6481oE2iQx1E5K.O3ueo09X4n59o6w0w4g.3p.81O.68652O6y', // Patient@123
      phone: '+91 9876543210',
      role: 'patient',
      isActive: true,
      isVerified: true
    },
    {
      _id: '507f1f77bcf86cd799439013',
      name: 'Dr. Ananya Roy',
      email: 'cityhospital@bloodlink.org',
      passwordHash: '$2a$10$wE.6481oE2iQx1E5K.O3ueo09X4n59o6w0w4g.3p.81O.68652O6y', // Hospital@123
      phone: '+91 9811223344',
      role: 'hospital',
      isActive: true,
      isVerified: true
    },
    {
      _id: '507f1f77bcf86cd799439014',
      name: 'Vikram Singh',
      email: 'centralbank@bloodlink.org',
      passwordHash: '$2a$10$wE.6481oE2iQx1E5K.O3ueo09X4n59o6w0w4g.3p.81O.68652O6y', // Bank@123
      phone: '+91 9988776655',
      role: 'bloodbank',
      isActive: true,
      isVerified: true
    },
    {
      _id: '507f1f77bcf86cd799439015',
      name: 'Siddharth Malhotra',
      email: 'donor1@bloodlink.org',
      passwordHash: '$2a$10$wE.6481oE2iQx1E5K.O3ueo09X4n59o6w0w4g.3p.81O.68652O6y', // Donor@123
      phone: '+91 9711002233',
      role: 'patient',
      isActive: true,
      isVerified: true
    }
  ],
  hospitals: [
    {
      _id: '607f1f77bcf86cd799439021',
      userId: '507f1f77bcf86cd799439013',
      hospitalName: 'Metro Apex Super-Specialty Hospital',
      registrationNo: 'HOSP-2026-7890',
      address: 'Sector 62, Medical Hub',
      city: 'Delhi-NCR',
      state: 'Delhi',
      pincode: '110001',
      location: { type: 'Point', coordinates: [77.2090, 28.6139] },
      contactPerson: 'Dr. Ananya Roy (ER Head)',
      contactPhone: '+91 9811223344',
      emergencyPhone: '+91 11-44556677',
      totalBeds: 350,
      icuBeds: 45,
      isVerified: true
    }
  ],
  bloodBanks: [
    {
      _id: '707f1f77bcf86cd799439031',
      userId: '507f1f77bcf86cd799439014',
      name: 'Central Red Cross Regional Blood Bank',
      licenseNo: 'LIC-BB-2026-1029',
      address: 'Plot 12, Blood Transfusion Complex',
      city: 'Delhi-NCR',
      state: 'Delhi',
      pincode: '110002',
      location: { type: 'Point', coordinates: [77.2150, 28.6200] },
      phone: '+91 9988776655',
      operatingHours: '24 Hours Emergency Dispatch',
      isVerified: true
    }
  ],
  inventories: [
    { _id: 'inv1', bloodBankId: '707f1f77bcf86cd799439031', bloodGroup: 'O-', availableUnits: 14, reservedUnits: 2, lastUpdated: new Date() },
    { _id: 'inv2', bloodBankId: '707f1f77bcf86cd799439031', bloodGroup: 'O+', availableUnits: 28, reservedUnits: 0, lastUpdated: new Date() },
    { _id: 'inv3', bloodBankId: '707f1f77bcf86cd799439031', bloodGroup: 'A+', availableUnits: 22, reservedUnits: 0, lastUpdated: new Date() },
    { _id: 'inv4', bloodBankId: '707f1f77bcf86cd799439031', bloodGroup: 'A-', availableUnits: 8, reservedUnits: 0, lastUpdated: new Date() },
    { _id: 'inv5', bloodBankId: '707f1f77bcf86cd799439031', bloodGroup: 'B+', availableUnits: 35, reservedUnits: 1, lastUpdated: new Date() },
    { _id: 'inv6', bloodBankId: '707f1f77bcf86cd799439031', bloodGroup: 'B-', availableUnits: 6, reservedUnits: 0, lastUpdated: new Date() },
    { _id: 'inv7', bloodBankId: '707f1f77bcf86cd799439031', bloodGroup: 'AB+', availableUnits: 18, reservedUnits: 0, lastUpdated: new Date() },
    { _id: 'inv8', bloodBankId: '707f1f77bcf86cd799439031', bloodGroup: 'AB-', availableUnits: 4, reservedUnits: 0, lastUpdated: new Date() }
  ],
  donors: [
    {
      _id: 'don1',
      userId: '507f1f77bcf86cd799439015',
      bloodGroup: 'O-',
      gender: 'Male',
      city: 'Delhi-NCR',
      state: 'Delhi',
      location: { type: 'Point', coordinates: [77.2100, 28.6150] },
      isAvailable: true,
      totalDonations: 8,
      privacySettings: { hidePhonePublicly: true }
    }
  ],
  requests: [
    {
      _id: 'req1',
      requestNumber: 'BL-2026-9001',
      patientId: '507f1f77bcf86cd799439012',
      patientName: 'Kavita Verma',
      age: 42,
      gender: 'Female',
      bloodGroup: 'O-',
      unitsRequired: 2,
      hospitalName: 'Metro Apex Super-Specialty Hospital',
      hospitalAddress: 'Sector 62, Medical Hub, Delhi-NCR',
      hospitalLocation: { type: 'Point', coordinates: [77.2090, 28.6139] },
      emergencyLevel: 'CRITICAL',
      requiredByDate: new Date(Date.now() + 6 * 3600 * 1000),
      contactPhone: '+91 9876543210',
      contactName: 'Rahul Verma',
      reason: 'Emergency ICU Surgery post accident. Urgent O- negative units required.',
      status: 'Verified',
      statusHistory: [
        { status: 'Submitted', role: 'patient', note: 'Request created by family', timestamp: new Date(Date.now() - 2 * 3600 * 1000) },
        { status: 'Verified', role: 'hospital', note: 'Hospital ER verified critical requirement', timestamp: new Date(Date.now() - 1 * 3600 * 1000) }
      ],
      aiAnalysis: {
        priorityScore: 92,
        confidence: 94,
        recommendations: 'CRITICAL PRIORITY ACTION: Reserve 2 units O- from Central Red Cross Regional Blood Bank. Dispatch alert to Siddharth Malhotra.'
      },
      createdAt: new Date(Date.now() - 2 * 3600 * 1000)
    },
    {
      _id: 'req2',
      requestNumber: 'BL-2026-9002',
      patientId: '507f1f77bcf86cd799439012',
      patientName: 'Aarav Sharma',
      age: 12,
      gender: 'Male',
      bloodGroup: 'B+',
      unitsRequired: 1,
      hospitalName: 'City Children Specialty Clinic',
      hospitalAddress: 'Block C, Vasant Vihar',
      hospitalLocation: { type: 'Point', coordinates: [77.1900, 28.5800] },
      emergencyLevel: 'URGENT',
      requiredByDate: new Date(Date.now() + 18 * 3600 * 1000),
      contactPhone: '+91 9876543210',
      contactName: 'Rahul Verma',
      reason: 'Recurring Thalassemia Major Blood Transfusion Protocol',
      status: 'Submitted',
      statusHistory: [
        { status: 'Submitted', role: 'patient', note: 'Auto-generated from Thalassemia Schedule', timestamp: new Date(Date.now() - 5 * 3600 * 1000) }
      ],
      aiAnalysis: {
        priorityScore: 65,
        confidence: 88,
        recommendations: 'URGENT ACTION: Verify request with hospital. Match with Central Blood Bank stock.'
      },
      createdAt: new Date(Date.now() - 5 * 3600 * 1000)
    }
  ],
  thalassemiaProfiles: [
    {
      _id: 'thal1',
      userId: '507f1f77bcf86cd799439012',
      patientName: 'Aarav Sharma',
      age: 12,
      gender: 'Male',
      bloodGroup: 'B+',
      hospitalName: 'City Children Specialty Clinic',
      transfusionIntervalDays: 21,
      lastTransfusionDate: new Date(Date.now() - 18 * 24 * 3600 * 1000),
      nextExpectedDate: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      contactPhone: '+91 9876543210',
      isActive: true
    }
  ],
  notifications: [
    {
      _id: 'notif1',
      recipientRole: 'all',
      title: 'RaktSaarthi System Operational',
      message: 'Welcome to RaktSaarthi Smart Blood Coordination System. Real-time emergency matching active.',
      type: 'SYSTEM_ADMIN',
      isRead: false,
      createdAt: new Date()
    }
  ],
  auditLogs: [
    {
      _id: 'log1',
      userName: 'System Administrator',
      userRole: 'admin',
      action: 'SYSTEM_INITIALIZED',
      resource: 'SystemSettings',
      ipAddress: '127.0.0.1',
      timestamp: new Date()
    }
  ]
};

module.exports = mockStore;
