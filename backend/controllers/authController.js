const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const BloodBank = require('../models/BloodBank');
const Donor = require('../models/Donor');
const logAuditAction = require('../utils/auditLogger');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'bloodlink_super_secret_jwt_key_2026_xyz', {
    expiresIn: process.env.JWT_EXPIRE || '1d',
  });
};

// @desc Register user (patient, hospital, bloodbank, or donor)
// @route POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, profileData } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'patient',
      isVerified: role === 'patient' ? true : false // Hospitals/Banks require admin verification or auto in demo
    });

    let extraProfile = null;

    if (role === 'hospital' && profileData) {
      extraProfile = await Hospital.create({
        userId: user._id,
        hospitalName: profileData.hospitalName || name,
        registrationNo: profileData.registrationNo || `HOSP-${Date.now()}`,
        address: profileData.address || 'Central Address',
        city: profileData.city || 'City',
        state: profileData.state || 'State',
        pincode: profileData.pincode || '100001',
        location: {
          type: 'Point',
          coordinates: profileData.coordinates || [77.2090, 28.6139]
        },
        contactPerson: profileData.contactPerson || name,
        contactPhone: phone,
        emergencyPhone: profileData.emergencyPhone || phone,
        isVerified: true
      });
    } else if (role === 'bloodbank' && profileData) {
      extraProfile = await BloodBank.create({
        userId: user._id,
        name: profileData.name || name,
        licenseNo: profileData.licenseNo || `LIC-${Date.now()}`,
        address: profileData.address || 'Central Address',
        city: profileData.city || 'City',
        state: profileData.state || 'State',
        pincode: profileData.pincode || '100001',
        location: {
          type: 'Point',
          coordinates: profileData.coordinates || [77.2090, 28.6139]
        },
        phone,
        emergencyPhone: profileData.emergencyPhone || phone,
        isVerified: true
      });
    } else if (profileData && profileData.isDonor) {
      extraProfile = await Donor.create({
        userId: user._id,
        bloodGroup: profileData.bloodGroup || 'O+',
        gender: profileData.gender || 'Male',
        city: profileData.city || 'City',
        state: profileData.state || 'State',
        location: {
          type: 'Point',
          coordinates: profileData.coordinates || [77.2090, 28.6139]
        },
        isAvailable: true
      });
    }

    logAuditAction({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_REGISTER',
      resource: 'User',
      resourceId: user._id.toString(),
      ipAddress: req.ip
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified
      },
      extraProfile
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Login user
// @route POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    user.lastLogin = new Date();
    await user.save();

    let extraProfile = null;
    if (user.role === 'hospital') {
      extraProfile = await Hospital.findOne({ userId: user._id });
    } else if (user.role === 'bloodbank') {
      extraProfile = await BloodBank.findOne({ userId: user._id });
    }
    const donorProfile = await Donor.findOne({ userId: user._id });

    logAuditAction({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user._id.toString(),
      ipAddress: req.ip
    });

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified
      },
      extraProfile,
      donorProfile
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Admin login route
// @route POST /api/auth/admin/login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied: Admin authorization required' });
    }

    user.lastLogin = new Date();
    await user.save();

    logAuditAction({
      userId: user._id,
      userName: user.name,
      userRole: 'admin',
      action: 'ADMIN_LOGIN',
      resource: 'AdminPanel',
      ipAddress: req.ip
    });

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get current user profile
// @route GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    let extraProfile = null;
    if (user.role === 'hospital') {
      extraProfile = await Hospital.findOne({ userId: user._id });
    } else if (user.role === 'bloodbank') {
      extraProfile = await BloodBank.findOne({ userId: user._id });
    }
    const donorProfile = await Donor.findOne({ userId: user._id });

    res.json({
      success: true,
      user,
      extraProfile,
      donorProfile
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  adminLogin,
  getMe
};
