require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Donor = require('../models/Donor');
const BloodMatch = require('../models/BloodMatch');
const { checkDonorEligibility, isDonorEligible } = require('../utils/donorEligibility');

const runDonorEligibilityTestSuite = async () => {
  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  };

  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bloodlink';
    console.log('Connecting to database for Donor Donation Interval Eligibility System Tests...');
    await mongoose.connect(connStr);

    console.log('\n--- 🧪 RUNNING DONOR ELIGIBILITY SYSTEM TEST SUITE ---\n');

    // Clean up test data
    await User.deleteMany({ email: { $regex: /^test_eligibility_/ } });
    await Donor.deleteMany({ city: 'TEST_ELIGIBILITY_CITY' });
    await BloodMatch.deleteMany({ notes: 'TEST_ELIGIBILITY_MATCH' });

    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // -------------------------------------------------------------
    // Test 1: New donor without donation history (Eligible immediately)
    // -------------------------------------------------------------
    console.log('Test Scenario 1: New Donor without donation history');
    const user1 = await User.create({
      name: 'New Donor Test',
      email: 'test_eligibility_1@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919999900001'
    });

    const donor1 = await Donor.create({
      userId: user1._id,
      bloodGroup: 'O+',
      gender: 'Male',
      city: 'TEST_ELIGIBILITY_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 70, hasChronicConditions: false, isEligible: true },
      lastDonationDate: null
    });

    const result1 = await checkDonorEligibility(donor1);
    assert(result1.eligible === true, 'New donor is immediately eligible');
    assert(result1.cooldownDays === 0, 'New donor has 0 cooldown days');
    assert(result1.nextEligibleDate === null, 'New donor nextEligibleDate is null');

    // -------------------------------------------------------------
    // Test 2: Donor completed donation 10 days ago (In Cooldown)
    // -------------------------------------------------------------
    console.log('\nTest Scenario 2: Donor completed donation 10 days ago');
    const user2 = await User.create({
      name: 'Recent Donor Test 10d',
      email: 'test_eligibility_2@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919999900002'
    });

    const lastDonation10dAgo = new Date(now - 10 * dayMs);
    const donor2 = await Donor.create({
      userId: user2._id,
      bloodGroup: 'A+',
      gender: 'Female',
      city: 'TEST_ELIGIBILITY_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 65, hasChronicConditions: false, isEligible: true },
      lastDonationDate: lastDonation10dAgo
    });

    const result2 = await checkDonorEligibility(donor2);
    assert(result2.eligible === false, 'Donor with donation 10 days ago is NOT eligible');
    assert(result2.reason === 'Recently donated', 'Reason is "Recently donated"');
    assert(result2.cooldownDays === 80, `Cooldown days is exactly 80 (got ${result2.cooldownDays})`);
    assert(Boolean(result2.nextEligibleDate), 'nextEligibleDate is returned');

    // -------------------------------------------------------------
    // Test 3: Donor completed donation 91 days ago (Eligible after 90 days)
    // -------------------------------------------------------------
    console.log('\nTest Scenario 3: Donor completed donation 91 days ago');
    const user3 = await User.create({
      name: 'Past Donor Test 91d',
      email: 'test_eligibility_3@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919999900003'
    });

    const lastDonation91dAgo = new Date(now - 91 * dayMs);
    const donor3 = await Donor.create({
      userId: user3._id,
      bloodGroup: 'B+',
      gender: 'Male',
      city: 'TEST_ELIGIBILITY_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 75, hasChronicConditions: false, isEligible: true },
      lastDonationDate: lastDonation91dAgo
    });

    const result3 = await checkDonorEligibility(donor3);
    assert(result3.eligible === true, 'Donor with donation 91 days ago is eligible');
    assert(result3.cooldownDays === 0, 'Cooldown days is 0');

    // -------------------------------------------------------------
    // Test 4: Donor with cancelled / unfulfilled match (Ignored by eligibility engine)
    // -------------------------------------------------------------
    console.log('\nTest Scenario 4: Donor with cancelled/unfulfilled match');
    const user4 = await User.create({
      name: 'Cancelled Match Donor Test',
      email: 'test_eligibility_4@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919999900004'
    });

    const donor4 = await Donor.create({
      userId: user4._id,
      bloodGroup: 'O-',
      gender: 'Female',
      city: 'TEST_ELIGIBILITY_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 58, hasChronicConditions: false, isEligible: true },
      lastDonationDate: new Date(now - 100 * dayMs) // 100 days ago (eligible)
    });

    // Create a DECLINED (non-fulfilled) blood match dated 5 days ago
    await BloodMatch.create({
      requestId: new mongoose.Types.ObjectId(),
      donorId: donor4._id,
      sourceType: 'DONOR',
      compatibilityScore: 95,
      status: 'DECLINED',
      updatedAt: new Date(now - 5 * dayMs)
    });

    const result4 = await checkDonorEligibility(donor4);
    assert(result4.eligible === true, 'Cancelled match does NOT block donor eligibility');

    // -------------------------------------------------------------
    // Test 5: Donor with inactive status (isAvailable = false)
    // -------------------------------------------------------------
    console.log('\nTest Scenario 5: Inactive donor (isAvailable = false)');
    const user5 = await User.create({
      name: 'Inactive Donor Test',
      email: 'test_eligibility_5@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919999900005'
    });

    const donor5 = await Donor.create({
      userId: user5._id,
      bloodGroup: 'A+',
      gender: 'Male',
      city: 'TEST_ELIGIBILITY_CITY',
      state: 'State',
      isAvailable: false,
      healthDeclaration: { weightKg: 80, hasChronicConditions: false, isEligible: true },
      lastDonationDate: null
    });

    const result5 = await checkDonorEligibility(donor5);
    assert(result5.eligible === false, 'Inactive donor is NOT eligible');
    assert(result5.reason.includes('unavailable'), 'Reason mentions availability status');

    // -------------------------------------------------------------
    // Test 6: Incompatible blood group check
    // -------------------------------------------------------------
    console.log('\nTest Scenario 6: Blood Group Incompatibility Check');
    const user6 = await User.create({
      name: 'AB+ Donor Test',
      email: 'test_eligibility_6@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919999900006'
    });

    const donor6 = await Donor.create({
      userId: user6._id,
      bloodGroup: 'AB+',
      gender: 'Male',
      city: 'TEST_ELIGIBILITY_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 70, hasChronicConditions: false, isEligible: true },
      lastDonationDate: null
    });

    const result6 = await checkDonorEligibility(donor6, 'O-');
    assert(result6.eligible === false, 'AB+ donor is NOT eligible for O- blood request');
    assert(result6.reason.includes('incompatible'), 'Reason specifies blood group incompatibility');

    // -------------------------------------------------------------
    // Test 7 & 8: Calculation of Next Eligible Date & Remaining Cooldown Days
    // -------------------------------------------------------------
    console.log('\nTest Scenario 7 & 8: Accurate Next Eligible Date & Cooldown Calculation');
    const user7 = await User.create({
      name: 'Cooldown Calculation Test',
      email: 'test_eligibility_7@test.com',
      password: 'password123',
      role: 'patient',
      phone: '+919999900007'
    });

    const donation30DaysAgo = new Date(now - 30 * dayMs);
    const donor7 = await Donor.create({
      userId: user7._id,
      bloodGroup: 'O+',
      gender: 'Male',
      city: 'TEST_ELIGIBILITY_CITY',
      state: 'State',
      isAvailable: true,
      healthDeclaration: { weightKg: 72, hasChronicConditions: false, isEligible: true },
      lastDonationDate: donation30DaysAgo
    });

    const result7 = await checkDonorEligibility(donor7);
    const expectedNextEligible = new Date(donation30DaysAgo.getTime() + 90 * dayMs).toISOString();
    assert(result7.eligible === false, 'Donor who donated 30 days ago is in cooldown');
    assert(result7.cooldownDays === 60, `Cooldown days is exactly 60 (got ${result7.cooldownDays})`);
    assert(result7.nextEligibleDate === expectedNextEligible, `Next eligible date matches calculation (${result7.nextEligibleDate})`);

    // Clean up test data
    await User.deleteMany({ email: { $regex: /^test_eligibility_/ } });
    await Donor.deleteMany({ city: 'TEST_ELIGIBILITY_CITY' });
    await BloodMatch.deleteMany({ notes: 'TEST_ELIGIBILITY_MATCH' });

    console.log('\n=================================================');
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('=================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('❌ Error executing eligibility test suite:', err);
    process.exit(1);
  }
};

runDonorEligibilityTestSuite();
