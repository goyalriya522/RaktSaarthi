const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { chatHandler } = require('../controllers/aiController');

// Optional auth middleware: populates req.user if valid token provided, but doesn't block guest users
const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bloodlink_super_secret_jwt_key_2026_xyz');
      req.user = await User.findById(decoded.id).select('-password');
    } catch (err) {
      // Ignore token errors for optional auth
    }
  }
  next();
};

router.post('/chat', optionalAuth, chatHandler);

module.exports = router;
