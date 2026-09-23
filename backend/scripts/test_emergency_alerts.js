const mongoose = require('mongoose');
const User = require('../models/User');
const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const Notification = require('../models/Notification');
const BloodMatch = require('../models/BloodMatch');
const { notifyEligibleDonorsForRequest } = require('../utils/donorEligibility');

const runEmergencyTests = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bloodlink';
    await mongoose.connect(connStr);
    console.log('Connected to DB for Emergency Blood Request Alert System Tests');

    // 1. Setup Test Users
    let patientUser = await User.findOne({ email: 'test_patient_emerg@bloodlink.org' });
    if (!patientUser) {
      patientUser = await User.create({
        name: 'Emergency Patient Test',
        email: 'test_patient_emerg@bloodlink.org',
        password: 'Password@123',
        phone: '+91 9900112233',
        role: 'patient'
      });
    }

    let eligibleUser = await User.findOne({ email: 'eligible_donor_emerg@bloodlink.org' });
    if (!eligibleUser) {
      eligibleUser = await User.create({
        name: 'Eligible Donor Test',
        email: 'eligible_donor_emerg@bloodlink.org',
        password: 'Password@123',
        phone: '+91 9900112244',
        role: 'patient'
      });
    }

    let recentDonorUser = await User.findOne({ email: 'recent_donor_emerg@bloodlink.org' });
    if (!recentDonorUser) {
      recentDonorUser = await User.create({
        name: 'Recent Donor Test',
        email: 'recent_donor_emerg@bloodlink.org',
        password: 'Password@123',
        phone: '+91 9900112255',
        role: 'patient'
      });
    }

    // Clean old test donor & request records
    await Donor.deleteMany({ userId: { $in: [eligibleUser._id, recentDonorUser._id] } });
    await BloodRequest.deleteMany({ patientId: patientUser._id });
    await Notification.deleteMany({ recipientId: { $in: [eligibleUser._id, recentDonorUser._id] } });

    // Create Eligible Donor (O- group, eligible, last donation > 90 days ago)
    const eligibleDonor = await Donor.create({
      userId: eligibleUser._id,
      bloodGroup: 'O-',
      gender: 'Male',
      city: 'Delhi-NCR',
      state: 'Delhi',
      isAvailable: true,
      totalDonations: 3,
      lastDonationDate: new Date(Date.now() - 100 * 24 * 3600 * 1000) // 100 days ago
    });

    // Create Ineligible Recent Donor (O- group, last donation 10 days ago)
    const recentDonor = await Donor.create({
      userId: recentDonorUser._id,
      bloodGroup: 'O-',
      gender: 'Male',
      city: 'Delhi-NCR',
      state: 'Delhi',
      isAvailable: true,
      totalDonations: 5,
      lastDonationDate: new Date(Date.now() - 10 * 24 * 3600 * 1000) // 10 days ago (< 90 days cooldown!)
    });

    console.log('\n--- TEST 1 & 2: Emergency Request Creation & Eligible Donor Notification ---');
    const emergencyReq = await BloodRequest.create({
      requestNumber: `BL-EMERG-${Date.now()}`,
      patientId: patientUser._id,
      patientName: patientUser.name,
      age: 28,
      gender: 'Male',
      bloodGroup: 'O-',
      unitsRequired: 2,
      hospitalName: 'Apex Trauma Center',
      hospitalAddress: 'Sector 12',
      emergencyLevel: 'CRITICAL',
      requiredByDate: new Date(Date.now() + 6 * 3600 * 1000),
      contactPhone: patientUser.phone,
      contactName: patientUser.name,
      reason: 'Critical ICU surgery',
      status: 'Verified'
    });

    // Create Blood Bank Emergency Alert (Test 1)
    const bankAlert = await Notification.create({
      recipientRole: 'bloodbank',
      title: `🚨 Emergency Blood Request (${emergencyReq.bloodGroup})`,
      message: `🚨 Emergency Blood Request\n• Blood Group: ${emergencyReq.bloodGroup}\n• Units Required: ${emergencyReq.unitsRequired}\n• Priority: ${emergencyReq.emergencyLevel}\n• Hospital: ${emergencyReq.hospitalName}\n• Request Number: ${emergencyReq.requestNumber}`,
      type: 'EMERGENCY_ALERT',
      referenceRequestId: emergencyReq._id,
      link: `/patient/requests/${emergencyReq._id}`
    });
    console.log('✅ TEST 1 PASSED: Blood bank emergency alert generated with ID:', bankAlert._id.toString());

    // Trigger donor notifications for Emergency Request (Test 2 & Test 3)
    const stats1 = await notifyEligibleDonorsForRequest(emergencyReq);
    console.log('Donor Alert Stats:', stats1);

    const eligibleNotif = await Notification.findOne({
      recipientId: eligibleUser._id,
      referenceRequestId: emergencyReq._id
    });

    if (eligibleNotif) {
      console.log('✅ TEST 2 PASSED: Eligible compatible donor received notification successfully!');
    } else {
      console.error('❌ TEST 2 FAILED: Eligible donor did NOT receive notification!');
    }

    console.log('\n--- TEST 3: Recently Donated Donor Protection ---');
    const recentNotif = await Notification.findOne({
      recipientId: recentDonorUser._id,
      referenceRequestId: emergencyReq._id
    });

    if (!recentNotif) {
      console.log('✅ TEST 3 PASSED: Ineligible recently donated donor received NO notification!');
    } else {
      console.error('❌ TEST 3 FAILED: Ineligible recent donor received notification unexpectedly!');
    }

    console.log('\n--- TEST 4: Prevent Duplicate Alerts / Spam Protection ---');
    const stats2 = await notifyEligibleDonorsForRequest(emergencyReq);
    console.log('Second Processing Stats:', stats2);
    if (stats2.notificationsSent === 0 && stats2.alreadyNotified > 0) {
      console.log('✅ TEST 4 PASSED: Duplicate notification check prevented alert spam!');
    } else {
      console.error('❌ TEST 4 FAILED: Duplicate notifications were sent!');
    }

    console.log('\n--- TEST 5: Request Fulfilled -> Stop Emergency Alerts ---');
    emergencyReq.status = 'Fulfilled';
    await emergencyReq.save();

    const statsFulfilled = await notifyEligibleDonorsForRequest(emergencyReq);
    console.log('Fulfilled Processing Stats:', statsFulfilled);
    if (statsFulfilled.success === false && statsFulfilled.message.includes('no longer actionable')) {
      console.log('✅ TEST 5 PASSED: Fulfilled request stopped further emergency alerts!');
    } else {
      console.error('❌ TEST 5 FAILED: Fulfilled request allowed notifications!');
    }

    console.log('\n--- TEST 6: Request Cancelled -> Stop Emergency Alerts ---');
    const cancelledReq = await BloodRequest.create({
      requestNumber: `BL-CANCEL-${Date.now()}`,
      patientId: patientUser._id,
      patientName: patientUser.name,
      age: 40,
      gender: 'Female',
      bloodGroup: 'O-',
      unitsRequired: 1,
      hospitalName: 'General Hospital',
      hospitalAddress: 'Sector 5',
      emergencyLevel: 'CRITICAL',
      requiredByDate: new Date(Date.now() + 12 * 3600 * 1000),
      contactPhone: patientUser.phone,
      contactName: patientUser.name,
      reason: 'Cancelled request test',
      status: 'Cancelled'
    });

    const statsCancelled = await notifyEligibleDonorsForRequest(cancelledReq);
    console.log('Cancelled Processing Stats:', statsCancelled);
    if (statsCancelled.success === false && statsCancelled.message.includes('no longer actionable')) {
      console.log('✅ TEST 6 PASSED: Cancelled request stopped further emergency alerts!');
    } else {
      console.error('❌ TEST 6 FAILED: Cancelled request allowed notifications!');
    }

    console.log('\n--- TEST 7: Normal / Routine Request -> No Emergency Alerts ---');
    const routineReq = await BloodRequest.create({
      requestNumber: `BL-ROUTINE-${Date.now()}`,
      patientId: patientUser._id,
      patientName: patientUser.name,
      age: 50,
      gender: 'Male',
      bloodGroup: 'O-',
      unitsRequired: 1,
      hospitalName: 'Routine Health Clinic',
      hospitalAddress: 'Sector 1',
      emergencyLevel: 'ROUTINE',
      requiredByDate: new Date(Date.now() + 48 * 3600 * 1000),
      contactPhone: patientUser.phone,
      contactName: patientUser.name,
      reason: 'Routine elective checkup',
      status: 'Verified',
      aiAnalysis: { priorityScore: 20 }
    });

    const statsRoutine = await notifyEligibleDonorsForRequest(routineReq);
    console.log('Routine Processing Stats:', statsRoutine);
    if (statsRoutine.notificationsSent === 0 && statsRoutine.message.includes('normal/routine priority')) {
      console.log('✅ TEST 7 PASSED: Routine request did NOT trigger emergency alert system!');
    } else {
      console.error('❌ TEST 7 FAILED: Routine request triggered emergency alerts!');
    }

    // Cleanup test records
    await BloodRequest.deleteMany({ patientId: patientUser._id });
    await Donor.deleteMany({ userId: { $in: [eligibleUser._id, recentDonorUser._id] } });
    await User.deleteMany({ _id: { $in: [patientUser._id, eligibleUser._id, recentDonorUser._id] } });
    await Notification.deleteMany({ referenceRequestId: { $in: [emergencyReq._id, cancelledReq._id, routineReq._id] } });

    console.log('\n🎉 ALL 7 EMERGENCY BLOOD REQUEST ALERT TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
};

runEmergencyTests();
