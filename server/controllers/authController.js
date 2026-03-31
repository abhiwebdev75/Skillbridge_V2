const User = require('../models/User');

const registerUser = async (req, res) => {
  try {
    const { name, role, organization, designation } = req.body;
    const { uid, email, picture } = req.user;

    const existing = await User.findOne({ firebaseUid: uid });
    if (existing) {
      return res.status(200).json({ message: 'Already registered', user: existing });
    }

    const user = await User.create({
      firebaseUid:  uid,
      name:         name || 'User',
      email:        email,
      avatar:       picture || '',
      role:         role || 'student',
      organization: organization || '',
      designation:  designation || '',
    });

    return res.status(201).json({ message: 'Registered successfully', user });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'bio', 'skills', 'portfolioUrl',
                     'resumeUrl', 'organization', 'designation', 'avatar'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      { $set: updates },
      { new: true }
    );
    return res.json(user);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

const saveFcmToken = async (req, res) => {
  try {
    const { token } = req.body;
    await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      { $set: { fcmToken: token } }
    );
    return res.json({ message: 'FCM token saved' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { registerUser, getMe, updateProfile, saveFcmToken };