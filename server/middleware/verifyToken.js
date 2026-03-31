const admin = require('../config/firebase-admin');
const User  = require('../models/User');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;          // has uid, email, name

    // attach MongoDB user if exists
    const mongoUser = await User.findOne({ firebaseUid: decoded.uid });
    req.mongoUser = mongoUser;   // may be null if user hasn't completed profile

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;