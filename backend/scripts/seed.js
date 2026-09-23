const mongoose = require('mongoose');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const BloodBank = require('../models/BloodBank');
const BloodInventory = require('../models/BloodInventory');
const BloodUnit = require('../models/BloodUnit');
const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const ThalassemiaProfile = require('../models/ThalassemiaProfile');
const AuditLog = require('../models/AuditLog');
const SystemSettings = require('../models/SystemSettings');

const seedData = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bloodlink';
    console.log('Connecting to database for seeding...');
    await mongoose.connect(connStr, { serverSelectionTimeoutMS: 3000 });

    console.log('Clearing old records...');
    await User.deleteMany({});
    await Hospital.deleteMany({});
    await BloodBank.deleteMany({});
    await BloodInventory.deleteMany({});
    await BloodUnit.deleteMany({});
    await Donor.deleteMany({});
    await BloodRequest.deleteMany({});

    await ThalassemiaProfile.deleteMany({});
    await AuditLog.deleteMany({});
    await SystemSettings.deleteMany({});

    console.log('Seeding System Settings...');
    await SystemSettings.create({
      platformName: 'RaktSaarthi Smart System',
      allowPublicDonorSearch: true,
      autoMatchRadiusKm: 25,
      emergencyAlertRadiusKm: 50,
      maintenanceMode: false
    });

    console.log('Seeding Admin User...');
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@bloodlink.org',
      password: 'Admin@123',
      phone: '+1 800-555-0199',
      role: 'admin',
      isVerified: true
    });

    console.log('Seeding Patient User...');
    const patientUser = await User.create({
      name: 'Rahul Verma',
      email: 'patient@bloodlink.org',
      password: 'Patient@123',
      phone: '+91 9876543210',
      role: 'patient',
      isVerified: true
    });

    console.log('Seeding Hospital Staff...');
    const hospitalUser = await User.create({
      name: 'Dr. Ananya Roy',
      email: 'cityhospital@bloodlink.org',
      password: 'Hospital@123',
      phone: '+91 9811223344',
      role: 'hospital',
      isVerified: true
    });

    const hospital = await Hospital.create({
      userId: hospitalUser._id,
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
    });

    console.log('Seeding Blood Bank Staff...');
    const bloodbankUser = await User.create({
      name: 'Vikram Singh',
      email: 'centralbank@bloodlink.org',
      password: 'Bank@123',
      phone: '+91 9988776655',
      role: 'bloodbank',
      isVerified: true
    });

    const bloodBank = await BloodBank.create({
      userId: bloodbankUser._id,
      name: 'Central Red Cross Regional Blood Bank',
      licenseNo: 'LIC-BB-2026-1029',
      address: 'Plot 12, Blood Transfusion Complex',
      city: 'Delhi-NCR',
      state: 'Delhi',
      pincode: '110002',
      location: { type: 'Point', coordinates: [77.2150, 28.6200] },
      phone: '+91 9988776655',
      emergencyPhone: '+91 11-22334455',
      operatingHours: '24 Hours Emergency Dispatch',
      isVerified: true
    });

    console.log('Seeding Blood Units & Inventory...');
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const sampleUnits = [
      // Expiring soon examples
      { unitId: 'RB1024', bloodGroup: 'O+', componentType: 'RBC', collectionDate: new Date(now - 32 * day), expiryDate: new Date(now + 3 * day), quantity: 5, storageLocation: 'Fridge B2 - Rack 1', status: 'AVAILABLE' },
      { unitId: 'PT3092', bloodGroup: 'B+', componentType: 'Platelets', collectionDate: new Date(now - 3 * day), expiryDate: new Date(now + 4 * day), quantity: 3, storageLocation: 'Platelet Agitator 1', status: 'AVAILABLE' },
      { unitId: 'RB7088', bloodGroup: 'AB-', componentType: 'RBC', collectionDate: new Date(now - 31 * day), expiryDate: new Date(now + 4 * day), quantity: 2, storageLocation: 'Fridge A1 - Rack 3', status: 'AVAILABLE' },

      // Expired examples
      { unitId: 'PL2041', bloodGroup: 'O-', componentType: 'Plasma', collectionDate: new Date(now - 45 * day), expiryDate: new Date(now - 2 * day), quantity: 2, storageLocation: 'Deep Freezer 2', status: 'EXPIRED' },
      { unitId: 'WB6099', bloodGroup: 'B-', componentType: 'Whole Blood', collectionDate: new Date(now - 36 * day), expiryDate: new Date(now - 1 * day), quantity: 1, storageLocation: 'Quarantine Rack C', status: 'EXPIRED' },

      // Safe / Available examples (> 7 days)
      { unitId: 'WB1055', bloodGroup: 'A+', componentType: 'Whole Blood', collectionDate: new Date(now - 10 * day), expiryDate: new Date(now + 25 * day), quantity: 15, storageLocation: 'Fridge A1 - Rack 1', status: 'AVAILABLE' },
      { unitId: 'RB4011', bloodGroup: 'AB+', componentType: 'RBC', collectionDate: new Date(now - 5 * day), expiryDate: new Date(now + 30 * day), quantity: 10, storageLocation: 'Fridge A2 - Rack 2', status: 'AVAILABLE' },
      { unitId: 'PL5012', bloodGroup: 'A-', componentType: 'Plasma', collectionDate: new Date(now - 15 * day), expiryDate: new Date(now + 14 * day), quantity: 8, storageLocation: 'Freezer B1 - Shelf 4', status: 'AVAILABLE' },
      { unitId: 'RB9001', bloodGroup: 'O+', componentType: 'Whole Blood', collectionDate: new Date(now - 4 * day), expiryDate: new Date(now + 31 * day), quantity: 20, storageLocation: 'Fridge B1 - Shelf 2', status: 'AVAILABLE' },
      { unitId: 'RB9002', bloodGroup: 'O-', componentType: 'RBC', collectionDate: new Date(now - 8 * day), expiryDate: new Date(now + 27 * day), quantity: 12, storageLocation: 'Fridge A1 - Rack 2', status: 'AVAILABLE' }
    ];

    for (const u of sampleUnits) {
      await BloodUnit.create({
        bloodBankId: bloodBank._id,
        ...u
      });
    }

    const { autoSyncAndCheckExpiries } = require('../controllers/inventoryController');
    await autoSyncAndCheckExpiries(bloodBank._id);


    console.log('Seeding Volunteer Donors...');
    const donor1User = await User.create({
      name: 'Siddharth Malhotra',
      email: 'donor1@bloodlink.org',
      password: 'Donor@123',
      phone: '+91 9711002233',
      role: 'patient',
      isVerified: true
    });

    await Donor.create({
      userId: donor1User._id,
      bloodGroup: 'O-',
      gender: 'Male',
      city: 'Delhi-NCR',
      state: 'Delhi',
      location: { type: 'Point', coordinates: [77.2100, 28.6150] },
      isAvailable: true,
      totalDonations: 8,
      lastDonationDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    });

    const donor2User = await User.create({
      name: 'Priya Sundaram',
      email: 'donor2@bloodlink.org',
      password: 'Donor@123',
      phone: '+91 9655443322',
      role: 'patient',
      isVerified: true
    });

    await Donor.create({
      userId: donor2User._id,
      bloodGroup: 'A+',
      gender: 'Female',
      city: 'Delhi-NCR',
      state: 'Delhi',
      location: { type: 'Point', coordinates: [77.2200, 28.6250] },
      isAvailable: true,
      totalDonations: 5,
      lastDonationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    });

    console.log('Seeding Emergency Blood Requests...');
    await BloodRequest.create({
      requestNumber: 'BL-2026-9001',
      patientId: patientUser._id,
      patientName: 'Kavita Verma',
      age: 42,
      gender: 'Female',
      bloodGroup: 'O-',
      unitsRequired: 2,
      hospitalName: 'Metro Apex Super-Specialty Hospital',
      hospitalAddress: 'Sector 62, Medical Hub, Delhi-NCR',
      hospitalLocation: { type: 'Point', coordinates: [77.2090, 28.6139] },
      emergencyLevel: 'CRITICAL',
      requiredByDate: new Date(Date.now() + 6 * 60 * 60 * 1000),
      contactPhone: '+91 9876543210',
      contactName: 'Rahul Verma',
      reason: 'Emergency ICU Surgery post accident. Urgent O- negative units required.',
      status: 'Verified',
      verifiedByHospital: hospital._id,
      statusHistory: [
        { status: 'Submitted', updatedBy: patientUser._id, role: 'patient', note: 'Request created by family', timestamp: new Date(Date.now() - 2 * 3600 * 1000) },
        { status: 'Verified', updatedBy: hospitalUser._id, role: 'hospital', note: 'Hospital ER verified critical requirement', timestamp: new Date(Date.now() - 1 * 3600 * 1000) }
      ],
      aiAnalysis: {
        priorityScore: 92,
        confidence: 94,
        recommendations: 'CRITICAL PRIORITY ACTION: Reserve 2 units O- from Central Red Cross Regional Blood Bank. Dispatch alert to Siddharth Malhotra.'
      }
    });

    await BloodRequest.create({
      requestNumber: 'BL-2026-9002',
      patientId: patientUser._id,
      patientName: 'Aarav Sharma',
      age: 12,
      gender: 'Male',
      bloodGroup: 'B+',
      unitsRequired: 1,
      hospitalName: 'City Children Specialty Clinic',
      hospitalAddress: 'Block C, Vasant Vihar',
      hospitalLocation: { type: 'Point', coordinates: [77.1900, 28.5800] },
      emergencyLevel: 'URGENT',
      requiredByDate: new Date(Date.now() + 18 * 60 * 60 * 1000),
      contactPhone: '+91 9876543210',
      contactName: 'Rahul Verma',
      reason: 'Recurring Thalassemia Major Blood Transfusion Protocol',
      status: 'Submitted',
      statusHistory: [
        { status: 'Submitted', updatedBy: patientUser._id, role: 'patient', note: 'Auto-generated from Thalassemia Schedule', timestamp: new Date(Date.now() - 5 * 3600 * 1000) }
      ],
      aiAnalysis: {
        priorityScore: 65,
        confidence: 88,
        recommendations: 'URGENT ACTION: Verify request with hospital. Match with Central Blood Bank stock.'
      }
    });

    console.log('Seeding Thalassemia Profile...');
    await ThalassemiaProfile.create({
      userId: patientUser._id,
      patientName: 'Aarav Sharma',
      age: 12,
      gender: 'Male',
      bloodGroup: 'B+',
      hospitalName: 'City Children Specialty Clinic',
      transfusionIntervalDays: 21,
      lastTransfusionDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      nextExpectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Due in 3 days!
      preferredBloodBank: 'Central Red Cross Regional Blood Bank',
      contactPhone: '+91 9876543210',
      notes: 'Requires leucoreduced packed red blood cells'
    });

    console.log('Seeding Audit Logs...');
    await AuditLog.create({
      userId: admin._id,
      userName: admin.name,
      userRole: 'admin',
      action: 'SYSTEM_INITIALIZED',
      resource: 'SystemSettings',
      details: { environment: 'Production-Ready' }
    });

    console.log('\n======================================================');
    console.log('🎉 SEEDING COMPLETE! Test Credentials:');
    console.log('------------------------------------------------------');
    console.log('👑 ADMIN:        admin@bloodlink.org / Admin@123');
    console.log('🏥 HOSPITAL:     cityhospital@bloodlink.org / Hospital@123');
    console.log('🩸 BLOOD BANK:   centralbank@bloodlink.org / Bank@123');
    console.log('👤 PATIENT:      patient@bloodlink.org / Patient@123');
    console.log('❤️ DONOR 1 (O-): donor1@bloodlink.org / Donor@123');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error);
    process.exit(1);
  }
};

seedData();
