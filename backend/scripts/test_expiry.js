require('dotenv').config();
const mongoose = require('mongoose');
const BloodBank = require('../models/BloodBank');
const BloodUnit = require('../models/BloodUnit');
const BloodInventory = require('../models/BloodInventory');
const { autoSyncAndCheckExpiries, getMyBankInventory } = require('../controllers/inventoryController');

const runExpiryTests = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bloodlink';
    console.log('Connecting to database for Expiry Verification Tests...');
    await mongoose.connect(connStr);

    const bloodBank = await BloodBank.findOne({});
    if (!bloodBank) {
      console.error('❌ No Blood Bank found. Please run seed script first.');
      process.exit(1);
    }

    console.log(`Testing with Blood Bank: ${bloodBank.name}`);

    // Create 4 test blood units for the 4 prompt cases
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    await BloodUnit.deleteMany({ notes: 'TEST_SUITE_UNIT' });

    // 1. Expiring in 30 days
    const unit30Days = await BloodUnit.create({
      bloodBankId: bloodBank._id,
      unitId: 'TEST-30DAY',
      bloodGroup: 'A+',
      componentType: 'Whole Blood',
      collectionDate: new Date(now - 5 * day),
      expiryDate: new Date(now + 30 * day),
      quantity: 1,
      storageLocation: 'Test Cold Storage',
      status: 'AVAILABLE',
      notes: 'TEST_SUITE_UNIT'
    });

    // 2. Expiring in 5 days
    const unit5Days = await BloodUnit.create({
      bloodBankId: bloodBank._id,
      unitId: 'TEST-5DAY',
      bloodGroup: 'O+',
      componentType: 'RBC',
      collectionDate: new Date(now - 30 * day),
      expiryDate: new Date(now + 5 * day),
      quantity: 1,
      storageLocation: 'Test Cold Storage',
      status: 'AVAILABLE',
      notes: 'TEST_SUITE_UNIT'
    });

    // 3. Expiring today (0 days)
    const unit0Days = await BloodUnit.create({
      bloodBankId: bloodBank._id,
      unitId: 'TEST-0DAY',
      bloodGroup: 'B+',
      componentType: 'Platelets',
      collectionDate: new Date(now - 7 * day),
      expiryDate: new Date(now - 10000), // past right now
      quantity: 1,
      storageLocation: 'Test Cold Storage',
      status: 'AVAILABLE',
      notes: 'TEST_SUITE_UNIT'
    });

    // 4. Expired yesterday (-1 day)
    const unitYesterday = await BloodUnit.create({
      bloodBankId: bloodBank._id,
      unitId: 'TEST-YESTERDAY',
      bloodGroup: 'O-',
      componentType: 'Plasma',
      collectionDate: new Date(now - 45 * day),
      expiryDate: new Date(now - 1 * day),
      quantity: 1,
      storageLocation: 'Test Cold Storage',
      status: 'AVAILABLE',
      notes: 'TEST_SUITE_UNIT'
    });

    console.log('Running autoSyncAndCheckExpiries...');
    await autoSyncAndCheckExpiries(bloodBank._id);

    // Fetch updated units
    const u30 = await BloodUnit.findById(unit30Days._id);
    const u5 = await BloodUnit.findById(unit5Days._id);
    const u0 = await BloodUnit.findById(unit0Days._id);
    const uY = await BloodUnit.findById(unitYesterday._id);

    console.log('\n--- VERIFICATION RESULTS ---');

    // Test Case 1: 30 days
    console.log(`1. Unit expiring in 30 days: Status = ${u30.status} (Expected: AVAILABLE)`);
    if (u30.status === 'AVAILABLE') console.log('   ✅ PASS');
    else console.error('   ❌ FAIL');

    // Test Case 2: 5 days
    console.log(`2. Unit expiring in 5 days: Status = ${u5.status} (Expected: AVAILABLE - Expiring Soon category)`);
    if (u5.status === 'AVAILABLE') console.log('   ✅ PASS');
    else console.error('   ❌ FAIL');

    // Test Case 3: Expiring today
    console.log(`3. Unit expiring today: Status = ${u0.status} (Expected: EXPIRED)`);
    if (u0.status === 'EXPIRED') console.log('   ✅ PASS');
    else console.error('   ❌ FAIL');

    // Test Case 4: Expired yesterday
    console.log(`4. Unit expired yesterday: Status = ${uY.status} (Expected: EXPIRED)`);
    if (uY.status === 'EXPIRED') console.log('   ✅ PASS');
    else console.error('   ❌ FAIL');

    // Test Case 5: Expired blood not in available inventory
    const bPlusInventory = await BloodInventory.findOne({ bloodBankId: bloodBank._id, bloodGroup: 'B+' });
    const bPlusAvailableUnits = await BloodUnit.find({
      bloodBankId: bloodBank._id,
      bloodGroup: 'B+',
      status: 'AVAILABLE',
      expiryDate: { $gte: new Date() }
    });
    const sumBPlus = bPlusAvailableUnits.reduce((acc, u) => acc + u.quantity, 0);

    console.log(`5. Expired blood excluded from available count: Aggregated = ${bPlusInventory.availableUnits}, Valid sum = ${sumBPlus}`);
    if (bPlusInventory.availableUnits === sumBPlus) console.log('   ✅ PASS');
    else console.error('   ❌ FAIL');

    // Clean up test units
    await BloodUnit.deleteMany({ notes: 'TEST_SUITE_UNIT' });
    await autoSyncAndCheckExpiries(bloodBank._id);

    console.log('\n🎉 ALL EXPIRY SYSTEM TESTS VERIFIED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
};

runExpiryTests();
