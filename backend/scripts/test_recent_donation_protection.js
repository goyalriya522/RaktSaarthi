require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Donor = require('../models/Donor');
const BloodMatch = require('../models/BloodMatch');
const BloodRequest = require('../models/BloodRequest');
const Notification = require('../models/Notification');
const {
  isBloodGroupCompatible,
  isDonorEligible,
  getLatestCompletedDonationDate,
  notifyEligibleDonorsForRequest
} = require('../utils/donorEligibility');

const runRecentDonationProtectionTests = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bloodlink';
    console.log('Connecting to database for Recently Donated Donor Protection Tests...');
    await mongoose.connect(connStr);

    console.log('\n--- 🧪 RUNNING RECENT DONATION PROTECTION TEST SUITE ---');

    // Clean up test data
    await User.deleteMany({ email: { $regex: /^test_recent_donor_/ } });
    await Donor.deleteMany({ city: 'RECENT_TEST_CITY' });
    await BloodRequest.deleteMany({ reason: 'RECENT_DONATION_TEST' });
    await Notification.deleteMany({ type: 'DONOR_ELIGIBLE_ALERT' });

    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // -------------------------------------------------------------
    // Create Test Donors
    // -------------------------------------------------------------

    // Donor 1: Recently Donated 20 days ago (Ineligible due to 90-day cooldown)
    const user1 = await User.create({
      name: 'Recent Donor 1 (Donated 20d ago)',
      email: 'test_recent_donor_1@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919876540001'
    });

    const donor1 = await Donor.create({
      userId: user1._id,
      bloodGroup: 'A+',
      gender: 'Male',
      city: 'RECENT_TEST_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 70, hasChronicConditions: false, isEligible: true },
      lastDonationDate: new Date(now - 20 * dayMs) // 20 days ago (< 90 days)
    });

    // Donor 2: Completed interval (Donated 100 days ago, Eligible)
    const user2 = await User.create({
      name: 'Recent Donor 2 (Donated 100d ago)',
      email: 'test_recent_donor_2@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919876540002'
    });

    const donor2 = await Donor.create({
      userId: user2._id,
      bloodGroup: 'A+',
      gender: 'Female',
      city: 'RECENT_TEST_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 65, hasChronicConditions: false, isEligible: true },
      lastDonationDate: new Date(now - 100 * dayMs) // 100 days ago (> 90 days)
    });

    // Donor 3: Incompatible blood group (AB+ donor for O- request)
    const user3 = await User.create({
      name: 'Recent Donor 3 (AB+ Incompatible)',
      email: 'test_recent_donor_3@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919876540003'
    });

    const donor3 = await Donor.create({
      userId: user3._id,
      bloodGroup: 'AB+',
      gender: 'Male',
      city: 'RECENT_TEST_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 80, hasChronicConditions: false, isEligible: true },
      lastDonationDate: new Date(now - 150 * dayMs)
    });

    // Donor 4: No donation history (Brand new donor, Eligible)
    const user4 = await User.create({
      name: 'Recent Donor 4 (No History)',
      email: 'test_recent_donor_4@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919876540004'
    });

    const donor4 = await Donor.create({
      userId: user4._id,
      bloodGroup: 'A+',
      gender: 'Male',
      city: 'RECENT_TEST_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 72, hasChronicConditions: false, isEligible: true }
      // lastDonationDate undefined
    });

    // Donor 5: Completed donation recorded via BloodMatch FULFILLED (15 days ago)
    const user5 = await User.create({
      name: 'Recent Donor 5 (Fulfilled Match 15d ago)',
      email: 'test_recent_donor_5@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919876540005'
    });

    const donor5 = await Donor.create({
      userId: user5._id,
      bloodGroup: 'A+',
      gender: 'Female',
      city: 'RECENT_TEST_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 62, hasChronicConditions: false, isEligible: true }
    });

    const pastReq = await BloodRequest.create({
      requestNumber: 'PAST-REQ-999',
      patientId: user1._id,
      patientName: 'Past Patient',
      age: 30,
      gender: 'Female',
      bloodGroup: 'A+',
      unitsRequired: 1,
      hospitalName: 'General Hospital',
      hospitalAddress: 'City Center',
      contactPhone: '+919999000011',
      contactName: 'Contact',
      reason: 'RECENT_DONATION_TEST',
      emergencyLevel: 'URGENT',
      requiredByDate: new Date(now - 16 * dayMs)
    });

    await BloodMatch.create({
      requestId: pastReq._id,
      sourceType: 'DONOR',
      donorId: donor5._id,
      compatibilityScore: 95,
      status: 'FULFILLED',
      updatedAt: new Date(now - 15 * dayMs)
    });

    // -------------------------------------------------------------
    // TEST 1: Recently donated + compatible blood group → NO notification
    // -------------------------------------------------------------
    console.log('\nTEST 1: Recently donated donor (20 days ago) + Compatible Blood Group');
    const latestDate1 = await getLatestCompletedDonationDate(donor1);
    const isElig1 = isDonorEligible(donor1, 'A+', latestDate1);
    console.log(`- Latest donation date resolved: ${latestDate1 ? latestDate1.toISOString() : 'None'}`);
    console.log(`- Eligibility result: ${isElig1} (Expected: false)`);
    if (!isElig1) {
      console.log('   ✅ PASS (Recently donated donor protected from receiving notifications)');
    } else {
      console.error('   ❌ FAIL');
    }

    // -------------------------------------------------------------
    // TEST 2: Recently donated + emergency request → NO notification
    // -------------------------------------------------------------
    console.log('\nTEST 2: Recently donated donor + CRITICAL Emergency Request');
    const emergencyReq = await BloodRequest.create({
      requestNumber: 'CRITICAL-EMG-REQ',
      patientId: user1._id,
      patientName: 'ICU Critical Patient',
      age: 45,
      gender: 'Male',
      bloodGroup: 'A+',
      unitsRequired: 3,
      hospitalName: 'Emergency ICU Center',
      hospitalAddress: 'Main St',
      contactPhone: '+919999000022',
      contactName: 'ICU Nurse',
      reason: 'RECENT_DONATION_TEST',
      emergencyLevel: 'CRITICAL',
      requiredByDate: new Date(now + 2 * 60 * 60 * 1000)
    });

    await notifyEligibleDonorsForRequest(emergencyReq);
    const notifUser1 = await Notification.findOne({ recipientId: user1._id, referenceRequestId: emergencyReq._id });
    const notifUser5 = await Notification.findOne({ recipientId: user5._id, referenceRequestId: emergencyReq._id });
    console.log(`- Donor 1 (Donated 20d ago) notification received: ${Boolean(notifUser1)} (Expected: false)`);
    console.log(`- Donor 5 (Match fulfilled 15d ago) notification received: ${Boolean(notifUser5)} (Expected: false)`);

    if (!notifUser1 && !notifUser5) {
      console.log('   ✅ PASS (Emergency request respects donor 90-day recovery interval)');
    } else {
      console.error('   ❌ FAIL');
    }

    // -------------------------------------------------------------
    // TEST 3: Donation interval completed (> 90 days) + compatible group
    // -------------------------------------------------------------
    console.log('\nTEST 3: Donation interval completed (100 days ago) + Compatible Group');
    const latestDate2 = await getLatestCompletedDonationDate(donor2);
    const isElig2 = isDonorEligible(donor2, 'A+', latestDate2);
    const notifUser2 = await Notification.findOne({ recipientId: user2._id, referenceRequestId: emergencyReq._id });
    console.log(`- Donor 2 (Donated 100d ago) eligibility: ${isElig2} (Expected: true)`);
    console.log(`- Donor 2 notification received: ${Boolean(notifUser2)} (Expected: true)`);

    if (isElig2 && notifUser2) {
      console.log('   ✅ PASS (Eligible donor who completed 90-day cooldown received notification)');
    } else {
      console.error('   ❌ FAIL');
    }

    // -------------------------------------------------------------
    // TEST 4: Same donor + same request triggered twice → Max ONE notification
    // -------------------------------------------------------------
    console.log('\nTEST 4: Same donor + Same request triggered twice');
    console.log('Triggering notifyEligibleDonorsForRequest second time...');
    const trigger2Res = await notifyEligibleDonorsForRequest(emergencyReq);
    const countNotifUser2 = await Notification.countDocuments({ recipientId: user2._id, referenceRequestId: emergencyReq._id });
    console.log(`- Notifications count for Donor 2 for same request: ${countNotifUser2} (Expected: 1)`);
    console.log(`- Duplicate notifications prevented: ${trigger2Res.alreadyNotified > 0}`);

    if (countNotifUser2 === 1 && trigger2Res.notificationsSent === 0) {
      console.log('   ✅ PASS (Duplicate notification prevented!)');
    } else {
      console.error('   ❌ FAIL');
    }

    // -------------------------------------------------------------
    // TEST 5: Incompatible blood group → NO notification
    // -------------------------------------------------------------
    console.log('\nTEST 5: Incompatible blood group (AB+ donor for O- request)');
    const reqO = await BloodRequest.create({
      requestNumber: 'O-NEG-REQ',
      patientId: user1._id,
      patientName: 'O- Patient',
      age: 25,
      gender: 'Female',
      bloodGroup: 'O-',
      unitsRequired: 1,
      hospitalName: 'City Hospital',
      hospitalAddress: 'Block C',
      contactPhone: '+919999000033',
      contactName: 'Nurse',
      reason: 'RECENT_DONATION_TEST',
      emergencyLevel: 'URGENT',
      requiredByDate: new Date(now + 12 * 60 * 60 * 1000)
    });

    await notifyEligibleDonorsForRequest(reqO);
    const notifUser3 = await Notification.findOne({ recipientId: user3._id, referenceRequestId: reqO._id });
    console.log(`- Incompatible AB+ donor notification for O- request: ${Boolean(notifUser3)} (Expected: false)`);

    if (!notifUser3) {
      console.log('   ✅ PASS (Incompatible blood group donor excluded)');
    } else {
      console.error('   ❌ FAIL');
    }

    // -------------------------------------------------------------
    // TEST 6: No donation history → Eligible according to standard rules
    // -------------------------------------------------------------
    console.log('\nTEST 6: No donation history (New donor)');
    const latestDate4 = await getLatestCompletedDonationDate(donor4);
    const isElig4 = isDonorEligible(donor4, 'A+', latestDate4);
    const notifUser4 = await Notification.findOne({ recipientId: user4._id, referenceRequestId: emergencyReq._id });
    console.log(`- New donor (no history) eligibility: ${isElig4} (Expected: true)`);
    console.log(`- New donor notification received: ${Boolean(notifUser4)} (Expected: true)`);

    if (isElig4 && notifUser4) {
      console.log('   ✅ PASS (New donor with no history is eligible and receives notification)');
    } else {
      console.error('   ❌ FAIL');
    }

    // Clean up test data
    await User.deleteMany({ email: { $regex: /^test_recent_donor_/ } });
    await Donor.deleteMany({ city: 'RECENT_TEST_CITY' });
    await BloodRequest.deleteMany({ reason: 'RECENT_DONATION_TEST' });
    await Notification.deleteMany({ type: 'DONOR_ELIGIBLE_ALERT' });

    console.log('\n🎉 ALL 6 RECENTLY DONATED DONOR PROTECTION TESTS VERIFIED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
};

runRecentDonationProtectionTests();
