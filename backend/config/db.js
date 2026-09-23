const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bloodlink';
    console.log(`Connecting to MongoDB Atlas / Database...`);
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 2500,
    });
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ MongoDB connection unavailable (${error.message}). Running in Standalone Pre-Populated Memory Mode for instant demonstration.`);
    isConnected = false;
  }
};

const getIsConnected = () => isConnected;

module.exports = connectDB;
module.exports.getIsConnected = getIsConnected;
