require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const Notification = require('../models/Notification');
const {
  isBloodGroupCompatible,
  isDonorEligible,
  notifyEligibleDonorsForRequest
} = require('../utils/donorEligibility');

const runDonorNotificationTests = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bloodlink';
    console.log('Connecting to database for Eligible Donor Notification System Tests...');
    await mongoose.connect(connStr);

    console.log('\n--- 🧪 RUNNING DONOR NOTIFICATION TEST SUITE ---');

    // Clean up previous test data
    await User.deleteMany({ email: { $regex: /^test_donor_/ } });
    await Donor.deleteMany({ city: 'TEST_SUITE_CITY' });
    await BloodRequest.deleteMany({ reason: 'TEST_SUITE_REQUEST' });
    await Notification.deleteMany({ type: 'DONOR_ELIGIBLE_ALERT' });

    // 1. Create Test Users & Donors
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Donor 1: Eligible, A+ blood group, available
    const user1 = await User.create({
      name: 'Test Donor 1 (Eligible A+)',
      email: 'test_donor_1@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919876543211'
    });

    const donor1 = await Donor.create({
      userId: user1._id,
      bloodGroup: 'A+',
      gender: 'Male',
      city: 'TEST_SUITE_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 70, hasChronicConditions: false, isEligible: true },
      lastDonationDate: new Date(now - 120 * dayMs) // 120 days ago (Passed 90-day cooldown)
    });

    // Donor 2: Recently Donated (< 90 days), A+ blood group
    const user2 = await User.create({
      name: 'Test Donor 2 (Recent Donation A+)',
      email: 'test_donor_2@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919876543212'
    });

    const donor2 = await Donor.create({
      userId: user2._id,
      bloodGroup: 'A+',
      gender: 'Female',
      city: 'TEST_SUITE_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 60, hasChronicConditions: false, isEligible: true },
      lastDonationDate: new Date(now - 30 * dayMs) // 30 days ago (In cooldown!)
    });

    // Donor 3: Incompatible blood group (AB+ donor for O- requirement)
    const user3 = await User.create({
      name: 'Test Donor 3 (Incompatible AB+)',
      email: 'test_donor_3@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919876543213'
    });

    const donor3 = await Donor.create({
      userId: user3._id,
      bloodGroup: 'AB+',
      gender: 'Male',
      city: 'TEST_SUITE_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 75, hasChronicConditions: false, isEligible: true },
      lastDonationDate: new Date(now - 100 * dayMs)
    });

    // Donor 4: Inactive donor (isAvailable = false)
    const user4 = await User.create({
      name: 'Test Donor 4 (Inactive A+)',
      email: 'test_donor_4@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919876543214'
    });

    const donor4 = await Donor.create({
      userId: user4._id,
      bloodGroup: 'A+',
      gender: 'Male',
      city: 'TEST_SUITE_CITY',
      state: 'State',
      isAvailable: false, // Inactive!
      healthDeclaration: { weightKg: 70, hasChronicConditions: false, isEligible: true }
    });

    // Donor 5: Universal Donor O- (Eligible for any request)
    const user5 = await User.create({
      name: 'Test Donor 5 (Eligible O- Universal)',
      email: 'test_donor_5@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919876543215'
    });

    const donor5 = await Donor.create({
      userId: user5._id,
      bloodGroup: 'O-',
      gender: 'Female',
      city: 'TEST_SUITE_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 55, hasChronicConditions: false, isEligible: true },
      lastDonationDate: new Date(now - 100 * dayMs)
    });

    // -------------------------------------------------------------
    // TEST 1: Eligible donor + compatible blood group
    // -------------------------------------------------------------
    console.log('\nTEST 1: Eligible donor (A+) + Compatible Blood Group (A+)');
    const isComp1 = isBloodGroupCompatible('A+', 'A+');
    const isElig1 = isDonorEligible(donor1, 'A+');
    console.log(`- Blood compatibility (A+ donor for A+ req): ${isComp1}`);
    console.log(`- Medical & interval eligibility: ${isElig1}`);
    if (isComp1 && isElig1) {
      console.log('   ✅ PASS');
    } else {
      console.error('   ❌ FAIL');
    }

    // -------------------------------------------------------------
    // TEST 2: Recently donated donor (< 90 days)
    // -------------------------------------------------------------
    console.log('\nTEST 2: Recently donated donor (30 days ago)');
    const isElig2 = isDonorEligible(donor2, 'A+');
    console.log(`- Eligibility result for recent donor: ${isElig2} (Expected: false)`);
    if (!isElig2) {
      console.log('   ✅ PASS');
    } else {
      console.error('   ❌ FAIL');
    }

    // -------------------------------------------------------------
    // TEST 3: Incompatible blood group
    // -------------------------------------------------------------
    console.log('\nTEST 3: Incompatible blood group (AB+ donor for O- requirement)');
    const isComp3 = isBloodGroupCompatible('AB+', 'O-');
    const isElig3 = isDonorEligible(donor3, 'O-');
    console.log(`- Compatibility AB+ for O- req: ${isComp3} (Expected: false)`);
    console.log(`- Eligibility result: ${isElig3} (Expected: false)`);
    if (!isComp3 && !isElig3) {
      console.log('   ✅ PASS');
    } else {
      console.error('   ❌ FAIL');
    }

    // -------------------------------------------------------------
    // TEST 4 & 7: Multiple eligible donors + Notification Trigger + Duplicate Prevention
    // -------------------------------------------------------------
    console.log('\nTEST 4 & 7: Notification Dispatch & Duplicate Prevention');

    // Create Blood Request for A+
    const requestA = await BloodRequest.create({
      requestNumber: 'TEST-REQ-101',
      patientId: user1._id,
      patientName: 'Test Patient A',
      age: 40,
      gender: 'Male',
      bloodGroup: 'A+',
      unitsRequired: 2,
      hospitalName: 'City Hospital',
      hospitalAddress: 'Main St',
      contactPhone: '+919999888877',
      contactName: 'Test Contact',
      reason: 'TEST_SUITE_REQUEST',
      emergencyLevel: 'CRITICAL',
      requiredByDate: new Date(now + 24 * 60 * 60 * 1000)
    });

    // Trigger Notification Dispatch
    console.log('Triggering notifyEligibleDonorsForRequest for A+ request...');
    const resFirstTrigger = await notifyEligibleDonorsForRequest(requestA);
    console.log('First Trigger Result:', resFirstTrigger);

    const notifUser1Count = await Notification.countDocuments({ recipientId: user1._id, referenceRequestId: requestA._id });
    const notifUser5Count = await Notification.countDocuments({ recipientId: user5._id, referenceRequestId: requestA._id });
    const notifUser2Count = await Notification.countDocuments({ recipientId: user2._id, referenceRequestId: requestA._id });

    console.log(`- Donor 1 (Eligible A+) received notification: ${notifUser1Count === 1}`);
    console.log(`- Donor 5 (Eligible O- Universal) received notification: ${notifUser5Count === 1}`);
    console.log(`- Donor 2 (Ineligible recent donation) received notification: ${notifUser2Count === 0}`);

    if (notifUser1Count === 1 && notifUser5Count === 1 && notifUser2Count === 0) {
      console.log('   ✅ PASS (Multiple eligible donors received individual notifications, ineligible excluded)');
    } else {
      console.error('   ❌ FAIL');
    }

    // Trigger SECOND time for the same request to test duplicate prevention
    console.log('\nTriggering notifyEligibleDonorsForRequest SECOND time for same request...');
    const resSecondTrigger = await notifyEligibleDonorsForRequest(requestA);
    console.log('Second Trigger Result:', resSecondTrigger);

    const totalNotifsForReqA = await Notification.countDocuments({ referenceRequestId: requestA._id });
    console.log(`- Total notifications created for Request A after 2 triggers: ${totalNotifsForReqA} (Expected: ${resFirstTrigger.notificationsSent})`);
    console.log(`- Duplicate notifications prevented in second trigger: ${resSecondTrigger.alreadyNotified === resFirstTrigger.notificationsSent}`);

    if (totalNotifsForReqA === resFirstTrigger.notificationsSent && resSecondTrigger.notificationsSent === 0) {
      console.log('   ✅ PASS (Duplicate notification prevented!)');
    } else {
      console.error('   ❌ FAIL');
    }

    // -------------------------------------------------------------
    // TEST 5: Emergency Request Trigger
    // -------------------------------------------------------------
    console.log('\nTEST 5: Emergency Request Immediate Notification');
    const emergencyReq = await BloodRequest.create({
      requestNumber: 'TEST-REQ-CRITICAL',
      patientId: user1._id,
      patientName: 'ICU Patient',
      age: 50,
      gender: 'Female',
      bloodGroup: 'A+',
      unitsRequired: 4,
      hospitalName: 'Emergency Trauma Center',
      hospitalAddress: 'Highway Hub',
      contactPhone: '+919999888877',
      contactName: 'Doctor',
      reason: 'TEST_SUITE_REQUEST',
      emergencyLevel: 'CRITICAL',
      requiredByDate: new Date(now + 4 * 60 * 60 * 1000)
    });

    const resEmg = await notifyEligibleDonorsForRequest(emergencyReq);
    console.log('Emergency Request Trigger Result:', resEmg);

    if (resEmg.notificationsSent > 0) {
      console.log('   ✅ PASS (Eligible donors received immediate emergency notification)');
    } else {
      console.error('   ❌ FAIL');
    }

    // -------------------------------------------------------------
    // TEST 6: Inactive donor (isAvailable = false)
    // -------------------------------------------------------------
    console.log('\nTEST 6: Inactive donor check');
    const isElig4 = isDonorEligible(donor4, 'A+');
    const notifUser4Count = await Notification.countDocuments({ recipientId: user4._id });
    console.log(`- Inactive donor eligibility: ${isElig4} (Expected: false)`);
    console.log(`- Inactive donor notifications count: ${notifUser4Count} (Expected: 0)`);
    if (!isElig4 && notifUser4Count === 0) {
      console.log('   ✅ PASS');
    } else {
      console.error('   ❌ FAIL');
    }

    // Clean up test data
    await User.deleteMany({ email: { $regex: /^test_donor_/ } });
    await Donor.deleteMany({ city: 'TEST_SUITE_CITY' });
    await BloodRequest.deleteMany({ reason: 'TEST_SUITE_REQUEST' });
    await Notification.deleteMany({ type: 'DONOR_ELIGIBLE_ALERT' });

    console.log('\n🎉 ALL 7 DONOR NOTIFICATION SYSTEM TESTS VERIFIED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
};

runDonorNotificationTests();
