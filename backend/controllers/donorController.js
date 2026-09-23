const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const BloodMatch = require('../models/BloodMatch');
const Notification = require('../models/Notification');
const { emitRequestUpdate } = require('../sockets/socketHandler');

// @desc Create or update donor profile
// @route POST /api/donors/profile
const createOrUpdateProfile = async (req, res) => {
  try {
    const { bloodGroup, gender, dob, city, state, coordinates, isAvailable, healthDeclaration, privacySettings, lastDonationDate, totalDonations } = req.body;

    let donor = await Donor.findOne({ userId: req.user._id });

    // Compute medical eligibility
    let isEligible = true;
    if (healthDeclaration) {
      const weight = typeof healthDeclaration.weightKg !== 'undefined' ? Number(healthDeclaration.weightKg) : (donor?.healthDeclaration?.weightKg || 65);
      const chronic = typeof healthDeclaration.hasChronicConditions !== 'undefined' ? Boolean(healthDeclaration.hasChronicConditions) : (donor?.healthDeclaration?.hasChronicConditions || false);
      if (weight < 45 || chronic) {
        isEligible = false;
      }
    }

    const mergedHealth = healthDeclaration ? {
      ...healthDeclaration,
      isEligible: typeof healthDeclaration.isEligible !== 'undefined' ? healthDeclaration.isEligible : isEligible
    } : { isEligible };

    if (donor) {
      donor.bloodGroup = bloodGroup || donor.bloodGroup;
      donor.gender = gender || donor.gender;
      donor.dob = dob || donor.dob;
      donor.city = city || donor.city;
      donor.state = state || donor.state;
      if (coordinates) {
        donor.location = { type: 'Point', coordinates };
      }
      if (typeof isAvailable !== 'undefined') donor.isAvailable = isAvailable;
      if (healthDeclaration) donor.healthDeclaration = { ...donor.healthDeclaration, ...mergedHealth };
      if (privacySettings) donor.privacySettings = { ...donor.privacySettings, ...privacySettings };
      if (lastDonationDate) donor.lastDonationDate = new Date(lastDonationDate);
      if (typeof totalDonations !== 'undefined') donor.totalDonations = Number(totalDonations);

      await donor.save();
    } else {
      donor = await Donor.create({
        userId: req.user._id,
        bloodGroup: bloodGroup || 'O+',
        gender: gender || 'Male',
        dob,
        city: city || 'City',
        state: state || 'State',
        location: {
          type: 'Point',
          coordinates: coordinates || [77.2090, 28.6139]
        },
        isAvailable: typeof isAvailable !== 'undefined' ? isAvailable : true,
        healthDeclaration: mergedHealth,
        privacySettings: privacySettings || {},
        lastDonationDate: lastDonationDate ? new Date(lastDonationDate) : undefined,
        totalDonations: typeof totalDonations !== 'undefined' ? Number(totalDonations) : 0
      });
    }

    res.json({ success: true, donor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get current donor profile
// @route GET /api/donors/me
const getMyProfile = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id }).populate('userId', 'name email phone');
    res.json({ success: true, donor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Search compatible donors
// @route GET /api/donors/search
const searchDonors = async (req, res) => {
  try {
    const { bloodGroup, city, availableOnly } = req.query;

    const filter = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (city) filter.city = { $regex: city, $options: 'i' };
    if (availableOnly === 'true') filter.isAvailable = true;

    const donors = await Donor.find(filter)
      .populate('userId', 'name email phone')
      .select('-healthDeclaration');

    // Privacy filter: Mask contact numbers if privacy setting enabled
    const sanitized = donors.map(d => {
      const doc = d.toObject();
      if (doc.privacySettings && doc.privacySettings.hidePhonePublicly && req.user.role !== 'admin' && req.user.role !== 'hospital') {
        if (doc.userId && doc.userId.phone) {
          doc.userId.phone = `${doc.userId.phone.slice(0, 3)}****${doc.userId.phone.slice(-3)}`;
        }
      }
      return doc;
    });

    res.json({ success: true, count: sanitized.length, donors: sanitized });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Toggle availability status
// @route PUT /api/donors/availability
const toggleAvailability = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor profile not found' });
    }

    donor.isAvailable = !donor.isAvailable;
    await donor.save();

    res.json({ success: true, isAvailable: donor.isAvailable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get eligible nearby emergency requests for donor
// @route GET /api/donors/eligible-requests
const getEligibleRequests = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    const bg = donor ? donor.bloodGroup : 'O+';

    // Find requests matching compatible blood group
    const requests = await BloodRequest.find({
      status: { $in: ['Submitted', 'Under Verification', 'Verified', 'Searching', 'Matched'] }
    }).sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Respond to donation request
// @route POST /api/donors/respond
const respondToRequest = async (req, res) => {
  try {
    const { requestId, response } = req.body; // response: 'ACCEPTED' or 'DECLINED'

    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor profile not found' });
    }

    const request = await BloodRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Blood request not found' });
    }

    let match = await BloodMatch.findOne({ requestId, donorId: donor._id });
    if (!match) {
      match = await BloodMatch.create({
        requestId,
        sourceType: 'DONOR',
        donorId: donor._id,
        compatibilityScore: 90,
        status: response,
        responseTimestamp: new Date()
      });
    } else {
      match.status = response;
      match.responseTimestamp = new Date();
      await match.save();
    }

    if (response === 'ACCEPTED') {
      if (!request.matchedDonors.includes(donor._id)) {
        request.matchedDonors.push(donor._id);
        if (request.status === 'Searching' || request.status === 'Verified') {
          request.status = 'Matched';
        }
        await request.save();
      }

      await Notification.create({
        recipientId: request.patientId,
        title: 'Volunteer Donor Accepted!',
        message: `A compatible donor (${donor.bloodGroup}) has accepted your emergency request (${request.requestNumber}).`,
        type: 'MATCH_FOUND',
        link: `/requests/${request._id}`
      });

      emitRequestUpdate(request._id.toString(), 'donor_matched', {
        requestId: request._id,
        donorId: donor._id,
        donorName: req.user.name
      });
    }

    res.json({ success: true, match });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get current donor's volunteer commitments / responses
// @route GET /api/donors/my-responses
const getMyResponses = async (req, res) => {
  try {
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor profile not found' });
    }

    const matches = await BloodMatch.find({ donorId: donor._id })
      .populate({
        path: 'requestId',
        populate: { path: 'patientId', select: 'name phone email' }
      })
      .sort({ updatedAt: -1 });

    res.json({ success: true, count: matches.length, matches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get donor eligibility status
// @route GET /api/donors/me/eligibility
const getDonorEligibility = async (req, res) => {
  try {
    const { checkDonorEligibility } = require('../utils/donorEligibility');
    const donor = await Donor.findOne({ userId: req.user._id });
    if (!donor) {
      return res.status(404).json({
        success: false,
        message: 'Donor profile not found'
      });
    }

    const status = await checkDonorEligibility(donor);
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrUpdateProfile,
  getMyProfile,
  getDonorEligibility,
  searchDonors,
  toggleAvailability,
  getEligibleRequests,
  respondToRequest,
  getMyResponses
};


