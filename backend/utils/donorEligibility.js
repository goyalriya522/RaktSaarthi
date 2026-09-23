const Donor = require('../models/Donor');
const Notification = require('../models/Notification');
const BloodMatch = require('../models/BloodMatch');
const { emitToUser } = require('../sockets/socketHandler');

/**
 * Centralized ABO/Rh Blood Group Compatibility Mapping
 * Key: Required/Recipient Blood Group -> Value: Array of Compatible Donor Blood Groups
 */
const COMPATIBILITY_MAP = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};

/**
 * Retrieves the latest completed donation date for a donor.
 * Combines donor.lastDonationDate and any completed BloodMatch records (status === 'FULFILLED').
 * Ignores pending, declined, cancelled, or unfulfilled requests/matches.
 * @param {Object} donor Donor document
 * @returns {Promise<Date|null>}
 */
const getLatestCompletedDonationDate = async (donor) => {
  if (!donor) return null;
  let latest = donor.lastDonationDate ? new Date(donor.lastDonationDate) : null;

  try {
    const fulfilledMatch = await BloodMatch.findOne({
      donorId: donor._id,
      status: 'FULFILLED'
    }).sort({ updatedAt: -1, responseTimestamp: -1 });

    if (fulfilledMatch) {
      const matchDate = new Date(fulfilledMatch.updatedAt || fulfilledMatch.responseTimestamp);
      if (!latest || matchDate > latest) {
        latest = matchDate;
      }
    }
  } catch (err) {
    console.error('Error fetching fulfilled BloodMatch:', err.message);
  }

  return latest;
};

/**
 * Checks if a donor's blood group is medically compatible with the required blood group.
 * @param {string} donorBloodGroup 
 * @param {string} requiredBloodGroup 
 * @returns {boolean}
 */
const isBloodGroupCompatible = (donorBloodGroup, requiredBloodGroup) => {
  if (!donorBloodGroup || !requiredBloodGroup) return false;
  const allowedDonorGroups = COMPATIBILITY_MAP[requiredBloodGroup] || [requiredBloodGroup];
  return allowedDonorGroups.includes(donorBloodGroup);
};

/**
 * Evaluates full donor eligibility status and returns a structured result.
 * Single source of truth for donor donation interval eligibility.
 * @param {Object} donor Donor document
 * @param {string} [requiredBloodGroup] Optional target blood group required
 * @returns {Promise<Object>} Structured eligibility result
 */
const checkDonorEligibility = async (donor, requiredBloodGroup = null) => {
  if (!donor) {
    return {
      eligible: false,
      reason: 'Donor profile not found',
      lastDonationDate: null,
      nextEligibleDate: null,
      cooldownDays: 0
    };
  }

  // 1. Availability check
  if (donor.isAvailable === false) {
    return {
      eligible: false,
      reason: 'Donor is currently set as unavailable',
      lastDonationDate: donor.lastDonationDate ? new Date(donor.lastDonationDate).toISOString() : null,
      nextEligibleDate: null,
      cooldownDays: 0
    };
  }

  // 2. Compatible Blood Group check
  if (requiredBloodGroup && !isBloodGroupCompatible(donor.bloodGroup, requiredBloodGroup)) {
    return {
      eligible: false,
      reason: `Blood group ${donor.bloodGroup} is incompatible with required ${requiredBloodGroup}`,
      lastDonationDate: donor.lastDonationDate ? new Date(donor.lastDonationDate).toISOString() : null,
      nextEligibleDate: null,
      cooldownDays: 0
    };
  }

  // 3. Health & Medical Declaration
  if (donor.healthDeclaration) {
    if (donor.healthDeclaration.isEligible === false) {
      return {
        eligible: false,
        reason: 'Medically deferred per health declaration',
        lastDonationDate: donor.lastDonationDate ? new Date(donor.lastDonationDate).toISOString() : null,
        nextEligibleDate: null,
        cooldownDays: 0
      };
    }
    if (donor.healthDeclaration.hasChronicConditions === true) {
      return {
        eligible: false,
        reason: 'Pre-existing chronic health conditions reported',
        lastDonationDate: donor.lastDonationDate ? new Date(donor.lastDonationDate).toISOString() : null,
        nextEligibleDate: null,
        cooldownDays: 0
      };
    }
    if (typeof donor.healthDeclaration.weightKg !== 'undefined' && donor.healthDeclaration.weightKg < 45) {
      return {
        eligible: false,
        reason: 'Body weight below mandatory 45kg threshold',
        lastDonationDate: donor.lastDonationDate ? new Date(donor.lastDonationDate).toISOString() : null,
        nextEligibleDate: null,
        cooldownDays: 0
      };
    }
  }

  // 4. Latest Completed Donation & Cooldown Interval Check
  const latestDateDoc = await getLatestCompletedDonationDate(donor);
  const cooldownPeriodMs = 90 * 24 * 60 * 60 * 1000; // 90 days interval

  if (latestDateDoc) {
    const lastDonationTime = new Date(latestDateDoc).getTime();
    const nextEligibleTime = lastDonationTime + cooldownPeriodMs;
    const diffMs = nextEligibleTime - Date.now();

    if (diffMs > 0) {
      const cooldownDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return {
        eligible: false,
        reason: 'Recently donated',
        lastDonationDate: new Date(lastDonationTime).toISOString(),
        nextEligibleDate: new Date(nextEligibleTime).toISOString(),
        cooldownDays
      };
    }
  }

  return {
    eligible: true,
    reason: null,
    lastDonationDate: latestDateDoc ? new Date(latestDateDoc).toISOString() : null,
    nextEligibleDate: null,
    cooldownDays: 0
  };
};

/**
 * Checks if a donor is medically, availability-wise, and interval-wise eligible to donate.
 * Synchronous/Direct boolean helper.
 * @param {Object} donor Donor document
 * @param {string} [requiredBloodGroup] Target blood group required
 * @param {Date|string} [latestDonationDateOverride] Optional latest completed donation date
 * @returns {boolean}
 */
const isDonorEligible = (donor, requiredBloodGroup, latestDonationDateOverride = null) => {
  if (!donor) return false;

  // 1. Availability Status
  if (donor.isAvailable === false) return false;

  // 2. Compatible Blood Group
  if (requiredBloodGroup && !isBloodGroupCompatible(donor.bloodGroup, requiredBloodGroup)) return false;

  // 3. Health & Medical Declaration
  if (donor.healthDeclaration) {
    if (donor.healthDeclaration.isEligible === false) return false;
    if (donor.healthDeclaration.hasChronicConditions === true) return false;
    if (typeof donor.healthDeclaration.weightKg !== 'undefined' && donor.healthDeclaration.weightKg < 45) return false;
  }

  // 4. Recently Donated Protection (90-Day Donation Interval Cooldown)
  const effectiveLastDonation = latestDonationDateOverride || donor.lastDonationDate;
  if (effectiveLastDonation) {
    const lastDonation = new Date(effectiveLastDonation);
    const diffMs = Date.now() - lastDonation.getTime();
    const cooldownMs = 90 * 24 * 60 * 60 * 1000; // 90 days interval
    if (diffMs < cooldownMs) return false;
  }

  return true;
};

/**
 * Async wrapper for isDonorEligible that resolves donation history from database.
 * @param {Object} donor Donor document
 * @param {string} [requiredBloodGroup]
 * @returns {Promise<boolean>}
 */
const isDonorEligibleAsync = async (donor, requiredBloodGroup) => {
  const result = await checkDonorEligibility(donor, requiredBloodGroup);
  return result.eligible;
};

/**
 * Checks if a donor has already received a notification for a specific request.
 * Prevents duplicate notifications.
 * @param {ObjectId|string} donorUserId 
 * @param {ObjectId|string} requestId 
 * @returns {Promise<boolean>}
 */
const hasBeenNotified = async (donorUserId, requestId) => {
  if (!donorUserId || !requestId) return false;
  const existing = await Notification.findOne({
    recipientId: donorUserId,
    referenceRequestId: requestId
  });
  return Boolean(existing);
};

/**
 * Finds eligible donors for a blood request, checks duplicate notifications,
 * creates DB notifications, and emits real-time sockets.
 * @param {Object} request BloodRequest document
 * @returns {Promise<Object>} Statistics summary
 */
const notifyEligibleDonorsForRequest = async (request) => {
  if (!request || !request._id || !request.bloodGroup) {
    return { success: false, message: 'Invalid blood request data' };
  }

  // 1. Backend Safety & Actionable Check
  const actionableStatuses = ['Submitted', 'Under Verification', 'Verified', 'Searching'];
  if (!actionableStatuses.includes(request.status)) {
    return {
      success: false,
      message: `Request status "${request.status}" is no longer actionable. Emergency alerts stopped.`
    };
  }

  // 2. Emergency Priority Level Detection
  const priorityScore = request.aiAnalysis?.priorityScore || 0;
  const isEmergency = request.emergencyLevel === 'CRITICAL' || request.emergencyLevel === 'URGENT' || priorityScore >= 70;

  if (!isEmergency) {
    return {
      success: true,
      message: 'Request is normal/routine priority. Emergency donor alerts bypassed.',
      notificationsSent: 0
    };
  }

  const allDonors = await Donor.find({}).populate('userId', 'name email phone role');

  let eligibleCount = 0;
  let ineligibleCount = 0;
  let alreadyNotifiedCount = 0;
  let notificationsSentCount = 0;

  for (const donor of allDonors) {
    if (!donor.userId) continue;

    // Comprehensive Central Eligibility Check
    const eligibilityResult = await checkDonorEligibility(donor, request.bloodGroup);

    if (!eligibilityResult.eligible) {
      ineligibleCount++;
      continue;
    }

    eligibleCount++;

    // Duplicate Notification Check (Prevent Alert Spam)
    const notified = await hasBeenNotified(donor.userId._id, request._id);
    if (notified) {
      alreadyNotifiedCount++;
      continue;
    }

    // Create Notification
    const title = request.emergencyLevel === 'CRITICAL'
      ? `🚨 CRITICAL EMERGENCY: ${request.bloodGroup} Blood Needed!`
      : `🚨 Emergency Blood Request: ${request.bloodGroup} Needed`;

    const message = `🚨 Emergency Blood Request\n• Blood Group: ${request.bloodGroup}\n• Units Required: ${request.unitsRequired}\n• Priority: ${request.emergencyLevel}\n• Hospital: ${request.hospitalName}\n• Request Number: ${request.requestNumber}`;

    const notification = await Notification.create({
      recipientId: donor.userId._id,
      recipientRole: 'donor',
      title,
      message,
      type: 'DONOR_ELIGIBLE_ALERT',
      referenceRequestId: request._id,
      link: `/patient/requests/${request._id}`
    });

    // Real-Time Socket Delivery
    emitToUser(donor.userId._id.toString(), 'donor_notification', notification);
    notificationsSentCount++;
  }

  return {
    success: true,
    requestId: request._id,
    eligibleDonors: eligibleCount,
    notificationsSent: notificationsSentCount,
    alreadyNotified: alreadyNotifiedCount,
    ineligibleDonors: ineligibleCount
  };
};

module.exports = {
  COMPATIBILITY_MAP,
  getLatestCompletedDonationDate,
  isBloodGroupCompatible,
  checkDonorEligibility,
  isDonorEligible,
  isDonorEligibleAsync,
  hasBeenNotified,
  notifyEligibleDonorsForRequest
};

